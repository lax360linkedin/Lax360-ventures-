"""CMS content. `KINDS` defines what can be managed (and drives the admin form). Only kinds that the public website actually
reads are listed here: hero text, FAQ entries and projects. Anything not listed is not managed by the CMS."""

from __future__ import annotations

import re
import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import ContentItem, User


def F(name, label, kind="text", required=False, max_len=300, options=None, help=""):
    return {"name": name, "label": label, "type": kind, "required": required, "max": max_len, "options": options or [], "help": help}


DIVISIONS = [{"value": v, "label": l} for v, l in (("software", "Software & Apps"), ("ai", "AI & Automation"), ("growth", "Digital Growth"), ("engineering", "CAD & Engineering"))]

KINDS: dict[str, dict] = {
    "hero": {
        "label": "Home page hero", "single": True, "slug": "home",
        "help": "Leave a field empty to keep the website's built-in text. The animated rotating word is not editable here.",
        "fields": [
            F("headline_1", "Headline line 1", max_len=80), F("headline_2", "Headline line 2 (highlighted)", max_len=80), F("headline_3", "Headline line 3", max_len=80),
            F("lead", "Supporting paragraph", "textarea", max_len=400),
            F("cta_primary_label", "Primary button text", max_len=40), F("cta_primary_link", "Primary button link", max_len=200, help="A page like /contact or a full https:// URL"),
            F("cta_secondary_label", "Secondary button text", max_len=40), F("cta_secondary_link", "Secondary button link", max_len=200),
        ],
    },
    "faq": {
        "label": "FAQ entries", "single": False,
        "help": "Shown in the FAQ accordions. If a group has no published entries the website's built-in questions are used.",
        "fields": [
            F("group", "Where it appears", "select", True, options=[{"value": "home", "label": "Home page & Services page"}, {"value": "academy", "label": "Academy page"}]),
            F("answer", "Answer", "textarea", True, max_len=1500),
        ],
        "title_label": "Question",
    },
    "project": {
        "label": "Projects (Work page)", "single": False,
        "help": "Publish only client-approved work with verified details. When at least one project is published, the Work page shows projects instead of the illustrative concepts.",
        "fields": [
            F("division", "Division", "select", True, options=DIVISIONS),
            F("client_type", "Client type", max_len=120, help="e.g. 'Manufacturing company' (do not name a client without permission)"),
            F("summary", "Summary", "textarea", True, max_len=600),
            F("link", "Case study link (optional)", max_len=300),
        ],
        "title_label": "Project title",
    },
}


def kinds_for_ui() -> list[dict]:
    return [{"kind": k, **v} for k, v in KINDS.items()]


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:80] or "item"


def _validate(kind: str, title: str, data: dict) -> tuple[str, dict]:
    spec = KINDS[kind]
    errors: dict[str, str] = {}
    title = " ".join((title or "").split())
    if not spec["single"] and not title:
        errors["title"] = f"{spec.get('title_label', 'Title')} is required."
    if len(title) > 200:
        errors["title"] = "Keep it under 200 characters."
    allowed = {f["name"]: f for f in spec["fields"]}
    clean: dict[str, str] = {}
    for name in data:
        if name not in allowed:
            errors[name] = "Unknown field."
    for name, f in allowed.items():
        value = data.get(name, "")
        if not isinstance(value, str):
            errors[name] = "Must be text."
            continue
        value = value.strip()
        if f["required"] and not value:
            errors[name] = f"{f['label']} is required."
        elif len(value) > f["max"]:
            errors[name] = f"Keep it under {f['max']} characters."
        elif f["type"] == "select" and value and value not in {o["value"] for o in f["options"]}:
            errors[name] = "Choose one of the listed options."
        elif name.endswith("_link") or name == "link":
            if value and not (value.startswith("/") and not value.startswith("//") or re.match(r"^https?://[^\s]+$", value)):
                errors[name] = "Use a page path like /contact or a full https:// URL."
        if value:
            clean[name] = value
    if errors:
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields=errors)
    return title or spec["label"], clean


def get_kind(kind: str) -> dict:
    if kind not in KINDS:
        raise ApiError(404, "not_found", "Unknown content type.")
    return KINDS[kind]


def list_items(db: Session, kind: str, *, status: str | None = None) -> list[ContentItem]:
    get_kind(kind)
    q = select(ContentItem).where(ContentItem.kind == kind)
    if status:
        q = q.where(ContentItem.status == status)
    return list(db.scalars(q.order_by(ContentItem.sort_order, ContentItem.created_at)))


def create(db: Session, user: User, kind: str, *, title: str, data: dict, status: str, sort_order: int) -> ContentItem:
    spec = get_kind(kind)
    title, clean = _validate(kind, title, data)
    slug = spec["slug"] if spec["single"] else _slugify(title)
    if db.scalar(select(ContentItem.id).where(ContentItem.kind == kind, ContentItem.slug == slug)):
        if spec["single"]:
            raise ApiError(409, "already_exists", "This content already exists: edit it instead.")
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    item = ContentItem(kind=kind, slug=slug, title=title, data=clean, status=status, sort_order=sort_order, updated_by=user.id)
    db.add(item)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ApiError(409, "already_exists", "An item with that name already exists.") from None
    return item


def get_item(db: Session, item_id: uuid.UUID) -> ContentItem:
    item = db.get(ContentItem, item_id)
    if item is None:
        raise ApiError(404, "not_found", "Content item not found.")
    return item


def update(db: Session, user: User, item: ContentItem, *, title: str | None, data: dict | None, status: str | None, sort_order: int | None) -> list[str]:
    changed = []
    if title is not None or data is not None:
        new_title, clean = _validate(item.kind, title if title is not None else item.title, data if data is not None else item.data)
        if new_title != item.title:
            item.title = new_title
            changed.append("title")
        if clean != item.data:
            item.data = clean
            changed.append("data")
    if status is not None and status != item.status:
        item.status = status
        changed.append("status")
    if sort_order is not None and sort_order != item.sort_order:
        item.sort_order = sort_order
        changed.append("sort_order")
    item.updated_by = user.id
    return changed


def public_items(db: Session, kind: str) -> list[dict]:
    if kind not in KINDS:
        return []
    return [{"id": str(i.id), "slug": i.slug, "title": i.title, "data": i.data, "sort_order": i.sort_order} for i in list_items(db, kind, status="published")]


def counts(db: Session) -> dict[str, dict[str, int]]:
    rows = db.execute(select(ContentItem.kind, ContentItem.status, func.count()).group_by(ContentItem.kind, ContentItem.status)).all()
    out: dict[str, dict[str, int]] = {k: {"draft": 0, "published": 0} for k in KINDS}
    for kind, status, n in rows:
        if kind in out:
            out[kind][status] = n
    return out
