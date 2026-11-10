from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
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


@router.post("/attachments", status_code=201,
             dependencies=[Depends(rate_limit("contact_upload", "contact_upload_rate_limit_max", "contact_upload_rate_limit_window_seconds"))])
async def upload_attachment(request: Request, filename: str = Query(..., min_length=1, max_length=200), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """A project document for the enquiry form (PDF or image, up to 5 MB). Private; returns an id to send with the enquiry."""
    asset = await contact_service.store_attachment(request, settings, db, filename)
    return {"id": str(asset.id), "filename": asset.filename, "size": asset.size_bytes, "type": asset.content_type}
