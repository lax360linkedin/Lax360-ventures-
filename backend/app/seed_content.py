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
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
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


def seed_upcoming(db: Session, existing: set) -> int:
    n = 0
    for i, c in enumerate(json.loads((DATA / "upcoming.json").read_text(encoding="utf8"))["categories"], start=1):
        data = {"url_slug": c["slug"], "status": c["status"], "tagline": c["tagline"], "description": "\n\n".join(c["description"]), "short_name": c["short"], "headline": c["headline"], "lead": c["lead"],
                "areas": _lines(f"{a['title']}: {a['text']}" for a in c["areas"]), "today": _lines(c.get("today", [])), "today_links": _lines(f"{x['label']} | {x['to']}" for x in c.get("todayLinks", [])),
                "seo_title": c["seoTitle"], "seo_description": c["seoDescription"], "show_home": True, "partner_franchise": True, "partner_authorized": True, "partner_referral": True}
        n += _add(db, existing, "upcoming_category", c["slug"], c["name"], data, i * 10)
        for j, s in enumerate(c["services"], start=1):
            n += _add(db, existing, "upcoming_service", s["slug"], s["name"], {"url_slug": s["slug"], "category": c["slug"], "summary": s["summary"], "partner_franchise": True, "partner_authorized": True, "partner_referral": True}, i * 100 + j * 10)
    return n


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
