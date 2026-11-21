"""Play Zone database logic: profiles, game sessions, verified scores, cloud progress, achievements, daily challenges and leaderboards.

Rules that hold everywhere in this module:
  * The player is ALWAYS the authenticated website user passed in by the route (derived from the server session). No function takes a player id from the browser.
  * Recording a result is ONE transaction: the session row is locked, the result is verified, and the score, profile counters, progress, achievements and challenge progress are written together;
    an error rolls everything back, and a repeated request for an already-finished session returns the stored outcome instead of scoring twice.
  * Nothing here talks to the network.
"""

from __future__ import annotations

import json
import random
import re
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import AchievementDef, ChallengeProgress, ChallengeTemplate, DailyChallenge, GameProgress, GameSession, PlayerAchievement, PlayerProfile, User, VerifiedScore
from app.play_zone import catalog, config_store, periods, scoring, verify

SESSION_TTL = timedelta(hours=3)
NICK_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 ._-]*[A-Za-z0-9]$")
BLOCKED_NICK = ("admin", "moderator", "laxbot official", "lax360", "support", "staff")
PREF_KEYS = {"sound": bool, "music": bool, "haptics": bool}
MAX_RESULT_BYTES = 8000


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)  # SQLite returns naive datetimes; PostgreSQL returns aware ones


# ================================================================== profiles
def _default_nickname(db: Session, user: User) -> str:
    base = f"Player{user.id.hex[:4].upper()}"
    taken = set(db.scalars(select(PlayerProfile.nickname_key).where(PlayerProfile.nickname_key.like(f"{base.lower()}%"))))
    for i in range(0, 200):
        nick = base if i == 0 else f"{base}{i}"
        if nick.lower() not in taken:
            return nick
    return f"Player{uuid.uuid4().hex[:8]}"


def get_profile(db: Session, user: User, *, create: bool = True) -> PlayerProfile | None:
    p = db.scalar(select(PlayerProfile).where(PlayerProfile.user_id == user.id))
    if p is None and create:
        nick = _default_nickname(db, user)
        p = PlayerProfile(user_id=user.id, nickname=nick, nickname_key=nick.lower(), avatar=catalog.AVATARS[0], preferences={}, stats={})
        db.add(p)
        try:
            db.flush()
        except IntegrityError:  # two tabs created it at once: use the row that won
            db.rollback()
            p = db.scalar(select(PlayerProfile).where(PlayerProfile.user_id == user.id))
    return p


def clean_nickname(raw: str, lo: int = 3, hi: int = 24) -> str:
    nick = " ".join(str(raw).split())
    if not NICK_RE.match(nick) or not lo <= len(nick) <= hi:
        msg = f"Use {lo} to {hi} letters, numbers, spaces, dots, dashes or underscores."
        raise ApiError(422, "invalid_nickname", msg, fields={"nickname": msg})
    low = nick.lower()
    if "@" in nick or re.search(r"\d{6,}", nick) or any(b in low for b in BLOCKED_NICK):
        raise ApiError(422, "invalid_nickname", "Please choose a nickname that is not an e-mail, a phone number or a reserved name.", fields={"nickname": "Choose a different nickname."})
    return nick


def clean_preferences(prefs: dict, graphics: tuple | list = ("auto", "low", "medium", "high")) -> dict:
    out: dict = {}
    for k, typ in PREF_KEYS.items():
        if k in prefs and isinstance(prefs[k], typ):
            out[k] = prefs[k]
    if isinstance(prefs.get("volume"), int) and not isinstance(prefs.get("volume"), bool) and 0 <= prefs["volume"] <= 100:
        out["volume"] = prefs["volume"]
    if prefs.get("graphics") in graphics:
        out["graphics"] = prefs["graphics"]
    return out


def ensure_not_suspended(p: PlayerProfile | None) -> None:
    if p is not None and p.suspended:
        raise ApiError(403, "play_zone_suspended", "Your Play Zone participation is paused. Your website account is not affected. Please contact LAX360 if you think this is a mistake.")


def update_profile(db: Session, user: User, *, nickname: str | None, avatar: str | None, preferences: dict | None) -> PlayerProfile:
    p = get_profile(db, user)
    ensure_not_suspended(p)
    cfg = config_store.load_settings(db)
    if nickname is not None:
        nick = clean_nickname(nickname, cfg["nickname_min"], cfg["nickname_max"])
        if nick.lower() != p.nickname_key:
            clash = db.scalar(select(PlayerProfile.id).where(PlayerProfile.nickname_key == nick.lower(), PlayerProfile.id != p.id))
            if clash:
                raise ApiError(409, "nickname_taken", "That nickname is already taken.", fields={"nickname": "That nickname is already taken."})
        p.nickname, p.nickname_key = nick, nick.lower()
    if avatar is not None:
        if avatar not in cfg["avatars_enabled"]:
            raise ApiError(422, "invalid_avatar", "Choose one of the approved avatars.", fields={"avatar": "Choose one of the approved avatars."})
        p.avatar = avatar
    if preferences is not None:
        merged = {**(p.preferences or {}), **clean_preferences(preferences, cfg["graphics_options"])}
        p.preferences = merged
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ApiError(409, "nickname_taken", "That nickname is already taken.", fields={"nickname": "That nickname is already taken."}) from None
    return p


