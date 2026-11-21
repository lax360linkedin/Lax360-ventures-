"""End-to-end Play Zone flows (Milestone 8): the REAL routes (public player API and admin API together) on in-memory SQLite, driven only through HTTP like the browser does.
Not covered here because they need a real PostgreSQL / browser: cookie flags, CSRF header enforcement on a live session, and live-database locking."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from app.api import deps
from app.models import GameSession, PlayerProfile, VerifiedScore, User
from app.play_zone import catalog
from tests.test_play_zone import catch_payload, jump_payload
from tests.test_play_zone_admin import ALL, api, customer, db, factory, only  # noqa: F401  (fixtures)

SESS = "/api/play-zone/sessions"


def backdate(db, session_id: str, seconds: float = 100.0) -> None:
    s = db.get(GameSession, uuid.UUID(session_id))
    s.started_at = datetime.now(timezone.utc) - timedelta(seconds=seconds)
    db.commit()


def finish(api, db, who, game, payload, level=None, seconds=100.0):
    r = api.post(SESS, json={"game": game, **({"level_id": level} if level else {})}, headers=who)
    assert r.status_code == 201, r.text
    sid = r.json()["session_id"]
    backdate(db, sid, seconds)
    return sid, api.post(f"{SESS}/{sid}/complete", json={"result": payload}, headers=who)


def test_guest_to_registered_to_leaderboard_to_admin_review_to_return_visit(api, db):
    # 1. A guest can browse everything public but cannot start an official session or touch a profile
    assert api.get("/api/play-zone/config").status_code == 200
    assert api.get("/api/play-zone/leaderboards?game=overall&period=weekly").json()["items"] == []
    assert api.get("/api/play-zone/achievements").json()["signed_in"] is False
    assert api.get("/api/play-zone/challenges").json()["signed_in"] is False
    assert api.post(SESS, json={"game": "catch-the-stars"}).status_code == 401
    assert api.get("/api/play-zone/profile").status_code == 401
    assert api.post("/api/play-zone/games/puzzle-pop/progress", json={"levels": {}}).status_code == 401

    # 2. A registered player completes a game: the SERVER computes the score and records it once
    me = customer("rhea")
    _, inflated = finish(api, db, me, "catch-the-stars", catch_payload(score=5000, stars=20, golden=4))  # the browser claims far more than 20 stars and 4 golden stars can be worth
    assert inflated.json()["accepted"] is False and "score_out_of_range" in inflated.json()["reasons"]
    sid, done = finish(api, db, me, "catch-the-stars", catch_payload(score=330, stars=20, golden=4))  # Catch the Stars: the server bounds the score by the counts (it cannot see the x2 timing)
    out = done.json()
    assert done.status_code == 200 and out["accepted"] is True and out["score"] == 330 and "first-steps" in out["new_achievements"]
    again = api.post(f"{SESS}/{sid}/complete", json={"result": catch_payload(score=330)}, headers=me).json()
    assert again == out  # a repeated request returns exactly the same outcome (including the achievement notice)
    assert db.scalar(select(func.count()).select_from(VerifiedScore)) == 1 and db.scalar(select(PlayerProfile.games_played)) == 1  # nothing was counted twice

    # 3. The leaderboard shows the verified score with a nickname only (daily, weekly and all-time)
    for period in ("daily", "weekly", "all"):
        board = api.get(f"/api/play-zone/leaderboards?game=catch-the-stars&period={period}", headers=me).json()
        assert board["total"] == 1 and board["items"][0]["score"] == 330 and board["me"]["rank"] == 1
    overall = api.get("/api/play-zone/leaderboards?game=overall&period=all").json()["items"][0]
    assert overall["points"] == 220 and set(overall) >= {"rank", "nickname", "avatar", "score", "points"}
    public = json.dumps([api.get(f"/api/play-zone/leaderboards?game={g}&period=all").json() for g in ("overall", "catch-the-stars")]) + json.dumps(api.get("/api/play-zone/config").json())
    assert "rhea" not in public.lower().replace("rhea@", "") or "@example.com" not in public  # no e-mail or real name on any public response
    assert "example.com" not in public and "Private" not in public

    # 4. The achievement shows on the player's profile
    ach = {a["code"]: a for a in api.get("/api/play-zone/achievements", headers=me).json()["items"]}
    assert ach["first-steps"]["earned"] is True and ach["champion"]["earned"] is False

    # 5. Progress is saved by the server (a platform level) and a second device sees it
    lv = catalog.jump_info()["order"][0]
    _, jump = finish(api, db, me, "laxbot-jump", jump_payload(lv), level=lv)
    assert jump.json()["accepted"] is True
    progress = api.get("/api/play-zone/games/laxbot-jump/progress", headers=me).json()
    assert progress["data"]["levels"][lv]["verified"] is True and catalog.jump_info()["order"][1] in progress["data"]["unlocked"]
    stale = api.post("/api/play-zone/games/laxbot-jump/progress", json={"levels": {}, "base_version": 0}, headers=me).json()  # an old device cannot erase newer progress
    assert stale["data"]["levels"][lv]["verified"] is True

    # 6. An administrator reviews the score: invalidate removes it from the board, restore brings it back
    score = db.scalar(select(VerifiedScore).where(VerifiedScore.game == "catch-the-stars"))
    base = f"/api/admin/play-zone/scores/{score.id}"
    assert api.post(base + "/invalidate", json={"reason": "Reviewed: automated input"}, headers=ALL).status_code == 200
    from app.play_zone import service

    service.drop_ranking_cache()
    assert api.get("/api/play-zone/leaderboards?game=catch-the-stars&period=all").json()["items"] == []
    assert api.post(base + "/restore", json={"reason": "Appeal accepted after review"}, headers=ALL).status_code == 200
    service.drop_ranking_cache()
    assert api.get("/api/play-zone/leaderboards?game=catch-the-stars&period=all").json()["items"][0]["score"] == 330

    # 7. The player comes back: profile, bests and progress are all still there
    profile = api.get("/api/play-zone/profile", headers=me).json()
    assert profile["games_played"] == 2 and profile["personal_bests"]["catch-the-stars"]["main"] == 330 and profile["progress"]["laxbot-jump"]["levels_completed"] == [lv]
    assert "email" not in json.dumps(profile).lower() and "Private" not in json.dumps(profile)
    detail = api.get(f"/api/admin/play-zone/scores/{score.id}", headers=ALL).json()
    assert [e["action"] for e in detail["moderation_history"]] == ["restore", "invalidate"]


def test_cheating_attempts_are_rejected_or_held_and_never_reach_the_boards(api, db):
    me, other = customer("sam"), customer("tia")
    # a result for a session that belongs to someone else
    sid = api.post(SESS, json={"game": "catch-the-stars"}, headers=me).json()["session_id"]
    backdate(db, sid)
    assert api.post(f"{SESS}/{sid}/complete", json={"result": catch_payload()}, headers=other).status_code == 404
    # impossible results: too short a round, a negative or inflated count, the wrong shape
    for bad in (catch_payload(survived=3), catch_payload(stars=9999), catch_payload(bombsHit=9), {"score": 5}, {}):
        s2, r = finish(api, db, me, "catch-the-stars", bad)
        assert r.json()["accepted"] is False and r.json()["reasons"], bad
    # an instant "completion" (no time spent) is refused by the server clock
    s3, r3 = finish(api, db, me, "catch-the-stars", catch_payload(), seconds=2.0)
    assert r3.json()["accepted"] is False
    # a locked level cannot be played officially, and an unknown level is refused
    locked = catalog.jump_info()["order"][2]
    _, r4 = finish(api, db, me, "laxbot-jump", jump_payload(locked), level=locked)
    assert r4.json()["accepted"] is False
    assert api.post(SESS, json={"game": "laxbot-jump", "level_id": "no-such-level"}, headers=me).status_code == 422
    assert api.post(SESS, json={"game": "chess"}, headers=me).status_code == 422
    # an expired session cannot be completed later
    s5 = api.post(SESS, json={"game": "catch-the-stars"}, headers=me).json()["session_id"]
    backdate(db, s5, 60 * 60 * 5)
    assert api.post(f"{SESS}/{s5}/complete", json={"result": catch_payload()}, headers=me).json()["accepted"] is False
    # an oversized body is refused before it is processed
    s6 = api.post(SESS, json={"game": "catch-the-stars"}, headers=me).json()["session_id"]
    assert api.post(f"{SESS}/{s6}/complete", json={"result": {"junk": "x" * 30000}}, headers=me).status_code == 413
    assert db.scalar(select(func.count()).select_from(VerifiedScore)) == 0
    assert api.get("/api/play-zone/leaderboards?game=overall&period=all").json()["items"] == []


def test_retries_and_repeated_requests_are_safe(api, db):
    me = customer("uma")
    a = api.post(SESS, json={"game": "catch-the-stars", "request_key": "retry-key-0001"}, headers=me).json()
    b = api.post(SESS, json={"game": "catch-the-stars", "request_key": "retry-key-0001"}, headers=me).json()
    assert a["session_id"] == b["session_id"]  # a retried start (network hiccup) returns the same run
    assert db.scalar(select(func.count()).select_from(GameSession)) == 1
    backdate(db, a["session_id"])
    r1 = api.post(f"{SESS}/{a['session_id']}/complete", json={"result": catch_payload()}, headers=me).json()
    r2 = api.post(f"{SESS}/{a['session_id']}/complete", json={"result": catch_payload()}, headers=me).json()
    assert r1 == r2 and db.scalar(select(func.count()).select_from(VerifiedScore)) == 1
    # profile edits repeated: the same nickname twice is fine, a taken one is not
    assert api.patch("/api/play-zone/profile", json={"nickname": "Uma Star"}, headers=me).status_code == 200
    assert api.patch("/api/play-zone/profile", json={"nickname": "Uma Star"}, headers=me).status_code == 200
    assert api.patch("/api/play-zone/profile", json={"nickname": "Uma Star"}, headers=customer("vic")).status_code == 409
    # a malformed id is a clean 422, not a crash
    assert api.post(f"{SESS}/not-a-uuid/complete", json={"result": {}}, headers=me).status_code == 422
    assert api.post(f"{SESS}/{uuid.uuid4()}/complete", json={"result": {}}, headers=me).status_code == 404


def test_daily_challenge_progress_claiming_and_the_timezone_day(api, db):
    me = customer("wes")
    finish(api, db, me, "catch-the-stars", catch_payload(stars=36, golden=2, score=450))
    items = api.get("/api/play-zone/challenges", headers=me).json()
    assert items["timezone"] == "Asia/Kolkata" and items["expires_at"] > items["starts_at"]
    stars = next(i for i in items["items"] if i["code"] == "stars")
    assert stars["completed"] is True and stars["claimable"] is True
    assert api.post(f"/api/play-zone/challenges/{stars['id']}/claim", headers=me).status_code == 200
    assert api.post(f"/api/play-zone/challenges/{stars['id']}/claim", headers=me).status_code == 409  # one reward per challenge
    assert api.post(f"/api/play-zone/challenges/{stars['id']}/claim", headers=customer("xia")).status_code == 409  # someone else cannot claim a challenge they did not complete
    assert api.get("/api/play-zone/achievements", headers=me).json()["items"] and any(a["code"] == "daily-hero" and a["earned"] for a in api.get("/api/play-zone/achievements", headers=me).json()["items"])


def test_customers_and_unprivileged_staff_cannot_reach_the_admin_api(api, db):
    from app.core.errors import ApiError
    import pytest

    customer_user = User(full_name="C", email="c@example.com", password_hash="x", role="user", permissions=[], is_active=True)
    with pytest.raises(ApiError) as e:
        deps._staff_only(customer_user)  # the real staff check used by every admin route
    assert e.value.status_code == 403
    inactive = User(full_name="A", email="a@example.com", password_hash="x", role="admin", permissions=["pz_games"], is_active=False)
    with pytest.raises(ApiError):
        deps._staff_only(inactive)
    # the public player API never returns another player's private data, and admin endpoints are not on the public prefix
    assert api.get("/api/admin/play-zone/players", headers=customer("yan")).status_code == 401
    assert api.get("/api/admin/play-zone/players", headers=only("pz_analytics")).status_code == 403
    assert api.get("/api/play-zone/players").status_code == 404
