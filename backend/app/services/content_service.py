"""CMS content. `KINDS` is the registry of everything an administrator can manage: it drives the admin forms, the validation, the per-module
permissions and what the public website may read. Items are stored in `content_items` (kind, slug, title, data, status, sort_order):
- `status` is the publishing workflow: a draft is private (never returned by the public API), a published item is live;
- `sort_order` is the display order;
- fields of type `image` / `video` hold the id of a media-library item (never a URL or a file), resolved to a URL only on the way out.
"""

from __future__ import annotations

import datetime
import re
import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import ApiError
from app.models import ContentItem, MediaAsset, User
from app.services import media_service

_LINK = re.compile(r"^https?://[^\s]+$")
_LINK_FIELDS = ("link", "cta_link", "apply_link", "cta_primary_link", "cta_secondary_link")


def F(name, label, kind="text", required=False, max_len=300, options=None, help="", options_from=None, default=None):
    return {"name": name, "label": label, "type": kind, "required": required, "max": max_len, "options": options or [], "help": help, "options_from": options_from, "default": default}


DIVISIONS = [{"value": v, "label": l} for v, l in (("software", "Software & Apps"), ("ai", "AI & Automation"), ("growth", "Digital Growth"), ("engineering", "CAD & Engineering"))]
SECTION_KEYS = [{"value": v, "label": l} for v, l in (
    ("marquee", "Scrolling strip under the hero"), ("whoweare", "Who We Are"), ("services", "Services overview"), ("outcomes", "Why Choose Us"), ("clients", "Our Clients"), ("testimonials", "Client & student testimonials"),
    ("ai", "AI spotlight"), ("process", "How we work"),
    ("faq", "FAQ"), ("contact", "Contact call-to-action"))]
PAGES = [{"value": v, "label": l} for v, l in (("home", "Home"), ("about", "About"), ("services", "Services"), ("industries", "Industries"), ("insights", "Insights"), ("network", "Our Network"), ("team", "Our Team"),
                                              ("work", "Work"), ("career", "Career"), ("contact", "Contact"))]
NETWORK_CATEGORIES = [{"value": v, "label": l} for v, l in (("authorized", "Authorized Partners"), ("technology", "Technology Partners"), ("associated", "Associated Companies"), ("collaboration", "Strategic Collaborations"))]
TEAM_GROUPS = [{"value": v, "label": l} for v, l in (("leadership", "Founder & Leadership"), ("management", "Management Team"), ("heads", "Department Heads"), ("software", "Software Development Team"),
                                                    ("ai", "AI & Automation Team"), ("marketing", "Digital Marketing Team"), ("cad", "CAD Engineering Team"))]
ARTICLE_CATEGORIES = [{"value": v, "label": l} for v, l in (("ai", "Artificial Intelligence"), ("software", "Software Development"), ("transformation", "Digital Transformation"),
                                                          ("news", "Technology News & Updates"), ("blog", "Technology Blog"))]
NAV_PLACES = [{"value": "header", "label": "Header menu"}, {"value": "footer_divisions", "label": "Footer: Divisions column"}, {"value": "footer_company", "label": "Footer: Company column"}]

SOCIAL_PLATFORMS = [{"value": v, "label": l} for v, l in (("instagram", "Instagram"), ("facebook", "Facebook"), ("linkedin", "LinkedIn"), ("youtube", "YouTube"), ("x", "X (Twitter)"))]

