"""Social media links and contact details (header, footer, Contact page, social section), all managed from the admin panel.

Every item is a row of `contact_channels`: what it is (`kind` + `type`), its value, whether it is enabled, its order and WHERE it is shown (`locations`). Values are validated by type
(a real https profile address on the right platform, a phone number, an email ...), so nothing unsafe such as `javascript:` can reach a page, and an item that is already there
cannot be added twice. New platforms are added by data (the custom platform) or by one line in `PLATFORMS`.
"""

from __future__ import annotations

import logging
import re
import uuid
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import Branch, ContactChannel, ContentItem
from app.utils_validation import EMAIL

log = logging.getLogger(__name__)

# key, label, the web addresses an official profile lives on (empty = any https address: the custom platform)
PLATFORMS: list[tuple[str, str, tuple[str, ...]]] = [
    ("youtube", "YouTube", ("youtube.com", "youtu.be")),
    ("instagram", "Instagram", ("instagram.com", "instagr.am")),
    ("facebook", "Facebook", ("facebook.com", "fb.com", "fb.me")),
    ("linkedin", "LinkedIn", ("linkedin.com", "lnkd.in")),
    ("x", "X (Twitter)", ("x.com", "twitter.com")),
    ("threads", "Threads", ("threads.net", "threads.com")),
    ("discord", "Discord", ("discord.gg", "discord.com", "discord.me")),
    ("whatsapp", "WhatsApp", ("wa.me", "whatsapp.com")),
    ("telegram", "Telegram", ("t.me", "telegram.me", "telegram.org")),
    ("pinterest", "Pinterest", ("pinterest.com", "pin.it")),
    ("snapchat", "Snapchat", ("snapchat.com",)),
    ("github", "GitHub", ("github.com",)),
    ("reddit", "Reddit", ("reddit.com", "redd.it")),
    ("medium", "Medium", ("medium.com",)),
    ("custom", "Other platform", ()),
]
PLATFORM = {k: (label, hosts) for k, label, hosts in PLATFORMS}

CONTACT_TYPES: list[tuple[str, str]] = [
    ("phone", "Phone number"), ("whatsapp", "WhatsApp number"), ("email", "Email address"), ("address", "Office address"),
    ("branch", "Branch contact"), ("enquiry", "Business enquiry contact"), ("website", "Website"), ("other", "Other communication link"),
]
CONTACT_TYPE = dict(CONTACT_TYPES)

SOCIAL_LOCATIONS = ("header", "footer", "contact", "social_band")
CONTACT_LOCATIONS = ("header", "footer", "contact")
OWNER_TYPES = ("global", "branch", "partner")  # whose list an item belongs to: a branch or partner never sees the list of another
LOCATION_LABELS = {"header": "Website header / top bar", "footer": "Website footer", "contact": "Contact Us page", "social_band": "“Stay connected” section"}

ICONS = ("globe", "link", "mail", "phone", "message", "map-pin", "briefcase", "headset", "calendar", "users")  # generic icons for a custom platform or other link

_PHONE = re.compile(r"^\+?[0-9][0-9\s().-]{5,24}$")
_KEYS = {"owner_type", "owner_ref", "kind", "type", "label", "value", "note", "detail", "icon", "locations", "is_active", "sort_order"}


def _bad(field: str, message: str) -> ApiError:
    return ApiError(422, "validation_error", "Please check the highlighted fields.", fields={field: message})


def digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def _host_ok(host: str, allowed: tuple[str, ...]) -> bool:
    return not allowed or any(host == h or host.endswith("." + h) for h in allowed)


def _https_url(value: str, field: str = "value") -> tuple[str, str]:
    """(clean url, host) for an https address, else a validation error."""
    url = value.strip()
    if len(url) > 500 or any(c in url for c in "<> \t\r\n\"'"):
        raise _bad(field, "Enter one full web address starting with https://")
    parts = urlparse(url)
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or not host or "." not in host or parts.username or parts.port not in (None, 443):
        raise _bad(field, "Enter a full web address starting with https:// (for example https://www.instagram.com/yourpage).")
    return url, host


