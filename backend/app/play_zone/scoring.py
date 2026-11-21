"""Fair scoring across four games with four different scoring systems.

RAW scores are never added together. Every verified result is converted to NORMALISED POINTS, with a hard cap per game, and the overall ranking adds only those points:

  * Catch the Stars (one mode): points = min(1000, round(1000 x score / 1500)); 1500 is an excellent 30-second round. Only the player's BEST round in the period counts.
  * LAXBOT Jump, Bug Hunter, Puzzle Pop (levels): each level is worth at most (1000 / number of levels) points: 200 for Jump and Bug Hunter, 40 for Puzzle Pop.
    points(level) = min(cap, round(cap x score / reference)); the reference is 85% of the best score the level's own rules allow (Jump, Bug Hunter) or 160 x the level's moves (Puzzle Pop).
    Only the BEST result of each level in the period counts, so replaying a level can improve it but never add to it twice.
  * Each game contributes at most 1000 points (sum of its levels, capped), so the overall maximum from games is 4000. Nobody can win overall by farming one game.
  * Daily challenge rewards that were CLAIMED in the period are added on top (at most CHALLENGE_DAILY_CAP per day).

Only server-verified scores (status 'accepted') are counted; flagged scores wait for moderation.
"""

from __future__ import annotations

from app.play_zone import catalog

GAME_CAP = 1000
CATCH_REF = 1500


def _level_cap(game: str) -> int:
    return GAME_CAP // max(1, len(catalog.level_ids(game)))


def reference_score(game: str, level_id: str) -> int:
    if game == "catch-the-stars":
        return CATCH_REF
    if game == "laxbot-jump":
        lv = catalog.jump_info()["levels"][level_id]; sc = catalog.jump_info()["scoring"]
        best = lv["coins"] * sc["coin"] + lv["crystals"] * sc["crystal"] + lv["stars"] * sc["star"] + catalog.jump_info()["lives"] * sc["life"] + sc["complete"] + lv["par"] * sc["timePerSecond"]
        return round(best * 0.85)
    if game == "bug-hunter":
        info = catalog.bug_info(); lv = info["levels"][level_id]; s = info["score"]
        best = sum(n * s[k] for k, n in lv["byType"].items()) + lv["stations"] * s["repair"] + (s["boss"] if lv["boss"] else 0) + lv["orbs"] * s["orb"] + s["challenge"] + info["maxHealth"] * s["healthLeft"] + lv["par"] * s["timePerSecond"]
        return round(best * 0.85)
    return 160 * catalog.puzzle_levels()[level_id]["moves"]


def normalise(game: str, level_id: str, score: int) -> int:
    """The normalised points of one verified result (0 to the cap of that game or level)."""
    if score <= 0:
        return 0
    cap = GAME_CAP if game == "catch-the-stars" else _level_cap(game)
    return min(cap, round(cap * score / reference_score(game, level_id)))


def game_contribution(level_points: list[int]) -> int:
    """A game's contribution to the overall ranking: the sum of the best points of its levels, never above 1000."""
    return min(GAME_CAP, sum(level_points))
