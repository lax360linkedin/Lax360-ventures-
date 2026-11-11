from sqlalchemy import select

from app.models import AuditLog, ContentItem
from tests.admin_helpers import staff

FAQ = {"title": "Do you work with startups?", "data": {"group": "home", "answer": "Yes, we work with businesses of every size."}}


def test_content_kinds_describe_only_what_the_site_actually_uses(app, db):
    admin, _, _ = staff(app, db, permissions=["content"])
    body = admin.get("/api/admin/content/kinds").json()
    # an admin who only holds the `content` module sees the homepage / about / portfolio kinds; services, careers and navigation are separate modules
    assert [k["kind"] for k in body["kinds"]] == ["hero", "section", "about_section", "faq_category", "faq", "about_block", "industry", "network_category", "network_partner", "software_product", "network_page", "team_member", "team_department", "team_gallery", "team_expertise", "team_page", "article", "client", "testimonial", "project", "product", "product_module", "product_resource", "website", "welcome_page", "welcome_card", "contact_page"]
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


def test_website_theme_is_super_admin_only_validated_and_public(app, db, client):
    plain, csrf1, _ = staff(app, db, permissions=["settings"], email="plain@example.com")
    assert "site_theme" not in {f["key"] for f in plain.get("/api/admin/settings").json()["fields"]}
    assert plain.put("/api/admin/settings", json={"values": {"site_theme": "rose"}}, headers=csrf1).status_code == 403
    boss, csrf2, _ = staff(app, db, role="super_admin", email="boss@example.com")
    field = next(f for f in boss.get("/api/admin/settings").json()["fields"] if f["key"] == "site_theme")
    assert {"dark", "light", "snow", "rose", "sage", "visitor"} <= set(field["options"])
    assert boss.put("/api/admin/settings", json={"values": {"site_theme": "neon"}}, headers=csrf2).status_code == 422
    for theme in ("snow", "rose", "sage"):
        assert boss.put("/api/admin/settings", json={"values": {"site_theme": theme}}, headers=csrf2).status_code == 200
        assert client.get("/api/public/site").json()["settings"]["site_theme"] == theme  # every visitor gets it
    boss.put("/api/admin/settings", json={"values": {"site_theme": ""}}, headers=csrf2)
    assert "site_theme" not in client.get("/api/public/site").json()["settings"]


def test_theme_ids_match_the_frontend_theme_list_and_all_can_be_applied(app, db, client):
    import re
    from pathlib import Path

    from app.services.settings_service import THEMES

    js = (Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "themes.js").read_text(encoding="utf8")
    frontend = set(re.findall(r"\{ id: '([a-z-]+)', category:", js))  # built-in + palette entries
    assert frontend == set(THEMES), frontend ^ set(THEMES)
    assert len(THEMES) == 6 + 22
    boss, csrf, _ = staff(app, db, role="super_admin", email="theme-boss@example.com")
    for theme in THEMES:  # every theme can be saved by a Super Admin and is then public
        assert boss.put("/api/admin/settings", json={"values": {"site_theme": theme}}, headers=csrf).status_code == 200, theme
        assert client.get("/api/public/site").json()["settings"]["site_theme"] == theme


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
    ok = admin.post("/api/admin/content/network_partner", json={**partner, "title": "Second", "data": {**partner["data"], "category": "authorized", "website_link": "https://example.com", "partnership_type": "Authorized reseller", "collaboration": "Joint work.", "related_services": "automation/crm-automation,ai/*"}}, headers=csrf)
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


