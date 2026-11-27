"""Partnership administration inside the existing admin panel: applications workflow, page content, FAQs, policies, brochures and settings.

Everything needs a signed-in STAFF account holding the `partnerships` permission (checked on the server). Writes are rate limited, validated, audited and never create a partner account.
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.api.paging import Paging, day_after, day_start
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.rate_limit import rate_limit
from app.db.session import get_db, get_read_db
from app.models import ApplicationEvent, MediaAsset, PartnershipApplication, PartnershipFaq, PartnershipPage, PartnershipPolicy, PartnershipSetting, User
from app.models.partnership import STATUSES
from app.schemas.common import ApiModel
from app.services import audit_service, media_service, partnership_service as ps

router = APIRouter(prefix="/admin/partnerships", tags=["admin: partnerships"])
read, write = permission("partnerships"), permission("partnerships", write=True)
LIMIT = Depends(rate_limit("partner_admin", "partner_admin_rate_limit_max", "partner_admin_rate_limit_window_seconds"))


def _commit(db: Session) -> None:
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise


def _slugs(db: Session) -> list[str]:
    return ps.page_slugs(db)


def _app(db: Session, app_id: uuid.UUID) -> PartnershipApplication:
    a = db.get(PartnershipApplication, app_id)
    if a is None:
        raise ApiError(404, "application_not_found", "Application not found.")
    return a


# ================================================================== dashboard and applications
@router.get("/dashboard")
def dashboard(days: int = Query(30, ge=1, le=365), _: User = Depends(read), db: Session = Depends(get_read_db)) -> dict:
    return {**ps.dashboard(db, ps.utcnow() - timedelta(days=days)), "division_options": ps.division_options(db), "days": days, "statuses": list(STATUSES),
            "note": "Page views are not recorded by the website, so 'most viewed opportunity' is not shown."}


@router.get("/staff")
def staff(_: User = Depends(read), db: Session = Depends(get_read_db)) -> dict:
    users = db.scalars(select(User).where(User.role.in_(("admin", "super_admin")), User.is_active.is_(True)).order_by(User.full_name)).all()
    return {"items": [{"id": str(u.id), "name": u.full_name} for u in users]}


@router.get("/applications")
def applications(q: str | None = Query(None, max_length=80), status: str | None = Query(None, max_length=30), category: str | None = Query(None, max_length=12), division: str | None = Query(None, max_length=40),
                 branch: str | None = Query(None, max_length=40), assigned: str | None = Query(None, max_length=40), date_from: date | None = Query(None, alias="from"), date_to: date | None = Query(None, alias="to"),
                 source: str | None = Query(None, max_length=60), paging: Paging = Depends(), _: User = Depends(read), db: Session = Depends(get_read_db)) -> dict:
    rows, total = ps.applications_page(db, q=q, status=status, category=category, division=division, branch=branch, assigned=assigned, page=paging.page, page_size=paging.page_size, date_from=day_start(date_from), date_to=day_after(date_to), source=source)
    names = ps.staff_names(db, [r.assigned_to for r in rows])
    return {**paging.envelope([ps.application_out(r, names=names) for r in rows], total), "statuses": list(STATUSES), "division_options": ps.division_options(db)}


@router.get("/applications/export")
def export(q: str | None = Query(None, max_length=80), status: str | None = Query(None, max_length=30), category: str | None = Query(None, max_length=12), division: str | None = Query(None, max_length=40),
           date_from: date | None = Query(None, alias="from"), date_to: date | None = Query(None, alias="to"), source: str | None = Query(None, max_length=60),
           user: User = Depends(read), db: Session = Depends(get_read_db)) -> Response:
    rows, _ = ps.applications_page(db, q=q, status=status, category=category, division=division, branch=None, assigned=None, page=1, page_size=5000, date_from=day_start(date_from), date_to=day_after(date_to), source=source)
    return Response(ps.export_csv(rows), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": 'attachment; filename="partnership-applications.csv"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})


@router.get("/applications/{app_id}")
def application(app_id: uuid.UUID, _: User = Depends(read), db: Session = Depends(get_read_db)) -> dict:
    a = _app(db, app_id)
    events = db.scalars(select(ApplicationEvent).where(ApplicationEvent.application_id == a.id).order_by(ApplicationEvent.created_at.desc())).all()
    return {**ps.application_out(a, detail=True, names=ps.staff_names(db, [a.assigned_to])), "events": [ps.event_out(e) for e in events], "division_options": ps.division_options(db)}


class StatusIn(ApiModel):
    status: str = Field(max_length=30)
    note: str | None = Field(default=None, max_length=1000)


class NoteIn(ApiModel):
    kind: str = Field(default="note", max_length=14)
    note: str = Field(max_length=2000)


class AssignIn(ApiModel):
    assigned_to: str | None = Field(default=None, max_length=40)
    branch: str | None = Field(default=None, max_length=40)


@router.patch("/applications/{app_id}/status", dependencies=[LIMIT])
def set_status(app_id: uuid.UUID, body: StatusIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    a = _app(db, app_id)
    before = a.status
    changed = ps.set_status(db, a, body.status, body.note, user)
    if changed:
        audit_service.record(db, user, "partner.application.status", resource_type="partnership_application", resource_id=a.id, detail={"reference": a.reference, "from": before, "to": a.status})
    _commit(db)
    return {"id": str(a.id), "status": a.status, "changed": changed, "note": "Approval records the decision on this enquiry only. It does not create a partner account."}


@router.post("/applications/{app_id}/notes", status_code=201, dependencies=[LIMIT])
def note(app_id: uuid.UUID, body: NoteIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    a = _app(db, app_id)
    ps.add_note(db, a, body.kind, body.note, user)
    audit_service.record(db, user, "partner.application.note", resource_type="partnership_application", resource_id=a.id, detail={"reference": a.reference, "kind": body.kind})
    _commit(db)
    return {"ok": True}


@router.put("/applications/{app_id}/assignment", dependencies=[LIMIT])
def assignment(app_id: uuid.UUID, body: AssignIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    a = _app(db, app_id)
    ps.assign(db, a, user_id=body.assigned_to, branch=body.branch, by=user)
    audit_service.record(db, user, "partner.application.assign", resource_type="partnership_application", resource_id=a.id, detail={"reference": a.reference, "branch": a.assigned_branch})
    _commit(db)
    return {"ok": True}


# ================================================================== page content, commercial information, SEO, media, brochures
class PageIn(ApiModel):
    published: bool = True
    content: dict = {}
    seo_title: str | None = Field(default=None, max_length=160)
    seo_description: str | None = Field(default=None, max_length=320)
    noindex: bool = False
    commercial: dict = {}
    hero_media_id: str | None = None
    hero_alt: str | None = Field(default=None, max_length=200)
    brochure_media_id: str | None = None
    brochure_published: bool = False


def clean_content(raw: dict) -> dict:
    """Only these text fields can be overridden, as plain text with fixed limits (nothing is ever rendered as HTML)."""
    out: dict = {}
    for k, limit in (("hero_heading", 160), ("hero_lead", 500), ("cta_label", 40)):
        v = ps.clean_text(raw.get(k), limit)
        if v:
            out[k] = v
    if isinstance(raw.get("intro"), list):
        out["intro"] = [ps.clean_text(x, 800, multiline=True) for x in raw["intro"][:6] if ps.clean_text(x, 800)]
    if isinstance(raw.get("extra_sections"), list):
        secs = []
        for s in raw["extra_sections"][:8]:
            if isinstance(s, dict) and ps.clean_text(s.get("heading"), 120) and ps.clean_text(s.get("body"), 2000):
                secs.append({"heading": ps.clean_text(s["heading"], 120), "body": ps.clean_text(s["body"], 2000, multiline=True), "enabled": s.get("enabled") is not False})
        out["extra_sections"] = secs
    if isinstance(raw.get("hidden_sections"), list):
        out["hidden_sections"] = [ps.clean_text(x, 40) for x in raw["hidden_sections"][:30] if ps.clean_text(x, 40)]
    return out


def _media(db: Session, raw, field: str, *, kind: str):
    if raw in (None, ""):
        return None
    try:
        mid = uuid.UUID(str(raw))
    except ValueError:
        raise ApiError(422, "invalid_media", "Choose a file from the media library.", fields={field: "Invalid file."}) from None
    a = db.get(MediaAsset, mid)
    if a is None or a.kind != kind:
        raise ApiError(422, "invalid_media", f"Choose a {'PDF document' if kind == 'document' else 'picture'} from the media library.", fields={field: f"Choose a {'PDF' if kind == 'document' else 'picture'}."})
    media_service.make_public(db, {mid})  # a public page can only show public files
    return mid


def _page_out(p: PartnershipPage | None, slug: str) -> dict:
    if p is None:
        return {"slug": slug, "customised": False, "published": True, "content": {}, "seo_title": None, "seo_description": None, "noindex": False, "commercial": {}, "hero_media_id": None, "hero_alt": None,
                "brochure_media_id": None, "brochure_published": False, "brochure_version": 0, "version": 0, "updated_at": None}
    return {"slug": slug, "customised": True, "published": p.published, "content": p.content or {}, "seo_title": p.seo_title, "seo_description": p.seo_description, "noindex": p.noindex, "commercial": p.commercial or {},
            "hero_media_id": str(p.hero_media_id) if p.hero_media_id else None, "hero_alt": p.hero_alt, "brochure_media_id": str(p.brochure_media_id) if p.brochure_media_id else None,
            "brochure_published": p.brochure_published, "brochure_version": p.brochure_version, "version": p.version, "updated_at": ps.aware(p.updated_at).isoformat() if p.updated_at else None}


@router.get("/pages")
def pages(_: User = Depends(read), db: Session = Depends(get_read_db)) -> dict:
    have = {p.slug: p for p in db.scalars(select(PartnershipPage))}
    return {"items": [_page_out(have.get(s), s) for s in _slugs(db)], "commercial_fields": list(ps.COMMERCIAL_FIELDS),
            "note": "Commercial fields stay hidden from the public site until you publish each one. Until then the pages say details are available on consultation."}


@router.get("/pages/{slug:path}")
def page(slug: str, _: User = Depends(read), db: Session = Depends(get_read_db)) -> dict:
    if slug not in _slugs(db):
        raise ApiError(404, "page_not_found", "Unknown partnership page.")
    return _page_out(db.get(PartnershipPage, slug), slug)


@router.put("/pages/{slug:path}", dependencies=[LIMIT])
def save_page(slug: str, body: PageIn, user: User = Depends(write), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    if slug not in _slugs(db):
        raise ApiError(404, "page_not_found", "Unknown partnership page.")
    commercial = {}
    for k, v in (body.commercial or {}).items():
        if k not in ps.COMMERCIAL_FIELDS or not isinstance(v, dict):
            raise ApiError(422, "invalid_commercial", f"“{k}” is not a commercial field.", fields={"commercial": f"Unknown field {k}."})
        commercial[k] = {"value": ps.clean_text(v.get("value"), 600, multiline=True), "published": v.get("published") is True and bool(ps.clean_text(v.get("value"), 600))}
    hero = _media(db, body.hero_media_id, "hero_media_id", kind="image")
    brochure = _media(db, body.brochure_media_id, "brochure_media_id", kind="document")
    p = db.get(PartnershipPage, slug)
    created = p is None
    if created:
        p = PartnershipPage(slug=slug, version=0, brochure_version=0)
        db.add(p)
    if brochure and brochure != p.brochure_media_id:
        p.brochure_version = (p.brochure_version or 0) + 1
    p.published, p.content, p.noindex = body.published, clean_content(body.content or {}), body.noindex
    p.seo_title, p.seo_description = ps.clean_text(body.seo_title, 160) or None, ps.clean_text(body.seo_description, 320) or None
    p.commercial, p.hero_media_id, p.hero_alt = commercial, hero, ps.clean_text(body.hero_alt, 200) or None
    p.brochure_media_id, p.brochure_published = brochure, bool(body.brochure_published and brochure)
    p.version, p.updated_by = (p.version or 0) + 1, user.id
    published_fields = [k for k, v in commercial.items() if v["published"]]
    audit_service.record(db, user, "partner.page.save", resource_type="partnership_page", resource_id=slug, detail={"published": p.published, "noindex": p.noindex, "commercial_published": ", ".join(published_fields) or "none", "version": p.version})
    _commit(db)
    return _page_out(p, slug)


# ================================================================== FAQs
class FaqIn(ApiModel):
    scope: str = Field(default="general", max_length=60)
    question: str = Field(min_length=5, max_length=300)
    answer: str = Field(min_length=5, max_length=3000)
    sort_order: int = Field(default=0, ge=0, le=999)
    published: bool = True


def _faq_out(f: PartnershipFaq) -> dict:
    return {"id": str(f.id), "scope": f.scope, "question": f.question, "answer": f.answer, "sort_order": f.sort_order, "published": f.published}


def _check_scope(scope: str, db: Session | None = None) -> str:
    if scope != "general" and scope not in (ps.page_slugs(db) if db is not None else ps.PAGE_SLUGS):
        raise ApiError(422, "invalid_scope", "Choose general or one of the partnership pages.", fields={"scope": "Unknown page."})
    return scope


@router.get("/faqs")
def faqs(scope: str | None = Query(None, max_length=60), _: User = Depends(read), db: Session = Depends(get_read_db)) -> dict:
    stmt = select(PartnershipFaq).order_by(PartnershipFaq.scope, PartnershipFaq.sort_order, PartnershipFaq.question)
    if scope:
        stmt = stmt.where(PartnershipFaq.scope == scope)
    return {"items": [_faq_out(f) for f in db.scalars(stmt)], "scopes": ["general", *_slugs(db)]}


@router.post("/faqs", status_code=201, dependencies=[LIMIT])
def create_faq(body: FaqIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    f = PartnershipFaq(scope=_check_scope(body.scope, db), question=ps.clean_text(body.question, 300), answer=ps.clean_text(body.answer, 3000, multiline=True), sort_order=body.sort_order, published=body.published)
    db.add(f)
    audit_service.record(db, user, "partner.faq.create", resource_type="partnership_faq", detail={"scope": f.scope})
    _commit(db)
    return _faq_out(f)


@router.patch("/faqs/{faq_id}", dependencies=[LIMIT])
def update_faq(faq_id: uuid.UUID, body: FaqIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    f = db.get(PartnershipFaq, faq_id)
    if f is None:
        raise ApiError(404, "faq_not_found", "FAQ not found.")
    f.scope, f.question, f.answer = _check_scope(body.scope, db), ps.clean_text(body.question, 300), ps.clean_text(body.answer, 3000, multiline=True)
    f.sort_order, f.published = body.sort_order, body.published
    audit_service.record(db, user, "partner.faq.update", resource_type="partnership_faq", resource_id=f.id, detail={"scope": f.scope, "published": f.published})
    _commit(db)
    return _faq_out(f)


@router.delete("/faqs/{faq_id}", dependencies=[LIMIT])
def delete_faq(faq_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    f = db.get(PartnershipFaq, faq_id)
    if f is None:
        raise ApiError(404, "faq_not_found", "FAQ not found.")
    db.delete(f)
    audit_service.record(db, user, "partner.faq.delete", resource_type="partnership_faq", resource_id=faq_id)
    _commit(db)
    return {"deleted": True}


# ================================================================== policies (versioned; a draft is never public)
POLICY_KEYS = ("terms", "privacy", "eligibility", "commission", "payment", "refund", "termination", "confidentiality", "brand", "disputes", "franchise_agreement", "other")


class PolicyIn(ApiModel):
    key: str = Field(max_length=30)
    scope: str = Field(default="general", max_length=60)
    title: str = Field(min_length=3, max_length=160)
    body: str = Field(min_length=10, max_length=20000)
    effective_date: date | None = None


def _policy_out(p: PartnershipPolicy) -> dict:
    return {"id": str(p.id), "key": p.key, "scope": p.scope, "title": p.title, "body": p.body, "version": p.version, "status": p.status, "effective_date": p.effective_date.isoformat() if p.effective_date else None,
            "reviewed_by": p.reviewed_by, "updated_at": ps.aware(p.updated_at).isoformat() if p.updated_at else None}


@router.get("/policies")
def policies(_: User = Depends(read), db: Session = Depends(get_read_db)) -> dict:
    rows = db.scalars(select(PartnershipPolicy).order_by(PartnershipPolicy.key, PartnershipPolicy.scope, PartnershipPolicy.version.desc())).all()
    return {"items": [_policy_out(p) for p in rows], "keys": list(POLICY_KEYS), "scopes": ["general", *_slugs(db)],
            "note": "Binding commercial or legal policies need management and legal review before they are published. A draft is never shown on the website."}


@router.post("/policies", status_code=201, dependencies=[LIMIT])
def create_policy(body: PolicyIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    if body.key not in POLICY_KEYS:
        raise ApiError(422, "invalid_key", "Choose a policy type.", fields={"key": "Unknown policy type."})
    scope = _check_scope(body.scope, db)
    last = db.scalars(select(PartnershipPolicy.version).where(PartnershipPolicy.key == body.key, PartnershipPolicy.scope == scope).order_by(PartnershipPolicy.version.desc())).first() or 0
    p = PartnershipPolicy(key=body.key, scope=scope, title=ps.clean_text(body.title, 160), body=ps.clean_text(body.body, 20000, multiline=True), version=last + 1, status="draft", effective_date=body.effective_date)
    db.add(p)
    audit_service.record(db, user, "partner.policy.create", resource_type="partnership_policy", detail={"key": p.key, "scope": scope, "version": p.version})
    _commit(db)
    return _policy_out(p)


@router.patch("/policies/{policy_id}", dependencies=[LIMIT])
def update_policy(policy_id: uuid.UUID, body: PolicyIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    p = db.get(PartnershipPolicy, policy_id)
    if p is None:
        raise ApiError(404, "policy_not_found", "Policy not found.")
    if p.status != "draft":
        raise ApiError(409, "not_a_draft", "A published or archived version is kept as it is. Create a new version to change it.")
    p.title, p.body, p.effective_date = ps.clean_text(body.title, 160), ps.clean_text(body.body, 20000, multiline=True), body.effective_date
    audit_service.record(db, user, "partner.policy.update", resource_type="partnership_policy", resource_id=p.id, detail={"key": p.key, "version": p.version})
    _commit(db)
    return _policy_out(p)


class PublishIn(ApiModel):
    reviewed_by: str = Field(min_length=3, max_length=160)  # who approved the text (management / legal), recorded with the version


@router.post("/policies/{policy_id}/publish", dependencies=[LIMIT])
def publish_policy(policy_id: uuid.UUID, body: PublishIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    p = db.get(PartnershipPolicy, policy_id)
    if p is None:
        raise ApiError(404, "policy_not_found", "Policy not found.")
    if p.status == "published":
        raise ApiError(409, "already_published", "This version is already published.")
    for old in db.scalars(select(PartnershipPolicy).where(PartnershipPolicy.key == p.key, PartnershipPolicy.scope == p.scope, PartnershipPolicy.status == "published")):
        old.status = "archived"
    p.status, p.reviewed_by = "published", ps.clean_text(body.reviewed_by, 160)
    p.effective_date = p.effective_date or date.today()
    audit_service.record(db, user, "partner.policy.publish", resource_type="partnership_policy", resource_id=p.id, detail={"key": p.key, "scope": p.scope, "version": p.version, "reviewed_by": p.reviewed_by})
    _commit(db)
    return _policy_out(p)


@router.post("/policies/{policy_id}/unpublish", dependencies=[LIMIT])
def unpublish_policy(policy_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    p = db.get(PartnershipPolicy, policy_id)
    if p is None or p.status != "published":
        raise ApiError(409, "not_published", "Only a published version can be withdrawn.")
    p.status = "draft"
    audit_service.record(db, user, "partner.policy.unpublish", resource_type="partnership_policy", resource_id=p.id, detail={"key": p.key, "version": p.version})
    _commit(db)
    return _policy_out(p)


@router.delete("/policies/{policy_id}", dependencies=[LIMIT])
def delete_policy(policy_id: uuid.UUID, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    p = db.get(PartnershipPolicy, policy_id)
    if p is None:
        raise ApiError(404, "policy_not_found", "Policy not found.")
    if p.status != "draft":
        raise ApiError(409, "not_a_draft", "Only an unpublished draft can be deleted.")
    db.delete(p)
    audit_service.record(db, user, "partner.policy.delete", resource_type="partnership_policy", resource_id=policy_id, detail={"key": p.key, "version": p.version})
    _commit(db)
    return {"deleted": True}


# ================================================================== the Partner With Us menu
class MenuEntry(ApiModel):
    slug: str = Field(default="", max_length=40)
    label: str = Field(max_length=60)
    description: str | None = Field(default=None, max_length=300)
    enabled: bool = True


class MenuIn(ApiModel):
    items: list[MenuEntry] = Field(max_length=ps.MAX_MENU_ITEMS)


def _menu_out(db: Session) -> dict:
    items = ps.menu_items(db, include_disabled=True)
    return {"categories": [{"slug": c, "label": ps.CATEGORY_LABELS[c], "items": items[c]} for c in ps.PAGE_SLUGS_CATEGORIES], "max_items": ps.MAX_MENU_ITEMS,
            "note": "The menu in the website header follows this list. An entry you add gets its own page; edit that page's text, image and SEO under Opportunity pages. Switching an entry off hides it from the menu and (for entries you created) from the public site."}


@router.get("/menu")
def get_menu(_: User = Depends(read), db: Session = Depends(get_read_db)) -> dict:
    return _menu_out(db)


@router.put("/menu/{category}", dependencies=[LIMIT])
def put_menu(category: str, body: MenuIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    """Replace one category's menu: order = the order sent. Built-in divisions can be renamed, reordered and switched off but not deleted; entries you created and leave out are deleted."""
    before = {x["slug"] for x in ps.menu_items(db, include_disabled=True).get(category, [])}
    ps.save_menu(db, category, [e.model_dump() for e in body.items])
    after = {e.slug.strip().lower() for e in body.items}
    audit_service.record(db, user, "partner.menu.save", resource_type="partnership_menu", resource_id=category, detail={"entries": len(body.items), "added": ", ".join(sorted(after - before)) or "none", "removed": ", ".join(sorted(s for s in before - after if s not in ps.DIVISIONS)) or "none"})
    _commit(db)
    return _menu_out(db)


# ================================================================== settings
class SettingsIn(ApiModel):
    values: dict


@router.get("/settings")
def get_settings_(_: User = Depends(read), db: Session = Depends(get_read_db)) -> dict:
    return {"values": ps.get_settings_map(db), "note": "The partner portal link is shown only when set here. Partner login on the website never grants any access by itself."}


@router.put("/settings", dependencies=[LIMIT])
def put_settings(body: SettingsIn, user: User = Depends(write), db: Session = Depends(get_db)) -> dict:
    clean = {k: ps.clean_setting(k, v) for k, v in body.values.items()}
    if "general_brochure_media_id" in clean and clean["general_brochure_media_id"]:
        _media(db, clean["general_brochure_media_id"], "general_brochure_media_id", kind="document")
    for k, v in clean.items():
        row = db.get(PartnershipSetting, k)
        if row is None:
            db.add(PartnershipSetting(key=k, value={"v": v}, updated_by=user.id))
        else:
            row.value, row.updated_by = {"v": v}, user.id
    audit_service.record(db, user, "partner.settings.update", resource_type="partnership_settings", detail={"keys": ", ".join(clean)})
    _commit(db)
    return {"values": ps.get_settings_map(db)}
