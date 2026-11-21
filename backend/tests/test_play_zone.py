"""Play Zone backend tests. They need NO PostgreSQL: the service layer and the API run on an in-memory SQLite database that holds only the tables involved, and the verification code is pure.
(The Alembic migration is checked by generating its PostgreSQL SQL offline; running it against a real server happens in the normal migration test of the project's CI.)"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import deps
from app.core.errors import ApiError
from app.db.base import Base
from app.db.session import get_db, get_read_db
from app.models import (AchievementDef, ChallengeProgress, ChallengeTemplate, DailyChallenge, GameConfig, GameConfigVersion, GameProgress, GameSession, MediaAsset, MediaLink, ModerationEvent, PlayerAchievement,
                        PlayerProfile, PlaySetting, User, VerifiedScore)
from app.play_zone import catalog, periods, puzzle_engine as pe, scoring, service, verify

FIXTURES = json.loads((Path(__file__).parent / "fixtures" / "play_zone_fixtures.json").read_text(encoding="utf-8"))
IST = periods.zone("Asia/Kolkata")
TABLES = [User.__table__, PlayerProfile.__table__, GameSession.__table__, VerifiedScore.__table__, GameProgress.__table__, AchievementDef.__table__, PlayerAchievement.__table__, DailyChallenge.__table__, ChallengeProgress.__table__,
          MediaAsset.__table__, GameConfig.__table__, GameConfigVersion.__table__, PlaySetting.__table__, ModerationEvent.__table__, ChallengeTemplate.__table__, MediaLink.__table__]


@pytest.fixture
def factory():
    engine = create_engine("sqlite+pysqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine, tables=TABLES)
    make = sessionmaker(bind=engine, expire_on_commit=False)
    with make() as db:
        for c, t, d, g, i, s in catalog.ACHIEVEMENTS:
            db.add(AchievementDef(code=c, title=t, description=d, game=g, icon=i, sort_order=s, active=True))
        db.commit()
    service.drop_ranking_cache()
    yield make
    engine.dispose()


@pytest.fixture
def db(factory):
    with factory() as session:
        yield session


def make_user(db, name="Asha Private", email=None) -> User:
    u = User(full_name=name, email=email or f"{uuid.uuid4().hex[:8]}@example.com", password_hash="x", role="user", permissions=[], is_active=True)
    db.add(u); db.commit()
    return u


def past(db, session_id, seconds: float) -> None:
    s = db.get(GameSession, session_id); s.started_at = datetime.now(timezone.utc) - timedelta(seconds=seconds); db.commit()


def catch_payload(**over) -> dict:
    p = {"score": 330, "stars": 20, "golden": 4, "diamonds": 0, "hearts": 0, "bombsHit": 1, "survived": 30, "reason": "time", "bestCombo": 5}  # 20*10 + 4*25 = 300 ... doubled part -> 330
    p.update(over)
    return p


def jump_payload(level="cloud-kingdom", **over) -> dict:
    lv = catalog.jump_info()["levels"][level]
    p = {"levelId": level, "finished": True, "coins": 20, "crystals": 2, "stars": 0, "lives": 3, "time": lv["par"] + 5}
    p.update(over)
    return p


def play(db, user, game, level=None, payload=None, seconds=100.0):
    s = service.start_session(db, user, game, level, None); db.commit()
    past(db, s.id, seconds)
    out = service.complete_session(db, user, s.id, payload); db.commit()
    return s, out


# ================================================================== periods
def test_period_boundaries_follow_the_play_zone_timezone():
    now = datetime(2026, 11, 21, 18, 29, 59, tzinfo=timezone.utc)  # 23:59:59 on 21 Nov in India
    s, e = periods.period_bounds("daily", now, IST)
    assert s == datetime(2026, 11, 20, 18, 30, tzinfo=timezone.utc) and e == datetime(2026, 11, 21, 18, 30, tzinfo=timezone.utc)
    s2, e2 = periods.period_bounds("daily", now + timedelta(seconds=1), IST)  # one second later it is a new day
    assert s2 == e
    ws, we = periods.period_bounds("weekly", now, IST)  # 21 Nov 2026 is a Saturday: the week began on Monday 16 Nov at 00:00 India time
    assert ws == datetime(2026, 11, 15, 18, 30, tzinfo=timezone.utc) and we - ws == timedelta(days=7)
    assert periods.period_bounds("all", now, IST) == (None, None)


# ================================================================== scoring and fair ranking
def test_normalisation_is_bounded_and_per_level_caps_add_up_to_1000():
    assert scoring.normalise("catch-the-stars", "main", 1500) == 1000 and scoring.normalise("catch-the-stars", "main", 99999) == 1000 and scoring.normalise("catch-the-stars", "main", 750) == 500
    for game, cap in (("laxbot-jump", 200), ("bug-hunter", 200), ("puzzle-pop", 40)):
        lid = catalog.level_ids(game)[0]
        assert scoring.normalise(game, lid, 10**7) == cap and scoring.normalise(game, lid, 0) == 0
        assert cap * len(catalog.level_ids(game)) == 1000
    assert scoring.game_contribution([200] * 9) == 1000  # a game never adds more than 1000


def test_overall_ranking_uses_best_per_level_and_caps_each_game(db):
    a, b = make_user(db), make_user(db)
    service.get_profile(db, a); service.get_profile(db, b)
    for u, scores in ((a, [300, 900, 1500]), (b, [1500])):  # a replays Catch the Stars three times: only the best counts
        for sc in scores:
            s = GameSession(user_id=u.id, game="catch-the-stars", level_id="main", config={}, expires_at=datetime.now(timezone.utc) + timedelta(hours=1), status="completed", reasons=[])
            db.add(s); db.flush()
            db.add(VerifiedScore(session_id=s.id, user_id=u.id, game="catch-the-stars", level_id="main", score=sc, points=scoring.normalise("catch-the-stars", "main", sc), status="accepted", flags=[], details={}))
    db.commit()
    now = datetime.now(timezone.utc)
    board = service.ranking(db, "overall", "all", now, IST)
    assert [r["points"] for r in board] == [1000, 1000]  # replaying does not stack; ties are broken by the earlier result, never by farming
    assert board[0]["rank"] == 1 and board[1]["rank"] == 2


# ================================================================== verification (pure)
def test_catch_the_stars_verification():
    ok = verify.verify_catch(catch_payload(), elapsed=31)
    assert ok.ok and ok.score == 330
    bad = [(catch_payload(score=5000), "score_out_of_range"), (catch_payload(score=100), "score_out_of_range"), (catch_payload(stars=90, score=900 + 100), "too_many_items"),
           (catch_payload(survived=12), "round_too_short"), (catch_payload(bombsHit=9), "too_many_bomb_hits"), (catch_payload(reason="cheat"), "malformed_result"), (catch_payload(score="many"), "malformed_result")]
    for payload, reason in bad:
        v = verify.verify_catch(payload, elapsed=31)
        assert not v.ok and reason in v.reasons, (payload, v.reasons)
    assert "faster_than_real_time" in verify.verify_catch(catch_payload(), elapsed=5).reasons  # a 30-second round cannot take 5 real seconds
    assert verify.verify_catch(catch_payload(stars=48, golden=0, score=480), elapsed=31).flags  # plausible but extreme: flagged for review


def test_jump_and_bug_scores_match_the_javascript_formulas():
    ji, bi = catalog.jump_info(), catalog.bug_info()
    for f in FIXTURES["jump"]:
        lv = ji["levels"][f["level"]]
        assert verify.jump_score(f["coins"], f["crystals"], f["stars"], f["lives"], f["time"], lv, ji["scoring"]) == f["score"]
        assert verify.jump_stars(f["coins"], f["crystals"], f["stars"], lv) == f["rating"]
    for f in FIXTURES["bug"]:
        lv = bi["levels"][f["level"]]
        met = verify.bug_challenge_met(lv, sum(f["byType"].values()), lv["totalBugs"], f["orbs"], f["damage"], f["deaths"], f["time"])
        assert sum(verify.bug_score(lv, f["byType"], f["repairs"], f["orbs"], f["boss"], f["health"], f["time"], met, bi).values()) == f["score"]


def test_jump_verification_rules():
    lv = catalog.jump_info()["levels"]["cloud-kingdom"]
    v = verify.verify_jump(jump_payload(), "cloud-kingdom", elapsed=lv["par"] + 10, unlocked=True)
    assert v.ok and v.score == verify.jump_score(20, 2, 0, 3, lv["par"] + 5, lv, catalog.jump_info()["scoring"])
    cases = [(jump_payload(coins=lv["coins"] + 1), "counts_out_of_range"), (jump_payload(finished=False), "not_completed"), (jump_payload(time=1.0), "faster_than_possible"),
             (jump_payload(levelId="candy-island"), "wrong_level"), (jump_payload(lives=0), "counts_out_of_range"), (jump_payload(time=lv["par"] + 5), "faster_than_real_time")]
    for payload, reason in cases:
        elapsed = 1000 if reason != "faster_than_real_time" else 10
        assert reason in verify.verify_jump(payload, "cloud-kingdom", elapsed, True).reasons, reason
    assert "level_locked" in verify.verify_jump(jump_payload("candy-island"), "candy-island", 500, unlocked=False).reasons


def test_bug_hunter_verification_rules():
    cfg = catalog.bug_info(); lv = cfg["levels"]["data-ocean"]
    good = {"levelId": "data-ocean", "finished": True, "byType": dict(lv["byType"]), "repairs": lv["stations"], "orbs": 3, "boss": True, "health": 4, "lives": 3, "deaths": 0, "damage": 1, "time": 200}
    v = verify.verify_bug(good, "data-ocean", elapsed=400)
    assert v.ok and v.score == sum(verify.bug_score(lv, lv["byType"], lv["stations"], 3, True, 4, 200, verify.bug_challenge_met(lv, lv["totalBugs"], lv["totalBugs"], 3, 1, 0, 200), cfg).values())
    assert "boss_not_defeated" in verify.verify_bug({**good, "boss": False}, "data-ocean", 400).reasons
    assert "capture_counts_out_of_range" in verify.verify_bug({**good, "byType": {**lv["byType"], "rare": lv["byType"]["rare"] + 1}}, "data-ocean", 400).reasons
    assert "repairs_missing" in verify.verify_bug({**good, "repairs": 0}, "data-ocean", 400).reasons
    assert "faster_than_possible" in verify.verify_bug({**good, "time": 5}, "data-ocean", 400).reasons
    assert "inconsistent_damage" in verify.verify_bug({**good, "deaths": 1, "damage": 1}, "data-ocean", 400).reasons
    assert "not_completed" in verify.verify_bug({**good, "finished": False}, "data-ocean", 400).reasons


def test_python_puzzle_engine_replays_the_javascript_games_exactly():
    levels = catalog.puzzle_levels()
    assert len(FIXTURES["puzzle"]) >= 20
    for f in FIXTURES["puzzle"]:
        s = pe.create_game(levels[f["level"]], f["seed"])
        for m in f["moves"]:
            assert pe.play_move(s, m[0], m[1])
        assert (s["score"], s["status"], s["moves"]) == (f["score"], f["status"], f["movesLeft"]), f["level"]
        assert pe.stars_for(s) == f["stars"]


def test_puzzle_verification_replays_and_rejects_forged_logs():
    won = next(f for f in FIXTURES["puzzle"] if f["status"] == "won")
    v = verify.verify_puzzle({"levelId": won["level"], "moves": won["moves"]}, won["level"], won["seed"], elapsed=len(won["moves"]) * 3, unlocked=True)
    assert v.ok and v.score == won["score"]  # the score is the replay's, not a claim
    forged = [list(m) for m in won["moves"]]; forged[0] = [[0, 0], [7, 7]]
    assert not verify.verify_puzzle({"levelId": won["level"], "moves": forged}, won["level"], won["seed"], 100, True).ok
    assert "level_not_won" in verify.verify_puzzle({"levelId": won["level"], "moves": won["moves"][:1]}, won["level"], won["seed"], 100, True).reasons
    assert "bad_move_list" in verify.verify_puzzle({"levelId": won["level"], "moves": []}, won["level"], won["seed"], 100, True).reasons
    assert not verify.verify_puzzle({"levelId": won["level"], "moves": won["moves"]}, won["level"], won["seed"] + 1, 100, True).ok  # a different seed is a different board
    assert "faster_than_real_time" in verify.verify_puzzle({"levelId": won["level"], "moves": won["moves"]}, won["level"], won["seed"], 0.1, True).reasons
    assert "level_locked" in verify.verify_puzzle({"levelId": won["level"], "moves": won["moves"]}, won["level"], won["seed"], 100, False).reasons


# ================================================================== profiles
def test_profile_is_created_for_the_account_and_stays_private(db):
    u = make_user(db, name="Real Name", email="secret@example.com")
    p = service.get_profile(db, u); db.commit()
    assert p.user_id == u.id and p.nickname.startswith("Player")
    out = service.profile_out(db, u, p)
    assert "email" not in json.dumps(out).lower() and "real name" not in json.dumps(out).lower() and "secret@example.com" not in json.dumps(out)
    assert service.get_profile(db, u).id == p.id  # one profile per account


def test_profile_editing_is_validated_and_nicknames_are_unique(db):
    a, b = make_user(db), make_user(db)
    service.update_profile(db, a, nickname="Star Hunter", avatar="puzzle-wizard", preferences={"sound": False, "volume": 40, "graphics": "low", "evil": "x"}); db.commit()
    pa = service.get_profile(db, a)
    assert pa.nickname == "Star Hunter" and pa.avatar == "puzzle-wizard" and pa.preferences == {"sound": False, "volume": 40, "graphics": "low"}
    for bad in ("x", "a@b.co", "call 9876543210", "Admin", "<script>alert(1)</script>", "  "):
        with pytest.raises(ApiError) as e:
            service.update_profile(db, b, nickname=bad, avatar=None, preferences=None)
        assert e.value.code == "invalid_nickname", bad
    with pytest.raises(ApiError) as e:
        service.update_profile(db, b, nickname="star hunter", avatar=None, preferences=None)  # same name ignoring case
    assert e.value.code == "nickname_taken"
    with pytest.raises(ApiError) as e:
        service.update_profile(db, b, nickname=None, avatar="stolen-avatar", preferences=None)
    assert e.value.code == "invalid_avatar"


# ================================================================== sessions, scores, duplicates, rollback
def test_a_verified_result_is_recorded_once_and_a_repeat_returns_the_same_outcome(db):
    u = make_user(db)
    s, out = play(db, u, "catch-the-stars", None, catch_payload(), seconds=31)
    assert out["accepted"] and out["score"] == 330 and "first-steps" in out["new_achievements"]
    again = service.complete_session(db, u, s.id, catch_payload(score=480, stars=40)); db.commit()  # replay with a better claimed score
    assert again["score"] == 330 and again["session_id"] == out["session_id"] and again["new_achievements"] == out["new_achievements"]  # a retried request reports the same achievements
    assert db.scalar(select(func.count()).select_from(VerifiedScore)) == 1 and db.get(PlayerProfile, service.get_profile(db, u).id).games_played == 1


def test_start_is_idempotent_and_sessions_belong_to_their_player(db):
    a, b = make_user(db), make_user(db)
    s1 = service.start_session(db, a, "catch-the-stars", None, "retry-key-0001"); db.commit()
    s2 = service.start_session(db, a, "catch-the-stars", None, "retry-key-0001"); db.commit()
    assert s1.id == s2.id and db.scalar(select(func.count()).select_from(GameSession)) == 1
    with pytest.raises(ApiError) as e:
        service.complete_session(db, b, s1.id, catch_payload())  # another player cannot finish someone else's run
    assert e.value.status_code == 404
    with pytest.raises(ApiError):
        service.start_session(db, a, "no-such-game", None, None)
    with pytest.raises(ApiError):
        service.start_session(db, a, "laxbot-jump", "no-such-level", None)


def test_invalid_results_are_rejected_and_kept_for_moderation(db):
    u = make_user(db)
    s, out = play(db, u, "catch-the-stars", None, catch_payload(score=99999), seconds=31)
    assert not out["accepted"] and out["status"] == "rejected" and "score_out_of_range" in out["reasons"]
    row = db.get(GameSession, s.id)
    assert row.status == "rejected" and row.client_result["score"] == 99999 and row.verdict == "rejected"  # the claim is stored for audits
    assert db.scalar(select(func.count()).select_from(VerifiedScore)) == 0
    again = service.complete_session(db, u, s.id, catch_payload()); db.commit()
    assert not again["accepted"]  # a rejected run cannot be retried with a better payload


def test_expired_sessions_cannot_score(db):
    u = make_user(db)
    s = service.start_session(db, u, "catch-the-stars", None, None); db.commit()
    s.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1); db.commit()
    out = service.complete_session(db, u, s.id, catch_payload()); db.commit()
    assert not out["accepted"] and out["status"] == "expired"


def test_flagged_results_stay_off_boards_and_do_not_unlock_things(db):
    u = make_user(db)
    s, out = play(db, u, "catch-the-stars", None, catch_payload(stars=48, golden=0, score=480, survived=30), seconds=31)
    assert out["accepted"] and out["flagged"]
    assert service.ranking(db, "catch-the-stars", "all", datetime.now(timezone.utc), IST) == []
    assert out["new_achievements"] == [] and (service.get_profile(db, u).stats or {}) == {}


def test_failure_in_the_middle_rolls_everything_back(db, monkeypatch):
    u = make_user(db)
    s = service.start_session(db, u, "catch-the-stars", None, None); db.commit(); past(db, s.id, 31)
    monkeypatch.setattr(service, "evaluate_achievements", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")))
    with pytest.raises(RuntimeError):
        try:
            service.complete_session(db, u, s.id, catch_payload())
            db.commit()
        except Exception:
            db.rollback(); raise
    assert db.scalar(select(func.count()).select_from(VerifiedScore)) == 0
    assert db.get(GameSession, s.id).status == "started"  # the run can still be submitted later


def test_levels_unlock_only_after_the_previous_one_is_verified(db):
    u = make_user(db)
    lv0, lv1 = catalog.jump_info()["order"][:2]
    s, out = play(db, u, "laxbot-jump", lv1, jump_payload(lv1, time=catalog.jump_info()["levels"][lv1]["par"] + 5), seconds=500)
    assert not out["accepted"] and "level_locked" in out["reasons"]
    s0, ok = play(db, u, "laxbot-jump", lv0, jump_payload(lv0), seconds=500)
    assert ok["accepted"] and "cloud-explorer" in ok["new_achievements"] and service.level_unlocked(db, u, "laxbot-jump", lv1)
    s1, ok1 = play(db, u, "laxbot-jump", lv1, jump_payload(lv1, coins=5, crystals=0, time=catalog.jump_info()["levels"][lv1]["par"] + 5), seconds=500)
    assert ok1["accepted"]


def test_puzzle_pop_server_seed_and_replay_end_to_end(db):
    u = make_user(db)
    lv = catalog.puzzle_levels()["w1-l1"]
    s = service.start_session(db, u, "puzzle-pop", "w1-l1", None); db.commit()
    seed = s.config["seed"]
    state = pe.create_game(lv, seed); moves = []
    while state["status"] == "playing" and len(moves) < lv["moves"]:
        m = pe.valid_moves(state)[0]; pe.play_move(state, m[0], m[1]); moves.append(m)
    past(db, s.id, 200)
    out = service.complete_session(db, u, s.id, {"levelId": "w1-l1", "moves": moves}); db.commit()
    if state["status"] == "won":
        assert out["accepted"] and out["score"] == state["score"]
    else:
        assert not out["accepted"] and "level_not_won" in out["reasons"]


# ================================================================== leaderboards
def _add_score(db, u, game, level, score, when=None, status="accepted"):
    s = GameSession(user_id=u.id, game=game, level_id=level, config={}, expires_at=datetime.now(timezone.utc) + timedelta(hours=1), status="completed", reasons=[])
    db.add(s); db.flush()
    db.add(VerifiedScore(session_id=s.id, user_id=u.id, game=game, level_id=level, score=score, points=scoring.normalise(game, level, score), status=status, flags=[], details={}, created_at=when or datetime.now(timezone.utc)))
    db.commit()


def test_leaderboard_ranks_filters_periods_and_hides_flagged_and_hidden_players(db):
    users = [make_user(db) for _ in range(5)]
    for i, u in enumerate(users):
        service.update_profile(db, u, nickname=f"Player {i}x", avatar=None, preferences=None)
    db.commit()
    now = datetime.now(timezone.utc)
    _add_score(db, users[0], "catch-the-stars", "main", 900)
    _add_score(db, users[1], "catch-the-stars", "main", 1200)
    _add_score(db, users[2], "catch-the-stars", "main", 400, when=now - timedelta(days=3))  # not today
    _add_score(db, users[3], "catch-the-stars", "main", 1500, status="flagged")  # waits for moderation
    hide = service.get_profile(db, users[4]); hide.hidden = True; _add_score(db, users[4], "catch-the-stars", "main", 1400); db.commit()
    all_time = service.leaderboard_page(db, "catch-the-stars", "all", 1, 25, users[0], now, IST)
    assert [r["nickname"] for r in all_time["items"]] == ["Player 1x", "Player 0x", "Player 2x"] and all_time["total"] == 3
    assert all_time["me"]["rank"] == 2
    daily = service.leaderboard_page(db, "catch-the-stars", "daily", 1, 25, None, now, IST)
    assert [r["nickname"] for r in daily["items"]] == ["Player 1x", "Player 0x"] and daily["me"] is None
    for row in all_time["items"]:
        assert set(row) <= {"rank", "nickname", "avatar", "score", "points", "game", "levels"}  # nothing private
    page2 = service.leaderboard_page(db, "catch-the-stars", "all", 2, 2, None, now, IST)
    assert len(page2["items"]) == 1 and page2["pages"] == 2


def test_daily_leaderboard_boundary_is_local_midnight(db):
    u = make_user(db); service.get_profile(db, u)
    now = datetime(2026, 11, 21, 6, 0, tzinfo=timezone.utc)  # 11:30 in India
    before_midnight = datetime(2026, 11, 20, 18, 29, tzinfo=timezone.utc)  # 23:59 on the 20th in India: yesterday
    after_midnight = datetime(2026, 11, 20, 18, 31, tzinfo=timezone.utc)  # 00:01 on the 21st in India: today
    _add_score(db, u, "catch-the-stars", "main", 300, when=before_midnight)
    assert service.ranking(db, "catch-the-stars", "daily", now, IST) == []
    _add_score(db, u, "catch-the-stars", "main", 200, when=after_midnight)
    service.drop_ranking_cache()
    assert [r["score"] for r in service.ranking(db, "catch-the-stars", "daily", now, IST)] == [200]


# ================================================================== achievements
def test_achievements_are_awarded_once_from_verified_conditions(db):
    u = make_user(db)
    p = service.get_profile(db, u)
    assert not any(service.achievement_conditions(db, u, p).values())
    payload = catch_payload(stars=36, golden=2, score=410, hearts=0)  # 36*10 + 2*25 = 410 (no doubling): 38 stars collected, nothing suspicious
    s, out = play(db, u, "catch-the-stars", None, payload, seconds=31)
    assert out["accepted"] and not out["flagged"] and out["new_achievements"] == ["first-steps"]
    play(db, u, "catch-the-stars", None, payload, seconds=31)
    s3, out3 = play(db, u, "catch-the-stars", None, payload, seconds=31)  # 3 x 38 = 114 stars collected in verified rounds
    assert out3["new_achievements"] == ["star-collector"]
    out = {"new_achievements": ["first-steps", "star-collector"]}
    owned = {a.code for a in db.scalars(select(PlayerAchievement).where(PlayerAchievement.user_id == u.id))}
    assert owned == set(out["new_achievements"])
    assert service.evaluate_achievements(db, u, p, None, datetime.now(timezone.utc)) == []  # nothing is awarded twice
    items = {a["code"]: a for a in service.achievements_for(db, u)}
    assert items["first-steps"]["earned"] and not items["champion"]["earned"] and len(items) == len(catalog.ACHIEVEMENTS)


# ================================================================== challenges
def test_daily_challenges_progress_from_verified_runs_and_are_claimed_once(db):
    u = make_user(db)
    now = datetime.now(timezone.utc)
    ch = service.challenges_for(db, u, now, IST); db.commit()
    assert {c["code"] for c in ch["items"]} == {t["code"] for t in catalog.CHALLENGE_TEMPLATES} and all(not c["claimable"] for c in ch["items"])
    stars_ch = next(c for c in ch["items"] if c["code"] == "stars")
    with pytest.raises(ApiError) as e:
        service.claim_challenge(db, u, uuid.UUID(stars_ch["id"]), now, IST)  # the frontend cannot claim what the server has not seen
    assert e.value.code == "challenge_not_completed"
    target = stars_ch["target"]
    payload = catch_payload(stars=target, golden=0, score=target * 10, hearts=0)
    play(db, u, "catch-the-stars", None, payload, seconds=31)
    ch2 = service.challenges_for(db, u, now, IST)
    stars2 = next(c for c in ch2["items"] if c["code"] == "stars")
    assert stars2["completed"] and stars2["claimable"] and stars2["progress"] == target
    out = service.claim_challenge(db, u, uuid.UUID(stars_ch["id"]), now, IST); db.commit()
    assert out["claimed"] and out["reward_points"] == 20 and "daily-hero" in out["new_achievements"] and out["verified_points"] >= 20
    with pytest.raises(ApiError) as e:
        service.claim_challenge(db, u, uuid.UUID(stars_ch["id"]), now, IST)
    assert e.value.code == "already_claimed"
    with pytest.raises(ApiError) as e:
        service.claim_challenge(db, u, uuid.UUID(stars_ch["id"]), now + timedelta(days=2), IST)
    assert e.value.code in ("already_claimed", "challenge_expired")


def test_two_different_games_challenge_counts_distinct_games(db):
    u = make_user(db)
    now = datetime.now(timezone.utc)
    play(db, u, "catch-the-stars", None, catch_payload(), seconds=31)
    lv0 = catalog.jump_info()["order"][0]
    play(db, u, "laxbot-jump", lv0, jump_payload(lv0), seconds=500)
    play(db, u, "catch-the-stars", None, catch_payload(), seconds=31)  # the same game again does not count twice
    two = next(c for c in service.challenges_for(db, u, now, IST)["items"] if c["code"] == "two-games")
    assert two["progress"] == 2 and two["completed"] == (two["target"] <= 2)


# ================================================================== cloud progress
def test_progress_sync_merges_forward_only_and_marks_guest_imports_unverified(db):
    u = make_user(db)
    lv0, lv1 = catalog.jump_info()["order"][:2]
    row, changed = service.merge_progress(db, u, "laxbot-jump", {"levels": {lv0: {"completed": True, "stars": 2, "best": 900}}}, base_version=None, imported=True); db.commit()
    rec = row.data["levels"][lv0]
    assert changed and rec["completed"] and rec["imported"] and not rec["verified"] and rec["local_best"] == 900  # offered for import: never verified
    assert db.scalar(select(func.count()).select_from(VerifiedScore)) == 0
    v1 = row.version
    stale, _ = service.merge_progress(db, u, "laxbot-jump", {"levels": {lv0: {"completed": False, "stars": 1, "best": 100}}}, base_version=0, imported=False); db.commit()
    assert stale.data["levels"][lv0]["completed"] and stale.data["levels"][lv0]["stars"] == 2 and stale.data["levels"][lv0]["local_best"] == 900  # an older device cannot overwrite newer progress
    assert stale.version >= v1
    other, _ = service.merge_progress(db, u, "laxbot-jump", {"levels": {lv1: {"completed": True, "stars": 3, "best": 50}, "bogus-level": {"completed": True}}, "unlocked": [lv1, "bogus"]}, base_version=stale.version, imported=False); db.commit()
    assert set(other.data["levels"]) == {lv0, lv1} and other.data["unlocked"] == [lv1]  # a second device adds its levels; unknown ids are ignored
    assert service.level_unlocked(db, u, "laxbot-jump", lv1)


def test_verified_play_marks_progress_verified_and_unlocks_the_next_level(db):
    u = make_user(db)
    lv0, lv1 = catalog.jump_info()["order"][:2]
    play(db, u, "laxbot-jump", lv0, jump_payload(lv0), seconds=500)
    data = service.get_progress_row(db, u, "laxbot-jump").data
    assert data["levels"][lv0]["verified"] and data["levels"][lv0]["verified_best"] > 0 and lv1 in data["unlocked"]


# ================================================================== the API (SQLite behind the real routes)
@pytest.fixture
def api(factory, monkeypatch):
    from app.core.rate_limit import limiter
    from app.main import create_app

    limiter.reset()
    app = create_app()
    users: dict[str, User] = {}

    def db_dep():
        with factory() as s:
            yield s

    def who(request):
        name = request.headers.get("x-test-user")
        if not name:
            return None
        if name not in users:
            with factory() as s:
                u = make_user(s, name=f"{name} Private", email=f"{name}@example.com"); users[name] = u
        return users[name]

    def current(request: Request):
        u = who(request)
        if u is None:
            raise ApiError(401, "not_authenticated", "Please log in to continue.")
        return u

    app.dependency_overrides[get_db] = db_dep
    app.dependency_overrides[get_read_db] = db_dep
    app.dependency_overrides[deps.current_user] = current
    app.dependency_overrides[deps.csrf_user] = current
    def optional(request: Request):
        return who(request)

    app.dependency_overrides[deps.optional_user] = optional
    with TestClient(app, base_url="http://localhost", raise_server_exceptions=False) as c:
        c.users = users
        yield c
    app.dependency_overrides.clear()


def test_api_guests_can_read_public_data_but_cannot_write(api):
    assert api.get("/api/play-zone/leaderboards?game=overall&period=weekly").status_code == 200
    assert api.get("/api/play-zone/achievements").json()["signed_in"] is False
    assert api.get("/api/play-zone/challenges").status_code == 200
    for method, path, body in (("get", "/api/play-zone/profile", None), ("patch", "/api/play-zone/profile", {"nickname": "Nope"}), ("post", "/api/play-zone/sessions", {"game": "catch-the-stars"}),
                               ("get", "/api/play-zone/games/catch-the-stars/progress", None)):
        r = getattr(api, method)(path, **({"json": body} if body else {}))
        assert r.status_code == 401 and r.json()["error"]["code"] == "not_authenticated", path


def test_api_full_flow_for_a_signed_in_player_and_privacy_of_public_rows(api):
    h = {"x-test-user": "asha"}
    prof = api.get("/api/play-zone/profile", headers=h).json()
    assert prof["nickname"].startswith("Player") and "email" not in json.dumps(prof)
    assert api.patch("/api/play-zone/profile", json={"nickname": "Asha Star", "avatar": "cyber-defender"}, headers=h).json()["nickname"] == "Asha Star"
    assert api.patch("/api/play-zone/profile", json={"nickname": "a@b.co"}, headers=h).status_code == 422
    assert api.patch("/api/play-zone/profile", json={"user_id": "x"}, headers=h).status_code == 422  # unknown fields (like an injected id) are refused
    s = api.post("/api/play-zone/sessions", json={"game": "catch-the-stars", "request_key": "key-abcdef-01"}, headers=h)
    assert s.status_code == 201 and s.json()["official"]
    sid = s.json()["session_id"]
    same = api.post("/api/play-zone/sessions", json={"game": "catch-the-stars", "request_key": "key-abcdef-01"}, headers=h).json()
    assert same["session_id"] == sid
    early = api.post(f"/api/play-zone/sessions/{sid}/complete", json={"result": catch_payload()}, headers=h).json()
    assert early["accepted"] is False and "faster_than_real_time" in early["reasons"]  # no waiting, no score
    s2 = api.post("/api/play-zone/sessions", json={"game": "catch-the-stars"}, headers=h).json()["session_id"]
    assert api.post(f"/api/play-zone/sessions/{uuid.uuid4()}/complete", json={"result": {}}, headers=h).status_code == 404
    assert api.post("/api/play-zone/sessions", json={"game": "tetris"}, headers=h).status_code == 422
    assert api.post(f"/api/play-zone/sessions/{s2}/complete", json={"result": "not a dict"}, headers=h).status_code == 422
    assert api.get("/api/play-zone/leaderboards?game=nope", headers=h).status_code == 422
    assert api.get("/api/play-zone/leaderboards?period=yearly", headers=h).status_code == 422
    board = api.get("/api/play-zone/leaderboards?game=overall&period=all", headers=h).json()
    assert board["items"] == [] and board["timezone"] and board["me"] is None  # no fake players


def test_api_rate_limits_session_starts(api):
    h = {"x-test-user": "spammer"}
    codes = [api.post("/api/play-zone/sessions", json={"game": "catch-the-stars"}, headers=h).status_code for _ in range(34)]
    assert codes[0] == 201 and 429 in codes and codes.index(429) <= 31  # the per-player limit (30 a minute) stops a script


def test_api_progress_endpoints(api):
    h = {"x-test-user": "sync"}
    first = api.get("/api/play-zone/games/laxbot-jump/progress", headers=h).json()
    lv0 = catalog.jump_info()["order"][0]
    r = api.post("/api/play-zone/games/laxbot-jump/progress", json={"levels": {lv0: {"completed": True, "stars": 3, "best": 777}}, "base_version": first["version"], "imported": True}, headers=h)
    assert r.status_code == 200 and r.json()["data"]["levels"][lv0]["completed"] and r.json()["version"] > first["version"]
    assert api.get("/api/play-zone/games/not-a-game/progress", headers=h).status_code == 404
    assert api.post("/api/play-zone/games/laxbot-jump/progress", json={"levels": {}, "evil": 1}, headers=h).status_code == 422


def test_api_errors_use_the_standard_envelope(api):
    r = api.post("/api/play-zone/challenges/" + str(uuid.uuid4()) + "/claim", headers={"x-test-user": "x"})
    assert r.status_code == 404 and set(r.json()["error"]) >= {"code", "message"}


# ================================================================== migration (PostgreSQL SQL generated offline)
def test_migration_generates_the_expected_postgres_sql():
    import subprocess, sys

    backend = Path(__file__).resolve().parents[1]
    out = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "0025:0026", "--sql"], cwd=backend, capture_output=True, text=True, timeout=120,
                         env={**__import__("os").environ, "APP_ENV": "test", "DATABASE_URL": "postgresql+psycopg://u:p@localhost/none", "AUTH_SECRET": "x" * 40, "PYTHONUTF8": "1"})
    sql = out.stdout
    assert out.returncode == 0, out.stderr[-400:]
    for t in ("pz_profiles", "pz_game_sessions", "pz_scores", "pz_progress", "pz_achievement_defs", "pz_player_achievements", "pz_challenges", "pz_challenge_progress"):
        assert f"CREATE TABLE {t}" in sql and f'ALTER TABLE public."{t}" ENABLE ROW LEVEL SECURITY' in sql
    assert "uq_pz_scores_session_id" in sql and "uq_pz_profiles_nickname_key" in sql and "REFERENCES users (id) ON DELETE CASCADE" in sql
    assert sql.count("INSERT INTO pz_achievement_defs") == len(catalog.ACHIEVEMENTS)
