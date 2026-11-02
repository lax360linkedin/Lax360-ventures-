"""Homepage background videos: upload validation, access control, the persistent 3-day schedule and safe handling of edits."""

import struct
from datetime import datetime, timedelta, timezone

import pytest

from app.services import hero_video_service as svc
from tests.admin_helpers import staff

IST = timezone(timedelta(hours=5, minutes=30))
T0 = datetime(2026, 11, 1, 10, 30, tzinfo=IST)  # the day all three example videos are uploaded


def box(kind: bytes, payload: bytes = b"") -> bytes:
    return struct.pack(">I4s", 8 + len(payload), kind) + payload


def make_mp4(seconds: float = 10.0, *, video_track: bool = True, with_moov: bool = True, pad: int = 0) -> bytes:
    ftyp = box(b"ftyp", b"isom" + b"\x00\x00\x02\x00" + b"isomiso2mp41")
    mvhd = box(b"mvhd", b"\x00\x00\x00\x00" + b"\x00" * 8 + struct.pack(">II", 1000, int(seconds * 1000)) + b"\x00" * 80)
    hdlr = box(b"hdlr", b"\x00\x00\x00\x00" + b"\x00" * 4 + (b"vide" if video_track else b"soun") + b"\x00" * 12 + b"x\x00")
    trak = box(b"trak", box(b"mdia", hdlr))
    moov = box(b"moov", mvhd + trak) if with_moov else b""
    return ftyp + moov + box(b"mdat", b"\x00" * pad)


def make_webm(seconds: float = 10.0) -> bytes:
    def el(ident: bytes, payload: bytes) -> bytes:
        return ident + bytes([0x80 | len(payload)]) + payload if len(payload) < 127 else ident + b"\x40" + bytes([len(payload)]) + payload

    header = el(b"\x1a\x45\xdf\xa3", el(b"\x42\x82", b"webm"))
    info = el(b"\x15\x49\xa9\x66", el(b"\x2a\xd7\xb1", struct.pack(">I", 1_000_000)) + el(b"\x44\x89", struct.pack(">f", seconds * 1000)))
    body = info + el(b"\x16\x54\xae\x6b", b"\x00")
    return header + b"\x18\x53\x80\x67\x01\xff\xff\xff\xff\xff\xff\xff" + body


@pytest.fixture
def videos_dir(tmp_path, env):
    env(HERO_VIDEO_DIR=str(tmp_path / "videos"))
    return tmp_path / "videos"


@pytest.fixture
def clock(monkeypatch):
    state = {"now": T0}
    monkeypatch.setattr(svc, "now_utc", lambda: state["now"].astimezone(timezone.utc))

    def set_time(when):
        state["now"] = when

    return set_time


@pytest.fixture
def admin(videos_dir, app, db, clock):
    client, csrf, _ = staff(app, db, role="super_admin", email="root@example.com")
    return client, csrf


def upload(admin, title, data=None, filename=None, ctype="video/mp4"):
    client, csrf = admin
    return client.post(f"/api/admin/hero-videos?filename={filename or title + '.mp4'}&title={title}", content=data if data is not None else make_mp4(), headers={**csrf, "Content-Type": ctype})


def active(client):
    body = client.get("/api/public/hero-video").json()
    return body["active"], body


def title_of(admin, video_id):
    return next(v["title"] for v in admin[0].get("/api/admin/hero-videos").json()["items"] if v["id"] == video_id)


def playing(admin):
    client, _ = admin
    cur = client.get("/api/admin/hero-videos").json()["current"]
    return cur["title"] if cur else None


# ---- upload validation ---------------------------------------------------------------------
def test_valid_mp4_and_webm_are_accepted_and_stored_on_disk_not_in_the_database(admin, videos_dir):
    r = upload(admin, "Intro", make_mp4(12, pad=2048))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["duration_seconds"] == pytest.approx(12) and body["content_type"] == "video/mp4" and body["file_ok"] and body["is_active"]
    assert len(list(videos_dir.glob("*.mp4"))) == 1 and not list(videos_dir.glob("*.part"))
    w = upload(admin, "Clip", make_webm(8), filename="clip.webm", ctype="video/webm")
    assert w.status_code == 201 and w.json()["content_type"] == "video/webm" and w.json()["duration_seconds"] == pytest.approx(8)
    assert "storage_key" not in body and "data" not in body


