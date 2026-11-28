"""The solutions portfolio: seeded into the database from the built-in data, served by its own endpoints (slim list + one record), and its enquiries go to their own worksheet."""
import json
from pathlib import Path

from sqlalchemy import select

import app.seed_content as sc
from app.enquiry_categories import KEYS, contact_category
from app.models import ContentItem
from app.services.sheets_service import headers_of

DATA = json.loads((Path(sc.__file__).parent / "seed_data" / "solutions.json").read_text(encoding="utf8"))


def test_the_portfolio_has_all_64_solutions_in_six_categories_with_honest_statuses():
    sols = DATA["solutions"]
    assert len(sols) == 54 and len({s["slug"] for s in sols}) == 54  # 64 provided, 10 of them are existing LAX360 products (merged, see test_merges)
    counts = {}
    for s in sols:
        counts[s["category"]] = counts.get(s["category"], 0) + 1
    assert counts == {"software": 8, "webapps": 4, "mobile": 13, "websites": 10, "api": 10, "ai-agents": 9}
    for s in sols:
        assert s["status"] in {"available", "custom", "under_development", "coming_soon"}
        assert (s["status"] == "available") == bool(s["linked_product"])  # only a solution backed by an existing LAX360 product is "available"
        for key in ("pitch", "problems", "features", "modules", "how", "customers", "industries", "benefits", "platforms", "customization", "integrations", "faqs"):
            assert s[key], (s["slug"], key)
        if s["category"] == "ai-agents":
            assert s["status"] == "under_development", s["slug"]  # AI agent products are never presented as production-ready
    assert len({s["pitch"] for s in sols}) == 54  # no two solutions share the same description
    assert len({tuple(s["modules"]) for s in sols}) == 54


def test_seed_is_complete_idempotent_and_kept_out_of_the_big_bundle(db, client):
    existing: set = set()
    assert sc.seed_solutions(db, existing) == 6 + 54
    assert sc.seed_solutions(db, existing) == 0
    assert client.get("/api/public/solutions").json()["migrated"] is False  # until the domain is marked as migrated the website keeps using its built-in copy
    sc.mark(db, existing, "solutions")
    db.commit()
    assert db.scalar(select(ContentItem.id).where(ContentItem.kind == "solution").limit(1))
    body = client.get("/api/public/solutions").json()
    assert body["migrated"] is True and len(body["solutions"]) == 54 and len(body["categories"]) == 6
    assert all("overview" not in c for c in body["solutions"])  # the list is slim
    detail = client.get("/api/public/solutions/authentication-and-authorization-api").json()
    assert detail["status"] == "available" and detail["faqs"] and detail["how"] and detail["modules"]
    assert client.get("/api/public/solutions/not-a-solution").status_code == 404
    bundle = client.get("/api/public/content-all").json()["kinds"]
    assert "solution" not in bundle and "solution_category" not in bundle


def test_product_enquiries_have_their_own_category_and_worksheet():
    assert "product" in KEYS
    assert contact_category("product", "solutions") == "product"
    heads = headers_of("product")
    assert "Service Category" in heads and "Products or Services" in heads and "Source Page" in heads and "Enquiry Status" in heads


def test_every_solution_has_its_own_rendered_preview_and_honest_labels():
    folder = Path(sc.__file__).resolve().parents[2] / "frontend" / "public" / "assets" / "solutions"
    for s in DATA["solutions"]:
        assert s["image"] == f"/assets/solutions/{s['slug']}.webp"
        assert (folder / f"{s['slug']}.webp").exists() and (folder / f"{s['slug']}-800.webp").exists(), s["slug"]
        assert "llustrative" not in s["image_alt"], s["slug"]
        note = sc._preview_note(s)
        assert "not a screenshot" in note or "under development" in note
    sizes = {(folder / f"{s['slug']}.webp").read_bytes() for s in DATA["solutions"]}
    assert len(sizes) == 54  # no two previews are the same picture


