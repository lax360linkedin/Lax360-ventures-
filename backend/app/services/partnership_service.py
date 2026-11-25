"""Partnership module logic: validated public applications, the admin workflow (status, notes, assignment, consultation), the dashboard, CSV export and the public content payload.

Rules that hold everywhere here:
  * An application is an ENQUIRY. Nothing in this module creates a partner account or grants any access, whatever its status.
  * The browser's answers are checked against a whitelist per partnership type; text is stripped of markup and length-limited before it is stored (it is only ever rendered as text).
  * The public payload contains no applicant data, and no commercial field that management has not marked as published.
"""

from __future__ import annotations

import csv
import hashlib
import io
import re
import secrets
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import (ApplicationEvent, MediaAsset, PartnershipApplication, PartnershipFaq, PartnershipMenuItem, PartnershipPage, PartnershipPolicy, PartnershipSetting, User)
from app.models.partnership import CATEGORIES, DIVISIONS, STATUSES

PAGE_SLUGS_CATEGORIES = ("franchise", "authorized-partner", "referral-partner")  # page slugs follow the website routes; an APPLICATION stores the short category name
PAGE_SLUGS = ["overview", *PAGE_SLUGS_CATEGORIES, *(f"{c}/{d}" for c in PAGE_SLUGS_CATEGORIES for d in DIVISIONS)]  # the built-in pages; administrator-created menu entries add more (see page_slugs)
BUILTIN_LABELS = {"education": "Education", "digital-marketing": "Digital Marketing", "it": "IT & Software"}
CATEGORY_LABELS = {"franchise": "Franchise Opportunities", "authorized-partner": "Authorized Partner Program", "referral-partner": "Referral Partner Program"}
RESERVED_SLUGS = {"apply", "faq", "privacy-policy", "terms-and-conditions"}
_SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$")
MAX_MENU_ITEMS = 12
STATUS_LABELS = {s: s.replace("_", " ").capitalize() for s in STATUSES}
COMMERCIAL_FIELDS = ("registration_fee", "initial_investment", "infrastructure_investment", "working_capital", "security_deposit", "royalty", "revenue_sharing", "agreement_duration", "renewal_fee",
                     "territory", "exclusivity", "refund_conditions", "exit_conditions", "commission_model")
COMMON_ANSWERS = {"industry": 120, "years_experience": 20, "office_available": 10, "relevant_experience": 600}
ANSWER_KEYS: dict[str, dict[str, int]] = {
    "franchise": {"proposed_location": 160, "investment_budget": 80, "business_experience": 600, "start_date": 60, "existing_infrastructure": 400, "participation": 20, "additional_info": 800, "franchise_interest": 40},
    "authorized": {"customer_network": 600, "business_experience": 600, "sales_experience": 600, "preferred_products": 300, "target_segment": 300, "operating_region": 160},
    "referral": {"professional_background": 600, "areas_of_interest": 300, "referral_network": 600, "preferred_services": 300, "expected_categories": 300},
}
_BLOCKS = re.compile(r"(?is)<(script|style)\b[^>]*>.*?</\1\s*>")  # a script or style element is removed WITH its content
_TAGS = re.compile(r"<[^>]*>")
_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def aware(dt: datetime | None) -> datetime | None:
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def clean_text(value, limit: int, *, multiline: bool = False) -> str:
    """Plain text only: markup removed, control characters dropped, whitespace tidied, length bounded."""
    s = _CTRL.sub("", _TAGS.sub("", _BLOCKS.sub("", str(value or ""))))
    s = "\n".join(" ".join(line.split()) for line in s.splitlines()).strip() if multiline else " ".join(s.split())
    return s[:limit]


def _need(value: str, field: str, message: str) -> str:
    if not value:
        raise ApiError(422, "validation_error", message, fields={field: message})
    return value


# ---------------------------------------------------------------------------- applications
def _reference(category: str, division: str, now: datetime) -> str:
    return f"LAX-{category[0].upper()}{division[0].upper()}-{now:%y%m%d}-{secrets.token_hex(3).upper()}"