@pytest.mark.parametrize("name,data,ctype,status", [
    ("note.mp4", b"this is plainly not a video file at all, just text", "video/mp4", 415),
    ("clip.mov", make_mp4(), "video/quicktime", 415),
    ("clip.mp4", make_mp4(), "image/png", 415),
    ("clip.webm", make_mp4(), "video/webm", 415),  # an MP4 pretending to be WebM
    ("clip.mp4", b"", "video/mp4", 422),
    ("clip.mp4", make_mp4(with_moov=False, pad=100), "video/mp4", 422),
    ("clip.mp4", make_mp4(video_track=False), "video/mp4", 422),
    ("clip.mp4", make_mp4(0.2), "video/mp4", 422),
    ("clip.mp4", make_mp4(99999), "video/mp4", 422),
])
def test_invalid_uploads_are_refused_with_clear_errors_and_leave_nothing_behind(admin, videos_dir, name, data, ctype, status):
    r = upload(admin, "Bad", data, filename=name, ctype=ctype)
    assert r.status_code == status and r.json()["error"]["message"]
    assert not list(videos_dir.glob("*")) and admin[0].get("/api/admin/hero-videos").json()["items"] == []


def test_oversized_upload_is_refused(env, videos_dir, app, db, clock):
    env(HERO_VIDEO_MAX_BYTES="4096")
    from app.main import create_app

    client, csrf, _ = staff(create_app(), db, role="super_admin", email="root2@example.com")
    r = client.post("/api/admin/hero-videos?filename=big.mp4", content=make_mp4(pad=20000), headers={**csrf, "Content-Type": "video/mp4"})
    assert r.status_code == 413 and not list(videos_dir.glob("*"))


# ---- access control ------------------------------------------------------------------------
def test_only_authorised_staff_can_manage_videos(videos_dir, app, db, client, clock):
    assert client.get("/api/admin/hero-videos").status_code == 401
    assert client.post("/api/admin/hero-videos?filename=a.mp4", content=make_mp4()).status_code in (401, 403)
    customer, ccsrf, _ = staff(app, db, role="user", email="cust@example.com")
    assert customer.get("/api/admin/hero-videos").status_code == 401
    limited, lcsrf, _ = staff(app, db, role="admin", email="lim@example.com", permissions=["enquiries"])
    assert limited.get("/api/admin/hero-videos").status_code == 403
    assert limited.post("/api/admin/hero-videos?filename=a.mp4", content=make_mp4(), headers=lcsrf).status_code == 403
    allowed, acsrf, _ = staff(app, db, role="admin", email="ok@example.com", permissions=["hero_videos"])
    assert allowed.get("/api/admin/hero-videos").status_code == 200
    assert allowed.post("/api/admin/hero-videos?filename=a.mp4", content=make_mp4()).status_code == 403  # no CSRF header
    assert allowed.post("/api/admin/hero-videos?filename=a.mp4", content=make_mp4(), headers={**acsrf, "Content-Type": "video/mp4"}).status_code == 201


# ---- schedule ------------------------------------------------------------------------------
def three(admin):
    ids = {n: upload(admin, n).json()["id"] for n in ("A", "B", "C")}
    return ids