def test_attach_solution_images_uploads_and_sets_them_and_keeps_admin_choices(db, monkeypatch):
    import argparse

    import app.cli as cli
    from app.models import MediaAsset

    existing: set = set()
    sc.seed_solutions(db, existing)
    db.commit()
    monkeypatch.setattr(cli, "_factory", lambda: (lambda: _Keep(db)))
    one = db.scalar(select(ContentItem).where(ContentItem.kind == "solution", ContentItem.slug == "ai-receptionist"))
    d = dict(one.data)
    d["image"] = "11111111-1111-1111-1111-111111111111"  # an administrator's own choice
    one.data = d
    db.commit()
    cli.attach_solution_images(argparse.Namespace(dry_run=True, replace=False, dir=""))
    assert db.scalar(select(MediaAsset.id).limit(1)) is None  # dry run changes nothing
    cli.attach_solution_images(argparse.Namespace(dry_run=False, replace=False, dir=""))
    folder = Path(sc.__file__).resolve().parents[2] / "frontend" / "public" / "assets" / "solutions"
    assert len(list(folder.glob("*.webp"))) >= 120  # the source pictures stay where they are (54 solutions + 6 categories, two sizes each)
    db.expire_all()
    rows = list(db.scalars(select(ContentItem).where(ContentItem.kind.in_(("solution", "solution_category")))))
    assert all((r.data or {}).get("image") for r in rows)
    kept = next(r for r in rows if r.slug == "ai-receptionist")
    assert kept.data["image"] == "11111111-1111-1111-1111-111111111111"
    other = next(r for r in rows if r.slug == "hospital-management-software")
    assert "llustrative" not in other.data["mockup_note"]


class _Keep:
    """Lets the command use the test session without closing it."""
    def __init__(self, db):
        self.db = db
    def __enter__(self):
        return self.db
    def __exit__(self, *a):
        return False


def test_links_are_validated_and_buttons_follow_status_and_only_real_links():
    from app.services import content_service as cs
    from app.services.solutions_service import links_of

    for bad in ("", "#", "javascript:alert(1)", "http://example.com", "https://localhost:3000", "https://a", "www.site.com"):
        assert not cs.valid_link(bad), bad
    assert cs.valid_link("https://play.google.com/store/apps/details?id=x") and cs.valid_link("https://latest.com") and cs.valid_link("/contact", allow_page=True) and not cs.valid_link("/contact")
    d = {"status": "live", "live_website_url": "https://shop.lax360.com", "live_app_url": "", "play_store_url": "https://example.org/x", "docs_url": "https://docs.lax360.com/guide", "docs_url_label": "Read the guide",
         "video_link": "https://youtu.be/abc123", "demo_link": "/contact?type=product"}
    got = {x["type"]: x for x in links_of(d)}
    assert set(got) == {"live_website_url", "docs_url", "video_link", "demo_link"}  # empty and placeholder links give no button
    assert got["live_website_url"]["label"] == "View Live Website" and got["docs_url"]["label"] == "Read the guide" and got["live_website_url"]["external"] and not got["demo_link"]["external"]
    for status in ("under_development", "coming_soon", "temporarily_unavailable"):
        assert links_of({**d, "status": status}) == []  # not launched or paused: no launch / download buttons
    assert "demo_link" not in {x["type"] for x in links_of({**d, "status": "available"})}  # the internal demo-request page is already the main button


def test_admin_rejects_a_placeholder_link_and_stores_a_real_one(db):
    from app.services import content_service as cs

    sc.seed_solutions(db, set())
    db.commit()
    base = {"category": "software", "kind": "product", "status": "live", "pitch": "x", "overview": "y"}
    try:
        cs._validate(db, "solution", "Link test", {**base, "live_website_url": "https://example.com"})
        raised = False
    except Exception as e:  # ApiError with field errors
        raised = "live_website_url" in (getattr(e, "fields", None) or {})
    assert raised
    cs._validate(db, "solution", "Link test", {**base, "live_website_url": "https://shop.lax360.com", "live_website_url_label": "Open the shop"})