KINDS: dict[str, dict] = {
    # ---- Homepage -------------------------------------------------------------------------------------------------------------------
    "hero": {
        "label": "Home page hero", "group": "Homepage", "module": "content", "single": True, "slug": "home", "preview_path": "/",
        "help": "Leave a field empty to keep the website's built-in text. The animated rotating word is not editable here.",
        "fields": [
            F("eyebrow", "Small label above the title", max_len=90), F("headline_1", "Headline line 1", max_len=80), F("headline_2", "Headline line 2 (highlighted)", max_len=80),
            F("headline_3", "Headline line 3", max_len=80), F("lead", "Supporting paragraph", "textarea", max_len=400),
            F("cta_primary_label", "Primary button text", max_len=40), F("cta_primary_link", "Primary button link", max_len=200, help="A page like /contact or a full https:// URL"),
            F("cta_secondary_label", "Secondary button text", max_len=40), F("cta_secondary_link", "Secondary button link", max_len=200),
        ],
    },
    "section": {
        "label": "Home page sections", "group": "Homepage", "module": "content", "single": False, "slug_field": "key", "preview_path": "/",
        "help": "Control the order of the home page sections and hide the ones you do not want. A section you do not list keeps its normal place and stays visible. "
                "Publish an item to apply it; untick \"Show this section\" to hide the section.",
        "title_label": "Name (for you)",
        "fields": [
            F("key", "Section", "select", True, options=SECTION_KEYS), F("enabled", "Show this section", "bool", default=True),
        ],
    },
    "faq": {
        "label": "FAQ entries", "group": "Homepage", "module": "content", "single": False, "preview_path": "/",
        "help": "Shown in the FAQ accordions. If a group has no published entries the website's built-in questions are used.",
        "fields": [
            F("group", "Where it appears", "select", True, options=[{"value": "home", "label": "Home page & Services page"}]),
            F("answer", "Answer", "textarea", True, max_len=1500),
        ],
        "title_label": "Question",
    },
    # ---- Services -------------------------------------------------------------------------------------------------------------------
    "service_category": {
        "label": "Service categories", "group": "Services", "module": "services", "single": False, "preview_path": "/services",
        "help": "The groups your services are listed under (for example Software & IT Services, AI & Automation, Digital Marketing, Civil CAD, Mechanical CAD). Add, rename or remove them freely.",
        "title_label": "Category name",
        "fields": [F("description", "Short description", "textarea", max_len=400), F("icon", "Icon / image", "image")],
    },
    "service": {
        "label": "Services", "group": "Services", "module": "services", "single": False, "preview_path": "/services",
        "help": "Each published service appears on the Services page under its category and gets its own detail page.",
        "title_label": "Service name",
        "fields": [
            F("category", "Category", "select", True, options_from="service_category"),
            F("summary", "Short summary (card text)", "textarea", True, max_len=300),
            F("description", "Full description", "textarea", max_len=4000, help="Plain paragraphs. A blank line starts a new paragraph."),
            F("details", "Key points", "textarea", max_len=2000, help="One point per line."),
            F("image", "Main image", "image"), F("icon", "Icon", "image"),
            F("cta_label", "Button text", max_len=40), F("cta_link", "Button link", max_len=300, help="A page like /contact?type=project or a full https:// URL"),
        ],
    },
    # ---- About ----------------------------------------------------------------------------------------------------------------------
    "about_block": {
        "label": "About Us content", "group": "About", "module": "content", "single": False, "preview_path": "/about",
        "help": "Company introduction, vision, mission, values, achievements, team members and images for the About page. "
                "When at least one block is published, the About page shows these in place of its built-in company text.",
        "title_label": "Heading / name",
        "fields": [
            F("block", "Type", "select", True, options=[{"value": v, "label": l} for v, l in (("intro", "Company introduction"), ("vision", "Vision"), ("mission", "Mission"),
                                                                                              ("value", "Company value"), ("achievement", "Achievement"), ("team", "Team member"), ("image", "Image"))]),
            F("text", "Text", "textarea", max_len=2000), F("role", "Role / figure (team members, achievements)", max_len=120), F("image", "Image", "image"),
        ],
    },
    # ---- Industries -----------------------------------------------------------------------------------------------------------------
    "industry": {
        "label": "Industries", "group": "Industries", "module": "content", "single": False, "preview_path": "/industries",
        "help": "The industries LAX360 Ventures builds technology for. When at least one is published, the Industries page lists these in place of its built-in industries.",
        "title_label": "Industry name",
        "fields": [
            F("summary", "Short description (card text)", "textarea", True, max_len=300),
            F("description", "Longer description", "textarea", max_len=2000, help="Plain paragraphs. A blank line starts a new paragraph."),
            F("solutions", "Technology solutions we provide", "textarea", max_len=2000, help="One solution per line."),
            F("image", "Image", "image"),
        ],
    },
    # ---- Our Network ----------------------------------------------------------------------------------------------------------------
    "network_partner": {
        "label": "Network partners & companies", "group": "Network", "module": "content", "single": False, "preview_path": "/our-network",
        "help": "Companies LAX360 Ventures works with. Pick the category that matches the real relationship: only mark someone an Authorized Partner when that authorization is confirmed. "
                "Published entries appear on the Our Network page.",
        "title_label": "Company name",
        "fields": [
            F("category", "Relationship", "select", True, options=NETWORK_CATEGORIES),
            F("location", "Location (optional)", max_len=80, help="e.g. Salem"),
            F("description", "Description", "textarea", True, max_len=600),
            F("website_link", "Official website (optional)", max_len=300, help="The full https:// address of the company's own website"),
            F("logo", "Logo (optional)", "image"),
        ],
    },
    # ---- Our Team -------------------------------------------------------------------------------------------------------------------
    "team_member": {
        "label": "Team members", "group": "Team", "module": "content", "single": False, "preview_path": "/our-team",
        "help": "The people behind LAX360 Ventures. Choose the team each person belongs to; use the order number to arrange people within a team. Publish to show a profile, unpublish to hide it.",
        "title_label": "Name",
        "fields": [
            F("group", "Team", "select", True, options=TEAM_GROUPS),
            F("designation", "Designation", "text", True, max_len=120),
            F("bio", "Short biography", "textarea", max_len=800),
            F("photo", "Photo", "image"),
            F("linkedin_link", "LinkedIn profile (optional)", max_len=300, help="The person's full LinkedIn address, e.g. https://www.linkedin.com/in/name"),
        ],
    },
    # ---- Insights -------------------------------------------------------------------------------------------------------------------
    "article": {
        "label": "Insights articles", "group": "Insights", "module": "content", "single": False, "preview_path": "/insights",
        "help": "Blog posts, AI updates, software and digital transformation insights and technology news. Publish to list an article on the Insights page; "
                "unpublish to take it down. When at least one article is published, the Insights page shows these in place of the built-in starter articles.",
        "title_label": "Article title",
        "fields": [
            F("category", "Category", "select", True, options=ARTICLE_CATEGORIES),
            F("published_on", "Publication date", "text", True, max_len=10, help="YYYY-MM-DD, e.g. 2026-11-03"),
            F("excerpt", "Short summary", "textarea", True, max_len=300),
            F("body", "Article text", "textarea", True, max_len=20000, help="Plain paragraphs; a blank line starts a new paragraph. A line starting with \"## \" becomes a sub-heading."),
            F("image", "Cover image", "image"),
            F("author", "Author", max_len=80, help="Defaults to the LAX360 team."),
        ],
    },
    # ---- Clients --------------------------------------------------------------------------------------------------------------------
    "client": {
        "label": "Our clients", "group": "Clients", "module": "content", "single": False, "preview_path": "/",
        "help": "Genuine clients only, with their permission to be shown. Published clients appear in the \"Our Clients\" strip on the home page, in this order (use the order number to arrange them). "
                "Entries marked as samples are placeholders: edit or delete them once you have real clients. With none published, the section is hidden.",
        "title_label": "Company name",
        "fields": [
            F("logo", "Logo", "image", help="Use the client's real logo. It is shown at its original proportions."),
            F("website_link", "Website (optional)", max_len=300, help="The client's own website, full https:// address"),
            F("is_sample", "Sample entry (placeholder, not a real client)", "bool", default=False, help="Tick only for placeholders. Replace a sample by editing it (upload a real logo, rename it, untick this) or delete it."),
            F("logo_url", "Built-in sample logo (leave empty for real clients)", max_len=120, help="Path of artwork shipped with the website, used only when no logo is uploaded above."),
        ],
    },
    # ---- Testimonials ---------------------------------------------------------------------------------------------------------------
    "testimonial": {
        "label": "Client & student testimonials", "group": "Testimonials", "module": "content", "single": False, "preview_path": "/",
        "help": "Real feedback only, shown with the person's permission. Published testimonials appear one at a time in \"What Our Clients & Students Say\" on the home page, in this order "
                "(use the order number to arrange them). Entries marked as samples are fictional placeholders shown with a \"Sample\" label: edit or delete them once you have real feedback. "
                "With none published, the section is hidden.",
        "title_label": "Person's name",
        "fields": [
            F("person_type", "Client or student", "select", True, options=[{"value": "client", "label": "Client"}, {"value": "student", "label": "Student"}]),
            F("role", "Designation / role", "text", True, max_len=120, help="e.g. Operations Manager, or B.E. student"),
            F("organization", "Company or institution", max_len=160),
            F("quote", "Testimonial", "textarea", True, max_len=700),
            F("photo", "Profile photo (optional)", "image", help="A square photo works best. Without one, the person's initials are shown."),
            F("is_sample", "Sample (fictional placeholder, not real feedback)", "bool", default=False, help="Untick once you replace the content with real feedback."),
        ],
    },
    # ---- Portfolio ------------------------------------------------------------------------------------------------------------------
    "project": {
        "label": "Projects & solutions", "group": "Portfolio", "module": "content", "single": False, "preview_path": "/work",
        "help": "Publish only client-approved work with verified details. When at least one project is published, the Work page shows projects instead of the illustrative concepts.",
        "fields": [
            F("division", "Division", "select", True, options=DIVISIONS),
            F("category", "Category / tags", max_len=120),
            F("client_type", "Client type", max_len=120, help="e.g. 'Manufacturing company' (do not name a client without permission)"),
            F("summary", "Summary", "textarea", True, max_len=600),
            F("image", "Project image", "image"), F("video", "Project video", "video"),
            F("link", "Case study link (optional)", max_len=300),
        ],
        "title_label": "Project title",
    },
    # ---- Careers --------------------------------------------------------------------------------------------------------------------
    "job": {
        "label": "Job openings", "group": "Careers", "module": "careers", "single": False, "preview_path": "/career", "public_filter": ("open", True),
        "help": "Publish an opening to list it on the Career page. Untick \"Open for applications\" to close it (it disappears from the website but stays here).",
        "title_label": "Job title",
        "fields": [
            F("department", "Department / area", max_len=120), F("location", "Location", max_len=120),
            F("employment_type", "Type", "select", options=[{"value": v, "label": l} for v, l in (("full-time", "Full-time"), ("part-time", "Part-time"), ("internship", "Internship"), ("contract", "Contract"))]),
            F("description", "Job description", "textarea", True, max_len=4000),
            F("requirements", "Requirements", "textarea", max_len=3000, help="One requirement per line."),
            F("eligibility", "Eligibility / qualifications", "textarea", max_len=1500),
            F("apply_link", "How to apply (link or mailto:)", max_len=300, help="Leave empty to send applicants to the contact form."),
            F("open", "Open for applications", "bool", default=True),
        ],
    },
    # ---- Navigation & SEO -----------------------------------------------------------------------------------------------------------
    "nav_item": {
        "label": "Navigation menu", "group": "Navigation & SEO", "module": "navigation", "single": False, "preview_path": "/",
        "help": "When at least one item is published for a menu, that menu uses these items (label, link and order) instead of the built-in ones.",
        "title_label": "Menu label",
        "fields": [F("place", "Menu", "select", True, options=NAV_PLACES), F("link", "Link", max_len=300, required=True, help="A page like /about or a full https:// URL"), F("enabled", "Show in the menu", "bool", default=True)],
    },
    "social_link": {
        "label": "Social media links", "group": "Navigation & SEO", "module": "navigation", "single": False, "preview_path": "/",
        "help": "The social icons in the top contact bar and the animated social section. When at least one is published, these replace the built-in links; drag the order with the order number, and switch a link off with “Show”.",
        "title_label": "Name (e.g. Instagram)",
        "fields": [F("platform", "Platform", "select", True, options=SOCIAL_PLATFORMS), F("url", "Profile URL", "text", True, max_len=300, help="The full https:// address of the official profile"), F("enabled", "Show", "bool", default=True)],
    },
    "seo_page": {
        "label": "Page titles & SEO", "group": "Navigation & SEO", "module": "navigation", "single": False, "slug_field": "page", "preview_path": "/",
        "help": "The browser/search title and description for a page. Leave a page unlisted to keep its built-in text.",
        "title_label": "Page title (search results & browser tab)",
        "fields": [F("page", "Page", "select", True, options=PAGES), F("meta_description", "Meta description", "textarea", max_len=320), F("image", "Social sharing image", "image")],
    },
}
GROUP_ORDER = ["Homepage", "Services", "Industries", "Insights", "Network", "Team", "Clients", "Testimonials", "About", "Portfolio", "Careers", "Navigation & SEO"]


