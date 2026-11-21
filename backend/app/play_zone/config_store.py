"""Administrator-controlled configuration of the Play Zone: global settings and per-game settings, with validated schemas and safe ranges.

What an administrator can and cannot change (documented policy):
  * Settings and game switches decide WHETHER something can be played or shown (enabled, maintenance, level availability, nickname rules, ...).
  * Nothing here relaxes score verification: the verifiers in verify.py always use their built-in, tested limits. Gameplay "profiles" (`params`) are validated and versioned, and
    every session records the version it was started under, but they can only describe the game, never loosen the server's checks.
  * No setting contains code, SQL or a secret: every value is checked against a fixed schema (type, range, allowed values) before it is stored.
"""

from __future__ import annotations

import time
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import GameConfig, GameConfigVersion, MediaAsset, PlaySetting
from app.play_zone import catalog

CACHE_SECONDS = 10.0
_cache: dict[int, tuple[float, dict, dict]] = {}

GRAPHICS = ("auto", "low", "medium", "high")

# ---------------------------------------------------------------------------- global settings
SETTING_DEFAULTS: dict = {
    "enabled": True,  # the whole Play Zone (new sessions); false = closed
    "maintenance": False,  # new sessions are refused with a friendly notice; running ones may finish
    "maintenance_message": "",
    "guest_play": True,  # guests may play (local records only); false = the games ask the visitor to sign in first
    "public_leaderboard": True,
    "daily_challenges": True,
    "featured_game": None,
    "nickname_min": 3,
    "nickname_max": 24,
    "avatars_enabled": list(catalog.AVATARS),
    "graphics_options": list(GRAPHICS),
}


def _bool(v, key):
    if not isinstance(v, bool):
        raise ApiError(422, "invalid_setting", "This setting must be on or off.", fields={key: "Use on or off."})
    return v


def _int(v, key, lo, hi):
    if not isinstance(v, int) or isinstance(v, bool) or not lo <= v <= hi:
        raise ApiError(422, "invalid_setting", f"Use a whole number from {lo} to {hi}.", fields={key: f"Use a whole number from {lo} to {hi}."})
    return v


def _subset(v, key, allowed, minimum=1):
    if not isinstance(v, list) or len(set(v)) != len(v) or any(x not in allowed for x in v) or len(v) < minimum:
        raise ApiError(422, "invalid_setting", "Choose at least one of the supported options.", fields={key: "Choose from the supported options."})
    return [x for x in allowed if x in v]


def clean_setting(key: str, v):
    if key not in SETTING_DEFAULTS:
        raise ApiError(422, "unknown_setting", "Unknown setting.", fields={key: "Unknown setting."})
    if key in ("enabled", "maintenance", "guest_play", "public_leaderboard", "daily_challenges"):
        return _bool(v, key)
    if key == "maintenance_message":
        if not isinstance(v, str) or len(v) > 200:
            raise ApiError(422, "invalid_setting", "Use up to 200 characters.", fields={key: "Use up to 200 characters."})
        return " ".join(v.split())
    if key == "featured_game":
        if v is not None and v not in catalog.GAMES:
            raise ApiError(422, "invalid_setting", "Choose one of the four games.", fields={key: "Choose one of the four games."})
        return v
    if key == "nickname_min":
        return _int(v, key, 3, 10)
    if key == "nickname_max":
        return _int(v, key, 12, 24)  # the database column holds 24 characters
    if key == "avatars_enabled":
        return _subset(v, key, catalog.AVATARS)
    return _subset(v, key, GRAPHICS)


def load_settings(db: Session) -> dict:
    return _load(db)[0]


def _load(db: Session) -> tuple[dict, dict]:
    key = id(db.get_bind())
    hit = _cache.get(key)
    now = time.monotonic()
    if hit and now - hit[0] < CACHE_SECONDS:
        return hit[1], hit[2]
    stored: dict = {}
    configs: dict = {}
    try:
        with db.begin_nested():  # a savepoint: if the tables are not migrated yet only this lookup is undone, never the caller's work
            for r in db.scalars(select(PlaySetting)):
                if r.key in SETTING_DEFAULTS and isinstance(r.value, dict) and "v" in r.value:
                    stored[r.key] = r.value["v"]
            for c in db.scalars(select(GameConfig)):
                configs[c.game] = _config_dict(c)
    except Exception:  # not migrated yet: behave as if nothing was configured, never crash the games
        pass
    settings = {**SETTING_DEFAULTS, **stored}
    _cache[key] = (now, settings, configs)
    return settings, configs


def drop_cache() -> None:
    _cache.clear()


