"""Move the website's built-in (hard-coded) content into the database so the admin panel shows, and manages, exactly what the public site displays.

`python -m app.cli migrate-content [--dry-run]`:
  1. BACKUP: every content item and website setting is written to backend/backups/content-<timestamp>.json before anything changes.
  2. SEED (idempotent: an item that already exists, by kind and slug, is never changed, so running it twice adds nothing and an administrator's edits are never overwritten):
       - Our Network: partner companies (Fatcat Wealthy, Marg ERP, Zoho, HexBis, OpenAI, ShieldByte InfoSec, CADPOINT Salem Branch), the software list, the page text;
       - Upcoming services: the three categories and their six services;
       - Education courses: the 53 approved courses;
       - Industries and LAX360 products (their existing seed commands).
  3. MARK each moved section as migrated. From then on the public website reads that section ONLY from the database: a partner or course that is deleted or unpublished does not come
     back from the built-in copy.
The snapshots in app/seed_data/ are the content exactly as the public website had it when it was moved.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ContentItem, SiteSetting

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "seed_data"
BACKUPS = ROOT.parent / "backups"
FRONTEND_DATA = ROOT.parents[1] / "frontend" / "src" / "data"


def backup(db: Session) -> Path:
    """Write every content item and setting to a timestamped JSON file. Returns its path."""
    BACKUPS.mkdir(exist_ok=True)
    path = BACKUPS / f"content-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}.json"
    items = [{"kind": i.kind, "slug": i.slug, "title": i.title, "data": i.data, "status": i.status, "sort_order": i.sort_order} for i in db.scalars(select(ContentItem).order_by(ContentItem.kind, ContentItem.sort_order))]
    settings = [{"key": s.key, "value": s.value, "is_public": s.is_public} for s in db.scalars(select(SiteSetting))]
    path.write_text(json.dumps({"created_at": datetime.now(timezone.utc).isoformat(), "content_items": items, "site_settings": settings}, ensure_ascii=False, indent=1), encoding="utf8")
    return path


def _add(db: Session, existing: set, kind: str, slug: str, title: str, data: dict, sort: int, status: str = "published") -> bool:
    if (kind, slug) in existing:
        return False
    db.add(ContentItem(kind=kind, slug=slug, title=title[:200], data={k: v for k, v in data.items() if v not in ("", None, [])}, status=status, sort_order=sort))
    existing.add((kind, slug))
    return True


def _titled(x) -> str:
    """A capability line: "Title: text", and, when the entry has a list of bullets, " || bullet; bullet" after it."""
    line = f"{x[0]}: {x[1]}"
    if len(x) > 2 and x[2]:
        line += " || " + "; ".join(x[2])
    return line


def _lines(items) -> str:
    return "\n".join(items)


def seed_network(db: Session, existing: set) -> int:
    n = 0
    src = json.loads((FRONTEND_DATA / "network.json").read_text(encoding="utf8"))
    for i, c in enumerate(src["companies"], start=1):
        body = {k: v for k, v in c.items() if k not in ("slug", "name", "status", "products", "featured", "core")}
        body["products"] = _lines(c.get("products", []))
        body["featured"] = bool(c.get("featured"))
        body["enabled"] = True
        n += _add(db, existing, "network_partner", c["slug"], c["name"], body, i * 10, c["status"])
    for i, p in enumerate(src["software"], start=1):
        body = {k: v for k, v in p.items() if k not in ("slug", "name", "status")}
        body["enabled"] = True
        n += _add(db, existing, "software_product", p["slug"], p["name"], body, i * 10, p["status"])
    page = json.loads((DATA / "network_page.json").read_text(encoding="utf8"))
    n += _add(db, existing, "network_page", "network", "Our Network page text", {
        "heading": page["intro"]["heading"], "subheading": page["intro"]["sub"], "intro_1": page["intro"]["paragraphs"][0], "intro_2": page["intro"]["paragraphs"][1],
        "opportunities_title": "Choose how you would like to work with LAX360. Full details, eligibility and how to apply are on the Partner With Us page.",
        "cta_heading": page["cta"]["heading"], "cta_text": " ".join(page["cta"]["paragraphs"])}, 10)
    return n


def seed_upcoming(db: Session, existing: set, source: str = "upcoming.json") -> int:
    n = 0
    for i, c in enumerate(json.loads((DATA / source).read_text(encoding="utf8"))["categories"], start=1):
        data = {"url_slug": c["slug"], "status": c["status"], "tagline": c["tagline"], "description": "\n\n".join(c["description"]), "short_name": c["short"], "headline": c["headline"], "lead": c["lead"],
                "areas": _lines(f"{a['title']}: {a['text']}" for a in c["areas"]), "today": _lines(c.get("today", [])), "today_links": _lines(f"{x['label']} | {x['to']}" for x in c.get("todayLinks", [])),
                "seo_title": c["seoTitle"], "seo_description": c["seoDescription"], "show_home": True, "partner_franchise": True, "partner_authorized": True, "partner_referral": True}
        n += _add(db, existing, "upcoming_category", c["slug"], c["name"], data, i * 10)
        for j, s in enumerate(c["services"], start=1):
            n += _add(db, existing, "upcoming_service", s["slug"], s["name"], {"url_slug": s["slug"], "category": c["slug"], "summary": s["summary"], "partner_franchise": True, "partner_authorized": True, "partner_referral": True}, i * 100 + j * 10)
    return n


def seed_divisions(db: Session, existing: set) -> int:
    """The three active service divisions and all their sub-services (Software & IT Services, Digital Marketing, Education & Training), exactly as the website shows them, so that they are managed in the admin panel.
    Never overwrites an existing entry."""
    n = 0
    src = json.loads((DATA / "divisions.json").read_text(encoding="utf8"))
    for i, d in enumerate(src["divisions"], start=1):
        data = {"url_slug": d["slug"], "short": d["short"], "outcome": d["outcome"], "tags": _lines(d["tags"]), "enquiry_type": d["enquiryType"], "hero_line": d["heroLine"], "overview": d["overview"],
                "challenges": _lines(d["challenges"]), "use_cases": _lines(d["useCases"]), "stack": _lines(d["stack"]), "stack_note": d["stackNote"], "engagement": d["engagement"],
                "faqs": _lines(f"{f['q']} | {f['a']}" for f in d["faqs"]), "meta_title": d["metaTitle"], "meta_description": d["metaDescription"]}
        n += _add(db, existing, "division", d["slug"], d["name"], data, i * 10)
    for j, s in enumerate(src["services"], start=1):
        data = {"url_slug": s["slug"], "division": s["division"], "group": s["group"], "text": s["text"], "intro": s["intro"], "about": "\n\n".join(s["about"]), "offers": _lines(s["offers"]),
                "solves": _lines(s["solves"]), "features": _lines(_titled(x) for x in s["features"]), "benefits": _lines(s["benefits"]), "uses": _lines(_titled(x) for x in s["uses"])}
        n += _add(db, existing, "division_service", f"{s['division']}--{s['slug']}", s["name"], data, j * 10)
    return n


def _preview_note(s: dict) -> str:
    """The caption under a solution image: what kind of picture it is (a design preview, never a screenshot of a deployed product)."""
    if s["status"] == "under_development":
        return "Concept Preview: a design of how this could look. It is under development and not available yet."
    label = {"websites": "Website Design Preview", "api": "Solution Preview", "ai-agents": "Solution Preview"}.get(s["category"], "Product Interface Preview")
    return f"{label}: a design concept with sample data, not a screenshot of a client's live system."


def seed_solutions(db: Session, existing: set) -> int:
    """The Software & IT solutions portfolio (6 categories, 64 solutions and industry categories) from `seed_data/solutions.json` (built by backend/scripts/build_solutions.py), so that all of it is
    managed in the admin panel. Never overwrites an existing entry."""
    n = 0
    src = json.loads((DATA / "solutions.json").read_text(encoding="utf8"))
    for i, c in enumerate(src["categories"], start=1):
        data = {"url_slug": c["slug"], "intro": c["intro"], "custom_name": c["custom_name"], "custom_text": c["custom_text"], "platforms": _lines(c["platforms"]), "service_link": c["service_link"],
                "accent": c["accent"], "types": _lines(f"{t['name']}: {t['text']}" for t in c["types"])}
        n += _add(db, existing, "solution_category", c["slug"], c["name"], data, i * 10)
    for j, s in enumerate(src["solutions"], start=1):
        data = {"url_slug": s["slug"], "category": s["category"], "kind": s["kind"], "status": s["status"], "linked_product": s["linked_product"], "pitch": s["pitch"], "overview": "\n\n".join(s["overview"]),
                "problems": _lines(s["problems"]), "features": _lines(s["features"]), "modules": _lines(s["modules"]), "how": _lines(f"{x['title']}: {x['text']}" for x in s["how"]),
                "customers": _lines(s["customers"]), "industries": _lines(s["industries"]), "benefits": _lines(s["benefits"]), "platforms": _lines(s["platforms"]), "customization": _lines(s["customization"]),
                "integrations": _lines(s["integrations"]), "faqs": _lines(f"{f['q']} | {f['a']}" for f in s["faqs"]), "related": _lines(s["related"]), "image_alt": s["image_alt"],
                "mockup_note": _preview_note(s), "seo_title": s["seo_title"], "seo_description": s["seo_description"],
                "keywords": _lines(s["keywords"]), "featured": s["featured"], "partner_franchise": s["partner_franchise"], "partner_authorized": s["partner_authorized"], "partner_referral": s["partner_referral"]}
        n += _add(db, existing, "solution", s["slug"], s["name"], data, j * 10)
    return n


def _norm(line: str) -> str:
    return " ".join(line.lower().replace(":", " ").rstrip(". ").split())


def _append_unique(current: str, extra: list[str], limit: int) -> str:
    """Add the lines of `extra` that the text does not have yet (compared loosely), without ever exceeding the field's length limit and without touching what is already there."""
    lines = [x for x in (current or "").split("\n") if x.strip()]
    seen = {_norm(x) for x in lines}
    seen |= {_norm(x.split(":", 1)[0]) for x in lines}
    for x in extra:
        n = _norm(x)
        if not n or n in seen or any(n in s or s in n for s in seen if len(s) > 12):
            continue
        if len("\n".join(lines + [x])) > limit:
            break
        lines.append(x)
        seen.add(n)
    return "\n".join(lines)


