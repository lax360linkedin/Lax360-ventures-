"""The Partner With Us navigation menu managed in the admin panel (same fixtures as test_partnerships.py: real routes on in-memory SQLite)."""

from __future__ import annotations

from sqlalchemy import func, select

from app.models import AuditLog, PartnershipApplication, PartnershipPage
from tests.test_partnerships import ADMIN, BASE, NOPERM, api, apply, db, factory  # noqa: F401  (fixtures)

CATS = ("franchise", "authorized-partner", "referral-partner")
BUILTIN = ["education", "digital-marketing", "it"]


def menu_of(api):
    return api.get("/api/public/partnerships/menu").json()["categories"]


def entries(api, cat):
    return next(c for c in api.get(f"{BASE}/menu", headers=ADMIN).json()["categories"] if c["slug"] == cat)["items"]


def body_of(items):
    return {"items": [{"slug": i["slug"], "label": i["label"], "description": i.get("description"), "enabled": i["enabled"]} for i in items]}


def test_the_default_menu_is_the_three_builtin_divisions_in_every_category(api):
    cats = menu_of(api)
    assert [c["slug"] for c in cats] == list(CATS) and [c["label"] for c in cats] == ["Franchise Opportunities", "Authorized Partner Program", "Referral Partner Program"]
    for c in cats:
        assert [(i["slug"], i["path"]) for i in c["items"]] == [(d, f"/{c['slug']}/{d}") for d in BUILTIN]
    assert api.get("/api/public/partnerships/menu").headers["cache-control"].startswith("public")


def test_menu_management_needs_the_permission(api):
    assert api.get(f"{BASE}/menu").status_code == 401 and api.get(f"{BASE}/menu", headers=NOPERM).status_code == 403
    assert api.put(f"{BASE}/menu/franchise", json={"items": []}, headers=NOPERM).status_code == 403
    assert api.put(f"{BASE}/menu/franchise", json={"items": []}).status_code == 401


def test_adding_reordering_renaming_and_disabling_entries_updates_the_public_menu(api, db):
    new = body_of(entries(api, "franchise"))
    new["items"].append({"slug": "healthcare-training", "label": "Healthcare Training", "description": "Training for healthcare staff.", "enabled": True})
    assert api.put(f"{BASE}/menu/franchise", json=new, headers=ADMIN).status_code == 200
    pub = next(c for c in menu_of(api) if c["slug"] == "franchise")["items"]
    assert pub[-1] == {"slug": "healthcare-training", "label": "Healthcare Training", "path": "/franchise/healthcare-training", "builtin": False}  # a new entry appears with its own page address
    assert [i["slug"] for i in next(c for c in menu_of(api) if c["slug"] == "referral-partner")["items"]] == BUILTIN  # other categories are untouched
    order = [e for k in ("it", "healthcare-training", "education", "digital-marketing") for e in new["items"] if e["slug"] == k]
    next(e for e in order if e["slug"] == "education")["label"] = "Education & Training"
    next(e for e in order if e["slug"] == "digital-marketing")["enabled"] = False
    api.put(f"{BASE}/menu/franchise", json={"items": order}, headers=ADMIN)
    pub = next(c for c in menu_of(api) if c["slug"] == "franchise")["items"]
    assert [i["slug"] for i in pub] == ["it", "healthcare-training", "education"] and pub[2]["label"] == "Education & Training"  # disabled entries leave the public menu
    assert [i["enabled"] for i in entries(api, "franchise") if i["slug"] == "digital-marketing"] == [False]  # but stay in the admin list: they are only hidden
    assert [a.action for a in db.scalars(select(AuditLog))] == ["partner.menu.save", "partner.menu.save"]


