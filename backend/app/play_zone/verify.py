"""Server-side verification of finished game runs. Pure functions (no database): they take the result the browser sent, the session the SERVER issued and the real elapsed time, and return a
verdict with the score THE SERVER computed.

IMPORTANT: a game that runs in the browser can never be made tamper-proof. What these checks do:
  * Puzzle Pop: the server issued the seed and REPLAYS every submitted swap with the same deterministic engine (puzzle_engine.py). The score is whatever the replay produces, so it cannot be invented.
    Remaining trust: the player could use a program to search for good moves (that is skill by other means) and the board of a given seed is visible to the client.
  * Catch the Stars, LAXBOT Jump, Bug Hunter: the browser sends a bounded SUMMARY of the run (counts and time). The server checks it against the level data (how many coins, bugs, repairs there are),
    against the real elapsed time of the server-issued session, against the documented score formula (it recomputes the score itself) and against physical limits (shortest possible time, event rates).
    Remaining trust: the counts themselves (for example "7 coins collected") come from the client; they are bounded and plausibility-checked, not proven. A determined cheater can submit a plausible run.
  * Suspicious but possible results are FLAGGED (kept, but kept off the public boards until a moderator clears them); impossible ones are REJECTED. Both are stored for moderation.
Describing this as "cheat-proof" would be wrong.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from app.play_zone import catalog, puzzle_engine as pe

MAX_ELAPSED_SKEW = 2.5  # seconds of tolerance between the client's clock and the server's measurement


@dataclass
class Verdict:
    ok: bool
    score: int = 0
    level_id: str = catalog.MAIN
    details: dict = field(default_factory=dict)
    flags: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)  # why it was rejected
    metrics: dict = field(default_factory=dict)  # what to add to the player's lifetime counters and today's challenges (only for accepted results)


def _reject(reason: str, level_id: str = catalog.MAIN) -> Verdict:
    return Verdict(False, level_id=level_id, reasons=[reason])


def _int(v, lo: int, hi: int):
    return v if isinstance(v, int) and not isinstance(v, bool) and lo <= v <= hi else None


def _num(v, lo: float, hi: float):
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and lo <= v <= hi else None


def _time_checks(claimed: float, elapsed: float, flags: list[str]) -> str | None:
    if elapsed + MAX_ELAPSED_SKEW < claimed:
        return "faster_than_real_time"  # the run claims to be longer than the server saw: it cannot have lasted that long
    if claimed + MAX_ELAPSED_SKEW + 600 < elapsed and elapsed > 7200:
        return "session_too_old"
    return None


# ---------------------------------------------------------------- Catch the Stars
def verify_catch(payload: dict, elapsed: float) -> Verdict:
    p = payload
    stars, golden, diamonds, hearts, bombs = _int(p.get("stars"), 0, 200), _int(p.get("golden"), 0, 200), _int(p.get("diamonds"), 0, 200), _int(p.get("hearts"), 0, 50), _int(p.get("bombsHit"), 0, 60)
    score = _int(p.get("score"), 0, 100000)
    survived = _num(p.get("survived"), 0, 31)
    if None in (stars, golden, diamonds, hearts, bombs, score, survived) or p.get("reason") not in ("time", "lives"):
        return _reject("malformed_result")
    flags: list[str] = []
    if p["reason"] == "time" and survived < 29.5:
        return _reject("round_too_short")
    if p["reason"] == "lives" and bombs < 3 and survived < 29.5:
        return _reject("lives_not_lost")
    if bombs > 3 + hearts:
        return _reject("too_many_bomb_hits")  # three lives plus the hearts that were caught
    if p["reason"] == "time" and bombs >= 3 + hearts:
        return _reject("round_should_have_ended")
    bad = _time_checks(survived, elapsed, flags)
    if bad:
        return _reject(bad)
    if elapsed < survived * 0.9 - MAX_ELAPSED_SKEW:
        return _reject("faster_than_real_time")
    collected = stars + golden + diamonds
    if collected > int(survived / 0.5) + 3:
        return _reject("too_many_items")  # the field cannot spawn that many in that time
    base = 10 * stars + 25 * golden + 50 * diamonds
    if score < base or score > 2 * base:
        return _reject("score_out_of_range")  # the score must lie between the plain total and the all-doubled total (the x2 power-up)
    if collected > 42:
        flags.append("event_rate_high")
    if score > 1500:
        flags.append("score_high")
    if base and score > 1.8 * base:
        flags.append("multiplier_high")
    return Verdict(True, score=score, level_id=catalog.MAIN, flags=flags, details={"stars": stars, "golden": golden, "diamonds": diamonds, "hearts": hearts, "survived": round(survived, 1)},
                   metrics={"stars_collected": stars + golden})


# ---------------------------------------------------------------- LAXBOT Jump
def jump_stars(coins: int, crystals: int, stars: int, lv: dict) -> int:
    rating = 1
    if coins >= math.ceil(lv["coins"] * 0.75):
        rating = 2
    if rating == 2 and crystals >= lv["crystals"] and stars >= lv["stars"]:
        rating = 3
    return rating


def jump_score(coins: int, crystals: int, stars: int, lives: int, time: float, lv: dict, sc: dict) -> int:
    time_bonus = max(0, math.floor(lv["par"] - time)) * sc["timePerSecond"]
    return coins * sc["coin"] + crystals * sc["crystal"] + stars * sc["star"] + lives * sc["life"] + sc["complete"] + time_bonus


def verify_jump(payload: dict, session_level: str, elapsed: float, unlocked: bool) -> Verdict:
    info = catalog.jump_info(); lv = info["levels"].get(session_level)
    if lv is None or payload.get("levelId") != session_level:
        return _reject("wrong_level", session_level)
    if not unlocked:
        return _reject("level_locked", session_level)
    if payload.get("finished") is not True:
        return _reject("not_completed", session_level)
    coins, crystals, stars, lives = _int(payload.get("coins"), 0, lv["coins"]), _int(payload.get("crystals"), 0, lv["crystals"]), _int(payload.get("stars"), 0, lv["stars"]), _int(payload.get("lives"), 1, info["lives"])
    time = _num(payload.get("time"), 0, 36000)
    if None in (coins, crystals, stars, lives, time):
        return _reject("counts_out_of_range", session_level)
    flags: list[str] = []
    minimum = lv["distance"] / 10.0  # nobody crosses the course faster than a run with bounce pads and lifts allows
    if time < minimum:
        return _reject("faster_than_possible", session_level)
    bad = _time_checks(time, elapsed, flags)
    if bad:
        return _reject(bad, session_level)
    if elapsed < time - MAX_ELAPSED_SKEW:
        return _reject("faster_than_real_time", session_level)
    score = jump_score(coins, crystals, stars, lives, time, lv, info["scoring"])
    if time < minimum * 1.25:
        flags.append("very_fast")
    if coins == lv["coins"] and crystals == lv["crystals"] and stars == lv["stars"] and time < lv["par"] * 0.45:
        flags.append("perfect_and_fast")
    return Verdict(True, score=score, level_id=session_level, flags=flags, details={"coins": coins, "crystals": crystals, "stars": stars, "lives": lives, "time": round(time, 1), "rating": jump_stars(coins, crystals, stars, lv)},
                   metrics={"platform_levels": 1})


# ---------------------------------------------------------------- Bug Hunter
def bug_challenge_met(lv: dict, captured: int, total: int, orbs: int, damage: int, deaths: int, time: float) -> bool:
    k = lv["challenge"]["kind"]
    return {"nodamage": damage == 0, "nodeath": deaths == 0, "allbugs": captured >= total, "orbs": orbs >= lv["orbs"], "time": time <= lv["challenge"].get("seconds", 0)}.get(k, False)


def bug_score(lv: dict, by_type: dict, repairs: int, orbs: int, boss: bool, health: int, time: float, challenge: bool, cfg: dict) -> dict:
    s = cfg["score"]
    parts = {
        "bugs": sum(by_type[k] * s[k] for k in by_type), "repairs": repairs * s["repair"], "boss": s["boss"] if boss else 0, "orbs": orbs * s["orb"],
        "challenge": s["challenge"] if challenge else 0, "health": max(0, health) * s["healthLeft"], "time": max(0, math.floor(lv["par"] - time)) * s["timePerSecond"],
    }
    return parts


def verify_bug(payload: dict, session_level: str, elapsed: float) -> Verdict:
    cfg = catalog.bug_info(); lv = cfg["levels"].get(session_level)
    if lv is None or payload.get("levelId") != session_level:
        return _reject("wrong_level", session_level)
    if payload.get("finished") is not True:
        return _reject("not_completed", session_level)
    by = payload.get("byType")
    if not isinstance(by, dict) or set(by) != set(lv["byType"]):
        return _reject("malformed_result", session_level)
    counts = {}
    for k, limit in lv["byType"].items():
        v = _int(by.get(k), 0, limit)  # never more bugs of a type than the level contains
        if v is None:
            return _reject("capture_counts_out_of_range", session_level)
        counts[k] = v
    captured = sum(counts.values())
    repairs, orbs = _int(payload.get("repairs"), 0, lv["stations"]), _int(payload.get("orbs"), 0, lv["orbs"])
    health, deaths, damage = _int(payload.get("health"), 1, cfg["maxHealth"]), _int(payload.get("deaths"), 0, cfg["lives"] - 1), _int(payload.get("damage"), 0, 500)
    time = _num(payload.get("time"), 0, 36000)
    boss = payload.get("boss")
    if None in (repairs, orbs, health, deaths, damage, time) or not isinstance(boss, bool):
        return _reject("counts_out_of_range", session_level)
    if captured < lv["needCaptures"]:
        return _reject("objectives_not_met", session_level)
    if repairs < lv["needRepairs"]:
        return _reject("repairs_missing", session_level)
    if lv["boss"] and not boss:
        return _reject("boss_not_defeated", session_level)
    if boss and not lv["boss"]:
        return _reject("no_boss_in_level", session_level)
    if deaths > 0 and damage < 5 * deaths:
        return _reject("inconsistent_damage", session_level)  # a lost life takes five hearts of damage
    # the shortest believable time: the walk (sprinting with a speed boost), a moment per capture and per repair, and the boss fight
    minimum = lv["distance"] / (cfg["sprint"] * 1.5) * 0.8 + 1.2 * captured + 4 * repairs + (22 if lv["boss"] else 0)
    if time < minimum:
        return _reject("faster_than_possible", session_level)
    flags: list[str] = []
    bad = _time_checks(time, elapsed, flags)
    if bad:
        return _reject(bad, session_level)
    if elapsed < time - MAX_ELAPSED_SKEW:
        return _reject("faster_than_real_time", session_level)
    met = bug_challenge_met(lv, captured, lv["totalBugs"], orbs, damage, deaths, time)
    parts = bug_score(lv, counts, repairs, orbs, boss, health, time, met, cfg)
    score = sum(parts.values())
    stars = 3 if met and captured >= lv["totalBugs"] else 2 if met else 1
    if time < minimum * 1.2:
        flags.append("very_fast")
    if damage == 0 and captured == lv["totalBugs"] and time < lv["par"] * 0.4:
        flags.append("perfect_and_fast")
    return Verdict(True, score=score, level_id=session_level, flags=flags, details={"captured": captured, "repairs": repairs, "boss": boss, "orbs": orbs, "health": health, "time": round(time, 1), "stars": stars, "parts": parts},
                   metrics={"bugs_captured": captured})


# ---------------------------------------------------------------- Puzzle Pop (server replay)
def verify_puzzle(payload: dict, session_level: str, seed: int, elapsed: float, unlocked: bool) -> Verdict:
    lv = catalog.puzzle_levels().get(session_level)
    if lv is None or payload.get("levelId") != session_level:
        return _reject("wrong_level", session_level)
    if not unlocked:
        return _reject("level_locked", session_level)
    moves = payload.get("moves")
    if not isinstance(moves, list) or not 1 <= len(moves) <= lv["moves"]:
        return _reject("bad_move_list", session_level)
    flags: list[str] = []
    state = pe.create_game(lv, seed)
    for i, m in enumerate(moves):
        try:
            (r1, c1), (r2, c2) = m
            ok = all(isinstance(v, int) and not isinstance(v, bool) and 0 <= v < 8 for v in (r1, c1, r2, c2))
        except (TypeError, ValueError):
            ok = False
        if not ok or not pe.play_move(state, [r1, c1], [r2, c2]):
            return _reject(f"invalid_move_{i + 1}", session_level)  # a move the engine does not accept: the log is not a real game
        if state["status"] != "playing" and i != len(moves) - 1:
            return _reject("moves_after_the_end", session_level)
    if state["status"] != "won":
        return _reject("level_not_won", session_level)  # only completed levels are scored
    if elapsed < len(moves) * 0.4:  # `elapsed` is measured by the server, so no tolerance is needed: a move takes about a second of animation
        return _reject("faster_than_real_time", session_level)
    if elapsed < len(moves) * 0.9:
        flags.append("very_fast_moves")  # suspicious (a script), not impossible
    stars = pe.stars_for(state)
    return Verdict(True, score=state["score"], level_id=session_level, flags=flags, details={"moves_used": len(moves), "moves_left": state["moves"], "stars": stars}, metrics={"puzzle_levels": 1})
