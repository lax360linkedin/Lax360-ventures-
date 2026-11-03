"""CMS: durable media library, content kinds, publishing workflow, permissions, previews and the public APIs."""

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.models import ContentItem, MediaAsset
from app.services import object_storage as store
from tests.admin_helpers import PNG, staff
from tests.test_hero_video_storage import BUCKET, PROJECT, SERVICE_KEY, FakeStorage
from tests.test_admin_hero_videos import make_mp4

MEDIA_BUCKET = "site-media"
H = {"Content-Type": "image/png"}


@pytest.fixture
def fake(monkeypatch, env):
    """Supabase Storage configured, backed by an in-memory fake server (no network, no real key)."""
    server = FakeStorage()
    monkeypatch.setattr(store, "_client", lambda: httpx.Client(transport=httpx.MockTransport(server)))
    env(SUPABASE_URL=PROJECT, SUPABASE_SERVICE_ROLE_KEY=SERVICE_KEY, MEDIA_BUCKET=MEDIA_BUCKET)
    return server


def upload(admin, name="logo.png", content=PNG, ctype="image/png", **query):
    c, csrf = admin
    extra = "".join(f"&{k}={v}" for k, v in query.items())
    return c.post(f"/api/admin/media?filename={name}{extra}", content=content, headers={**csrf, "Content-Type": ctype})


@pytest.fixture
def boss(app, db):
    c, csrf, _ = staff(app, db, role="super_admin", email="root@example.com")
    return c, csrf


# ---- permanent media storage ----------------------------------------------------------------------------------------------------------
def test_uploads_are_kept_in_object_storage_with_only_a_reference_in_the_database(fake, boss, db):
    r = upload(boss, public="true")
    assert r.status_code == 201, r.text
    body = r.json()
    row = db.scalar(select(MediaAsset))
    assert row.storage == "supabase" and row.storage_key.startswith("media/") and row.bucket == MEDIA_BUCKET and row.data is None and row.sha256
    assert MEDIA_BUCKET in fake.buckets and list(fake.objects) == [row.storage_key]  # bucket created on first use, file is in storage
    assert body["url"] == f"{PROJECT}/storage/v1/object/public/{MEDIA_BUCKET}/{row.storage_key}"
    assert SERVICE_KEY not in str(body)


def test_identical_files_are_stored_once(fake, boss, db):
    first = upload(boss).json()
    again = upload(boss, name="same-file-other-name.png")
    assert again.json()["duplicate"] is True and again.json()["id"] == first["id"]
    assert len(fake.objects) == 1 and db.scalar(select(func.count()).select_from(MediaAsset)) == 1


def test_media_survives_logout_login_and_a_backend_restart(fake, boss, app, db):
    upload(boss, public="true")
    c, csrf = boss
    assert c.post("/api/admin/auth/logout", headers=csrf).status_code == 204
    from app.main import create_app

    fresh = TestClient(create_app(), base_url="http://localhost", raise_server_exceptions=False)  # a brand-new server process
    from tests.conftest import PASSWORD

    assert fresh.post("/api/admin/auth/login", json={"email": "root@example.com", "password": PASSWORD}).status_code == 200
    listing = fresh.get("/api/admin/media").json()
    assert listing["total"] == 1 and listing["items"][0]["url"].startswith(PROJECT) and len(fake.objects) == 1  # same file, same reference


