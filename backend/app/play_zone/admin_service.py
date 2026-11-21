"""Play Zone administration logic: dashboard and analytics (real data only), the player directory, score moderation, and CSV export.

Every number here is computed from the Play Zone tables; nothing is estimated or invented. A metric that the stored data cannot support is simply not offered (see
PLAY_ZONE_BACKEND.md, "Metric definitions"). Dates are bucketed by LOCAL day in APP_TIMEZONE, the same policy as the leaderboards.
"""

from __future__ import annotations

import csv
import io
import time
import uuid
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import (AchievementDef, ChallengeProgress, DailyChallenge, GameConfig, GameSession, ModerationEvent, PlayerAchievement, PlayerProfile, User, VerifiedScore)
from app.play_zone import catalog, config_store, periods, service

MAX_RANGE_DAYS = 366
ROW_CAP = 200_000  # a report never scans more than this many rows; it says so when it is cut
_cache: dict[tuple, tuple[float, dict]] = {}
CACHE_SECONDS = 30.0


# ---------------------------------------------------------------------------- date ranges
def resolve_range(preset: str, start: date | None, end: date | None, now: datetime, tz) -> tuple[date, date, datetime, datetime]:
    """(first local day, last local day, UTC start, UTC end-exclusive) for today / 7d / 30d / custom."""
    today = periods.local_date(now, tz)
    if preset == "today":
        first, last = today, today
    elif preset == "7d":
        first, last = today - timedelta(days=6), today
    elif preset == "30d":
        first, last = today - timedelta(days=29), today
    elif preset == "custom":
        if start is None or end is None:
            raise ApiError(422, "invalid_range", "Choose a start and an end date.", fields={"start": "Required."})
        first, last = start, end
        if first > last:
            raise ApiError(422, "invalid_range", "The start date must not be after the end date.", fields={"start": "After the end date."})
        if (last - first).days >= MAX_RANGE_DAYS:
            raise ApiError(422, "invalid_range", f"Choose a range of at most {MAX_RANGE_DAYS} days.", fields={"end": "Range too long."})
    else:
        raise ApiError(422, "invalid_range", "Use today, 7d, 30d or custom.", fields={"range": "Unsupported range."})
    return first, last, periods.day_bounds(first, tz)[0], periods.day_bounds(last, tz)[1]


def _days(first: date, last: date) -> list[date]:
    return [first + timedelta(days=i) for i in range((last - first).days + 1)]


def _local(dt: datetime, tz) -> date:
    return periods.local_date(service._aware(dt), tz)


def _cached(key: tuple, fn):
    hit = _cache.get(key)
    now = time.monotonic()
    if hit and now - hit[0] < CACHE_SECONDS:
        return hit[1]
    value = fn()
    _cache[key] = (now, value)
    if len(_cache) > 200:
        _cache.clear()
    return value


def drop_cache() -> None:
    _cache.clear()


def _col(db: Session, col, *conds, limit: int = ROW_CAP) -> tuple[list, bool]:
    rows = db.execute(select(col).where(*conds).limit(limit + 1)).all()
    return rows[:limit], len(rows) > limit


# ---------------------------------------------------------------------------- overview
def overview(db: Session, preset: str, start: date | None, end: date | None, now: datetime, tz) -> dict:
    first, last, lo, hi = resolve_range(preset, start, end, now, tz)
    return _cached(("overview", id(db.get_bind()), first, last), lambda: _overview(db, first, last, lo, hi, now, tz))


def _count(db: Session, model, *conds) -> int:
    return int(db.scalar(select(func.count()).select_from(model).where(*conds)) or 0)


