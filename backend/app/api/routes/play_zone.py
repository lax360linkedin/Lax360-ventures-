"""Play Zone API: player profile, server-issued game sessions, verified score submission, leaderboards, cloud progress, achievements and daily challenges.

Authentication is the EXISTING website login (the public-realm session cookie + CSRF header): there is no Play Zone login, and an admin session is never accepted here.
The player is always read from the server session; no endpoint takes a player id from the browser. Guests (not signed in) can read leaderboards, achievements and challenges."""

from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import csrf_user, current_user, optional_user
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.rate_limit import limiter, rate_limit
from app.db.session import get_db, get_read_db
from app.models import User
from app.play_zone import catalog, config_store, periods, service
from app.schemas.play_zone import ProfilePatch, ProgressMerge, SessionComplete, SessionStart

router = APIRouter(prefix="/play-zone", tags=["play zone"])
START = Depends(rate_limit("pz_start", "pz_start_rate_limit_max", "pz_start_rate_limit_window_seconds"))
COMPLETE = Depends(rate_limit("pz_complete", "pz_complete_rate_limit_max", "pz_complete_rate_limit_window_seconds"))
WRITE = Depends(rate_limit("pz_write", "pz_write_rate_limit_max", "pz_write_rate_limit_window_seconds"))
PUBLIC = Depends(rate_limit("pz_public", "pz_public_rate_limit_max", "pz_public_rate_limit_window_seconds"))
MAX_BODY_RESULT = 24000


def _user_limit(user: User, scope: str, limit: int, window: int, settings: Settings) -> None:
    if not settings.rate_limit_enabled:
        return
    wait = limiter.hit(f"pz-{scope}-user:{user.id}", limit, window)  # per player as well as per address
    if wait is not None:
        raise ApiError(429, "rate_limited", "Too many requests. Please wait a moment and try again.", headers={"Retry-After": str(wait)})


