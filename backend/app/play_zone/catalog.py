"""The fixed facts of the Play Zone: the four games, their levels (exported from the frontend so the server checks results against the SAME definitions), the achievements, the daily
challenge templates and the avatars. Nothing here talks to the database."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
GAMES = ("catch-the-stars", "laxbot-jump", "puzzle-pop", "bug-hunter")
GAME_TITLES = {"catch-the-stars": "Catch the Stars", "laxbot-jump": "LAXBOT Jump", "puzzle-pop": "Puzzle Pop", "bug-hunter": "Bug Hunter"}
AVATARS = ("star-collector", "adventure-explorer", "puzzle-wizard", "cyber-defender")  # the four approved LAXBOT outfits of the lobby
MAIN = "main"  # the level id of a game that has no levels (Catch the Stars)


@lru_cache
def _load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def puzzle_levels() -> dict[str, dict]:
    return {lv["id"]: lv for lv in _load("puzzle_levels.json")}


def jump_info() -> dict:
    d = _load("jump_levels.json")
    return {"levels": {lv["id"]: lv for lv in d["levels"]}, "order": [lv["id"] for lv in d["levels"]], "scoring": d["scoring"], "lives": d["lives"]}


def bug_info() -> dict:
    d = _load("bug_levels.json")
    return {"levels": {lv["id"]: lv for lv in d["levels"]}, "order": [lv["id"] for lv in d["levels"]], **{k: v for k, v in d.items() if k != "levels"}}


def level_ids(game: str) -> list[str]:
    if game == "catch-the-stars":
        return [MAIN]
    if game == "laxbot-jump":
        return jump_info()["order"]
    if game == "puzzle-pop":
        return list(puzzle_levels())
    return bug_info()["order"]


def level_index(game: str, level_id: str) -> int:
    ids = level_ids(game)
    return ids.index(level_id) if level_id in ids else -1


# ---- achievements: (code, title, description, game, icon, sort) ----
ACHIEVEMENTS = (
    ("first-steps", "First Steps", "Play your first game in the Play Zone.", None, "footprints", 10),
    ("all-rounder", "All-Rounder", "Play all four games with a signed-in account.", None, "gamepad", 20),
    ("star-collector", "Star Collector", "Collect 100 stars in Catch the Stars.", "catch-the-stars", "star", 30),
    ("cloud-explorer", "Cloud Explorer", "Complete Cloud Kingdom in LAXBOT Jump.", "laxbot-jump", "cloud", 40),
    ("sky-climber", "Sky Climber", "Complete all five LAXBOT Jump worlds.", "laxbot-jump", "mountain", 50),
    ("crystal-gardener", "Crystal Gardener", "Complete the five levels of Crystal Garden in Puzzle Pop.", "puzzle-pop", "flower", 60),
    ("puzzle-master", "Puzzle Master", "Complete 10 Puzzle Pop levels.", "puzzle-pop", "puzzle", 70),
    ("bug-squasher", "Bug Squasher", "Capture 50 bugs in Bug Hunter.", "bug-hunter", "bug", 80),
    ("cyber-defender", "Cyber Defender", "Defeat the Core Corruptor, the final Bug Hunter boss.", "bug-hunter", "shield", 90),
    ("daily-hero", "Daily Hero", "Claim your first daily challenge reward.", None, "calendar", 100),
    ("champion", "Champion", "Reach 2,500 verified overall points.", None, "trophy", 110),
)
CHAMPION_POINTS = 2500
STAR_COLLECTOR_TARGET = 100
BUG_SQUASHER_TARGET = 50
PUZZLE_MASTER_TARGET = 10

# ---- daily challenges: one template per metric; the target changes with the weekday (the server decides, the frontend only shows it) ----
CHALLENGE_TEMPLATES = (
    {"code": "stars", "metric": "stars_collected", "game": "catch-the-stars", "targets": (20, 25, 30, 20, 25, 30, 35), "reward": 20,
     "title": "Collect {n} stars", "description": "Collect {n} stars in Catch the Stars (verified rounds only)."},
    {"code": "platform", "metric": "platform_levels", "game": "laxbot-jump", "targets": (1, 1, 1, 1, 1, 2, 2), "reward": 20,
     "title": "Finish {n} platform level{s}", "description": "Complete {n} LAXBOT Jump level{s} (verified runs only)."},
    {"code": "puzzle", "metric": "puzzle_levels", "game": "puzzle-pop", "targets": (1, 1, 1, 1, 1, 2, 2), "reward": 20,
     "title": "Win {n} puzzle level{s}", "description": "Win {n} Puzzle Pop level{s} (verified replays only)."},
    {"code": "bugs", "metric": "bugs_captured", "game": "bug-hunter", "targets": (15, 12, 15, 18, 15, 20, 20), "reward": 20,
     "title": "Capture {n} bugs", "description": "Capture {n} bugs in Bug Hunter (verified runs only)."},
    {"code": "two-games", "metric": "distinct_games", "game": None, "targets": (2, 2, 2, 2, 2, 3, 3), "reward": 30,
     "title": "Play {n} different games", "description": "Finish a verified round in {n} different Play Zone games today."},
)
CHALLENGE_DAILY_CAP = 130  # the most challenge points a player can earn in one day (the sum of all templates at their default targets and then some)
