"""Public, read-only data the website uses. Only settings flagged public and PUBLISHED content are ever returned."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse, JSONResponse, Response
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.services import content_service, hero_video_service, media_service, settings_service
from app.core.errors import ApiError

router = APIRouter(tags=["public"])
CACHE = {"Cache-Control": "public, max-age=30"}


@router.get("/public/site")
def site(db: Session = Depends(get_db)) -> JSONResponse:
    values = settings_service.public_settings(db)
    return JSONResponse({"settings": values}, headers=CACHE)


@router.get("/public/content")
def content(kind: str = Query(..., max_length=30), db: Session = Depends(get_db)) -> JSONResponse:
    return JSONResponse({"kind": kind, "items": content_service.public_items(db, kind)}, headers=CACHE)


@router.get("/media/{asset_id}")
def media(asset_id: uuid.UUID, db: Session = Depends(get_db)) -> Response:
    """Public files only. A private file looks exactly like a missing one."""
    asset = media_service.get(db, asset_id, with_data=True)
    if not asset.is_public:
        raise ApiError(404, "not_found", "File not found.")
    return Response(asset.data, media_type=asset.content_type, headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=3600", "Content-Disposition": f'inline; filename="{asset.filename}"'})


# ---- homepage background video ------------------------------------------------------------------
def _file_url(video, kind: str = "file") -> str:
    return f"/api/public/hero-videos/{video.id}/{kind}?v={int(video.updated_at.timestamp())}"


def _public_slot(slot, settings: Settings, full: bool) -> dict:
    zone = hero_video_service.tz_of(settings)
    v = slot.video
    out = {"id": str(v.id), "url": _file_url(v), "poster_url": _file_url(v, "poster") if v.poster_key else None, "content_type": v.content_type,
           "starts_at": slot.start.astimezone(zone).isoformat()}
    if full:
        out["ends_at"] = slot.end.astimezone(zone).isoformat() if slot.end else None
    return out


@router.get("/public/hero-video")
def hero_video(db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> JSONResponse:
    """What the homepage background should be RIGHT NOW, from the saved schedule (not from when the visitor arrived).
    Only the playing video and the one after it are described; nothing else about the library is public."""
    res = hero_video_service.resolve(db, settings)
    db.rollback()
    zone = hero_video_service.tz_of(settings)
    ends = res.current.end if res.current else (res.upcoming[0].start if res.upcoming else None)
    seconds = int((ends - res.now).total_seconds()) if ends else 600
    check_in = max(1, min(seconds, 600))  # the page asks again by then, so a change (or a new slot) is never missed for long
    body = {
        "active": _public_slot(res.current, settings, True) if res.current else None,
        "next": _public_slot(res.next, settings, False) if res.next else None,
        "fallback": res.current is None,
        "timezone": settings.app_timezone,
        "server_time": res.now.astimezone(zone).isoformat(),
        "check_again_in_seconds": check_in,
    }
    return JSONResponse(body, headers={"Cache-Control": f"public, max-age={min(check_in, 60)}"})


def _public_file(db: Session, settings: Settings, video_id: uuid.UUID, kind: str) -> FileResponse:
    res = hero_video_service.resolve(db, settings)
    db.rollback()
    allowed = {s.video.id: s.video for s in ([res.current] if res.current else []) + ([res.next] if res.next else [])}
    video = allowed.get(video_id)  # a video that is not playing or next looks exactly like a missing one
    key = (video.storage_key if kind == "file" else video.poster_key) if video else None
    if not video or not key or not hero_video_service.file_path(settings, key).is_file():
        raise ApiError(404, "not_found", "File not found.")
    ctype = video.content_type if kind == "file" else ("image/webp" if key.endswith(".webp") else "image/png" if key.endswith(".png") else "image/jpeg")
    return FileResponse(hero_video_service.file_path(settings, key), media_type=ctype, headers={"Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff"})


@router.get("/public/hero-videos/{video_id}/file")
def hero_video_file(video_id: uuid.UUID, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> FileResponse:
    return _public_file(db, settings, video_id, "file")


@router.get("/public/hero-videos/{video_id}/poster")
def hero_video_poster(video_id: uuid.UUID, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> FileResponse:
    return _public_file(db, settings, video_id, "poster")
