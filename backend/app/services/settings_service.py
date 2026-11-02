"""Website settings stored in the database (company details, contact info, social links, maintenance mode, chatbot options).

A fixed whitelist (`SPEC`) decides which keys exist, how they are validated, and which are public. Secrets (API keys,
passwords) are NOT settings: they stay in the backend environment and can never be read or written through here.
"""

from __future__ import annotations

import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import SiteSetting, User
from app.utils_validation import EMAIL

_PHONE = re.compile(r"^\+?[0-9][0-9\s().-]{5,24}$")
_URL = re.compile(r"^https?://[^\s]{3,300}$")


def S(label, group, kind="str", public=True, max_len=200, help=""):
    return {"label": label, "group": group, "type": kind, "public": public, "max": max_len, "help": help}


SPEC: dict[str, dict] = {
    # general (shown as the About page's tagline)
    "tagline": S("Tagline (About page)", "general", max_len=160),
    # contact
    "contact_email": S("Contact email", "contact", "email"),
    "contact_phone_1": S("Phone 1", "contact", "phone"),
    "contact_phone_2": S("Phone 2", "contact", "phone"),
    "whatsapp_number": S("WhatsApp number", "contact", "phone", help="Digits with country code, e.g. 919876543210"),
    "contact_form_enabled": S("Contact form enabled", "contact", "bool"),
    "contact_form_notice": S("Notice above the contact form", "contact", "text", max_len=300, help="Optional message shown above the enquiry form."),
    # social
    "social_instagram": S("Instagram URL", "social", "url"),
    "social_linkedin": S("LinkedIn URL", "social", "url"),
    "social_x": S("X (Twitter) URL", "social", "url"),
    "social_facebook": S("Facebook URL", "social", "url"),
    # footer
    "footer_text": S("Footer legal line", "footer", "text", max_len=300),
    # maintenance
    "maintenance_mode": S("Maintenance mode", "maintenance", "bool", help="Shows a maintenance page to visitors (admin panel stays available)."),
    "maintenance_message": S("Maintenance message", "maintenance", "text", max_len=300),
    # chatbot
    "chatbot_enabled": S("Chatbot enabled", "chatbot", "bool"),
    "chatbot_welcome": S("Welcome message", "chatbot", "text", max_len=400),
    "chatbot_fallback": S("Fallback message (when the AI is unavailable)", "chatbot", "text", public=False, max_len=300),
    "chatbot_instructions": S("Additional business information for the assistant", "chatbot", "text", public=False, max_len=4000,
                              help="Added to the assistant's instructions. Only verified facts: it will repeat what you write here."),
}
CHATBOT_KEYS = tuple(k for k, v in SPEC.items() if v["group"] == "chatbot")
SITE_KEYS = tuple(k for k in SPEC if k not in CHATBOT_KEYS)


def _validate(key: str, value):
    spec = SPEC[key]
    kind = spec["type"]
    if kind == "bool":
        if not isinstance(value, bool):
            raise ValueError("Must be true or false.")
        return value
    if not isinstance(value, str):
        raise ValueError("Must be text.")
    value = value.strip()
    if len(value) > spec["max"]:
        raise ValueError(f"Keep it under {spec['max']} characters.")
    if value == "":
        return None  # empty = remove the override and fall back to the website default
    if kind == "email" and not EMAIL.match(value):
        raise ValueError("Enter a valid email address.")
    if kind == "phone" and not _PHONE.match(value):
        raise ValueError("Enter a valid phone number.")
    if kind == "url" and not _URL.match(value):
        raise ValueError("Enter a full URL starting with https://")
    return value


def get_all(db: Session) -> dict:
    return {row.key: row.value for row in db.scalars(select(SiteSetting))}


def get(db: Session, key: str, default=None):
    row = db.get(SiteSetting, key)
    return default if row is None else row.value


def public_settings(db: Session) -> dict:
    return {row.key: row.value for row in db.scalars(select(SiteSetting).where(SiteSetting.is_public.is_(True))) if row.key in SPEC}


def update(db: Session, user: User, values: dict, *, allowed: tuple[str, ...]) -> list[str]:
    """Validate and store the given keys. Returns the keys that changed. Unknown or not-allowed keys are rejected."""
    errors = {}
    clean = {}
    for key, raw in values.items():
        if key not in SPEC or key not in allowed:
            errors[key] = "Unknown or not allowed setting."
            continue
        try:
            clean[key] = _validate(key, raw)
        except ValueError as exc:
            errors[key] = str(exc)
    if errors:
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields=errors)
    changed = []
    for key, value in clean.items():
        row = db.get(SiteSetting, key)
        if value is None:
            if row is not None:
                db.delete(row)
                changed.append(key)
            continue
        if row is None:
            db.add(SiteSetting(key=key, value=value, is_public=SPEC[key]["public"], updated_by=user.id))
            changed.append(key)
        elif row.value != value:
            row.value, row.updated_by = value, user.id
            changed.append(key)
    return changed


def spec_for_ui(keys: tuple[str, ...]) -> list[dict]:
    return [{"key": k, **{f: v for f, v in SPEC[k].items()}} for k in keys]
