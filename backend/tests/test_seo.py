"""SEO management: per-page SEO (keywords, indexing, canonical, structured data), redirects, the live sitemap of published content and team notifications."""

from xml.etree import ElementTree

from tests.admin_helpers import staff

NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def sitemap(client) -> dict[str, str | None]:
    r = client.get("/api/public/sitemap-content.xml")
    assert r.status_code == 200 and r.headers["content-type"].startswith("application/xml")
    root = ElementTree.fromstring(r.text)
    return {u.find("s:loc", NS).text: (u.find("s:lastmod", NS).text if u.find("s:lastmod", NS) is not None else None) for u in root.findall("s:url", NS)}


def article(admin, csrf, title="Automation first", **data):
    body = {"title": title, "status": "published", "data": {"category": "ai", "published_on": "2026-11-03", "excerpt": "A short summary.", "body": "First paragraph.", **data}}
    r = admin.post("/api/admin/content/article", json=body, headers=csrf)
    assert r.status_code == 201, r.text
    return r.json()


def test_sitemap_follows_publishing_editing_hiding_and_deleting(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content", "navigation"])
    assert sitemap(client) == {}
    made = article(admin, csrf)
    urls = sitemap(client)
    assert list(urls) == [f"http://localhost:5173/insights/{made['slug']}"] and urls[next(iter(urls))]  # the live address with its last-modified date
    p = admin.post("/api/admin/content/product", json={"title": "Smart CRM", "status": "published", "data": {"category": "business", "status": "live", "summary": "A CRM."}}, headers=csrf)
    assert p.status_code == 201, p.text
    assert f"http://localhost:5173/products/{p.json()['slug']}" in sitemap(client)
    admin.patch(f"/api/admin/content/item/{made['id']}", json={"data": {**made["data"], "noindex": True}}, headers=csrf)
    assert not any("/insights/" in u for u in sitemap(client))  # "hide from search engines" removes it
    admin.patch(f"/api/admin/content/item/{made['id']}", json={"data": {**made["data"], "noindex": False}, "status": "draft"}, headers=csrf)
    assert not any("/insights/" in u for u in sitemap(client))  # unpublished: gone
    assert admin.delete(f"/api/admin/content/item/{p.json()['id']}", headers=csrf).status_code in (200, 204)
    assert sitemap(client) == {}


def test_redirects_are_validated_listed_and_leave_the_sitemap(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content", "navigation"])
    made = article(admin, csrf, "Old article")
    old = f"/insights/{made['slug']}"
    post = lambda **d: admin.post("/api/admin/content/seo_redirect", json={"title": "r", "status": "published", "data": d}, headers=csrf)  # noqa: E731
    assert post(from_path=old, to_path="/insights/new-article", permanent=True, enabled=True).status_code == 201
    assert client.get("/api/public/redirects").json()["redirects"] == [{"from": old, "to": "/insights/new-article", "permanent": True}]
    assert not any(old in u for u in sitemap(client))  # the old address is no longer advertised
    for bad in ({"from_path": "old", "to_path": "/x"}, {"from_path": "/a b", "to_path": "/x"}, {"from_path": "/a?x=1", "to_path": "/x"}, {"from_path": "/a", "to_path": "javascript:alert(1)"},
                {"from_path": "/a", "to_path": "//evil.example"}, {"from_path": "/same", "to_path": "/same"}):
        assert post(**bad).status_code == 422, bad
    assert post(from_path=old, to_path="/elsewhere").status_code == 409  # one redirect per old address
    assert post(from_path="/off", to_path="https://example.com/page", enabled=False).status_code == 201
    assert len(client.get("/api/public/redirects").json()["redirects"]) == 1  # a switched-off redirect is not served


def test_page_seo_keywords_indexing_canonical_and_structured_data(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["navigation"])
    base = {"title": "Privacy | LAX360 Pvt Ltd", "status": "published", "data": {"path": "/privacy", "meta_description": "How we handle data.", "keywords": "privacy, data", "noindex": True}}
    assert admin.post("/api/admin/content/seo_page", json=base, headers=csrf).status_code == 201  # any page by its address, not only the listed ones
    item = client.get("/api/public/content?kind=seo_page").json()["items"][0]["data"]
    assert item["path"] == "/privacy" and item["noindex"] is True and item["keywords"] == "privacy, data"
    ok = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": []}
    import json

    assert admin.post("/api/admin/content/seo_page", json={**base, "title": "t2", "data": {"page": "about", "structured_data": json.dumps(ok)}}, headers=csrf).status_code == 201
    for bad in ("not json", '{"@type": "FAQPage"}', "[]", '"text"'):
        assert admin.post("/api/admin/content/seo_page", json={**base, "title": "t3", "data": {"page": "contact", "structured_data": bad}}, headers=csrf).status_code == 422, bad
    assert admin.post("/api/admin/content/seo_page", json={**base, "title": "t4", "data": {"page": "work", "canonical_url": "http://insecure.example"}}, headers=csrf).status_code == 422
    assert admin.post("/api/admin/content/seo_page", json={**base, "title": "t5", "data": {"meta_description": "no page given"}}, headers=csrf).status_code == 422  # a page or an address is needed
    assert admin.post("/api/admin/content/seo_page", json={**base, "title": "t6", "data": {"path": "privacy"}}, headers=csrf).status_code == 422


def test_team_is_emailed_about_new_enquiries_only_when_configured(app, db, client, monkeypatch):
    from app.services import email_service, notify_service
    from tests.admin_helpers import enquiry_payload

    sent = []
    monkeypatch.setattr(email_service, "send", lambda settings, to, subject, body: sent.append((to, subject, body)) or True)
    r = client.post("/api/contact", json=enquiry_payload(email="a@example.com"))
    assert r.status_code in (200, 201) and sent == []  # nothing configured: nothing sent, nothing fails
    from app.core.config import get_settings

    s = get_settings()
    monkeypatch.setattr(s, "enquiry_notify_to", "team@example.com, ops@example.com")
    monkeypatch.setattr(s, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(s, "smtp_from", "no-reply@example.com")
    notify_service.notify_enquiry(__import__("uuid").UUID(r.json()["id"]))
    assert [t for t, _, _ in sent] == ["team@example.com", "ops@example.com"] and "Grace Hopper" in sent[0][2] and "a@example.com" in sent[0][2]


def test_an_office_added_in_the_admin_gets_its_page_in_the_live_sitemap(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["settings"])
    assert not any("/locations/" in u for u in sitemap(client))  # the three built-in offices are in the static sitemap, not here
    made = admin.post("/api/admin/branches", json={"name": "LAX360 Pvt Ltd Chennai Branch", "city": "Chennai", "address": "Anna Salai"}, headers=csrf).json()
    assert "http://localhost:5173/locations/chennai" in sitemap(client)
    admin.put(f"/api/admin/branches/{made['id']}", json={"name": made["name"], "city": "Chennai", "address": "Anna Salai", "is_active": False}, headers=csrf)
    assert not any("/locations/" in u for u in sitemap(client))  # a disabled office is not advertised
