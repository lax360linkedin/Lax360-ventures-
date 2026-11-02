from sqlalchemy import select

from app.models import AuditLog, ContentItem
from tests.admin_helpers import staff

FAQ = {"title": "Do you work with startups?", "data": {"group": "home", "answer": "Yes, we work with businesses of every size."}}


def test_content_kinds_describe_only_what_the_site_actually_uses(app, db):
    admin, _, _ = staff(app, db, permissions=["content"])
    body = admin.get("/api/admin/content/kinds").json()
    assert [k["kind"] for k in body["kinds"]] == ["hero", "faq", "project"]
    assert all(f["name"] for k in body["kinds"] for f in k["fields"])
    assert admin.get("/api/admin/content/testimonial").status_code == 404  # not a managed section


def test_draft_is_private_until_published_then_unpublish_hides_it_again(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    created = admin.post("/api/admin/content/faq", json=FAQ, headers=csrf)
    assert created.status_code == 201 and created.json()["status"] == "draft"
    item_id = created.json()["id"]
    assert client.get("/api/public/content?kind=faq").json()["items"] == []  # drafts never leak

    r = admin.patch(f"/api/admin/content/item/{item_id}", json={"status": "published"}, headers=csrf)
    assert r.status_code == 200 and r.json()["status"] == "published"
    public = client.get("/api/public/content?kind=faq").json()["items"]
    assert [i["title"] for i in public] == ["Do you work with startups?"] and public[0]["data"]["answer"].startswith("Yes")

    admin.patch(f"/api/admin/content/item/{item_id}", json={"status": "draft"}, headers=csrf)
    assert client.get("/api/public/content?kind=faq").json()["items"] == []
    actions = [a for (a,) in db.execute(select(AuditLog.action).where(AuditLog.action.like("content.%")).order_by(AuditLog.created_at))]
    assert actions == ["content.create", "content.publish", "content.unpublish"]


def test_edit_reorder_and_delete(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    a = admin.post("/api/admin/content/faq", json={**FAQ, "status": "published", "sort_order": 2}, headers=csrf).json()
    b = admin.post("/api/admin/content/faq", json={"title": "Where are you based?", "data": {"group": "home", "answer": "Salem, Bangalore and Mumbai."}, "status": "published", "sort_order": 1}, headers=csrf).json()
    assert [i["title"] for i in client.get("/api/public/content?kind=faq").json()["items"]] == ["Where are you based?", "Do you work with startups?"]
    upd = admin.patch(f"/api/admin/content/item/{a['id']}", json={"data": {"group": "home", "answer": "Updated answer."}}, headers=csrf)
    assert upd.status_code == 200 and upd.json()["data"]["answer"] == "Updated answer."
    assert admin.delete(f"/api/admin/content/item/{b['id']}").status_code == 403  # CSRF
    assert admin.delete(f"/api/admin/content/item/{b['id']}", headers=csrf).status_code == 204
    assert len(admin.get("/api/admin/content/faq").json()) == 1
    assert db.scalar(select(ContentItem.id).where(ContentItem.id == b["id"])) is None


def test_content_validation(app, db):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    post = lambda kind, body: admin.post(f"/api/admin/content/{kind}", json=body, headers=csrf)  # noqa: E731
    assert post("faq", {"title": "", "data": {"group": "home", "answer": "A"}}).status_code == 422
    assert "answer" in post("faq", {"title": "Q?", "data": {"group": "home"}}).json()["error"]["fields"]
    assert "group" in post("faq", {"title": "Q?", "data": {"group": "nowhere", "answer": "A"}}).json()["error"]["fields"]
    assert "evil" in post("faq", {"title": "Q?", "data": {"group": "home", "answer": "A", "evil": "x"}}).json()["error"]["fields"]
    assert "answer" in post("faq", {"title": "Q?", "data": {"group": "home", "answer": "x" * 1600}}).json()["error"]["fields"]
    assert post("faq", {"title": "Q?", "data": {"group": "home", "answer": "A"}, "status": "archived"}).status_code == 422
    assert "cta_primary_link" in post("hero", {"data": {"cta_primary_link": "javascript:alert(1)"}}).json()["error"]["fields"]
    assert post("hero", {"data": {"cta_primary_link": "//evil.example"}}).status_code == 422
    assert post("hero", {"data": {"cta_primary_link": "/contact?type=ai"}}).status_code == 201
    assert post("nonsense", {"title": "x"}).status_code == 404


def test_hero_is_a_single_item_and_projects_need_a_division(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    h = admin.post("/api/admin/content/hero", json={"data": {"headline_1": "Build faster,"}, "status": "published"}, headers=csrf)
    assert h.status_code == 201 and h.json()["slug"] == "home"
    assert admin.post("/api/admin/content/hero", json={"data": {}}, headers=csrf).status_code == 409
    assert client.get("/api/public/content?kind=hero").json()["items"][0]["data"]["headline_1"] == "Build faster,"
    bad = admin.post("/api/admin/content/project", json={"title": "ERP rollout", "data": {"summary": "Rolled out an ERP."}}, headers=csrf)
    assert bad.status_code == 422 and "division" in bad.json()["error"]["fields"]
    ok = admin.post("/api/admin/content/project", json={"title": "ERP rollout", "data": {"division": "software", "summary": "Rolled out an ERP."}, "status": "published"}, headers=csrf)
    assert ok.status_code == 201 and ok.json()["slug"].startswith("erp-rollout")


def test_public_content_for_unknown_kinds_is_empty_not_an_error(client):
    assert client.get("/api/public/content?kind=users").json()["items"] == []
    assert client.get("/api/public/content").status_code == 422


# ---- settings --------------------------------------------------------------------------------------
def test_settings_roundtrip_and_only_public_keys_reach_the_website(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["settings", "chatbot"])
    values = {"tagline": "360° Execution", "contact_email": "hello@lax360.example", "contact_phone_1": "+91 95666 79928", "social_linkedin": "https://www.linkedin.com/company/lax360",
              "footer_text": "© LAX360", "maintenance_mode": False, "whatsapp_number": "919566679958"}
    r = admin.put("/api/admin/settings", json={"values": values}, headers=csrf)
    assert r.status_code == 200 and r.json()["values"]["tagline"] == "360° Execution"
    assert admin.get("/api/admin/settings").json()["values"]["contact_email"] == "hello@lax360.example"
    admin.put("/api/admin/chatbot/settings", json={"values": {"chatbot_instructions": "Office hours are 10-6 (INTERNAL NOTE)", "chatbot_welcome": "Hello!"}}, headers=csrf)
    site = client.get("/api/public/site").json()["settings"]
    assert site["tagline"] == "360° Execution" and site["chatbot_welcome"] == "Hello!" and site["maintenance_mode"] is False
    assert "chatbot_instructions" not in site and "chatbot_fallback" not in site and "INTERNAL NOTE" not in str(site)


def test_settings_validation_and_blank_resets(app, db):
    admin, csrf, _ = staff(app, db, permissions=["settings"])
    put = lambda v: admin.put("/api/admin/settings", json={"values": v}, headers=csrf)  # noqa: E731
    fields = put({"contact_email": "nope", "social_x": "javascript:alert(1)", "contact_phone_1": "abc", "maintenance_mode": "yes", "tagline": "x" * 500}).json()["error"]["fields"]
    assert set(fields) == {"contact_email", "social_x", "contact_phone_1", "maintenance_mode", "tagline"}
    assert "api_key" in put({"api_key": "sk-123"}).json()["error"]["fields"]  # secrets cannot be stored as settings
    assert "chatbot_welcome" in put({"chatbot_welcome": "hi"}).json()["error"]["fields"]  # chatbot keys belong to the chatbot module
    put({"tagline": "Acme"})
    assert admin.get("/api/admin/settings").json()["values"]["tagline"] == "Acme"
    put({"tagline": ""})  # blank = remove the override, website default applies again
    assert "tagline" not in admin.get("/api/admin/settings").json()["values"]


def test_settings_and_chatbot_permissions_are_independent(app, db):
    only_settings, csrf1, _ = staff(app, db, permissions=["settings"], email="s@example.com")
    only_chatbot, csrf2, _ = staff(app, db, permissions=["chatbot"], email="c@example.com")
    assert only_settings.put("/api/admin/chatbot/settings", json={"values": {"chatbot_enabled": False}}, headers=csrf1).status_code == 403
    assert only_chatbot.put("/api/admin/settings", json={"values": {"tagline": "Z"}}, headers=csrf2).status_code == 403
    assert only_chatbot.put("/api/admin/chatbot/settings", json={"values": {"chatbot_enabled": False}}, headers=csrf2).status_code == 200


def test_settings_changes_are_audited_by_key_not_value(app, db):
    admin, csrf, _ = staff(app, db, permissions=["settings"])
    admin.put("/api/admin/settings", json={"values": {"footer_text": "A very specific footer sentence"}}, headers=csrf)
    log = db.scalar(select(AuditLog).where(AuditLog.action == "settings.update"))
    assert log.detail == {"keys": ["footer_text"]} and "specific footer" not in str(log.detail)
