"""Branch locations: the Salem map, admin add / edit / disable / delete, and the strict handling of the Google Maps embed."""

import pytest

from app.core.errors import ApiError
from app.services.branch_service import parse_map_embed
from tests.admin_helpers import staff

EMBED = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1380!2d78.14!3d11.67!5e0!3m2!1sen!2sin"
IFRAME = f'<iframe src="{EMBED}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>'


def test_only_salem_has_a_map_after_the_migration_and_the_public_api_serves_it(client):
    by = {b["slug"]: b for b in client.get("/api/branches").json()}
    assert by["salem"]["map_embed_url"].startswith("https://www.google.com/maps/embed?pb=") and "Lax360%20Pvt%20ltd" in by["salem"]["map_embed_url"]
    assert by["bangalore"]["map_embed_url"] is None and by["mumbai"]["map_embed_url"] is None  # the others are added later, in the admin panel


def test_the_embed_address_is_extracted_from_pasted_iframe_code_and_nothing_else_is_accepted():
    assert parse_map_embed(IFRAME) == EMBED and parse_map_embed(EMBED) == EMBED and parse_map_embed("  ") is None
    for bad in ("https://evil.example/maps/embed?pb=1", "http://www.google.com/maps/embed?pb=1", "javascript:alert(1)", "https://www.google.com.evil.com/maps/embed?pb=1",
                '<iframe src="https://www.google.com/maps/search/?api=1&query=x"></iframe>', 'https://www.google.com/maps/embed?pb=1"onload="x', "<script>alert(1)</script>"):
        with pytest.raises(ApiError):
            parse_map_embed(bad)


def test_an_administrator_adds_edits_disables_and_deletes_branches_without_code_changes(app, db, client):
    admin, csrf, _ = staff(app, db, role="admin", email="settings@example.com", permissions=["settings"])
    body = {"name": "LAX360 Pvt Ltd — Chennai Branch", "city": "Chennai", "address": "1 Mount Road\nChennai, Tamil Nadu – 600002", "phone": "+91 90000 00000", "map": IFRAME, "is_active": True, "sort_order": 40}
    r = admin.post("/api/admin/branches", json=body, headers=csrf)
    assert r.status_code == 201 and r.json()["map_embed_url"] == EMBED and r.json()["slug"] == "chennai"  # stored as the address only, never the pasted HTML
    bid = r.json()["id"]
    live = {b["slug"]: b for b in client.get("/api/branches").json()}
    assert live["chennai"]["map_embed_url"] == EMBED and live["chennai"]["address_lines"][0] == "1 Mount Road"  # a published branch is on the website at once
    assert admin.post("/api/admin/branches", json={**body, "city": "chennai"}, headers=csrf).status_code == 409  # one branch per city
    assert admin.post("/api/admin/branches", json={**body, "city": "Madurai", "map": "https://evil.example/x"}, headers=csrf).status_code == 422
    other = "https://www.google.com/maps/embed?pb=!1m2!5e0"
    assert admin.put(f"/api/admin/branches/{bid}", json={**body, "map": other}, headers=csrf).json()["map_embed_url"] == other  # replace the map
    assert admin.put(f"/api/admin/branches/{bid}", json={**body, "map": ""}, headers=csrf).json()["map_embed_url"] is None  # remove it
    assert admin.put(f"/api/admin/branches/{bid}", json={**body, "is_active": False}, headers=csrf).status_code == 200  # disable
    assert "chennai" not in {b["slug"] for b in client.get("/api/branches").json()}  # a disabled branch is not public ...
    assert "chennai" in {b["slug"] for b in admin.get("/api/admin/branches").json()}  # ... but stays in the admin list
    assert admin.delete(f"/api/admin/branches/{bid}", headers=csrf).status_code == 204
    assert "chennai" not in {b["slug"] for b in admin.get("/api/admin/branches").json()}


def test_branch_management_needs_the_settings_permission(app, db):
    limited, csrf, _ = staff(app, db, role="admin", email="content@example.com", permissions=["content"])
    assert limited.get("/api/admin/branches").status_code == 403
    assert limited.post("/api/admin/branches", json={"name": "X Branch", "city": "Xville"}, headers=csrf).status_code == 403