def test_a_new_entry_gets_an_editable_page_accepts_applications_and_is_removed_cleanly(api, db):
    items = body_of(entries(api, "authorized-partner"))
    items["items"].append({"slug": "legal-services", "label": "Legal Services", "enabled": True})
    api.put(f"{BASE}/menu/authorized-partner", json=items, headers=ADMIN)
    slugs = [p["slug"] for p in api.get(f"{BASE}/pages", headers=ADMIN).json()["items"]]
    assert "authorized-partner/legal-services" in slugs and len(slugs) == 14  # editable like the built-in pages
    assert api.put(f"{BASE}/pages/authorized-partner/legal-services", json={"content": {"hero_heading": "Legal services partners", "intro": ["Refer legal-tech clients."]}, "seo_title": "Legal Services Partner"}, headers=ADMIN).status_code == 200
    pub = api.get("/api/public/partnerships").json()
    assert pub["custom_pages"]["authorized-partner/legal-services"]["label"] == "Legal Services" and pub["pages"]["authorized-partner/legal-services"]["content"]["hero_heading"] == "Legal services partners"
    assert apply(api, category="authorized", division="legal-services", answers={}).status_code == 201  # an application can name the new division
    assert apply(api, email="x@example.com", category="authorized", division="not-a-division", answers={}).status_code == 422
    api.post(f"{BASE}/faqs", json={"scope": "authorized-partner/legal-services", "question": "Who can join this program?", "answer": "Anyone with legal-sector contacts."}, headers=ADMIN)
    kept = [i for i in entries(api, "authorized-partner") if i["slug"] != "legal-services"]
    assert api.put(f"{BASE}/menu/authorized-partner", json=body_of(kept), headers=ADMIN).status_code == 200  # leaving it out deletes it
    assert db.get(PartnershipPage, "authorized-partner/legal-services") is None
    assert "legal-services" not in [i["slug"] for i in entries(api, "authorized-partner")]
    assert apply(api, email="y@example.com", category="authorized", division="legal-services", answers={}).status_code == 422  # a removed division can no longer be chosen
    assert db.scalar(select(func.count()).select_from(PartnershipApplication)) == 1  # the earlier application is kept


def test_built_in_divisions_cannot_be_deleted_only_hidden(api):
    api.put(f"{BASE}/menu/referral-partner", json={"items": [{"slug": "it", "label": "IT & Software", "enabled": True}]}, headers=ADMIN)
    assert {i["slug"]: i["enabled"] for i in entries(api, "referral-partner")} == {"it": True, "education": False, "digital-marketing": False}  # omitted built-ins are hidden, never deleted


def test_menu_validation_rejects_bad_requests_and_changes_nothing(api):
    base = body_of(entries(api, "franchise"))["items"]
    for entry in ({"slug": "Bad Slug", "label": "Valid name"}, {"slug": "apply", "label": "Valid name"}, {"slug": "ok-slug", "label": "x"}, {"slug": "education", "label": "Duplicate"}, {"slug": "-lead", "label": "Valid name"}):
        assert api.put(f"{BASE}/menu/franchise", json={"items": [*base, entry]}, headers=ADMIN).status_code == 422, entry
    assert api.put(f"{BASE}/menu/franchise", json={"items": [{"slug": f"s{i}-x", "label": f"Entry {i}"} for i in range(13)]}, headers=ADMIN).status_code == 422  # at most 12 entries
    assert api.put(f"{BASE}/menu/nonsense", json={"items": []}, headers=ADMIN).status_code == 404
    assert [i["slug"] for i in entries(api, "franchise")] == BUILTIN
    ok = api.put(f"{BASE}/menu/franchise", json={"items": [*base, {"slug": "safe-entry", "label": "<b>Safe</b> entry", "description": "<script>alert(1)</script>Plain text"}]}, headers=ADMIN)
    new = next(i for i in ok.json()["categories"][0]["items"] if i["slug"] == "safe-entry")
    assert "<" not in new["label"] and new["description"] == "Plain text"


def test_custom_pages_are_in_the_content_sitemap_only_while_enabled_and_indexable(api, db):
    from app.services import seo_service

    items = body_of(entries(api, "referral-partner"))
    items["items"].append({"slug": "tourism", "label": "Tourism", "enabled": True})
    api.put(f"{BASE}/menu/referral-partner", json=items, headers=ADMIN)
    paths = lambda: [p for p, _ in seo_service.sitemap_urls(db)]  # noqa: E731
    assert "/referral-partner/tourism" in paths() and "/referral-partner/education" not in paths()  # built-in pages are in the main sitemap, not duplicated here
    api.put(f"{BASE}/pages/referral-partner/tourism", json={"noindex": True}, headers=ADMIN)
    assert "/referral-partner/tourism" not in paths()
    api.put(f"{BASE}/pages/referral-partner/tourism", json={"published": True}, headers=ADMIN)
    assert "/referral-partner/tourism" in paths()
    items["items"][-1]["enabled"] = False
    api.put(f"{BASE}/menu/referral-partner", json=items, headers=ADMIN)
    assert "/referral-partner/tourism" not in paths()
