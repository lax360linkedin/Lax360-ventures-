"""Administrator accounts. Only a super admin may call these (enforced in the routes). Rules enforced here as well:
the last active super admin can never be demoted or deactivated, permissions are limited to known modules, and any
role/permission/active change signs the affected person out of all their sessions."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import ApiError
from app.core.permissions import STAFF_ROLES, clean_permissions
from app.core.security import hash_password
from app.models import AuthSession, User
from app.services import auth_service
from app.services.auth_service import utcnow


def list_staff(db: Session) -> list[User]:
    return list(db.scalars(select(User).where(User.role.in_(STAFF_ROLES)).order_by(User.role.desc(), User.created_at)))


def get(db: Session, user_id: uuid.UUID) -> User:
    user = db.get(User, user_id)
    if user is None or user.role not in STAFF_ROLES:
        raise ApiError(404, "not_found", "Administrator not found.")
    return user


def _active_super_admins(db: Session, *, excluding: uuid.UUID | None = None) -> int:
    q = select(func.count()).select_from(User).where(User.role == "super_admin", User.is_active.is_(True))
    if excluding:
        q = q.where(User.id != excluding)
    return db.scalar(q) or 0


def _fields_error(field: str, message: str) -> ApiError:
    return ApiError(422, "validation_error", "Please check the highlighted fields.", fields={field: message})


def create(db: Session, *, email: str, full_name: str, password: str, role: str, permissions: list[str], settings: Settings) -> User:
    if role not in STAFF_ROLES:
        raise _fields_error("role", "Choose admin or super_admin.")
    auth_service.check_password_policy(password, settings, field="password")
    try:
        user = auth_service.create_user(db, email=email, full_name=full_name, password=password, role=role, settings=settings)
    except ValueError as exc:
        raise ApiError(409, "already_exists", str(exc)) from None
    user.permissions = [] if role == "super_admin" else clean_permissions(permissions)
    return user


def revoke_sessions(db: Session, user_id: uuid.UUID) -> None:
    db.execute(update(AuthSession).where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)).values(revoked_at=utcnow()))


def update_staff(db: Session, target: User, *, full_name: str | None, role: str | None, permissions: list[str] | None, is_active: bool | None) -> dict:
    changes: dict = {}
    losing_super = target.role == "super_admin" and target.is_active and (
        (role is not None and role != "super_admin") or (is_active is False)
    )
    if losing_super and _active_super_admins(db, excluding=target.id) == 0:
        raise ApiError(409, "last_super_admin", "At least one active super admin must remain. Create or promote another super admin first.")
    if full_name is not None and full_name != target.full_name:
        target.full_name = full_name
        changes["full_name"] = "changed"
    if role is not None and role != target.role:
        if role not in STAFF_ROLES:
            raise _fields_error("role", "Choose admin or super_admin.")
        changes["role"] = f"{target.role} -> {role}"
        target.role = role
        if role == "super_admin":
            target.permissions = []
    if permissions is not None and target.role == "admin":
        new = clean_permissions(permissions)
        if new != list(target.permissions or []):
            changes["permissions"] = new
            target.permissions = new
    if is_active is not None and is_active != target.is_active:
        changes["is_active"] = is_active
        target.is_active = is_active
    if {"role", "permissions", "is_active"} & changes.keys():
        revoke_sessions(db, target.id)  # takes effect immediately, not at the next login
    return changes


def reset_password(db: Session, target: User, new_password: str, settings: Settings) -> None:
    auth_service.check_password_policy(new_password, settings, field="new_password")
    target.password_hash = hash_password(new_password)
    revoke_sessions(db, target.id)
