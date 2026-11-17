"""Social media links and contact details: one managed list with display locations, validation, de-duplication, ordering and the public shape."""

from tests.admin_helpers import staff

SOCIAL = {"kind": "social", "type": "instagram", "value": "https://www.instagram.com/lax360pvtltd", "locations": ["header", "footer"], "is_active": True}
PHONE = {"kind": "contact", "type": "phone", "value": "+91 95666 79928", "note": "Salem", "locations": ["footer", "contact"], "is_active": True}


def public(client):
    return client.get("/api/public/site").json()["channels"]


def test_migration_seeded_the_existing_links_and_contacts(app, db, client):
    # the test fixture empties the table; the migration itself is covered by test_migrations. Here: an empty table gives an empty list, never an error.
    assert public(client) == []


def test_admin_adds_edits_disables_and_deletes_and_the_website_follows(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["settings"])
    r = admin.post("/api/admin/channels", json=SOCIAL, headers=csrf)
    assert r.status_code == 201, r.text
    item = r.json()
    assert item["label"] == "Instagram" and item["href"] == SOCIAL["value"]
    shown = public(client)
    assert [c["type"] for c in shown] == ["instagram"] and shown[0]["locations"] == ["header", "footer"]  # the same link in two places

    edited = {**SOCIAL, "locations": ["header", "footer", "contact", "social_band"], "label": "Our Instagram"}
    assert admin.put(f"/api/admin/channels/{item['id']}", json=edited, headers=csrf).status_code == 200
    assert public(client)[0]["label"] == "Our Instagram" and len(public(client)[0]["locations"]) == 4

    assert admin.put(f"/api/admin/channels/{item['id']}", json={**edited, "is_active": False}, headers=csrf).status_code == 200
    assert public(client) == []  # disabled: hidden everywhere
    assert [c["is_active"] for c in admin.get("/api/admin/channels").json()["items"]] == [False]  # but still in the admin list

    assert admin.delete(f"/api/admin/channels/{item['id']}", headers=csrf).status_code == 204
    assert admin.get("/api/admin/channels").json()["items"] == []


def test_values_are_validated_by_type(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["settings"])
    post = lambda body: admin.post("/api/admin/channels", json=body, headers=csrf)  # noqa: E731
    for bad in ("javascript:alert(1)", "http://www.instagram.com/x", "/relative", "https://evil.example.com/lax360", "instagram.com/x"):
        assert post({**SOCIAL, "value": bad}).status_code == 422, bad
    assert post({**SOCIAL, "type": "tiktok"}).status_code == 422  # not a platform (use the custom one)
    assert post({**SOCIAL, "type": "custom", "label": "Our blog", "value": "https://blog.example.com/lax360"}).status_code == 201
    assert post({**SOCIAL, "type": "custom", "value": "https://blog2.example.com"}).status_code == 422  # a custom platform needs a name
    assert post({**PHONE, "value": "call me"}).status_code == 422
    assert post({"kind": "contact", "type": "email", "value": "not-an-email", "locations": ["footer"]}).status_code == 422
    assert post({**SOCIAL, "locations": ["sidebar"]}).status_code == 422
    assert post({"kind": "contact", "type": "email", "value": "hi@example.com", "locations": ["social_band"]}).status_code == 422  # a contact detail has no social section
    wa = post({"kind": "social", "type": "whatsapp", "value": "+91 98765 43210", "locations": ["footer"]})
    assert wa.status_code == 201 and wa.json()["value"] == "https://wa.me/919876543210"  # a number becomes its chat link
    phone = post(PHONE).json()
    assert phone["href"] == "tel:+919566679928"
    addr = post({"kind": "contact", "type": "address", "value": "1st Floor, CPS Tower\nSalem", "locations": ["contact"]}).json()
    assert addr["href"] is None
    mail = post({"kind": "contact", "type": "enquiry", "label": "Sales enquiries", "value": "sales@example.com", "locations": ["contact"]}).json()
    assert mail["href"] == "mailto:sales@example.com"


def test_duplicates_are_refused_but_one_item_can_be_shown_in_many_places(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["settings"])
    assert admin.post("/api/admin/channels", json=SOCIAL, headers=csrf).status_code == 201
    for same in ("https://instagram.com/lax360pvtltd/", "https://www.instagram.com/LAX360pvtltd"):
        assert admin.post("/api/admin/channels", json={**SOCIAL, "value": same}, headers=csrf).status_code == 409, same
    assert admin.post("/api/admin/channels", json=PHONE, headers=csrf).status_code == 201
    assert admin.post("/api/admin/channels", json={**PHONE, "value": "+919566679928"}, headers=csrf).status_code == 409  # the same number written differently


def test_reordering_changes_the_order_on_the_website(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["settings"])
    ids = []
    for t, url in (("instagram", "https://instagram.com/a"), ("facebook", "https://facebook.com/b"), ("github", "https://github.com/c")):
        ids.append(admin.post("/api/admin/channels", json={**SOCIAL, "type": t, "value": url}, headers=csrf).json()["id"])
    assert [c["type"] for c in public(client)] == ["instagram", "facebook", "github"]
    assert admin.post("/api/admin/channels/reorder", json={"ids": [ids[2], ids[0], ids[1]]}, headers=csrf).status_code == 200
    assert [c["type"] for c in public(client)] == ["github", "instagram", "facebook"]
    assert admin.post("/api/admin/channels/reorder", json={"ids": [ids[0], "00000000-0000-0000-0000-000000000000"]}, headers=csrf).status_code == 422