def test_three_day_slots_in_queue_order_and_repeat(admin, clock, client):
    ids = three(admin)
    expect = [
        (datetime(2026, 11, 1, 0, 0, tzinfo=IST), "A"), (datetime(2026, 11, 3, 23, 59, tzinfo=IST), "A"),
        (datetime(2026, 11, 4, 0, 0, tzinfo=IST), "B"), (datetime(2026, 11, 6, 23, 59, tzinfo=IST), "B"),
        (datetime(2026, 11, 7, 0, 0, tzinfo=IST), "C"), (datetime(2026, 11, 9, 23, 59, tzinfo=IST), "C"),
        (datetime(2026, 11, 10, 0, 0, tzinfo=IST), "A"), (datetime(2026, 11, 13, 0, 0, tzinfo=IST), "B"),
    ]
    for when, name in expect:
        clock(when)
        slot, body = active(client)
        assert slot["id"] == ids[name], (when, name)
        assert slot["url"].startswith(f"/api/public/hero-videos/{slot['id']}/file")
    clock(T0)
    slot, body = active(client)
    assert slot["starts_at"].startswith("2026-11-01T00:00:00+05:30") and slot["ends_at"].startswith("2026-11-04T00:00:00+05:30")
    assert body["next"]["id"] == ids["B"] and body["timezone"] == "Asia/Kolkata" and not body["fallback"]


def test_refreshing_never_restarts_the_schedule(admin, clock, client):
    ids = three(admin)
    clock(datetime(2026, 11, 5, 9, 0, tzinfo=IST))
    seen = {active(client)[0]["id"] for _ in range(5)}
    assert seen == {ids["B"]}
    clock(datetime(2026, 11, 5, 21, 0, tzinfo=IST))  # a visitor arriving hours later sees the same slot, not a fresh 3 days
    assert active(client)[0]["id"] == ids["B"]


def test_repeat_off_keeps_the_last_video(admin, clock, client):
    ids = three(admin)
    client_admin, csrf = admin
    r = client_admin.put("/api/admin/hero-videos/schedule", json={"slot_days": 3, "repeat": False}, headers=csrf)
    assert r.status_code == 200 and r.json()["config"]["repeat"] is False
    clock(datetime(2026, 11, 20, 12, 0, tzinfo=IST))
    slot, body = active(client)
    assert slot["id"] == ids["C"] and slot["ends_at"] is None and body["next"] is None


def test_single_video_loops_until_another_is_scheduled(admin, clock, client):
    a = upload(admin, "A").json()["id"]
    for day in (1, 4, 9, 30):
        clock(datetime(2026, 11, 1, 12, 0, tzinfo=IST) + timedelta(days=day))
        slot, body = active(client)
        assert slot["id"] == a and body["next"] is None
    clock(datetime(2026, 12, 2, 12, 0, tzinfo=IST))
    upload(admin, "B")
    assert active(client)[0]["id"] == a  # uploading never interrupts what is playing


def test_uploading_during_a_slot_does_not_interrupt_it(admin, clock, client):
    ids = three(admin)
    clock(datetime(2026, 11, 5, 9, 0, tzinfo=IST))
    assert active(client)[0]["id"] == ids["B"]
    d = upload(admin, "D").json()["id"]
    assert active(client)[0]["id"] == ids["B"]
    for when, want in [((2026, 11, 6, 23, 59), "B"), ((2026, 11, 7, 0, 0), "C"), ((2026, 11, 10, 0, 0), "D"), ((2026, 11, 13, 0, 0), "A")]:
        clock(datetime(*when, tzinfo=IST))
        assert active(client)[0]["id"] == {**ids, "D": d}[want], when


def test_disabling_the_playing_video_hands_over_safely_and_it_can_come_back(admin, clock, client):
    ids = three(admin)
    c, csrf = admin
    clock(datetime(2026, 11, 5, 9, 0, tzinfo=IST))
    assert c.patch(f"/api/admin/hero-videos/{ids['B']}", json={"is_active": False}, headers=csrf).status_code == 200
    assert active(client)[0]["id"] == ids["C"]  # the next video takes over at once, no blank
    clock(datetime(2026, 11, 7, 1, 0, tzinfo=IST))
    assert active(client)[0]["id"] == ids["A"]  # B is skipped in the rotation
    c.patch(f"/api/admin/hero-videos/{ids['B']}", json={"is_active": True}, headers=csrf)
    assert active(client)[0]["id"] == ids["A"]
    items = {v["title"]: v for v in c.get("/api/admin/hero-videos").json()["items"]}
    assert items["B"]["status"] in ("scheduled", "next") and items["A"]["status"] == "playing"


