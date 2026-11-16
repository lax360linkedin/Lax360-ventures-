"""The Pages module: every picture of the website as a tree  Pages > Page > Section > pictures, built from what the website really has (its page list, the home and about
page section registries, and the content that carries pictures), not from a fixed sample list.

There is no second copy of anything here. A "slot" is an image field of an existing content item (or one of the image settings such as the logo); this module only LISTS them grouped by page
and section and CHANGES one slot at a time through the same validated update paths the rest of the admin panel uses (so files stay in the media library's permanent storage, referenced by id,
and the public site reads the change at once). Each administrator sees only what their permissions allow.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.core.permissions import has_permission
from app.models import MediaAsset, User
from app.services import content_service as cs, settings_service

# (page key, label, public path)
PAGES = [
    ("home", "Home page", "/"), ("about", "About", "/about"), ("services", "Services", "/services"), ("industries", "Industries", "/industries"), ("products", "Products", "/products"),
    ("websites", "Websites", "/websites"), ("work", "Work", "/work"), ("network", "Our Network", "/our-network"), ("team", "Our Team", "/our-team"),
    ("insights", "Insights", "/insights"), ("career", "Careers", "/career"), ("contact", "Contact", "/contact"), ("seo", "Search & sharing", "/"), ("site", "Whole website", "/"),
]
PAGE_OF = {
    "carousel_image": "home", "client": "home", "testimonial": "home", "welcome_card": "home", "about_block": "about", "service_category": "services", "service": "services",
    "industry": "industries", "product": "products", "product_module": "products", "website": "websites", "project": "work", "network_partner": "network", "team_member": "team",
    "team_department": "team", "team_gallery": "team", "team_page": "team", "article": "insights", "career_page": "career", "seo_page": "seo",
}
BUILTIN = {"team_member": {"photo": "photo_path"}, "client": {"logo": "logo_url"}, "carousel_image": {"image": "image_path"}}  # artwork shipped with the website, shown until a picture is uploaded
SITE_IMAGE_KEYS = ("site_logo", "site_favicon", "default_og_image")


def _image_fields(kind: str) -> list[dict]:
    return [f for f in cs.KINDS[kind]["fields"] if f["type"] == "image"]


def _asset_ids(values) -> set[uuid.UUID]:
    out = set()
    for v in values:
        try:
            out.add(uuid.UUID(str(v)))
        except (ValueError, TypeError):
            pass
    return out


ADMIN_ROUTE = {"carousel_image": "/company-admin/carousel", "client": "/company-admin/clients", "testimonial": "/company-admin/testimonials", "welcome_card": "/company-admin/welcome",
               "team_member": "/company-admin/team", "team_department": "/company-admin/departments", "team_gallery": "/company-admin/team", "network_partner": "/company-admin/network",
               "product": "/company-admin/products", "product_module": "/company-admin/products", "website": "/company-admin/websites"}


def _opts(kind: str, field: str) -> dict[str, str]:
    return {o["value"]: o["label"] for f in cs.KINDS[kind]["fields"] if f["name"] == field for o in f["options"]}


def listing(db: Session, user: User) -> dict:
    """{ pages: [{ key, label, path, count, sections: [{ key, label, note, manage, count, items: [{ id, kind, title, subtitle, status, slots: [{ field, label, asset_id, builtin, missing }] }] }] }] }
    for what this user may manage. Pages with nothing to manage are still listed (their sections say so), so the tree matches the website."""
    allowed = {k for k in PAGE_OF if has_permission(user, cs.KINDS[k]["module"]) and _image_fields(k)}
    items = {k: cs.list_items(db, k) for k in allowed}
    site_keys = [k for k in SITE_IMAGE_KEYS if has_permission(user, "settings")]
    if not allowed and not site_keys:
        return {"pages": []}  # nothing here for this account (the route answers 403)
    stored = settings_service.get_all(db) if site_keys else {}
    ids = _asset_ids([(i.data or {}).get(f["name"]) for k, rows in items.items() for i in rows for f in _image_fields(k)] + [stored.get(k) for k in site_keys])
    present = {a.id for a in db.scalars(select(MediaAsset).where(MediaAsset.id.in_(ids)))} if ids else set()

    def slot(label: str, field: str, raw, builtin=None) -> dict:
        aid = str(raw) if raw else None
        missing = bool(aid) and not (_asset_ids([aid]) & present)
        return {"field": field, "label": label, "asset_id": None if missing else aid, "missing": missing, "builtin": builtin or None}

    def entry(kind: str, item, subtitle: str = "") -> dict:
        spec = cs.KINDS[kind]
        d = item.data or {}
        return {"id": str(item.id), "kind": kind, "title": spec["label"] if spec["single"] else item.title, "subtitle": subtitle, "status": item.status,
                "slots": [slot(f["label"], f["name"], d.get(f["name"]), d.get(BUILTIN.get(kind, {}).get(f["name"], ""))) for f in _image_fields(kind)]}

    def section(key: str, label: str, entries: list[dict], *, note: str = "", manage: str | None = None, kind: str | None = None) -> dict:
        slots = [x for e in entries for x in e["slots"]]
        return {"key": key, "label": label, "note": note, "manage": manage or (ADMIN_ROUTE.get(kind) if kind else None) or (f"/company-admin/content?kind={kind}" if kind else None),
                "items": entries, "count": len(entries), "filled": sum(1 for x in slots if x["asset_id"] or x["builtin"]), "slots": len(slots)}

    def by(kind: str, field: str, other: str = "Other", labels: dict[str, str] | None = None, order: list[str] | None = None) -> list[dict]:
        """One section per value of a select field (labels from the field's own options), in the field's order; items outside every option go to `other`."""
        names = labels if labels is not None else _opts(kind, field)
        groups: dict[str, list] = {k: [] for k in (order or names)}
        for i in items.get(kind, []):
            v = (i.data or {}).get(field)
            groups.setdefault(v if v in names else "_other", []).append(entry(kind, i))
        return [section(f"{kind}-{k}", names.get(k, other), v, kind=kind) for k, v in groups.items() if v]

    def text_only(label: str, key: str, where: str, link: str) -> dict:
        return section(key, label, [], note=f"No pictures to manage here: {where}", manage=link)

    pages: dict[str, list[dict]] = {key: [] for key, _, _ in PAGES}

    # ---- Home: the header, the welcome sections and the home sections the website really has (cs.SECTION_KEYS), in their default order
    home_labels = {o["value"]: o["label"] for o in cs.SECTION_KEYS}
    pages["home"].append(section("header", "Header section", [], note="The header's background videos are managed under Homepage videos; its text under Website content > Home page hero.", manage="/company-admin/homepage-videos"))
    if "welcome_card" in allowed:
        pages["home"].append(section("welcome", "Welcome sections", [entry("welcome_card", i, "Welcome section") for i in items["welcome_card"]], kind="welcome_card"))
    home_kinds = {"clients": ("client", "Our Clients"), "testimonials": ("testimonial", "Testimonials"), "gallery": ("carousel_image", "Image carousel")}
    for key, label in home_labels.items():
        if key in home_kinds:
            kind, name = home_kinds[key]
            if kind in allowed:
                pages["home"].append(section(key, name, [entry(kind, i) for i in items[kind]], kind=kind))
        elif key == "services":
            pages["home"].append(section(key, "Services preview", [], note="This preview shows the service pictures managed under Pages > Services.", manage="/company-admin/pages/services"))
        else:
            pages["home"].append(text_only(label, key, "this section is text only.", "/company-admin/content?kind=section"))

    # ---- About: the About us pictures, then the page's own sections (cs.ABOUT_SECTIONS)
    if "about_block" in allowed:
        pages["about"].append(section("about-us", "About Us", [entry("about_block", i, _opts("about_block", "block").get((i.data or {}).get("block"), "")) for i in items["about_block"]], kind="about_block"))
    for o in cs.ABOUT_SECTIONS:
        pages["about"].append(text_only(o["label"], f"about-{o['value']}", "this section is text only.", "/company-admin/content?kind=about_section"))

    # ---- Services: one section per service category (the real categories), holding the category's icon and its services' pictures
    if "service" in allowed or "service_category" in allowed:
        cats = items.get("service_category", [])
        known = set()
        for c in cats:
            known.add(c.slug)
            rows = ([entry("service_category", c, "Category icon")] if "service_category" in allowed else []) + [entry("service", i, "Service") for i in items.get("service", []) if (i.data or {}).get("category") == c.slug]
            pages["services"].append(section(f"cat-{c.slug}", c.title, rows, kind="service"))
        loose = [entry("service", i, "Service") for i in items.get("service", []) if (i.data or {}).get("category") not in known]
        if loose:
            pages["services"].append(section("cat-other", "Other services", loose, kind="service"))
    # ---- Industries, Products, Websites, Work, Network, Insights: one section per category of the content itself
    if "industry" in allowed:
        pages["industries"] += by("industry", "group")
    if "product" in allowed:
        pages["products"] += by("product", "category")
    if "product_module" in allowed and items.get("product_module"):
        titles = {p.slug: p.title for p in items.get("product", [])}
        pages["products"].append(section("modules", "Product modules", [entry("product_module", i, titles.get((i.data or {}).get("product"), "")) for i in items["product_module"]], kind="product_module"))
    if "website" in allowed:
        pages["websites"] += by("website", "entry_kind")
    if "project" in allowed:
        pages["work"] += by("project", "division")
    if "network_partner" in allowed:
        extra = {c.slug: c.title for c in cs.list_items(db, "network_category")}
        pages["network"] += by("network_partner", "category", labels={**_opts("network_partner", "category"), **extra})
    if "article" in allowed:
        pages["insights"] += by("article", "category")
    # ---- Our Team: the page header, leadership, employees, departments and the people & culture pictures
    if "team_page" in allowed:
        pages["team"].append(section("header", "Page header", [entry("team_page", i) for i in items["team_page"]], kind="team_page"))
    if "team_member" in allowed:
        lead = [i for i in items["team_member"] if (i.data or {}).get("role_level") in cs.TEAM_LEADERSHIP]
        rest = [i for i in items["team_member"] if i not in lead]
        pages["team"].append(section("leadership", "Founder & leadership", [entry("team_member", i, "Founder / leadership") for i in lead], kind="team_member"))
        pages["team"].append(section("employees", "Employees", [entry("team_member", i, "Employee") for i in rest], kind="team_member"))
    if "team_department" in allowed:
        pages["team"].append(section("departments", "Departments", [entry("team_department", i) for i in items["team_department"]], kind="team_department"))
    if "team_gallery" in allowed:
        pages["team"].append(section("culture", "People & culture", [entry("team_gallery", i, _opts("team_gallery", "category").get((i.data or {}).get("category"), "")) for i in items["team_gallery"]], kind="team_gallery"))
    # ---- Careers, Contact, Search & sharing, Whole website
    if "career_page" in allowed:
        pages["career"].append(section("header", "Page header", [entry("career_page", i) for i in items["career_page"]], kind="career_page"))
    pages["contact"].append(text_only("Contact page", "contact", "the page has no pictures (the branches' details are managed under Website settings).", "/company-admin/content?kind=contact_page"))
    if "seo_page" in allowed:
        names = {o["value"]: o["label"] for o in cs.PAGES}
        pages["seo"].append(section("sharing", "Sharing image of each page", [entry("seo_page", i, names.get((i.data or {}).get("page"), "")) for i in items["seo_page"]], kind="seo_page"))
    if site_keys:
        pages["site"].append(section("brand", "Logo and icons", [{"id": "site", "kind": "site", "title": "Website", "subtitle": "", "status": "published",
                                                                  "slots": [slot(settings_service.SPEC[k]["label"], k, stored.get(k)) for k in site_keys]}], manage="/company-admin/settings"))

    empty_of = {"services": ("service", "Services"), "industries": ("industry", "Industries"), "products": ("product", "Products"), "websites": ("website", "Websites"), "work": ("project", "Projects"),
                "network": ("network_partner", "Companies & partners"), "insights": ("article", "Articles"), "team": ("team_member", "Team")}
    out = []
    for key, label, path in PAGES:
        sections = [s for s in pages[key]]
        if not sections and key in empty_of:  # every page of the website is listed, even when nothing on it carries a picture yet
            kind, name = empty_of[key]
            sections = [section(f"{kind}-none", name, [], note=f"No {name.lower()} yet: add them and their pictures appear here.", kind=kind)]
        if sections:
            out.append({"key": key, "label": label, "path": path, "sections": sections, "count": sum(s["count"] for s in sections), "filled": sum(s["filled"] for s in sections), "slots": sum(s["slots"] for s in sections)})
    return {"pages": out}


def _check_asset(db: Session, asset_id: uuid.UUID) -> None:
    asset = db.get(MediaAsset, asset_id)
    if asset is None or asset.kind != "image":
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields={"asset_id": "Choose an uploaded picture."})


def set_slot(db: Session, user: User, *, item_id: uuid.UUID | None, setting: str | None, field: str, asset_id: uuid.UUID | None) -> dict:
    """Put a picture into one slot (asset_id) or take it out (None). Returns what changed, for the audit log."""
    if asset_id is not None:
        _check_asset(db, asset_id)
    if setting is not None:
        if setting != field or field not in SITE_IMAGE_KEYS or not has_permission(user, "settings"):
            raise ApiError(403, "forbidden", "You do not have permission for this action.")
        settings_service.update(db, user, {field: str(asset_id) if asset_id else ""}, allowed=settings_service.SITE_KEYS)
        return {"setting": field}
    if item_id is None:
        raise ApiError(422, "validation_error", "Choose what to change.")
    item = cs.get_item(db, item_id)
    spec = cs.get_kind(item.kind)
    if item.kind not in PAGE_OF or not has_permission(user, spec["module"]):
        raise ApiError(403, "forbidden", "You do not have permission for this action.")
    if field not in {f["name"] for f in _image_fields(item.kind)}:
        raise ApiError(422, "validation_error", "That is not a picture field of this item.")
    data = dict(item.data or {})
    if asset_id is not None:
        data[field] = str(asset_id)
    else:
        data.pop(field, None)
        data.pop(BUILTIN.get(item.kind, {}).get(field, ""), None)  # a built-in sample picture is removed too, otherwise it would simply reappear
    cs.update(db, user, item, title=None, data=data, status=None, sort_order=None)
    return {"kind": item.kind, "field": field, "item": str(item.id)}
