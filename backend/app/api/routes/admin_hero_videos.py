"""Homepage background videos (admin). Raw-body uploads, like the media library: POST /api/admin/hero-videos?filename=intro.mp4&title=Intro
Files are streamed to disk and checked on the server (type, real content, size, duration); the database keeps only metadata and the schedule."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse, RedirectResponse, Response
from pydantic import Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.db.session import get_db
from app.models import HeroVideo, User
from app.schemas.common import ApiModel
from app.services import audit_service, hero_video_service as svc

router = APIRouter(prefix="/admin/hero-videos", tags=["admin: homepage videos"])
read, write = permission("hero_videos"), permission("hero_videos", write=True)
NO_STORE = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}


class Rename(ApiModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    is_active: bool | None = None
    is_fallback: bool | None = None
    available_from: datetime | None = None
    available_until: datetime | None = None
    clear_window: bool = False


class Order(ApiModel):
    ids: list[uuid.UUID] = Field(max_length=200)


class ScheduleIn(ApiModel):
    start_date: date | None = None
    slot_days: int = Field(default=3, ge=1, le=30)
    repeat: bool = True


def _iso(settings: Settings, dt):
    return dt.astimezone(svc.tz_of(settings)).isoformat() if dt else None


def _summary(settings: Settings, slot):
    return {"id": str(slot.video.id), "title": slot.video.title, "starts_at": _iso(settings, slot.start), "ends_at": _iso(settings, slot.end)} if slot else None


def _out(settings: Settings, v: HeroVideo, res: svc.Resolution, windows: dict) -> dict:
    available = svc.is_available(settings, v)
    window = windows.get(v.id)
    if not v.is_active:
        status = "inactive"
    elif v.verify_status == "missing" or not available:
        status = "missing_file"
    elif res.current and res.current.video.id == v.id:
        status = "playing"
    elif res.next and res.next.video.id == v.id:
        status = "next"
    else:
        status = "scheduled"
    if v.deleted_at is not None:
        status = "deleting"
    return {"verify_status": v.verify_status, "verified_at": _iso(settings, v.verified_at), "verify_detail": v.verify_detail, "bucket": v.bucket,
            "is_fallback": v.is_fallback, "deleted_at": _iso(settings, v.deleted_at), "delete_error": v.delete_error,
            "available_from": _iso(settings, v.available_from), "available_until": _iso(settings, v.available_until),
            "last_play_ok_at": _iso(settings, v.last_play_ok_at), "last_play_error": v.last_play_error, "last_play_error_at": _iso(settings, v.last_play_error_at),
            "uploaded_by": str(v.uploaded_by) if v.uploaded_by else None,
            "id": str(v.id), "title": v.title, "original_name": v.original_name, "content_type": v.content_type, "size_bytes": v.size_bytes,
            "duration_seconds": v.duration_seconds, "is_active": v.is_active, "position": v.position, "status": status, "file_ok": available,
            "has_poster": bool(v.poster_key), "created_at": v.created_at.isoformat(), "updated_at": v.updated_at.isoformat(),
            "starts_at": _iso(settings, window.start) if window and status in ("playing", "next", "scheduled") else None,
            "ends_at": _iso(settings, window.end) if window and status in ("playing", "next", "scheduled") else None,
            "storage": v.storage,
            "preview_url": svc.media_url(settings, v) or f"/api/admin/hero-videos/{v.id}/file?v={int(v.updated_at.timestamp())}",
            "poster_url": (svc.media_url(settings, v, "poster") or f"/api/admin/hero-videos/{v.id}/poster?v={int(v.updated_at.timestamp())}") if v.poster_key else None}


def _state(db: Session, settings: Settings, force_check: bool = False) -> dict:
    res = svc.resolve(db, settings)
    cfg = svc.get_config(db, settings)
    windows = res.windows()
    videos = list(db.scalars(select(HeroVideo).order_by(HeroVideo.position, HeroVideo.created_at)))
    count, size = db.execute(select(func.count(), func.coalesce(func.sum(HeroVideo.size_bytes), 0))).one()
    return {
        "items": [_out(settings, v, res, windows) for v in videos],
        "config": {"start_date": cfg.start_at.astimezone(svc.tz_of(settings)).date().isoformat(), "slot_days": cfg.slot_days, "repeat": cfg.repeat,
                   "timezone": settings.app_timezone, "slot_override_seconds": settings.hero_video_slot_seconds},
        "current": _summary(settings, res.current), "next": _summary(settings, res.next), "server_time": _iso(settings, res.now),
        "limits": {"max_bytes": settings.hero_video_max_bytes, "types": ["video/mp4", "video/webm"], "min_seconds": svc.MIN_SECONDS, "max_seconds": svc.MAX_SECONDS},
        "usage": {"files": int(count), "bytes": int(size)},
        "storage": svc.storage_status(settings, force=force_check),
        "reupload": [{"id": str(v.id), "title": v.title, "file_ok": svc.is_available(settings, v)} for v in svc.needs_reupload(settings, videos)],
    }


@router.get("")
def list_videos(_: User = Depends(read), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    out = _state(db, settings)
    db.rollback()  # reading must not leave a schedule row half-created
    return out


@router.post("", status_code=201)
async def upload(request: Request, filename: str = Query(..., min_length=1, max_length=200), title: str | None = Query(None, max_length=120),
                 user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    svc.require_durable(settings)
    received = await svc.receive(request, settings, settings.hero_video_max_bytes)
    try:
        checked = svc.check_video(received, filename, request.headers.get("content-type"))
    except BaseException:
        received.tmp.unlink(missing_ok=True)
        raise
    digest = svc.file_sha256(received.tmp)
    dup = svc.find_duplicate(db, digest)
    if dup is not None:
        received.tmp.unlink(missing_ok=True)
        raise ApiError(409, "duplicate_video", f"This exact file is already in the library as “{dup.title}”.")
    storage, key = svc.store_file(settings, received.tmp, checked.ext, checked.ctype)
    try:
        label = (title or "").strip() or filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1].rsplit(".", 1)[0][:120] or "Untitled video"
        video = svc.create(db, settings, user, title=label[:120], original_name=filename, key=key, storage=storage, checked=checked, size=received.size, sha256=digest)
        audit_service.record(db, user, "hero_video.upload", resource_type="hero_video", resource_id=video.id, detail={"title": video.title, "bytes": video.size_bytes, "type": video.content_type})
        db.commit()
    except BaseException:
        db.rollback()
        svc.remove_files(settings, storage, key)
        raise
    db.refresh(video)
    res = svc.resolve(db, settings)
    return _out(settings, video, res, res.windows())


@router.put("/order")
def reorder(body: Order, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    svc.set_order(db, settings, body.ids)
    audit_service.record(db, user, "hero_video.reorder", resource_type="hero_video", detail={"count": len(body.ids)})
    db.commit()
    return _state(db, settings)


@router.put("/schedule")
def schedule(body: ScheduleIn, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    cfg = svc.update_schedule(db, settings, user, start_date=body.start_date, slot_days=body.slot_days, repeat=body.repeat)
    audit_service.record(db, user, "hero_video.schedule", resource_type="hero_video", detail={"start_date": str(body.start_date), "slot_days": cfg.slot_days, "repeat": cfg.repeat})
    db.commit()
    return _state(db, settings)


@router.patch("/{video_id}")
def update(video_id: uuid.UUID, body: Rename, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    video = svc.get(db, video_id)
    changed = []
    if body.title is not None and body.title.strip() and body.title.strip() != video.title:
        video.title = body.title.strip()
        changed.append("title")
    if body.is_active is not None and body.is_active != video.is_active:
        svc.set_active(db, settings, video, body.is_active)
        changed.append("active" if body.is_active else "inactive")
    if body.is_fallback is not None and body.is_fallback != video.is_fallback:
        svc.set_fallback(db, video, body.is_fallback)
        changed.append("fallback_on" if body.is_fallback else "fallback_off")
    if body.clear_window and (video.available_from or video.available_until):
        video.available_from = video.available_until = None
        changed.append("window_cleared")
    elif body.available_from is not None or body.available_until is not None:
        snap = svc.snapshot(db, settings)
        start = body.available_from if body.available_from is not None else video.available_from
        end = body.available_until if body.available_until is not None else video.available_until
        if start and end and end <= start:
            raise ApiError(422, "validation_error", "The “available until” time must be after “available from”.")
        video.available_from, video.available_until = start, end
        db.flush()
        svc.reanchor(db, settings, snap)
        changed.append("window")
    if changed:
        audit_service.record(db, user, "hero_video.update", resource_type="hero_video", resource_id=video.id, detail={"changes": changed, "title": video.title})
    db.commit()
    return _state(db, settings)


@router.put("/{video_id}/file")
async def replace_file(video_id: uuid.UUID, request: Request, filename: str = Query(..., min_length=1, max_length=200), user: User = Depends(write),
                       db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    video = svc.get(db, video_id)
    svc.require_durable(settings)
    received = await svc.receive(request, settings, settings.hero_video_max_bytes)
    try:
        checked = svc.check_video(received, filename, request.headers.get("content-type"))
    except BaseException:
        received.tmp.unlink(missing_ok=True)
        raise
    digest = svc.file_sha256(received.tmp)
    dup = svc.find_duplicate(db, digest)
    if dup is not None and dup.id != video.id:
        received.tmp.unlink(missing_ok=True)
        raise ApiError(409, "duplicate_video", f"This exact file is already in the library as “{dup.title}”.")
    storage, key = svc.store_file(settings, received.tmp, checked.ext, checked.ctype)
    old, old_storage, old_bucket = (video.storage_key, video.poster_key), video.storage, video.bucket
    try:
        video.sha256, video.bucket = digest, settings.hero_video_bucket if storage == "supabase" else None
        video.verify_status, video.verified_at, video.verify_detail = ("ok", svc.now_utc(), "Verified right after upload.") if storage == "supabase" else ("unknown", None, None)
        video.deleted_at = video.delete_error = None
        video.storage = storage
        video.storage_key, video.content_type, video.size_bytes, video.duration_seconds = key, checked.ctype, received.size, checked.duration
        video.original_name, video.poster_key = filename[:200], None  # the old poster belongs to the old picture
        audit_service.record(db, user, "hero_video.replace", resource_type="hero_video", resource_id=video.id, detail={"title": video.title, "bytes": received.size})
        db.commit()
    except BaseException:
        db.rollback()
        svc.remove_files(settings, storage, key)
        raise
    svc.remove_files(settings, old_storage, *old, bucket=old_bucket)  # only after the database points at the new file: no window with a dangling reference
    return _state(db, settings)


@router.put("/{video_id}/poster")
async def set_poster(video_id: uuid.UUID, request: Request, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    video = svc.get(db, video_id)
    received = await svc.receive(request, settings, svc.POSTER_MAX_BYTES)
    kind = svc.sniff_image(received.head)
    if kind is None:
        received.tmp.unlink(missing_ok=True)
        raise ApiError(415, "unsupported_media", "The poster must be a JPEG, PNG or WebP image.")
    _, key = svc.store_file(settings, received.tmp, kind[1], kind[0], backend=video.storage)  # a poster is kept where its video is
    old = video.poster_key
    video.poster_key = key
    audit_service.record(db, user, "hero_video.poster", resource_type="hero_video", resource_id=video.id, detail={"title": video.title})
    db.commit()
    svc.remove_files(settings, video.storage, old)
    return _state(db, settings)


def _serve(settings: Settings, video: HeroVideo, key: str | None, ctype: str, kind: str = "file"):
    if video.storage == "supabase":
        if not key:
            raise ApiError(404, "not_found", "File not found.")
        return RedirectResponse(svc.media_url(settings, video, kind), status_code=302, headers=NO_STORE)
    if not key or not svc.file_path(settings, key).is_file():
        raise ApiError(404, "not_found", "File not found.")
    return FileResponse(svc.file_path(settings, key), media_type=ctype, headers=NO_STORE)


@router.get("/{video_id}/file")
def preview(video_id: uuid.UUID, _: User = Depends(read), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> FileResponse:
    """Admin preview of any uploaded video (supports Range requests, so the player can seek)."""
    video = svc.get(db, video_id)
    return _serve(settings, video, video.storage_key, video.content_type)


@router.get("/{video_id}/poster")
def poster(video_id: uuid.UUID, _: User = Depends(read), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> FileResponse:
    video = svc.get(db, video_id)
    key = video.poster_key or ""
    return _serve(settings, video, key, "image/webp" if key.endswith(".webp") else "image/png" if key.endswith(".png") else "image/jpeg", "poster")


@router.delete("/{video_id}")
def delete(video_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """Explicit deletion, in two steps so nothing is lost silently: (1) mark the record and take it out of rotation, (2) remove the stored file and,
    only once that is confirmed, the record. If the file cannot be removed the record stays as a pending deletion that can be retried or restored."""
    video = svc.get(db, video_id)
    title, vid = video.title, video.id
    svc.begin_delete(db, settings, video)
    audit_service.record(db, user, "hero_video.delete_requested", resource_type="hero_video", resource_id=vid, detail={"title": title, "storage": video.storage, "key": video.storage_key})
    db.commit()
    video = svc.get(db, vid)
    done = svc.finish_delete(db, settings, video)
    audit_service.record(db, user, "hero_video.deleted" if done else "hero_video.delete_failed", resource_type="hero_video", resource_id=vid, detail={"title": title})
    db.commit()
    out = _state(db, settings)
    out["deleted"] = done
    if not done:
        out["message"] = "The file could not be removed from storage, so the record was kept. Retry the deletion or restore the video."
    return out


@router.post("/{video_id}/restore")
def restore(video_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    video = svc.get(db, video_id)
    if video.deleted_at is None:
        raise ApiError(409, "not_deleted", "This video is not pending deletion.")
    svc.restore_deleted(db, settings, video)
    audit_service.record(db, user, "hero_video.restore", resource_type="hero_video", resource_id=video.id, detail={"title": video.title})
    db.commit()
    return _state(db, settings)


@router.post("/verify-all")
def verify_all(user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    results = [svc.verify_video(settings, v) for v in db.scalars(select(HeroVideo).where(HeroVideo.deleted_at.is_(None)))]
    audit_service.record(db, user, "hero_video.verify_all", resource_type="hero_video", detail={"ok": results.count("ok"), "problems": len(results) - results.count("ok")})
    db.commit()
    return _state(db, settings, force_check=True)  # "Check files" also re-checks the Supabase connection


@router.post("/{video_id}/verify")
def verify_one(video_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """Check that the stored file really exists and is publicly readable (changes nothing but the recorded result)."""
    video = svc.get(db, video_id)
    svc.verify_video(settings, video)
    audit_service.record(db, user, "hero_video.verify", resource_type="hero_video", resource_id=video.id, detail={"title": video.title, "result": video.verify_status})
    db.commit()
    return _state(db, settings)