def test_deleting_videos_is_safe_including_the_last_one(admin, clock, client, videos_dir):
    ids = three(admin)
    c, csrf = admin
    clock(datetime(2026, 11, 5, 9, 0, tzinfo=IST))
    assert c.delete(f"/api/admin/hero-videos/{ids['B']}", headers=csrf).status_code == 204
    assert active(client)[0]["id"] == ids["C"] and len(list(videos_dir.glob("*.mp4"))) == 2
    assert client.get(f"/api/public/hero-videos/{ids['B']}/file").status_code == 404
    for name in ("A", "C"):
        assert c.delete(f"/api/admin/hero-videos/{ids[name]}", headers=csrf).status_code == 204
    slot, body = active(client)
    assert slot is None and body["fallback"] is True and body["next"] is None
    assert not list(videos_dir.glob("*.mp4"))
    assert upload(admin, "Fresh").status_code == 201 and active(client)[0] is not None


def test_a_missing_file_is_skipped_and_never_blanks_the_site(admin, clock, client, videos_dir):
    ids = three(admin)
    clock(datetime(2026, 11, 5, 9, 0, tzinfo=IST))
    key = svc.get  # noqa: F841 - keep the module imported for the clock fixture
    for path in videos_dir.glob("*.mp4"):
        path.unlink()
    slot, body = active(client)
    assert client.get("/api/public/hero-video").status_code == 200 and slot is None and body["fallback"] is True
    assert admin[0].get("/api/admin/hero-videos").json()["items"][0]["status"] == "missing_file"
    assert ids  # all three rows still exist; only the files are gone


def test_reorder_applies_after_the_playing_slot(admin, clock, client):
    ids = three(admin)
    c, csrf = admin
    clock(datetime(2026, 11, 2, 9, 0, tzinfo=IST))
    assert c.put("/api/admin/hero-videos/order", json={"ids": [ids["C"], ids["B"], ids["A"]]}, headers=csrf).status_code == 200
    assert active(client)[0]["id"] == ids["A"]  # still the playing one
    clock(datetime(2026, 11, 4, 0, 0, tzinfo=IST))
    assert active(client)[0]["id"] == ids["C"]
    clock(datetime(2026, 11, 7, 0, 0, tzinfo=IST))
    assert active(client)[0]["id"] == ids["B"]
    assert c.put("/api/admin/hero-videos/order", json={"ids": [ids["A"]]}, headers=csrf).status_code == 409  # stale list


def test_schedule_controls_start_date_and_slot_length(admin, clock, client):
    ids = three(admin)
    c, csrf = admin
    r = c.put("/api/admin/hero-videos/schedule", json={"start_date": "2026-11-20", "slot_days": 2, "repeat": True}, headers=csrf)
    assert r.status_code == 200 and r.json()["config"]["start_date"] == "2026-11-20"
    slot, body = active(client)
    assert slot is None and body["fallback"] and body["next"]["id"] == ids["A"] and body["next"]["starts_at"].startswith("2026-11-20T00:00:00+05:30")  # nothing plays before the start date
    admin_state = c.get("/api/admin/hero-videos").json()
    assert admin_state["current"] is None
    clock(datetime(2026, 11, 20, 8, 0, tzinfo=IST))
    assert active(client)[0]["id"] == ids["A"]
    clock(datetime(2026, 11, 22, 8, 0, tzinfo=IST))
    assert active(client)[0]["id"] == ids["B"]  # 2-day slots now
    assert c.put("/api/admin/hero-videos/schedule", json={"slot_days": 31}, headers=csrf).status_code == 422


