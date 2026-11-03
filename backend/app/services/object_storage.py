"""Durable object storage for CMS media (Supabase Storage over its REST API), with a local-disk fallback for development.

Why this exists: a Render web service's disk is wiped on every restart, redeploy and spin-down, so anything uploaded there is lost. Media is
therefore stored in a Supabase Storage bucket and only its metadata and storage reference live in the database. The service-role key stays on
the backend. Local disk is used only when Supabase is not configured AND the host is not one that wipes its disk (see `durability`).
"""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

import httpx

from app.core.config import Settings
from app.core.errors import ApiError

log = logging.getLogger("app.object_storage")
BACKEND = Path(__file__).resolve().parents[2]


def _client() -> httpx.Client:  # a function so tests can substitute a fake Storage server
    return httpx.Client(timeout=httpx.Timeout(180.0, connect=15.0))


def backend(settings: Settings) -> str:
    return "supabase" if settings.supabase_url and settings.supabase_service_role_key else "local"


def durability(settings: Settings) -> dict:
    """Is a file stored now going to survive a restart / redeploy? Used to block uploads that would silently vanish."""
    if backend(settings) == "supabase":
        return {"backend": "supabase", "durable": True, "detail": "Supabase Storage"}
    on_ephemeral_host = bool(os.environ.get("RENDER")) or settings.is_production
    durable = settings.hero_video_disk_is_persistent or not on_ephemeral_host
    return {"backend": "local", "durable": durable, "detail": f"Server disk ({settings.media_dir})",
            "warning": None if durable else "Uploads would be stored on this server's disk, which is wiped on every restart and redeploy. Configure SUPABASE_URL "
                                            "and SUPABASE_SERVICE_ROLE_KEY (or attach a persistent disk and set HERO_VIDEO_DISK_IS_PERSISTENT=true)."}


def require_durable(settings: Settings) -> str:
    """Refuse an upload that could not be kept. Returns the backend to use."""
    info = durability(settings)
    if not info["durable"]:
        raise ApiError(503, "storage_not_configured", "Permanent file storage is not configured on the server, so the upload was refused to avoid losing it. "
                                                       "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server (see the deployment notes).")
    return info["backend"]


def _headers(settings: Settings, content_type: str | None = None) -> dict[str, str]:
    key = settings.supabase_service_role_key.get_secret_value() if settings.supabase_service_role_key else ""
    headers = {"Authorization": f"Bearer {key}", "apikey": key}
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _base(settings: Settings) -> str:
    return f"{(settings.supabase_url or '').rstrip('/')}/storage/v1"


def public_url(settings: Settings, bucket: str, key: str) -> str:
    return f"{_base(settings)}/object/public/{bucket}/{key}"


def local_dir(settings: Settings) -> Path:
    path = Path(settings.media_dir)
    path = path if path.is_absolute() else BACKEND / path
    path.mkdir(parents=True, exist_ok=True)
    return path


def new_key(prefix: str, ext: str) -> str:
    """Random, unguessable, path-safe object name: `<prefix>/<32 hex>.<ext>` (never derived from the uploaded filename)."""
    return f"{prefix}/{uuid.uuid4().hex}{ext}"


def put(settings: Settings, bucket: str, path: Path, key: str, content_type: str, where: str) -> None:
    """Store the file at `path` under `key`. `where` is 'supabase' or 'local'."""
    if where == "local":
        target = local_dir(settings) / key
        target.parent.mkdir(parents=True, exist_ok=True)
        os.replace(path, target)
        return
    url = f"{_base(settings)}/object/{bucket}/{key}"
    with _client() as http:
        def send():
            with path.open("rb") as f:
                return http.post(url, content=f, headers={**_headers(settings, content_type), "x-upsert": "true", "Cache-Control": "max-age=31536000"})

        r = send()
        if r.status_code in (400, 404) and "bucket" in r.text.lower() and "not found" in r.text.lower():  # first use: create the public bucket, retry once
            http.post(f"{_base(settings)}/bucket", json={"id": bucket, "name": bucket, "public": True, "file_size_limit": max(settings.hero_video_max_bytes, settings.media_max_bytes)},
                      headers=_headers(settings, "application/json"))
            r = send()
    if r.status_code >= 300:
        log.error("Supabase Storage upload failed: HTTP %s %s", r.status_code, r.text[:300])
        raise ApiError(502, "storage_unavailable", "The file could not be saved to permanent storage. Check the Supabase storage settings and try again.")
    path.unlink(missing_ok=True)


def delete(settings: Settings, bucket: str, key: str, where: str) -> bool:
    """Remove a stored object. Returns False (and logs) if it could not be removed: the caller has already dropped its reference."""
    try:
        if where == "local":
            (local_dir(settings) / key).unlink(missing_ok=True)
            return True
        with _client() as http:
            r = http.delete(f"{_base(settings)}/object/{bucket}/{key}", headers=_headers(settings))
        if r.status_code >= 300 and r.status_code != 404:
            log.warning("Supabase Storage delete failed: HTTP %s (object %s/%s may be left behind)", r.status_code, bucket, key)
            return False
        return True
    except (httpx.HTTPError, OSError) as exc:
        log.warning("Storage delete failed: %s (object %s/%s may be left behind)", type(exc).__name__, bucket, key)
        return False


def exists_local(settings: Settings, key: str) -> bool:
    try:
        return (local_dir(settings) / key).is_file()
    except OSError:
        return False
