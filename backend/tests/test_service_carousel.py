"""The Services & industries carousel below the home header: cards and settings are managed content, validated, ordered and shown in the Pages module."""

from tests.admin_helpers import staff
from tests.test_cms import boss, fake, upload  # noqa: F401  (fixtures and helper)

CARD = {"title": "Healthcare", "status": "published", "sort_order": 10, "data": {"tag": "Industry", "description": "Tools for clinics.", "link": "/industries/healthcare-medical", "builtin_image": "/assets/industries/healthcare.webp", "enabled": True}}


def public(client, kind="service_card"):
    return client.get(f"/api/public/content?kind={kind}").json()["items"]


def test_cards_are_managed_validated_ordered_and_hidden_when_unpublished(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    r = admin.post("/api/admin/content/service_card", json=CARD, headers=csrf)
    assert r.status_code == 201, r.text
    second = admin.post("/api/admin/content/service_card", json={**CARD, "title": "Finance", "sort_order": 20, "data": {**CARD["data"], "link": "https://example.com/finance", "builtin_image": "/assets/industries/finance.webp"}}, headers=csrf).json()
    assert [i["title"] for i in public(client)] == ["Healthcare", "Finance"]
    for bad in ({"link": "javascript:alert(1)"}, {"builtin_image": "/assets/../secret.png"}, {"builtin_image": "https://evil.example/x.png"}, {"description": ""}):
        assert admin.post("/api/admin/content/service_card", json={**CARD, "title": "Bad", "data": {**CARD["data"], **bad}}, headers=csrf).status_code == 422, bad
    assert admin.put("/api/admin/content/service_card/order", json={"ids": [second["id"], r.json()["id"]]}, headers=csrf).status_code == 200
    assert [i["title"] for i in public(client)] == ["Finance", "Healthcare"]
    assert admin.patch(f"/api/admin/content/item/{second['id']}", json={"status": "draft"}, headers=csrf).status_code == 200
    assert [i["title"] for i in public(client)] == ["Healthcare"]  # a draft is hidden (and previewable by the admin)


def test_settings_are_a_single_validated_item(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    body = {"title": "Services & industries carousel settings", "status": "published", "data": {"enabled": True, "title": "What we do", "speed": "fast", "scroll": False, "pause_on_hover": True}}
    assert admin.post("/api/admin/content/service_carousel_page", json=body, headers=csrf).status_code == 201
    assert public(client, "service_carousel_page")[0]["data"]["speed"] == "fast"
    assert admin.post("/api/admin/content/service_carousel_page", json=body, headers=csrf).status_code == 409  # only one
    assert admin.post("/api/admin/content/service_carousel_page", json={**body, "data": {"speed": "warp"}}, headers=csrf).status_code == 422


def test_pages_module_lists_the_cards_with_their_current_pictures_below_the_header(fake, boss):  # noqa: F811
    c, csrf = boss
    assert c.post("/api/admin/content/service_card", json=CARD, headers=csrf).status_code == 201
    home = next(p for p in c.get("/api/admin/page-images").json()["pages"] if p["key"] == "home")
    keys = [s["key"] for s in home["sections"]]
    assert keys.index("service-carousel") == 1 and keys[0] == "header"  # directly below the header section, above the welcome sections
    slot = next(s for s in home["sections"] if s["key"] == "service-carousel")["items"][0]["slots"][0]
    assert slot["builtin"] == "/assets/industries/healthcare.webp" and slot["asset_id"] is None  # the picture the website shows now
    a = upload(boss, name="a.png", public="true").json()
    item = next(s for s in home["sections"] if s["key"] == "service-carousel")["items"][0]
    assert c.put("/api/admin/page-images/slot", json={"item_id": item["id"], "field": "image", "asset_id": a["id"]}, headers=csrf).status_code == 200
    assert public(c)[0]["data"]["image"]
