"""Play Zone administration tests (Milestone 7). Like test_play_zone.py they need NO PostgreSQL: the real admin routes run on an in-memory SQLite database that holds only the tables
involved. Staff identity is injected through the same dependencies the admin panel uses (so the real permission checks run); the PostgreSQL migration is checked as generated SQL."""

from __future__ import annotations

import base64
import io
import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import deps
from app.core.errors import ApiError
from app.db.base import Base
from app.db.session import get_db, get_read_db
from app.models import AchievementDef, AuditLog, ChallengeTemplate, ContentItem, GameConfig, GameSession, MediaAsset, ModerationEvent, PlayerProfile, SiteSetting, User, VerifiedScore
from app.play_zone import admin_service, catalog, config_store, service
from tests.test_play_zone import TABLES as PZ_TABLES, catch_payload, jump_payload, make_user, past, play

TABLES = [*PZ_TABLES, AuditLog.__table__, ContentItem.__table__, SiteSetting.__table__]
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
PERMS = ["pz_analytics", "pz_games", "pz_players", "pz_moderation", "pz_achievements", "pz_challenges", "pz_media", "pz_settings", "pz_audit"]


@pytest.fixture
def factory():
    engine = create_engine("sqlite+pysqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine, tables=TABLES)
    make = sessionmaker(bind=engine, expire_on_commit=False)
    with make() as db:
        for c, t, d, g, i, s in catalog.ACHIEVEMENTS:
            db.add(AchievementDef(code=c, title=t, description=d, game=g, icon=i, sort_order=s, active=True))
        db.commit()
    service.drop_ranking_cache(); config_store.drop_cache(); admin_service.drop_cache()
    yield make
    engine.dispose()


@pytest.fixture
def db(factory):
    with factory() as s:
        yield s


@pytest.fixture
def api(factory, monkeypatch, tmp_path):
    from app.core.rate_limit import limiter
    from app.main import create_app
    from app.services import media_service

    limiter.reset()
    monkeypatch.setattr(media_service.store, "require_durable", lambda settings: "local")
    monkeypatch.setattr(media_service.store, "backend", lambda settings: "local")
    monkeypatch.setattr(media_service.store, "put", lambda *a, **k: None)
    monkeypatch.setattr(media_service.store, "delete", lambda *a, **k: True)
    app = create_app()
    people: dict[str, User] = {}

    def db_dep():
        with factory() as s:
            yield s

    def person(request: Request) -> User:
        name = request.headers.get("x-test-staff")
        if not name:
            raise ApiError(401, "unauthorized", "Sign in required.")
        role = request.headers.get("x-test-role", "admin")
        perms = [p for p in request.headers.get("x-test-perms", "").split(",") if p]
        key = f"{name}:{role}"
        if key not in people:
            with factory() as s:
                u = User(full_name=name, email=f"{name}@lax360.test", password_hash="x", role=role, permissions=perms, is_active=True)
                s.add(u); s.commit(); people[key] = u
        people[key].permissions = perms
        return deps._staff_only(people[key])

    def customer(request: Request):
        name = request.headers.get("x-test-user")
        if not name:
            raise ApiError(401, "unauthorized", "Sign in required.")
        if name not in people:
            with factory() as s:
                people[name] = make_user(s, name=f"{name} Private", email=f"{name}@example.com")
        return people[name]

    app.dependency_overrides[get_db] = db_dep
    app.dependency_overrides[get_read_db] = db_dep
    app.dependency_overrides[deps.staff_user] = person
    app.dependency_overrides[deps.staff_user_csrf] = person
    app.dependency_overrides[deps.current_user] = customer
    app.dependency_overrides[deps.csrf_user] = customer
    def optional(request: Request):
        return customer(request) if request.headers.get("x-test-user") else None

    app.dependency_overrides[deps.optional_user] = optional
    with TestClient(app, base_url="http://localhost", raise_server_exceptions=False) as c:
        c.people = people
        yield c
    app.dependency_overrides.clear()


SUPER = {"x-test-staff": "boss", "x-test-role": "super_admin"}
ALL = {"x-test-staff": "ops", "x-test-role": "admin", "x-test-perms": ",".join(PERMS)}


def only(*perms) -> dict:
    return {"x-test-staff": "limited", "x-test-role": "admin", "x-test-perms": ",".join(perms)}


def customer(name="kiran") -> dict:
    return {"x-test-user": name}


def audit(db, prefix="playzone."):
    return [r for r in db.scalars(select(AuditLog).order_by(AuditLog.created_at)) if r.action.startswith(prefix)]


# ================================================================== access control
ADMIN_GETS = ["/overview", "/analytics", "/games", "/players", "/leaderboards", "/scores", "/achievements", "/challenges", "/media", "/settings", "/audit-logs"]


def test_unauthenticated_and_customer_sessions_never_reach_the_admin_api(api):
    for path in ADMIN_GETS:
        assert api.get(f"/api/admin/play-zone{path}").status_code == 401, path
        assert api.get(f"/api/admin/play-zone{path}", headers=customer()).status_code == 401, path  # a website customer is not staff
    # a customer identity pushed through the staff dependency is refused by the real staff check
    assert api.patch("/api/admin/play-zone/settings", json={"values": {"guest_play": True}}).status_code == 401


def test_each_endpoint_needs_its_own_permission_and_super_admin_has_all(api):
    needs = {"/overview": "pz_analytics", "/analytics": "pz_analytics", "/games": "pz_games", "/players": "pz_players", "/leaderboards": "pz_moderation", "/scores": "pz_moderation", "/achievements": "pz_achievements",
             "/challenges": "pz_challenges", "/media": "pz_media", "/settings": "pz_settings", "/audit-logs": "pz_audit"}
    for path, perm in needs.items():
        others = [p for p in PERMS if p != perm]
        assert api.get(f"/api/admin/play-zone{path}", headers=only(*others)).status_code == 403, path
        assert api.get(f"/api/admin/play-zone{path}", headers=only(perm)).status_code == 200, path
        assert api.get(f"/api/admin/play-zone{path}", headers=SUPER).status_code == 200, path
    assert api.get("/api/admin/play-zone/games", headers={"x-test-staff": "nobody", "x-test-role": "admin"}).status_code == 403  # an admin with no Play Zone permission
    assert api.patch("/api/admin/play-zone/games/puzzle-pop", json={"enabled": False}, headers=only("pz_analytics")).status_code == 403


def test_play_zone_permissions_are_known_modules_that_a_role_can_be_given():
    from app.core.permissions import MODULES, clean_permissions

    assert set(PERMS) <= set(MODULES) and clean_permissions(PERMS + ["bogus"]) == [m for m in MODULES if m in PERMS]


# ================================================================== games
def test_disabling_a_game_stops_new_sessions_but_lets_a_running_one_finish(api, db):
    r = api.post("/api/play-zone/sessions", json={"game": "catch-the-stars"}, headers=customer("ann"))
    assert r.status_code == 201
    running = r.json()["session_id"]
    off = api.patch("/api/admin/play-zone/games/catch-the-stars", json={"enabled": False}, headers=ALL)
    assert off.status_code == 200 and off.json()["enabled"] is False
    blocked = api.post("/api/play-zone/sessions", json={"game": "catch-the-stars"}, headers=customer("ann"))
    assert blocked.status_code == 409 and blocked.json()["error"]["code"] == "game_unavailable"
    assert api.post("/api/play-zone/sessions", json={"game": "puzzle-pop", "level_id": catalog.level_ids("puzzle-pop")[0]}, headers=customer("ann")).status_code == 201  # other games unaffected
    s = db.get(GameSession, uuid.UUID(running)); s.started_at = datetime.now(timezone.utc) - timedelta(seconds=100); db.commit()
    done = api.post(f"/api/play-zone/sessions/{running}/complete", json={"result": catch_payload()}, headers=customer("ann"))
    assert done.status_code == 200 and done.json()["accepted"] is True  # documented policy: a started round can still be completed
    on = api.patch("/api/admin/play-zone/games/catch-the-stars", json={"enabled": True}, headers=ALL)
    assert on.status_code == 200 and api.post("/api/play-zone/sessions", json={"game": "catch-the-stars"}, headers=customer("ann")).status_code == 201
    actions = [a.action for a in audit(db)]
    assert actions == ["playzone.game.disable", "playzone.game.enable"] and audit(db)[0].admin_email == "ops@lax360.test"


def test_maintenance_unpublished_closed_zone_and_disabled_levels_block_new_sessions(api):
    h = customer("bea")
    for patch, code in (({"maintenance": True}, "game_maintenance"), ({"published": False}, "game_unavailable")):
        api.patch("/api/admin/play-zone/games/catch-the-stars", json=patch, headers=ALL)
        r = api.post("/api/play-zone/sessions", json={"game": "catch-the-stars"}, headers=h)
        assert r.status_code in (409, 503) and r.json()["error"]["code"] == code
        api.patch("/api/admin/play-zone/games/catch-the-stars", json={"maintenance": False, "published": True}, headers=ALL)
    lv = catalog.level_ids("laxbot-jump")
    api.patch("/api/admin/play-zone/games/laxbot-jump", json={"disabled_levels": [lv[0]]}, headers=ALL)
    r = api.post("/api/play-zone/sessions", json={"game": "laxbot-jump", "level_id": lv[0]}, headers=h)
    assert r.status_code == 409 and r.json()["error"]["code"] == "level_unavailable"
    assert api.patch("/api/admin/play-zone/games/laxbot-jump", json={"disabled_levels": ["nope"]}, headers=ALL).status_code == 422
    assert api.patch("/api/admin/play-zone/games/catch-the-stars", json={"disabled_levels": ["main"]}, headers=ALL).status_code == 422
    api.patch("/api/admin/play-zone/settings", json={"values": {"enabled": False}, "confirm": True}, headers=ALL)
    assert api.post("/api/play-zone/sessions", json={"game": "catch-the-stars"}, headers=h).json()["error"]["code"] == "play_zone_closed"


def test_game_configuration_is_validated_versioned_and_pinned_to_sessions(api, db):
    url = "/api/admin/play-zone/games/catch-the-stars"
    for bad in ({"params": {"duration_seconds": 5}}, {"params": {"duration_seconds": "30"}}, {"params": {"initial_lives": 99}}, {"params": {"difficulty": "nightmare"}}, {"params": {"eval": "1+1"}}, {"params": [1]}, {"visibility": "secret"}, {"sort_order": -1}):
        assert api.patch(url, json=bad, headers=ALL).status_code == 422, bad
    v1 = api.post("/api/play-zone/sessions", json={"game": "catch-the-stars"}, headers=customer("cy")).json()["session_id"]
    ok = api.patch(url, json={"params": {"duration_seconds": 40, "difficulty": "hard"}}, headers=ALL)
    assert ok.status_code == 200 and ok.json()["config_version"] == 2 and ok.json()["params"]["duration_seconds"] == 40
    same = api.patch(url, json={"params": {"duration_seconds": 40}}, headers=ALL)
    assert same.json()["config_version"] == 2  # an unchanged profile does not create a new version
    v2 = api.post("/api/play-zone/sessions", json={"game": "catch-the-stars"}, headers=customer("cy")).json()["session_id"]
    assert db.get(GameSession, uuid.UUID(v1)).config["config_version"] == 1 and db.get(GameSession, uuid.UUID(v2)).config["config_version"] == 2  # old sessions stay verifiable against version 1
    versions = api.get(url + "/versions", headers=ALL).json()["items"]
    assert [v["version"] for v in versions] == [2, 1] and versions[1]["params"]["duration_seconds"] == 30
    # gameplay profiles never loosen verification: the verifier ignores them (a 5-second "round" is still rejected)
    from app.play_zone import verify

    assert verify.verify_catch(catch_payload(survived=5), 5.0).ok is False


def test_featured_is_exclusive_title_text_and_order_are_saved(api):
    api.patch("/api/admin/play-zone/games/puzzle-pop", json={"featured": True, "title": "Puzzle Pop!", "short_description": "Match gems", "sort_order": 0}, headers=ALL)
    api.patch("/api/admin/play-zone/games/bug-hunter", json={"featured": True, "sort_order": 0}, headers=ALL)
    items = {g["game"]: g for g in api.get("/api/admin/play-zone/games", headers=ALL).json()["items"]}
    assert items["bug-hunter"]["featured"] is True and items["puzzle-pop"]["featured"] is False and items["puzzle-pop"]["title"] == "Puzzle Pop!"
    cfg = api.get("/api/play-zone/config").json()
    assert [g["slug"] for g in cfg["games"]][:2] == ["puzzle-pop", "bug-hunter"] and cfg["games"][0]["title"] == "Puzzle Pop!" and "email" not in json.dumps(cfg)


# ================================================================== players
def test_player_directory_search_pagination_and_privacy(api, db):
    users = [make_user(db, name=f"Real Name {i}", email=f"private{i}@example.com") for i in range(7)]
    for i, u in enumerate(users):
        p = service.get_profile(db, u); p.nickname, p.nickname_key = f"Hero{i}", f"hero{i}"; p.verified_points = i * 10
    db.commit()
    page1 = api.get("/api/admin/play-zone/players?page=1&page_size=3&sort=points", headers=ALL).json()
    assert page1["total"] == 7 and len(page1["items"]) == 3 and page1["pages"] == 3 and [p["nickname"] for p in page1["items"]] == ["Hero6", "Hero5", "Hero4"]
    assert len(api.get("/api/admin/play-zone/players?page=3&page_size=3&sort=points", headers=ALL).json()["items"]) == 1
    found = api.get("/api/admin/play-zone/players?q=hero3", headers=ALL).json()
    assert found["total"] == 1 and found["items"][0]["nickname"] == "Hero3"
    blob = json.dumps(api.get("/api/admin/play-zone/players?page_size=100", headers=ALL).json()) + json.dumps(api.get(f"/api/admin/play-zone/players/{found['items'][0]['id']}", headers=ALL).json())
    assert "example.com" not in blob and "Real Name" not in blob  # no e-mail or real name is shown
    assert api.get(f"/api/admin/play-zone/players/{uuid.uuid4()}", headers=ALL).status_code == 404
    assert api.get("/api/admin/play-zone/players?page_size=1000", headers=ALL).status_code == 422  # bounded pages


def test_suspension_pauses_play_zone_only_and_is_reversible(api, db):
    u = make_user(db); p = service.get_profile(db, u); db.commit()
    play(db, u, "catch-the-stars", payload=catch_payload())
    me = customer("dee"); me_user = api.get("/api/play-zone/leaderboards", headers=me)  # creates nothing; just warms the client
    assert me_user.status_code == 200
    path = f"/api/admin/play-zone/players/{p.id}"
    assert api.post(path + "/suspend", json={"reason": "  "}, headers=ALL).status_code == 422  # a reason is required
    assert api.post(path + "/suspend", json={"reason": "Automated scoring detected"}, headers=only("pz_analytics")).status_code == 403
    assert api.post(path + "/suspend", json={"reason": "Automated scoring detected"}, headers=ALL).json()["suspended"] is True
    db.expire_all()
    assert db.get(User, u.id).is_active is True  # the website account is untouched
    assert p.suspended or db.get(PlayerProfile, p.id).suspended
    lb = service.ranking(db, "overall", "all", service.utcnow(), service.periods.zone("Asia/Kolkata"))
    assert all(r["user_id"] != u.id for r in lb)  # off the boards
    with pytest.raises(ApiError) as e:
        service.start_session(db, u, "catch-the-stars", None, None)
    assert e.value.code == "play_zone_suspended"
    with pytest.raises(ApiError):
        service.merge_progress(db, u, "puzzle-pop", {"levels": {}}, base_version=None, imported=False)
    detail = api.get(path, headers=ALL).json()
    assert detail["suspended"] and detail["suspended_reason"] == "Automated scoring detected" and detail["moderation_history"][0]["action"] == "suspend"
    assert api.post(path + "/restore", json={"reason": "Reviewed, false alarm"}, headers=ALL).json()["suspended"] is False
    db.expire_all()
    assert service.start_session(db, u, "catch-the-stars", None, None) is not None
    assert [a.action for a in audit(db)] == ["playzone.player.suspend", "playzone.player.restore"]
    assert api.get("/api/admin/play-zone/players?status=suspended", headers=ALL).json()["total"] == 0


# ================================================================== leaderboard moderation
def _boards(db):
    return service.ranking(db, "catch-the-stars", "all", service.utcnow(), service.periods.zone("Asia/Kolkata"))


def test_invalidating_and_restoring_a_score_recalculates_rankings_with_history(api, db):
    a, b = make_user(db), make_user(db)
    play(db, a, "catch-the-stars", payload=catch_payload(score=330))
    play(db, b, "catch-the-stars", payload=catch_payload(score=300, golden=3, stars=21))
    top = _boards(db)[0]
    assert top["score"] == 330
    sc = db.scalar(select(VerifiedScore).where(VerifiedScore.user_id == a.id))
    path = f"/api/admin/play-zone/scores/{sc.id}"
    assert api.post(path + "/invalidate", json={"reason": "x"}, headers=ALL).status_code == 422
    assert api.post(path + "/invalidate", json={"reason": "Replayed request"}, headers=only("pz_analytics")).status_code == 403
    assert api.post(path + "/invalidate", json={"reason": "Replayed request"}, headers=ALL).json()["status"] == "hidden"
    db.expire_all(); service.drop_ranking_cache()
    assert _boards(db)[0]["score"] == 300 and len(_boards(db)) == 1  # the next best moves up
    assert db.scalar(select(PlayerProfile.verified_points).where(PlayerProfile.user_id == a.id)) == 0
    assert api.post(path + "/invalidate", json={"reason": "again please"}, headers=ALL).status_code == 409
    assert api.post(path + "/restore", json={"reason": "Mistake: verified OK"}, headers=ALL).json()["status"] == "accepted"
    db.expire_all(); service.drop_ranking_cache()
    assert _boards(db)[0]["score"] == 330 and db.get(VerifiedScore, sc.id).score == 330  # the value was never edited
    detail = api.get(path, headers=ALL).json()
    assert [e["action"] for e in detail["moderation_history"]] == ["restore", "invalidate"] and detail["verification"]["verdict"] == "accepted" and detail["details"]
    assert "_fx" not in json.dumps(detail["details"])
    assert api.patch(path, json={"score": 99999}, headers=ALL).status_code == 405  # there is no way to edit a verified value
    assert [a_.action for a_ in audit(db)] == ["playzone.score.invalidate", "playzone.score.restore"]
    assert api.get("/api/admin/play-zone/scores?game=catch-the-stars&status=hidden", headers=ALL).json()["total"] == 0
    assert api.get("/api/admin/play-zone/scores?game=catch-the-stars&q=" + db.scalar(select(PlayerProfile.nickname_key).where(PlayerProfile.user_id == a.id)), headers=ALL).json()["total"] == 1


def test_approving_a_flagged_score_applies_its_effects_exactly_once(api, db):
    u = make_user(db)
    s, _ = play(db, u, "catch-the-stars", payload=catch_payload(score=250, golden=0, stars=25))
    sc = db.scalar(select(VerifiedScore).where(VerifiedScore.user_id == u.id))
    sc.status, sc.flags, sc.details = "flagged", ["very_fast"], {"_fx": False, "_metrics": {"stars_collected": 25}}
    p = service.get_profile(db, u); p.stats, p.verified_points = {}, 0
    row = service.get_progress_row(db, u, "catch-the-stars"); row.data = {"best": 0}
    db.commit(); service.drop_ranking_cache()
    assert _boards(db) == [] and api.get("/api/admin/play-zone/overview", headers=ALL).json()["kpis"]["flagged_scores"] == 1
    assert api.post(f"/api/admin/play-zone/scores/{sc.id}/restore", json={"reason": "Looks legitimate"}, headers=ALL).status_code == 200
    db.expire_all(); p = db.get(PlayerProfile, p.id)
    assert p.stats["stars_collected"] == 25 and p.verified_points > 0 and service.get_progress_row(db, u, "catch-the-stars").data["best"] == 250
    assert api.post(f"/api/admin/play-zone/scores/{sc.id}/approve", json={"reason": "second time"}, headers=ALL).status_code == 409  # already valid
    api.post(f"/api/admin/play-zone/scores/{sc.id}/invalidate", json={"reason": "Changed my mind"}, headers=ALL)
    api.post(f"/api/admin/play-zone/scores/{sc.id}/restore", json={"reason": "Changed it back"}, headers=ALL)
    db.expire_all()
    assert db.get(PlayerProfile, p.id).stats["stars_collected"] == 25  # effects are never applied twice


# ================================================================== achievements
def test_achievement_crud_uses_validated_rules_and_never_awards_twice(api, db):
    url = "/api/admin/play-zone/achievements"
    for bad in ({"rule_type": "sql", "rule_params": {"n": 1}}, {"rule_type": "games_played", "rule_params": {"n": 0}}, {"rule_type": "games_played", "rule_params": {"n": 1, "x": 2}},
                {"rule_type": "score_at_least", "rule_params": {"game": "chess", "n": 5}}, {"rule_type": "levels_completed", "rule_params": {"game": "puzzle-pop", "n": 999}},
                {"rule_type": "games_played", "rule_params": {"n": "1; DROP TABLE users"}}):
        assert api.post(url, json={"title": "Bad one", "description": "Nope nope", **bad}, headers=ALL).status_code == 422, bad
    assert api.post(url, json={"title": "Warm Up", "description": "Play two games", "rule_type": "games_played", "rule_params": {"n": 2}, "reward_points": 25}, headers=only("pz_analytics")).status_code == 403
    made = api.post(url, json={"title": "Warm Up", "description": "Play two games", "rule_type": "games_played", "rule_params": {"n": 2}, "reward_points": 25, "game": None}, headers=ALL)
    assert made.status_code == 201 and made.json()["code"] == "warm-up" and made.json()["earned_count"] == 0
    assert api.post(url, json={"title": "Warm Up", "description": "Duplicate", "rule_type": "games_played", "rule_params": {"n": 2}}, headers=ALL).status_code == 409
    u = make_user(db)
    play(db, u, "catch-the-stars", payload=catch_payload())
    assert "warm-up" not in [a["code"] for a in service.achievements_for(db, u) if a["earned"]]
    eligible_before = api.get(url + "/warm-up/eligible", headers=ALL).json()["items"]
    assert eligible_before == []
    _, out = play(db, u, "catch-the-stars", payload=catch_payload())
    assert "warm-up" in out["new_achievements"]
    points = db.scalar(select(PlayerProfile.verified_points).where(PlayerProfile.user_id == u.id))
    _, again = play(db, u, "catch-the-stars", payload=catch_payload())
    assert "warm-up" not in again["new_achievements"]  # never twice
    assert db.scalar(select(PlayerProfile.verified_points).where(PlayerProfile.user_id == u.id)) >= points + 0
    listed = {a["code"]: a for a in api.get(url, headers=ALL).json()["items"]}
    assert listed["warm-up"]["earned_count"] == 1 and listed["first-steps"]["built_in"] is True
    # edit, disable and the built-in rule protection
    assert api.patch(url + "/warm-up", json={"title": "Warm Up!", "rule_params": {"n": 3}, "active": False}, headers=ALL).json()["active"] is False
    assert api.patch(url + "/first-steps", json={"rule_type": "games_played", "rule_params": {"n": 1}}, headers=ALL).status_code == 422
    assert api.patch(url + "/first-steps", json={"reward_points": 5, "title": "First Steps"}, headers=ALL).status_code == 200
    public = {a["code"] for a in api.get("/api/play-zone/achievements").json()["items"]}
    assert "warm-up" not in public and "first-steps" in public  # disabled achievements are hidden from players
    assert api.patch(url + "/nope", json={"title": "Whatever"}, headers=ALL).status_code == 404
    actions = [a.action for a in audit(db)]
    assert actions.count("playzone.achievement.create") == 1 and actions.count("playzone.achievement.update") == 2


def test_reward_points_count_in_profile_points_once(api, db):
    api.post("/api/admin/play-zone/achievements", json={"title": "Bonus", "description": "Play one game", "rule_type": "games_played", "rule_params": {"n": 1}, "reward_points": 40}, headers=ALL)
    u = make_user(db)
    _, out = play(db, u, "catch-the-stars", payload=catch_payload())
    p = db.scalar(select(PlayerProfile).where(PlayerProfile.user_id == u.id))
    assert "bonus" in out["new_achievements"] and p.verified_points == 220 + 40 and service.ranking(db, "overall", "all", service.utcnow(), service.periods.zone("Asia/Kolkata"))[0]["points"] == 260


# ================================================================== challenges
def test_challenge_crud_scheduling_and_generation(api, db):
    url = "/api/admin/play-zone/challenges"
    tz = service.periods.zone("Asia/Kolkata")
    today = service.periods.local_date(service.utcnow(), tz)
    base = api.get(url, headers=ALL)
    assert base.status_code == 200 and base.json()["items"] == [] and "Weekly" in base.json()["supported"]  # nothing seeded in this SQLite database: the built-in set is the fallback
    for bad in ({"metric": "sql_injection", "game": None, "target": 3}, {"metric": "stars_collected", "game": "puzzle-pop", "target": 3}, {"metric": "stars_collected", "game": "catch-the-stars", "target": 0},
                {"metric": "distinct_games", "game": None, "target": 9}, {"metric": "stars_collected", "game": "catch-the-stars", "target": 3, "title": "Catch {bogus} stars"}):
        assert api.post(url, json={"title": "Catch {n} stars", "description": "Catch some stars", **bad}, headers=ALL).status_code == 422, bad
    mk = api.post(url, json={"title": "Catch {n} stars today", "description": "Collect {n} stars", "metric": "stars_collected", "game": "catch-the-stars", "target": 12, "reward_points": 15}, headers=ALL)
    assert mk.status_code == 201 and mk.json()["targets"] == [12] * 7
    cid = mk.json()["id"]
    day = service.challenges_for(db, None, service.utcnow(), tz); db.commit()
    assert [c["title"] for c in day["items"]] == ["Catch 12 stars today"] and day["items"][0]["reward_points"] == 15
    # edits and the schedule apply to days that are not generated yet; today's challenge stays a snapshot
    assert api.patch(f"{url}/{cid}", json={"reward_points": 99, "target": 40}, headers=ALL).status_code == 200
    assert service.challenges_for(db, None, service.utcnow(), tz)["items"][0]["reward_points"] == 15
    tomorrow = today + timedelta(days=1)
    assert service.ensure_challenges(db, tomorrow, tz)[0].target == 40 and service.ensure_challenges(db, tomorrow, tz)[0].reward_points == 99  # tomorrow is generated from the edited template
    assert api.patch(f"{url}/{cid}", json={"starts_on": (today + timedelta(days=5)).isoformat(), "ends_on": (today + timedelta(days=2)).isoformat()}, headers=ALL).status_code == 422
    api.patch(f"{url}/{cid}", json={"starts_on": (today + timedelta(days=30)).isoformat()}, headers=ALL)
    assert service.ensure_challenges(db, today + timedelta(days=3), tz) == []  # outside its window: not generated
    api.patch(f"{url}/{cid}", json={"clear_schedule": True, "active": False}, headers=ALL)
    assert service.ensure_challenges(db, today + timedelta(days=4), tz) == []  # deactivated
    t = db.get(ChallengeTemplate, uuid.UUID(cid))
    assert t.active is False and t.reward_points == 99 and t.targets == [40] * 7
    assert api.patch(f"{url}/{uuid.uuid4()}", json={"active": True}, headers=ALL).status_code == 404
    assert api.post(url, json={"title": "Catch {n} stars today", "description": "dup", "metric": "stars_collected", "game": "catch-the-stars", "target": 3}, headers=ALL).status_code == 409
    assert [a.action for a in audit(db)].count("playzone.challenge.update") >= 3


def test_challenge_reward_is_claimed_once_and_the_switch_hides_challenges(api, db):
    api.post("/api/admin/play-zone/challenges", json={"title": "Collect {n} stars", "description": "Collect {n} stars", "metric": "stars_collected", "game": "catch-the-stars", "target": 5, "reward_points": 10}, headers=ALL)
    h = customer("eli")
    s = api.post("/api/play-zone/sessions", json={"game": "catch-the-stars"}, headers=h).json()["session_id"]
    with factory_session(api) as sess:
        past(sess, uuid.UUID(s), 100)
    api.post(f"/api/play-zone/sessions/{s}/complete", json={"result": catch_payload()}, headers=h)
    items = api.get("/api/play-zone/challenges", headers=h).json()["items"]
    assert items[0]["claimable"] is True
    assert api.post(f"/api/play-zone/challenges/{items[0]['id']}/claim", headers=h).status_code == 200
    assert api.post(f"/api/play-zone/challenges/{items[0]['id']}/claim", headers=h).status_code == 409
    api.patch("/api/admin/play-zone/settings", json={"values": {"daily_challenges": False}, "confirm": True}, headers=ALL)
    off = api.get("/api/play-zone/challenges", headers=h).json()
    assert off["items"] == [] and off["disabled"] is True


def factory_session(api):
    return api.app.dependency_overrides[get_db].__wrapped__() if hasattr(api.app.dependency_overrides[get_db], "__wrapped__") else _Ctx(api)


class _Ctx:
    def __init__(self, api):
        self.gen = api.app.dependency_overrides[get_db]()

    def __enter__(self):
        self.s = next(self.gen)
        return self.s

    def __exit__(self, *a):
        self.s.commit()
        self.gen.close()


# ================================================================== media
def _upload(api, headers=ALL, purpose="game_thumbnail", game="puzzle-pop", data=PNG, name="thumb.png"):
    return api.post(f"/api/admin/play-zone/media?filename={name}&purpose={purpose}&game={game}&label=Thumb", content=data, headers={**headers, "content-type": "application/octet-stream"})


def test_media_upload_validation_replace_keeps_references_and_delete_is_safe(api, db):
    assert _upload(api, headers=only("pz_games")).status_code == 403
    assert _upload(api, purpose="wallpaper").status_code == 422
    assert _upload(api, game="chess").status_code == 422
    assert _upload(api, data=b"%PDF-1.4 not an image", name="x.pdf").status_code == 415  # images only
    assert _upload(api, data=b"MZ-not-an-image", name="evil.png").status_code == 415  # the real bytes decide, not the file name
    big = api.post("/api/admin/play-zone/media?filename=big.png&purpose=promo", content=PNG + b"0" * (5 * 1024 * 1024), headers={**ALL, "content-type": "application/octet-stream"})
    assert big.status_code == 413
    up = _upload(api)
    assert up.status_code == 201
    mid = up.json()["id"]
    assert up.json()["purpose"] == "game_thumbnail" and up.json()["url"]
    lst = api.get("/api/admin/play-zone/media?purpose=game_thumbnail", headers=ALL).json()
    assert lst["total"] == 1 and lst["items"][0]["id"] == mid and "promo" in lst["purposes"]
    assert api.patch("/api/admin/play-zone/games/puzzle-pop", json={"thumbnail_media_id": mid}, headers=ALL).json()["thumbnail_url"]
    assert api.patch("/api/admin/play-zone/games/puzzle-pop", json={"thumbnail_media_id": str(uuid.uuid4())}, headers=ALL).status_code == 422
    assert api.get("/api/play-zone/config").json()["games"][[g["slug"] for g in api.get("/api/play-zone/config").json()["games"]].index("puzzle-pop")]["thumbnail_url"]
    # replacing keeps the item id, so the game keeps pointing at it
    rep = api.put(f"/api/admin/play-zone/media/{mid}/file", content=PNG + b"", headers={**ALL, "content-type": "application/octet-stream"})
    assert rep.status_code == 200 and rep.json()["id"] == mid
    assert api.get("/api/admin/play-zone/games", headers=ALL).json()["items"][2]["thumbnail_url"]
    # a picture that is still in use cannot be deleted
    blocked = api.delete(f"/api/admin/play-zone/media/{mid}", headers=ALL)
    assert blocked.status_code == 409 and "Game: Puzzle Pop" in blocked.json()["error"]["message"]
    api.patch("/api/admin/play-zone/games/puzzle-pop", json={"thumbnail_media_id": None}, headers=ALL)
    assert api.delete(f"/api/admin/play-zone/media/{mid}", headers=ALL).json() == {"deleted": True}
    assert db.get(MediaAsset, uuid.UUID(mid)) is None and api.delete(f"/api/admin/play-zone/media/{mid}", headers=ALL).status_code == 404
    actions = [a.action for a in audit(db)]
    assert "playzone.media.upload" in actions and "playzone.media.replace" in actions and "playzone.media.delete" in actions


# ================================================================== analytics
def _seed(db):
    a, b, c = make_user(db), make_user(db), make_user(db)
    play(db, a, "catch-the-stars", payload=catch_payload())
    play(db, a, "catch-the-stars", payload=catch_payload(score=200, stars=15, golden=2))
    play(db, b, "laxbot-jump", "cloud-kingdom", payload=jump_payload())
    service.start_session(db, c, "puzzle-pop", catalog.level_ids("puzzle-pop")[0], None); db.commit()  # started, never finished
    return a, b, c


def test_overview_and_analytics_are_computed_from_real_rows(api, db):
    a, b, c = _seed(db)
    k = api.get("/api/admin/play-zone/overview?range=7d", headers=ALL).json()
    kp = k["kpis"]
    assert kp["total_players"] == 3 and kp["active_today"] == 3 and kp["active_week"] == 3 and kp["verified_sessions"] == 3 and kp["total_games_played"] == 3
    assert kp["most_played_game"]["game"] == "catch-the-stars" and kp["most_played_game"]["sessions"] == 2 and kp["games_enabled"] == 4 and kp["flagged_scores"] == 0 and kp["challenges_completed_today"] >= 1
    assert kp["verified_points"] == db.scalar(select(__import__("sqlalchemy").func.sum(PlayerProfile.verified_points)))
    pop = {g["game"]: g["sessions"] for g in k["game_popularity"]}
    assert pop == {"catch-the-stars": 2, "laxbot-jump": 1, "puzzle-pop": 0, "bug-hunter": 0}
    assert sum(d["sessions"] for d in k["daily_sessions"]) == 4 and k["daily_sessions"][-1]["catch-the-stars"] == 2 and k["player_growth"][-1]["total"] == 3
    assert len(k["recent_activity"]) == 3 and k["recent_achievements"] and k["moderation_alerts"]["flagged"] == 0
    stats = api.get("/api/admin/play-zone/analytics?range=7d", headers=ALL).json()
    by_game = {g["game"]: g for g in stats["sessions_by_game"]}
    assert by_game["catch-the-stars"]["sessions"] == 2 and by_game["catch-the-stars"]["completion_rate"] == 1.0
    assert by_game["puzzle-pop"]["sessions"] == 1 and by_game["puzzle-pop"]["completion_rate"] == 0.0 and by_game["puzzle-pop"]["avg_duration_seconds"] is None  # nothing is invented for unfinished runs
    assert round(by_game["catch-the-stars"]["avg_duration_seconds"]) == 100
    today = stats["by_day"][-1]
    assert today["daily_active"] == 3 and today["new_players"] == 3 and today["returning_players"] == 0 and today["sessions"] == 4
    assert stats["weekly_active"][0]["players"] == 3 and {r["level"] for r in stats["levels"]} >= {"main", "cloud-kingdom"}
    assert any(w["world"].startswith("LAXBOT Jump") for w in stats["popular_worlds"])
    ach = {x["code"]: x for x in stats["achievements"]}
    assert ach["first-steps"]["earned_total"] == 3 - 1 and ach["first-steps"]["unlock_rate"] == round(2 / 3, 3)
    only_jump = api.get("/api/admin/play-zone/analytics?range=7d&game=laxbot-jump", headers=ALL).json()
    assert [g["game"] for g in only_jump["sessions_by_game"]] == ["laxbot-jump"]
    assert api.get("/api/admin/play-zone/analytics?range=7d&game=chess", headers=ALL).status_code == 422


def test_date_filters_and_range_limits(api, db):
    _seed(db)
    assert api.get("/api/admin/play-zone/overview?range=today", headers=ALL).json()["kpis"]["total_players"] == 3
    old = api.get("/api/admin/play-zone/overview?range=custom&start=2020-01-01&end=2020-01-31", headers=ALL).json()
    assert sum(d["sessions"] for d in old["daily_sessions"]) == 0 and old["player_growth"][-1]["total"] == 0 and len(old["daily_sessions"]) == 31  # an empty range is empty, not invented
    assert api.get("/api/admin/play-zone/overview?range=custom&start=2020-01-31&end=2020-01-01", headers=ALL).status_code == 422
    assert api.get("/api/admin/play-zone/overview?range=custom&start=2019-01-01&end=2020-12-31", headers=ALL).status_code == 422
    assert api.get("/api/admin/play-zone/overview?range=custom", headers=ALL).status_code == 422
    assert api.get("/api/admin/play-zone/overview?range=yesterday", headers=ALL).status_code == 422
    page = api.get("/api/admin/play-zone/analytics?range=7d&page_size=1", headers=ALL).json()
    assert len(page["levels"]) == 1 and page["pages"] >= 2 and page["levels_total"] >= 2


def test_csv_export_is_correct_and_safe_from_spreadsheet_formulas(api, db):
    _seed(db)
    r = api.get("/api/admin/play-zone/analytics/export?report=sessions_by_game&range=7d", headers=ALL)
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv") and "attachment" in r.headers["content-disposition"]
    lines = r.text.strip().splitlines()
    assert lines[0].startswith("game,title,sessions") and any(line.startswith("catch-the-stars,Catch the Stars,2") for line in lines)
    assert api.get("/api/admin/play-zone/analytics/export?report=nope", headers=ALL).status_code == 422
    assert api.get("/api/admin/play-zone/analytics/export?report=levels", headers=only("pz_games")).status_code == 403
    assert admin_service._safe("=HYPERLINK(1)") == "'=HYPERLINK(1)" and admin_service._safe("+1") == "'+1" and admin_service._safe("ok") == "ok"
    out = admin_service.to_csv("achievements", {"by_day": [], "sessions_by_game": [], "levels": [], "popular_worlds": [], "challenges": [], "achievements": [{"code": "=cmd", "title": "x"}]})
    assert "'=cmd" in out


# ================================================================== settings
def test_settings_persist_validate_and_need_confirmation_for_disruptive_changes(api, db):
    got = api.get("/api/admin/play-zone/settings", headers=ALL).json()
    assert got["values"]["enabled"] is True and got["values"]["nickname_max"] == 24
    assert api.patch("/api/admin/play-zone/settings", json={"values": {"maintenance": True}}, headers=ALL).status_code == 409  # needs confirmation
    ok = api.patch("/api/admin/play-zone/settings", json={"values": {"maintenance": True, "maintenance_message": "Back at 6 pm"}, "confirm": True}, headers=ALL)
    assert ok.status_code == 200 and set(ok.json()["changed"]) == {"maintenance", "maintenance_message"}
    config_store.drop_cache()
    assert api.get("/api/admin/play-zone/settings", headers=ALL).json()["values"]["maintenance"] is True  # persisted in the database
    blocked = api.post("/api/play-zone/sessions", json={"game": "catch-the-stars"}, headers=customer("fay"))
    assert blocked.status_code == 503 and blocked.json()["error"]["message"] == "Back at 6 pm"
    assert api.get("/api/play-zone/config").json()["maintenance"] is True
    api.patch("/api/admin/play-zone/settings", json={"values": {"maintenance": False}}, headers=ALL)  # switching OFF a restriction needs no confirmation
    for bad in ({"nickname_min": 1}, {"nickname_max": 99}, {"avatars_enabled": []}, {"avatars_enabled": ["evil"]}, {"featured_game": "chess"}, {"guest_play": "yes"},
                {"require_login": False}, {"verify_scores": False}, {"graphics_options": ["ultra"]}, {"maintenance_message": "x" * 300}):
        assert api.patch("/api/admin/play-zone/settings", json={"values": bad, "confirm": True}, headers=ALL).status_code == 422, bad  # nothing can weaken sign-in or verification
    assert api.patch("/api/admin/play-zone/settings", json={"values": {}}, headers=ALL).status_code == 422
    assert api.patch("/api/admin/play-zone/settings", json={"values": {"guest_play": False}, "confirm": True}, headers=only("pz_games")).status_code == 403
    assert api.get("/api/admin/play-zone/settings", headers=only("pz_analytics")).status_code == 403
    assert [a.action for a in audit(db)] == ["playzone.settings.update", "playzone.settings.update"]


def test_nickname_avatar_and_leaderboard_settings_are_enforced_for_players(api, db):
    api.patch("/api/admin/play-zone/settings", json={"values": {"nickname_min": 6, "nickname_max": 12, "avatars_enabled": ["puzzle-wizard", "cyber-defender"]}}, headers=ALL)
    h = customer("gus")
    assert api.patch("/api/play-zone/profile", json={"nickname": "Short"}, headers=h).status_code == 422
    assert api.patch("/api/play-zone/profile", json={"nickname": "WayTooLongNickname"}, headers=h).status_code == 422
    assert api.patch("/api/play-zone/profile", json={"nickname": "Medium Name"}, headers=h).status_code == 200
    assert api.patch("/api/play-zone/profile", json={"avatar": "star-collector"}, headers=h).status_code == 422  # not an enabled avatar
    assert api.patch("/api/play-zone/profile", json={"avatar": "puzzle-wizard"}, headers=h).status_code == 200
    assert api.get("/api/play-zone/profile", headers=h).json()["avatars"] == ["puzzle-wizard", "cyber-defender"]
    api.patch("/api/admin/play-zone/settings", json={"values": {"public_leaderboard": False}, "confirm": True}, headers=ALL)
    hidden = api.get("/api/play-zone/leaderboards?game=overall&period=weekly")
    assert hidden.status_code == 403 and hidden.json()["error"]["code"] == "leaderboard_hidden"
    cfg = api.get("/api/play-zone/config").json()
    assert cfg["public_leaderboard"] is False and cfg["nickname"] == {"min": 6, "max": 12} and cfg["guest_play"] is True


# ================================================================== audit logs
def test_audit_log_listing_filters_and_never_holds_secrets(api, db):
    api.patch("/api/admin/play-zone/games/puzzle-pop", json={"enabled": False}, headers=ALL)
    api.patch("/api/admin/play-zone/settings", json={"values": {"guest_play": False}, "confirm": True}, headers=SUPER)
    db.add(AuditLog(admin_email="x@y.z", action="media.upload", detail={})); db.commit()  # an unrelated admin action
    r = api.get("/api/admin/play-zone/audit-logs", headers=ALL).json()
    assert r["total"] == 2 and {i["action"] for i in r["items"]} == {"playzone.game.disable", "playzone.settings.update"} and "media.upload" not in r["actions"]
    assert api.get("/api/admin/play-zone/audit-logs?action=playzone.game.disable", headers=ALL).json()["total"] == 1
    assert api.get("/api/admin/play-zone/audit-logs?admin=boss", headers=ALL).json()["total"] == 1
    assert api.get("/api/admin/play-zone/audit-logs?date_from=2000-01-01&date_to=2000-01-02", headers=ALL).json()["total"] == 0
    assert api.get("/api/admin/play-zone/audit-logs", headers=only("pz_games")).status_code == 403
    item = r["items"][0]
    assert item["admin"] and item["at"] and item["resource_type"] and item["detail"]
    for row in audit(db):
        assert not any(w in json.dumps(row.detail).lower() for w in ("password", "token", "secret", "cookie"))
    from app.services import audit_service

    assert audit_service._clean({"password": "x", "reason": "ok", "session_token": "y"}) == {"reason": "ok"}  # the shared audit writer drops secrets


# ================================================================== rate limiting
def test_admin_writes_are_rate_limited(api, monkeypatch):
    from app.core.config import get_settings

    s = get_settings()
    monkeypatch.setattr(s, "pz_admin_rate_limit_max", 3)
    monkeypatch.setattr(s, "rate_limit_enabled", True)
    api.app.dependency_overrides[get_settings] = lambda: s
    codes = [api.patch("/api/admin/play-zone/games/puzzle-pop", json={"sort_order": i}, headers=ALL).status_code for i in range(1, 6)]
    assert 429 in codes and codes[0] == 200


# ================================================================== migration compatibility
def test_migration_0027_generates_additive_postgresql_sql_and_a_rollback(capsys):
    from alembic import command
    from alembic.config import Config
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    cfg.set_main_option("sqlalchemy.url", "postgresql+psycopg://u:p@localhost/db")
    command.upgrade(cfg, "0026:0027", sql=True)
    up = capsys.readouterr().out
    assert "CREATE TABLE pz_game_configs" in up and "ALTER TABLE pz_profiles ADD COLUMN suspended" in up and "INSERT INTO pz_challenge_templates" in up and "ENABLE ROW LEVEL SECURITY" in up
    assert "DROP TABLE" not in up and "DROP COLUMN" not in up and "DELETE FROM" not in up and "UPDATE pz_" not in up  # additive only: existing data is never touched
    command.downgrade(cfg, "0027:0026", sql=True)
    down = capsys.readouterr().out
    assert "DROP TABLE pz_game_configs" in down and "DROP COLUMN suspended" in down
