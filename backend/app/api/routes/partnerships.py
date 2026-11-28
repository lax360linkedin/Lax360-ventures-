"""Public partnership API: ONE read endpoint with everything the Partner With Us pages need on top of the built-in content, and the application form submission.

No applicant data is ever returned here. An application is an enquiry: it never creates a partner account.
"""

from __future__ import annotations

import hashlib

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.rate_limit import rate_limit
from app.core import pubcache
from app.db.session import _read_factory, get_db, get_read_db
from app.schemas.common import ApiModel
from app.services import notify_service, partnership_service as ps, sheets_service

router = APIRouter(prefix="/public/partnerships", tags=["partnerships"])


class ApplicationIn(ApiModel):
    category: str
    division: str = ""  # older clients send one division; the form sends `divisions`
    divisions: list[str] = []
    all_divisions: bool = False
    other_interest: str | None = None
    quick: bool = False  # the short enquiry form at the bottom of a partnership page
    full_name: str
    email: str
    phone: str
    country: str
    state: str | None = None
    city: str | None = None
    occupation: str | None = None
    entity_type: str | None = None
    organization: str | None = None
    preferred_location: str | None = None
    preferred_branch: str | None = None
    answers: dict = {}
    consultation: dict = {}
    consent_processing: bool = False
    consent_marketing: bool = False
    source_page: str | None = None
    website: str | None = None  # honeypot: real visitors never see or fill this field


@router.get("")
def content(request: Request, db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> Response:
    """Admin overrides, published FAQs and policies, brochure and portal links. Built once and reused (the in-process cache drops it the moment anything it is built from is saved, and
    rebuilds it in the background), then cached briefly by the CDN; a failure here leaves the built-in content on screen."""
    return pubcache.cached_json(request, settings.app_env != "test", "partnerships", lambda d: ps.public_payload(d, settings), {"Cache-Control": "public, max-age=0, s-maxage=3, stale-if-error=600"}, db, _read_factory() if settings.app_env != "test" else None)


@router.get("/menu")
def menu(request: Request, db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> Response:
    """The Partner With Us navigation menu (categories and their enabled divisions). Small and cacheable: the header asks for it only when a visitor opens the menu."""
    return pubcache.cached_json(request, settings.app_env != "test", "partnerships-menu", lambda d: ps.public_menu(d), {"Cache-Control": "public, max-age=0, s-maxage=3, stale-if-error=600"}, db, _read_factory() if settings.app_env != "test" else None)


@router.post("/applications", status_code=201, dependencies=[Depends(rate_limit("partner_apply", "partner_rate_limit_max", "partner_rate_limit_window_seconds"))])
def apply(body: ApplicationIn, request: Request, response: Response, tasks: BackgroundTasks, db: Session = Depends(get_db)) -> dict:
    if body.website:  # honeypot filled: a bot. Pretend success, store nothing.
        return {"status": "received", "reference": "LAX-RECEIVED", "message": "Thank you for your interest in partnering with LAX360."}
    if not ps.get_settings_map(db)["applications_open"]:
        raise ApiError(503, "applications_closed", "Applications are not being accepted right now. Please contact us through the Contact page.")
    data = body.model_dump(exclude={"website"})
    try:
        row, duplicate = ps.create_application(db, data)
        db.commit()  # success is only reported after the application is really stored
    except Exception:
        db.rollback()
        raise
    if duplicate:
        response.status_code = 200
    else:
        tasks.add_task(notify_service.notify_application, row.id)
        tasks.add_task(sheets_service.sync_application, row.id)  # a copy goes to the Google Spreadsheet after the response (never blocks or fails the submission)
        tasks.add_task(sheets_service.retry_recent)
    return {"status": "received", "reference": row.reference, "duplicate": duplicate,
            "message": "Thank you for your interest in partnering with LAX360. Your application has been received. Our team will review your details and contact you to discuss the next steps."}
