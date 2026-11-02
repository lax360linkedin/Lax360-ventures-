"""Media library. Uploads are the raw file in the request body (no multipart dependency): POST /api/admin/media?filename=logo.png"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.api.paging import Paging
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models import MediaAsset, User
from app.schemas.admin import MediaUpdate
from app.services import audit_service, media_service as svc

router = APIRouter(prefix="/admin/media", tags=["admin: media"])
read, write = permission("media"), permission("media", write=True)


def _out(a: MediaAsset) -> dict:
    return {"id": str(a.id), "filename": a.filename, "content_type": a.content_type, "size_bytes": a.size_bytes, "alt_text": a.alt_text, "is_public": a.is_public,
            "created_at": a.created_at.isoformat(), "updated_at": a.updated_at.isoformat(), "url": f"/api/media/{a.id}" if a.is_public else None,
            "preview_url": f"/api/admin/media/{a.id}/file"}


@router.get("")
def list_media(q: str | None = Query(None, max_length=100), paging: Paging = Depends(), _: User = Depends(read), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    rows, total = svc.search(db, q=q, page=paging.page, page_size=paging.page_size)
    count, size = svc.usage(db)
    return {**paging.envelope([_out(a) for a in rows], total), "limits": {"max_bytes": settings.media_max_bytes, "types": ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]},
            "usage": {"files": count, "bytes": int(size)}}


@router.post("", status_code=201)
async def upload(request: Request, filename: str = Query(..., min_length=1, max_length=200), alt: str | None = Query(None, max_length=200), public: bool = Query(False),
                 user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    data = await request.body()
    asset = svc.create(db, user, data, filename, alt, public, settings.media_max_bytes)
    audit_service.record(db, user, "media.upload", resource_type="media", resource_id=asset.id, detail={"file": asset.filename, "bytes": asset.size_bytes, "public": public})
    db.commit()
    db.refresh(asset)
    return _out(asset)


@router.put("/{asset_id}/file")
async def replace_file(asset_id: uuid.UUID, request: Request, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    asset = svc.get(db, asset_id)
    svc.replace(db, asset, await request.body(), settings.media_max_bytes)
    audit_service.record(db, user, "media.replace", resource_type="media", resource_id=asset.id, detail={"file": asset.filename})
    db.commit()
    db.refresh(asset)
    return _out(asset)


@router.get("/{asset_id}/file")
def preview(asset_id: uuid.UUID, _: User = Depends(read), db: Session = Depends(get_db)) -> Response:
    """Admin-only preview (works for private files too)."""
    asset = svc.get(db, asset_id, with_data=True)
    return Response(asset.data, media_type=asset.content_type, headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Content-Disposition": f'inline; filename="{asset.filename}"'})


@router.patch("/{asset_id}")
def update(asset_id: uuid.UUID, body: MediaUpdate, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
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
    return _out(asset)


@router.delete("/{asset_id}", status_code=204)
def delete(asset_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db)) -> Response:
    asset = svc.get(db, asset_id)
    audit_service.record(db, user, "media.delete", resource_type="media", resource_id=asset.id, detail={"file": asset.filename})
    db.delete(asset)
    db.commit()
    return Response(status_code=204)