def seed_solution_merges(db: Session, existing: set) -> dict:
    """Solutions that are the same thing as an existing LAX360 product (see scripts/build_solutions.py MERGES) are not listed twice: whatever they say that the product does not, is merged INTO the
    product record. Nothing the product already has is changed or removed (administrator edits stay): only empty fields are filled, new unique lines are appended within the field limits, and the
    solution's modules become product modules the product does not have. Idempotent (marker `solution-merges`). Returns what was done, for the report."""
    import json

    src = json.loads((Path(__file__).parent / "seed_data" / "solution_merges.json").read_text(encoding="utf-8"))
    report = {"merged": 0, "missing_product": [], "fields": 0, "modules": 0}
    if ("content_seed", "solution-merges") in existing:
        return report
    from app.models import ContentItem

    for entry in src:
        s, slug = entry["solution"], entry["product"]
        prod = db.scalar(select(ContentItem).where(ContentItem.kind == "product", ContentItem.slug == slug))
        if prod is None:
            report["missing_product"].append(slug)
            continue
        d = dict(prod.data or {})
        before = dict(d)
        if not d.get("industries"):
            d["industries"] = "\n".join(s["industries"])[:1000]
        if not d.get("users"):
            d["users"] = "\n".join(s["customers"])[:1000]
        d["features"] = _append_unique(d.get("features", ""), s["features"], 3000)
        d["benefits"] = _append_unique(d.get("benefits", ""), s["benefits"], 2000)
        d["problems"] = _append_unique(d.get("problems", ""), s["problems"], 2000)
        if not d.get("seo_title"):
            d["seo_title"] = s["seo_title"][:70]
        if not d.get("seo_description"):
            d["seo_description"] = s["seo_description"][:300]
        d = {k: v for k, v in d.items() if v not in ("", None)}
        if d != before:
            prod.data = d
            from sqlalchemy.orm.attributes import flag_modified

            flag_modified(prod, "data")
            report["fields"] += sum(1 for k in d if d.get(k) != before.get(k))
        have = {_norm(i.title) for i in db.scalars(select(ContentItem).where(ContentItem.kind == "product_module")) if (i.data or {}).get("product") == slug}
        n = db.scalar(select(func.count()).select_from(ContentItem).where(ContentItem.kind == "product_module")) or 0
        for name in s["modules"]:
            if _norm(name) in have:
                continue
            mslug = f"{slug}-{re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')}"[:80]
            if _add(db, existing, "product_module", mslug, name, {"product": slug, "summary": f"{name}: one of the modules of {prod.title}."}, (n + 1) * 10):
                n += 1
                report["modules"] += 1
                have.add(_norm(name))
        report["merged"] += 1
    mark(db, existing, "solution-merges")
    return report


