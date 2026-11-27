"""Enquiry center: ONE overview of every form submitted on the website (contact forms, the intro contact card, upcoming-service interest, partnership enquiries and applications, demo and
consultation requests) grouped into the enquiry categories, plus the management of the Google Sheets copy (worksheet names, on/off, setup, retry). Read-only for the data: the records
themselves are handled in Enquiries & leads and in Partnerships."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.db.session import get_db
from app.enquiry_categories import CATEGORIES, contact_category
from app.models import ContactEnquiry, DemoRequest, PartnershipApplication, User
from app.services import audit_service, sheets_service

router = APIRouter(prefix="/admin/enquiry-center", tags=["admin: enquiry center"])
read = permission("enquiries")
sheets_read, sheets_write = permission("settings"), permission("settings", write=True)
LIMIT = 50000


def _aware(dt: datetime | None) -> datetime:
    return dt if dt is not None and dt.tzinfo else (dt or datetime.now(timezone.utc)).replace(tzinfo=timezone.utc)


@router.get("/categories")
def categories(_: User = Depends(read)) -> list[dict]:
    """The enquiry categories (for filters and the Google Sheets settings)."""
    return [{"key": k, "label": label, "purpose": purpose, "default_worksheet": tab} for k, label, tab, purpose in CATEGORIES]


@router.get("")
def overview(_: User = Depends(read), db: Session = Depends(get_db)) -> dict:
    """Counts per category (total, new, last 7 and 30 days) across all forms, the recent submissions, and where each category is managed."""
    now = datetime.now(timezone.utc)
    d7, d30 = now - timedelta(days=7), now - timedelta(days=30)
    cats = {k: {"key": k, "label": label, "purpose": purpose, "total": 0, "new": 0, "last7": 0, "last30": 0} for k, label, _tab, purpose in CATEGORIES}
    recent: list[dict] = []

    def bump(cat: str, created: datetime, is_new: bool) -> None:
        c = cats[cat]
        c["total"] += 1
        c["new"] += 1 if is_new else 0
        c["last7"] += 1 if created >= d7 else 0
        c["last30"] += 1 if created >= d30 else 0

    for e in db.scalars(select(ContactEnquiry).where(ContactEnquiry.archived_at.is_(None)).order_by(ContactEnquiry.created_at.desc()).limit(LIMIT)):
        cat, created = contact_category(e.enquiry_type, e.source, sheets_service.enquiry_text(e)), _aware(e.created_at)
        bump(cat, created, e.status == "new")
        recent.append({"kind": "enquiry", "id": str(e.id), "name": e.name, "category": cat, "status": e.status, "created_at": created.isoformat()})
    for a in db.scalars(select(PartnershipApplication).order_by(PartnershipApplication.created_at.desc()).limit(LIMIT)):
        created = _aware(a.created_at)
        cat = {"franchise": "franchise", "authorized": "authorized", "referral": "referral"}.get(a.category, "other")
        bump(cat, created, a.status == "new")
        if (a.consultation or {}).get("date") or (a.consultation or {}).get("time"):
            bump("consultation", created, a.status == "new")
        from app.services import partnership_service as ps

        if a.all_divisions or any(d in ps.upcoming_slugs(db) for d in ps.divisions_of(a)):
            bump("upcoming", created, a.status == "new")
        recent.append({"kind": "application", "id": str(a.id), "name": a.full_name, "category": cat, "status": a.status, "created_at": created.isoformat(), "reference": a.reference})
    for d in db.scalars(select(DemoRequest).order_by(DemoRequest.created_at.desc()).limit(LIMIT)):
        created = _aware(d.created_at)
        bump("consultation", created, d.status == "pending")
        recent.append({"kind": "demo", "id": str(d.id), "name": d.name, "category": "consultation", "status": d.status, "created_at": created.isoformat()})
    recent.sort(key=lambda r: r["created_at"], reverse=True)
    for r in recent[:12]:
        r["category_label"] = cats[r["category"]]["label"]
    # each form is counted once in its own category (a partnership application that also asks for a consultation or names an upcoming service is listed in those categories too)
    own = sum(1 for r in recent)
    return {"categories": list(cats.values()), "recent": recent[:12], "totals": {"submissions": own, "new": len([r for r in recent if r["status"] in ("new", "pending")]), "last7": len([r for r in recent if r["created_at"] >= d7.isoformat()]),
                                                                                "last30": len([r for r in recent if r["created_at"] >= d30.isoformat()])}}


# ---- Google Sheets ---------------------------------------------------------------------------------------------------------------------------------------
class TabSetting(BaseModel):
    name: str = ""
    enabled: bool = True


class TabsIn(BaseModel):
    tabs: dict[str, TabSetting]


@router.get("/sheets")
def sheets_status(_: object = Depends(sheets_read), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    return sheets_service.admin_status(db, settings)


@router.put("/sheets")
def sheets_save(body: TabsIn, user: User = Depends(sheets_write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    try:
        sheets_service.save_tab_config(db, {k: v.model_dump() for k, v in body.tabs.items()}, user.id)
    except ValueError as exc:
        raise ApiError(422, "validation_error", str(exc)) from None
    audit_service.record(db, user, "sheets.tabs.update", resource_type="sheets", detail={})
    db.commit()
    return sheets_service.admin_status(db, settings)


@router.post("/sheets/setup")
def sheets_setup(user: User = Depends(sheets_write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """Create the missing worksheets and their header rows (existing worksheets, headers and data are never changed)."""
    if not sheets_service.configured(settings):
        raise ApiError(409, "not_configured", "Google Sheets is not configured on the server: set GOOGLE_SHEETS_SPREADSHEET_ID and the service account (see the setup notes).")
    try:
        done = sheets_service.setup_worksheets(db, settings)
    except Exception as exc:  # noqa: BLE001
        raise ApiError(502, "sheets_error", f"Could not prepare the spreadsheet: {sheets_service._clean_error(exc)}") from None
    audit_service.record_now(db, user, "sheets.setup", resource_type="sheets", detail={"worksheets": len(done)})
    return {"done": done}


@router.post("/sheets/retry")
def sheets_retry(user: User = Depends(sheets_write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """Copy every submission that is not completely in the spreadsheet yet. Nothing is added twice."""
    if not sheets_service.configured(settings):
        raise ApiError(409, "not_configured", "Google Sheets is not configured on the server.")
    result = sheets_service.sync_pending(settings, days=None, limit=500)
    audit_service.record_now(db, user, "sheets.retry", resource_type="sheets", detail=result)
    return result