def validate_application(body: dict, divisions: set[str] | None = None) -> dict:
    """Validate and normalise a submitted application. Raises ApiError(422) with per-field messages."""
    errors: dict[str, str] = {}
    category, division = body.get("category"), body.get("division")
    if category not in CATEGORIES:
        errors["category"] = "Choose a partnership type."
    if division not in (divisions or set(DIVISIONS)):
        errors["division"] = "Choose a business division."
    name = clean_text(body.get("full_name"), 120)
    if len(name) < 2:
        errors["full_name"] = "Enter your full name."
    email = clean_text(body.get("email"), 254).lower()
    if not _EMAIL.match(email):
        errors["email"] = "Enter a valid e-mail address."
    digits = re.sub(r"\D", "", clean_text(body.get("phone"), 30))
    if not 8 <= len(digits) <= 15:
        errors["phone"] = "Enter a valid mobile number."
    country = clean_text(body.get("country"), 80)
    if not country:
        errors["country"] = "Select your country."
    if body.get("consent_processing") is not True:
        errors["consent_processing"] = "Please agree to the processing of your enquiry so we can respond."
    entity = body.get("entity_type")
    if entity not in (None, "", "individual", "organization"):
        errors["entity_type"] = "Choose individual or organization."
    organization = clean_text(body.get("organization"), 160)
    if entity == "organization" and not organization:
        errors["organization"] = "Enter the organization name."
    allowed = {**COMMON_ANSWERS, **ANSWER_KEYS.get(category, {})}
    raw = body.get("answers") if isinstance(body.get("answers"), dict) else {}
    answers = {k: clean_text(v, allowed[k], multiline=allowed[k] > 200) for k, v in raw.items() if k in allowed and clean_text(v, allowed[k])}
    if category == "franchise" and not answers.get("proposed_location"):
        errors["answers.proposed_location"] = "Tell us where you would like to operate."
    cons_raw = body.get("consultation") if isinstance(body.get("consultation"), dict) else {}
    consultation: dict = {}
    if cons_raw.get("date"):
        try:
            d = date.fromisoformat(str(cons_raw["date"])[:10])
            if not date.today() - timedelta(days=1) <= d <= date.today() + timedelta(days=365):
                raise ValueError
            consultation["date"] = d.isoformat()
        except ValueError:
            errors["consultation.date"] = "Choose a date within the next year."
    if cons_raw.get("time"):
        consultation["time"] = clean_text(cons_raw["time"], 20)
    if cons_raw.get("method") in ("phone", "email", "whatsapp"):
        consultation["method"] = cons_raw["method"]
    if cons_raw.get("mode") in ("online", "offline"):
        consultation["mode"] = cons_raw["mode"]
    if cons_raw.get("message"):
        consultation["message"] = clean_text(cons_raw["message"], 1000, multiline=True)
    if errors:
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields=errors)
    return {
        "category": category, "division": division, "full_name": name, "email": email, "phone": ("+" if str(body.get("phone", "")).strip().startswith("+") else "") + digits, "country": country,
        "state": clean_text(body.get("state"), 80) or None, "city": clean_text(body.get("city"), 80) or None, "occupation": clean_text(body.get("occupation"), 120) or None,
        "entity_type": entity or None, "organization": organization or None, "preferred_location": clean_text(body.get("preferred_location"), 160) or None, "answers": answers,
        "consultation": consultation, "preferred_branch": clean_text(body.get("preferred_branch"), 40) or None, "consent_marketing": body.get("consent_marketing") is True,
        "source_page": clean_text(body.get("source_page"), 160) or None,
    }


def create_application(db: Session, body: dict) -> tuple[PartnershipApplication, bool]:
    """Store a validated application and its first history entry. Returns (row, duplicate): the same person sending the same form again within a day gets the same reference, not a second record."""
    v = validate_application(body, active_division_slugs(db))
    now = utcnow()
    fp = hashlib.sha256(f"{v['email']}|{v['category']}|{v['division']}".encode()).hexdigest()
    existing = db.scalar(select(PartnershipApplication).where(PartnershipApplication.fingerprint == fp, PartnershipApplication.created_at >= now - timedelta(days=1)).order_by(PartnershipApplication.created_at.desc()))
    if existing is not None:
        return existing, True
    for _ in range(5):
        row = PartnershipApplication(reference=_reference(v["category"], v["division"], now), status="new", fingerprint=fp, consent_processing=True, consent_at=now, **v)
        try:
            with db.begin_nested():
                db.add(row)
                db.flush()
            break
        except IntegrityError:  # a (very unlikely) reference clash: try another
            continue
    else:
        raise ApiError(503, "try_again", "We could not save your application just now. Please try again.")
    db.add(ApplicationEvent(application_id=row.id, kind="submitted", to_status="new", note=f"Submitted from {row.source_page or 'the website'}", author_name="Applicant"))
    db.flush()
    return row, False


