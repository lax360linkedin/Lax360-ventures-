"""The 7-card Welcome Experience: seeded cards, honest wording for planned initiatives, valid links, and admin management."""

from app import seed_welcome as seed
from app.services import content_service as cs
from tests.admin_helpers import staff

EXISTING_PAGES = {"/services/software", "/services/growth", "/services/ai", "/our-network/cadpoint-academy-salem", "/robotics", "/blockchain"}


def test_seed_has_the_seven_cards_in_order_with_the_requested_buttons(db):
    rows = seed.card_rows()
    assert [r["title"] for r in rows] == ["Welcome to LAX360 Pvt Ltd", "Software & IT Services", "Digital Marketing", "Education & Training", "AI & Automation", "Robotics", "Blockchain"]
    assert [r["sort_order"] for r in rows] == sorted(r["sort_order"] for r in rows)
    by = {r["title"]: r["data"] for r in rows}
    assert by["Welcome to LAX360 Pvt Ltd"]["headline"] == "Ideas Into Innovation. Technology Into Possibilities."
    assert {t for t, d in by.items() if d["franchise_enabled"]} == {"Software & IT Services", "Digital Marketing", "Education & Training"}  # no franchise button on AI, Robotics, Blockchain
    for r in rows:
        cs._validate(db, "welcome_card", r["title"], dict(r["data"]))  # every card passes the same checks as the admin form
        if r["data"].get("explore_link"):
            assert r["data"]["explore_link"] in EXISTING_PAGES  # links point only at pages that exist
    cs._validate(db, "welcome_page", "Welcome Experience settings", dict(seed.SETTINGS["data"]))


def test_robotics_and_blockchain_are_described_as_planned_not_launched():
    by = {r["title"]: r["data"] for r in seed.card_rows()}
    for name in ("Robotics", "Blockchain"):
        assert by[name]["status_label"] == "Planned initiative"
        text = by[name]["description"].lower()
        assert "planning" in text or "plans" in text
        assert not any(w in text for w in ("available now", "launched", "commercially available", "we offer"))


def test_welcome_cards_are_managed_validated_ordered_and_published(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    base = {"theme": "ai", "headline": "A headline", "description": "A description.", "explore_label": "Explore", "explore_link": "/services/ai", "franchise_enabled": False}
    post = lambda title, **extra: admin.post("/api/admin/content/welcome_card", json={"title": title, "data": {**base, **extra}, "status": "published", "sort_order": 1}, headers=csrf)  # noqa: E731
    ok = post("First card")
    assert ok.status_code == 201, ok.text
    for bad in ({"theme": "neon"}, {"explore_link": "javascript:alert(1)"}, {"headline": ""}, {"description": ""}):
        assert post("Bad", **bad).status_code == 422, bad
    assert post("Second card", theme="robotics", status_label="Planned initiative").status_code == 201
    items = client.get("/api/public/content?kind=welcome_card").json()["items"]
    assert {i["title"] for i in items} == {"First card", "Second card"}
    switch = admin.post("/api/admin/content/welcome_page", json={"title": "Welcome Experience settings", "data": {"enabled": False}, "status": "published"}, headers=csrf)
    assert switch.status_code == 201, switch.text
    page = client.get("/api/public/content?kind=welcome_page").json()["items"]
    assert page[0]["data"]["enabled"] is False  # the master switch is what the website reads
    assert admin.patch(f"/api/admin/content/item/{ok.json()['id']}", json={"status": "draft"}, headers=csrf).status_code == 200
    assert [i["title"] for i in client.get("/api/public/content?kind=welcome_card").json()["items"]] == ["Second card"]  # unpublished = hidden