def kinds_for_ui(db: Session, user=None) -> list[dict]:
    from app.core.permissions import has_permission

    out = []
    dynamic: dict[str, list[dict]] = {}
    for kind, spec in KINDS.items():
        if user is not None and not has_permission(user, spec["module"]):
            continue
        fields = []
        for f in spec["fields"]:
            f = dict(f)
            if f.get("options_from"):
                src = f["options_from"]
                if src not in dynamic:
                    dynamic[src] = [{"value": i.slug, "label": i.title} for i in list_items(db, src)]
                f["options"] = dynamic[src]
            fields.append(f)
        out.append({"kind": kind, **spec, "fields": fields})
    return out


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:80] or "item"


def _options(db: Session, f: dict) -> set[str]:
    if f.get("options_from"):
        return {i.slug for i in list_items(db, f["options_from"])}
    return {o["value"] for o in f["options"]}


def _validate(db: Session, kind: str, title: str, data: dict) -> tuple[str, dict]:
    spec = KINDS[kind]
    errors: dict[str, str] = {}
    title = " ".join((title or "").split())
    if not spec["single"] and not title:
        errors["title"] = f"{spec.get('title_label', 'Title')} is required."
    if len(title) > 200:
        errors["title"] = "Keep it under 200 characters."
    allowed = {f["name"]: f for f in spec["fields"]}
    clean: dict = {}
    for name in data:
        if name not in allowed:
            errors[name] = "Unknown field."
    for name, f in allowed.items():
        value = data.get(name, f.get("default"))
        kind_t = f["type"]
        if kind_t == "bool":
            if value is None:
                value = bool(f.get("default"))
            if not isinstance(value, bool):
                errors[name] = "Must be on or off."
            else:
                clean[name] = value
            continue
        if value is None:
            value = ""
        if not isinstance(value, str):
            errors[name] = "Must be text."
            continue
        value = value.strip()
        if f["required"] and not value:
            errors[name] = f"{f['label']} is required."
        elif len(value) > f["max"]:
            errors[name] = f"Keep it under {f['max']} characters."
        elif kind_t in ("image", "video") and value:
            try:
                asset = db.get(MediaAsset, uuid.UUID(value))
            except ValueError:
                asset = None
            if asset is None or asset.kind != kind_t:
                errors[name] = f"Choose {'an image' if kind_t == 'image' else 'a video'} from the media library."
        elif kind_t == "select" and value and value not in _options(db, f):
            errors[name] = "Choose one of the listed options."
        elif name == "logo_url":
            if value and not re.match(r"^/assets/clients/[A-Za-z0-9._-]+\.(svg|png|webp)$", value):
                errors[name] = "Leave this empty, or use a built-in artwork path such as /assets/clients/sample-1.svg"
        elif name == "website_link":
            if value and not re.match(r"^https?://[^\s]{3,300}$", value):
                errors[name] = "Enter the company's full website address starting with https://"
        elif name == "linkedin_link":
            if value and not re.match(r"^https://([a-z0-9-]+\.)?linkedin\.com/[^\s]+$", value, re.I):
                errors[name] = "Enter the full LinkedIn address starting with https://www.linkedin.com/"
        elif name == "published_on":
            try:
                if value:
                    datetime.date.fromisoformat(value)
            except ValueError:
                errors[name] = "Use the date format YYYY-MM-DD."
        elif name == "url":
            if value and not re.match(r"^https://[^\s]{3,300}$", value):
                errors[name] = "Enter the full profile address starting with https://"
        elif name in _LINK_FIELDS or name.endswith("_link"):
            if value and not ((value.startswith("/") and not value.startswith("//")) or _LINK.match(value) or (name == "apply_link" and re.match(r"^mailto:[^\s@]+@[^\s@]+$", value))):
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


