from sqlalchemy import select

from app.models import AuditLog, ContentItem
from tests.admin_helpers import staff

FAQ = {"title": "Do you work with startups?", "data": {"group": "home", "answer": "Yes, we work with businesses of every size."}}


def test_content_kinds_describe_only_what_the_site_actually_uses(app, db):
    admin, _, _ = staff(app, db, permissions=["content"])
    body = admin.get("/api/admin/content/kinds").json()
    # an admin who only holds the `content` module sees the homepage / about / portfolio kinds; services, careers and navigation are separate modules
    assert [k["kind"] for k in body["kinds"]] == ["hero", "section", "faq", "about_block", "industry", "network_partner", "team_member", "article", "client", "testimonial", "project"]
    assert all(f["name"] for k in body["kinds"] for f in k["fields"])
    assert admin.get("/api/admin/content/pricing_table").status_code == 404  # not a managed section


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


def test_contact_bar_settings_and_social_links_are_configurable_and_validated(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["settings", "navigation"])
    values = {"contact_bar_enabled": False, "contact_bar_pages": "home,contact", "social_band_enabled": True, "social_robot_enabled": False, "social_youtube": "https://www.youtube.com/@lax360"}
    assert admin.put("/api/admin/settings", json={"values": values}, headers=csrf).status_code == 200
    site = client.get("/api/public/site").json()["settings"]
    assert site["contact_bar_enabled"] is False and site["contact_bar_pages"] == "home,contact" and site["social_robot_enabled"] is False and site["social_youtube"].endswith("@lax360")
    assert admin.put("/api/admin/settings", json={"values": {"contact_bar_enabled": "no"}}, headers=csrf).status_code == 422

    item = {"title": "Instagram", "data": {"platform": "instagram", "url": "https://www.instagram.com/lax360pvtltd", "enabled": True}, "status": "published", "sort_order": 1}
    assert admin.post("/api/admin/content/social_link", json=item, headers=csrf).status_code == 201
    for bad in ("javascript:alert(1)", "http://insecure.example", "/relative"):
        r = admin.post("/api/admin/content/social_link", json={**item, "data": {**item["data"], "url": bad}}, headers=csrf)
        assert r.status_code == 422, bad  # only full https profile addresses are accepted
    assert admin.post("/api/admin/content/social_link", json={**item, "data": {**item["data"], "platform": "tiktok"}}, headers=csrf).status_code == 422
    public = client.get("/api/public/content?kind=social_link").json()["items"]
    assert [i["data"]["platform"] for i in public] == ["instagram"]


