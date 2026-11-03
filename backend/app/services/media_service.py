"""Media library (images, PDFs, videos). Files are judged by their real bytes (never the filename or declared type), stored in DURABLE object
storage (Supabase Storage; local disk only in development) and referenced from the database, which holds the metadata. SVG is deliberately
not allowed (it can carry scripts).

Safety rules enforced here:
- an upload is refused when permanent storage is not configured on a host that would lose the file (see object_storage.require_durable);
- identical files are stored once (SHA-256);
- deleting needs an explicit call, and a file used by website content is protected unless the caller forces it after being warned;
- replacing a file never deletes the previous one unless asked: it is kept as its own library item;
- older uploads whose bytes live in the database (storage = 'db') keep working and are never moved or removed by a migration.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session, undefer

from app.core.config import Settings
from app.core.errors import ApiError
from app.models import ContentItem, MediaAsset, SiteSetting, User
from app.services import hero_video_service as video, object_storage as store
from app.utils_validation import LIKE_ESCAPE, like_pattern

log = logging.getLogger("app.media")

SIGNATURES = (
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"GIF87a", "image/gif", ".gif"),
    (b"GIF89a", "image/gif", ".gif"),
    (b"%PDF-", "application/pdf", ".pdf"),
)
ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "video/mp4", "video/webm"]


def sniff(head: bytes) -> tuple[str, str]:
    for sig, ctype, ext in SIGNATURES:
        if head.startswith(sig):
            return ctype, ext
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp", ".webp"
    real = video.sniff_video(head)
    if real:
        return real, ".webm" if real == "video/webm" else ".mp4"
    raise ApiError(415, "unsupported_media", "Unsupported file type. Allowed: PNG, JPEG, GIF, WebP images, PDF documents and MP4 or WebM videos.")


def kind_of(ctype: str) -> str:
    return "video" if ctype.startswith("video/") else "document" if ctype == "application/pdf" else "image"


def safe_filename(name: str, ext: str) -> str:
    leaf = name.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    stem = leaf.rsplit(".", 1)[0] if "." in leaf else leaf
    stem = re.sub(r"[^A-Za-z0-9_-]+", "-", stem).strip("-_") or "file"
    return f"{stem[:100]}{ext}"


@dataclass
class Prepared:
    tmp: Path
    size: int
    ctype: str
    ext: str
    kind: str
    filename: str
    sha256: str
    duration: float | None = None


def _hash(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


async def receive(request: Request, settings: Settings, filename: str) -> Prepared:
    """Stream the upload to a temporary file and validate it (type from the bytes, size per type, video playability). Cleans up on any failure."""
    store.require_durable(settings)  # fail BEFORE accepting a file we could not keep
    received = await video.receive(request, settings, max(settings.media_max_bytes, settings.hero_video_max_bytes))
    try:
        ctype, ext = sniff(received.head)
        duration = None
        if ctype.startswith("video/"):
            checked = video.check_video(received, filename, request.headers.get("content-type"))
            ctype, ext, duration = checked.ctype, checked.ext, checked.duration
        elif received.size > settings.media_max_bytes:
            raise ApiError(413, "payload_too_large", f"The file is too large (max {settings.media_max_bytes // 1024 // 1024 or 1} MB for images and documents).")
        return Prepared(received.tmp, received.size, ctype, ext, kind_of(ctype), safe_filename(filename, ext), _hash(received.tmp), duration)
    except BaseException:
        received.tmp.unlink(missing_ok=True)
        raise


def find_duplicate(db: Session, sha256: str) -> MediaAsset | None:
    return db.scalar(select(MediaAsset).where(MediaAsset.sha256 == sha256).order_by(MediaAsset.created_at))


def create(db: Session, settings: Settings, user: User, prep: Prepared, alt: str | None, is_public: bool) -> tuple[MediaAsset, bool]:
    """Store a prepared upload. Returns (asset, duplicate): an identical file already in the library is reused instead of stored again."""
    existing = find_duplicate(db, prep.sha256)
    if existing is not None:
        prep.tmp.unlink(missing_ok=True)
        return existing, True
    where = store.backend(settings)
    key = store.new_key("media", prep.ext)
    store.put(settings, settings.media_bucket, prep.tmp, key, prep.ctype, where)
    asset = MediaAsset(filename=prep.filename, content_type=prep.ctype, size_bytes=prep.size, alt_text=(alt or None), is_public=is_public, uploaded_by=user.id,
                       storage=where, storage_key=key, bucket=settings.media_bucket, sha256=prep.sha256, kind=prep.kind, data=None)
    db.add(asset)
    db.flush()
    return asset, False


def replace(db: Session, settings: Settings, user: User, asset: MediaAsset, prep: Prepared, *, delete_previous: bool = False) -> tuple[MediaAsset | None, tuple[str, str, str] | None]:
    """Swap the file behind an asset (its id, so every reference stays valid). The previous file is kept as its own library item unless
    `delete_previous` is true. Returns (archive item or None, the old stored object to remove after commit or None)."""
    old = dict(storage=asset.storage, storage_key=asset.storage_key, bucket=asset.bucket, content_type=asset.content_type, size_bytes=asset.size_bytes,
               sha256=asset.sha256, kind=asset.kind, filename=asset.filename)
    old_data = asset.data if asset.storage == "db" else None
    where = store.backend(settings)
    key = store.new_key("media", prep.ext)
    store.put(settings, settings.media_bucket, prep.tmp, key, prep.ctype, where)
    archive = None
    if not delete_previous:
        archive = MediaAsset(alt_text=asset.alt_text, is_public=False, uploaded_by=user.id, data=old_data, **{**old, "filename": f"previous-{old['filename']}"[:200]})
        db.add(archive)
    asset.storage, asset.storage_key, asset.bucket, asset.data = where, key, settings.media_bucket, None
    asset.content_type, asset.size_bytes, asset.sha256, asset.kind, asset.filename = prep.ctype, prep.size, prep.sha256, prep.kind, prep.filename
    db.flush()
    stale = (old["storage"], old["bucket"] or "", old["storage_key"]) if delete_previous and old["storage"] in ("supabase", "local") and old["storage_key"] else None
    return archive, stale


def stale_object(asset: MediaAsset) -> tuple[str, str, str] | None:
    """(storage, bucket, key) of the file behind an asset, to be removed AFTER the database change is committed (a failed commit never loses a file)."""
    if asset.storage in ("supabase", "local") and asset.storage_key:
        return asset.storage, asset.bucket or "", asset.storage_key
    return None


def remove_stale(settings: Settings, stale: tuple[str, str, str] | None) -> None:
    if stale:
        store.delete(settings, stale[1], stale[2], stale[0])


def get(db: Session, asset_id: uuid.UUID, *, with_data: bool = False) -> MediaAsset:
    stmt = select(MediaAsset).where(MediaAsset.id == asset_id)
    if with_data:
        stmt = stmt.options(undefer(MediaAsset.data))
    asset = db.scalar(stmt)
    if asset is None:
        raise ApiError(404, "not_found", "File not found.")
    return asset


def url_of(settings: Settings, asset: MediaAsset) -> str:
    """Where a browser should load the file from: the storage CDN for durable objects, this API otherwise."""
    if asset.storage == "supabase" and asset.storage_key:
        return store.public_url(settings, asset.bucket or settings.media_bucket, asset.storage_key)
    return f"/api/media/{asset.id}"


def local_path(settings: Settings, asset: MediaAsset) -> Path | None:
    return store.local_dir(settings) / asset.storage_key if asset.storage == "local" and asset.storage_key else None


# ---- where is a file used? ----------------------------------------------------------------------------------------------------------
def references(db: Session, ids: list[uuid.UUID]) -> dict[uuid.UUID, list[dict]]:
    """Website content and settings that reference each file (by its id). Content stores the id, so this is an exact search, not a guess."""
    found: dict[uuid.UUID, list[dict]] = {i: [] for i in ids}
    if not ids:
        return found
    wanted = {str(i): i for i in ids}
    for item in db.scalars(select(ContentItem)):
        blob = json.dumps(item.data or {})
        for text, uid in wanted.items():
            if text in blob:
                found[uid].append({"type": "content", "id": str(item.id), "kind": item.kind, "title": item.title, "status": item.status})
    for row in db.scalars(select(SiteSetting)):
        blob = json.dumps(row.value)
        for text, uid in wanted.items():
            if text in blob:
                found[uid].append({"type": "setting", "key": row.key, "status": "published"})
    return found


def search(db: Session, *, q: str | None, kind: str | None, sort: str, page: int, page_size: int) -> tuple[list[MediaAsset], int]:
    stmt = select(MediaAsset)
    if q:
        stmt = stmt.where(MediaAsset.filename.ilike(like_pattern(q.strip()), escape=LIKE_ESCAPE))
    if kind in ("image", "video", "document"):
        stmt = stmt.where(MediaAsset.kind == kind)
    order = {"oldest": MediaAsset.created_at.asc(), "name": MediaAsset.filename.asc(), "size": MediaAsset.size_bytes.desc()}.get(sort, MediaAsset.created_at.desc())
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    return list(db.scalars(stmt.order_by(order).limit(page_size).offset((page - 1) * page_size))), total


def usage(db: Session) -> tuple[int, int]:
    return tuple(db.execute(select(func.count(), func.coalesce(func.sum(MediaAsset.size_bytes), 0))).one())  # type: ignore[return-value]


def make_public(db: Session, ids: set[uuid.UUID]) -> list[uuid.UUID]:
    """Website content that is published can only show public files: the ones it references are switched to public (and reported)."""
    changed = []
    for asset in db.scalars(select(MediaAsset).where(MediaAsset.id.in_(ids), MediaAsset.is_public.is_(False))):
        asset.is_public = True
        changed.append(asset.id)
    return changed