def test_items_with_no_location_are_not_public_and_permissions_are_enforced(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["settings"])
    admin.post("/api/admin/channels", json={**SOCIAL, "locations": []}, headers=csrf)
    assert public(client) == []
    other, ocsrf, _ = staff(app, db, email="media@example.com", permissions=["media"])
    assert other.get("/api/admin/channels").status_code == 403
    assert other.post("/api/admin/channels", json=SOCIAL, headers=ocsrf).status_code == 403
    assert client.get("/api/admin/channels").status_code in (401, 403)


# ---- branch-wise and partner-wise lists ----------------------------------------------------------------------------------------------------------
def make_partner(admin, csrf, title="CADPOINT"):
    r = admin.post("/api/admin/content/network_partner", json={"title": title, "status": "published", "data": {"category": "authorized", "description": "A partner company.", "enabled": True}}, headers=csrf)
    assert r.status_code == 201, r.text
    return r.json()["slug"]


def owned(client):
    return client.get("/api/public/site").json()["owned"]


def test_each_branch_and_partner_has_its_own_independent_list(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["settings", "content"])
    partner = make_partner(admin, csrf)
    other = make_partner(admin, csrf, "Second Partner")
    ig = {"kind": "social", "type": "instagram", "value": "https://www.instagram.com/salem.lax360"}
    assert admin.post("/api/admin/channels", json={**SOCIAL}, headers=csrf).status_code == 201  # a global link
    assert admin.post("/api/admin/channels", json={**ig, "owner_type": "branch", "owner_ref": "salem", "locations": ["header"]}, headers=csrf).status_code == 201
    r = admin.post("/api/admin/channels", json={**ig, "owner_type": "branch", "owner_ref": "bangalore"}, headers=csrf)
    assert r.status_code == 201 and r.json()["locations"] == ["detail"]  # the same profile can belong to another owner; owned items appear in their own section
    assert admin.post("/api/admin/channels", json={**ig, "owner_type": "branch", "owner_ref": "salem"}, headers=csrf).status_code == 409  # but never twice to one owner
    assert admin.post("/api/admin/channels", json={"kind": "social", "type": "linkedin", "value": "https://www.linkedin.com/company/cadpoint", "owner_type": "partner", "owner_ref": partner}, headers=csrf).status_code == 201
    assert admin.post("/api/admin/channels", json={"kind": "contact", "type": "website", "label": "Website", "value": "https://cadpoint.example.com", "owner_type": "partner", "owner_ref": partner}, headers=csrf).status_code == 201

    shown = owned(client)
    assert [c["type"] for c in shown["branch"]["salem"]] == ["instagram"] and [c["type"] for c in shown["branch"]["bangalore"]] == ["instagram"]
    assert {c["type"] for c in shown["partner"][partner]} == {"linkedin", "website"} and other not in shown["partner"]
    assert "mumbai" not in shown["branch"]  # a branch with nothing has nothing
    assert [c["type"] for c in public(client)] == ["instagram"] and public(client)[0]["value"] == SOCIAL["value"]  # the global list is untouched by any of it

    salem = admin.get("/api/admin/channels", params={"owner_type": "branch", "owner_ref": "salem"}).json()["items"]
    assert len(salem) == 1 and salem[0]["owner_ref"] == "salem"
    assert len(admin.get("/api/admin/channels").json()["items"]) == 1  # the global list shows only global items
    assert admin.get("/api/admin/channels", params={"owner_type": "branch"}).status_code == 422


def test_owner_must_exist_and_cannot_change_and_branch_delete_removes_its_links(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["settings"])
    base = {"kind": "social", "type": "instagram", "value": "https://www.instagram.com/x"}
    assert admin.post("/api/admin/channels", json={**base, "owner_type": "branch", "owner_ref": "atlantis"}, headers=csrf).status_code == 422
    assert admin.post("/api/admin/channels", json={**base, "owner_type": "partner", "owner_ref": "nobody"}, headers=csrf).status_code == 422
    assert admin.post("/api/admin/channels", json={**base, "owner_type": "branch"}, headers=csrf).status_code == 422  # a branch needs its slug
    made = admin.post("/api/admin/channels", json={**base, "owner_type": "branch", "owner_ref": "salem"}, headers=csrf).json()
    moved = admin.put(f"/api/admin/channels/{made['id']}", json={**base, "owner_type": "branch", "owner_ref": "mumbai"}, headers=csrf).json()
    assert moved["owner_ref"] == "salem"  # the owner never changes
    owners = admin.get("/api/admin/channels/owners").json()
    assert next(b for b in owners["branches"] if b["slug"] == "salem")["count"] == 1
    new = admin.post("/api/admin/branches", json={"name": "LAX360 Chennai", "city": "Chennai", "address": "Anna Salai"}, headers=csrf).json()
    assert admin.post("/api/admin/channels", json={**base, "owner_type": "branch", "owner_ref": new["slug"]}, headers=csrf).status_code == 201  # a future branch works with no code change
    assert admin.delete(f"/api/admin/branches/{new['id']}", headers=csrf).status_code == 204
    assert new["slug"] not in owned(client)["branch"]  # its links went with it
