"""The image carousel: temporary sample pictures, validation, and management in the admin panel."""

import os

from app import seed_carousel as seed
from app.services import content_service as cs
from tests.admin_helpers import staff


def test_samples_are_flagged_built_in_and_exist_on_disk(db):
    rows = seed.image_rows()
    assert len(rows) == 8 and len({r["slug"] for r in rows}) == 8
    assert [r["sort_order"] for r in rows] == sorted(r["sort_order"] for r in rows)
    here = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public")
    for r in rows:
        assert r["data"]["sample"] is True and "not a LAX360 photograph" in r["data"]["alt"]  # never presented as real photography
        cs._validate(db, "carousel_image", r["title"], dict(r["data"]))
        assert os.path.exists(os.path.join(here, r["data"]["image_path"].lstrip("/")))
    assert {r["data"]["shape"] for r in rows} == {"landscape", "portrait"}
    cs._validate(db, "carousel_page", "Image carousel settings", dict(seed.SETTINGS["data"]))
    assert any(k["value"] == "gallery" for k in cs.SECTION_KEYS)  # the section can be re-ordered / hidden with the other home sections


def test_carousel_pictures_are_managed_validated_ordered_and_removed(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    post = lambda title, **data: admin.post("/api/admin/content/carousel_image", json={"title": title, "data": data, "status": "published", "sort_order": 1}, headers=csrf)  # noqa: E731
    ok = post("One", image_path="/assets/carousel/sample-1.webp", shape="landscape", sample=True)
    assert ok.status_code == 201, ok.text
    for bad in ({}, {"image_path": "/etc/passwd"}, {"image_path": "/assets/carousel/sample-1.webp", "shape": "round"}):
        assert post("Bad", **bad).status_code == 422, bad
    two = post("Two", image_path="/assets/carousel/sample-2.webp", shape="portrait", sample=False)
    assert two.status_code == 201
    items = client.get("/api/public/content?kind=carousel_image").json()["items"]
    assert [i["title"] for i in items] == ["One", "Two"] and items[0]["data"]["sample"] is True and items[1]["data"]["sample"] is False
    assert admin.put("/api/admin/content/carousel_image/order", json={"ids": [two.json()["id"], ok.json()["id"]]}, headers=csrf).status_code == 200
    assert [i["title"] for i in client.get("/api/public/content?kind=carousel_image").json()["items"]] == ["Two", "One"]  # re-ordered
    assert admin.patch(f"/api/admin/content/item/{ok.json()['id']}", json={"data": {"image_path": "/assets/carousel/sample-1.webp", "enabled": False}}, headers=csrf).status_code == 200
    assert [i["data"].get("enabled", True) for i in client.get("/api/public/content?kind=carousel_image").json()["items"]] == [True, False]  # switched off, still listed for the site to skip
    assert admin.delete(f"/api/admin/content/item/{ok.json()['id']}", headers=csrf).status_code in (200, 204)
    assert [i["title"] for i in client.get("/api/public/content?kind=carousel_image").json()["items"]] == ["Two"]
