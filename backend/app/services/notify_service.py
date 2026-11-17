"""E-mail the team when a new enquiry or demo request arrives (after the response, never delaying or breaking the submission).

Needs SMTP_HOST + SMTP_FROM (the same settings as the password-reset e-mail) and ENQUIRY_NOTIFY_EMAIL (one or more addresses, comma-separated). Without them nothing is sent and nothing fails: the
enquiry is in the admin panel (and the Google Spreadsheet) either way. The message holds the visitor's own details, so it goes only to the addresses configured here.
"""

from __future__ import annotations

import logging
import uuid

from app.core.config import get_settings
from app.db.session import _factory
from app.models import ContactEnquiry, DemoRequest
from app.services import email_service

log = logging.getLogger("app.notify")


def _recipients(settings) -> list[str]:
    return [a.strip() for a in (settings.enquiry_notify_to or "").split(",") if "@" in a]


def _send(subject: str, lines: list[str]) -> None:
    settings = get_settings()
    to = _recipients(settings)
    if not to or not email_service.configured(settings):
        return
    body = "\n".join(lines) + "\n\nOpen the admin panel to follow up. This message was sent automatically."
    for address in to:
        email_service.send(settings, address, subject, body)


def notify_enquiry(enquiry_id: uuid.UUID) -> None:
    try:
        with _factory()() as db:
            e = db.get(ContactEnquiry, enquiry_id)
            if e is None:
                return
            _send(f"New enquiry: {e.subject}"[:150], [f"Type: {e.enquiry_type}", f"Source: {e.source or 'website'}", f"Name: {e.name}", f"Email: {e.email}", f"Phone: {e.phone or '-'}", f"Company: {e.company or '-'}",
                                                     f"Branch: {e.branch.city if e.branch else '-'}", "", (e.message or "")[:1500]])
    except Exception:  # noqa: BLE001  (a notification problem must never reach the visitor)
        log.exception("could not send the enquiry notification")


def notify_demo(demo_id: uuid.UUID) -> None:
    try:
        with _factory()() as db:
            d = db.get(DemoRequest, demo_id)
            if d is None:
                return
            _send("New demo request", [f"Name: {d.name}", f"Email: {d.email}", f"Company: {d.company or '-'}", f"Preferred date: {d.preferred_date or '-'}", f"Interest: {d.interest or '-'}",
                                       f"Branch: {d.branch.city if d.branch else '-'}", "", (d.message or "")[:1500]])
    except Exception:  # noqa: BLE001
        log.exception("could not send the demo request notification")