@router.get("/config", dependencies=[PUBLIC])
def public_config(db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> dict:
    """What the public Play Zone pages need to know: global switches and, per game, its availability, title, text and pictures (set in the admin panel). No private data."""
    return service.public_config(db, settings)


@router.get("/profile", dependencies=[PUBLIC])
def get_profile(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    """The signed-in player's own profile (created on first use). Private details stay private: the e-mail and real name are never part of it."""
    p = service.get_profile(db, user)
    out = service.profile_out(db, user, p)
    db.commit()
    return out


@router.patch("/profile", dependencies=[WRITE])
def patch_profile(body: ProfilePatch, user: User = Depends(csrf_user), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    _user_limit(user, "profile", 20, 60, settings)
    p = service.update_profile(db, user, nickname=body.nickname, avatar=body.avatar, preferences=body.preferences)
    out = service.profile_out(db, user, p)
    db.commit()
    service.drop_ranking_cache()  # the nickname and avatar show on the boards
    return out


@router.post("/sessions", status_code=201, dependencies=[START])
def start_session(body: SessionStart, user: User = Depends(csrf_user), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """Issue a game session. The server records the game, level and start time (and, for Puzzle Pop, picks the board seed); the result can only be submitted once, for this run."""
    _user_limit(user, "start", 30, 60, settings)
    s = service.start_session(db, user, body.game, body.level_id, body.request_key)
    out = {"session_id": str(s.id), "game": s.game, "level_id": s.level_id, "expires_at": s.expires_at.isoformat(), "status": s.status, "official": True,
           "unlocked": service.level_unlocked(db, user, s.game, s.level_id), **({"seed": s.config["seed"]} if "seed" in (s.config or {}) else {})}
    db.commit()
    return out


@router.post("/sessions/{session_id}/complete", dependencies=[COMPLETE])
def complete_session(session_id: uuid.UUID, body: SessionComplete, user: User = Depends(csrf_user), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """Submit the result of a run. The server verifies it (see app/play_zone/verify.py) and records the score it computed itself. Repeating the request returns the same outcome."""
    _user_limit(user, "complete", 30, 60, settings)
    if len(json.dumps(body.result, separators=(",", ":"), default=str)) > MAX_BODY_RESULT:
        raise ApiError(413, "result_too_large", "That result is too large.")
    try:
        out = service.complete_session(db, user, session_id, body.result)
        db.commit()
    except Exception:
        db.rollback()  # nothing of a half-recorded result is kept
        raise
    return out


@router.get("/leaderboards", dependencies=[PUBLIC])
def leaderboards(game: str = Query("overall", max_length=20), period: str = Query("weekly", max_length=10), page: int = Query(1, ge=1, le=2000), page_size: int = Query(25, ge=1, le=50),
                 user: User | None = Depends(optional_user), db: Session = Depends(get_read_db), settings: Settings = Depends(get_settings)) -> dict:
    """A public ranking of verified scores (nickname, avatar, score, rank). Signed-in players also get their own position."""
    if not config_store.load_settings(db)["public_leaderboard"]:
        raise ApiError(403, "leaderboard_hidden", "The leaderboard is not public at the moment.")
    if game != "overall" and game not in catalog.GAMES:
        raise ApiError(422, "invalid_game", "Unknown game.", fields={"game": "Unknown game."})
    if period not in periods.PERIODS:
        raise ApiError(422, "invalid_period", "Use daily, weekly or all.", fields={"period": "Use daily, weekly or all."})
    return service.leaderboard_page(db, game, period, page, page_size, user, service.utcnow(), periods.zone(settings.app_timezone))


@router.get("/games/{game}/progress", dependencies=[PUBLIC])
def get_progress(game: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    if game not in catalog.GAMES:
        raise ApiError(404, "game_not_found", "Unknown game.")
    row = service.get_progress_row(db, user, game)
    out = {"game": game, "version": row.version, "data": row.data}
    db.commit()
    return out


@router.post("/games/{game}/progress", dependencies=[WRITE])
def sync_progress(game: str, body: ProgressMerge, user: User = Depends(csrf_user), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """Merge a device's progress into the cloud copy. The merge only moves forward, so an older device can never overwrite newer progress; guest progress sent with `imported` stays unverified."""
    if game not in catalog.GAMES:
        raise ApiError(404, "game_not_found", "Unknown game.")
    _user_limit(user, "sync", 30, 60, settings)
    row, changed = service.merge_progress(db, user, game, body.model_dump(include={"levels", "unlocked", "best"}), base_version=body.base_version, imported=body.imported)
    out = {"game": game, "version": row.version, "data": row.data, "changed": changed}
    db.commit()
    return out


@router.get("/achievements", dependencies=[PUBLIC])
def achievements(user: User | None = Depends(optional_user), db: Session = Depends(get_db)) -> dict:
    if user is None:
        return {"signed_in": False, "items": [{"code": d.code, "title": d.title, "description": d.description, "game": d.game, "icon": d.icon, "earned": False, "earned_at": None} for d in service.achievement_defs(db)]}
    return {"signed_in": True, "items": service.achievements_for(db, user)}


@router.get("/challenges", dependencies=[PUBLIC])
def challenges(user: User | None = Depends(optional_user), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    out = service.challenges_for(db, user, service.utcnow(), periods.zone(settings.app_timezone))
    db.commit()  # the day's challenges are created the first time anybody asks
    return out


@router.post("/challenges/{challenge_id}/claim", dependencies=[WRITE])
def claim_challenge(challenge_id: uuid.UUID, user: User = Depends(csrf_user), db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> dict:
    """Claim the reward of a challenge the SERVER saw completed (from verified runs). A reward can be claimed once."""
    _user_limit(user, "claim", 20, 60, settings)
    try:
        out = service.claim_challenge(db, user, challenge_id, service.utcnow(), periods.zone(settings.app_timezone))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return out