def _overview(db: Session, first: date, last: date, lo: datetime, hi: datetime, now: datetime, tz) -> dict:
    today = periods.local_date(now, tz)
    today_start = periods.day_bounds(today, tz)[0]
    week_start = periods.day_bounds(periods.week_start_date(today), tz)[0]
    sessions = lambda t: int(db.scalar(select(func.count(func.distinct(GameSession.user_id))).where(GameSession.started_at >= t)) or 0)  # noqa: E731
    by_game = dict(db.execute(select(GameSession.game, func.count()).where(GameSession.status == "completed", GameSession.started_at >= lo, GameSession.started_at < hi).group_by(GameSession.game)).all())
    all_time_by_game = dict(db.execute(select(GameSession.game, func.count()).where(GameSession.status == "completed").group_by(GameSession.game)).all())
    popular = max(all_time_by_game.items(), key=lambda kv: kv[1]) if all_time_by_game else None
    cfg = {c["game"]: c for c in config_store.all_game_configs(db)}
    s = config_store.load_settings(db)
    enabled = [g for g in catalog.GAMES if cfg[g]["enabled"] and cfg[g]["published"]] if s["enabled"] else []
    flagged = _count(db, VerifiedScore, VerifiedScore.status == "flagged")

    created, trunc1 = _col(db, PlayerProfile.created_at, PlayerProfile.created_at >= lo, PlayerProfile.created_at < hi)
    before = _count(db, PlayerProfile, PlayerProfile.created_at < lo)
    started, trunc2 = _col(db, GameSession.started_at, GameSession.started_at >= lo, GameSession.started_at < hi)
    games_rows, trunc3 = _col(db, GameSession.game, GameSession.started_at >= lo, GameSession.started_at < hi)
    scores, trunc4 = _col(db, VerifiedScore.created_at, VerifiedScore.status == "accepted", VerifiedScore.created_at >= lo, VerifiedScore.created_at < hi)
    days = _days(first, last)
    per_new, per_started, per_scores = Counter(_local(r[0], tz) for r in created), Counter(_local(r[0], tz) for r in started), Counter(_local(r[0], tz) for r in scores)
    growth, total = [], before
    for d in days:
        total += per_new.get(d, 0)
        growth.append({"date": d.isoformat(), "new": per_new.get(d, 0), "total": total})
    per_day_game: dict[date, Counter] = defaultdict(Counter)
    for (t,), (g,) in zip(started, games_rows):
        per_day_game[_local(t, tz)][g] += 1

    recent = db.execute(select(GameSession, PlayerProfile.nickname).join(PlayerProfile, PlayerProfile.user_id == GameSession.user_id).where(GameSession.status.in_(("completed", "rejected")))
                        .order_by(GameSession.completed_at.desc().nullslast()).limit(10)).all()
    recent_ach = db.execute(select(PlayerAchievement.earned_at, AchievementDef.title, PlayerProfile.nickname).join(AchievementDef, AchievementDef.code == PlayerAchievement.code)
                            .join(PlayerProfile, PlayerProfile.user_id == PlayerAchievement.user_id).order_by(PlayerAchievement.earned_at.desc()).limit(10)).all()
    alerts = db.execute(select(VerifiedScore, PlayerProfile.nickname).join(PlayerProfile, PlayerProfile.user_id == VerifiedScore.user_id).where(VerifiedScore.status == "flagged")
                        .order_by(VerifiedScore.created_at.desc()).limit(5)).all()
    return {
        "range": {"start": first.isoformat(), "end": last.isoformat(), "timezone": str(tz)},
        "kpis": {
            "total_players": _count(db, PlayerProfile), "active_today": sessions(today_start), "active_week": sessions(week_start),
            "total_games_played": int(db.scalar(select(func.coalesce(func.sum(PlayerProfile.games_played), 0))) or 0),
            "verified_sessions": _count(db, GameSession, GameSession.status == "completed", GameSession.verdict == "accepted"),
            "verified_points": int(db.scalar(select(func.coalesce(func.sum(PlayerProfile.verified_points), 0))) or 0),
            "most_played_game": {"game": popular[0], "title": catalog.GAME_TITLES[popular[0]], "sessions": popular[1]} if popular else None,
            "games_enabled": len(enabled), "games_total": len(catalog.GAMES), "flagged_scores": flagged, "suspended_players": _count(db, PlayerProfile, PlayerProfile.suspended.is_(True)),
            "challenges_completed_today": _count(db, ChallengeProgress, ChallengeProgress.completed_at >= today_start),
        },
        "player_growth": growth,
        "daily_sessions": [{"date": d.isoformat(), "sessions": per_started.get(d, 0), **{g: per_day_game[d].get(g, 0) for g in catalog.GAMES}} for d in days],
        "game_popularity": [{"game": g, "title": catalog.GAME_TITLES[g], "sessions": int(by_game.get(g, 0))} for g in catalog.GAMES],
        "leaderboard_activity": [{"date": d.isoformat(), "scores": per_scores.get(d, 0)} for d in days],
        "recent_activity": [{"nickname": nick, "game": x.game, "level": x.level_id, "status": x.status, "verdict": x.verdict, "at": (x.completed_at or x.started_at).isoformat()} for x, nick in recent],
        "recent_achievements": [{"nickname": nick, "title": title, "at": at.isoformat()} for at, title, nick in recent_ach],
        "moderation_alerts": {"flagged": flagged, "items": [{"score_id": str(sc.id), "nickname": nick, "game": sc.game, "level": sc.level_id, "score": sc.score, "flags": list(sc.flags or []), "at": sc.created_at.isoformat()} for sc, nick in alerts]},
        "truncated": bool(trunc1 or trunc2 or trunc3 or trunc4),
    }


