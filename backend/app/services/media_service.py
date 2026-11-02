"""Media library. Files are validated by their real bytes (not the filename or declared type) and stored in the database,
private by default. SVG is deliberately not allowed (it can carry scripts)."""

from __future__ import annotations

import re
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, undefer

from app.core.errors import ApiError
from app.models import MediaAsset, User
from app.utils_validation import LIKE_ESCAPE, like_pattern

SIGNATURES = (
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"GIF87a", "image/gif", ".gif"),
    (b"GIF89a", "image/gif", ".gif"),
    (b"%PDF-", "application/pdf", ".pdf"),
)


def sniff(data: bytes) -> tuple[str, str]:
    for sig, ctype, ext in SIGNATURES:
        if data.startswith(sig):
            return ctype, ext
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", ".webp"
    raise ApiError(415, "unsupported_media", "Unsupported file type. Allowed: PNG, JPEG, GIF, WebP images and PDF documents.")


def safe_filename(name: str, ext: str) -> str:
    leaf = name.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    stem = leaf.rsplit(".", 1)[0] if "." in leaf else leaf
    stem = re.sub(r"[^A-Za-z0-9_-]+", "-", stem).strip("-_") or "file"
    return f"{stem[:100]}{ext}"


def validate(data: bytes, filename: str, max_bytes: int) -> tuple[str, str]:
    if not data:
        raise ApiError(422, "validation_error", "The file is empty.")
    if len(data) > max_bytes:
        raise ApiError(413, "payload_too_large", f"The file is too large (max {max_bytes // 1024 // 1024 or 1} MB).")
    ctype, ext = sniff(data)
    return ctype, safe_filename(filename, ext)


def create(db: Session, user: User, data: bytes, filename: str, alt: str | None, is_public: bool, max_bytes: int) -> MediaAsset:
    ctype, fname = validate(data, filename, max_bytes)
    asset = MediaAsset(filename=fname, content_type=ctype, size_bytes=len(data), alt_text=(alt or None), is_public=is_public, uploaded_by=user.id, data=data)
    db.add(asset)
    db.flush()
    return asset


def replace(db: Session, asset: MediaAsset, data: bytes, max_bytes: int) -> MediaAsset:
    ctype, fname = validate(data, asset.filename, max_bytes)
    asset.data, asset.content_type, asset.size_bytes, asset.filename = data, ctype, len(data), fname
    return asset


def get(db: Session, asset_id: uuid.UUID, *, with_data: bool = False) -> MediaAsset:
    stmt = select(MediaAsset).where(MediaAsset.id == asset_id)
    if with_data:
        stmt = stmt.options(undefer(MediaAsset.data))
    asset = db.scalar(stmt)
    if asset is None:
        raise ApiError(404, "not_found", "File not found.")
    return asset


def search(db: Session, *, q: str | None, page: int, page_size: int) -> tuple[list[MediaAsset], int]:
    stmt = select(MediaAsset)
    if q:
        stmt = stmt.where(MediaAsset.filename.ilike(like_pattern(q.strip()), escape=LIKE_ESCAPE))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    return list(db.scalars(stmt.order_by(MediaAsset.created_at.desc()).limit(page_size).offset((page - 1) * page_size))), total


def usage(db: Session) -> tuple[int, int]:
    return tuple(db.execute(select(func.count(), func.coalesce(func.sum(MediaAsset.size_bytes), 0))).one())  # type: ignore[return-value]
