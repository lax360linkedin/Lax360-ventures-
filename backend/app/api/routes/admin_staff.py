"""Administrator accounts (super admin only)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import super_admin
from app.core.config import Settings, get_settings
from app.core.permissions import effective_permissions
from app.db.session import get_db
from app.models import User
from app.schemas.admin import PasswordReset, StaffCreate, StaffUpdate
from app.services import admin_users_service as svc, audit_service

router = APIRouter(prefix="/admin/users", tags=["admin: administrators"])
read, write = super_admin(), super_admin(write=True)


def _out(u: User) -> dict:
    return {"id": str(u.id), "email": u.email, "full_name": u.full_name, "role": u.role, "is_active": u.is_active, "permissions": list(u.permissions or []),
            "effective_permissions": effective_permissions(u), "created_at": u.created_at.isoformat(), "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None}


@router.get("")
def list_admins(_: User = Depends(read), db: Session = Depends(get_db)) -> list[dict]:
    return [_out(u) for u in svc.list_staff(db)]


@router.post("", status_code=201)
def create_admin(body: StaffCreate, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    new = svc.create(db, email=body.email, full_name=body.full_name, password=body.password, role=body.role, permissions=body.permissions, settings=settings)
    audit_service.record(db, user, "admin.create", resource_type="admin", resource_id=new.id, detail={"email": new.email, "role": new.role, "permissions": new.permissions})
    db.commit()
    db.refresh(new)
    return _out(new)


@router.patch("/{user_id}")
def update_admin(user_id: uuid.UUID, body: StaffUpdate, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    target = svc.get(db, user_id)
    try:
        changes = svc.update_staff(db, target, full_name=body.full_name, role=body.role, permissions=body.permissions, is_active=body.is_active)
    except Exception:
        db.rollback()
        audit_service.record_now(db, user, "admin.update", resource_type="admin", resource_id=user_id, status="failure", detail={"attempted": sorted(body.model_fields_set)})
        raise
    if changes:
        audit_service.record(db, user, "admin.update", resource_type="admin", resource_id=target.id, detail={**changes, "email": target.email})
    db.commit()
    db.refresh(target)
    return _out(target)


@router.post("/{user_id}/reset-password", status_code=204)
def reset_password(user_id: uuid.UUID, body: PasswordReset, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> None:
    """Sets a new password (the person is signed out everywhere). There is no email-based reset because the site sends no email."""
    target = svc.get(db, user_id)
    svc.reset_password(db, target, body.new_password, settings)
    audit_service.record(db, user, "admin.reset_password", resource_type="admin", resource_id=target.id, detail={"email": target.email})
    db.commit()
