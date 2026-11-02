"""Website content (CMS): hero text, FAQ entries, projects. Create / edit / publish / unpublish / delete."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.db.session import get_db
from app.models import ContentItem, User
from app.schemas.admin import ContentCreate, ContentUpdate
from app.services import audit_service, content_service as svc

router = APIRouter(prefix="/admin/content", tags=["admin: content"])
read, write = permission("content"), permission("content", write=True)


def _out(i: ContentItem) -> dict:
    return {"id": str(i.id), "kind": i.kind, "slug": i.slug, "title": i.title, "data": i.data or {}, "status": i.status, "sort_order": i.sort_order,
            "created_at": i.created_at.isoformat(), "updated_at": i.updated_at.isoformat()}


@router.get("/kinds")
def kinds(_: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    return {"kinds": svc.kinds_for_ui(), "counts": svc.counts(db)}


@router.get("/{kind}")
def list_items(kind: str, _: User = Depends(read), db: Session = Depends(get_db)) -> list[dict]:
    return [_out(i) for i in svc.list_items(db, kind)]


@router.post("/{kind}", status_code=201)
def create(kind: str, body: ContentCreate, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    item = svc.create(db, user, kind, title=body.title, data=body.data, status=body.status, sort_order=body.sort_order)
    audit_service.record(db, user, "content.create", resource_type=kind, resource_id=item.id, detail={"title": item.title, "status": item.status})
    db.commit()
    db.refresh(item)
    return _out(item)


@router.patch("/item/{item_id}")
def update(item_id: uuid.UUID, body: ContentUpdate, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    item = svc.get_item(db, item_id)
    changed = svc.update(db, user, item, title=body.title, data=body.data, status=body.status, sort_order=body.sort_order)
    if changed:
        action = "content.publish" if "status" in changed and item.status == "published" else "content.unpublish" if "status" in changed else "content.update"
        audit_service.record(db, user, action, resource_type=item.kind, resource_id=item.id, detail={"fields": changed, "title": item.title})
    db.commit()
    db.refresh(item)
    return _out(item)


@router.delete("/item/{item_id}", status_code=204)
def delete(item_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db)) -> Response:
    item = svc.get_item(db, item_id)
    audit_service.record(db, user, "content.delete", resource_type=item.kind, resource_id=item.id, detail={"title": item.title})
    db.delete(item)
    db.commit()
    return Response(status_code=204)