def test_changing_slot_length_keeps_the_playing_video(admin, clock, client):
    ids = three(admin)
    c, csrf = admin
    clock(datetime(2026, 11, 5, 9, 0, tzinfo=IST))
    c.put("/api/admin/hero-videos/schedule", json={"slot_days": 5, "repeat": True}, headers=csrf)
    slot, _ = active(client)
    assert slot["id"] == ids["B"] and slot["starts_at"].startswith("2026-11-04") and slot["ends_at"].startswith("2026-11-09")


def test_dev_slot_override_allows_testing_rotation_in_minutes(env, videos_dir, clock, db):
    env(HERO_VIDEO_SLOT_SECONDS="120")
    from app.main import create_app

    c, csrf, _ = staff(create_app(), db, role="super_admin", email="root3@example.com")
    admin_pair = (c, csrf)
    clock(datetime(2026, 11, 1, 0, 0, 0, tzinfo=IST))  # with 2-minute slots, upload within the first slot
    ids = three(admin_pair)
    for minutes, want in [(0, "A"), (1, "A"), (2, "B"), (4, "C"), (6, "A")]:
        clock(datetime(2026, 11, 1, 0, minutes, 1, tzinfo=IST))
        body = c.get("/api/public/hero-video").json()
        assert body["active"]["id"] == ids[want], minutes
        assert body["check_again_in_seconds"] <= 120


# ---- serving files -------------------------------------------------------------------------
def test_public_can_fetch_only_the_playing_and_next_video_with_range_support(admin, clock, client):
    ids = three(admin)
    clock(datetime(2026, 11, 2, 9, 0, tzinfo=IST))
    full = client.get(f"/api/public/hero-videos/{ids['A']}/file")
    assert full.status_code == 200 and full.headers["content-type"] == "video/mp4" and full.headers["x-content-type-options"] == "nosniff"
    part = client.get(f"/api/public/hero-videos/{ids['A']}/file", headers={"Range": "bytes=0-9"})
    assert part.status_code == 206 and len(part.content) == 10
    assert client.get(f"/api/public/hero-videos/{ids['B']}/file").status_code == 200  # next
    assert client.get(f"/api/public/hero-videos/{ids['C']}/file").status_code == 404  # later in the queue: not public yet
    assert client.get("/api/public/hero-videos/00000000-0000-0000-0000-000000000000/file").status_code == 404
    public = client.get("/api/public/hero-video").text
    assert "title" not in public and "storage" not in public and "C:" not in public and "/storage" not in public


def test_replace_keeps_position_and_removes_the_old_file_poster_upload_works(admin, clock, client, videos_dir):
    ids = three(admin)
    c, csrf = admin
    clock(datetime(2026, 11, 2, 9, 0, tzinfo=IST))
    jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 64
    assert c.put(f"/api/admin/hero-videos/{ids['A']}/poster", content=jpeg, headers=csrf).json()["items"][0]["has_poster"]
    assert c.put(f"/api/admin/hero-videos/{ids['A']}/poster", content=b"not an image", headers=csrf).status_code == 415
    assert active(client)[0]["poster_url"]
    assert client.get(active(client)[0]["poster_url"]).status_code == 200
    before = sorted(p.name for p in videos_dir.iterdir())
    r = c.put(f"/api/admin/hero-videos/{ids['A']}/file?filename=new.mp4", content=make_mp4(20), headers={**csrf, "Content-Type": "video/mp4"})
    assert r.status_code == 200
    item = r.json()["items"][0]
    assert item["title"] == "A" and item["position"] == 1 and item["duration_seconds"] == pytest.approx(20) and not item["has_poster"]
    after = sorted(p.name for p in videos_dir.iterdir())
    assert len(after) == len(before) - 1  # old video and old poster replaced by the new video
    assert active(client)[0]["id"] == ids["A"]
    assert c.get(item["preview_url"]).status_code == 200  # admin preview of the current file
    bad = c.put(f"/api/admin/hero-videos/{ids['A']}/file?filename=bad.mp4", content=b"junk", headers={**csrf, "Content-Type": "video/mp4"})
    assert bad.status_code == 415 and sorted(p.name for p in videos_dir.iterdir()) == after