def update_settings(db: Session, patch: dict, admin_id: uuid.UUID | None) -> dict:
    """Validate and store changed settings. Returns {key: (old, new)} for the keys that really changed."""
    current = load_settings(db)
    clean = {k: clean_setting(k, v) for k, v in patch.items()}
    mn, mx = clean.get("nickname_min", current["nickname_min"]), clean.get("nickname_max", current["nickname_max"])
    if mn >= mx:
        raise ApiError(422, "invalid_setting", "The shortest nickname must be shorter than the longest.", fields={"nickname_min": "Must be smaller than the maximum."})
    changed = {}
    for k, v in clean.items():
        if current.get(k) == v:
            continue
        row = db.get(PlaySetting, k)
        if row is None:
            db.add(PlaySetting(key=k, value={"v": v}, updated_by=admin_id))
        else:
            row.value, row.updated_by = {"v": v}, admin_id
        changed[k] = (current.get(k), v)
    db.flush()
    drop_cache()
    return changed


# ---------------------------------------------------------------------------- per-game configuration
LEVEL_GAMES = ("laxbot-jump", "puzzle-pop", "bug-hunter")
DIFFICULTY = ("easy", "normal", "hard")

# name -> (kind, low/allowed, high, default)
PARAM_SCHEMAS: dict[str, dict] = {
    "catch-the-stars": {
        "difficulty": ("choice", DIFFICULTY, None, "normal"), "duration_seconds": ("int", 20, 60, 30), "initial_lives": ("int", 1, 5, 3),
        "spawn_rate_multiplier": ("float", 0.5, 2.0, 1.0), "score_multiplier_max": ("int", 1, 5, 3),
    },
    "laxbot-jump": {"difficulty": ("choice", DIFFICULTY, None, "normal"), "enemy_speed_multiplier": ("float", 0.5, 1.5, 1.0), "lives": ("int", 1, 5, 3)},
    "puzzle-pop": {"difficulty": ("choice", DIFFICULTY, None, "normal"), "move_limit_bonus": ("int", -5, 10, 0), "objective_target_multiplier": ("float", 0.5, 1.5, 1.0)},
    "bug-hunter": {
        "difficulty": ("choice", DIFFICULTY, None, "normal"), "enemy_health_multiplier": ("float", 0.5, 2.0, 1.0), "powerup_duration_multiplier": ("float", 0.5, 2.0, 1.0), "challenge_enabled": ("bool", None, None, True),
    },
}


def default_params(game: str) -> dict:
    return {k: spec[3] for k, spec in PARAM_SCHEMAS[game].items()}


def clean_params(game: str, raw) -> dict:
    schema = PARAM_SCHEMAS[game]
    if not isinstance(raw, dict):
        raise ApiError(422, "invalid_params", "Send the settings as an object.")
    out = default_params(game)
    for k, v in raw.items():
        if k not in schema:
            raise ApiError(422, "invalid_params", f"“{k}” is not a supported setting for this game.", fields={k: "Not supported."})
        kind, lo, hi, _ = schema[k]
        if kind == "bool":
            ok = isinstance(v, bool)
        elif kind == "choice":
            ok = v in lo
        elif kind == "int":
            ok = isinstance(v, int) and not isinstance(v, bool) and lo <= v <= hi
        else:
            ok = isinstance(v, (int, float)) and not isinstance(v, bool) and lo <= float(v) <= hi
            v = round(float(v), 2) if ok else v
        if not ok:
            hint = "Choose one of: " + ", ".join(lo) if kind == "choice" else "Use on or off." if kind == "bool" else f"Use a value from {lo} to {hi}."
            raise ApiError(422, "invalid_params", hint, fields={k: hint})
        out[k] = v
    return out


def _config_dict(c: GameConfig) -> dict:
    return {
        "game": c.game, "enabled": c.enabled, "published": c.published, "visibility": c.visibility, "maintenance": c.maintenance, "featured": c.featured, "sort_order": c.sort_order,
        "title": c.title, "short_description": c.short_description, "instructions": c.instructions, "thumbnail_media_id": str(c.thumbnail_media_id) if c.thumbnail_media_id else None,
        "banner_media_id": str(c.banner_media_id) if c.banner_media_id else None, "disabled_levels": list(c.disabled_levels or []),
        "params": {**default_params(c.game), **(c.params or {})}, "config_version": c.config_version,
    }


def default_config(game: str) -> dict:
    order = catalog.GAMES.index(game) + 1
    return {"game": game, "enabled": True, "published": True, "visibility": "public", "maintenance": False, "featured": False, "sort_order": order, "title": None, "short_description": None,
            "instructions": None, "thumbnail_media_id": None, "banner_media_id": None, "disabled_levels": [], "params": default_params(game), "config_version": 1}


def game_config(db: Session, game: str) -> dict:
    return _load(db)[1].get(game) or default_config(game)


