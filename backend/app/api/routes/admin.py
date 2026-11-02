"""Admin: identity, dashboard, demo requests, audit log and system status. (Other modules live in admin_*.py.)"""

from __future__ import annotations

import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import permission, staff_user, super_admin
from app.api.paging import Paging, day_after, day_start
from app.api.routes.demos import to_out
from app.core.config import Settings, get_settings
from app.core.permissions import MODULES, SUPER_ONLY, effective_permissions
from app.db.session import get_db
from app.models import User
from app.schemas.demo_request import AdminDemoRequestOut, DemoStatusUpdate
from app.services import audit_service, dashboard_service, demo_service, system_service

router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_demo(row) -> dict:
    return {**to_out(row), "user_id": row.user_id}


def identity(user: User) -> dict:
    return {
        "user": {"id": str(user.id), "email": user.email, "full_name": user.full_name, "role": user.role, "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None},
        "permissions": effective_permissions(user),
        "modules": {**MODULES, "users": "Administrators", "audit": "Audit log", "system": "System status"},
        "super_only": list(SUPER_ONLY),
    }


@router.get("/me")
def admin_me(user: User = Depends(staff_user)) -> dict:
    """Who is signed in and what they may use. The UI hides what is not allowed; the server enforces it on every call."""
    return identity(user)


@router.get("/dashboard")
def dashboard(date_from: date | None = Query(None, alias="from"), date_to: date | None = Query(None, alias="to"),
              user: User = Depends(staff_user), db: Session = Depends(get_db)) -> dict:
    end = date_to or date.today()
    start = date_from or end - timedelta(days=29)
    if start > end or (end - start).days > 365:
        start = end - timedelta(days=29)
    return dashboard_service.build(db, user, start, end)


@router.get("/demo-requests", response_model=list[AdminDemoRequestOut])
def list_demo_requests(response: Response, status: str | None = Query(None, pattern="^(pending|contacted|confirmed|cancelled)$"),
                       q: str | None = Query(None, max_length=100), limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
                       _: User = Depends(permission("demo_requests")), db: Session = Depends(get_db)):
    """Newest first. The total number of matches is returned in the X-Total-Count header (for pagination)."""
    rows, total = demo_service.search(db, status=status, q=q, limit=limit, offset=offset)
    response.headers["X-Total-Count"] = str(total)
    return [_admin_demo(r) for r in rows]


@router.patch("/demo-requests/{request_id}", response_model=AdminDemoRequestOut)
def update_demo_request(request_id: uuid.UUID, body: DemoStatusUpdate, user: User = Depends(permission("demo_requests", write=True)), db: Session = Depends(get_db)):
    row = demo_service.get_one(db, request_id)
    before = row.status
    row.status = body.status
    audit_service.record(db, user, "demo_request.status", resource_type="demo_request", resource_id=row.id, detail={"from": before, "to": body.status})
    db.commit()
    db.refresh(row)
    return _admin_demo(row)


@router.get("/audit-logs")
def audit_logs(admin_id: uuid.UUID | None = None, action: str | None = Query(None, max_length=60), status: str | None = Query(None, pattern="^(success|failure)$"),
               date_from: date | None = Query(None, alias="from"), date_to: date | None = Query(None, alias="to"),
               paging: Paging = Depends(), _: User = Depends(super_admin()), db: Session = Depends(get_db)) -> dict:
    rows, total = audit_service.list_logs(db, admin_id=admin_id, action=action, status=status, date_from=day_start(date_from), date_to=day_after(date_to),
                                          page=paging.page, page_size=paging.page_size)
    actions = [a for (a,) in db.execute(select(audit_service.AuditLog.action).distinct().order_by(audit_service.AuditLog.action))]
    items = [{"id": str(r.id), "admin": r.admin_email, "admin_id": str(r.admin_id) if r.admin_id else None, "action": r.action, "resource_type": r.resource_type,
              "resource_id": r.resource_id, "status": r.status, "detail": r.detail, "created_at": r.created_at.isoformat()} for r in rows]
    return {**paging.envelope(items, total), "actions": actions}


@router.get("/system")
def system_status(user: User = Depends(super_admin()), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    return {"items": system_service.snapshot(db, settings)}


@router.post("/system/test-ai")
async def system_test_ai(user: User = Depends(super_admin(write=True)), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """One real, tiny request to the active AI provider (uses a few tokens). Result is remembered for the status page."""
    result = await system_service.test_ai(settings)
    audit_service.record_now(db, user, "system.test_ai", resource_type="system", status="success" if result["ok"] else "failure", detail={"code": result.get("code")})
    return result
