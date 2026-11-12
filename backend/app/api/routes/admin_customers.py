"""Registered website users (customers): statistics, list with search and filters, one person's full registration details and history, CSV export, activate / deactivate, and deletion.
Granting administrator access, setting a password and deleting an account are super-admin only. A customer is a `user`-role account; administrators are managed under /admin/users and
never appear here. Everything is checked on the server: the admin screen only mirrors it."""

from __future__ import annotations

import csv
import io
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import String, and_, cast, func, or_, select
from sqlalchemy.orm import Session

from app import user_catalog
from app.api.deps import permission, super_admin
from app.api.paging import Paging, day_after, day_start
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.permissions import clean_permissions
from app.db.session import get_db
from app.models import ContactEnquiry, DemoRequest, User, UserProfile
from app.schemas.admin import CustomerPromote, CustomerUpdate, PasswordReset
from app.services import admin_users_service, audit_service

router = APIRouter(prefix="/admin/customers", tags=["admin: registered users"])
read, write = permission("customers"), permission("customers", write=True)
super_write = super_admin(write=True)

PROFILE_COLUMNS = ("mobile", "category", "institution", "course", "department", "study_year", "company", "job_role", "industry", "experience_years", "other_details", "purposes", "purpose_note")


def _customer(db: Session, user_id: uuid.UUID) -> User:
    user = db.get(User, user_id)
    if user is None or user.role != "user":
        raise ApiError(404, "not_found", "Registered user not found.")  # administrators are never exposed or edited through this module
    return user


def _profile(u: User) -> dict | None:
    p = u.profile
    if p is None:
        return None
    return {**{k: getattr(p, k) for k in PROFILE_COLUMNS}, "purposes": list(p.purposes or [])}


def _out(u: User, enquiries: int = 0, demos: int = 0) -> dict:
    p = u.profile
    return {"id": str(u.id), "full_name": u.full_name, "email": u.email, "is_active": u.is_active, "created_at": u.created_at.isoformat(),
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None, "enquiries": enquiries, "demo_requests": demos,
            "mobile": p.mobile if p else None, "category": p.category if p else None, "company": p.company if p else None, "institution": p.institution if p else None,
            "purposes": list(p.purposes or []) if p else []}


class Filters:
    """The list / export filters, shared so an export contains exactly what the screen shows."""

    def __init__(self, q: str = Query("", max_length=100), status: str = Query("all", pattern="^(all|active|inactive)$"),
                 category: str = Query("", pattern="^(|student|professional|other|none)$"), company: str = Query("", max_length=100), institution: str = Query("", max_length=100),
                 purpose: str = Query("", max_length=20), registered_from: date | None = None, registered_to: date | None = None) -> None:
        if purpose and purpose not in user_catalog.PURPOSES:
            raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"purpose": "Unknown purpose."})
        self.q, self.status, self.category, self.company, self.institution, self.purpose = q.strip().lower(), status, category, company.strip().lower(), institution.strip().lower(), purpose
        self.registered_from, self.registered_to = registered_from, registered_to

    def conditions(self) -> list:
        cond = [User.role == "user"]
        if self.status != "all":
            cond.append(User.is_active.is_(self.status == "active"))
        if self.q:
            like = f"%{self.q.replace('%', '').replace('_', '')}%"
            digits = "".join(ch for ch in self.q if ch.isdigit())
            match = [func.lower(User.full_name).like(like), func.lower(User.email).like(like)]
            if len(digits) >= 3:  # a mobile number is searched by its digits, however it was typed
                match.append(UserProfile.mobile.like(f"%{digits}%"))
            cond.append(or_(*match))
        if self.category == "none":
            cond.append(UserProfile.category.is_(None))
        elif self.category:
            cond.append(UserProfile.category == self.category)
        if self.company:
            cond.append(func.lower(UserProfile.company).like(f"%{self.company.replace('%', '').replace('_', '')}%"))
        if self.institution:
            cond.append(func.lower(UserProfile.institution).like(f"%{self.institution.replace('%', '').replace('_', '')}%"))
        if self.purpose:
            cond.append(cast(UserProfile.purposes, String).like(f'%"{self.purpose}"%'))  # the purpose is one of a fixed set of codes (validated above)
        if self.registered_from:
            cond.append(User.created_at >= day_start(self.registered_from))
        if self.registered_to:
            cond.append(User.created_at < day_after(self.registered_to))
        return cond

    def query(self):
        return select(User).outerjoin(UserProfile, UserProfile.user_id == User.id).where(and_(*self.conditions()))


