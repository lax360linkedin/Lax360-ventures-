"""Media library (images, PDFs, videos). Uploads are the raw file in the request body (no multipart dependency):
POST /api/admin/media?filename=logo.png. Files are stored in durable object storage; nothing is ever deleted except by an explicit DELETE."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.api.paging import Paging
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.db.session import get_db
from app.models import MediaAsset, User
from app.schemas.admin import MediaUpdate
from app.services import audit_service, media_service as svc, object_storage as store

router = APIRouter(prefix="/admin/media", tags=["admin: media"])
read, write = permission("media"), permission("media", write=True)
NO_STORE = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}


def _out(settings: Settings, a: MediaAsset, usages: list[dict] | None = None) -> dict:
    out = {"id": str(a.id), "filename": a.filename, "content_type": a.content_type, "kind": a.kind, "size_bytes": a.size_bytes, "alt_text": a.alt_text, "is_public": a.is_public,
           "storage": a.storage, "created_at": a.created_at.isoformat(), "updated_at": a.updated_at.isoformat(), "url": svc.url_of(settings, a) if a.is_public else None,
           "preview_url": f"/api/admin/media/{a.id}/file"}
    if usages is not None:
        out["usage_count"], out["used_by_published"] = len(usages), any(u["status"] == "published" for u in usages)
    return out


@router.get("")
def list_media(q: str | None = Query(None, max_length=100), type: str | None = Query(None, max_length=12), sort: str = Query("newest", max_length=10), paging: Paging = Depends(),
               _: User = Depends(read), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    rows, total = svc.search(db, q=q, kind=type, sort=sort, page=paging.page, page_size=paging.page_size)
    refs = svc.references(db, [a.id for a in rows])
    count, size = svc.usage(db)
    return {**paging.envelope([_out(settings, a, refs[a.id]) for a in rows], total),
            "limits": {"max_bytes": settings.media_max_bytes, "video_max_bytes": settings.hero_video_max_bytes, "types": svc.ALLOWED_TYPES},
            "usage": {"files": count, "bytes": int(size)}, "storage": store.durability(settings)}


@router.get("/{asset_id}")
def get_one(asset_id: uuid.UUID, _: User = Depends(read), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    asset = svc.get(db, asset_id)
    return _out(settings, asset, svc.references(db, [asset.id])[asset.id])


@router.post("", status_code=201)
async def upload(request: Request, filename: str = Query(..., min_length=1, max_length=200), alt: str | None = Query(None, max_length=200), public: bool = Query(False),
                 user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    prep = await svc.receive(request, settings, filename)
    try:
        asset, duplicate = svc.create(db, settings, user, prep, alt, public)
        if not duplicate:
            audit_service.record(db, user, "media.upload", resource_type="media", resource_id=asset.id, detail={"file": asset.filename, "bytes": asset.size_bytes, "public": public, "kind": asset.kind})
        db.commit()
    except BaseException:
        db.rollback()
        prep.tmp.unlink(missing_ok=True)
        raise
    db.refresh(asset)
    return {**_out(settings, asset), "duplicate": duplicate}


@router.put("/{asset_id}/file")
async def replace_file(asset_id: uuid.UUID, request: Request, filename: str | None = Query(None, max_length=200), delete_previous: bool = Query(False),
                       user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    asset = svc.get(db, asset_id)
    prep = await svc.receive(request, settings, filename or asset.filename)
    try:
        archive, stale = svc.replace(db, settings, user, asset, prep, delete_previous=delete_previous)
        audit_service.record(db, user, "media.replace", resource_type="media", resource_id=asset.id, detail={"file": asset.filename, "previous_kept": archive is not None})
        db.commit()
    except BaseException:
        db.rollback()
        prep.tmp.unlink(missing_ok=True)
        raise
    svc.remove_stale(settings, stale)  # only after the commit, and only when the admin asked for the previous file to go
    db.refresh(asset)
    return {**_out(settings, asset), "previous_item": str(archive.id) if archive else None}


@router.get("/{asset_id}/file")
def preview(asset_id: uuid.UUID, _: User = Depends(read), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    """Admin-only preview (works for private files too)."""
    asset = svc.get(db, asset_id, with_data=True)
    if asset.storage == "supabase":
        return RedirectResponse(svc.url_of(settings, asset), status_code=302, headers=NO_STORE)
    path = svc.local_path(settings, asset)
    if path is not None:
        if not path.is_file():
            raise ApiError(404, "not_found", "The stored file is missing from the server disk.")
        return FileResponse(path, media_type=asset.content_type, headers=NO_STORE)
    return Response(asset.data, media_type=asset.content_type, headers={**NO_STORE, "Content-Disposition": f'inline; filename="{asset.filename}"'})


@router.get("/{asset_id}/usage")
def usage(asset_id: uuid.UUID, _: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    """Where this file is used (so an admin can see what a deletion would affect)."""
    asset = svc.get(db, asset_id)
    items = svc.references(db, [asset.id])[asset.id]
    return {"id": str(asset.id), "filename": asset.filename, "items": items, "used_by_published": any(i["status"] == "published" for i in items)}


@router.patch("/{asset_id}")
def update(asset_id: uuid.UUID, body: MediaUpdate, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    asset = svc.get(db, asset_id)
    changed = []
    if "alt_text" in body.model_fields_set and body.alt_text != asset.alt_text:
        asset.alt_text = body.alt_text or None
        changed.append("alt_text")
    if body.is_public is not None and body.is_public != asset.is_public:
        asset.is_public = body.is_public
        changed.append("is_public")
    if changed:
        audit_service.record(db, user, "media.update", resource_type="media", resource_id=asset.id, detail={"fields": changed, "public": asset.is_public})
    db.commit()
    db.refresh(asset)
    return _out(settings, asset)


@router.delete("/{asset_id}", status_code=204)
def delete(asset_id: uuid.UUID, force: bool = Query(False), user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> Response:
    """Delete a library item for good (database record AND stored file). A file that website content still uses is protected: the call is refused
    with the list of places that use it, unless `force=true` (the admin has been warned and confirmed)."""
    asset = svc.get(db, asset_id)
    items = svc.references(db, [asset.id])[asset.id]
    if items and not force:
        raise ApiError(409, "media_in_use", f"This file is used in {len(items)} place(s) on the website. Remove it from them first, or confirm the deletion.", details={"usage": items})
    stale = svc.stale_object(asset)
    audit_service.record(db, user, "media.delete", resource_type="media", resource_id=asset.id, detail={"file": asset.filename, "was_in_use": bool(items), "forced": force})
    db.delete(asset)
    db.commit()
    svc.remove_stale(settings, stale)
    return Response(status_code=204)