def test_gallery_keeps_order_and_captions_and_skips_pictures_that_are_gone(db):
    import uuid as _uuid
    from types import SimpleNamespace

    from app.core.config import get_settings
    from app.models import MediaAsset
    from app.services import content_service as cs, media_service as ms

    sc.seed_solutions(db, set())
    db.commit()
    a, b = (MediaAsset(kind="image", filename=f"g{i}.webp", content_type="image/webp", size_bytes=10, storage="db", data=b"x" * 10, is_public=True, sha256=f"{i}" * 64) for i in (1, 2))
    db.add_all([a, b])
    db.commit()
    base = {"category": "software", "kind": "product", "status": "custom", "pitch": "x", "overview": "y"}
    _, clean = cs._validate(db, "solution", "Gallery test", {**base, "gallery": f"{b.id}|Second screen\n{a.id}\n/assets/solutions/ai-receptionist.webp|Built-in"})
    assert [r for r, _ in cs.gallery_entries(clean["gallery"])] == [str(b.id), str(a.id), "/assets/solutions/ai-receptionist.webp"]  # the order the administrator chose
    assert cs._media_ids("solution", clean) == {b.id, a.id}
    out = cs._resolve(db, get_settings(), "solution", clean)
    assert [i["caption"] for i in out["gallery_items"]] == ["Second screen", "", "Built-in"] and len(out["gallery_items"]) == 3
    db.delete(a)
    db.commit()
    assert len(cs._resolve(db, get_settings(), "solution", clean)["gallery_items"]) == 2  # a deleted picture is skipped
    for bad in (f"{_uuid.uuid4()}", "javascript:alert(1)", "\n".join(str(i) for i in range(30))):
        try:
            cs._validate(db, "solution", "Gallery test", {**base, "gallery": bad})
            assert False, bad
        except Exception as e:
            assert "gallery" in (getattr(e, "fields", None) or {}), bad


def test_public_cache_headers_never_serve_an_outdated_copy_first():
    from app.api.routes import partnerships, public

    for h in (public.CACHE["Cache-Control"],):
        assert "stale-while-revalidate" not in h and "max-age=0" in h and "stale-if-error" in h  # the old stale-while-revalidate showed the previous version until another reload
    import inspect
    assert "stale-while-revalidate" not in inspect.getsource(partnerships)


MERGES = json.loads((Path(sc.__file__).parent / "seed_data" / "solution_merges.json").read_text(encoding="utf8"))


def test_merges_cover_the_ten_solutions_that_are_existing_products_and_lose_nothing():
    assert len(MERGES) == 10 and len(DATA["solutions"]) + len(MERGES) == 64
    products = {p["slug"] for p in json.loads((Path(sc.__file__).resolve().parents[2] / "frontend" / "src" / "data" / "products.json").read_text(encoding="utf8"))}
    assert {m["product"] for m in MERGES} <= products and len({m["solution"]["slug"] for m in MERGES}) == 10
    assert not {m["solution"]["slug"] for m in MERGES} & {s["slug"] for s in DATA["solutions"]}  # never listed twice


def test_seed_solution_merges_fills_gaps_keeps_edits_adds_modules_and_is_idempotent(db):
    prod = ContentItem(kind="product", slug="lax360-bookings", title="LAX360 Bookings", status="published", sort_order=1,
                       data={"category": "booking", "status": "live", "summary": "Edited by an administrator.", "features": "Online booking: my own words\nReminders", "benefits": ""})
    db.add(prod)
    db.commit()
    existing: set = set()
    rep = sc.seed_solution_merges(db, existing)
    db.commit()
    assert rep["merged"] == 1 and len(rep["missing_product"]) == 9 and rep["modules"] > 0  # the other products are not in this test database
    db.refresh(prod)
    d = prod.data
    assert d["summary"] == "Edited by an administrator." and d["features"].startswith("Online booking: my own words\nReminders")  # nothing existing is changed
    assert len(d["features"].splitlines()) > 2 and d["industries"] and d["seo_title"] and len(d["features"]) <= 3000
    mods = [i.title for i in db.scalars(select(ContentItem).where(ContentItem.kind == "product_module")) if i.data.get("product") == "lax360-bookings"]
    assert len(mods) >= 3 and len(set(mods)) == len(mods)
    again = sc.seed_solution_merges(db, existing)
    assert again["merged"] == 0 and again["modules"] == 0  # the second run does nothing