# ================================================================== progress (cloud sync)
def _empty_progress(game: str) -> dict:
    return {"levels": {}, "unlocked": [], "best": 0}


def get_progress_row(db: Session, user: User, game: str, *, lock: bool = False) -> GameProgress:
    q = select(GameProgress).where(GameProgress.user_id == user.id, GameProgress.game == game)
    if lock:
        q = q.with_for_update()
    row = db.scalar(q)
    if row is None:
        row = GameProgress(user_id=user.id, game=game, data=_empty_progress(game), version=1)
        db.add(row)
        db.flush()
    return row


def _valid_levels(game: str) -> set[str]:
    return set(catalog.level_ids(game))


def merge_progress(db: Session, user: User, game: str, incoming: dict, *, base_version: int | None, imported: bool) -> tuple[GameProgress, bool]:
    """Merge progress from a device into the cloud copy. The merge only ever moves FORWARD (a level completed stays completed, stars and bests only go up, unlocks are added), so a stale device
    can never overwrite newer progress. `imported` marks guest progress: it can unlock levels and show on the player's own screens, but it is never VERIFIED and never reaches a leaderboard.
    Returns (row, changed)."""
    ensure_not_suspended(get_profile(db, user))
    row = get_progress_row(db, user, game, lock=True)
    data = json.loads(json.dumps(row.data or _empty_progress(game)))
    levels = data.setdefault("levels", {})
    valid = _valid_levels(game)
    changed = False
    for lid, rec in (incoming.get("levels") or {}).items():
        if lid not in valid or not isinstance(rec, dict):
            continue
        cur = levels.setdefault(lid, {"completed": False, "stars": 0, "local_best": 0, "verified_best": 0, "verified": False})
        before = json.dumps(cur, sort_keys=True)
        if rec.get("completed") is True and not cur.get("completed"):
            cur["completed"] = True
        stars = rec.get("stars")
        if isinstance(stars, int) and not isinstance(stars, bool) and 0 <= stars <= 3:
            cur["stars"] = max(cur.get("stars", 0), stars)
        best = rec.get("best", rec.get("local_best"))
        if isinstance(best, int) and not isinstance(best, bool) and 0 <= best <= 10_000_000:
            cur["local_best"] = max(cur.get("local_best", 0), best)
        if imported and rec.get("completed") is True and not cur.get("verified"):
            cur["imported"] = True
        if json.dumps(cur, sort_keys=True) != before:
            changed = True
    for lid in incoming.get("unlocked") or []:
        if lid in valid and lid not in data.setdefault("unlocked", []):
            data["unlocked"].append(lid); changed = True
    if game == "catch-the-stars":
        b = incoming.get("best")
        if isinstance(b, int) and not isinstance(b, bool) and 0 <= b <= 1_000_000 and b > data.get("best", 0):
            data["best"] = b; changed = True
    if changed:
        row.data = data
        row.version = (row.version or 1) + 1
    conflict = base_version is not None and base_version < (row.version - (1 if changed else 0))
    return row, changed or conflict


def level_unlocked(db: Session, user: User, game: str, level_id: str) -> bool:
    ids = catalog.level_ids(game)
    if level_id not in ids:
        return False
    i = ids.index(level_id)
    if i == 0 or game == "catch-the-stars":
        return True
    row = db.scalar(select(GameProgress).where(GameProgress.user_id == user.id, GameProgress.game == game))
    data = (row.data if row else None) or {}
    return bool((data.get("levels", {}).get(ids[i - 1]) or {}).get("completed")) or level_id in (data.get("unlocked") or [])


def completed_levels(db: Session, user: User, game: str) -> list[str]:
    row = db.scalar(select(GameProgress).where(GameProgress.user_id == user.id, GameProgress.game == game))
    levels = ((row.data if row else None) or {}).get("levels", {})
    return [lid for lid, r in levels.items() if r.get("completed")]


def verified_completed(db: Session, user: User, game: str) -> list[str]:
    row = db.scalar(select(GameProgress).where(GameProgress.user_id == user.id, GameProgress.game == game))
    levels = ((row.data if row else None) or {}).get("levels", {})
    return [lid for lid, r in levels.items() if r.get("verified")]