def _social(type_: str, value: str) -> str:
    label, hosts = PLATFORM[type_]
    if type_ == "whatsapp" and _PHONE.match(value):  # a number becomes its chat link
        d = digits(value)
        if not 8 <= len(d) <= 15:
            raise _bad("value", "Enter the number with its country code, for example +91 98765 43210, or a wa.me link.")
        return f"https://wa.me/{d}"
    url, host = _https_url(value)
    if not _host_ok(host, hosts):
        raise _bad("value", f"This does not look like a {label} address (expected {' / '.join(hosts)}). Check the link, or choose “Other platform”.")
    return url


def _phone(value: str, field: str = "value") -> str:
    if not _PHONE.match(value) or not 7 <= len(digits(value)) <= 15:
        raise _bad(field, "Enter a valid phone number, for example +91 95666 79928.")
    return value


def _email(value: str) -> str:
    if not EMAIL.match(value) or len(value) > 200:
        raise _bad("value", "Enter a valid email address.")
    return value


def _value_for(kind: str, type_: str, value: str) -> str:
    if kind == "social":
        return _social(type_, value)
    if type_ in ("phone", "whatsapp"):
        return _phone(value)
    if type_ == "email":
        return _email(value)
    if type_ == "website":
        return _https_url(value)[0]
    if type_ == "address":
        if len(value) > 600:
            raise _bad("value", "Keep the address under 600 characters.")
        return value
    if type_ == "branch":  # a branch's phone or email
        return _email(value) if "@" in value else _phone(value)
    if type_ == "enquiry":  # an email, a phone number or a page
        return _email(value) if "@" in value else (_https_url(value)[0] if value.lower().startswith("http") else _phone(value))
    # other: a web page, mailto: or tel:
    low = value.lower()
    if low.startswith("mailto:"):
        _email(value[7:])
        return value
    if low.startswith("tel:"):
        _phone(value[4:])
        return value
    return _https_url(value)[0]


def href_of(kind: str, type_: str, value: str) -> str | None:
    """The address a visitor's click opens (None for plain text such as an address)."""
    if kind == "social":
        return value
    if type_ == "whatsapp":
        return f"https://wa.me/{digits(value)}"
    if type_ == "phone":
        return "tel:" + ("+" if value.strip().startswith("+") else "") + digits(value)
    if type_ == "email":
        return f"mailto:{value}"
    if type_ == "address":
        return None
    if value.lower().startswith(("http", "mailto:", "tel:")):
        return value
    return f"mailto:{value}" if "@" in value else "tel:" + ("+" if value.strip().startswith("+") else "") + digits(value)


def _norm(kind: str, type_: str, label: str, value: str) -> str:
    """A normalised form of the value: the same thing typed in another way gives the same key (duplicates are refused)."""
    if kind == "social":
        p = urlparse(value)
        host = (p.hostname or "").lower().removeprefix("www.")
        return f"social:{type_}:{host}{p.path.rstrip('/').lower()}"
    if type_ in ("phone", "whatsapp"):
        return f"contact:{type_}:{digits(value)}"
    if type_ == "email":
        return f"contact:email:{value.lower()}"
    text = re.sub(r"\s+", " ", value.lower()).strip()
    if type_ == "address":
        return f"contact:address:{text}"
    return f"contact:{type_}:{label.lower().replace(' ', '')}:{digits(value) or text}"[:400]


def default_label(kind: str, type_: str) -> str:
    return PLATFORM[type_][0] if kind == "social" else CONTACT_TYPE[type_]


