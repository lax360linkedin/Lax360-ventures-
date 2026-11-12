"""Website content (CMS). Create / edit / publish / unpublish / reorder / delete, with a separate permission module per area
(content, services, careers, navigation). Drafts are visible here and in the preview endpoint, never in the public API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import staff_user, staff_user_csrf
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.permissions import has_permission
from app.db.session import get_db
from app.models import ContentItem, User
from app.schemas.admin import ContentCreate, ContentOrder, ContentUpdate
from app.services import audit_service, content_service as svc, settings_service

router = APIRouter(prefix="/admin", tags=["admin: content"])


def _allow(user: User, kind: str) -> dict:
    """The kind's own permission module decides: services -> `services`, jobs -> `careers`, menus & SEO -> `navigation`, the rest -> `content`."""
    spec = svc.get_kind(kind)
    if not has_permission(user, spec["module"]):
        raise ApiError(403, "forbidden", "You do not have permission for this action.")
    return spec


def _out(i: ContentItem) -> dict:
    return {"id": str(i.id), "kind": i.kind, "slug": i.slug, "title": i.title, "data": i.data or {}, "status": i.status, "sort_order": i.sort_order,
            "created_at": i.created_at.isoformat(), "updated_at": i.updated_at.isoformat()}


@router.get("/content/kinds")
def kinds(user: User = Depends(staff_user), db: Session = Depends(get_db)) -> dict:
    visible = svc.kinds_for_ui(db, user)
    if not visible:
        raise ApiError(403, "forbidden", "You do not have permission for this action.")
    counts = svc.counts(db)
    return {"kinds": visible, "counts": {k["kind"]: counts[k["kind"]] for k in visible}, "groups": [g for g in svc.GROUP_ORDER if any(k["group"] == g for k in visible)]}


@router.get("/content/{kind}")
def list_items(kind: str, user: User = Depends(staff_user), db: Session = Depends(get_db)) -> list[dict]:
    _allow(user, kind)
    return [_out(i) for i in svc.list_items(db, kind)]


@router.post("/content/{kind}", status_code=201)
def create(kind: str, body: ContentCreate, user: User = Depends(staff_user_csrf), db: Session = Depends(get_db)) -> dict:
    _allow(user, kind)
    item = svc.create(db, user, kind, title=body.title, data=body.data, status=body.status, sort_order=body.sort_order)
    audit_service.record(db, user, "content.create", resource_type=kind, resource_id=item.id, detail={"title": item.title, "status": item.status})
    db.commit()
    db.refresh(item)
    return _out(item)


@router.put("/content/{kind}/order")
def order(kind: str, body: ContentOrder, user: User = Depends(staff_user_csrf), db: Session = Depends(get_db)) -> list[dict]:
    """Set the display order: `ids` is every item of this kind, in the order they should appear."""
    _allow(user, kind)
    svc.reorder(db, kind, body.ids)
    audit_service.record(db, user, "content.reorder", resource_type=kind, detail={"count": len(body.ids)})
    db.commit()
    return [_out(i) for i in svc.list_items(db, kind)]


@router.post("/content/{kind}/dedupe")
def dedupe(kind: str, apply: bool = Query(False), user: User = Depends(staff_user_csrf), db: Session = Depends(get_db)) -> dict:
    """Repeated pictures (carousel): `apply=false` lists what would be removed, `apply=true` removes the later copies. Unique pictures and their order are untouched."""
    _allow(user, kind)
    if kind not in svc.UNIQUE_PICTURE_KINDS:
        raise ApiError(404, "not_found", "Duplicate checking is not used for this content type.")
    groups = svc.duplicate_groups(db, kind)
    found = [{"kept": {"id": str(k.id), "title": k.title}, "duplicates": [{"id": str(d.id), "title": d.title} for d in v]} for k, v in groups]
    removed = 0
    if apply and groups:
        removed = len(svc.remove_duplicates(db, kind))
        audit_service.record(db, user, "content.dedupe", resource_type=kind, detail={"removed": removed})
        db.commit()
    return {"groups": found, "duplicates": sum(len(g["duplicates"]) for g in found), "removed": removed}


@router.patch("/content/item/{item_id}")
def update(item_id: uuid.UUID, body: ContentUpdate, user: User = Depends(staff_user_csrf), db: Session = Depends(get_db)) -> dict:
    item = svc.get_item(db, item_id)
    _allow(user, item.kind)
    changed = svc.update(db, user, item, title=body.title, data=body.data, status=body.status, sort_order=body.sort_order)
    if changed:
        action = "content.publish" if "status" in changed and item.status == "published" else "content.unpublish" if "status" in changed else "content.update"
        audit_service.record(db, user, action, resource_type=item.kind, resource_id=item.id, detail={"fields": changed, "title": item.title})
    db.commit()
    db.refresh(item)
    return _out(item)


@router.delete("/content/item/{item_id}", status_code=204)
def delete(item_id: uuid.UUID, user: User = Depends(staff_user_csrf), db: Session = Depends(get_db)) -> Response:
    """Removes the content item only. Media files it used stay in the media library (nothing cascades to them)."""
    item = svc.get_item(db, item_id)
    _allow(user, item.kind)
    audit_service.record(db, user, "content.delete", resource_type=item.kind, resource_id=item.id, detail={"title": item.title})
    db.delete(item)
    db.commit()
    return Response(status_code=204)


# ---- preview: the public shape of the content INCLUDING drafts, for the admin's "preview on the site" tab ------------------------
@router.get("/preview/content")
def preview_all(user: User = Depends(staff_user), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    kinds_visible = {k["kind"] for k in svc.kinds_for_ui(db, user)}
    if not kinds_visible:
        raise ApiError(403, "forbidden", "You do not have permission for this action.")
    return {"preview": True, "kinds": {k: (svc.public_items(db, settings, k, include_drafts=True) if k in kinds_visible else svc.public_items(db, settings, k)) for k in svc.KINDS}}


@router.get("/preview/site")
def preview_site(_: User = Depends(staff_user), db: Session = Depends(get_db), settings: Settings = Depends(get_settings), key: str | None = Query(None)) -> dict:
    return {"preview": True, "settings": settings_service.public_settings(db, settings)}