# ================================================================== sessions
def start_session(db: Session, user: User, game: str, level_id: str | None, request_key: str | None) -> GameSession:
    if game not in catalog.GAMES:
        raise ApiError(422, "invalid_game", "Unknown game.", fields={"game": "Unknown game."})
    level = level_id or catalog.MAIN
    if level not in catalog.level_ids(game):
        raise ApiError(422, "invalid_level", "Unknown level.", fields={"level_id": "Unknown level."})
    ensure_not_suspended(get_profile(db, user))
    now = utcnow()
    if request_key:  # a retried start returns the same run
        existing = db.scalar(select(GameSession).where(GameSession.user_id == user.id, GameSession.request_key == request_key))
        if existing is not None:
            return existing
    version = config_store.check_can_start(db, game, level)  # closed / maintenance / disabled game or level: no NEW session (running ones may finish)
    open_count = db.scalar(select(func.count()).select_from(GameSession).where(GameSession.user_id == user.id, GameSession.status == "started", GameSession.expires_at > now)) or 0
    if open_count >= 40:  # a player cannot hoard sessions
        oldest = db.scalars(select(GameSession).where(GameSession.user_id == user.id, GameSession.status == "started").order_by(GameSession.started_at).limit(open_count - 30)).all()
        for s in oldest:
            s.status = "expired"
    config: dict = {"config_version": version}  # the gameplay profile this run started under
    if game == "puzzle-pop":
        config["seed"] = random.SystemRandom().randrange(1, 2**31 - 1)  # the server picks the board: the browser cannot shop for an easy one
        config["moves"] = catalog.puzzle_levels()[level]["moves"]
    s = GameSession(user_id=user.id, game=game, level_id=level, config=config, request_key=(request_key or None), status="started", started_at=now, expires_at=now + SESSION_TTL, reasons=[])
    db.add(s)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        s = db.scalar(select(GameSession).where(GameSession.user_id == user.id, GameSession.request_key == request_key))
        if s is None:
            raise
    return s


def _bounded(payload: dict) -> dict:
    raw = json.dumps(payload, separators=(",", ":"), default=str)
    if len(raw) <= MAX_RESULT_BYTES:
        return payload
    return {"truncated": True, "size": len(raw), "keys": sorted(payload)[:20]}  # large move logs are not stored: the replay already proved them


def complete_session(db: Session, user: User, session_id: uuid.UUID, payload: dict) -> dict:
    """Verify a finished run and record everything in one transaction. Idempotent: finishing a finished session returns the stored outcome."""
    now = utcnow()
    s = db.scalar(select(GameSession).where(GameSession.id == session_id, GameSession.user_id == user.id).with_for_update())
    if s is None:
        raise ApiError(404, "session_not_found", "This game session was not found.")
    if s.status in ("completed", "rejected"):
        return outcome_of(db, s)
    ensure_not_suspended(get_profile(db, user, create=False))
    if s.status == "expired" or _aware(s.expires_at) < now:
        s.status, s.verdict, s.reasons = "expired", "rejected", ["session_expired"]
        s.client_result = _bounded(payload)
        db.flush()
        return outcome_of(db, s)
    elapsed = (now - _aware(s.started_at)).total_seconds()
    s.completed_at, s.duration_ms, s.client_result = now, int(elapsed * 1000), _bounded(payload)
    v = _verify(db, user, s, payload, elapsed)
    if not v.ok:
        s.status, s.verdict, s.reasons = "rejected", "rejected", v.reasons
        db.flush()
        return outcome_of(db, s)
    status = "flagged" if v.flags else "accepted"
    s.status, s.verdict, s.reasons = "completed", status, v.flags
    points = scoring.normalise(s.game, v.level_id, v.score)
    score = VerifiedScore(session_id=s.id, user_id=user.id, game=s.game, level_id=v.level_id, score=v.score, points=points, status=status, flags=v.flags, details={**v.details, "_fx": status == "accepted", "_metrics": v.metrics})
    db.add(score)
    p = get_profile(db, user)
    p.games_played = (p.games_played or 0) + 1
    p.last_played_at = now
    stats = dict(p.stats or {})
    if status == "accepted":  # flagged runs do not move counters, achievements or challenges until a moderator clears them
        for k, n in v.metrics.items():
            if k in ("stars_collected", "bugs_captured"):
                stats[k] = stats.get(k, 0) + int(n)
        p.stats = stats
        _record_progress(db, user, s.game, v)
    db.flush()
    new_ach: list[str] = []
    if status == "accepted":
        _challenge_metrics(db, user, s.game, v.metrics, now)
        db.flush()
        _refresh_points(db, p, now)
        new_ach = evaluate_achievements(db, user, p, s.id, now)
    return outcome_of(db, s, new_achievements=new_ach)


def _verify(db: Session, user: User, s: GameSession, payload: dict, elapsed: float) -> verify.Verdict:
    if s.game == "catch-the-stars":
        return verify.verify_catch(payload, elapsed)
    if s.game == "laxbot-jump":
        return verify.verify_jump(payload, s.level_id, elapsed, level_unlocked(db, user, s.game, s.level_id))
    if s.game == "puzzle-pop":
        return verify.verify_puzzle(payload, s.level_id, int(s.config.get("seed", 0)), elapsed, level_unlocked(db, user, s.game, s.level_id))
    return verify.verify_bug(payload, s.level_id, elapsed)


def _record_progress(db: Session, user: User, game: str, v: verify.Verdict) -> None:
    row = get_progress_row(db, user, game, lock=True)
    data = json.loads(json.dumps(row.data or _empty_progress(game)))
    if game == "catch-the-stars":
        data["best"] = max(data.get("best", 0), v.score)
    else:
        rec = data.setdefault("levels", {}).setdefault(v.level_id, {"completed": False, "stars": 0, "local_best": 0, "verified_best": 0, "verified": False})
        rec["completed"] = True; rec["verified"] = True
        rec["verified_best"] = max(rec.get("verified_best", 0), v.score)
        rec["stars"] = max(rec.get("stars", 0), int(v.details.get("stars", v.details.get("rating", 1))))
        rec.pop("imported", None)
        ids = catalog.level_ids(game)
        i = ids.index(v.level_id)
        if i + 1 < len(ids) and ids[i + 1] not in data.setdefault("unlocked", []):
            data["unlocked"].append(ids[i + 1])
    row.data = data
    row.version = (row.version or 1) + 1


