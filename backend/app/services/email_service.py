"""Outgoing e-mail (password reset). Standard-library SMTP, no extra dependency. Configure SMTP_HOST (+ SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM); when it is not
configured nothing is sent and `configured()` says so (the callers answer neutrally and log a warning: an administrator can set a new password instead)."""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import Settings

log = logging.getLogger("app.email")


def configured(settings: Settings) -> bool:
    return bool(settings.smtp_host and settings.smtp_from)


def send(settings: Settings, to: str, subject: str, body: str) -> bool:
    """Send a plain-text message. Returns False (and logs, never raising to the caller) when it could not be sent."""
    if not configured(settings):
        log.warning("E-mail is not configured (SMTP_HOST / SMTP_FROM): a message to a customer was not sent.")
        return False
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = settings.smtp_from, to, subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
            if settings.smtp_starttls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password.get_secret_value())
            smtp.send_message(msg)
        return True
    except (smtplib.SMTPException, OSError) as exc:
        log.error("Sending e-mail failed: %s", type(exc).__name__)
        return False