# ---------------------------------------------------------------------------- analytics
REPORTS = ("sessions_by_day", "players_by_day", "sessions_by_game", "levels", "worlds", "achievements", "challenges")


def _world(game: str, level: str) -> str:
    if game == "catch-the-stars":
        return "Catch the Stars"
    data = catalog.puzzle_levels().get(level) if game == "puzzle-pop" else (catalog.jump_info() if game == "laxbot-jump" else catalog.bug_info())["levels"].get(level)
    return f"{catalog.GAME_TITLES[game]} · World {data['world']}" if data else f"{catalog.GAME_TITLES[game]} · {level}"


def analytics(db: Session, preset: str, start: date | None, end: date | None, game: str | None, now: datetime, tz) -> dict:
    if game and game not in catalog.GAMES:
        raise ApiError(422, "invalid_game", "Unknown game.", fields={"game": "Unknown game."})
    first, last, lo, hi = resolve_range(preset, start, end, now, tz)
    return _cached(("analytics", id(db.get_bind()), first, last, game), lambda: _analytics(db, first, last, lo, hi, game, tz))


def _analytics(db: Session, first: date, last: date, lo: datetime, hi: datetime, game: str | None, tz) -> dict:
    conds = [GameSession.started_at >= lo, GameSession.started_at < hi, *([GameSession.game == game] if game else [])]
    rows = db.execute(select(GameSession.user_id, GameSession.started_at, GameSession.game, GameSession.level_id, GameSession.status, GameSession.verdict, GameSession.duration_ms).where(*conds).limit(ROW_CAP + 1)).all()
    truncated = len(rows) > ROW_CAP
    rows = rows[:ROW_CAP]
    created = {uid: c for uid, c in db.execute(select(PlayerProfile.user_id, PlayerProfile.created_at))} if rows else {}
    days = _days(first, last)
    active: dict[date, set] = defaultdict(set)
    weeks: dict[date, set] = defaultdict(set)
    for uid, at, *_ in rows:
        d = _local(at, tz)
        active[d].add(uid)
        weeks[periods.week_start_date(d)].add(uid)
    new_by_day = Counter(_local(c, tz) for c in created.values() if lo <= service._aware(c) < hi)
    per_day = []
    for d in days:
        users = active.get(d, set())
        returning = sum(1 for u in users if u in created and _local(created[u], tz) < d)
        per_day.append({"date": d.isoformat(), "daily_active": len(users), "new_players": new_by_day.get(d, 0), "returning_players": returning, "sessions": sum(1 for r in rows if _local(r[1], tz) == d)})
    by_game = {}
    levels: dict[tuple, dict] = {}
    for uid, at, g, lvl, status, verdict, dur in rows:
        b = by_game.setdefault(g, {"game": g, "title": catalog.GAME_TITLES[g], "sessions": 0, "accepted": 0, "flagged": 0, "rejected": 0, "durations": []})
        b["sessions"] += 1
        if status == "completed":
            b["accepted" if verdict == "accepted" else "flagged"] += 1
            if dur:
                b["durations"].append(dur)
        elif status == "rejected":
            b["rejected"] += 1
        lv = levels.setdefault((g, lvl), {"game": g, "title": catalog.GAME_TITLES[g], "level": lvl, "world": _world(g, lvl), "started": 0, "accepted": 0})
        lv["started"] += 1
        if status == "completed" and verdict == "accepted":
            lv["accepted"] += 1
    sessions_by_game = []
    for g in catalog.GAMES:
        b = by_game.get(g)
        if b is None:
            continue
        d = b.pop("durations")
        sessions_by_game.append({**b, "avg_duration_seconds": round(sum(d) / len(d) / 1000, 1) if d else None, "completion_rate": round(b["accepted"] / b["sessions"], 3) if b["sessions"] else None})
    level_rows = sorted(({**v, "completion_rate": round(v["accepted"] / v["started"], 3) if v["started"] else None} for v in levels.values()), key=lambda r: (-r["started"], r["game"], r["level"]))
    worlds: dict[str, int] = Counter()
    for v in levels.values():
        worlds[v["world"]] += v["started"]
    total_players = max(1, _count(db, PlayerProfile))
    ach_all = dict(db.execute(select(PlayerAchievement.code, func.count()).group_by(PlayerAchievement.code)).all())
    ach_range = dict(db.execute(select(PlayerAchievement.code, func.count()).where(PlayerAchievement.earned_at >= lo, PlayerAchievement.earned_at < hi).group_by(PlayerAchievement.code)).all())
    achievements = [{"code": d.code, "title": d.title, "game": d.game, "earned_total": int(ach_all.get(d.code, 0)), "earned_in_range": int(ach_range.get(d.code, 0)), "unlock_rate": round(ach_all.get(d.code, 0) / total_players, 3)}
                    for d in db.scalars(select(AchievementDef).order_by(AchievementDef.sort_order))]
    chal = db.execute(select(DailyChallenge.code, func.count(ChallengeProgress.user_id), func.count(ChallengeProgress.completed_at), func.count(ChallengeProgress.claimed_at))
                      .join(ChallengeProgress, ChallengeProgress.challenge_id == DailyChallenge.id, isouter=True).where(DailyChallenge.challenge_date >= first, DailyChallenge.challenge_date <= last).group_by(DailyChallenge.code)).all()
    challenges = [{"code": c, "participants": int(p), "completed": int(done), "claimed": int(cl), "completion_rate": round(done / p, 3) if p else None} for c, p, done, cl in chal]
    return {
        "range": {"start": first.isoformat(), "end": last.isoformat(), "timezone": str(tz), "game": game}, "truncated": truncated,
        "weekly_active": [{"week_start": w.isoformat(), "players": len(u)} for w, u in sorted(weeks.items())],
        "by_day": per_day, "sessions_by_game": sessions_by_game, "levels": level_rows, "popular_worlds": [{"world": w, "sessions": n} for w, n in worlds.most_common()],
        "achievements": achievements, "challenges": challenges,
    }