def test_industries_and_insights_are_managed_published_unpublished_and_deleted(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    industry = {"title": "Healthcare", "data": {"summary": "Booking, records and patient communication.", "solutions": "Appointment system\nPatient portal"}, "status": "published", "sort_order": 1}
    r = admin.post("/api/admin/content/industry", json=industry, headers=csrf)
    assert r.status_code == 201
    assert admin.post("/api/admin/content/industry", json={**industry, "title": "x", "data": {}}, headers=csrf).status_code == 422  # summary is required

    article = {"title": "What AI agents change for small teams", "data": {"category": "ai", "published_on": "2026-11-03", "excerpt": "A short summary.", "body": "First paragraph.\n\n## A heading\n\nSecond paragraph."}, "status": "published", "sort_order": 1}
    r = admin.post("/api/admin/content/article", json=article, headers=csrf)
    assert r.status_code == 201
    article_id = r.json()["id"]
    for bad in ({"category": "gossip"}, {"published_on": "03/11/2026"}, {"published_on": "2026-13-45"}, {"body": ""}):
        r = admin.post("/api/admin/content/article", json={**article, "data": {**article["data"], **bad}}, headers=csrf)
        assert r.status_code == 422, bad

    public = client.get("/api/public/content?kind=article").json()["items"]
    assert [i["title"] for i in public] == [article["title"]] and public[0]["slug"] and public[0]["data"]["published_on"] == "2026-11-03"
    assert len(client.get("/api/public/content?kind=industry").json()["items"]) == 1

    assert admin.patch(f"/api/admin/content/item/{article_id}", json={"status": "draft"}, headers=csrf).status_code == 200
    assert client.get("/api/public/content?kind=article").json()["items"] == []  # unpublished = not on the website
    assert admin.delete(f"/api/admin/content/item/{article_id}", headers=csrf).status_code in (200, 204)


def test_network_partners_and_team_members_are_managed_validated_ordered_and_removable(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    partner = {"title": "Example Partner", "data": {"category": "authorized", "location": "Salem", "description": "Confirmed authorized partner."}, "status": "published", "sort_order": 1}
    assert admin.post("/api/admin/content/network_partner", json=partner, headers=csrf).status_code == 201
    for bad in ({"category": "friend"}, {"website_link": "javascript:alert(1)"}, {"website_link": "ftp://x.example"}, {"description": ""}):
        assert admin.post("/api/admin/content/network_partner", json={**partner, "data": {**partner["data"], **bad}}, headers=csrf).status_code == 422, bad
    ok = admin.post("/api/admin/content/network_partner", json={**partner, "title": "Second", "data": {**partner["data"], "category": "technology", "website_link": "https://example.com"}}, headers=csrf)
    assert ok.status_code == 201
    assert [i["title"] for i in client.get("/api/public/content?kind=network_partner").json()["items"]] == ["Example Partner", "Second"]

    def member(name, **extra):
        return {"title": name, "data": {"group": "software", "designation": "Engineer", "bio": "Builds things.", **extra}, "status": "published", "sort_order": 1}
    ids = []
    for name in ("Asha", "Ravi"):
        r = admin.post("/api/admin/content/team_member", json=member(name), headers=csrf)
        assert r.status_code == 201
        ids.append(r.json()["id"])
    for bad in ({"group": "interns"}, {"linkedin_link": "https://evil.example/in/x"}, {"linkedin_link": "http://www.linkedin.com/in/x"}, {"designation": ""}):
        assert admin.post("/api/admin/content/team_member", json=member("Bad", **bad), headers=csrf).status_code == 422, bad
    assert admin.post("/api/admin/content/team_member", json=member("Linked", linkedin_link="https://www.linkedin.com/in/linked"), headers=csrf).status_code == 201

    assert admin.put("/api/admin/content/team_member/order", json={"ids": list(reversed(ids))}, headers=csrf).status_code in (200, 204, 409)
    assert admin.patch(f"/api/admin/content/item/{ids[0]}", json={"status": "draft"}, headers=csrf).status_code == 200
    names = [i["title"] for i in client.get("/api/public/content?kind=team_member").json()["items"]]
    assert "Asha" not in names and "Ravi" in names  # unpublished profiles are not public
    assert admin.delete(f"/api/admin/content/item/{ids[1]}", headers=csrf).status_code in (200, 204)
    assert "Ravi" not in [i["title"] for i in client.get("/api/public/content?kind=team_member").json()["items"]]


def test_clients_are_managed_ordered_and_removable_and_never_invented(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    assert client.get("/api/public/content?kind=client").json()["items"] == []  # nothing is shown until an administrator adds a real client
    ids = []
    for name in ("Client A", "Client B"):
        r = admin.post("/api/admin/content/client", json={"title": name, "data": {"website_link": "https://example.com"}, "status": "published", "sort_order": len(ids) + 1}, headers=csrf)
        assert r.status_code == 201
        ids.append(r.json()["id"])
    assert admin.post("/api/admin/content/client", json={"title": "", "data": {}, "status": "published", "sort_order": 1}, headers=csrf).status_code == 422  # a name is required
    assert admin.post("/api/admin/content/client", json={"title": "Bad", "data": {"website_link": "javascript:alert(1)"}, "status": "published", "sort_order": 1}, headers=csrf).status_code == 422
    assert admin.post("/api/admin/content/client", json={"title": "Bad", "data": {"logo": "not-a-media-id"}, "status": "published", "sort_order": 1}, headers=csrf).status_code == 422
    assert [i["title"] for i in client.get("/api/public/content?kind=client").json()["items"]] == ["Client A", "Client B"]
    assert admin.put("/api/admin/content/client/order", json={"ids": list(reversed(ids))}, headers=csrf).status_code in (200, 204)
    assert [i["title"] for i in client.get("/api/public/content?kind=client").json()["items"]] == ["Client B", "Client A"]
    assert admin.delete(f"/api/admin/content/item/{ids[0]}", headers=csrf).status_code in (200, 204)
    assert [i["title"] for i in client.get("/api/public/content?kind=client").json()["items"]] == ["Client B"]


def test_sample_client_entries_carry_builtin_artwork_flag_and_can_be_edited_or_deleted(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    sample = {"title": "Sample Co", "data": {"logo_url": "/assets/clients/sample-1.svg", "is_sample": True}, "status": "published", "sort_order": 1}
    r = admin.post("/api/admin/content/client", json=sample, headers=csrf)
    assert r.status_code == 201
    item_id = r.json()["id"]
    for bad in ("https://evil.example/x.svg", "/assets/other/x.svg", "/assets/clients/../x.svg", "javascript:alert(1)"):
        assert admin.post("/api/admin/content/client", json={**sample, "title": "Bad", "data": {**sample["data"], "logo_url": bad}}, headers=csrf).status_code == 422, bad
    public = client.get("/api/public/content?kind=client").json()["items"]
    assert public[0]["data"]["is_sample"] is True and public[0]["data"]["logo_url"].endswith("sample-1.svg")
    # replacing a sample with a real client: rename it and clear the sample flag; then delete
    assert admin.patch(f"/api/admin/content/item/{item_id}", json={"title": "Real Client Ltd", "data": {"website_link": "https://example.com", "is_sample": False}}, headers=csrf).status_code == 200
    edited = client.get("/api/public/content?kind=client").json()["items"][0]
    assert edited["title"] == "Real Client Ltd" and not edited["data"].get("is_sample") and "logo_url" not in edited["data"]
    assert admin.delete(f"/api/admin/content/item/{item_id}", headers=csrf).status_code in (200, 204)
    assert client.get("/api/public/content?kind=client").json()["items"] == []


def test_testimonials_are_managed_typed_reorderable_unpublishable_and_deletable(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    assert client.get("/api/public/content?kind=testimonial").json()["items"] == []
    base = {"person_type": "client", "role": "Manager", "organization": "Sample Co", "quote": "Great work.", "is_sample": True}
    ids = []
    for name, ptype in (("Asha", "client"), ("Ravi", "student")):
        r = admin.post("/api/admin/content/testimonial", json={"title": name, "data": {**base, "person_type": ptype}, "status": "published", "sort_order": len(ids) + 1}, headers=csrf)
        assert r.status_code == 201
        ids.append(r.json()["id"])
    for bad in ({"person_type": "visitor"}, {"role": ""}, {"quote": ""}, {"quote": "x" * 701}, {"photo": "not-a-media-id"}):
        assert admin.post("/api/admin/content/testimonial", json={"title": "Bad", "data": {**base, **bad}, "status": "published", "sort_order": 1}, headers=csrf).status_code == 422, bad
    assert admin.post("/api/admin/content/testimonial", json={"title": "", "data": base, "status": "published", "sort_order": 1}, headers=csrf).status_code == 422
    pub = client.get("/api/public/content?kind=testimonial").json()["items"]
    assert [i["title"] for i in pub] == ["Asha", "Ravi"] and [i["data"]["person_type"] for i in pub] == ["client", "student"] and pub[0]["data"]["is_sample"] is True
    assert admin.put("/api/admin/content/testimonial/order", json={"ids": list(reversed(ids))}, headers=csrf).status_code in (200, 204)
    assert [i["title"] for i in client.get("/api/public/content?kind=testimonial").json()["items"]] == ["Ravi", "Asha"]
    assert admin.patch(f"/api/admin/content/item/{ids[0]}", json={"status": "draft"}, headers=csrf).status_code == 200
    assert [i["title"] for i in client.get("/api/public/content?kind=testimonial").json()["items"]] == ["Ravi"]
    assert admin.patch(f"/api/admin/content/item/{ids[1]}", json={"data": {**base, "person_type": "student", "is_sample": False, "quote": "Edited."}}, headers=csrf).status_code == 200
    edited = client.get("/api/public/content?kind=testimonial").json()["items"][0]["data"]
    assert edited["quote"] == "Edited." and not edited.get("is_sample")
    assert admin.delete(f"/api/admin/content/item/{ids[1]}", headers=csrf).status_code in (200, 204)
    assert client.get("/api/public/content?kind=testimonial").json()["items"] == []