def test_uploads_are_refused_when_the_host_would_lose_them(env, boss, db, monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    env(SUPABASE_URL=None, SUPABASE_SERVICE_ROLE_KEY=None)
    r = upload(boss)
    assert r.status_code == 503 and r.json()["error"]["code"] == "storage_not_configured" and "SUPABASE_URL" in r.json()["error"]["message"]
    assert db.scalar(select(func.count()).select_from(MediaAsset)) == 0
    assert boss[0].get("/api/admin/media").json()["storage"]["durable"] is False  # the admin page can warn about it


def test_storage_failure_is_reported_and_leaves_no_record(fake, boss, db):
    fake.fail_uploads = True
    r = upload(boss)
    assert r.status_code == 502 and r.json()["error"]["code"] == "storage_unavailable" and SERVICE_KEY not in r.text
    assert db.scalar(select(func.count()).select_from(MediaAsset)) == 0


def test_videos_are_accepted_and_validated(fake, boss):
    ok = upload(boss, "intro.mp4", make_mp4(12), "video/mp4")
    assert ok.status_code == 201 and ok.json()["kind"] == "video" and ok.json()["content_type"] == "video/mp4"
    assert upload(boss, "fake.mp4", b"not really a video at all, just text", "video/mp4").status_code == 415
    assert upload(boss, "broken.mp4", make_mp4(with_moov=False, pad=50), "video/mp4").status_code == 422
    listing = boss[0].get("/api/admin/media?type=video").json()
    assert [i["filename"] for i in listing["items"]] == ["intro.mp4"] and boss[0].get("/api/admin/media?type=image").json()["total"] == 0


def test_replacing_keeps_the_previous_file_unless_asked_to_delete_it(fake, boss, db):
    c, csrf = boss
    first = upload(boss).json()
    old_key = db.scalar(select(MediaAsset.storage_key).where(MediaAsset.id == first["id"]))
    jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 40
    kept = c.put(f"/api/admin/media/{first['id']}/file?filename=new.jpg", content=jpeg, headers={**csrf, "Content-Type": "application/octet-stream"}).json()
    assert kept["id"] == first["id"] and kept["previous_item"] and old_key in fake.objects and len(fake.objects) == 2  # old file still there, as its own item
    other = upload(boss, "b.png", PNG + b"\x01" * 9).json()
    old_b = db.scalar(select(MediaAsset.storage_key).where(MediaAsset.id == other["id"]))
    gone = c.put(f"/api/admin/media/{other['id']}/file?filename=b.jpg&delete_previous=true", content=jpeg + b"\x02", headers={**csrf, "Content-Type": "application/octet-stream"}).json()
    assert gone["previous_item"] is None and old_b not in fake.objects


def test_deleting_needs_confirmation_and_is_blocked_while_the_file_is_in_use(fake, boss, db, client):
    c, csrf = boss
    media = upload(boss).json()
    cat = c.post("/api/admin/content/service_category", json={"title": "Civil CAD", "data": {"icon": media["id"]}, "status": "published"}, headers=csrf)
    assert cat.status_code == 201
    usage = c.get(f"/api/admin/media/{media['id']}/usage").json()
    assert usage["used_by_published"] is True and usage["items"][0]["kind"] == "service_category"
    blocked = c.delete(f"/api/admin/media/{media['id']}", headers=csrf)
    assert blocked.status_code == 409 and blocked.json()["error"]["code"] == "media_in_use" and blocked.json()["error"]["details"]["usage"][0]["title"] == "Civil CAD"
    assert len(fake.objects) == 1 and db.scalar(select(func.count()).select_from(MediaAsset)) == 1  # nothing was removed
    assert c.delete(f"/api/admin/media/{media['id']}", headers=csrf).status_code == 409
    assert c.delete(f"/api/admin/media/{media['id']}?force=true", headers=csrf).status_code == 204  # the admin confirmed
    assert fake.objects == {} and db.scalar(select(func.count()).select_from(MediaAsset)) == 0
    public = client.get("/api/public/content?kind=service_category").json()["items"]
    assert public[0]["title"] == "Civil CAD" and "icon" not in public[0]["data"]  # a missing file never breaks the page


def test_unused_media_deletes_cleanly_from_the_database_and_storage(fake, boss, db):
    c, csrf = boss
    media = upload(boss).json()
    assert c.delete(f"/api/admin/media/{media['id']}", headers=csrf).status_code == 204
    assert fake.objects == {} and db.scalar(select(func.count()).select_from(MediaAsset)) == 0
    assert c.delete(f"/api/admin/media/{media['id']}", headers=csrf).status_code == 404


def test_older_uploads_kept_in_the_database_still_work_and_are_not_touched(fake, boss, db, client):
    legacy = MediaAsset(filename="old.png", content_type="image/png", size_bytes=len(PNG), is_public=True, storage="db", kind="image", data=PNG, sha256="a" * 64)
    db.add(legacy)
    db.commit()
    c, _ = boss
    listing = c.get("/api/admin/media").json()
    assert listing["total"] == 1 and listing["items"][0]["storage"] == "db"
    assert c.get(f"/api/admin/media/{legacy.id}/file").content == PNG and client.get(f"/api/media/{legacy.id}").content == PNG


# ---- content kinds, publishing and permissions ------------------------------------------------------------------------------------
def test_super_admin_manages_every_cms_area_and_ordinary_admins_get_none_by_default(app, db, boss):
    kinds = {k["kind"] for k in boss[0].get("/api/admin/content/kinds").json()["kinds"]}
    assert kinds == {"hero", "section", "faq", "service_category", "service", "about_block", "project", "job", "nav_item", "seo_page"}
    bare, bcsrf, _ = staff(app, db, role="admin", email="plain@example.com", permissions=[])
    assert bare.get("/api/admin/content/kinds").status_code == 403 and bare.get("/api/admin/content/service").status_code == 403
    assert bare.post("/api/admin/content/service", json={"title": "X"}, headers=bcsrf).status_code == 403


def test_each_cms_area_has_its_own_permission(app, db):
    svc_admin, csrf, _ = staff(app, db, role="admin", email="svc@example.com", permissions=["services"])
    assert {k["kind"] for k in svc_admin.get("/api/admin/content/kinds").json()["kinds"]} == {"service_category", "service"}
    assert svc_admin.post("/api/admin/content/job", json={"title": "Dev", "data": {"description": "Build things"}}, headers=csrf).status_code == 403
    assert svc_admin.post("/api/admin/content/hero", json={"data": {}}, headers=csrf).status_code == 403
    hr, hcsrf, _ = staff(app, db, role="admin", email="hr@example.com", permissions=["careers"])
    assert hr.post("/api/admin/content/job", json={"title": "Dev", "data": {"description": "Build things"}}, headers=hcsrf).status_code == 201
    assert hr.post("/api/admin/content/service_category", json={"title": "Nope"}, headers=hcsrf).status_code == 403


def test_services_follow_the_draft_publish_workflow_and_use_managed_categories(fake, boss, client):
    c, csrf = boss
    cat = c.post("/api/admin/content/service_category", json={"title": "Mechanical CAD", "status": "published"}, headers=csrf).json()
    assert cat["slug"] == "mechanical-cad"
    options = next(k for k in c.get("/api/admin/content/kinds").json()["kinds"] if k["kind"] == "service")["fields"][0]["options"]
    assert {"value": "mechanical-cad", "label": "Mechanical CAD"} in options  # categories are data, not hard-coded
    image = upload(boss).json()
    body = {"title": "3D modelling", "data": {"category": "mechanical-cad", "summary": "Parts and assemblies", "image": image["id"], "cta_link": "/contact?type=cad"}}
    assert c.post("/api/admin/content/service", json={**body, "data": {**body["data"], "category": "ghost"}}, headers=csrf).status_code == 422
    assert c.post("/api/admin/content/service", json={**body, "data": {**body["data"], "image": "not-a-real-id"}}, headers=csrf).status_code == 422
    svc = c.post("/api/admin/content/service", json=body, headers=csrf)
    assert svc.status_code == 201 and svc.json()["status"] == "draft"
    assert client.get("/api/public/content?kind=service").json()["items"] == []  # drafts never reach the public API
    assert client.get("/api/public/content-all").json()["kinds"]["service"] == []
    assert c.patch(f"/api/admin/content/item/{svc.json()['id']}", json={"status": "published"}, headers=csrf).status_code == 200
    live = client.get("/api/public/content?kind=service").json()["items"][0]
    assert live["title"] == "3D modelling" and live["data"]["category"] == "mechanical-cad" and live["data"]["image"].startswith(PROJECT)
    assert c.get("/api/admin/media").json()["items"][0]["is_public"] is True  # publishing made the referenced picture public
    c.patch(f"/api/admin/content/item/{svc.json()['id']}", json={"status": "draft"}, headers=csrf)
    assert client.get("/api/public/content?kind=service").json()["items"] == []  # unpublish hides it again


def test_draft_preview_is_admin_only_and_includes_drafts(app, db, boss, client):
    c, csrf = boss
    c.post("/api/admin/content/faq", json={"title": "Draft question?", "data": {"group": "home", "answer": "Yes."}}, headers=csrf)
    preview = c.get("/api/admin/preview/content").json()
    assert preview["preview"] is True and [i["title"] for i in preview["kinds"]["faq"]] == ["Draft question?"] and preview["kinds"]["faq"][0]["status"] == "draft"
    assert client.get("/api/admin/preview/content").status_code == 401 and client.get("/api/public/content-all").json()["kinds"]["faq"] == []
    limited, _, _ = staff(app, db, role="admin", email="lim@example.com", permissions=["navigation"])
    assert limited.get("/api/admin/preview/content").json()["kinds"]["faq"] == []  # an admin only previews the areas they may manage


def test_closed_jobs_and_disabled_items_are_not_public_and_order_is_controllable(boss, client):
    c, csrf = boss
    job = lambda t, **d: c.post("/api/admin/content/job", json={"title": t, "data": {"description": "Do work", **d}, "status": "published"}, headers=csrf).json()  # noqa: E731
    a, b = job("Frontend developer"), job("Backend developer")
    closed = job("Designer", open=False)
    titles = lambda: [i["title"] for i in client.get("/api/public/content?kind=job").json()["items"]]  # noqa: E731
    assert titles() == ["Frontend developer", "Backend developer"] and closed["status"] == "published"  # a closed opening is published but not listed
    order = c.put("/api/admin/content/job/order", json={"ids": [closed["id"], b["id"], a["id"]]}, headers=csrf)
    assert order.status_code == 200 and titles() == ["Backend developer", "Frontend developer"]
    assert c.put("/api/admin/content/job/order", json={"ids": [a["id"]]}, headers=csrf).status_code == 409  # stale list
    c.patch(f"/api/admin/content/item/{closed['id']}", json={"data": {"description": "Do work", "open": True}}, headers=csrf)
    assert titles() == ["Designer", "Backend developer", "Frontend developer"]


def test_homepage_sections_are_unique_per_section_and_validated(boss):
    c, csrf = boss
    ok = c.post("/api/admin/content/section", json={"title": "Hide the FAQ", "data": {"key": "faq", "enabled": False}, "status": "published"}, headers=csrf)
    assert ok.status_code == 201 and ok.json()["slug"] == "faq" and ok.json()["data"]["enabled"] is False
    assert c.post("/api/admin/content/section", json={"title": "Again", "data": {"key": "faq"}}, headers=csrf).status_code == 409
    assert c.post("/api/admin/content/section", json={"title": "Bad", "data": {"key": "nonexistent"}}, headers=csrf).status_code == 422
    assert c.post("/api/admin/content/section", json={"title": "Bad", "data": {"key": "tech", "enabled": "yes"}}, headers=csrf).status_code == 422


def test_deleting_content_never_deletes_the_media_it_used(fake, boss, db):
    c, csrf = boss
    media = upload(boss).json()
    item = c.post("/api/admin/content/about_block", json={"title": "Our story", "data": {"block": "intro", "text": "Hello", "image": media["id"]}, "status": "published"}, headers=csrf).json()
    assert c.delete(f"/api/admin/content/item/{item['id']}", headers=csrf).status_code == 204
    assert db.scalar(select(func.count()).select_from(MediaAsset)) == 1 and len(fake.objects) == 1  # the file stays in the library until explicitly deleted
    assert db.scalar(select(func.count()).select_from(ContentItem)) == 0


def test_site_settings_cover_contact_details_and_the_logo(fake, boss, client):
    c, csrf = boss
    logo = upload(boss).json()
    ok = c.put("/api/admin/settings", json={"values": {"contact_address": "Salem Office, Tamil Nadu", "map_link": "https://maps.example.com/lax360", "site_logo": logo["id"], "site_name": "LAX360"}}, headers=csrf)
    assert ok.status_code == 200, ok.text
    public = client.get("/api/public/site").json()["settings"]
    assert public["contact_address"].startswith("Salem") and public["map_link"].startswith("https://") and public["site_logo_url"].startswith(PROJECT)
    assert c.put("/api/admin/settings", json={"values": {"site_logo": "not-an-id"}}, headers=csrf).status_code == 422
    video = upload(boss, "clip.mp4", make_mp4(), "video/mp4").json()
    assert c.put("/api/admin/settings", json={"values": {"site_favicon": video["id"]}}, headers=csrf).status_code == 422  # a favicon must be an image
    c.put("/api/admin/settings", json={"values": {"site_logo": ""}}, headers=csrf)
    assert "site_logo_url" not in client.get("/api/public/site").json()["settings"]  # cleared: the official logo is used again


def test_public_apis_are_read_only_and_cms_writes_need_login_and_csrf(client, boss):
    assert client.post("/api/admin/content/service", json={"title": "x"}).status_code == 401
    assert client.put("/api/admin/content/service/order", json={"ids": []}).status_code == 401
    assert client.post("/api/public/content", json={}).status_code == 405
    c, _ = boss
    assert c.post("/api/admin/content/faq", json={"title": "Q?", "data": {"group": "home", "answer": "A"}}).status_code == 403  # CSRF header missing


def test_preview_shows_a_drafts_private_picture_but_the_public_api_never_does(fake, boss, client):
    c, csrf = boss
    media = upload(boss).json()  # private by default
    c.post("/api/admin/content/about_block", json={"title": "Our story", "data": {"block": "intro", "text": "Hello", "image": media["id"]}}, headers=csrf)  # a draft
    preview = c.get("/api/admin/preview/content").json()["kinds"]["about_block"][0]
    assert preview["status"] == "draft" and preview["data"]["image"].startswith(PROJECT)  # visible to the admin
    assert client.get("/api/public/content-all").json()["kinds"]["about_block"] == []  # invisible to everyone else
    assert c.get("/api/admin/media").json()["items"][0]["is_public"] is False  # previewing did not make it public