def _media_ids(kind: str, data: dict) -> set[uuid.UUID]:
    ids = set()
    for f in KINDS[kind]["fields"]:
        if f["type"] in ("image", "video") and data.get(f["name"]):
            ids.add(uuid.UUID(data[f["name"]]))
    return ids


def _publish_media(db: Session, kind: str, data: dict, status: str) -> list[uuid.UUID]:
    """Published content can only show public files: the files it references are switched to public (and returned so the caller can audit it)."""
    return media_service.make_public(db, _media_ids(kind, data)) if status == "published" else []


def _slug_for(db: Session, spec: dict, title: str, clean: dict, current: ContentItem | None, kind: str) -> str:
    if spec["single"]:
        return spec["slug"]
    if spec.get("slug_field"):
        slug = clean.get(spec["slug_field"]) or _slugify(title)
        taken = db.scalar(select(ContentItem.id).where(ContentItem.kind == kind, ContentItem.slug == slug, ContentItem.id != (current.id if current else uuid.uuid4())))
        if taken:
            raise ApiError(409, "already_exists", "An item for this already exists: edit it instead.", fields={spec["slug_field"]: "Already in use."})
        return slug
    return _slugify(title)


def create(db: Session, user: User, kind: str, *, title: str, data: dict, status: str, sort_order: int) -> ContentItem:
    spec = get_kind(kind)
    title, clean = _validate(db, kind, title, data)
    slug = _slug_for(db, spec, title, clean, None, kind)
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
    _publish_media(db, kind, clean, status)
    return item