def _earned_in(db: Session, s: GameSession) -> list[str]:
    """Achievements this run earned (a repeated or retried request reports them again, so a lost response does not lose the notification)."""
    return list(db.scalars(select(PlayerAchievement.code).where(PlayerAchievement.user_id == s.user_id, PlayerAchievement.session_id == s.id)))


def outcome_of(db: Session, s: GameSession, new_achievements: list[str] | None = None) -> dict:
    score = db.scalar(select(VerifiedScore).where(VerifiedScore.session_id == s.id))
    return {
        "session_id": str(s.id), "status": s.status, "accepted": score is not None, "flagged": bool(score and score.status == "flagged"), "reasons": list(s.reasons or []) if s.status != "completed" else [],
        "score": score.score if score else None, "points": score.points if score else None, "level_id": s.level_id, "game": s.game,
        "details": score.details if score else {}, "new_achievements": new_achievements if new_achievements is not None else _earned_in(db, s),
    }


# ================================================================== points, leaderboards
def _period_filter(kind: str, now: datetime, tz):
    start, end = periods.period_bounds(kind, now, tz)
    conds = [VerifiedScore.status == "accepted"]
    if start:
        conds += [VerifiedScore.created_at >= start, VerifiedScore.created_at < end]
    return conds, start, end


def _best_rows(db: Session, conds: list, game: str | None = None):
    q = select(VerifiedScore.user_id, VerifiedScore.game, VerifiedScore.level_id, func.max(VerifiedScore.points), func.max(VerifiedScore.score), func.min(VerifiedScore.created_at)).where(*conds)
    if game:
        q = q.where(VerifiedScore.game == game)
    return db.execute(q.group_by(VerifiedScore.user_id, VerifiedScore.game, VerifiedScore.level_id)).all()


def _challenge_points(db: Session, start: datetime | None, end: datetime | None) -> dict[uuid.UUID, int]:
    q = select(ChallengeProgress.user_id, func.sum(ChallengeProgress.reward_points)).where(ChallengeProgress.claimed_at.is_not(None))
    if start:
        q = q.where(ChallengeProgress.claimed_at >= start, ChallengeProgress.claimed_at < end)
    out = {u: int(n or 0) for u, n in db.execute(q.group_by(ChallengeProgress.user_id)).all()}
    aq = select(PlayerAchievement.user_id, func.sum(AchievementDef.reward_points)).join(AchievementDef, AchievementDef.code == PlayerAchievement.code).where(AchievementDef.reward_points > 0)
    if start:
        aq = aq.where(PlayerAchievement.earned_at >= start, PlayerAchievement.earned_at < end)
    for u, n in db.execute(aq.group_by(PlayerAchievement.user_id)).all():
        out[u] = out.get(u, 0) + int(n or 0)
    return out


def ranking(db: Session, game: str, period: str, now: datetime, tz) -> list[dict]:
    """The full ranking of one board (rank 1 first), built from verified scores only. See scoring.py for the point rules."""
    conds, start, end = _period_filter(period, now, tz)
    hidden = {pid for (pid,) in db.execute(select(PlayerProfile.user_id).where((PlayerProfile.hidden.is_(True)) | (PlayerProfile.suspended.is_(True))))}
    per_user: dict[uuid.UUID, dict] = {}
    if game == "overall":
        rows = _best_rows(db, conds)
        for uid, g, lvl, pts, sc, first in rows:
            u = per_user.setdefault(uid, {"games": {}, "raw": 0, "first": first})
            u["games"].setdefault(g, []).append(int(pts)); u["raw"] += int(sc); u["first"] = min(u["first"], first)
        challenge = _challenge_points(db, start, end)
        for uid, n in challenge.items():
            per_user.setdefault(uid, {"games": {}, "raw": 0, "first": now})["challenge"] = n
        entries = [{"user_id": uid, "points": sum(scoring.game_contribution(pts) for pts in u["games"].values()) + u.get("challenge", 0), "score": u["raw"], "first": u["first"],
                    "breakdown": {**{g: scoring.game_contribution(p) for g, p in u["games"].items()}, **({"challenges": u["challenge"]} if u.get("challenge") else {})}} for uid, u in per_user.items() if uid not in hidden]
    else:
        rows = _best_rows(db, conds, game)
        for uid, g, lvl, pts, sc, first in rows:
            u = per_user.setdefault(uid, {"pts": [], "raw": 0, "best": 0, "first": first})
            u["pts"].append(int(pts)); u["raw"] += int(sc); u["best"] = max(u["best"], int(sc)); u["first"] = min(u["first"], first)
        entries = [{"user_id": uid, "points": scoring.game_contribution(u["pts"]), "score": u["best"] if game == "catch-the-stars" else u["raw"], "first": u["first"], "levels": len(u["pts"])} for uid, u in per_user.items() if uid not in hidden]
    entries.sort(key=lambda e: (-e["points"], -e["score"], _aware(e["first"]), str(e["user_id"])))
    profiles = {p.user_id: p for p in db.scalars(select(PlayerProfile).where(PlayerProfile.user_id.in_([e["user_id"] for e in entries]))).all()} if entries else {}
    out = []
    for i, e in enumerate(entries):
        p = profiles.get(e["user_id"])
        if p is None:
            continue
        out.append({"rank": len(out) + 1, "user_id": e["user_id"], "nickname": p.nickname, "avatar": p.avatar, "score": e["score"], "points": e["points"], "game": game, **({"breakdown": e["breakdown"]} if "breakdown" in e else {"levels": e.get("levels")})})
    return out


