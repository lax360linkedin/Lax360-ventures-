"""Homepage background videos (admin). Raw-body uploads, like the media library: POST /api/admin/hero-videos?filename=intro.mp4&title=Intro
Files are streamed to disk and checked on the server (type, real content, size, duration); the database keeps only metadata and the schedule."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse, Response
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
    elif not available:
        status = "missing_file"
    elif res.current and res.current.video.id == v.id:
        status = "playing"
    elif res.next and res.next.video.id == v.id:
        status = "next"
    else:
        status = "scheduled"
    return {"id": str(v.id), "title": v.title, "original_name": v.original_name, "content_type": v.content_type, "size_bytes": v.size_bytes,
            "duration_seconds": v.duration_seconds, "is_active": v.is_active, "position": v.position, "status": status, "file_ok": available,
            "has_poster": bool(v.poster_key), "created_at": v.created_at.isoformat(), "updated_at": v.updated_at.isoformat(),
            "starts_at": _iso(settings, window.start) if window and status in ("playing", "next", "scheduled") else None,
            "ends_at": _iso(settings, window.end) if window and status in ("playing", "next", "scheduled") else None,
            "preview_url": f"/api/admin/hero-videos/{v.id}/file?v={int(v.updated_at.timestamp())}",
            "poster_url": f"/api/admin/hero-videos/{v.id}/poster?v={int(v.updated_at.timestamp())}" if v.poster_key else None}


def _state(db: Session, settings: Settings) -> dict:
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
    }


@router.get("")
def list_videos(_: User = Depends(read), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    out = _state(db, settings)
    db.rollback()  # reading must not leave a schedule row half-created
    return out


@router.post("", status_code=201)
async def upload(request: Request, filename: str = Query(..., min_length=1, max_length=200), title: str | None = Query(None, max_length=120),
                 user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    received = await svc.receive(request, settings, settings.hero_video_max_bytes)
    try:
        checked = svc.check_video(received, filename, request.headers.get("content-type"))
    except BaseException:
        received.tmp.unlink(missing_ok=True)
        raise
    key = svc.commit_file(settings, received.tmp, checked.ext)
    try:
        label = (title or "").strip() or filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1].rsplit(".", 1)[0][:120] or "Untitled video"
        video = svc.create(db, settings, user, title=label[:120], original_name=filename, key=key, checked=checked, size=received.size)
        audit_service.record(db, user, "hero_video.upload", resource_type="hero_video", resource_id=video.id, detail={"title": video.title, "bytes": video.size_bytes, "type": video.content_type})
        db.commit()
    except BaseException:
        db.rollback()
        svc.remove_files(settings, key)
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
    if changed:
        audit_service.record(db, user, "hero_video.update", resource_type="hero_video", resource_id=video.id, detail={"changes": changed, "title": video.title})
    db.commit()
    return _state(db, settings)


@router.put("/{video_id}/file")
async def replace_file(video_id: uuid.UUID, request: Request, filename: str = Query(..., min_length=1, max_length=200), user: User = Depends(write),
                       db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    video = svc.get(db, video_id)
    received = await svc.receive(request, settings, settings.hero_video_max_bytes)
    try:
        checked = svc.check_video(received, filename, request.headers.get("content-type"))
    except BaseException:
        received.tmp.unlink(missing_ok=True)
        raise
    key = svc.commit_file(settings, received.tmp, checked.ext)
    old = (video.storage_key, video.poster_key)
    try:
        video.storage_key, video.content_type, video.size_bytes, video.duration_seconds = key, checked.ctype, received.size, checked.duration
        video.original_name, video.poster_key = filename[:200], None  # the old poster belongs to the old picture
        audit_service.record(db, user, "hero_video.replace", resource_type="hero_video", resource_id=video.id, detail={"title": video.title, "bytes": received.size})
        db.commit()
    except BaseException:
        db.rollback()
        svc.remove_files(settings, key)
        raise
    svc.remove_files(settings, *old)  # only after the database points at the new file: no window with a dangling reference
    return _state(db, settings)


@router.put("/{video_id}/poster")
async def set_poster(video_id: uuid.UUID, request: Request, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    video = svc.get(db, video_id)
    received = await svc.receive(request, settings, svc.POSTER_MAX_BYTES)
    kind = svc.sniff_image(received.head)
    if kind is None:
        received.tmp.unlink(missing_ok=True)
        raise ApiError(415, "unsupported_media", "The poster must be a JPEG, PNG or WebP image.")
    key = svc.commit_file(settings, received.tmp, kind[1])
    old = video.poster_key
    video.poster_key = key
    audit_service.record(db, user, "hero_video.poster", resource_type="hero_video", resource_id=video.id, detail={"title": video.title})
    db.commit()
    svc.remove_files(settings, old)
    return _state(db, settings)


def _serve(settings: Settings, key: str | None, ctype: str) -> FileResponse:
    if not key or not svc.file_path(settings, key).is_file():
        raise ApiError(404, "not_found", "File not found.")
    return FileResponse(svc.file_path(settings, key), media_type=ctype, headers=NO_STORE)


@router.get("/{video_id}/file")
def preview(video_id: uuid.UUID, _: User = Depends(read), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> FileResponse:
    """Admin preview of any uploaded video (supports Range requests, so the player can seek)."""
    video = svc.get(db, video_id)
    return _serve(settings, video.storage_key, video.content_type)


@router.get("/{video_id}/poster")
def poster(video_id: uuid.UUID, _: User = Depends(read), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> FileResponse:
    video = svc.get(db, video_id)
    key = video.poster_key or ""
    return _serve(settings, key, "image/webp" if key.endswith(".webp") else "image/png" if key.endswith(".png") else "image/jpeg")


@router.delete("/{video_id}", status_code=204)
def delete(video_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> Response:
    video = svc.get(db, video_id)
    title, vid = video.title, video.id
    keys = svc.delete(db, settings, video)
    audit_service.record(db, user, "hero_video.delete", resource_type="hero_video", resource_id=vid, detail={"title": title})
    db.commit()
    svc.remove_files(settings, *keys)
    return Response(status_code=204)
