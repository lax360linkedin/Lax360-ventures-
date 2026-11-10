"""Public, read-only data the website uses. Only settings flagged public and PUBLISHED content are ever returned."""

from __future__ import annotations

import time
import uuid

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response
from pydantic import Field
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models import HeroVideo
from app.schemas.common import ApiModel
from app.services import content_service, hero_video_service, media_service, settings_service
from app.core.errors import ApiError

router = APIRouter(tags=["public"])
CACHE = {"Cache-Control": "public, max-age=10"}  # short: a published change reaches visitors within seconds


@router.get("/public/site")
def site(db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> JSONResponse:
    values = settings_service.public_settings(db, settings)
    return JSONResponse({"settings": values}, headers=CACHE)


@router.get("/public/content")
def content(kind: str = Query(..., max_length=30), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> JSONResponse:
    """PUBLISHED items only (drafts, and closed job openings, are never returned)."""
    return JSONResponse({"kind": kind, "items": content_service.public_items(db, settings, kind)}, headers=CACHE)


@router.get("/public/content-all")
def content_all(db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> JSONResponse:
    """Every kind's published items in one response: the website loads this once instead of one request per section."""
    return JSONResponse({"kinds": content_service.public_bundle(db, settings)}, headers=CACHE)


@router.get("/public/contact-options")
def contact_options() -> JSONResponse:
    """The choices on the enquiry form (services and sub-services, industries, budgets, ...). Static, public information."""
    from app import contact_catalog

    return JSONResponse(contact_catalog.public_options(), headers=CACHE)


@router.get("/public/services/{category}/content")
def service_content(category: str, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> JSONResponse:
    """Clients and testimonials for a MAIN service page: everything assigned to the main service or any of its sub-services."""
    return JSONResponse(content_service.service_content(db, settings, category), headers=CACHE)


@router.get("/public/services/{category}/{sub}/content")
def sub_service_content(category: str, sub: str, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> JSONResponse:
    """Clients and testimonials for ONE sub-service page: what is assigned to it, plus what is assigned to its main service as a whole."""
    return JSONResponse(content_service.service_content(db, settings, category, sub), headers=CACHE)


@router.get("/media/{asset_id}")
def media(asset_id: uuid.UUID, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> Response:
    """Public files only. A private file looks exactly like a missing one."""
    asset = media_service.get(db, asset_id, with_data=True)
    if not asset.is_public:
        raise ApiError(404, "not_found", "File not found.")
    if asset.storage == "supabase":  # durable object storage: served by its CDN (byte ranges, caching)
        return RedirectResponse(media_service.url_of(settings, asset), status_code=302, headers={"Cache-Control": "public, max-age=300"})
    path = media_service.local_path(settings, asset)
    if path is not None:
        if not path.is_file():
            raise ApiError(404, "not_found", "File not found.")
        return FileResponse(path, media_type=asset.content_type, headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=3600"})
    return Response(asset.data, media_type=asset.content_type, headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=3600", "Content-Disposition": f'inline; filename="{asset.filename}"'})


# ---- homepage background video ------------------------------------------------------------------
def _file_url(video, kind: str = "file") -> str:
    return f"/api/public/hero-videos/{video.id}/{kind}?v={int(video.updated_at.timestamp())}"


def _public_slot(slot, settings: Settings, full: bool) -> dict:
    zone = hero_video_service.tz_of(settings)
    v = slot.video
    out = {"id": str(v.id), "url": hero_video_service.media_url(settings, v) or _file_url(v), "poster_url": (hero_video_service.media_url(settings, v, "poster") or _file_url(v, "poster")) if v.poster_key else None, "content_type": v.content_type,
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


def _public_file(db: Session, settings: Settings, video_id: uuid.UUID, kind: str):
    res = hero_video_service.resolve(db, settings)
    db.rollback()
    allowed = {s.video.id: s.video for s in ([res.current] if res.current else []) + ([res.next] if res.next else [])}
    video = allowed.get(video_id)  # a video that is not playing or next looks exactly like a missing one
    key = (video.storage_key if kind == "file" else video.poster_key) if video else None
    if not video or not key:
        raise ApiError(404, "not_found", "File not found.")
    if video.storage == "supabase":  # served straight from the storage CDN (byte ranges, caching)
        return RedirectResponse(hero_video_service.media_url(settings, video, kind), status_code=302, headers={"Cache-Control": "public, max-age=300"})
    if not hero_video_service.file_path(settings, key).is_file():
        raise ApiError(404, "not_found", "File not found.")
    ctype = video.content_type if kind == "file" else ("image/webp" if key.endswith(".webp") else "image/png" if key.endswith(".png") else "image/jpeg")
    return FileResponse(hero_video_service.file_path(settings, key), media_type=ctype, headers={"Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff"})


@router.get("/public/hero-videos/{video_id}/file")
def hero_video_file(video_id: uuid.UUID, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    return _public_file(db, settings, video_id, "file")


@router.get("/public/hero-videos/{video_id}/poster")
def hero_video_poster(video_id: uuid.UUID, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    return _public_file(db, settings, video_id, "poster")


class PlaybackReport(ApiModel):
    video_id: uuid.UUID
    ok: bool
    code: str | None = Field(default=None, max_length=60)


_report_hits: dict[str, list[float]] = {}


@router.post("/public/hero-video/report", status_code=204)
def hero_video_report(body: PlaybackReport, request: Request, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> Response:
    """Visitors' browsers say whether the homepage video played. Stored for admin diagnostics only; a failure triggers a server-side check of the
    stored file (which can only mark it missing, never delete it). Unknown or non-current video ids are ignored; heavily throttled per client."""
    now = time.monotonic()
    ip = request.client.host if request.client else "?"
    hits = [t for t in _report_hits.get(ip, []) if now - t < 60]
    if len(hits) >= 10:
        return Response(status_code=204)
    _report_hits[ip] = hits + [now]
    if len(_report_hits) > 5000:
        _report_hits.clear()
    needs_check = hero_video_service.record_playback(db, settings, body.video_id, body.ok, body.code)
    if needs_check:
        video = db.get(HeroVideo, body.video_id)
        if video is not None:
            hero_video_service.verify_video(settings, video)
    db.commit()
    return Response(status_code=204)
