"""The website portfolio ("Explore Our Websites"): the 21 supplied entries, managed in the admin panel."""

import os

from app import seed_websites as seed
from app.services import content_service as cs
from tests.admin_helpers import staff

SUPPLIED = {  # the exact names and addresses supplied by LAX360 ("" = no address yet)
    "CADPOINT": "https://www.cadpoint.co.in/", "SDphysiocare": "https://www.sdphysiocare.com/", "Devs Clinic": "https://www.devshairandskincare.com/", "FatCat Wealthy": "https://www.fatcatwealthy.com/",
    "AETHER FITNESS": "https://gym-web-nine-phi.vercel.app/", "Haute Cuisine Indienne & Royal Dining": "https://food-hotel-demo-web.vercel.app/", "Tiny Titans": "https://tiny-titans-school.netlify.app/",
    "IronlineBuild": "https://immersive-build-gallery.lovable.app/", "Construction Website Demo 2": "https://construction-website-rho-hazel.vercel.app/", "BuildCore Construction": "https://buildcore-construction.ai.studio/",
    "COP MENS WEAR": "https://consmenswear.ai.studio/", "E-commerce Demo 2": "https://e-commerce-mu-five-15.vercel.app/", "Hospital Management Website Demo": "https://hospital-web-frontend.vercel.app/",
    "LAX360 Real Estate": "https://demo-real-estate-five.vercel.app/", "Event Management Website Demo": "", "Apex Institute of Technology & Science": "https://college-web-phi.vercel.app/",
    "Academy Website Demo": "", "School Website Demo": "https://school-demo-nine-tau.vercel.app/", "Luxury Jewellery \u2013 Static Website": "https://jewellery-web-demo-five.vercel.app/",
    "Haute Weaves & Couture": "https://textiles-web.vercel.app/", "Luxury Jewellery \u2013 Dynamic Website": "https://jewellery-dynamic-web.vercel.app/",
}


def test_seed_has_every_supplied_entry_with_its_exact_address_and_no_invented_links(db):
    rows = seed.rows()
    assert {r["title"]: r["data"].get("website_link", "") for r in rows} == SUPPLIED and len(rows) == 21
    assert len({r["slug"] for r in rows}) == 21
    for r in rows:
        cs._validate(db, "website", r["title"], dict(r["data"]))  # every entry passes the same checks as the admin form
        if not r["data"].get("website_link"):  # an entry without an address has no link, no screenshots and no embed
            assert not any(k in r["data"] for k in ("embed_preview", "preview_paths", "mobile_path"))
    by = {r["title"]: r["data"] for r in rows}
    assert by["Luxury Jewellery \u2013 Static Website"]["website_type"] == "static" and by["Luxury Jewellery \u2013 Dynamic Website"]["website_type"] == "dynamic"
    assert sum(1 for r in rows if r["data"].get("website_type")) == 2  # a type is stated only where LAX360 named it
    assert sum(1 for r in rows if r["data"]["category"] == "Jewellery") == 2 and sum(1 for r in rows if r["data"]["category"] == "Construction") == 3
    here = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public")
    for r in rows:  # every screenshot the entries point to exists
        for path in r["data"].get("preview_paths", "").split() + ([r["data"]["mobile_path"]] if r["data"].get("mobile_path") else []):
            assert os.path.exists(os.path.join(here, path.lstrip("/"))), path


def test_websites_are_managed_validated_ordered_published_and_removed(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    base = {"category": "Healthcare", "entry_kind": "demo", "summary": "A demo.", "website_link": "https://demo.example.com", "website_type": "dynamic", "features": "Booking: appointment form"}
    post = lambda title, **extra: admin.post("/api/admin/content/website", json={"title": title, "data": {**base, **extra}, "status": "published", "sort_order": 1}, headers=csrf)  # noqa: E731
    ok = post("Clinic demo")
    assert ok.status_code == 201, ok.text
    for bad in ({"website_link": "javascript:alert(1)"}, {"website_type": "magic"}, {"entry_kind": "friend"}, {"preview_paths": "/etc/passwd"}, {"category": ""}):
        assert post("Bad", **bad).status_code == 422, bad
    assert post("No address yet", website_link="").status_code == 201  # a site that is not live yet has no link
    items = {i["title"]: i for i in client.get("/api/public/content?kind=website").json()["items"]}
    assert set(items) == {"Clinic demo", "No address yet"} and "website_link" not in items["No address yet"]["data"]
    wid = ok.json()["id"]
    assert admin.patch(f"/api/admin/content/item/{wid}", json={"status": "draft"}, headers=csrf).status_code == 200
    assert [i["title"] for i in client.get("/api/public/content?kind=website").json()["items"]] == ["No address yet"]  # unpublished = hidden
    assert admin.delete(f"/api/admin/content/item/{wid}", headers=csrf).status_code in (200, 204)