def application_out(a: PartnershipApplication, *, detail: bool = False, names: dict | None = None) -> dict:
    out = {"id": str(a.id), "reference": a.reference, "category": a.category, "division": a.division, "status": a.status, "full_name": a.full_name, "email": a.email, "phone": a.phone,
           "country": a.country, "state": a.state, "city": a.city, "preferred_branch": a.preferred_branch, "assigned_branch": a.assigned_branch,
           "assigned_to": str(a.assigned_to) if a.assigned_to else None, "assigned_to_name": (names or {}).get(a.assigned_to), "created_at": aware(a.created_at).isoformat(), "updated_at": aware(a.updated_at).isoformat() if a.updated_at else None,
           "has_consultation_request": bool(a.consultation)}
    if detail:
        out.update({"occupation": a.occupation, "entity_type": a.entity_type, "organization": a.organization, "preferred_location": a.preferred_location, "answers": a.answers, "consultation": a.consultation,
                    "consent_processing": a.consent_processing, "consent_marketing": a.consent_marketing, "consent_at": aware(a.consent_at).isoformat() if a.consent_at else None, "source_page": a.source_page})
    return out


def event_out(e: ApplicationEvent) -> dict:
    return {"id": str(e.id), "kind": e.kind, "from_status": e.from_status, "to_status": e.to_status, "note": e.note, "author": e.author_name, "at": aware(e.created_at).isoformat()}


def applications_page(db: Session, *, q: str | None, status: str | None, category: str | None, division: str | None, branch: str | None, assigned: str | None, page: int, page_size: int) -> tuple[list[PartnershipApplication], int]:
    stmt = select(PartnershipApplication)
    if status:
        if status not in STATUSES:
            raise ApiError(422, "invalid_status", "Unknown status.", fields={"status": "Unknown status."})
        stmt = stmt.where(PartnershipApplication.status == status)
    if category in CATEGORIES:
        stmt = stmt.where(PartnershipApplication.category == category)
    if division in DIVISIONS:
        stmt = stmt.where(PartnershipApplication.division == division)
    if branch:
        stmt = stmt.where(or_(PartnershipApplication.assigned_branch == branch, PartnershipApplication.preferred_branch == branch))
    if assigned == "unassigned":
        stmt = stmt.where(PartnershipApplication.assigned_to.is_(None))
    elif assigned:
        try:
            stmt = stmt.where(PartnershipApplication.assigned_to == uuid.UUID(assigned))
        except ValueError:
            pass
    if q:
        term = f"%{clean_text(q, 80).lower()}%"
        stmt = stmt.where(or_(func.lower(PartnershipApplication.reference).like(term), func.lower(PartnershipApplication.full_name).like(term), func.lower(PartnershipApplication.email).like(term), PartnershipApplication.phone.like(term)))
    total = int(db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    rows = db.scalars(stmt.order_by(PartnershipApplication.created_at.desc(), PartnershipApplication.id).limit(page_size).offset((page - 1) * page_size)).all()
    return list(rows), total


def staff_names(db: Session, ids) -> dict:
    ids = [i for i in set(ids) if i]
    return {u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(ids)))} if ids else {}


def set_status(db: Session, a: PartnershipApplication, status: str, note: str | None, user: User) -> bool:
    """Change the workflow status (any status to any other: an administrator decides) and record it. 'approved' only marks the ENQUIRY: it never creates a partner account."""
    if status not in STATUSES:
        raise ApiError(422, "invalid_status", "Unknown status.", fields={"status": "Unknown status."})
    if a.status == status:
        return False
    db.add(ApplicationEvent(application_id=a.id, kind="status", from_status=a.status, to_status=status, note=clean_text(note, 1000, multiline=True) or None, author_id=user.id, author_name=user.full_name))
    a.status = status
    db.flush()
    return True


def add_note(db: Session, a: PartnershipApplication, kind: str, note: str, user: User) -> None:
    text = clean_text(note, 2000, multiline=True)
    if len(text) < 2:
        raise ApiError(422, "validation_error", "Write a short note.", fields={"note": "A note is required."})
    if kind not in ("note", "followup", "consultation"):
        raise ApiError(422, "invalid_kind", "Unsupported entry type.")
    db.add(ApplicationEvent(application_id=a.id, kind=kind, note=text, author_id=user.id, author_name=user.full_name))
    db.flush()