def test_team_departments_gallery_page_text_and_deactivated_profiles(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    post = lambda kind, body: admin.post(f"/api/admin/content/{kind}", json=body, headers=csrf)  # noqa: E731
    assert post("team_department", {"title": "AI & Automation", "data": {"description": "Builds AI features."}, "status": "published", "sort_order": 1}).status_code == 201
    slug = client.get("/api/public/content?kind=team_department").json()["items"][0]["slug"]
    base = {"designation": "Engineer", "leadership_role": "founder", "department": slug, "expertise": "Python, FastAPI", "twitter_link": "https://x.com/a"}
    ok = post("team_member", {"title": "Asha", "data": base, "status": "published", "sort_order": 1})
    assert ok.status_code == 201
    for bad in ({"department": "nope"}, {"leadership_role": "ceo"}, {"github_link": "javascript:alert(1)"}):
        assert post("team_member", {"title": "Bad", "data": {**base, **bad}, "status": "published", "sort_order": 1}).status_code == 422, bad
    shown = lambda: [i["title"] for i in client.get("/api/public/content?kind=team_member").json()["items"]]  # noqa: E731
    assert shown() == ["Asha"]
    assert admin.patch(f"/api/admin/content/item/{ok.json()['id']}", json={"data": {**base, "active": False}}, headers=csrf).status_code == 200
    assert shown() == []  # deactivated: kept in the admin panel, never public
    assert post("team_gallery", {"title": "Workshop", "data": {"category": "workshops"}, "status": "published", "sort_order": 1}).status_code == 422  # a photo is required
    assert post("team_page", {"title": "Our Team page text", "data": {"hero_title": "The People Behind Innovation."}, "status": "published", "sort_order": 1}).status_code in (200, 201)
    assert client.get("/api/public/content?kind=team_page").json()["items"][0]["data"]["hero_title"] == "The People Behind Innovation."


def test_demo_team_seed_is_valid_flagged_and_complete(app, db):
    from app import seed_team_demo as demo
    from app.services import content_service as cs

    slugs = {d["slug"] for d in demo.DEPARTMENTS}
    assert slugs == {o["value"] for o in cs.TEAM_DEPARTMENTS}
    for d in demo.DEPARTMENTS:
        cs._validate(db, "team_department", d["title"], {"description": d["description"], "overview": d["overview"], "roles": "\n".join(d["roles"]), "responsibilities": "\n".join(d["responsibilities"]), "expertise": d["expertise"]})
        assert sum(1 for p in demo.PEOPLE if p[0] == d["slug"] and p[3]) == 1  # every department has exactly one head
    assert len({p[1] for p in demo.PEOPLE}) == len(demo.PEOPLE)
    for dept, name, designation, head, reports, skills, bio in demo.PEOPLE:
        body = {"department": dept, "designation": designation, "bio": f"{bio} {demo.NOTE}", "expertise": skills, "reports_to": reports, "demo": True, **({"leadership_role": "department_head"} if head else {})}
        cs._validate(db, "team_member", name, body)  # raises if invalid


def test_testimonials_can_be_assigned_to_a_service_page_with_a_rating(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    base = {"person_type": "client", "role": "Manager", "quote": "Great work."}
    post = lambda title, **extra: admin.post("/api/admin/content/testimonial", json={"title": title, "data": {**base, **extra}, "status": "published", "sort_order": 1}, headers=csrf)  # noqa: E731
    assert post("General").status_code == 201
    assert post("Web client", service="software/website-development", rating="5").status_code == 201
    assert post("Bad", service="software/not-a-service").status_code == 422
    assert post("Bad rating", rating="9").status_code == 422
    items = client.get("/api/public/content?kind=testimonial").json()["items"]
    assert {i["title"]: i["data"].get("service") for i in items} == {"General": None, "Web client": "software/website-development"}  # the home page source: every published entry
    from app.service_pages import SERVICE_PAGES, SERVICE_SCOPES
    assert len(SERVICE_PAGES) == len({v for v, _ in SERVICE_PAGES}) >= 40
    for n, (value, _) in enumerate(SERVICE_PAGES):  # a testimonial can be added for EVERY individual service page
        assert post(f"Everyone {n}", service=value).status_code == 201, value
    saved = client.get("/api/public/content?kind=testimonial").json()["items"]
    assert {i["data"].get("service") for i in saved} >= {v for v, _ in SERVICE_PAGES}

    # clients: assigned to one or more services (or a whole category), validated, and kept off the home-only list by the front end via `services`
    cpost = lambda title, **extra: admin.post("/api/admin/content/client", json={"title": title, "data": extra, "status": "published", "sort_order": 1}, headers=csrf)  # noqa: E731
    assert cpost("Acme", description="A client.", services="software/website-development,growth/*").status_code == 201
    assert cpost("Bad", services="software/website-development,nope/x").status_code == 422
    assert any(v == "growth/*" for v, _ in SERVICE_SCOPES)
    acme = next(i for i in client.get("/api/public/content?kind=client").json()["items"] if i["title"] == "Acme")
    assert acme["data"]["services"] == "software/website-development,growth/*" and acme["data"]["description"] == "A client."


def test_service_demo_seed_is_valid_flagged_and_covers_every_service_page(app, db):
    from app import seed_service_demo as demo
    from app.service_pages import SERVICE_PAGES
    from app.services import content_service as cs

    clients, tests = demo.client_rows(), demo.testimonial_rows()
    for kind, rows in (("client", clients), ("testimonial", tests)):
        assert len({r["slug"] for r in rows}) == len(rows)
        for r in rows:
            assert r["data"]["is_sample"] is True  # always labelled as fictional
            cs._validate(db, kind, r["title"], dict(r["data"]))  # raises if the row would be rejected by the admin API
    assert set(demo.SERVICES) == {v for v, _ in SERVICE_PAGES}  # exactly the individual service pages
    by_service = {v: [c["title"] for c in clients if v in c["data"]["services"].split(",")] for v, _ in SERVICE_PAGES}
    for value, _ in SERVICE_PAGES:
        assert len(by_service[value]) >= 3, value  # clients assigned to this exact service, never a whole category
        mine = [t for t in tests if t["data"]["service"] == value]
        assert len(mine) >= 2, value
        for t in mine:  # every speaker's company is one of this service's own clients
            assert t["data"]["organization"].removesuffix(" (sample)") in by_service[value], (value, t["data"]["organization"])
    assert not any("*" in c["data"]["services"] for c in clients)
    import os
    for c in clients:  # every placeholder logo file exists
        assert os.path.exists(os.path.join("..", "frontend", "public", c["data"]["logo_url"].lstrip("/"))), c["data"]["logo_url"]


def test_service_hierarchy_workflow_for_testimonials_and_clients(app, db, client):
    """Add once, choose main service + sub-service, and it shows on the sub-service page, its main service page and the home page (and nowhere else)."""
    admin, csrf, _ = staff(app, db, permissions=["content"])
    sub = lambda cat, svc: client.get(f"/api/public/services/{cat}/{svc}/content").json()  # noqa: E731
    main = lambda cat: client.get(f"/api/public/services/{cat}/content").json()  # noqa: E731
    names = lambda payload, key: sorted(i["title"] for i in payload[key])  # noqa: E731

    t = admin.post("/api/admin/content/testimonial", json={"title": "Rita", "data": {"person_type": "client", "role": "CEO", "quote": "Great RAG work.", "service": "ai/rag-based-ai-solutions"}, "status": "published", "sort_order": 1}, headers=csrf)
    c = admin.post("/api/admin/content/client", json={"title": "Acme AI", "data": {"services": "ai/rag-based-ai-solutions,ai/ai-agent-development", "description": "d"}, "status": "published", "sort_order": 1}, headers=csrf)
    assert t.status_code == 201 and c.status_code == 201
    home_t = [i["title"] for i in client.get("/api/public/content?kind=testimonial").json()["items"]]
    home_c = [i["title"] for i in client.get("/api/public/content?kind=client").json()["items"]]
    assert "Rita" in home_t and "Acme AI" in home_c  # the home page shows every published entry
    assert names(sub("ai", "rag-based-ai-solutions"), "testimonials") == ["Rita"] and names(sub("ai", "rag-based-ai-solutions"), "clients") == ["Acme AI"]
    assert names(sub("ai", "ai-agent-development"), "clients") == ["Acme AI"] and names(sub("ai", "ai-agent-development"), "testimonials") == []  # only the sub-services it was assigned
    assert names(main("ai"), "testimonials") == ["Rita"] and names(main("ai"), "clients") == ["Acme AI"]  # the main page includes its sub-services
    for other in (("ai", "workflow-automation"), ("software", "website-development"), ("growth", "google-ads-management")):
        assert sub(*other) == {"clients": [], "testimonials": []}, other  # unrelated pages never show it
    assert main("software") == {"clients": [], "testimonials": []}

    # an entry assigned to the main service as a whole shows on the main page and on every one of its sub-service pages
    admin.post("/api/admin/content/testimonial", json={"title": "Whole AI", "data": {"person_type": "client", "role": "CTO", "quote": "All AI.", "service": "ai/*"}, "status": "published", "sort_order": 2}, headers=csrf)
    assert "Whole AI" in names(sub("ai", "workflow-automation"), "testimonials") and "Whole AI" in names(main("ai"), "testimonials")
    assert "Whole AI" not in names(sub("software", "website-development"), "testimonials")

    # editing moves it, unpublishing removes it everywhere
    tid = t.json()["id"]
    admin.patch(f"/api/admin/content/item/{tid}", json={"data": {"person_type": "client", "role": "CEO", "quote": "Great RAG work.", "service": "software/website-development"}}, headers=csrf)
    assert "Rita" not in names(sub("ai", "rag-based-ai-solutions"), "testimonials") and "Rita" in names(sub("software", "website-development"), "testimonials") and "Rita" in names(main("software"), "testimonials")
    admin.patch(f"/api/admin/content/item/{tid}", json={"status": "draft"}, headers=csrf)
    assert "Rita" not in names(sub("software", "website-development"), "testimonials") and "Rita" not in [i["title"] for i in client.get("/api/public/content?kind=testimonial").json()["items"]]
    # a hidden-from-home entry still shows on its service pages
    admin.post("/api/admin/content/client", json={"title": "Quiet", "data": {"services": "growth/*", "hide_on_home": True}, "status": "published", "sort_order": 3}, headers=csrf)
    assert "Quiet" in names(sub("growth", "google-ads-management"), "clients") and "Quiet" in names(main("growth"), "clients")


def test_careers_jobs_perks_page_text_and_applications(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["careers"])
    post = lambda kind, body: admin.post(f"/api/admin/content/{kind}", json=body, headers=csrf)  # noqa: E731
    job = {"title": "Frontend Developer", "status": "published", "sort_order": 1, "data": {"department": "Software", "employment_type": "full-time", "work_mode": "hybrid", "experience": "Freshers welcome", "summary": "Build interfaces.",
                                                                                          "description": "Work on React apps.", "responsibilities": "Build UI" + chr(10) + "Write tests", "skills": "React, CSS", "closing_date": "2030-01-31", "featured": True, "open": True}}
    assert post("job", job).status_code == 201
    bad = {**job, "title": "Bad", "data": {**job["data"], "closing_date": "31/01/2030"}}
    assert post("job", bad).status_code == 422 and post("job", {**job, "title": "Bad2", "data": {**job["data"], "work_mode": "teleport"}}).status_code == 422
    closed = {**job, "title": "Closed role", "data": {**job["data"], "open": False}}
    assert post("job", closed).status_code == 201
    titles = [i["title"] for i in client.get("/api/public/content?kind=job").json()["items"]]
    assert titles == ["Frontend Developer"]  # closed openings are never public
    assert post("career_perk", {"title": "Learning time", "data": {"icon": "graduation", "description": "Time set aside to learn."}, "status": "published", "sort_order": 1}).status_code == 201
    assert post("career_perk", {"title": "x", "data": {"icon": "bomb", "description": "d"}, "status": "published", "sort_order": 1}).status_code == 422
    assert post("career_page", {"title": "Career page text", "data": {"hero_title": "Grow here."}, "status": "published", "sort_order": 1}).status_code in (200, 201)
    assert client.get("/api/public/content?kind=career_page").json()["items"][0]["data"]["hero_title"] == "Grow here."
    # an application goes through the existing enquiry API (type "career") with the role and links in `extra`
    body = {"name": "Asha K", "email": "asha@example.com", "phone": "+919566679928", "enquiry_type": "career", "message": "I would like to apply for the role.", "consent": True,
            "extra": {"position": "Frontend Developer", "experience": "2 years", "profile_link": "https://www.linkedin.com/in/asha"}, "source": "career"}
    r = client.post("/api/contact", json=body)
    assert r.status_code in (200, 201), r.text


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


def test_faq_categories_and_where_each_question_appears_are_managed(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    cat = admin.post("/api/admin/content/faq_category", json={"title": "Pricing & Payments", "data": {"description": "Costs"}, "status": "published", "sort_order": 1}, headers=csrf)
    assert cat.status_code == 201
    slug = cat.json()["slug"]
    base = {"group": "home_only", "category": slug, "answer": "It depends on the scope."}
    ok = admin.post("/api/admin/content/faq", json={"title": "How do you set costs?", "data": base, "status": "published", "sort_order": 1}, headers=csrf)
    assert ok.status_code == 201
    legacy = admin.post("/api/admin/content/faq", json={"title": "Old style entry?", "data": {"group": "home", "answer": "Still valid."}, "status": "published", "sort_order": 2}, headers=csrf)
    assert legacy.status_code == 201  # entries without a category (the original format) keep working
    for bad in ({"group": "elsewhere"}, {"category": "no-such-category"}):
        assert admin.post("/api/admin/content/faq", json={"title": "Bad?", "data": {**base, **bad}, "status": "published", "sort_order": 3}, headers=csrf).status_code == 422, bad
    public = client.get("/api/public/content?kind=faq").json()["items"]
    assert [(i["title"], i["data"]["group"], i["data"].get("category")) for i in public] == [("How do you set costs?", "home_only", slug), ("Old style entry?", "home", None)]
    assert [i["title"] for i in client.get("/api/public/content?kind=faq_category").json()["items"]] == ["Pricing & Payments"]
    assert admin.patch(f"/api/admin/content/item/{ok.json()['id']}", json={"status": "draft"}, headers=csrf).status_code == 200
    assert [i["title"] for i in client.get("/api/public/content?kind=faq").json()["items"]] == ["Old style entry?"]
    assert admin.delete(f"/api/admin/content/item/{cat.json()['id']}", headers=csrf).status_code in (200, 204)


def test_about_page_sections_can_be_hidden_and_story_steps_managed(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    hide = {"title": "Hide the motto", "data": {"key": "motto", "enabled": False}, "status": "published", "sort_order": 1}
    assert admin.post("/api/admin/content/about_section", json=hide, headers=csrf).status_code == 201
    assert admin.post("/api/admin/content/about_section", json={**hide, "title": "Again"}, headers=csrf).status_code == 409  # one entry per section
    assert admin.post("/api/admin/content/about_section", json={**hide, "title": "Bad", "data": {"key": "hero", "enabled": False}}, headers=csrf).status_code == 422
    public = client.get("/api/public/content?kind=about_section").json()["items"]
    assert [(i["data"]["key"], i["data"]["enabled"]) for i in public] == [("motto", False)]
    step = {"title": "Where it started", "data": {"block": "story", "text": "A first step in the story."}, "status": "published", "sort_order": 1}
    assert admin.post("/api/admin/content/about_block", json=step, headers=csrf).status_code == 201
    assert [i["data"]["block"] for i in client.get("/api/public/content?kind=about_block").json()["items"]] == ["story"]
