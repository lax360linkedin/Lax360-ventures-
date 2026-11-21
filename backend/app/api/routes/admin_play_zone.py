"""Play Zone administration (Milestone 7), inside the EXISTING admin panel: same admin session, CSRF, roles and audit trail as every other admin module.

Every route needs a signed-in STAFF account that holds the matching Play Zone permission (checked here on the server, not only hidden in the UI): a website customer's session is
never accepted. Writes are rate limited, validated against fixed schemas, run in one transaction with their audit record, and never touch verified score values directly.
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from pydantic import Field
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import permission
from app.api.paging import Paging, day_after, day_start
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.rate_limit import rate_limit
from app.db.session import get_db, get_read_db
from app.models import (AchievementDef, AuditLog, ChallengeProgress, ChallengeTemplate, DailyChallenge, GameConfig, GameConfigVersion, MediaAsset, MediaLink, PlayerAchievement, PlayerProfile, User)
from app.play_zone import admin_service as adm, catalog, config_store, periods, service
from app.schemas.common import ApiModel
from app.services import audit_service, media_service as media

router = APIRouter(prefix="/admin/play-zone", tags=["admin: play zone"])
LIMIT = Depends(rate_limit("pz_admin", "pz_admin_rate_limit_max", "pz_admin_rate_limit_window_seconds"))
R_ANALYTICS, R_GAMES, R_PLAYERS, R_MOD = permission("pz_analytics"), permission("pz_games"), permission("pz_players"), permission("pz_moderation")
W_GAMES, W_PLAYERS, W_MOD = permission("pz_games", write=True), permission("pz_players", write=True), permission("pz_moderation", write=True)
R_ACH, W_ACH, R_CH, W_CH = permission("pz_achievements"), permission("pz_achievements", write=True), permission("pz_challenges"), permission("pz_challenges", write=True)
R_MEDIA, W_MEDIA, R_SET, W_SET, R_AUDIT = permission("pz_media"), permission("pz_media", write=True), permission("pz_settings"), permission("pz_settings", write=True), permission("pz_audit")
AUDIT_PREFIX = "playzone."


def _tz(settings: Settings):
    return periods.zone(settings.app_timezone)


def _diff(before: dict, after: dict, keys=None) -> dict:
    """A short, non-sensitive description of what changed (audit detail)."""
    out = {}
    for k in keys or after:
        if before.get(k) != after.get(k):
            out[k] = f"{str(before.get(k))[:40]} -> {str(after.get(k))[:40]}"
    return out


def _commit(db: Session) -> None:
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise


# ================================================================== overview + analytics
@router.get("/overview", dependencies=[LIMIT])
def overview(range: str = Query("7d", max_length=10), start: date | None = None, end: date | None = None, _: User = Depends(R_ANALYTICS), db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> dict:
    return adm.overview(db, range, start, end, service.utcnow(), _tz(settings))


@router.get("/analytics", dependencies=[LIMIT])
def analytics(range: str = Query("30d", max_length=10), start: date | None = None, end: date | None = None, game: str | None = Query(None, max_length=20), page: int = Query(1, ge=1, le=1000), page_size: int = Query(25, ge=1, le=100),
              _: User = Depends(R_ANALYTICS), db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> dict:
    data = adm.analytics(db, range, start, end, game, service.utcnow(), _tz(settings))
    lo, hi = (page - 1) * page_size, page * page_size
    return {**data, "levels_total": len(data["levels"]), "levels": data["levels"][lo:hi], "page": page, "page_size": page_size, "pages": max(1, -(-len(data["levels"]) // page_size))}


@router.get("/analytics/export", dependencies=[LIMIT])
def analytics_export(report: str = Query(..., max_length=30), range: str = Query("30d", max_length=10), start: date | None = None, end: date | None = None, game: str | None = Query(None, max_length=20),
                     user: User = Depends(R_ANALYTICS), db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> Response:
    data = adm.analytics(db, range, start, end, game, service.utcnow(), _tz(settings))
    body = adm.to_csv(report, data)
    return Response(body, media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="play-zone-{report}.csv"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})


# ================================================================== games
class GamePatch(ApiModel):
    enabled: bool | None = None
    published: bool | None = None
    visibility: str | None = None
    maintenance: bool | None = None
    featured: bool | None = None
    sort_order: int | None = None
    title: str | None = Field(default=None, max_length=60)
    short_description: str | None = Field(default=None, max_length=200)
    instructions: str | None = Field(default=None, max_length=2000)
    thumbnail_media_id: str | None = None
    banner_media_id: str | None = None
    disabled_levels: list[str] | None = Field(default=None, max_length=60)
    params: dict | None = None


def _game_out(db: Session, settings: Settings, c: dict) -> dict:
    ids = [uuid.UUID(c[k]) for k in ("thumbnail_media_id", "banner_media_id") if c.get(k)]
    assets = {a.id: a for a in db.scalars(select(MediaAsset).where(MediaAsset.id.in_(ids)))} if ids else {}
    url = lambda k: media.url_of(settings, assets[uuid.UUID(c[k])]) if c.get(k) and uuid.UUID(c[k]) in assets else None  # noqa: E731
    g = c["game"]
    levels = [] if g == "catch-the-stars" else catalog.level_ids(g)
    return {**c, "default_title": catalog.GAME_TITLES[g], "thumbnail_url": url("thumbnail_media_id"), "banner_url": url("banner_media_id"), "levels": levels,
            "param_schema": {k: {"kind": v[0], "min": v[1] if v[0] in ("int", "float") else None, "max": v[2], "options": list(v[1]) if v[0] == "choice" else None, "default": v[3]} for k, v in config_store.PARAM_SCHEMAS[g].items()}}


@router.get("/games")
def games(_: User = Depends(R_GAMES), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    db.rollback()
    return {"items": [_game_out(db, settings, c) for c in config_store.all_game_configs(db)], "policy": "Switching a game or level off stops NEW sessions at once. A session that already started may still be completed until it expires (up to 3 hours), so a round in progress is not lost. Score verification always uses the built-in limits."}


@router.patch("/games/{game}", dependencies=[LIMIT])
def patch_game(game: str, body: GamePatch, user: User = Depends(W_GAMES), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        raise ApiError(422, "nothing_to_change", "Nothing to change.")
    before, after = config_store.save_game_config(db, game, patch, user.id)
    changed = _diff(before, after)
    action = "playzone.game.enable" if changed.get("enabled", "").endswith("True") else "playzone.game.disable" if "enabled" in changed else "playzone.game.update"
    audit_service.record(db, user, action, resource_type="pz_game", resource_id=game, detail=changed or {"note": "no change"})
    _commit(db)
    return _game_out(db, settings, config_store.game_config(db, game))


@router.get("/games/{game}/versions")
def game_versions(game: str, _: User = Depends(R_GAMES), db: Session = Depends(get_db)) -> dict:
    if game not in catalog.GAMES:
        raise ApiError(404, "game_not_found", "Unknown game.")
    rows = db.scalars(select(GameConfigVersion).where(GameConfigVersion.game == game).order_by(GameConfigVersion.version.desc()).limit(50)).all()
    return {"items": [{"version": r.version, "params": r.params, "at": service._aware(r.created_at).isoformat()} for r in rows]}


# ================================================================== players
class Reason(ApiModel):
    reason: str = Field(min_length=1, max_length=300)


@router.get("/players")
def players(q: str | None = Query(None, max_length=60), status: str | None = Query(None, max_length=10), flagged: bool = False, sort: str = Query("joined", max_length=12), paging: Paging = Depends(),
            _: User = Depends(R_PLAYERS), db: Session = Depends(get_read_db)) -> dict:
    items, total = adm.players_page(db, q=q, status=status, flagged=flagged, page=paging.page, page_size=paging.page_size, sort=sort)
    return paging.envelope(items, total)


@router.get("/players/{player_id}")
def player(player_id: uuid.UUID, _: User = Depends(R_PLAYERS), db: Session = Depends(get_db)) -> dict:
    out = adm.player_detail(db, adm.get_profile_or_404(db, player_id))
    db.rollback()  # reading progress may lazily create an empty row: nothing is kept for a view
    return out


@router.get("/players/{player_id}/scores")
def player_scores(player_id: uuid.UUID, paging: Paging = Depends(), _: User = Depends(R_PLAYERS), db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> dict:
    p = adm.get_profile_or_404(db, player_id)
    items, total = adm.scores_page(db, game=None, status=None, period="all", q=p.nickname_key, level=None, page=paging.page, page_size=paging.page_size, now=service.utcnow(), tz=_tz(settings))
    return paging.envelope([i for i in items if i["player_id"] == str(p.id)], total)


@router.post("/players/{player_id}/suspend", dependencies=[LIMIT])
def suspend(player_id: uuid.UUID, body: Reason, user: User = Depends(W_PLAYERS), db: Session = Depends(get_db)) -> dict:
    p = adm.get_profile_or_404(db, player_id)
    changed = adm.set_suspension(db, user, p, True, body.reason)
    audit_service.record(db, user, "playzone.player.suspend", resource_type="pz_player", resource_id=p.id, detail={"nickname": p.nickname, "reason": adm.clean_reason(body.reason), "changed": changed})
    _commit(db)
    return {"id": str(p.id), "suspended": True, "changed": changed}


@router.post("/players/{player_id}/restore", dependencies=[LIMIT])
def restore(player_id: uuid.UUID, body: Reason, user: User = Depends(W_PLAYERS), db: Session = Depends(get_db)) -> dict:
    p = adm.get_profile_or_404(db, player_id)
    changed = adm.set_suspension(db, user, p, False, body.reason)
    audit_service.record(db, user, "playzone.player.restore", resource_type="pz_player", resource_id=p.id, detail={"nickname": p.nickname, "reason": adm.clean_reason(body.reason), "changed": changed})
    _commit(db)
    return {"id": str(p.id), "suspended": False, "changed": changed}


# ================================================================== leaderboards + score moderation
@router.get("/leaderboards")
def leaderboards(game: str = Query("overall", max_length=20), period: str = Query("weekly", max_length=10), paging: Paging = Depends(), _: User = Depends(R_MOD), db: Session = Depends(get_read_db),
                 settings: Settings = Depends(get_settings)) -> dict:
    if game != "overall" and game not in catalog.GAMES:
        raise ApiError(422, "invalid_game", "Unknown game.", fields={"game": "Unknown game."})
    if period not in periods.PERIODS:
        raise ApiError(422, "invalid_period", "Use daily, weekly or all.", fields={"period": "Unsupported."})
    data = service.ranking(db, game, period, service.utcnow(), _tz(settings))  # the SAME ranking the public sees (flagged, invalidated and suspended entries are already excluded)
    start = (paging.page - 1) * paging.page_size
    ids = [r["user_id"] for r in data[start:start + paging.page_size]]
    profiles = {p.user_id: p for p in db.scalars(select(PlayerProfile).where(PlayerProfile.user_id.in_(ids)))} if ids else {}
    items = [{**{k: v for k, v in r.items() if k != "user_id"}, "player_id": str(profiles[r["user_id"]].id) if r["user_id"] in profiles else None} for r in data[start:start + paging.page_size]]
    return paging.envelope(items, len(data))


@router.get("/scores")
def scores(game: str | None = Query(None, max_length=20), status: str | None = Query(None, max_length=10), period: str = Query("all", max_length=10), q: str | None = Query(None, max_length=40), level: str | None = Query(None, max_length=40),
           paging: Paging = Depends(), _: User = Depends(R_MOD), db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> dict:
    items, total = adm.scores_page(db, game=game, status=status, period=period, q=q, level=level, page=paging.page, page_size=paging.page_size, now=service.utcnow(), tz=_tz(settings))
    return paging.envelope(items, total)


@router.get("/scores/{score_id}")
def score(score_id: uuid.UUID, _: User = Depends(R_MOD), db: Session = Depends(get_read_db)) -> dict:
    return adm.score_detail(db, score_id)


def _moderate(action: str, score_id: uuid.UUID, body: Reason, user: User, db: Session) -> dict:
    sc = adm.moderate_score(db, user, score_id, action, body.reason, service.utcnow())
    audit_service.record(db, user, f"playzone.score.{action}", resource_type="pz_score", resource_id=sc.id, detail={"game": sc.game, "level": sc.level_id, "status": sc.status, "reason": adm.clean_reason(body.reason)})
    _commit(db)
    return {"id": str(sc.id), "status": sc.status}


@router.post("/scores/{score_id}/invalidate", dependencies=[LIMIT])
def invalidate(score_id: uuid.UUID, body: Reason, user: User = Depends(W_MOD), db: Session = Depends(get_db)) -> dict:
    return _moderate("invalidate", score_id, body, user, db)


@router.post("/scores/{score_id}/restore", dependencies=[LIMIT])
def restore_score(score_id: uuid.UUID, body: Reason, user: User = Depends(W_MOD), db: Session = Depends(get_db)) -> dict:
    return _moderate("restore", score_id, body, user, db)


@router.post("/scores/{score_id}/approve", dependencies=[LIMIT])
def approve(score_id: uuid.UUID, body: Reason, user: User = Depends(W_MOD), db: Session = Depends(get_db)) -> dict:
    return _moderate("approve", score_id, body, user, db)


# ================================================================== achievements
class AchievementIn(ApiModel):
    code: str | None = Field(default=None, min_length=3, max_length=40, pattern=r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    title: str = Field(min_length=2, max_length=60)
    description: str = Field(min_length=2, max_length=200)
    game: str | None = Field(default=None, max_length=20)
    icon: str = Field(default="trophy", max_length=30, pattern=r"^[a-z0-9-]+$")
    icon_media_id: str | None = None
    rule_type: str = Field(max_length=30)
    rule_params: dict
    reward_points: int = Field(default=0, ge=0, le=500)
    active: bool = True
    sort_order: int = Field(default=100, ge=0, le=999)


class AchievementPatch(ApiModel):
    title: str | None = Field(default=None, min_length=2, max_length=60)
    description: str | None = Field(default=None, min_length=2, max_length=200)
    game: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=30, pattern=r"^[a-z0-9-]+$")
    icon_media_id: str | None = None
    rule_type: str | None = Field(default=None, max_length=30)
    rule_params: dict | None = None
    reward_points: int | None = Field(default=None, ge=0, le=500)
    active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0, le=999)


def _media_id(db: Session, raw, field: str):
    if raw in (None, ""):
        return None
    try:
        mid = uuid.UUID(str(raw))
    except ValueError:
        raise ApiError(422, "invalid_media", "Choose a file from the Play Zone media.", fields={field: "Invalid file."}) from None
    a = db.get(MediaAsset, mid)
    if a is None or a.kind != "image":
        raise ApiError(422, "invalid_media", "Choose an image from the Play Zone media.", fields={field: "Choose an image."})
    return mid


def _ach_out(d: AchievementDef, earned: int, db: Session, settings: Settings) -> dict:
    icon_url = None
    if d.icon_media_id:
        a = db.get(MediaAsset, d.icon_media_id)
        icon_url = media.url_of(settings, a) if a else None
    return {"code": d.code, "title": d.title, "description": d.description, "game": d.game, "icon": d.icon, "icon_url": icon_url, "icon_media_id": str(d.icon_media_id) if d.icon_media_id else None, "rule_type": d.rule_type,
            "rule_params": d.rule_params or {}, "reward_points": d.reward_points, "active": d.active, "sort_order": d.sort_order, "earned_count": earned, "built_in": d.rule_type is None}


@router.get("/achievements")
def achievements(_: User = Depends(R_ACH), db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> dict:
    counts = dict(db.execute(select(PlayerAchievement.code, func.count()).group_by(PlayerAchievement.code)).all())
    defs = db.scalars(select(AchievementDef).order_by(AchievementDef.sort_order, AchievementDef.code)).all()
    return {"items": [_ach_out(d, int(counts.get(d.code, 0)), db, settings) for d in defs], "rule_types": {k: {"label": v["label"], "params": {p: ("game" if r == "game" else "level_game" if r == "level_game" else list(r) if isinstance(r[0], str) else {"min": r[0], "max": r[1]}) for p, r in v["params"].items()}} for k, v in service.RULE_TYPES.items()},
            "games": list(catalog.GAMES), "level_games": list(config_store.LEVEL_GAMES)}


def _check_game(game):
    if game is not None and game not in catalog.GAMES:
        raise ApiError(422, "invalid_game", "Unknown game.", fields={"game": "Unknown game."})


@router.post("/achievements", status_code=201, dependencies=[LIMIT])
def create_achievement(body: AchievementIn, user: User = Depends(W_ACH), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    _check_game(body.game)
    rule = service.clean_rule(body.rule_type, body.rule_params)
    code = body.code or "-".join("".join(ch for ch in body.title.lower() if ch.isalnum() or ch == " ").split())[:40]
    if len(code) < 3 or db.get(AchievementDef, code) is not None:
        raise ApiError(409, "code_taken", "An achievement with this name already exists. Choose a different name or code.", fields={"title": "Already used."})
    d = AchievementDef(code=code, title=" ".join(body.title.split()), description=" ".join(body.description.split()), game=body.game, icon=body.icon, icon_media_id=_media_id(db, body.icon_media_id, "icon_media_id"),
                       rule_type=body.rule_type, rule_params=rule, reward_points=body.reward_points, active=body.active, sort_order=body.sort_order)
    db.add(d)
    audit_service.record(db, user, "playzone.achievement.create", resource_type="pz_achievement", resource_id=code, detail={"title": d.title, "rule": d.rule_type, "reward": d.reward_points})
    _commit(db)
    service.drop_ranking_cache()
    return _ach_out(d, 0, db, settings)


@router.patch("/achievements/{code}", dependencies=[LIMIT])
def patch_achievement(code: str, body: AchievementPatch, user: User = Depends(W_ACH), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    d = db.get(AchievementDef, code)
    if d is None:
        raise ApiError(404, "achievement_not_found", "Achievement not found.")
    patch = body.model_dump(exclude_unset=True)
    before = {"title": d.title, "description": d.description, "game": d.game, "icon": d.icon, "rule_type": d.rule_type, "reward_points": d.reward_points, "active": d.active, "sort_order": d.sort_order, "rule_params": d.rule_params}
    if d.rule_type is None and ({"rule_type", "rule_params"} & set(patch)):
        raise ApiError(422, "built_in_rule", "The condition of a built-in achievement is fixed. You can change its text, icon, points and visibility.")
    if "game" in patch:
        _check_game(patch["game"])
    if "icon_media_id" in patch:
        d.icon_media_id = _media_id(db, patch.pop("icon_media_id"), "icon_media_id")
    if d.rule_type is not None and ("rule_type" in patch or "rule_params" in patch):
        rt = patch.get("rule_type", d.rule_type)
        patch["rule_params"] = service.clean_rule(rt, patch.get("rule_params", d.rule_params if rt == d.rule_type else {}))
        patch["rule_type"] = rt
    for k, v in patch.items():
        setattr(d, k, " ".join(v.split()) if k in ("title", "description") and isinstance(v, str) else v)
    after = {k: getattr(d, k) for k in before}
    changed = _diff(before, after)
    audit_service.record(db, user, "playzone.achievement.update", resource_type="pz_achievement", resource_id=code, detail=changed or {"note": "no change"})
    _commit(db)
    counts = db.scalar(select(func.count()).select_from(PlayerAchievement).where(PlayerAchievement.code == code)) or 0
    return _ach_out(d, int(counts), db, settings)


@router.get("/achievements/{code}/eligible")
def eligible(code: str, _: User = Depends(R_ACH), db: Session = Depends(get_db)) -> dict:
    """Players who already meet the condition but have not been awarded yet (they receive it with their next verified result). Bounded: the 300 most recently active players are checked."""
    d = db.get(AchievementDef, code)
    if d is None:
        raise ApiError(404, "achievement_not_found", "Achievement not found.")
    have = set(db.scalars(select(PlayerAchievement.user_id).where(PlayerAchievement.code == code)))
    candidates = db.scalars(select(PlayerProfile).where(PlayerProfile.suspended.is_(False)).order_by(PlayerProfile.last_played_at.desc().nullslast()).limit(300)).all()
    out = []
    for p in candidates:
        if p.user_id in have:
            continue
        user = db.get(User, p.user_id)
        ok = service.rule_met(db, p.user_id, p, d.rule_type, d.rule_params or {}) if d.rule_type else service.achievement_conditions(db, user, p).get(code, False)
        if ok:
            out.append({"id": str(p.id), "nickname": p.nickname, "avatar": p.avatar, "verified_points": p.verified_points})
        if len(out) >= 50:
            break
    db.rollback()
    return {"items": out, "checked": len(candidates), "note": "Checked among the 300 most recently active players."}


# ================================================================== daily challenges
class ChallengeIn(ApiModel):
    code: str | None = Field(default=None, min_length=3, max_length=40, pattern=r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    title: str = Field(min_length=3, max_length=80)
    description: str = Field(min_length=3, max_length=200)
    metric: str = Field(max_length=30)
    game: str | None = Field(default=None, max_length=20)
    target: int | None = Field(default=None, ge=1, le=500)
    targets: list[int] | None = Field(default=None, max_length=7, min_length=7)
    reward_points: int = Field(default=20, ge=0, le=100)
    active: bool = True
    starts_on: date | None = None
    ends_on: date | None = None
    artwork_media_id: str | None = None
    sort_order: int = Field(default=100, ge=0, le=999)


class ChallengePatch(ApiModel):
    title: str | None = Field(default=None, min_length=3, max_length=80)
    description: str | None = Field(default=None, min_length=3, max_length=200)
    metric: str | None = Field(default=None, max_length=30)
    game: str | None = Field(default=None, max_length=20)
    target: int | None = Field(default=None, ge=1, le=500)
    targets: list[int] | None = Field(default=None, max_length=7, min_length=7)
    reward_points: int | None = Field(default=None, ge=0, le=100)
    active: bool | None = None
    starts_on: date | None = None
    ends_on: date | None = None
    clear_schedule: bool = False
    artwork_media_id: str | None = None
    sort_order: int | None = Field(default=None, ge=0, le=999)


METRICS = {"stars_collected": "catch-the-stars", "platform_levels": "laxbot-jump", "puzzle_levels": "puzzle-pop", "bugs_captured": "bug-hunter", "distinct_games": None}


def _clean_challenge(metric: str, game, targets, target, title: str):
    if metric not in METRICS:
        raise ApiError(422, "invalid_metric", "Choose one of the supported objectives.", fields={"metric": "Unsupported objective."})
    if METRICS[metric] != game and not (metric == "distinct_games" and game is None):
        raise ApiError(422, "invalid_game", "This objective belongs to " + (catalog.GAME_TITLES[METRICS[metric]] if METRICS[metric] else "no single game") + ".", fields={"game": "Does not match the objective."})
    t = targets or ([target] * 7 if target else None)
    if not t or any(not 1 <= int(x) <= (4 if metric == "distinct_games" else 500) for x in t):
        raise ApiError(422, "invalid_target", "Set a target (1 to 500; at most 4 different games).", fields={"target": "Invalid target."})
    try:
        title.format(n=1, s="")
    except (KeyError, IndexError, ValueError):
        raise ApiError(422, "invalid_title", "Use only {n} (the target) and {s} in the title.", fields={"title": "Use only {n} and {s}."}) from None
    return [int(x) for x in t]


def _chal_out(t: ChallengeTemplate, db: Session, settings: Settings, stats: dict | None = None) -> dict:
    art = None
    if t.artwork_media_id:
        a = db.get(MediaAsset, t.artwork_media_id)
        art = media.url_of(settings, a) if a else None
    return {"id": str(t.id), "code": t.code, "title": t.title, "description": t.description, "metric": t.metric, "game": t.game, "targets": list(t.targets or []), "reward_points": t.reward_points, "active": t.active,
            "starts_on": t.starts_on.isoformat() if t.starts_on else None, "ends_on": t.ends_on.isoformat() if t.ends_on else None, "artwork_url": art, "artwork_media_id": str(t.artwork_media_id) if t.artwork_media_id else None,
            "sort_order": t.sort_order, "stats": stats or {}}


@router.get("/challenges")
def challenges(_: User = Depends(R_CH), db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> dict:
    tz = _tz(settings)
    today = periods.local_date(service.utcnow(), tz)
    first = today - timedelta(days=29)
    rows = db.execute(select(DailyChallenge.code, func.count(ChallengeProgress.user_id), func.count(ChallengeProgress.completed_at), func.count(ChallengeProgress.claimed_at))
                      .join(ChallengeProgress, ChallengeProgress.challenge_id == DailyChallenge.id, isouter=True).where(DailyChallenge.challenge_date >= first).group_by(DailyChallenge.code)).all()
    stats = {c: {"participants": int(p), "completed": int(d), "claimed": int(cl), "completion_rate": round(d / p, 3) if p else None} for c, p, d, cl in rows}
    items = db.scalars(select(ChallengeTemplate).order_by(ChallengeTemplate.sort_order, ChallengeTemplate.code)).all()
    return {"items": [_chal_out(t, db, settings, stats.get(t.code)) for t in items], "metrics": {k: {"game": v, "label": k.replace("_", " ")} for k, v in METRICS.items()}, "timezone": str(tz), "today": today.isoformat(),
            "window": "last 30 days", "supported": "Daily challenges. Weekly challenges are not supported by the current backend.",
            "policy": "A template creates that day's challenge the first time the day is requested. Edits apply to days that have not been generated yet; challenges that already exist keep their target and reward."}


@router.post("/challenges", status_code=201, dependencies=[LIMIT])
def create_challenge(body: ChallengeIn, user: User = Depends(W_CH), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    targets = _clean_challenge(body.metric, body.game, body.targets, body.target, body.title)
    if body.starts_on and body.ends_on and body.starts_on > body.ends_on:
        raise ApiError(422, "invalid_schedule", "The start date must not be after the end date.", fields={"starts_on": "After the end date."})
    code = body.code or "-".join("".join(ch for ch in body.title.lower() if ch.isalnum() or ch == " ").replace("{n}", "").split())[:40]
    if len(code) < 3 or db.scalar(select(ChallengeTemplate.id).where(ChallengeTemplate.code == code)):
        raise ApiError(409, "code_taken", "A challenge with this name already exists. Choose a different name or code.", fields={"title": "Already used."})
    t = ChallengeTemplate(code=code, title=" ".join(body.title.split()), description=" ".join(body.description.split()), metric=body.metric, game=body.game, targets=targets, reward_points=body.reward_points,
                          active=body.active, starts_on=body.starts_on, ends_on=body.ends_on, artwork_media_id=_media_id(db, body.artwork_media_id, "artwork_media_id"), sort_order=body.sort_order)
    db.add(t)
    audit_service.record(db, user, "playzone.challenge.create", resource_type="pz_challenge", resource_id=code, detail={"title": t.title, "metric": t.metric, "reward": t.reward_points, "active": t.active})
    _commit(db)
    return _chal_out(t, db, settings)


@router.patch("/challenges/{challenge_id}", dependencies=[LIMIT])
def patch_challenge(challenge_id: uuid.UUID, body: ChallengePatch, user: User = Depends(W_CH), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    t = db.get(ChallengeTemplate, challenge_id)
    if t is None:
        raise ApiError(404, "challenge_not_found", "Challenge not found.")
    patch = body.model_dump(exclude_unset=True)
    before = {"title": t.title, "metric": t.metric, "game": t.game, "targets": list(t.targets or []), "reward_points": t.reward_points, "active": t.active, "starts_on": t.starts_on, "ends_on": t.ends_on}
    metric, game = patch.get("metric", t.metric), patch.get("game", t.game) if "game" in patch else t.game
    if "metric" in patch and "game" not in patch:
        game = METRICS.get(metric)
    targets = _clean_challenge(metric, game, patch.get("targets"), patch.get("target"), patch.get("title", t.title)) if {"metric", "game", "target", "targets", "title"} & set(patch) else list(t.targets or [])
    t.metric, t.game, t.targets = metric, game, targets
    for k in ("title", "description"):
        if k in patch:
            setattr(t, k, " ".join(patch[k].split()))
    for k in ("reward_points", "active", "sort_order"):
        if k in patch and patch[k] is not None:
            setattr(t, k, patch[k])
    if patch.get("clear_schedule"):
        t.starts_on = t.ends_on = None
    else:
        for k in ("starts_on", "ends_on"):
            if k in patch:
                setattr(t, k, patch[k])
    if t.starts_on and t.ends_on and t.starts_on > t.ends_on:
        raise ApiError(422, "invalid_schedule", "The start date must not be after the end date.", fields={"starts_on": "After the end date."})
    if "artwork_media_id" in patch:
        t.artwork_media_id = _media_id(db, patch["artwork_media_id"], "artwork_media_id")
    after = {"title": t.title, "metric": t.metric, "game": t.game, "targets": list(t.targets or []), "reward_points": t.reward_points, "active": t.active, "starts_on": t.starts_on, "ends_on": t.ends_on}
    audit_service.record(db, user, "playzone.challenge.update", resource_type="pz_challenge", resource_id=t.code, detail=_diff(before, after) or {"note": "no change"})
    _commit(db)
    return _chal_out(t, db, settings)


# ================================================================== media
PURPOSES = ("game_thumbnail", "game_banner", "world_preview", "achievement_icon", "challenge_art", "promo")
MAX_MEDIA_BYTES = 5 * 1024 * 1024


def _link_out(db: Session, settings: Settings, link: MediaLink, a: MediaAsset, uses: list[str] | None = None) -> dict:
    return {"id": str(a.id), "purpose": link.purpose, "game": link.game, "label": link.label, "filename": a.filename, "content_type": a.content_type, "size_bytes": a.size_bytes, "url": media.url_of(settings, a),
            "created_at": service._aware(a.created_at).isoformat(), "updated_at": service._aware(a.updated_at).isoformat() if a.updated_at else None, "used_by": uses or []}


def _uses(db: Session, ids: list[uuid.UUID]) -> dict[uuid.UUID, list[str]]:
    out: dict[uuid.UUID, list[str]] = {i: [] for i in ids}
    if not ids:
        return out
    for g in db.scalars(select(GameConfig).where(or_(GameConfig.thumbnail_media_id.in_(ids), GameConfig.banner_media_id.in_(ids)))):
        for mid in (g.thumbnail_media_id, g.banner_media_id):
            if mid in out:
                out[mid].append(f"Game: {catalog.GAME_TITLES.get(g.game, g.game)}")
    for d in db.scalars(select(AchievementDef).where(AchievementDef.icon_media_id.in_(ids))):
        out[d.icon_media_id].append(f"Achievement: {d.title}")
    for t in db.scalars(select(ChallengeTemplate).where(ChallengeTemplate.artwork_media_id.in_(ids))):
        out[t.artwork_media_id].append(f"Challenge: {t.title}")
    for mid, refs in media.references(db, ids).items():
        out[mid].extend(f"Website: {r.get('title') or r.get('key') or r.get('kind')}" for r in refs)
    return out


@router.get("/media")
def media_list(purpose: str | None = Query(None, max_length=20), game: str | None = Query(None, max_length=20), paging: Paging = Depends(), _: User = Depends(R_MEDIA), db: Session = Depends(get_read_db),
               settings: Settings = Depends(get_settings)) -> dict:
    stmt = select(MediaLink, MediaAsset).join(MediaAsset, MediaAsset.id == MediaLink.media_id)
    if purpose:
        stmt = stmt.where(MediaLink.purpose == purpose)
    if game:
        stmt = stmt.where(MediaLink.game == game)
    total = int(db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    rows = db.execute(stmt.order_by(MediaLink.created_at.desc()).limit(paging.page_size).offset((paging.page - 1) * paging.page_size)).all()
    uses = _uses(db, [a.id for _, a in rows])
    return {**paging.envelope([_link_out(db, settings, link, a, uses[a.id]) for link, a in rows], total), "purposes": list(PURPOSES), "max_bytes": MAX_MEDIA_BYTES}


@router.post("/media", status_code=201, dependencies=[LIMIT])
async def media_upload(request: Request, filename: str = Query(..., min_length=1, max_length=200), purpose: str = Query(..., max_length=20), game: str | None = Query(None, max_length=20), label: str | None = Query(None, max_length=100),
                       user: User = Depends(W_MEDIA), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    if purpose not in PURPOSES:
        raise ApiError(422, "invalid_purpose", "Choose what this image is for.", fields={"purpose": "Unsupported."})
    _check_game(game)
    prep = await media.receive(request, settings, filename)  # type, real content and size are validated here (the same checks as the media library)
    try:
        if prep.kind != "image":
            raise ApiError(415, "image_only", "Play Zone media must be an image (PNG, JPEG, WebP or GIF).")
        if prep.size > MAX_MEDIA_BYTES:
            raise ApiError(413, "too_large", "Images for the Play Zone can be at most 5 MB.")
        asset, duplicate = media.create(db, settings, user, prep, label, True)  # public: shown on the public Play Zone pages, from durable storage
        if not asset.is_public:
            asset.is_public = True
        link = db.scalar(select(MediaLink).where(MediaLink.media_id == asset.id))
        if link is None:
            link = MediaLink(media_id=asset.id, purpose=purpose, game=game, label=(label or asset.filename)[:100], created_by=user.id)
            db.add(link)
        audit_service.record(db, user, "playzone.media.upload", resource_type="pz_media", resource_id=asset.id, detail={"file": asset.filename, "purpose": purpose, "duplicate": duplicate})
        db.commit()
    except BaseException:
        db.rollback()
        prep.tmp.unlink(missing_ok=True)
        raise
    db.refresh(asset)
    return {**_link_out(db, settings, link, asset), "duplicate": duplicate}


@router.put("/media/{media_id}/file", dependencies=[LIMIT])
async def media_replace(media_id: uuid.UUID, request: Request, user: User = Depends(W_MEDIA), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """Swap the picture behind an item. The item keeps its id, so every game, achievement and challenge that uses it shows the new picture; the previous file is kept as a private library item."""
    link = db.scalar(select(MediaLink).where(MediaLink.media_id == media_id))
    if link is None:
        raise ApiError(404, "media_not_found", "This is not Play Zone media.")
    asset = media.get(db, media_id)
    prep = await media.receive(request, settings, asset.filename)
    try:
        if prep.kind != "image":
            raise ApiError(415, "image_only", "Play Zone media must be an image (PNG, JPEG, WebP or GIF).")
        if prep.size > MAX_MEDIA_BYTES:
            raise ApiError(413, "too_large", "Images for the Play Zone can be at most 5 MB.")
        archive, _ = media.replace(db, settings, user, asset, prep, delete_previous=False)
        audit_service.record(db, user, "playzone.media.replace", resource_type="pz_media", resource_id=asset.id, detail={"file": asset.filename, "purpose": link.purpose, "previous_kept": archive is not None})
        db.commit()
    except BaseException:
        db.rollback()
        prep.tmp.unlink(missing_ok=True)
        raise
    db.refresh(asset)
    return _link_out(db, settings, link, asset)


@router.patch("/media/{media_id}", dependencies=[LIMIT])
def media_edit(media_id: uuid.UUID, body: dict, user: User = Depends(W_MEDIA), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    link = db.scalar(select(MediaLink).where(MediaLink.media_id == media_id))
    if link is None:
        raise ApiError(404, "media_not_found", "This is not Play Zone media.")
    if "label" in body and isinstance(body["label"], str):
        link.label = " ".join(body["label"].split())[:100]
    if body.get("purpose") in PURPOSES:
        link.purpose = body["purpose"]
    _commit(db)
    return _link_out(db, settings, link, media.get(db, media_id))


@router.delete("/media/{media_id}", dependencies=[LIMIT])
def media_delete(media_id: uuid.UUID, user: User = Depends(W_MEDIA), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """Remove an item that nothing uses. An item that is still shown by a game, achievement, challenge or website page cannot be deleted (replace it instead)."""
    link = db.scalar(select(MediaLink).where(MediaLink.media_id == media_id))
    if link is None:
        raise ApiError(404, "media_not_found", "This is not Play Zone media.")
    uses = _uses(db, [media_id])[media_id]
    if uses:
        raise ApiError(409, "media_in_use", "This image is still in use: " + ", ".join(uses[:5]) + ". Replace the picture or remove it from there first.", details={"used_by": uses})
    asset = media.get(db, media_id)
    stale = media.stale_object(asset)
    audit_service.record(db, user, "playzone.media.delete", resource_type="pz_media", resource_id=media_id, detail={"file": asset.filename, "purpose": link.purpose})
    db.delete(link)
    db.delete(asset)
    _commit(db)
    media.remove_stale(settings, stale)  # only after the commit
    return {"deleted": True}


# ================================================================== settings
class SettingsPatch(ApiModel):
    values: dict
    confirm: bool = False  # required for disruptive changes (closing the Play Zone, maintenance mode, ...)


DISRUPTIVE = ("enabled", "maintenance", "guest_play", "public_leaderboard", "daily_challenges")


@router.get("/settings")
def get_settings_(_: User = Depends(R_SET), db: Session = Depends(get_db)) -> dict:
    db.rollback()
    config_store.drop_cache()
    return {"values": config_store.load_settings(db), "defaults": config_store.SETTING_DEFAULTS, "games": list(catalog.GAMES), "avatars": list(catalog.AVATARS), "graphics": list(config_store.GRAPHICS),
            "disruptive": list(DISRUPTIVE), "note": "These settings can switch features on or off. None of them changes sign-in rules or how scores are verified."}


@router.patch("/settings", dependencies=[LIMIT])
def patch_settings(body: SettingsPatch, user: User = Depends(W_SET), db: Session = Depends(get_db)) -> dict:
    if not body.values:
        raise ApiError(422, "nothing_to_change", "Nothing to change.")
    current = config_store.load_settings(db)
    risky = [k for k, v in body.values.items() if k in DISRUPTIVE and current.get(k) != v and ((k in ("enabled", "guest_play", "public_leaderboard", "daily_challenges") and v is False) or (k == "maintenance" and v is True))]
    if risky and not body.confirm:
        raise ApiError(409, "confirmation_required", "This change affects players right away. Please confirm it.", details={"keys": risky})
    changed = config_store.update_settings(db, body.values, user.id)
    if changed:
        audit_service.record(db, user, "playzone.settings.update", resource_type="pz_settings", detail={k: f"{str(a)[:40]} -> {str(b)[:40]}" for k, (a, b) in changed.items()})
    _commit(db)
    return {"values": config_store.load_settings(db), "changed": list(changed)}


# ================================================================== audit logs
@router.get("/audit-logs")
def audit_logs(action: str | None = Query(None, max_length=60), admin: str | None = Query(None, max_length=120), date_from: date | None = None, date_to: date | None = None, paging: Paging = Depends(),
               _: User = Depends(R_AUDIT), db: Session = Depends(get_read_db)) -> dict:
    stmt = select(AuditLog).where(AuditLog.action.like(f"{AUDIT_PREFIX}%"))
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if admin:
        stmt = stmt.where(AuditLog.admin_email.like(f"%{admin.strip().lower()[:80]}%"))
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= day_start(date_from))
    if date_to:
        stmt = stmt.where(AuditLog.created_at < day_after(date_to))
    total = int(db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    rows = db.scalars(stmt.order_by(AuditLog.created_at.desc()).limit(paging.page_size).offset((paging.page - 1) * paging.page_size)).all()
    items = [{"id": str(r.id), "admin": r.admin_email, "action": r.action, "resource_type": r.resource_type, "resource_id": r.resource_id, "status": r.status, "detail": r.detail, "at": service._aware(r.created_at).isoformat()} for r in rows]
    actions = [a for (a,) in db.execute(select(AuditLog.action).where(AuditLog.action.like(f"{AUDIT_PREFIX}%")).distinct().order_by(AuditLog.action))]
    return {**paging.envelope(items, total), "actions": actions}