def assign(db: Session, a: PartnershipApplication, *, user_id: str | None, branch: str | None, by: User) -> None:
    target = None
    if user_id:
        try:
            target = db.get(User, uuid.UUID(user_id))
        except ValueError:
            target = None
        if target is None or target.role not in ("admin", "super_admin") or not target.is_active:
            raise ApiError(422, "invalid_assignee", "Choose an active administrator.", fields={"assigned_to": "Not an active administrator."})
    a.assigned_to = target.id if target else None
    a.assigned_branch = clean_text(branch, 40) or None
    db.add(ApplicationEvent(application_id=a.id, kind="assign", note=f"Assigned to {target.full_name if target else 'nobody'}" + (f", branch {a.assigned_branch}" if a.assigned_branch else ""), author_id=by.id, author_name=by.full_name))
    db.flush()


def _safe(v):
    return "'" + v if isinstance(v, str) and v[:1] in ("=", "+", "-", "@", "\t", "\r") else v


def export_csv(rows: list[PartnershipApplication]) -> str:
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["reference", "created_at", "category", "division", "status", "name", "email", "phone", "country", "state", "city", "preferred_branch", "assigned_branch", "consent_marketing"])
    for a in rows:
        w.writerow([_safe(x) for x in (a.reference, aware(a.created_at).isoformat(), a.category, a.division, a.status, a.full_name, a.email, a.phone, a.country, a.state or "", a.city or "", a.preferred_branch or "", a.assigned_branch or "", a.consent_marketing)])
    return out.getvalue()


def dashboard(db: Session, since: datetime) -> dict:
    base = [PartnershipApplication.created_at >= since]
    count = lambda *c: int(db.scalar(select(func.count()).select_from(PartnershipApplication).where(*base, *c)) or 0)  # noqa: E731
    by = lambda col: {k: int(n) for k, n in db.execute(select(col, func.count()).where(*base).group_by(col)).all()}  # noqa: E731
    days = db.execute(select(PartnershipApplication.created_at).where(*base)).all()
    per_day: dict[str, int] = {}
    for (t,) in days:
        k = aware(t).date().isoformat()
        per_day[k] = per_day.get(k, 0) + 1
    recent = db.scalars(select(PartnershipApplication).order_by(PartnershipApplication.created_at.desc()).limit(8)).all()
    st = by(PartnershipApplication.status)
    return {"since": since.isoformat(), "total": count(), "new": st.get("new", 0), "by_category": by(PartnershipApplication.category), "by_division": by(PartnershipApplication.division), "by_status": st,
            "consultation_requests": sum(1 for (c,) in db.execute(select(PartnershipApplication.consultation).where(*base)).all() if c),
            "under_review": st.get("under_review", 0), "approved": st.get("approved", 0), "rejected": st.get("rejected", 0),
            "per_day": [{"date": d, "applications": n} for d, n in sorted(per_day.items())], "recent": [application_out(a) for a in recent]}


# ---------------------------------------------------------------------------- settings and public content
SETTING_KEYS = ("portal_url", "notify_emails", "general_brochure_media_id", "general_brochure_published", "acknowledgement_enabled", "applications_open")


def get_settings_map(db: Session) -> dict:
    out = {"portal_url": "", "notify_emails": [], "general_brochure_media_id": None, "general_brochure_published": False, "acknowledgement_enabled": True, "applications_open": True}
    for r in db.scalars(select(PartnershipSetting)):
        if r.key in out and isinstance(r.value, dict) and "v" in r.value:
            out[r.key] = r.value["v"]
    return out


def clean_setting(key: str, v):
    if key == "portal_url":
        v = clean_text(v, 300)
        if v and not re.match(r"^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:\d+)?(/[^\s]*)?$", v):
            raise ApiError(422, "invalid_setting", "Use a full https:// address.", fields={key: "Use a full https:// address."})
        return v
    if key == "notify_emails":
        if not isinstance(v, list) or len(v) > 10 or any(not _EMAIL.match(str(x).strip()) for x in v):
            raise ApiError(422, "invalid_setting", "Enter valid e-mail addresses (up to 10).", fields={key: "Enter valid e-mail addresses."})
        return [str(x).strip().lower() for x in v]
    if key in ("general_brochure_published", "acknowledgement_enabled", "applications_open"):
        if not isinstance(v, bool):
            raise ApiError(422, "invalid_setting", "Use on or off.", fields={key: "Use on or off."})
        return v
    if key == "general_brochure_media_id":
        if v in (None, ""):
            return None
        try:
            return str(uuid.UUID(str(v)))
        except ValueError:
            raise ApiError(422, "invalid_setting", "Choose a file from the media library.", fields={key: "Invalid file."}) from None
    raise ApiError(422, "unknown_setting", "Unknown setting.", fields={key: "Unknown setting."})