def clean(db: Session, data: dict, current: ContactChannel | None) -> dict:
    """Validate a submitted item; returns the column values. Raises a 422 for a bad field and a 409 for a duplicate."""
    unknown = set(data) - _KEYS
    if unknown:
        raise _bad(sorted(unknown)[0], "Unknown field.")
    owner_type = (data.get("owner_type") or "global").strip()
    owner_ref = (data.get("owner_ref") or "").strip() or None
    if current is not None:  # the owner of an item never changes: delete it and add it to the other one instead
        owner_type, owner_ref = current.owner_type, current.owner_ref
    if owner_type not in OWNER_TYPES or (owner_type == "global") != (owner_ref is None):
        raise _bad("owner_type", "Choose the branch or partner these links belong to.")
    if owner_type == "branch" and not db.scalar(select(Branch.id).where(Branch.slug == owner_ref)):
        raise _bad("owner_ref", "That branch does not exist.")
    if owner_type == "partner" and not db.scalar(select(ContentItem.id).where(ContentItem.kind == "network_partner", ContentItem.slug == owner_ref)):
        raise _bad("owner_ref", "That partner does not exist.")
    kind = (data.get("kind") or "").strip()
    if kind not in ("social", "contact"):
        raise _bad("kind", "Choose social media or contact detail.")
    type_ = (data.get("type") or "").strip()
    if (kind == "social" and type_ not in PLATFORM) or (kind == "contact" and type_ not in CONTACT_TYPE):
        raise _bad("type", "Choose one of the available types.")
    value = (data.get("value") or "").strip()
    if not value:
        raise _bad("value", "This is required.")
    value = _value_for(kind, type_, value)
    label = " ".join((data.get("label") or "").split())[:120]
    if not label:
        if type_ in ("custom", "other", "branch", "enquiry"):
            raise _bad("label", "Give it a name that visitors will see (for example Sales enquiries).")
        label = default_label(kind, type_)
    if owner_type != "global":
        locations = ["detail"]  # a branch's or partner's links appear in its own details section
    else:
        allowed = SOCIAL_LOCATIONS if kind == "social" else CONTACT_LOCATIONS
        locations = data.get("locations") or []
        if not isinstance(locations, list) or any(l not in allowed for l in locations):
            raise _bad("locations", "Choose where it is shown from the list.")
        locations = [l for l in allowed if l in locations]  # canonical order, no repeats
    icon = (data.get("icon") or "").strip() or None
    if icon and icon not in ICONS:
        raise _bad("icon", "Choose one of the available icons.")
    note = " ".join((data.get("note") or "").split())[:160] or None
    detail = (data.get("detail") or "").strip()
    if len(detail) > 600:
        raise _bad("detail", "Keep the details under 600 characters.")
    key = _norm(kind, type_, label, value)
    if owner_type != "global":
        key = f"{owner_type}:{owner_ref}:{key}"[:400]  # the same profile may belong to several owners, never twice to one
    taken = db.scalar(select(ContactChannel.id).where(ContactChannel.dedupe_key == key, ContactChannel.id != (current.id if current else uuid.uuid4())))
    if taken:
        raise ApiError(409, "already_exists", "Please check the highlighted fields.", fields={"value": "This is already in the list: edit that item instead (it can be shown in several places)."})
    return {"owner_type": owner_type, "owner_ref": owner_ref, "kind": kind, "type": type_, "label": label, "value": value, "note": note, "detail": detail or None, "icon": icon if type_ in ("custom", "other") else None,
            "locations": locations, "is_active": bool(data.get("is_active", True)), "sort_order": max(0, min(100000, int(data.get("sort_order") or 0))), "dedupe_key": key}


def list_all(db: Session, owner_type: str = "global", owner_ref: str | None = None) -> list[ContactChannel]:
    """The items of ONE owner (the global LAX360 list by default): branches and partners are never mixed with it or with each other."""
    q = select(ContactChannel).where(ContactChannel.owner_type == owner_type)
    q = q.where(ContactChannel.owner_ref.is_(None)) if owner_ref is None else q.where(ContactChannel.owner_ref == owner_ref)
    return list(db.scalars(q.order_by(ContactChannel.sort_order, ContactChannel.created_at)))


def create(db: Session, data: dict) -> ContactChannel:
    values = clean(db, data, None)
    if not data.get("sort_order"):
        values["sort_order"] = max([c.sort_order for c in list_all(db, values["owner_type"], values["owner_ref"])] + [0]) + 10  # new items go last
    row = ContactChannel(**values)
    db.add(row)
    db.flush()
    return row


def update(db: Session, row: ContactChannel, data: dict) -> ContactChannel:
    values = clean(db, data, row)
    if not data.get("sort_order"):
        values["sort_order"] = row.sort_order
    for k, v in values.items():
        setattr(row, k, v)
    db.flush()
    return row


