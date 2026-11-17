"""The website's built-in pictures in the Pages module: every picture is listed in the page and section it appears in, can be replaced one at a time and restored."""

from tests.admin_helpers import staff
from tests.test_cms import boss, fake, upload  # noqa: F401  (fixtures and helper)

WHO = "/assets/about/who.webp"
HERO = "/assets/about/hero-colleagues.webp"


def entries(c, page, section):
    p = next(p for p in c.get("/api/admin/page-images").json()["pages"] if p["key"] == page)
    return {i["id"]: i for i in next(s for s in p["sections"] if s["key"] == section)["items"]}


def slot(c, page, section, path):
    return entries(c, page, section)["img:" + path]["slots"][0]


def public_overrides(c):
    return {i["data"]["key"]: i["data"].get("image") for i in c.get("/api/public/content?kind=site_image").json()["items"]}


def test_every_builtin_picture_is_listed_in_its_section_with_its_current_image(fake, boss):  # noqa: F811
    c, _ = boss
    hero = entries(c, "about", "hero")
    assert {"img:/assets/about/hero-office.webp", "img:" + HERO, "img:/assets/about/hero-code.webp"} <= set(hero)  # the collage at the top of the About page
    assert "top" in hero["img:" + HERO]["subtitle"].lower()  # where it sits
    s = slot(c, "about", "about-intro", WHO)
    assert s["builtin"] == WHO and s["asset_id"] is None and s["replaced"] is False  # the picture the website really shows is what the admin sees
    assert "img:/assets/services/software.webp" in entries(c, "home", "services")  # the home page's services picture ...
    assert "img:/assets/services/software.webp" in entries(c, "home", "whoweare")  # ... is also in Who We Are (the slider), the same picture
    assert any(i["also"] for i in entries(c, "home", "services").values())
    assert "img:/assets/products/crm.webp" in entries(c, "products", "catalog") and "img:/assets/logo-shield.png" in entries(c, "site", "brand")


def test_replace_restore_previous_and_restore_original(fake, boss):  # noqa: F811
    c, csrf = boss
    a = upload(boss, name="a.png", public="true").json()
    b = upload(boss, name="b.png", public="true").json()
    put = lambda **body: c.put("/api/admin/page-images/slot", json={"image_key": WHO, **body}, headers=csrf)  # noqa: E731
    assert put(action="replace", asset_id=a["id"]).status_code == 200
    assert slot(c, "about", "about-intro", WHO)["asset_id"] == a["id"] and public_overrides(c)[WHO].endswith(a["id"] + "/file") or WHO in public_overrides(c)
    assert HERO not in public_overrides(c) and slot(c, "about", "hero", HERO)["asset_id"] is None  # no other picture changed
    assert put(action="replace", asset_id=b["id"]).status_code == 200
    s = slot(c, "about", "about-intro", WHO)
    assert s["asset_id"] == b["id"] and s["previous_id"] == a["id"]  # the one it replaced is remembered
    assert put(action="restore_previous").status_code == 200
    s = slot(c, "about", "about-intro", WHO)
    assert s["asset_id"] == a["id"] and s["previous_id"] == b["id"]
    assert put(action="restore_original").status_code == 200
    s = slot(c, "about", "about-intro", WHO)
    assert s["asset_id"] is None and s["builtin"] == WHO and not public_overrides(c).get(WHO)  # the website shows its own picture again
    assert s["previous_id"] == a["id"]  # and the replacement can be brought back
    assert put(action="restore_previous").status_code == 200 and slot(c, "about", "about-intro", WHO)["asset_id"] == a["id"]


def test_invalid_requests_and_permissions(fake, boss, app, db):  # noqa: F811
    c, csrf = boss
    a = upload(boss, name="a.png", public="true").json()
    put = lambda **body: c.put("/api/admin/page-images/slot", json=body, headers=csrf)  # noqa: E731
    assert put(image_key="/assets/not-a-picture.webp", action="replace", asset_id=a["id"]).status_code == 422
    assert put(image_key=WHO, action="replace").status_code == 422  # a picture is required
    assert put(image_key=WHO, action="restore_previous").status_code == 422  # nothing to restore yet
    assert put(image_key=WHO, action="explode", asset_id=a["id"]).status_code == 422
    media, mcsrf, _ = staff(app, db, email="media-only@example.com", permissions=["media"])
    assert media.put("/api/admin/page-images/slot", json={"image_key": WHO, "action": "replace", "asset_id": a["id"]}, headers=mcsrf).status_code in (403, 404)