def seed_courses(db: Session, existing: set) -> int:
    n = 0
    for g in json.loads((DATA / "education_courses.json").read_text(encoding="utf8"))["groups"]:
        for c in g["courses"]:
            n += _add(db, existing, "education_course", f"course-{c['no']:03d}", c["name"], {"category": g["title"], "software": c.get("software", ""), "hidden": False}, c["no"] * 10)
    return n


def seed_hero(db: Session, existing: set) -> int:
    """The home page hero text exactly as the website shows it (headline lines, introduction and the two buttons)."""
    return _add(db, existing, "hero", "home", "Home page hero", {
        "headline_1": "One team to build,", "headline_2": "automate and grow", "headline_3": "your business.",
        "lead": "Custom software, AI automation, websites, apps, digital marketing and training \u2014 planned, built and supported by LAX360 Pvt Ltd.",
        "cta_primary_label": "Discuss Your Project", "cta_primary_link": "/contact?type=project", "cta_secondary_label": "Explore Our Services", "cta_secondary_link": "/services"}, 10)


def seed_partner_products(db: Session, existing: set) -> int:
    """The "Our Products" list of the IT & Software partnership pages: one entry per product, for each of the three programs."""
    n = 0
    for program, cat in json.loads((DATA / "partner_products.json").read_text(encoding="utf8")).items():
        order = 0
        for g in cat["groups"]:
            for it in g["items"]:
                order += 10
                n += _add(db, existing, "partner_product", f"{program}-{order:03d}", it["name"], {"program": program, "group": g["title"], "description": it.get("desc", ""), "tag": it.get("tag", ""), "link": it.get("to", ""), "hidden": False},
                          {"franchise": 1000, "authorized-partner": 2000, "referral-partner": 3000}[program] + order)
    return n


def seed_partnership_pages(db: Session) -> int:
    """The headline, introduction and opening paragraph of the 9 partnership opportunity pages and the 3 program pages, prefilled in Partnerships > Opportunity pages.
    The text equals the built-in text, so the pages look the same; an existing row (an administrator's edits) is never changed."""
    from app.models import PartnershipPage

    n = 0
    for p in json.loads((DATA / "partnership_pages.json").read_text(encoding="utf8")):
        if db.get(PartnershipPage, p["slug"]) is not None:
            continue
        content = {"hero_heading": p["hero_heading"], "hero_lead": p["hero_lead"], **({"intro": p["intro"]} if p["intro"] else {})}
        db.add(PartnershipPage(slug=p["slug"], published=True, content=content))
        n += 1
    return n


def mark(db: Session, existing: set, domain: str) -> None:
    _add(db, existing, "content_seed", domain, f"{domain} content migrated", {"seeded": True}, 10)
