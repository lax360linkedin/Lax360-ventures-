from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.schemas.contact import ContactCreate, ContactReceipt
from app.services import contact_service

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", response_model=ContactReceipt, status_code=201,
             dependencies=[Depends(rate_limit("contact", "contact_rate_limit_max", "contact_rate_limit_window_seconds"))])
def submit_contact(body: ContactCreate, response: Response, db: Session = Depends(get_db)):
    """Public enquiry form. Stored in PostgreSQL; no email is sent (email delivery is not configured)."""
    if body.website:  # honeypot filled: a bot. Pretend success, store nothing.
        return ContactReceipt(status="received")
    row, duplicate = contact_service.create_enquiry(db, body)
    if duplicate:
        response.status_code = 200
    return ContactReceipt(id=row.id, status="received", duplicate=duplicate)