def asset_url(db: Session, settings, media_id, *, pdf: bool = False):
    from app.services import media_service

    if not media_id:
        return None
    a = db.get(MediaAsset, media_id if isinstance(media_id, uuid.UUID) else uuid.UUID(str(media_id)))
    if a is None or not a.is_public or (a.kind != "document" if pdf else a.kind != "image"):
        return None
    return media_service.url_of(settings, a)


def public_payload(db: Session, settings) -> dict:
    """Everything the public pages need on top of the built-in content, in ONE response (no applicant data, no unpublished commercial fields)."""
    st = get_settings_map(db)
    pages = {}
    for p in db.scalars(select(PartnershipPage)):
        commercial = {k: str(v.get("value") or "")[:600] for k, v in (p.commercial or {}).items() if k in COMMERCIAL_FIELDS and isinstance(v, dict) and v.get("published") and v.get("value")}
        pages[p.slug] = {"published": p.published, "content": p.content or {}, "seo_title": p.seo_title, "seo_description": p.seo_description, "noindex": p.noindex, "commercial": commercial,
                         "hero_url": asset_url(db, settings, p.hero_media_id), "hero_alt": p.hero_alt, "brochure_url": asset_url(db, settings, p.brochure_media_id, pdf=True) if p.brochure_published else None, "version": p.version}
    faqs: dict[str, list] = {}
    for f in db.scalars(select(PartnershipFaq).where(PartnershipFaq.published.is_(True)).order_by(PartnershipFaq.scope, PartnershipFaq.sort_order, PartnershipFaq.question)):
        faqs.setdefault(f.scope, []).append({"q": f.question, "a": f.answer})
    policies: dict[str, dict] = {}
    for pol in db.scalars(select(PartnershipPolicy).where(PartnershipPolicy.status == "published").order_by(PartnershipPolicy.version)):
        policies[f"{pol.key}:{pol.scope}"] = {"key": pol.key, "scope": pol.scope, "title": pol.title, "body": pol.body, "version": pol.version, "effective_date": pol.effective_date.isoformat() if pol.effective_date else None,
                                              "updated_at": aware(pol.updated_at).date().isoformat() if pol.updated_at else None}
    custom = {f"{c}/{x['slug']}": {"label": x["label"], "description": x["description"]} for c, items in menu_items(db).items() for x in items if not x["builtin"]}
    return {"menu": public_menu(db)["categories"], "custom_pages": custom, "applications_open": st["applications_open"], "portal_url": st["portal_url"] or None, "general_brochure_url": asset_url(db, settings, st["general_brochure_media_id"], pdf=True) if st["general_brochure_published"] else None,
            "pages": pages, "faqs": faqs, "policies": list(policies.values())}


# ---------------------------------------------------------------------------- the Partner With Us menu (managed in the admin panel)
def _item_out(category: str, slug: str, label: str, description: str | None, builtin: bool, enabled: bool, sort_order: int, item_id=None) -> dict:
    return {"id": str(item_id) if item_id else None, "category": category, "slug": slug, "label": label, "description": description, "builtin": builtin, "enabled": enabled, "sort_order": sort_order,
            "path": f"/{category}/{slug}"}


def menu_items(db: Session, *, include_disabled: bool = False) -> dict[str, list[dict]]:
    """The menu per partnership category. The three built-in divisions are always present (an administrator can rename, reorder or disable them but not delete them); administrator-created
    entries follow their saved order. Without any saved row the menu is simply the three built-in divisions."""
    rows = list(db.scalars(select(PartnershipMenuItem).order_by(PartnershipMenuItem.sort_order, PartnershipMenuItem.label)))
    out: dict[str, list[dict]] = {}
    for cat in PAGE_SLUGS_CATEGORIES:
        saved = {r.slug: r for r in rows if r.category == cat}
        items = []
        for i, d in enumerate(DIVISIONS):
            r = saved.pop(d, None)
            items.append(_item_out(cat, d, r.label if r else BUILTIN_LABELS[d], r.description if r else None, True, r.enabled if r else True, r.sort_order if r else i, r.id if r else None))
        for r in saved.values():
            items.append(_item_out(cat, r.slug, r.label, r.description, False, r.enabled, r.sort_order, r.id))
        items.sort(key=lambda x: (x["sort_order"], x["label"]))
        out[cat] = [x for x in items if include_disabled or x["enabled"]]
    return out


