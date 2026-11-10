"""Product modules and downloads: private PDFs that only logged-in visitors can download (unless the admin leaves them open), through the server."""

from tests.admin_helpers import staff
from tests.conftest import login, make_user

PDF = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"


def _setup(admin, csrf):
    assert admin.post("/api/admin/content/product", json={"title": "Demo Product", "data": {"category": "business", "status": "live", "summary": "A product.", "demo_site_link": "https://demo.example.com", "workflow": "Plan: first\nBuild: then"}, "status": "published", "sort_order": 1}, headers=csrf).status_code == 201
    slug = "demo-product"
    up = admin.post("/api/admin/media?filename=brochure.pdf", content=PDF, headers={**csrf, "Content-Type": "application/pdf"})
    assert up.status_code == 201, up.text
    return slug, up.json()["id"]


def test_modules_belong_to_a_product_and_carry_an_image_and_text(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content", "media"])
    slug, _file = _setup(admin, csrf)
    ok = admin.post("/api/admin/content/product_module", json={"title": "Billing", "data": {"product": slug, "summary": "Invoices and payments.", "features": "Invoices\nReminders"}, "status": "published", "sort_order": 1}, headers=csrf)
    assert ok.status_code == 201, ok.text
    assert admin.post("/api/admin/content/product_module", json={"title": "Bad", "data": {"product": "no-such-product", "summary": "x"}, "status": "published", "sort_order": 2}, headers=csrf).status_code == 422
    items = client.get("/api/public/content?kind=product_module").json()["items"]
    assert [i["title"] for i in items] == ["Billing"] and items[0]["data"]["product"] == slug


def test_downloads_are_private_login_gated_and_never_linked(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content", "media"])
    slug, file_id = _setup(admin, csrf)
    mk = lambda title, **extra: admin.post("/api/admin/content/product_resource", json={"title": title, "data": {"product": slug, "resource_type": "brochure", "file": file_id, **extra}, "status": "published", "sort_order": 1}, headers=csrf)  # noqa: E731
    locked, open_ = mk("Locked brochure"), mk("Open brochure", requires_login=False)
    assert locked.status_code == 201 and open_.status_code == 201, (locked.text, open_.text)
    assert admin.post("/api/admin/content/product_resource", json={"title": "No file", "data": {"product": slug, "resource_type": "brochure"}, "status": "published", "sort_order": 1}, headers=csrf).status_code == 422
    assert admin.post("/api/admin/content/product_resource", json={"title": "Bad file", "data": {"product": slug, "resource_type": "brochure", "file": "not-a-uuid"}, "status": "published", "sort_order": 1}, headers=csrf).status_code == 422

    public = {i["title"]: i for i in client.get("/api/public/content?kind=product_resource").json()["items"]}
    assert set(public) == {"Locked brochure", "Open brochure"}
    info = public["Locked brochure"]["data"]["file_info"]
    assert info["filename"] == "brochure.pdf" and info["type"] == "application/pdf"
    assert client.get(f"/api/media/{file_id}").status_code == 404  # publishing a download never makes the file itself public

    locked_id, open_id = public["Locked brochure"]["id"], public["Open brochure"]["id"]
    anon = client.get(f"/api/products/resources/{locked_id}/download")
    assert anon.status_code == 401 and anon.json()["error"]["code"] == "login_required"
    assert client.get(f"/api/products/resources/{open_id}/download").content == PDF  # left open by the administrator

    make_user(db, email="visitor@example.com", name="Visitor")
    visitor = type(client)(client.app, base_url="http://localhost", raise_server_exceptions=False)
    login(visitor, "visitor@example.com")
    got = visitor.get(f"/api/products/resources/{locked_id}/download")
    assert got.status_code == 200 and got.content == PDF and got.headers["content-disposition"].startswith("attachment") and "no-store" in got.headers["cache-control"]

    # unpublishing the download, or its product, closes it again for everyone
    admin.patch(f"/api/admin/content/item/{locked_id}", json={"status": "draft"}, headers=csrf)
    assert visitor.get(f"/api/products/resources/{locked_id}/download").status_code == 404
    product_id = next(i["id"] for i in client.get("/api/public/content?kind=product").json()["items"])
    admin.patch(f"/api/admin/content/item/{product_id}", json={"status": "draft"}, headers=csrf)
    assert visitor.get(f"/api/products/resources/{open_id}/download").status_code == 404