def _safe(v):
    """Spreadsheet formulas are never executed from an export: cells that start with = + - @ are prefixed with an apostrophe."""
    if isinstance(v, str) and v[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + v
    return v


def to_csv(report: str, data: dict) -> str:
    table = {"sessions_by_day": data["by_day"], "players_by_day": data["by_day"], "sessions_by_game": data["sessions_by_game"], "levels": data["levels"], "worlds": data["popular_worlds"],
             "achievements": data["achievements"], "challenges": data["challenges"]}.get(report)
    if table is None:
        raise ApiError(422, "invalid_report", "Unknown report.", fields={"report": "Unknown report."})
    out = io.StringIO()
    if table:
        w = csv.DictWriter(out, fieldnames=list(table[0].keys()), extrasaction="ignore")
        w.writeheader()
        for r in table:
            w.writerow({k: _safe(v) for k, v in r.items()})
    return out.getvalue()


# ---------------------------------------------------------------------------- players
def players_page(db: Session, *, q: str | None, status: str | None, flagged: bool, page: int, page_size: int, sort: str) -> tuple[list[dict], int]:
    stmt = select(PlayerProfile, User.is_active, User.created_at).join(User, User.id == PlayerProfile.user_id)
    if q:
        term = q.strip().lower()[:60]
        like = f"%{term.replace('%', '').replace('_', ' ')}%"
        conds = [PlayerProfile.nickname_key.like(like)]
        try:
            conds.append(PlayerProfile.id == uuid.UUID(term))
        except ValueError:
            pass
        stmt = stmt.where(or_(*conds))
    if status == "suspended":
        stmt = stmt.where(PlayerProfile.suspended.is_(True))
    elif status == "active":
        stmt = stmt.where(PlayerProfile.suspended.is_(False))
    elif status == "hidden":
        stmt = stmt.where(PlayerProfile.hidden.is_(True))
    if flagged:
        stmt = stmt.where(PlayerProfile.user_id.in_(select(VerifiedScore.user_id).where(VerifiedScore.status == "flagged")))
    order = {"points": PlayerProfile.verified_points.desc(), "last_active": PlayerProfile.last_played_at.desc().nullslast(), "joined": PlayerProfile.created_at.desc(), "games": PlayerProfile.games_played.desc()}.get(sort)
    total = int(db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    rows = db.execute(stmt.order_by(order if order is not None else PlayerProfile.created_at.desc(), PlayerProfile.id).limit(page_size).offset((page - 1) * page_size)).all()
    uids = [p.user_id for p, *_ in rows]
    ach = dict(db.execute(select(PlayerAchievement.user_id, func.count()).where(PlayerAchievement.user_id.in_(uids)).group_by(PlayerAchievement.user_id)).all()) if uids else {}
    flags = dict(db.execute(select(VerifiedScore.user_id, func.count()).where(VerifiedScore.user_id.in_(uids), VerifiedScore.status == "flagged").group_by(VerifiedScore.user_id)).all()) if uids else {}
    return [player_row(p, active, joined, int(ach.get(p.user_id, 0)), int(flags.get(p.user_id, 0))) for p, active, joined in rows], total


def player_row(p: PlayerProfile, account_active: bool, joined: datetime, achievements: int, flagged: int) -> dict:
    """What the directory shows. No e-mail, phone or real name: the nickname and Player ID identify a player."""
    return {"id": str(p.id), "nickname": p.nickname, "avatar": p.avatar, "account_active": bool(account_active), "registered_at": service._aware(joined).isoformat() if joined else None,
            "last_active_at": service._aware(p.last_played_at).isoformat() if p.last_played_at else None, "games_played": p.games_played, "verified_points": p.verified_points, "achievements": achievements,
            "flagged_scores": flagged, "suspended": bool(p.suspended), "hidden": bool(p.hidden), "moderation": "suspended" if p.suspended else "hidden" if p.hidden else "flagged" if flagged else "ok"}


def get_profile_or_404(db: Session, profile_id: uuid.UUID) -> PlayerProfile:
    p = db.get(PlayerProfile, profile_id)
    if p is None:
        raise ApiError(404, "player_not_found", "Player not found.")
    return p


def player_detail(db: Session, p: PlayerProfile) -> dict:
    account = db.get(User, p.user_id)
    ach = {a.code: a.earned_at for a in db.scalars(select(PlayerAchievement).where(PlayerAchievement.user_id == p.user_id))}
    defs = service.achievement_defs(db)
    progress = {}
    for g in catalog.GAMES:
        data = service.get_progress_row(db, db.get(User, p.user_id), g).data if account else {}
        progress[g] = {"levels_verified": [k for k, r in (data.get("levels") or {}).items() if r.get("verified")], "levels_completed": [k for k, r in (data.get("levels") or {}).items() if r.get("completed")],
                       "unlocked": data.get("unlocked") or [], "best": data.get("best")}
    flagged = _count(db, VerifiedScore, VerifiedScore.user_id == p.user_id, VerifiedScore.status == "flagged")
    row = player_row(p, bool(account and account.is_active), account.created_at if account else p.created_at, len(ach), flagged)
    events = db.scalars(select(ModerationEvent).where(ModerationEvent.user_id == p.user_id).order_by(ModerationEvent.created_at.desc()).limit(50)).all()
    return {**row, "stats": p.stats or {}, "suspended_at": service._aware(p.suspended_at).isoformat() if p.suspended_at else None, "suspended_reason": p.suspended_reason,
            "achievements_earned": [{"code": d.code, "title": d.title, "at": service._aware(ach[d.code]).isoformat()} for d in defs if d.code in ach], "progress": progress, "moderation_history": [event_out(e) for e in events]}


def event_out(e: ModerationEvent) -> dict:
    return {"id": str(e.id), "target_type": e.target_type, "target_id": str(e.target_id), "action": e.action, "reason": e.reason, "admin": e.admin_email, "detail": e.detail, "at": service._aware(e.created_at).isoformat()}


def clean_reason(reason: str | None) -> str:
    r = " ".join((reason or "").split())
    if len(r) < 5:
        raise ApiError(422, "reason_required", "Please give a short reason (at least 5 characters).", fields={"reason": "A reason is required."})
    return r[:300]


def _event(db: Session, admin: User, target_type: str, target_id: uuid.UUID, user_id: uuid.UUID | None, action: str, reason: str, detail: dict | None = None) -> ModerationEvent:
    e = ModerationEvent(target_type=target_type, target_id=target_id, user_id=user_id, action=action, reason=reason, admin_id=admin.id, admin_email=admin.email, detail=detail)
    db.add(e)
    return e


def set_suspension(db: Session, admin: User, p: PlayerProfile, suspend: bool, reason: str) -> bool:
    """Pause or restore Play Zone participation. The website account is never touched. Returns whether anything changed."""
    reason = clean_reason(reason)
    if bool(p.suspended) == suspend:
        return False
    p.suspended = suspend
    p.suspended_at = service.utcnow() if suspend else None
    p.suspended_reason = reason if suspend else None
    _event(db, admin, "player", p.id, p.user_id, "suspend" if suspend else "unsuspend", reason)
    db.flush()
    service.drop_ranking_cache()
    drop_cache()
    return True


# ---------------------------------------------------------------------------- score moderation
def scores_page(db: Session, *, game: str | None, status: str | None, period: str, q: str | None, level: str | None, page: int, page_size: int, now: datetime, tz) -> tuple[list[dict], int]:
    conds = []
    if game:
        if game not in catalog.GAMES:
            raise ApiError(422, "invalid_game", "Unknown game.", fields={"game": "Unknown game."})
        conds.append(VerifiedScore.game == game)
    if status:
        if status not in ("accepted", "flagged", "hidden"):
            raise ApiError(422, "invalid_status", "Use accepted, flagged or hidden.", fields={"status": "Unsupported."})
        conds.append(VerifiedScore.status == status)
    if level:
        conds.append(VerifiedScore.level_id == level[:40])
    if period != "all":
        if period not in periods.PERIODS:
            raise ApiError(422, "invalid_period", "Use daily, weekly or all.", fields={"period": "Unsupported."})
        lo, hi = periods.period_bounds(period, now, tz)
        conds += [VerifiedScore.created_at >= lo, VerifiedScore.created_at < hi]
    stmt = select(VerifiedScore, PlayerProfile.nickname, PlayerProfile.avatar, PlayerProfile.id).join(PlayerProfile, PlayerProfile.user_id == VerifiedScore.user_id).where(*conds)
    if q:
        stmt = stmt.where(PlayerProfile.nickname_key.like(f"%{q.strip().lower()[:40]}%"))
    total = int(db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    rows = db.execute(stmt.order_by(VerifiedScore.created_at.desc(), VerifiedScore.id).limit(page_size).offset((page - 1) * page_size)).all()
    return [score_row(sc, nick, avatar, pid) for sc, nick, avatar, pid in rows], total


def score_row(sc: VerifiedScore, nick: str, avatar: str, pid) -> dict:
    return {"id": str(sc.id), "player_id": str(pid), "nickname": nick, "avatar": avatar, "game": sc.game, "level": sc.level_id, "score": sc.score, "points": sc.points, "status": sc.status,
            "flags": list(sc.flags or []), "at": service._aware(sc.created_at).isoformat()}


def score_detail(db: Session, score_id: uuid.UUID) -> dict:
    sc = db.get(VerifiedScore, score_id)
    if sc is None:
        raise ApiError(404, "score_not_found", "Score not found.")
    p = db.scalar(select(PlayerProfile).where(PlayerProfile.user_id == sc.user_id))
    s = db.get(GameSession, sc.session_id)
    events = db.scalars(select(ModerationEvent).where(ModerationEvent.target_type == "score", ModerationEvent.target_id == sc.id).order_by(ModerationEvent.created_at.desc())).all()
    details = {k: v for k, v in (sc.details or {}).items() if not k.startswith("_")}
    return {**score_row(sc, p.nickname if p else "—", p.avatar if p else "", p.id if p else ""), "details": details, "verification": {
        "session_id": str(s.id) if s else None, "session_status": s.status if s else None, "verdict": s.verdict if s else None, "reasons": list(s.reasons or []) if s else [],
        "duration_seconds": round((s.duration_ms or 0) / 1000, 1) if s else None, "config_version": (s.config or {}).get("config_version") if s else None, "client_result": s.client_result if s else None},
        "effects_applied": bool((sc.details or {}).get("_fx")), "moderation_history": [event_out(e) for e in events]}


def _apply_effects(db: Session, sc: VerifiedScore, now: datetime) -> None:
    """A flagged score that a moderator approves counts for progress, counters, challenges and achievements exactly as if it had been accepted at once (done once)."""
    details = dict(sc.details or {})
    if details.get("_fx"):
        return
    user = db.get(User, sc.user_id)
    p = service.get_profile(db, user)
    metrics = details.get("_metrics") or {}
    stats = dict(p.stats or {})
    for k, n in metrics.items():
        if k in ("stars_collected", "bugs_captured"):
            stats[k] = stats.get(k, 0) + int(n)
    p.stats = stats
    from app.play_zone import verify

    service._record_progress(db, user, sc.game, verify.Verdict(True, score=sc.score, level_id=sc.level_id, details={k: v for k, v in details.items() if not k.startswith("_")}, metrics=metrics))
    sc_time = service._aware(sc.created_at)
    service._challenge_metrics(db, user, sc.game, metrics, sc_time) if sc_time >= now - timedelta(days=1) else None  # a challenge of a past day cannot be completed retroactively
    details["_fx"] = True
    sc.details = details
    db.flush()


def moderate_score(db: Session, admin: User, score_id: uuid.UUID, action: str, reason: str, now: datetime) -> VerifiedScore:
    """invalidate: accepted/flagged -> hidden (off every board). restore: hidden -> accepted. approve: flagged -> accepted. The score VALUE is never edited."""
    reason = clean_reason(reason)
    sc = db.scalar(select(VerifiedScore).where(VerifiedScore.id == score_id).with_for_update())
    if sc is None:
        raise ApiError(404, "score_not_found", "Score not found.")
    before = sc.status
    if action == "invalidate":
        if sc.status == "hidden":
            raise ApiError(409, "already_invalidated", "This score is already invalidated.")
        sc.status = "hidden"
    elif action in ("restore", "approve"):
        if sc.status == "accepted":
            raise ApiError(409, "already_valid", "This score already counts.")
        if action == "approve" and sc.status != "flagged":
            raise ApiError(409, "not_flagged", "Only a flagged score can be approved.")
        sc.status = "accepted"
    else:
        raise ApiError(422, "invalid_action", "Unsupported action.")
    _event(db, admin, "score", sc.id, sc.user_id, action, reason, {"from": before, "to": sc.status, "game": sc.game, "level": sc.level_id})
    db.flush()
    if sc.status == "accepted":
        _apply_effects(db, sc, now)
    p = db.scalar(select(PlayerProfile).where(PlayerProfile.user_id == sc.user_id))
    if p is not None:
        service._refresh_points(db, p, now)  # rankings recalculate: the cache is dropped and the player's points are rebuilt from the scores that still count
        if sc.status == "accepted":
            service.evaluate_achievements(db, db.get(User, sc.user_id), p, sc.session_id, now)
    drop_cache()
    service.drop_ranking_cache()
    return sc


def count_distinct_active(db: Session, since: datetime) -> int:
    return int(db.scalar(select(func.count(func.distinct(GameSession.user_id))).where(GameSession.started_at >= since)) or 0)
