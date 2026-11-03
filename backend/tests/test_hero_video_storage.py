"""Homepage videos kept in durable object storage (Supabase Storage) instead of the server's disk, tested against a fake Storage server."""

import httpx
import pytest

from app.services import hero_video_service as svc
from tests.test_admin_hero_videos import active, admin, clock, make_mp4, upload, videos_dir  # noqa: F401  (fixtures and helpers shared with the main video tests)

PROJECT = "https://abcdefgh.supabase.co"
SERVICE_KEY = "service-role-key-for-tests-only"
BUCKET = "hero-videos"


class FakeStorage:
    """Just enough of the Supabase Storage REST API: buckets, upload (x-upsert), delete and public reads."""

    def __init__(self):
        self.buckets, self.objects, self.calls, self.fail_uploads = set(), {}, [], False
        self.fail_deletes, self.private_bucket = False, False

    def __call__(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        self.calls.append((request.method, path, request.headers.get("authorization"), request.headers.get("apikey")))
        public_read = request.method == "GET" and path.startswith("/storage/v1/object/public/")  # visitors read without any key
        if not public_read and (request.headers.get("authorization") != f"Bearer {SERVICE_KEY}" or request.headers.get("apikey") != SERVICE_KEY):
            return httpx.Response(401, json={"message": "bad key"})
        if request.method == "POST" and path == "/storage/v1/bucket":
            import json

            self.buckets.add(json.loads(request.content)["id"])
            return httpx.Response(200, json={"name": "created"})
        prefix = "/storage/v1/object/"
        if request.method == "POST" and path.startswith(prefix):
            bucket, _, key = path[len(prefix):].partition("/")
            if self.fail_uploads:
                return httpx.Response(500, json={"message": "boom"})
            if bucket not in self.buckets:
                return httpx.Response(404, json={"statusCode": "404", "error": "Bucket not found", "message": "Bucket not found"})
            self.objects[key] = (request.headers.get("content-type"), bytes(request.content))
            return httpx.Response(200, json={"Key": f"{bucket}/{key}"})
        if request.method == "GET" and path.startswith(prefix):
            kind, _, rest = path[len(prefix):].partition("/")
            bucket, _, key = rest.partition("/")
            if kind not in ("authenticated", "public") or key not in self.objects:
                return httpx.Response(404, json={"statusCode": "404", "error": "not_found", "message": "Object not found"})
            if kind == "public" and self.private_bucket:
                return httpx.Response(400, json={"message": "Bucket not public"})
            data = self.objects[key][1]
            return httpx.Response(206, content=data[:1], headers={"content-range": f"bytes 0-0/{len(data)}"})
        if request.method == "DELETE" and path.startswith(prefix):
            if self.fail_deletes:
                return httpx.Response(500, json={"message": "boom"})
            self.objects.pop(path[len(prefix):].partition("/")[2], None)
            return httpx.Response(200, json={"message": "Successfully deleted"})
        return httpx.Response(404, json={"message": "unknown route"})


@pytest.fixture
def storage(monkeypatch, env, videos_dir):  # noqa: F811
    fake = FakeStorage()
    monkeypatch.setattr(svc, "_client", lambda: httpx.Client(transport=httpx.MockTransport(fake)))
    env(SUPABASE_URL=PROJECT, SUPABASE_SERVICE_ROLE_KEY=SERVICE_KEY, HERO_VIDEO_BUCKET=BUCKET)
    return fake


def test_uploads_go_to_object_storage_not_the_server_disk(storage, admin, client, videos_dir):  # noqa: F811
    r = upload(admin, "Reel")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["storage"] == "supabase" and body["file_ok"]
    assert list(storage.objects) and list(storage.objects.values())[0][0] == "video/mp4" and BUCKET in storage.buckets  # bucket was created on first use
    assert not list(videos_dir.glob("*"))  # nothing left on the (ephemeral) disk, not even the temporary upload
    cdn = f"{PROJECT}/storage/v1/object/public/{BUCKET}/{next(iter(storage.objects))}"
    assert body["preview_url"] == cdn
    slot, _ = active(client)
    assert slot["url"] == cdn  # the homepage plays straight from the storage CDN (byte ranges and caching handled there)
    assert SERVICE_KEY not in client.get("/api/public/hero-video").text and SERVICE_KEY not in admin[0].get("/api/admin/hero-videos").text


def test_the_api_file_url_redirects_to_the_cdn_only_for_playing_or_next(storage, admin, client):  # noqa: F811
    ids = {n: upload(admin, n).json()["id"] for n in ("A", "B", "C")}
    r = client.get(f"/api/public/hero-videos/{ids['A']}/file", follow_redirects=False)
    assert r.status_code == 302 and r.headers["location"].startswith(f"{PROJECT}/storage/v1/object/public/{BUCKET}/")
    assert client.get(f"/api/public/hero-videos/{ids['B']}/file", follow_redirects=False).status_code == 302  # next
    assert client.get(f"/api/public/hero-videos/{ids['C']}/file", follow_redirects=False).status_code == 404  # later in the queue: not public yet


def test_replace_poster_and_delete_keep_storage_in_sync(storage, admin):  # noqa: F811
    c, csrf = admin
    vid = upload(admin, "Reel").json()["id"]
    first = set(storage.objects)
    jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 64
    out = c.put(f"/api/admin/hero-videos/{vid}/poster", content=jpeg, headers=csrf).json()["items"][0]
    assert out["has_poster"] and out["poster_url"].startswith(PROJECT) and len(storage.objects) == 2  # the poster lives next to its video
    r = c.put(f"/api/admin/hero-videos/{vid}/file?filename=new.mp4", content=make_mp4(20), headers={**csrf, "Content-Type": "video/mp4"})
    assert r.status_code == 200 and len(storage.objects) == 1 and not (first & set(storage.objects))  # old video and old poster removed, new one stored
    assert c.delete(f"/api/admin/hero-videos/{vid}", headers=csrf).json()["deleted"] is True
    assert storage.objects == {}


def test_a_storage_failure_is_a_clear_error_and_leaves_nothing_behind(storage, admin, videos_dir):  # noqa: F811
    storage.fail_uploads = True
    r = upload(admin, "Reel")
    assert r.status_code == 502 and r.json()["error"]["code"] == "storage_unavailable" and SERVICE_KEY not in r.text
    assert admin[0].get("/api/admin/hero-videos").json()["items"] == [] and not list(videos_dir.glob("*"))


def test_existing_local_videos_keep_working_after_storage_is_configured(env, videos_dir, admin, client, monkeypatch):  # noqa: F811
    first = upload(admin, "Old").json()  # saved while no object storage was configured
    assert first["storage"] == "local" and list(videos_dir.glob("*.mp4"))
    fake = FakeStorage()
    monkeypatch.setattr(svc, "_client", lambda: httpx.Client(transport=httpx.MockTransport(fake)))
    env(SUPABASE_URL=PROJECT, SUPABASE_SERVICE_ROLE_KEY=SERVICE_KEY)  # settings are read per request, so this takes effect immediately
    slot, _ = active(client)
    assert slot["url"].startswith("/api/public/hero-videos/")  # the old video is still addressed through this API and served from disk
    assert client.get(slot["url"]).status_code == 200
    new = upload(admin, "New").json()
    assert new["storage"] == "supabase" and len(fake.objects) == 1  # new uploads go to durable storage
    assert {v["storage"] for v in admin[0].get("/api/admin/hero-videos").json()["items"]} == {"local", "supabase"}


def test_storage_report_warns_when_files_would_be_lost_on_restart(env, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("RENDER", "true")
    env(SUPABASE_URL=None, SUPABASE_SERVICE_ROLE_KEY=None)
    info = svc.storage_info(get_settings())
    assert info["backend"] == "local" and info["durable"] is False and "SUPABASE_URL" in info["warning"]
    env(HERO_VIDEO_DISK_IS_PERSISTENT="true")
    assert svc.storage_info(get_settings())["durable"] is True
    env(SUPABASE_URL=PROJECT, SUPABASE_SERVICE_ROLE_KEY=SERVICE_KEY, HERO_VIDEO_DISK_IS_PERSISTENT="false")
    assert svc.storage_info(get_settings()) == {"backend": "supabase", "durable": True, "detail": f"Supabase Storage bucket “{BUCKET}”"}
    monkeypatch.delenv("RENDER")
    env(SUPABASE_URL=None, SUPABASE_SERVICE_ROLE_KEY=None)
    assert svc.storage_info(get_settings())["durable"] is True  # local development: a normal disk


# ---- integrity: verified uploads, safe deletion, availability windows, fallback, recovery ----------------------------------------------
def items(admin):
    return {v["title"]: v for v in admin[0].get("/api/admin/hero-videos").json()["items"]}


def test_an_upload_that_cannot_be_verified_is_not_saved_and_is_cleaned_up(storage, admin):  # noqa: F811
    storage.private_bucket = True  # the object exists but visitors could not read it
    r = upload(admin, "Reel")
    assert r.status_code == 502 and r.json()["error"]["code"] == "storage_verification_failed"
    assert items(admin) == {} and storage.objects == {}  # no record, and the object this request wrote is gone


def test_a_verified_upload_records_where_it_lives(storage, admin):  # noqa: F811
    v = upload(admin, "Reel").json()
    assert v["verify_status"] == "ok" and v["bucket"] == BUCKET and v["verified_at"]


def test_the_same_file_cannot_be_recorded_twice(storage, admin):  # noqa: F811
    data = make_mp4(tag=b"same")
    assert upload(admin, "One", data).status_code == 201
    r = upload(admin, "Two", data)
    assert r.status_code == 409 and r.json()["error"]["code"] == "duplicate_video" and len(storage.objects) == 1


def test_a_failed_database_save_never_touches_existing_files(storage, admin, monkeypatch):  # noqa: F811
    upload(admin, "Keep")
    existing = set(storage.objects)
    monkeypatch.setattr(svc, "create", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("db down")))
    assert upload(admin, "Boom").status_code == 500  # the test client reports an unhandled server error as a 500
    assert set(storage.objects) == existing  # the new object was cleaned up; the earlier one is untouched


def test_deletion_keeps_the_record_when_the_file_cannot_be_removed(storage, admin):  # noqa: F811
    c, csrf = admin
    vid = upload(admin, "Reel").json()["id"]
    storage.fail_deletes = True
    out = c.delete(f"/api/admin/hero-videos/{vid}", headers=csrf).json()
    assert out["deleted"] is False and storage.objects  # the file is still there ...
    row = items(admin)["Reel"]
    assert row["status"] == "deleting" and row["delete_error"] and not row["is_active"]  # ... so the record stays, out of rotation, with the reason
    assert active(c)[0] is None
    storage.fail_deletes = False
    assert c.delete(f"/api/admin/hero-videos/{vid}", headers=csrf).json()["deleted"] is True  # retry completes
    assert items(admin) == {} and storage.objects == {}


def test_a_pending_deletion_can_be_restored_while_the_file_exists(storage, admin):  # noqa: F811
    c, csrf = admin
    vid = upload(admin, "Reel").json()["id"]
    storage.fail_deletes = True
    c.delete(f"/api/admin/hero-videos/{vid}", headers=csrf)
    assert c.post(f"/api/admin/hero-videos/{vid}/restore", headers=csrf).status_code == 200
    row = items(admin)["Reel"]
    assert row["deleted_at"] is None and row["status"] == "inactive"  # back, but switched off until an admin turns it on


def test_nothing_but_an_explicit_delete_removes_a_video(storage, admin, client):  # noqa: F811
    c, csrf = admin
    ids = {n: upload(admin, n).json()["id"] for n in ("A", "B")}
    c.patch(f"/api/admin/hero-videos/{ids['A']}", json={"is_active": False}, headers=csrf)
    c.put("/api/admin/hero-videos/order", json={"ids": [ids["B"], ids["A"]]}, headers=csrf)
    c.put("/api/admin/hero-videos/schedule", json={"slot_days": 5, "repeat": True}, headers=csrf)
    c.post("/api/auth/logout", headers=csrf)
    assert len(storage.objects) == 2 and len(items(admin)) == 2  # switching off, reordering, rescheduling, signing out delete nothing


def test_verification_detects_a_missing_object_and_stops_serving_it_without_deleting_the_record(storage, admin, client):  # noqa: F811
    c, csrf = admin
    vid = upload(admin, "Reel").json()["id"]
    storage.objects.clear()  # the stored file vanished (e.g. removed in the Supabase dashboard)
    out = c.post(f"/api/admin/hero-videos/{vid}/verify", headers=csrf).json()
    row = next(v for v in out["items"] if v["id"] == vid)
    assert row["verify_status"] == "missing" and row["status"] == "missing_file" and "not in the storage bucket" in row["verify_detail"]
    assert active(client)[0] is None  # visitors are not pointed at a dead file; the record is kept
    assert len(items(admin)) == 1


def test_playback_failures_reported_by_browsers_trigger_a_server_check(storage, admin, client, clock):  # noqa: F811
    from datetime import timedelta

    vid = upload(admin, "Reel").json()["id"]
    storage.objects.clear()
    clock(svc.now_utc() + timedelta(minutes=5))  # re-checks are throttled to one a minute per video
    assert client.post("/api/public/hero-video/report", json={"video_id": vid, "ok": False, "code": "MEDIA_ERR_SRC_NOT_SUPPORTED"}).status_code == 204
    row = items(admin)["Reel"]
    assert row["last_play_error"] == "MEDIA_ERR_SRC_NOT_SUPPORTED" and row["verify_status"] == "missing"
    assert client.post("/api/public/hero-video/report", json={"video_id": "00000000-0000-0000-0000-000000000000", "ok": True}).status_code == 204  # unknown ids are ignored


def test_the_fallback_video_plays_only_when_nothing_else_is_eligible(storage, admin, client):  # noqa: F811
    c, csrf = admin
    a, b = (upload(admin, n).json()["id"] for n in ("A", "B"))
    assert c.patch(f"/api/admin/hero-videos/{b}", json={"is_fallback": True}, headers=csrf).status_code == 200
    assert active(client)[0]["id"] == a
    c.patch(f"/api/admin/hero-videos/{a}", json={"is_active": False}, headers=csrf)
    c.patch(f"/api/admin/hero-videos/{b}", json={"is_active": False}, headers=csrf)
    assert active(client)[0]["id"] == b  # nothing scheduled: the fallback keeps the hero alive
    c.patch(f"/api/admin/hero-videos/{a}", json={"is_active": True}, headers=csrf)
    assert active(client)[0]["id"] == a  # a scheduled video takes over again
    c.patch(f"/api/admin/hero-videos/{a}", json={"is_fallback": True}, headers=csrf)
    assert [v["is_fallback"] for v in items(admin).values()].count(True) == 1  # only one fallback at a time


def test_an_availability_window_limits_when_a_video_may_play(storage, admin, client, clock):  # noqa: F811
    from datetime import timedelta

    c, csrf = admin
    a, b = (upload(admin, n).json()["id"] for n in ("A", "B"))
    now = svc.now_utc()
    c.patch(f"/api/admin/hero-videos/{a}", json={"available_from": (now + timedelta(days=1)).isoformat()}, headers=csrf)
    assert active(client)[0]["id"] == b  # A is not available yet
    bad = c.patch(f"/api/admin/hero-videos/{a}", json={"available_until": (now - timedelta(days=1)).isoformat()}, headers=csrf)
    assert bad.status_code == 422  # an inverted window is refused
    c.patch(f"/api/admin/hero-videos/{a}", json={"clear_window": True}, headers=csrf)
    assert items(admin)["A"]["available_from"] is None


def test_the_recovery_report_never_deletes_and_flags_missing_files(storage, admin, capsys, app):  # noqa: F811
    from app import cli

    upload(admin, "Good")
    upload(admin, "Gone")
    storage.objects.pop(list(storage.objects)[1])
    cli.main(["hero-videos-report"])
    out = capsys.readouterr().out
    assert "MISSING" in out and "1 verified, 1 need attention" in out and len(items(admin)) == 2
    assert SERVICE_KEY not in out


def test_migration_copies_disk_videos_to_storage_without_deleting_the_local_file(env, videos_dir, admin, monkeypatch, capsys):  # noqa: F811
    from app import cli

    upload(admin, "Old")  # held on the server disk
    fake = FakeStorage()
    monkeypatch.setattr(svc, "_client", lambda: httpx.Client(transport=httpx.MockTransport(fake)))
    env(SUPABASE_URL=PROJECT, SUPABASE_SERVICE_ROLE_KEY=SERVICE_KEY)
    cli.main(["hero-videos-migrate"])
    assert "WOULD COPY" in capsys.readouterr().out and not fake.objects  # dry run changes nothing
    cli.main(["hero-videos-migrate", "--apply"])
    assert "MOVED" in capsys.readouterr().out and len(fake.objects) == 1 and list(videos_dir.glob("*.mp4"))
    row = items(admin)["Old"]
    assert row["storage"] == "supabase" and row["verify_status"] == "ok"