def active_division_slugs(db: Session) -> set[str]:
    return set(DIVISIONS) | {x["slug"] for items in menu_items(db).values() for x in items}


def page_slugs(db: Session) -> list[str]:
    """Every page an administrator can edit: the built-in ones and the pages of administrator-created menu entries."""
    extra = [x["path"].lstrip("/") for items in menu_items(db, include_disabled=True).values() for x in items if not x["builtin"]]
    return [*PAGE_SLUGS, *extra]


def save_menu(db: Session, category: str, items: list[dict]) -> None:
    """Replace one category's menu with the given ordered list. Built-in divisions are kept (label / order / visibility only); entries missing from the list are deleted if they were created by an
    administrator (their page content is removed with them); validation is strict so a bad request changes nothing."""
    if category not in PAGE_SLUGS_CATEGORIES:
        raise ApiError(404, "category_not_found", "Unknown partnership category.")
    if not isinstance(items, list) or len(items) > MAX_MENU_ITEMS:
        raise ApiError(422, "invalid_menu", f"A menu can have at most {MAX_MENU_ITEMS} entries.", fields={"items": "Too many entries."})
    seen: set[str] = set()
    clean: list[dict] = []
    for i, it in enumerate(items):
        if not isinstance(it, dict):
            raise ApiError(422, "invalid_menu", "Invalid entry.", fields={"items": "Invalid entry."})
        label = clean_text(it.get("label"), 60)
        slug = clean_text(it.get("slug"), 40).lower()
        builtin = slug in DIVISIONS
        if len(label) < 2:
            raise ApiError(422, "invalid_menu", "Every entry needs a name (at least 2 characters).", fields={f"items.{i}.label": "Enter a name."})
        if not builtin and (not _SLUG.match(slug) or slug in RESERVED_SLUGS):
            raise ApiError(422, "invalid_menu", "Use lowercase letters, numbers and hyphens for the page address (for example: healthcare-training).", fields={f"items.{i}.slug": "Invalid page address."})
        if slug in seen:
            raise ApiError(422, "invalid_menu", "Two entries have the same page address.", fields={f"items.{i}.slug": "Duplicate page address."})
        seen.add(slug)
        clean.append({"slug": slug, "label": label, "description": clean_text(it.get("description"), 300) or None, "enabled": it.get("enabled") is not False, "builtin": builtin, "sort_order": i})
    existing = {r.slug: r for r in db.scalars(select(PartnershipMenuItem).where(PartnershipMenuItem.category == category))}
    for c in clean:
        r = existing.get(c["slug"])
        if r is None:
            db.add(PartnershipMenuItem(category=category, **c))
        else:
            r.label, r.description, r.enabled, r.sort_order, r.builtin = c["label"], c["description"], c["enabled"], c["sort_order"], c["builtin"]
    for slug, r in existing.items():
        if slug not in seen and not r.builtin:  # an administrator-created entry that was left out is deleted together with its page content
            db.delete(r)
            page = db.get(PartnershipPage, f"{category}/{slug}")
            if page is not None:
                db.delete(page)
    for k, d in enumerate(DIVISIONS):  # a built-in division is never deleted: when left out it is only hidden
        if d not in seen:
            r = existing.get(d)
            if r is None:
                db.add(PartnershipMenuItem(category=category, slug=d, label=BUILTIN_LABELS[d], enabled=False, builtin=True, sort_order=len(clean) + k))
            else:
                r.enabled, r.sort_order = False, len(clean) + k
    db.flush()


def public_menu(db: Session) -> dict:
    return {"categories": [{"slug": c, "label": CATEGORY_LABELS[c], "path": f"/{c}", "items": [{"slug": x["slug"], "label": x["label"], "path": x["path"], "builtin": x["builtin"]} for x in items]}
                           for c, items in menu_items(db).items()]}