def reorder(db: Session, ids: list[uuid.UUID]) -> None:
    """Give the listed items the order they are listed in (10, 20, 30 ...); items not listed keep their place relative to each other, after the listed ones are slotted into the same positions."""
    first = db.get(ContactChannel, ids[0])
    rows = {r.id: r for r in list_all(db, first.owner_type, first.owner_ref)} if first else {}
    if any(i not in rows for i in ids) or len(set(ids)) != len(ids):
        raise _bad("ids", "Some of these items no longer exist: reload the page.")
    slots = sorted(rows[i].sort_order for i in ids)
    if len(set(slots)) != len(slots):  # equal orders cannot be told apart: renumber everything first
        for n, r in enumerate(rows.values()):
            r.sort_order = (n + 1) * 10
        slots = sorted(rows[i].sort_order for i in ids)
    for slot, i in zip(slots, ids):
        rows[i].sort_order = slot
    db.flush()


def out_admin(c: ContactChannel) -> dict:
    return {"id": str(c.id), "owner_type": c.owner_type, "owner_ref": c.owner_ref, "kind": c.kind, "type": c.type, "label": c.label, "value": c.value, "note": c.note, "detail": c.detail, "icon": c.icon, "locations": list(c.locations or []),
            "is_active": c.is_active, "sort_order": c.sort_order, "href": href_of(c.kind, c.type, c.value), "updated_at": c.updated_at.isoformat() if c.updated_at else None}


def public_channels(db: Session) -> list[dict] | None:
    """What the website receives: only ENABLED items that are shown somewhere, in display order. None (the website then keeps its built-in links) if the table cannot be read,
    for example on a database that has not been migrated yet: that must never take the whole site settings response down."""
    try:
        return _public_channels(db)
    except SQLAlchemyError:
        db.rollback()  # a failed query must not poison the rest of the request
        log.warning("social links / contact details could not be read (is the database migrated?)", exc_info=True)
        return None


def _public_channels(db: Session) -> list[dict]:
    out = []
    for c in db.scalars(select(ContactChannel).where(ContactChannel.is_active.is_(True), ContactChannel.owner_type == "global").order_by(ContactChannel.sort_order, ContactChannel.created_at)):
        if not c.locations:
            continue
        out.append({"id": str(c.id), "kind": c.kind, "type": c.type, "label": c.label, "value": c.value, "href": href_of(c.kind, c.type, c.value), "note": c.note, "detail": c.detail,
                    "icon": c.icon, "locations": list(c.locations)})
    return out


def catalog() -> dict:
    """The choices the admin form offers (so the browser never hard-codes them)."""
    return {"platforms": [{"value": k, "label": l, "hosts": list(h)} for k, l, h in PLATFORMS], "contact_types": [{"value": k, "label": l} for k, l in CONTACT_TYPES],
            "social_locations": [{"value": k, "label": LOCATION_LABELS[k]} for k in SOCIAL_LOCATIONS], "contact_locations": [{"value": k, "label": LOCATION_LABELS[k]} for k in CONTACT_LOCATIONS], "icons": list(ICONS)}


def public_owned(db: Session) -> dict | None:
    """The enabled links and contact details of each branch and partner, as {"branch": {slug: [...]}, "partner": {slug: [...]}}: each owner's list is its own. None if unreadable (see public_channels)."""
    try:
        out: dict[str, dict[str, list]] = {"branch": {}, "partner": {}}
        for c in db.scalars(select(ContactChannel).where(ContactChannel.is_active.is_(True), ContactChannel.owner_type != "global").order_by(ContactChannel.sort_order, ContactChannel.created_at)):
            out[c.owner_type].setdefault(c.owner_ref, []).append({"id": str(c.id), "kind": c.kind, "type": c.type, "label": c.label, "value": c.value, "href": href_of(c.kind, c.type, c.value),
                                                                  "note": c.note, "detail": c.detail, "icon": c.icon})
        return out
    except SQLAlchemyError:
        db.rollback()
        log.warning("branch / partner social links could not be read (is the database migrated?)", exc_info=True)
        return None
