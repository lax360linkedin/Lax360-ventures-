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
from app.db.session import get_db, get_read_db
from app.schemas.common import ApiModel
from app.services import notify_service, partnership_service as ps

router = APIRouter(prefix="/public/partnerships", tags=["partnerships"])


class ApplicationIn(ApiModel):
    category: str
    division: str
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
def content(response: Response, db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> dict:
    """Admin overrides, published FAQs and policies, brochure and portal links. Cached briefly by the CDN; a failure here leaves the built-in content on screen."""
    response.headers["Cache-Control"] = "public, max-age=30, s-maxage=15, stale-while-revalidate=600"
    return ps.public_payload(db, settings)


@router.get("/menu")
def menu(response: Response, db: Session = Depends(get_read_db)) -> dict:
    """The Partner With Us navigation menu (categories and their enabled divisions). Small and cacheable: the header asks for it only when a visitor opens the menu."""
    response.headers["Cache-Control"] = "public, max-age=60, s-maxage=30, stale-while-revalidate=600"
    return ps.public_menu(db)


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
    return {"status": "received", "reference": row.reference, "duplicate": duplicate,
            "message": "Thank you for your interest in partnering with LAX360. Your application has been received. Our team will review your details and contact you to discuss the next steps."}
