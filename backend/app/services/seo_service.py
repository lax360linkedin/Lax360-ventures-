"""Search-engine plumbing that follows the admin panel: the live sitemap of published content and the redirect list.

`/sitemap-content.xml` (served by the website through a rewrite to `/api/public/sitemap-content.xml`) lists every page that exists because an administrator published something: articles, products,
industries, partners and website demos. It is built from the database on each request (cached for a few minutes), so publishing, editing or deleting an item changes the sitemap without a deploy.
The pages built into the website are in the static sitemap.xml made at build time. A page an administrator marked "hide from search engines", and an address that now redirects elsewhere, is left out.
"""

from __future__ import annotations

from xml.sax.saxutils import escape

from sqlalchemy.orm import Session

from sqlalchemy import select

from app.core.config import Settings
from app.models import Branch
from app.services import translation_service
from app.services import content_service as cs

# content kind -> the public path of one item
PATHS = {"article": "/insights/{slug}", "product": "/products/{slug}", "industry": "/industries/{slug}", "network_partner": "/our-network/{slug}", "website": "/websites/{slug}"}
# the page keys of "Page titles & SEO" -> their paths (mirrors frontend/src/utils/cms.js)
PAGE_PATHS = {"home": "/", "about": "/about", "services": "/services", "products": "/products", "industries": "/industries", "insights": "/insights", "network": "/our-network", "team": "/our-team",
              "work": "/work", "career": "/career", "contact": "/contact"}


def _visible(kind: str, item) -> bool:
    flt = cs.KINDS[kind].get("public_filter")
    d = item.data or {}
    if flt and (((d.get(flt[0]) == flt[1]) if len(flt) > 2 else (d.get(flt[0]) != flt[1]))):
        return False  # e.g. a hidden partner
    return not d.get("noindex")


def hidden_paths(db: Session) -> set[str]:
    """Paths that must not be listed: pages marked "hide from search engines" and the old address of an active redirect."""
    out = set()
    for i in cs.list_items(db, "seo_page", status="published"):
        d = i.data or {}
        if d.get("noindex"):
            path = d.get("path") or PAGE_PATHS.get(d.get("page"))
            if path:
                out.add(path.rstrip("/") or "/")
    for i in cs.list_items(db, "seo_redirect", status="published"):
        d = i.data or {}
        if d.get("enabled") is not False and d.get("from_path"):
            out.add(d["from_path"].rstrip("/") or "/")
    return out


BUILT_IN_BRANCHES = {"salem", "bangalore", "mumbai"}  # these office pages are in the static sitemap


def sitemap_urls(db: Session) -> list[tuple[str, str | None]]:
    """[(path, lastmod 'YYYY-MM-DD')] of the published content pages."""
    skip = hidden_paths(db)
    seen: set[str] = set()
    out = []
    for kind, pattern in PATHS.items():
        for item in cs.list_items(db, kind, status="published"):
            if not _visible(kind, item):
                continue
            path = pattern.format(slug=item.slug)
            if path in skip or path in seen:
                continue
            seen.add(path)
            out.append((path, item.updated_at.date().isoformat() if item.updated_at else None))
    for b in db.scalars(select(Branch).where(Branch.is_active.is_(True)).order_by(Branch.sort_order, Branch.city)):  # an office added in the admin panel gets its page (and its place here) with no code change
        path = f"/locations/{b.slug}"
        if b.slug not in BUILT_IN_BRANCHES and path not in skip and path not in seen:
            seen.add(path)
            out.append((path, b.updated_at.date().isoformat() if b.updated_at else None))
    try:  # published, administrator-created Partner With Us pages (the built-in partnership pages are in the main sitemap)
        from app.models import PartnershipPage
        from app.services import partnership_service as ps

        pages = {p.slug: p for p in db.scalars(select(PartnershipPage))}
        for items in ps.menu_items(db).values():
            for x in items:
                slug = x["path"].lstrip("/")
                p = pages.get(slug)
                if not x["builtin"] and slug not in seen and (p is None or (p.published and not p.noindex)):
                    seen.add(slug)
                    out.append((x["path"], p.updated_at.date().isoformat() if p is not None and p.updated_at else None))
    except Exception:  # noqa: BLE001  (the partnership tables may not be migrated yet: the sitemap must still render)
        db.rollback()
    return out


def sitemap_xml(db: Session, settings: Settings) -> str:
    """The sitemap of published content, every page in every language (the English address and /ta/..., /hi/... ), each with its hreflang alternates."""
    base = settings.frontend_origin.rstrip("/")
    langs = ["en", *translation_service.LANGUAGES]
    url = lambda lang, path: base + ("" if lang == "en" else f"/{lang}") + ("" if path == "/" and lang != "en" else path)  # noqa: E731
    rows = []
    for path, last in sitemap_urls(db):
        alts = "".join(f'<xhtml:link rel="alternate" hreflang="{l}" href="{escape(url(l, path))}"/>' for l in langs) + f'<xhtml:link rel="alternate" hreflang="x-default" href="{escape(url("en", path))}"/>'
        for lang in langs:
            rows.append(f"  <url><loc>{escape(url(lang, path))}</loc>{f'<lastmod>{last}</lastmod>' if last else ''}{alts}</url>")
    head = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    return head + "\n".join(rows) + "\n</urlset>\n"


def redirects(db: Session) -> list[dict]:
    return [{"from": (i.data or {})["from_path"], "to": (i.data or {})["to_path"], "permanent": (i.data or {}).get("permanent") is not False}
            for i in cs.list_items(db, "seo_redirect", status="published") if (i.data or {}).get("enabled") is not False and (i.data or {}).get("from_path") and (i.data or {}).get("to_path")]
