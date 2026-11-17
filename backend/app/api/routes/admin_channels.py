"""Social media links and contact details (admin): add, edit, enable / disable, delete, re-order and choose where each item is shown (header, footer, Contact page, social section).
Everything is stored in the database, so a change needs no code change and shows on the website as soon as it is saved. Needs the website settings permission."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from pydantic import Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.core.errors import ApiError
from app.db.session import get_db
from app.models import Branch, ContactChannel, ContentItem, User
from app.schemas.common import ApiModel
from app.services import audit_service, channel_service as svc

router = APIRouter(prefix="/admin/channels", tags=["admin: social and contact"])
read, write = permission("settings"), permission("settings", write=True)


class ChannelIn(ApiModel):
    owner_type: str = Field(default="global", max_length=10)  # global | branch | partner
    owner_ref: str | None = Field(default=None, max_length=120)  # the branch's or partner's slug
    kind: str = Field(max_length=10)
    type: str = Field(max_length=20)
    label: str | None = Field(default=None, max_length=120)
    value: str = Field(max_length=1000)
    note: str | None = Field(default=None, max_length=160)
    detail: str | None = Field(default=None, max_length=600)
    icon: str | None = Field(default=None, max_length=30)
    locations: list[str] = Field(default_factory=list, max_length=8)
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0, le=100000)


class ReorderIn(ApiModel):
    ids: list[uuid.UUID] = Field(min_length=1, max_length=200)


def _get(db: Session, channel_id: uuid.UUID) -> ContactChannel:
    row = db.get(ContactChannel, channel_id)
    if row is None:
        raise ApiError(404, "not_found", "Item not found.")
    return row


@router.get("/owners")
def owners(_: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    """The branches and partners whose own social links and contact details can be managed, with how many items each has."""
    counts = {(t, r): n for t, r, n in db.execute(select(ContactChannel.owner_type, ContactChannel.owner_ref, func.count()).where(ContactChannel.owner_type != "global").group_by(ContactChannel.owner_type, ContactChannel.owner_ref))}
    return {
        "branches": [{"slug": b.slug, "city": b.city, "name": b.name, "active": b.is_active, "count": counts.get(("branch", b.slug), 0)} for b in db.scalars(select(Branch).order_by(Branch.sort_order, Branch.city))],
        "partners": [{"slug": i.slug, "title": i.title, "status": i.status, "count": counts.get(("partner", i.slug), 0)} for i in db.scalars(select(ContentItem).where(ContentItem.kind == "network_partner").order_by(ContentItem.sort_order, ContentItem.title))],
    }


@router.get("")
def list_channels(owner_type: str = Query("global", max_length=10), owner_ref: str | None = Query(None, max_length=120), _: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    """One owner's list: the global LAX360 links by default, or ?owner_type=branch|partner&owner_ref=<slug>."""
    if owner_type not in svc.OWNER_TYPES or (owner_type == "global") != (owner_ref is None):
        raise ApiError(422, "validation_error", "Choose a branch or partner.")
    return {"items": [svc.out_admin(c) for c in svc.list_all(db, owner_type, owner_ref)], **svc.catalog()}


@router.post("", status_code=201)
def create_channel(body: ChannelIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    row = svc.create(db, body.model_dump())
    audit_service.record(db, user, "channel.create", resource_type="channel", resource_id=row.id, detail={"owner": row.owner_type, "ref": row.owner_ref, "kind": row.kind, "type": row.type, "locations": row.locations})
    db.commit()
    db.refresh(row)
    return svc.out_admin(row)


@router.post("/reorder")
def reorder_channels(body: ReorderIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    svc.reorder(db, body.ids)
    audit_service.record(db, user, "channel.reorder", resource_type="channel", detail={"count": len(body.ids)})
    db.commit()
    first = db.get(ContactChannel, body.ids[0])
    return {"items": [svc.out_admin(c) for c in svc.list_all(db, first.owner_type, first.owner_ref)]}


@router.put("/{channel_id}")
def update_channel(channel_id: uuid.UUID, body: ChannelIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    row = svc.update(db, _get(db, channel_id), body.model_dump())
    audit_service.record(db, user, "channel.update", resource_type="channel", resource_id=row.id, detail={"kind": row.kind, "type": row.type, "active": row.is_active, "locations": row.locations})
    db.commit()
    db.refresh(row)
    return svc.out_admin(row)


@router.delete("/{channel_id}", status_code=204)
def delete_channel(channel_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db)) -> Response:
    """Removes the item from the website everywhere. Disable it instead to hide it for a while."""
    row = _get(db, channel_id)
    audit_service.record(db, user, "channel.delete", resource_type="channel", resource_id=row.id, detail={"kind": row.kind, "type": row.type})
    db.delete(row)
    db.commit()
    return Response(status_code=204)
