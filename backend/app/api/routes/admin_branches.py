"""Branch locations (admin): add, edit, enable / disable and delete branches, each with its address, phone and an optional Google Maps embed. Branches live in the database, so adding one
needs no code change: an enabled branch appears on the website at once. Needs the website settings permission."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import Field
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.core.errors import ApiError
from app.db.session import get_db
from sqlalchemy import delete

from app.models import Branch, ContactChannel, User
from app.schemas.common import ApiModel, OneLine, OptionalText
from app.services import audit_service, branch_service as svc

router = APIRouter(prefix="/admin/branches", tags=["admin: branch locations"])
read, write = permission("settings"), permission("settings", write=True)


class BranchIn(ApiModel):
    name: OneLine = Field(min_length=2, max_length=160)
    city: OneLine = Field(min_length=2, max_length=80)
    address: OptionalText = Field(default=None, max_length=600)  # one line per row
    phone: OptionalText = Field(default=None, max_length=80)
    map: str | None = Field(default=None, max_length=4000)  # an iframe code or the embed address; stored as the address only
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0, le=100000)


def _out(b: Branch) -> dict:
    return {"id": str(b.id), "slug": b.slug, "name": b.name, "city": b.city, "address": b.address, "phone": b.phone, "map_embed_url": b.map_embed_url, "is_active": b.is_active,
            "sort_order": b.sort_order, "updated_at": b.updated_at.isoformat() if b.updated_at else None}


def _get(db: Session, branch_id: uuid.UUID) -> Branch:
    b = db.get(Branch, branch_id)
    if b is None:
        raise ApiError(404, "not_found", "Branch not found.")
    return b


@router.get("")
def list_branches(_: User = Depends(read), db: Session = Depends(get_db)) -> list[dict]:
    return [_out(b) for b in svc.list_all(db)]


@router.post("", status_code=201)
def create_branch(body: BranchIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    b = svc.create(db, body.model_dump())
    audit_service.record(db, user, "branch.create", resource_type="branch", resource_id=b.id, detail={"city": b.city, "map": bool(b.map_embed_url)})
    db.commit()
    db.refresh(b)
    return _out(b)


@router.put("/{branch_id}")
def update_branch(branch_id: uuid.UUID, body: BranchIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    b = svc.update(db, _get(db, branch_id), body.model_dump())
    audit_service.record(db, user, "branch.update", resource_type="branch", resource_id=b.id, detail={"city": b.city, "active": b.is_active, "map": bool(b.map_embed_url)})
    db.commit()
    db.refresh(b)
    return _out(b)


@router.delete("/{branch_id}", status_code=204)
def delete_branch(branch_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db)) -> Response:
    """Removes the branch. Enquiries and demo requests that named it are kept (their branch just becomes empty). Disable a branch instead to hide it for a while."""
    b = _get(db, branch_id)
    audit_service.record(db, user, "branch.delete", resource_type="branch", resource_id=b.id, detail={"city": b.city})
    db.execute(delete(ContactChannel).where(ContactChannel.owner_type == "branch", ContactChannel.owner_ref == b.slug))  # its own social links and contacts go with it
    db.delete(b)
    db.commit()
    return Response(status_code=204)