def all_game_configs(db: Session) -> list[dict]:
    configs = _load(db)[1]
    return sorted((configs.get(g) or default_config(g) for g in catalog.GAMES), key=lambda c: (c["sort_order"], catalog.GAMES.index(c["game"])))


def check_can_start(db: Session, game: str, level_id: str) -> int:
    """Raise unless a NEW session may start for this game and level. Returns the game's config version (recorded on the session).
    Policy: sessions that already started are never cancelled by a switch; they may still be completed until they expire (a round in progress is not lost)."""
    s = load_settings(db)
    if not s["enabled"]:
        raise ApiError(503, "play_zone_closed", "The Play Zone is closed at the moment.")
    if s["maintenance"]:
        raise ApiError(503, "play_zone_maintenance", s["maintenance_message"] or "The Play Zone is under maintenance. Please try again soon.")
    c = game_config(db, game)
    if not c["enabled"] or not c["published"]:
        raise ApiError(409, "game_unavailable", "This game is not available right now.")
    if c["maintenance"]:
        raise ApiError(503, "game_maintenance", "This game is under maintenance. Please try again soon.")
    if level_id in (c["disabled_levels"] or []):
        raise ApiError(409, "level_unavailable", "This level is not available right now.")
    return int(c["config_version"])


def save_game_config(db: Session, game: str, patch: dict, admin_id: uuid.UUID | None) -> tuple[dict, dict]:
    """Apply a validated change. Returns (before, after). A change to `params` creates a new config version (kept in pz_game_config_versions)."""
    if game not in catalog.GAMES:
        raise ApiError(404, "game_not_found", "Unknown game.")
    row = db.get(GameConfig, game)
    before = _config_dict(row) if row is not None else default_config(game)
    if row is None:
        row = GameConfig(game=game, sort_order=before["sort_order"], params=before["params"], config_version=1)
        db.add(row)
        db.add(GameConfigVersion(game=game, version=1, params=before["params"], changed_by=admin_id))
    for k, v in patch.items():
        if k in ("enabled", "published", "maintenance", "featured"):
            setattr(row, k, _bool(v, k))
        elif k == "visibility":
            if v not in ("public", "hidden"):
                raise ApiError(422, "invalid_visibility", "Use public or hidden.", fields={k: "Use public or hidden."})
            row.visibility = v
        elif k == "sort_order":
            row.sort_order = _int(v, k, 0, 99)
        elif k in ("title", "short_description"):
            limit = 60 if k == "title" else 200
            if v is not None and (not isinstance(v, str) or len(v.strip()) > limit):
                raise ApiError(422, "invalid_text", f"Use up to {limit} characters.", fields={k: f"Use up to {limit} characters."})
            setattr(row, k, " ".join(v.split()) if v and v.strip() else None)
        elif k == "instructions":
            if v is not None and (not isinstance(v, str) or len(v) > 2000):
                raise ApiError(422, "invalid_text", "Use up to 2,000 characters.", fields={k: "Use up to 2,000 characters."})
            row.instructions = v.strip() if v and v.strip() else None
        elif k in ("thumbnail_media_id", "banner_media_id"):
            if v is not None:
                try:
                    mid = uuid.UUID(str(v))
                except ValueError:
                    raise ApiError(422, "invalid_media", "Choose a file from the Play Zone media.", fields={k: "Invalid file."}) from None
                asset = db.get(MediaAsset, mid)
                if asset is None or asset.kind != "image":
                    raise ApiError(422, "invalid_media", "Choose an image from the Play Zone media.", fields={k: "Choose an image."})
                setattr(row, k, mid)
            else:
                setattr(row, k, None)
        elif k == "disabled_levels":
            valid = set(catalog.level_ids(game))
            if not isinstance(v, list) or any(x not in valid for x in v) or game == "catch-the-stars":
                raise ApiError(422, "invalid_levels", "Choose levels that exist in this game.", fields={k: "Choose existing levels."})
            row.disabled_levels = [x for x in catalog.level_ids(game) if x in set(v)]
        elif k == "params":
            if not isinstance(v, dict):
                raise ApiError(422, "invalid_params", "Send the settings as an object.")
            new = clean_params(game, {**before["params"], **v})
            if new != before["params"]:
                row.params = new
                row.config_version = int(before["config_version"]) + 1
                db.add(GameConfigVersion(game=game, version=row.config_version, params=new, changed_by=admin_id))
        else:
            raise ApiError(422, "unknown_field", "Unknown setting.", fields={k: "Unknown setting."})
    if patch.get("featured") is True:  # one featured game at a time
        for other in db.scalars(select(GameConfig).where(GameConfig.game != game, GameConfig.featured.is_(True))):
            other.featured = False
    row.updated_by = admin_id
    db.flush()
    drop_cache()
    return before, _config_dict(row)