def get_item(db: Session, item_id: uuid.UUID) -> ContentItem:
    item = db.get(ContentItem, item_id)
    if item is None:
        raise ApiError(404, "not_found", "Content item not found.")
    return item


def update(db: Session, user: User, item: ContentItem, *, title: str | None, data: dict | None, status: str | None, sort_order: int | None) -> list[str]:
    changed = []
    if title is not None or data is not None:
        new_title, clean = _validate(db, item.kind, title if title is not None else item.title, data if data is not None else item.data)
        if new_title != item.title:
            item.title = new_title
            changed.append("title")
        if clean != item.data:
            item.data = clean
            changed.append("data")
            spec = KINDS[item.kind]
            if spec.get("slug_field") and clean.get(spec["slug_field"]) and clean[spec["slug_field"]] != item.slug:
                item.slug = _slug_for(db, spec, new_title, clean, item, item.kind)
    if status is not None and status != item.status:
        item.status = status
        changed.append("status")
    if sort_order is not None and sort_order != item.sort_order:
        item.sort_order = sort_order
        changed.append("sort_order")
    item.updated_by = user.id
    _publish_media(db, item.kind, item.data or {}, item.status)
    return changed


def reorder(db: Session, kind: str, ids: list[uuid.UUID]) -> None:
    items = {i.id: i for i in list_items(db, kind)}
    if sorted(map(str, ids)) != sorted(map(str, items)):
        raise ApiError(409, "stale_list", "The list changed since you loaded it. Reload the page and try again.")
    for position, item_id in enumerate(ids, start=1):
        items[item_id].sort_order = position * 10