_CACHE: dict[tuple, tuple[float, list]] = {}
CACHE_SECONDS = 20.0


def cached_ranking(db: Session, game: str, period: str, now: datetime, tz, *, ttl: float = CACHE_SECONDS) -> list[dict]:
    """Public rankings are cached for a few seconds per board (one query set serves every visitor); a newly accepted score drops the cache of its game, so players see their result at once."""
    import time as _t

    k = (game, period, periods.local_date(now, tz).isoformat())
    hit = _CACHE.get(k)
    if hit and _t.monotonic() - hit[0] < ttl:
        return hit[1]
    data = ranking(db, game, period, now, tz)
    if len(_CACHE) > 200:
        _CACHE.clear()
    _CACHE[k] = (_t.monotonic(), data)
    return data


def drop_ranking_cache() -> None:
    _CACHE.clear()


def leaderboard_page(db: Session, game: str, period: str, page: int, page_size: int, me: User | None, now: datetime, tz) -> dict:
    data = cached_ranking(db, game, period, now, tz)
    total = len(data)
    start = (page - 1) * page_size
    rows = [{k: (str(v) if k == "user_id" else v) for k, v in r.items() if k != "user_id"} for r in data[start:start + page_size]]
    mine = None
    if me is not None:
        for r in data:
            if r["user_id"] == me.id:
                mine = {k: v for k, v in r.items() if k != "user_id"}; break
    pstart, pend = periods.period_bounds(period, now, tz)
    return {"game": game, "period": period, "timezone": str(tz), "starts_at": pstart.isoformat() if pstart else None, "ends_at": pend.isoformat() if pend else None,
            "items": rows, "total": total, "page": page, "page_size": page_size, "pages": max(1, -(-total // page_size)), "me": mine}


def _refresh_points(db: Session, p: PlayerProfile, now: datetime) -> None:
    drop_ranking_cache()
    conds = [VerifiedScore.status == "accepted", VerifiedScore.user_id == p.user_id]
    per_game: dict[str, list[int]] = {}
    for uid, g, lvl, pts, sc, first in _best_rows(db, conds):
        per_game.setdefault(g, []).append(int(pts))
    claimed = int(db.scalar(select(func.sum(ChallengeProgress.reward_points)).where(ChallengeProgress.user_id == p.user_id, ChallengeProgress.claimed_at.is_not(None))) or 0)
    rewards = int(db.scalar(select(func.sum(AchievementDef.reward_points)).join(PlayerAchievement, PlayerAchievement.code == AchievementDef.code).where(PlayerAchievement.user_id == p.user_id)) or 0)
    p.verified_points = sum(scoring.game_contribution(v) for v in per_game.values()) + claimed + rewards


# ================================================================== achievements
def achievement_defs(db: Session) -> list[AchievementDef]:
    defs = db.scalars(select(AchievementDef).where(AchievementDef.active.is_(True)).order_by(AchievementDef.sort_order)).all()
    if defs:
        return list(defs)
    return [AchievementDef(code=c, title=t, description=d, game=g, icon=i, sort_order=s, active=True) for c, t, d, g, i, s in catalog.ACHIEVEMENTS]


def _accepted_games(db: Session, user: User) -> set[str]:
    return set(db.scalars(select(VerifiedScore.game).where(VerifiedScore.user_id == user.id, VerifiedScore.status == "accepted").distinct()))


def achievement_conditions(db: Session, user: User, p: PlayerProfile) -> dict[str, bool]:
    games = _accepted_games(db, user)
    done_jump = set(verified_completed(db, user, "laxbot-jump"))
    done_puzzle = set(verified_completed(db, user, "puzzle-pop"))
    done_bug = set(verified_completed(db, user, "bug-hunter"))
    stats = p.stats or {}
    puzzle_ids = catalog.level_ids("puzzle-pop")
    bug_final = catalog.bug_info()["order"][-1]
    final_boss = db.scalar(select(func.count()).select_from(VerifiedScore).where(VerifiedScore.user_id == user.id, VerifiedScore.game == "bug-hunter", VerifiedScore.level_id == bug_final, VerifiedScore.status == "accepted")) or 0
    claimed = db.scalar(select(func.count()).select_from(ChallengeProgress).where(ChallengeProgress.user_id == user.id, ChallengeProgress.claimed_at.is_not(None))) or 0
    return {
        "first-steps": bool(games), "all-rounder": games >= set(catalog.GAMES), "star-collector": stats.get("stars_collected", 0) >= catalog.STAR_COLLECTOR_TARGET,
        "cloud-explorer": "cloud-kingdom" in done_jump, "sky-climber": set(catalog.level_ids("laxbot-jump")) <= done_jump,
        "crystal-gardener": set(puzzle_ids[:5]) <= done_puzzle, "puzzle-master": len(done_puzzle) >= catalog.PUZZLE_MASTER_TARGET,
        "bug-squasher": stats.get("bugs_captured", 0) >= catalog.BUG_SQUASHER_TARGET, "cyber-defender": bug_final in done_bug and final_boss > 0,
        "daily-hero": claimed > 0, "champion": (p.verified_points or 0) >= catalog.CHAMPION_POINTS,
    }


RULE_TYPES: dict[str, dict] = {  # the only rules an administrator can pick: fixed types with validated parameters (never code or SQL)
    "games_played": {"label": "Play N verified games", "params": {"n": (1, 100000)}},
    "score_at_least": {"label": "Reach a verified score in a game", "params": {"game": "game", "n": (1, 10_000_000)}},
    "levels_completed": {"label": "Complete N levels of a level-based game", "params": {"game": "level_game", "n": (1, 100)}},
    "stat_total": {"label": "Collect N of a counted item (stars or bugs)", "params": {"stat": ("stars_collected", "bugs_captured"), "n": (1, 1_000_000)}},
    "distinct_games": {"label": "Play N different games", "params": {"n": (1, 4)}},
    "points_at_least": {"label": "Reach N ranking points", "params": {"n": (1, 100000)}},
    "challenges_claimed": {"label": "Claim N daily challenge rewards", "params": {"n": (1, 10000)}},
}


def clean_rule(rule_type: str, params) -> dict:
    spec = RULE_TYPES.get(rule_type)
    if spec is None:
        raise ApiError(422, "invalid_rule", "Choose one of the supported unlock conditions.", fields={"rule_type": "Unsupported condition."})
    if not isinstance(params, dict) or set(params) != set(spec["params"]):
        raise ApiError(422, "invalid_rule", "This condition needs: " + ", ".join(spec["params"]) + ".", fields={"rule_params": "Missing or unknown values."})
    out: dict = {}
    for k, rule in spec["params"].items():
        v = params[k]
        if rule == "game":
            ok = v in catalog.GAMES
        elif rule == "level_game":
            ok = v in config_store.LEVEL_GAMES
        elif isinstance(rule, tuple) and isinstance(rule[0], str):
            ok = v in rule
        else:
            ok = isinstance(v, int) and not isinstance(v, bool) and rule[0] <= v <= rule[1]
        if not ok:
            raise ApiError(422, "invalid_rule", f"“{k}” is not valid for this condition.", fields={"rule_params": f"Check “{k}”."})
        out[k] = v
    if rule_type == "levels_completed" and out["n"] > len(catalog.level_ids(out["game"])):
        raise ApiError(422, "invalid_rule", "That game does not have so many levels.", fields={"rule_params": "Too many levels."})
    return out


def rule_met(db: Session, user_id: uuid.UUID, p: PlayerProfile, rule_type: str, params: dict) -> bool:
    n = int(params.get("n", 1))
    if rule_type == "games_played":
        return (p.games_played or 0) >= n
    if rule_type == "points_at_least":
        return (p.verified_points or 0) >= n
    if rule_type == "stat_total":
        return (p.stats or {}).get(params["stat"], 0) >= n
    if rule_type == "distinct_games":
        return len(set(db.scalars(select(VerifiedScore.game).where(VerifiedScore.user_id == user_id, VerifiedScore.status == "accepted").distinct()))) >= n
    if rule_type == "challenges_claimed":
        return (db.scalar(select(func.count()).select_from(ChallengeProgress).where(ChallengeProgress.user_id == user_id, ChallengeProgress.claimed_at.is_not(None))) or 0) >= n
    if rule_type == "score_at_least":
        best = db.scalar(select(func.max(VerifiedScore.score)).where(VerifiedScore.user_id == user_id, VerifiedScore.game == params["game"], VerifiedScore.status == "accepted"))
        return (best or 0) >= n
    if rule_type == "levels_completed":
        row = db.scalar(select(GameProgress).where(GameProgress.user_id == user_id, GameProgress.game == params["game"]))
        levels = ((row.data if row else None) or {}).get("levels", {})
        return sum(1 for r in levels.values() if r.get("verified")) >= n
    return False


def evaluate_achievements(db: Session, user: User, p: PlayerProfile, session_id: uuid.UUID | None, now: datetime) -> list[str]:
    """Award every achievement whose condition is now true and that the player does not have yet. The (user, code) primary key makes a duplicate award impossible, even with two requests at once."""
    have = set(db.scalars(select(PlayerAchievement.code).where(PlayerAchievement.user_id == user.id)))
    known = {d.code for d in achievement_defs(db)}
    new: list[str] = []
    conditions = achievement_conditions(db, user, p)
    custom = {d.code: d for d in achievement_defs(db) if d.rule_type}
    for code, d in custom.items():
        if code not in have and code in known:
            try:
                conditions[code] = rule_met(db, user.id, p, d.rule_type, d.rule_params or {})
            except Exception:  # a malformed stored rule must never break the player's result
                conditions[code] = False
    for code, ok in conditions.items():
        if not ok or code in have or code not in known:
            continue
        try:
            with db.begin_nested():
                db.add(PlayerAchievement(user_id=user.id, code=code, earned_at=now, session_id=session_id))
                db.flush()
            new.append(code)
        except IntegrityError:
            pass
    reward = sum(int(d.reward_points or 0) for d in achievement_defs(db) if d.code in new)
    if reward:
        p.verified_points = (p.verified_points or 0) + reward
        drop_ranking_cache()
    return new


def achievements_for(db: Session, user: User) -> list[dict]:
    earned = {a.code: a for a in db.scalars(select(PlayerAchievement).where(PlayerAchievement.user_id == user.id))}
    return [{"code": d.code, "title": d.title, "description": d.description, "game": d.game, "icon": d.icon, "earned": d.code in earned, "earned_at": earned[d.code].earned_at.isoformat() if d.code in earned else None}
            for d in achievement_defs(db)]


# ================================================================== daily challenges
def _templates_for(db: Session, d: date) -> list[dict]:
    """The recipes that apply to local day `d`: the active, scheduled templates (admin-managed). With no templates in the database the built-in set is used."""
    try:
        with db.begin_nested():
            rows = db.scalars(select(ChallengeTemplate).order_by(ChallengeTemplate.sort_order, ChallengeTemplate.code)).all()
    except Exception:  # templates not migrated yet
        rows = []
    if not rows:
        return [{"code": t["code"], "title": t["title"], "description": t["description"], "metric": t["metric"], "game": t["game"], "targets": list(t["targets"]), "reward": t["reward"]} for t in catalog.CHALLENGE_TEMPLATES]
    return [{"code": r.code, "title": r.title, "description": r.description, "metric": r.metric, "game": r.game, "targets": list(r.targets or []) or [1], "reward": r.reward_points}
            for r in rows if r.active and (r.starts_on is None or r.starts_on <= d) and (r.ends_on is None or d <= r.ends_on)]


def ensure_challenges(db: Session, d: date, tz) -> list[DailyChallenge]:
    """The challenges of one local day, created by the server from the active templates the first time the day is asked for (all players share them). A generated challenge is a
    snapshot: later edits of a template apply from the next day that has not been generated yet, so progress and rewards stay consistent."""
    rows = db.scalars(select(DailyChallenge).where(DailyChallenge.challenge_date == d).order_by(DailyChallenge.code)).all()
    wanted = _templates_for(db, d)
    have = {r.code for r in rows}
    missing = [t for t in wanted if t["code"] not in have]
    if not missing:
        return list(rows)
    start, end = periods.day_bounds(d, tz)
    for t in missing:
        targets = t["targets"]
        n = int(targets[d.weekday() % len(targets)])
        s_ = "" if n == 1 else "s"
        try:
            with db.begin_nested():
                db.add(DailyChallenge(challenge_date=d, code=t["code"], title=t["title"].format(n=n, s=s_)[:80], description=t["description"].format(n=n, s=s_)[:200], metric=t["metric"], game=t["game"], target=n,
                                      reward_points=t["reward"], starts_at=start, expires_at=end))
                db.flush()
        except IntegrityError:
            pass
    return list(db.scalars(select(DailyChallenge).where(DailyChallenge.challenge_date == d).order_by(DailyChallenge.code)).all())


def _challenge_metrics(db: Session, user: User, game: str, metrics: dict, now: datetime) -> None:
    tz = None
    from app.core.config import get_settings

    tz = periods.zone(get_settings().app_timezone)
    today = periods.local_date(now, tz)
    for ch in ensure_challenges(db, today, tz):
        if not (_aware(ch.starts_at) <= now < _aware(ch.expires_at)):
            continue
        row = db.scalar(select(ChallengeProgress).where(ChallengeProgress.user_id == user.id, ChallengeProgress.challenge_id == ch.id).with_for_update())
        if row is None:
            row = ChallengeProgress(user_id=user.id, challenge_id=ch.id, progress=0, games=[])
            db.add(row)
        if row.completed_at:
            continue
        if ch.metric == "distinct_games":
            games = list(row.games or [])
            if game not in games:
                games.append(game)
            row.games = games; row.progress = len(games)
        elif ch.game in (None, game):
            row.progress = (row.progress or 0) + int(metrics.get(ch.metric, 0))
        if row.progress >= ch.target:
            row.progress = ch.target; row.completed_at = now


def challenges_for(db: Session, user: User | None, now: datetime, tz) -> dict:
    today = periods.local_date(now, tz)
    if not config_store.load_settings(db)["daily_challenges"]:
        start, end = periods.day_bounds(today, tz)
        return {"date": today.isoformat(), "timezone": str(tz), "starts_at": start.isoformat(), "expires_at": end.isoformat(), "items": [], "signed_in": user is not None, "disabled": True}
    chs = ensure_challenges(db, today, tz)
    prog = {}
    if user is not None:
        prog = {r.challenge_id: r for r in db.scalars(select(ChallengeProgress).where(ChallengeProgress.user_id == user.id, ChallengeProgress.challenge_id.in_([c.id for c in chs]))).all()}
    items = []
    for c in chs:
        r = prog.get(c.id)
        items.append({"id": str(c.id), "code": c.code, "title": c.title, "description": c.description, "target": c.target, "reward_points": c.reward_points, "game": c.game,
                      "progress": min(c.target, r.progress) if r else 0, "completed": bool(r and r.completed_at), "claimed": bool(r and r.claimed_at), "claimable": bool(r and r.completed_at and not r.claimed_at)})
    start, end = periods.day_bounds(today, tz)
    return {"date": today.isoformat(), "timezone": str(tz), "starts_at": start.isoformat(), "expires_at": end.isoformat(), "items": items, "signed_in": user is not None}


def claim_challenge(db: Session, user: User, challenge_id: uuid.UUID, now: datetime, tz) -> dict:
    ch = db.get(DailyChallenge, challenge_id)
    if ch is None:
        raise ApiError(404, "challenge_not_found", "This challenge was not found.")
    row = db.scalar(select(ChallengeProgress).where(ChallengeProgress.user_id == user.id, ChallengeProgress.challenge_id == ch.id).with_for_update())
    if row is None or not row.completed_at:
        raise ApiError(409, "challenge_not_completed", "This challenge has not been completed yet.")
    if row.claimed_at:
        raise ApiError(409, "already_claimed", "This reward was already claimed.")
    if now >= _aware(ch.expires_at):
        raise ApiError(409, "challenge_expired", "This challenge has expired.")
    claimed_today = int(db.scalar(select(func.sum(ChallengeProgress.reward_points)).join(DailyChallenge, DailyChallenge.id == ChallengeProgress.challenge_id)
                                  .where(ChallengeProgress.user_id == user.id, ChallengeProgress.claimed_at.is_not(None), DailyChallenge.challenge_date == ch.challenge_date)) or 0)
    reward = max(0, min(ch.reward_points, catalog.CHALLENGE_DAILY_CAP - claimed_today))
    row.claimed_at, row.reward_points = now, reward
    db.flush()
    p = get_profile(db, user)
    _refresh_points(db, p, now)
    new = evaluate_achievements(db, user, p, None, now)
    return {"claimed": True, "reward_points": reward, "verified_points": p.verified_points, "new_achievements": new}


# ================================================================== the player's own view
def profile_out(db: Session, user: User, p: PlayerProfile) -> dict:
    best: dict[str, dict] = {}
    for g in catalog.GAMES:
        rows = db.execute(select(VerifiedScore.level_id, func.max(VerifiedScore.score)).where(VerifiedScore.user_id == user.id, VerifiedScore.game == g, VerifiedScore.status == "accepted").group_by(VerifiedScore.level_id)).all()
        best[g] = {lvl: int(sc) for lvl, sc in rows}
    progress = {g: {"levels_completed": verified_completed(db, user, g), "unlocked": ((db.scalar(select(GameProgress.data).where(GameProgress.user_id == user.id, GameProgress.game == g)) or {}).get("unlocked") or [])} for g in catalog.GAMES}
    return {
        "player_id": str(p.id), "nickname": p.nickname, "avatar": p.avatar, "joined_at": _aware(p.created_at).isoformat() if p.created_at else None, "games_played": p.games_played, "verified_points": p.verified_points,
        "last_played_at": _aware(p.last_played_at).isoformat() if p.last_played_at else None, "preferences": p.preferences or {}, "personal_bests": best, "progress": progress,
        "achievements": achievements_for(db, user), "avatars": list(config_store.load_settings(db)["avatars_enabled"]), "hidden": bool(p.hidden), "suspended": bool(p.suspended),
    }


# ================================================================== public configuration (what the admin panel controls)
def public_config(db: Session, app_settings) -> dict:
    from app.models import MediaAsset
    from app.services import media_service

    s = config_store.load_settings(db)
    games = config_store.all_game_configs(db)
    ids = [uuid.UUID(c[k]) for c in games for k in ("thumbnail_media_id", "banner_media_id") if c.get(k)]
    assets = {a.id: a for a in db.scalars(select(MediaAsset).where(MediaAsset.id.in_(ids)))} if ids else {}

    def url(c, k):
        a = assets.get(uuid.UUID(c[k])) if c.get(k) else None
        return media_service.url_of(app_settings, a) if a is not None else None

    return {
        "enabled": s["enabled"], "maintenance": s["maintenance"], "maintenance_message": s["maintenance_message"], "guest_play": s["guest_play"], "public_leaderboard": s["public_leaderboard"],
        "daily_challenges": s["daily_challenges"], "featured_game": s["featured_game"], "nickname": {"min": s["nickname_min"], "max": s["nickname_max"]}, "avatars": s["avatars_enabled"],
        "games": [{"slug": c["game"], "title": c["title"] or catalog.GAME_TITLES[c["game"]], "short_description": c["short_description"], "instructions": c["instructions"], "enabled": c["enabled"], "published": c["published"],
                   "visibility": c["visibility"], "maintenance": c["maintenance"], "featured": c["featured"] or s["featured_game"] == c["game"], "sort_order": c["sort_order"], "thumbnail_url": url(c, "thumbnail_media_id"),
                   "banner_url": url(c, "banner_media_id"), "disabled_levels": c["disabled_levels"]} for c in games],
    }