@router.get("")
def list_customers(f: Filters = Depends(), sort: str = Query("newest", pattern="^(newest|oldest|name|last_login)$"), paging: Paging = Depends(), _: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    total = db.scalar(select(func.count()).select_from(f.query().subquery())) or 0
    order = {"newest": User.created_at.desc(), "oldest": User.created_at.asc(), "name": func.lower(User.full_name), "last_login": User.last_login_at.desc().nullslast()}[sort]
    users = list(db.scalars(f.query().order_by(order).limit(paging.page_size).offset((paging.page - 1) * paging.page_size)))
    ids = [u.id for u in users]
    enq = dict(db.execute(select(ContactEnquiry.user_id, func.count()).where(ContactEnquiry.user_id.in_(ids)).group_by(ContactEnquiry.user_id)).all()) if ids else {}
    dem = dict(db.execute(select(DemoRequest.user_id, func.count()).where(DemoRequest.user_id.in_(ids)).group_by(DemoRequest.user_id)).all()) if ids else {}
    return {**paging.envelope([_out(u, enq.get(u.id, 0), dem.get(u.id, 0)) for u in users], total), "summary": _summary(db)}


def _summary(db: Session) -> dict:
    base = select(func.count()).select_from(User).where(User.role == "user")
    return {"total": db.scalar(base) or 0, "active": db.scalar(base.where(User.is_active.is_(True))) or 0}


@router.get("/stats")
def stats(days: int = Query(30, ge=7, le=365), _: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    """Totals by category, new registrations, a daily registration trend and the most common reasons for visiting (counts only: no personal data)."""
    now = datetime.now(timezone.utc)
    users = select(User.id).where(User.role == "user")
    total = db.scalar(select(func.count()).select_from(users.subquery())) or 0
    by_cat = dict(db.execute(select(UserProfile.category, func.count()).join(User, User.id == UserProfile.user_id).where(User.role == "user").group_by(UserProfile.category)).all())
    counts = {c: by_cat.get(c, 0) for c in user_catalog.CATEGORIES}
    counts["not_provided"] = max(0, total - sum(counts.values()))  # accounts created before registration collected a category
    new = lambda d: db.scalar(select(func.count()).select_from(User).where(User.role == "user", User.created_at >= now - timedelta(days=d))) or 0  # noqa: E731
    day = func.date_trunc("day", User.created_at)
    since = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    per_day = {d.date(): n for d, n in db.execute(select(day, func.count()).where(User.role == "user", User.created_at >= since).group_by(day)).all()}
    trend = [{"date": (since + timedelta(days=i)).date().isoformat(), "count": per_day.get((since + timedelta(days=i)).date(), 0)} for i in range(days)]
    purpose_counts: dict[str, int] = {}
    for (purposes,) in db.execute(select(UserProfile.purposes).join(User, User.id == UserProfile.user_id).where(User.role == "user")).all():
        for code in purposes or []:
            purpose_counts[code] = purpose_counts.get(code, 0) + 1
    top = sorted(purpose_counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return {"total": total, "active": _summary(db)["active"], "categories": counts, "new": {"today": new(1), "week": new(7), "month": new(30)}, "trend": trend, "days": days,
            "purposes": [{"code": c, "label": user_catalog.PURPOSES.get(c, c), "count": n} for c, n in top]}


def _cell(value) -> str:
    """CSV cell, safe against spreadsheet formula injection (a value starting with = + - @ is stored by a visitor, so it is never allowed to run as a formula)."""
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


@router.get("/export")
def export_customers(f: Filters = Depends(), user: User = Depends(read), db: Session = Depends(get_db)) -> Response:
    """CSV of the customers matching the filters (the same ones as the list). Contains personal data: only for administrators who hold this module, and every export is recorded in the audit log."""
    users = list(db.scalars(f.query().order_by(User.created_at.desc()).limit(10000)))
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["Name", "Email", "Mobile", "Category", "Institution", "Course", "Department", "Year of study", "Company", "Job role", "Industry", "Years of experience", "Other details", "Visit purposes",
                "Purpose note", "Account", "Registered", "Last login"])
    for u in users:
        p = u.profile
        w.writerow([_cell(x) for x in (u.full_name, u.email, p.mobile if p else "", user_catalog.CATEGORY_LABELS.get(p.category, "") if p else "", p.institution if p else "", p.course if p else "",
                                       p.department if p else "", p.study_year if p else "", p.company if p else "", p.job_role if p else "", p.industry if p else "", p.experience_years if p else "",
                                       p.other_details if p else "", "; ".join(user_catalog.PURPOSES.get(c, c) for c in (p.purposes or [])) if p else "", p.purpose_note if p else "",
                                       "Active" if u.is_active else "Deactivated", u.created_at.date().isoformat(), u.last_login_at.date().isoformat() if u.last_login_at else "")])
    audit_service.record(db, user, "customer.export", resource_type="customer", detail={"rows": len(users)})
    db.commit()
    return Response(out.getvalue().encode("utf-8-sig"), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="registered-users-{date.today().isoformat()}.csv"', "Cache-Control": "no-store"})


@router.get("/{user_id}")
def customer_detail(user_id: uuid.UUID, _: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    u = _customer(db, user_id)
    enquiries = list(db.scalars(select(ContactEnquiry).where(ContactEnquiry.user_id == u.id).order_by(ContactEnquiry.created_at.desc()).limit(50)))
    demos = list(db.scalars(select(DemoRequest).where(DemoRequest.user_id == u.id).order_by(DemoRequest.created_at.desc()).limit(50)))
    return {**_out(u, len(enquiries), len(demos)), "profile": _profile(u),
            "enquiry_history": [{"id": str(e.id), "subject": e.subject, "type": e.enquiry_type, "status": e.status, "created_at": e.created_at.isoformat()} for e in enquiries],
            "demo_history": [{"id": str(d.id), "interest": d.interest, "status": d.status, "preferred_date": d.preferred_date.isoformat() if d.preferred_date else None, "created_at": d.created_at.isoformat()} for d in demos]}


@router.patch("/{user_id}")
def update_customer(user_id: uuid.UUID, body: CustomerUpdate, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    u = _customer(db, user_id)
    changes = {}
    if body.full_name is not None and body.full_name != u.full_name:
        u.full_name = body.full_name
        changes["full_name"] = "changed"
    if body.is_active is not None and body.is_active != u.is_active:
        u.is_active = body.is_active
        changes["is_active"] = body.is_active
        if not body.is_active:
            admin_users_service.revoke_sessions(db, u.id)  # a deactivated account is signed out at once, not at its next login
    if changes:
        audit_service.record(db, user, "customer.update", resource_type="customer", resource_id=u.id, detail={**changes, "email": u.email})
    db.commit()
    db.refresh(u)
    return _out(u)


@router.delete("/{user_id}", status_code=204)
def delete_customer(user_id: uuid.UUID, user: User = Depends(super_write), db: Session = Depends(get_db)) -> Response:
    """Super admin only, in two steps by design (data-retention rule): an account must first be DEACTIVATED, then it can be deleted. Deleting removes the account, its sessions and its
    registration details. Enquiries and demo requests the person sent are business records of what was asked, so they are kept but no longer linked to any account; the audit log records
    only that an account was deleted (no name or email)."""
    u = _customer(db, user_id)
    if u.is_active:
        raise ApiError(409, "deactivate_first", "Deactivate the account first. Only a deactivated account can be deleted.")
    category = u.profile.category if u.profile else None
    audit_service.record(db, user, "customer.delete", resource_type="customer", resource_id=u.id, detail={"category": category})
    db.delete(u)
    db.commit()
    return Response(status_code=204)


@router.post("/{user_id}/reset-password", status_code=204)
def reset_customer_password(user_id: uuid.UUID, body: PasswordReset, user: User = Depends(super_write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> None:
    """Super admin only: set a new password for a customer who cannot use the e-mail reset (they are signed out everywhere)."""
    u = _customer(db, user_id)
    admin_users_service.reset_password(db, u, body.new_password, settings)
    audit_service.record(db, user, "customer.reset_password", resource_type="customer", resource_id=u.id, detail={"email": u.email})
    db.commit()


@router.post("/{user_id}/make-admin")
def make_administrator(user_id: uuid.UUID, body: CustomerPromote, user: User = Depends(super_write), db: Session = Depends(get_db)) -> dict:
    """Super admin only: give a website customer administrator access limited to the chosen modules (never super admin from here). The person is signed out of every session so the
    new role takes effect on their next login, and from then on is managed under Administrators. Registration can never do this: it only ever creates a customer."""
    u = _customer(db, user_id)
    if not u.is_active:
        raise ApiError(409, "inactive", "Activate the account first.")
    u.role = "admin"
    u.permissions = clean_permissions(body.permissions)
    admin_users_service.revoke_sessions(db, u.id)
    audit_service.record(db, user, "customer.make_admin", resource_type="customer", resource_id=u.id, detail={"email": u.email, "permissions": u.permissions})
    db.commit()
    return {"id": str(u.id), "role": u.role, "permissions": list(u.permissions)}