def _resolve(db: Session, settings: Settings, kind: str, data: dict, preview: bool = False) -> dict:
    """Replace media ids with the URL a browser can load (None when the file is gone or not public, so a deleted file never breaks a page)."""
    out = dict(data or {})
    for f in KINDS[kind]["fields"]:
        if f["type"] in ("image", "video") and out.get(f["name"]):
            try:
                asset = db.get(MediaAsset, uuid.UUID(out[f["name"]]))
            except ValueError:
                asset = None
            if asset is None:
                out[f["name"]] = None
            elif asset.is_public:
                out[f["name"]] = media_service.url_of(settings, asset)
            elif preview:  # an admin previewing a draft sees pictures that are not public yet (they become public when the item is published)
                out[f["name"]] = media_service.url_of(settings, asset) if asset.storage == "supabase" else f"/api/admin/media/{asset.id}/file"
            else:
                out[f["name"]] = None
            if out[f["name"]] is None:
                del out[f["name"]]
            elif asset.alt_text:
                out[f["name"] + "_alt"] = asset.alt_text
    return out


def public_items(db: Session, settings: Settings, kind: str, *, include_drafts: bool = False) -> list[dict]:
    if kind not in KINDS:
        return []
    flt = KINDS[kind].get("public_filter")
    out = []
    for i in list_items(db, kind, status=None if include_drafts else "published"):
        if flt and not include_drafts and (i.data or {}).get(flt[0]) != flt[1]:
            continue  # e.g. a closed job opening
        out.append({"id": str(i.id), "slug": i.slug, "title": i.title, "data": _resolve(db, settings, kind, i.data, preview=include_drafts), "sort_order": i.sort_order,
                    **({"status": i.status} if include_drafts else {})})
    return out


def public_bundle(db: Session, settings: Settings) -> dict[str, list[dict]]:
    """Every kind's published items in one response (the website fetches this once instead of once per section)."""
    return {kind: public_items(db, settings, kind) for kind in KINDS}


def counts(db: Session) -> dict[str, dict[str, int]]:
    rows = db.execute(select(ContentItem.kind, ContentItem.status, func.count()).group_by(ContentItem.kind, ContentItem.status)).all()
    out: dict[str, dict[str, int]] = {k: {"draft": 0, "published": 0} for k in KINDS}
    for kind, status, n in rows:
        if kind in out:
            out[kind][status] = n
    return out
