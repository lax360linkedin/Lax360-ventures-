"""The Software & IT solutions portfolio (6 categories, 64 solutions and industry categories) as the website reads it.

The records live in the content tables (kinds `solution_category` and `solution`, managed in Admin > Services > Solution categories / Solutions). They are large, so they are NOT part of
`/api/public/content-all`; the website asks for a slim list (`/api/public/solutions`) and for one full record when a detail page opens (`/api/public/solutions/{slug}`).
Until `python -m app.cli migrate-content` has copied the built-in portfolio into the database (`migrated` is false) the website uses its built-in copy.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import ContentItem
from app.services import content_service as cs


def lines(value) -> list[str]:
    return [x.strip() for x in str(value or "").splitlines() if x.strip()]


def paragraphs(value) -> list[str]:
    return [p.strip() for p in str(value or "").replace("\r", "").split("\n\n") if p.strip()]


def titled(value) -> list[dict]:
    out = []
    for line in lines(value):
        head, _, rest = line.partition(":")
        out.append({"title": head.strip(), "text": rest.strip()} if rest else {"title": line, "text": ""})
    return out


def faqs(value) -> list[dict]:
    out = []
    for line in lines(value):
        q, sep, a = line.partition(" | ")
        if sep and q.strip() and a.strip():
            out.append({"q": q.strip(), "a": a.strip()})
    return out


def _flag(data: dict, key: str, default: bool = True) -> bool:
    v = data.get(key)
    return default if v is None else bool(v)


def is_migrated(db: Session) -> bool:
    return db.scalar(select(ContentItem.id).where(ContentItem.kind == "content_seed", ContentItem.slug == "solutions").limit(1)) is not None


def _published(db: Session, kind: str) -> list[ContentItem]:
    return list(db.scalars(select(ContentItem).where(ContentItem.kind == kind, ContentItem.status == "published").order_by(ContentItem.sort_order, ContentItem.created_at)))


def _resolved(db: Session, settings: Settings, item: ContentItem) -> dict:
    return cs._resolve(db, settings, item.kind, item.data or {})  # media ids become image addresses


def _category(item: ContentItem, d: dict, count: int) -> dict:
    slug = (d.get("url_slug") or item.slug).strip()
    return {"slug": slug, "name": item.title, "intro": d.get("intro") or "", "custom_name": d.get("custom_name") or "", "custom_text": d.get("custom_text") or "", "platforms": lines(d.get("platforms")),
            "service_link": d.get("service_link") or "", "accent": d.get("accent") or "", "image": d.get("image") or "", "count": count, "types": titled(d.get("types"))}


def _card(item: ContentItem, d: dict) -> dict:
    return {"slug": (d.get("url_slug") or item.slug).strip(), "category": d.get("category") or "", "kind": d.get("kind") or "product", "name": item.title, "status": d.get("status") or "custom",
            "linked_product": d.get("linked_product") or "", "order": item.sort_order, "pitch": d.get("pitch") or "", "industries": lines(d.get("industries")), "platforms": lines(d.get("platforms")),
            "image": d.get("image") or "", "image_alt": d.get("image_alt") or "", "featured": bool(d.get("featured")),
            "partner_franchise": _flag(d, "partner_franchise"), "partner_authorized": _flag(d, "partner_authorized"), "partner_referral": _flag(d, "partner_referral")}


def public_index(db: Session, settings: Settings) -> dict:
    migrated = is_migrated(db)
    if not migrated:
        return {"migrated": False, "categories": [], "solutions": []}
    sols = [(i, _resolved(db, settings, i)) for i in _published(db, "solution")]
    cards = [_card(i, d) for i, d in sols]
    counts: dict[str, int] = {}
    for c in cards:
        counts[c["category"]] = counts.get(c["category"], 0) + 1
    cats = []
    for i in _published(db, "solution_category"):
        d = _resolved(db, settings, i)
        cats.append(_category(i, d, counts.get((d.get("url_slug") or i.slug).strip(), 0)))
    return {"migrated": True, "categories": cats, "solutions": cards}


# which statuses show the live links: a solution that is not launched, or is paused, never shows a launch / download button
LINKS_SHOWN = {"available", "live", "demo_available", "custom"}


def links_of(d: dict) -> list[dict]:
    """Buttons for the external links that were entered AND are valid, in a fixed order, with the label chosen in the admin panel (or the default)."""
    if (d.get("status") or "custom") not in LINKS_SHOWN:
        return []
    spec = [("live_website_url", "View Live Website"), ("live_app_url", "Launch Application"), ("demo_link", "Try Live Demo"), ("landing_url", "Explore Product"), ("play_store_url", "Get it on Google Play"),
            ("app_store_url", "Download on the App Store"), ("desktop_download_url", "Download Application"), ("docs_url", "View Documentation"), ("video_link", "Watch Demo"), ("custom_link_url", "Learn more")]
    out = []
    for key, default in spec:
        url = (d.get(key) or "").strip()
        if url and cs.valid_link(url, allow_page=key == "demo_link"):
            if key == "demo_link" and (d.get("status") or "") == "available" and url.startswith("/"):
                continue  # an internal demo-request page is the main button already
            out.append({"type": key, "label": (d.get(key + "_label") or "").strip() or default, "url": url, "external": url.startswith("http")})
    return out


def public_detail(db: Session, settings: Settings, slug: str) -> dict | None:
    if not is_migrated(db):
        return None
    for i in _published(db, "solution"):
        d = _resolved(db, settings, i)
        if (d.get("url_slug") or i.slug).strip() == slug:
            card = _card(i, d)
            return {**card, "overview": paragraphs(d.get("overview")), "problems": lines(d.get("problems")), "features": lines(d.get("features")), "modules": lines(d.get("modules")),
                    "how": titled(d.get("how")), "customers": lines(d.get("customers")), "benefits": lines(d.get("benefits")), "customization": lines(d.get("customization")),
                    "integrations": lines(d.get("integrations")), "faqs": faqs(d.get("faqs")), "related": lines(d.get("related")), "gallery": d.get("gallery_items") or [{"url": u, "caption": "", "alt": ""} for u in lines(d.get("gallery"))],
                    "mockup_note": d.get("mockup_note") or "", "demo_link": d.get("demo_link") or "", "video_link": d.get("video_link") or "", "cta_label": d.get("cta_label") or "",
                    "cta_link": d.get("cta_link") or "", "links": links_of(d), "seo_title": d.get("seo_title") or "", "seo_description": d.get("seo_description") or "", "keywords": lines(d.get("keywords"))}
    return None


__all__ = ["public_index", "public_detail", "is_migrated", "uuid"]
