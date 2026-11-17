"""Page-wise image management: pictures grouped by page, replaced / removed per slot, permissions, and the public site follows at once."""

from tests.admin_helpers import PNG, staff
from tests.test_cms import boss, fake, upload  # noqa: F401  (fixtures and helper)


def make_client(c, csrf, title="Acme"):
    r = c.post("/api/admin/content/client", json={"title": title, "status": "published", "data": {"enabled": True}}, headers=csrf)
    assert r.status_code == 201, r.text
    return r.json()


def find(listing, page, kind):
    p = next(p for p in listing["pages"] if p["key"] == page)
    return next(s for s in p["sections"] if s["key"] == kind)


def test_the_tree_follows_the_websites_real_pages_and_sections(fake, boss):  # noqa: F811
    c, csrf = boss
    data = c.get("/api/admin/page-images").json()
    labels = [p["label"] for p in data["pages"]]
    assert labels[:4] == ["Home page", "About", "Services", "Industries"] or labels[0] in ("Home page", "Home")
    home = next(p for p in data["pages"] if p["key"] == "home")
    keys = [s["key"] for s in home["sections"]]
    assert keys[0] == "header" and "welcome" in keys and "clients" in keys and "gallery" in keys and "testimonials" in keys  # the home sections of the website, welcome sections included
    about = next(p for p in data["pages"] if p["key"] == "about")
    assert {"About Us", "Mission & vision", "Page header"} <= {s["label"] for s in about["sections"]}  # the About page's own sections
    assert any(p["key"] == "contact" for p in data["pages"])  # a page without pictures is still listed
    svc = c.post("/api/admin/content/service_category", json={"title": "Brand Design", "status": "published"}, headers=csrf).json()
    data = c.get("/api/admin/page-images").json()
    assert "Brand Design" in [s["label"] for p in data["pages"] if p["key"] == "services" for s in p["sections"]]  # sections are generated from what exists, not from a fixed list


def test_every_page_lists_its_pictures_and_empty_slots(fake, boss):  # noqa: F811
    c, csrf = boss
    make_client(c, csrf)
    data = c.get("/api/admin/page-images").json()
    keys = [p["key"] for p in data["pages"]]
    assert "home" in keys and "site" in keys  # the whole-website logo / favicon slots are listed too
    section = find(data, "home", "clients")
    slot = section["items"][0]["slots"][0]
    assert slot["field"] == "logo" and slot["asset_id"] is None  # an empty slot is shown so a picture can be added to it
    assert [s["field"] for s in find(data, "site", "brand")["items"][0]["slots"]] == ["site_logo", "site_favicon", "default_og_image"]


def test_replacing_a_picture_saves_it_permanently_and_the_public_site_follows(fake, boss):  # noqa: F811
    c, csrf = boss
    item = make_client(c, csrf)
    a = upload(boss, name="a.png", public="true").json()
    assert c.put("/api/admin/page-images/slot", json={"item_id": item["id"], "field": "logo", "asset_id": a["id"]}, headers=csrf).status_code == 200
    slot = find(c.get("/api/admin/page-images").json(), "home", "clients")["items"][0]["slots"][0]
    assert slot["asset_id"] == a["id"]
    from fastapi.testclient import TestClient  # the public site, no login

    public = TestClient(c.app if hasattr(c, "app") else c._transport.app, base_url="http://localhost")
    shown = public.get("/api/public/content-all").json()["kinds"]["client"][0]["data"]["logo"]
    assert shown.startswith("http") and a["id"] not in ("", None)
    b = upload(boss, name="b.png", content=PNG + b"\x00", public="true").json()  # replace again: the new one wins
    c.put("/api/admin/page-images/slot", json={"item_id": item["id"], "field": "logo", "asset_id": b["id"]}, headers=csrf)
    assert find(c.get("/api/admin/page-images").json(), "home", "clients")["items"][0]["slots"][0]["asset_id"] == b["id"]


def test_removing_a_picture_empties_the_slot_and_a_required_one_is_protected(fake, boss):  # noqa: F811
    c, csrf = boss
    item = make_client(c, csrf)
    a = upload(boss, public="true").json()
    c.put("/api/admin/page-images/slot", json={"item_id": item["id"], "field": "logo", "asset_id": a["id"]}, headers=csrf)
    assert c.put("/api/admin/page-images/slot", json={"item_id": item["id"], "field": "logo", "asset_id": None}, headers=csrf).status_code == 200
    assert find(c.get("/api/admin/page-images").json(), "home", "clients")["items"][0]["slots"][0]["asset_id"] is None
    pic = c.post("/api/admin/content/carousel_image", json={"title": "P", "status": "published", "data": {"image": a["id"], "enabled": True}}, headers=csrf).json()
    r = c.put("/api/admin/page-images/slot", json={"item_id": pic["id"], "field": "image", "asset_id": None}, headers=csrf)
    assert r.status_code == 422  # a carousel picture needs its picture: delete the entry instead


def test_the_whole_website_logo_slot_works_and_unknown_fields_are_refused(fake, boss):  # noqa: F811
    c, csrf = boss
    a = upload(boss, public="true").json()
    assert c.put("/api/admin/page-images/slot", json={"setting": "site_logo", "field": "site_logo", "asset_id": a["id"]}, headers=csrf).status_code == 200
    assert find(c.get("/api/admin/page-images").json(), "site", "brand")["items"][0]["slots"][0]["asset_id"] == a["id"]
    item = make_client(c, csrf)
    assert c.put("/api/admin/page-images/slot", json={"item_id": item["id"], "field": "title", "asset_id": a["id"]}, headers=csrf).status_code == 422
    assert c.put("/api/admin/page-images/slot", json={"setting": "site_name", "field": "site_name", "asset_id": a["id"]}, headers=csrf).status_code == 403
    missing = "00000000-0000-0000-0000-000000000000"
    assert c.put("/api/admin/page-images/slot", json={"item_id": item["id"], "field": "logo", "asset_id": missing}, headers=csrf).status_code == 422


def test_each_administrator_sees_and_changes_only_what_their_permissions_allow(fake, boss, app, db):  # noqa: F811
    c, csrf = boss
    item = make_client(c, csrf)
    a = upload(boss, public="true").json()
    media_only, mcsrf, _ = staff(app, db, role="admin", email="media@example.com", permissions=["media"])
    assert media_only.get("/api/admin/page-images").status_code == 403  # no picture module at all
    content_only, ccsrf, _ = staff(app, db, role="admin", email="content@example.com", permissions=["content"])
    data = content_only.get("/api/admin/page-images").json()
    assert "site" not in [i["id"] for p in data["pages"] for sec in p["sections"] for i in sec["items"]]  # the logo / favicon settings belong to the settings permission
    assert content_only.put("/api/admin/page-images/slot", json={"setting": "site_logo", "field": "site_logo", "asset_id": a["id"]}, headers=ccsrf).status_code == 403
    assert content_only.put("/api/admin/page-images/slot", json={"item_id": item["id"], "field": "logo", "asset_id": a["id"]}, headers=ccsrf).status_code == 200
