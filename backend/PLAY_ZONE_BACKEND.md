# LAX360 Play Zone: backend, scoring and deployment notes (Milestone 6)

The Play Zone uses the **existing website login** (HttpOnly session cookie + CSRF header), the existing FastAPI app and the existing Supabase PostgreSQL database. There is no separate Play Zone login and no new service.

## 1. What was added

| Area | Where |
| --- | --- |
| Tables (8) + seed of 11 achievements | `alembic/versions/0026_play_zone.py`, `app/models/play_zone.py` |
| Rules, catalogue, periods, scoring | `app/play_zone/catalog.py`, `periods.py`, `scoring.py` |
| Server-side verification | `app/play_zone/verify.py`, `puzzle_engine.py` (Python port of the Puzzle Pop engine), `data/*.json` (level data exported from the frontend by `frontend/scripts/export-playzone-data.mjs`) |
| Business logic (sessions, scores, boards, achievements, challenges, sync) | `app/play_zone/service.py` |
| REST API | `app/api/routes/play_zone.py`, `app/schemas/play_zone.py` (prefix `/api/play-zone`) |
| Tests | `tests/test_play_zone.py` (+ `tests/fixtures/play_zone_fixtures.json`) |

Endpoints (all under `/api/play-zone`): `GET/PATCH /profile`, `POST /sessions`, `POST /sessions/{id}/complete`, `GET /leaderboards`, `GET/POST /games/{game}/progress`, `GET /achievements`, `GET /challenges`, `POST /challenges/{id}/claim`.

## 2. Configuration

No new required environment variable. Optional rate-limit tuning (defaults in `app/core/config.py`): `PZ_START_RATE_LIMIT_MAX/_WINDOW_SECONDS`, `PZ_COMPLETE_...`, `PZ_WRITE_...`, `PZ_PUBLIC_...`. Day and week boundaries use `APP_TIMEZONE` (default `Asia/Kolkata`).

* **CORS / API base URL:** unchanged. The frontend calls `/api/play-zone/...` through the same `/api` rewrite/base URL as the rest of the site, so `CORS_ORIGINS` and `VITE_API_BASE_URL` need no change.
* **Health check:** the existing health endpoint is unchanged. Play-zone endpoints answer `503 database_not_ready` (never a crash) until migration 0026 is applied, and the public site is unaffected.

## 3. Deployment sequence (do not run until approved)

1. Back up / snapshot the database (Supabase dashboard).
2. Deploy the **backend** (Render) with the new code. It starts normally even before the migration.
3. Run `alembic upgrade head` (applies `0026_play_zone`, additive only: new tables, no existing table is touched).
4. Check `GET /api/play-zone/leaderboards` returns `200` with empty `items`.
5. Deploy the **frontend** (Vercel). Until step 3 the Play Zone screens show a calm "unavailable" state.

**Rollback:** `alembic downgrade 0025` drops only the Play Zone tables (this deletes Play Zone data). To disable without data loss, simply redeploy the previous frontend: the tables are inert.

## 4. How scores are verified (and what that does not prove)

* A signed-in player **starts a server session** (game, level, start time; Puzzle Pop also receives a server-picked seed). A result can be submitted **once** per session and only before it expires. Repeating the request returns the stored outcome (idempotent); a retried start with the same `request_key` returns the same session.
* **Catch the Stars:** duration vs. server clock, item counts bounded by round length and spawn rate, lives/bomb consistency, multiplier-consistent score ceiling, event-rate heuristics.
* **LAXBOT Jump / Bug Hunter:** level identity and unlock, counts bounded by the level's real content (coins, crystals, stars, bugs per type, stations, orbs, boss), shortest believable time from course length, server elapsed time; **the score is recomputed by the server** from those counts with the same formulas as the game.
* **Puzzle Pop:** the server issues the seed and **replays every accepted swap** with a deterministic port of the game engine. The score, status and stars come from the replay, not from the browser. Checked against 30 JavaScript fixtures (0 mismatches).
* Impossible results are **rejected**; suspicious-but-possible runs are saved as **flagged** and excluded from boards, counters, achievements and challenges until a moderator clears them (moderation data model exists; **no admin UI until Milestone 7**).
* The score stored is always the one the server computed. The browser never sends a player id.

**Honest limitation:** a browser game cannot be tamper-proof. Replay (Puzzle Pop), recomputation and plausibility limits stop casual cheating and edited requests, but a determined player could still automate legitimate-looking play. Flags, session records and per-player history exist so moderation can act. Large input recordings are not stored.

## 5. Ranking and timezone policy

* Boards: Overall plus one per game; Daily / Weekly / All-time; server-side pagination; ties broken by earlier first achievement then id.
* Day = local midnight-to-midnight in `APP_TIMEZONE`; week = Monday 00:00 local; bounds stored/compared in UTC.
* **Overall = fair normalised points:** per game a capped contribution (Catch: score ÷ 1500 reference; level games: best score per level, capped at 200 / 200 / 40 per level; each game capped at 1000) **plus claimed daily-challenge points** (daily cap). Only the best score per level counts, so repeating a level cannot farm points.
* Public rows contain nickname, avatar, score, rank only. Rankings are cached for a short time (invalidated on new scores/profile changes).

## 6. Achievements, challenges, sync

* Achievements: First Steps, Star Collector, Cloud Explorer, Puzzle Master, Cyber Defender, All-Rounder, Champion. Awarded by the server from verified data, unique per player (savepoint-protected insert).
* Daily challenges (collect 20 stars, complete a platform level, finish a puzzle level, capture 15 bugs, play two different games) are created per local day, progress only from verified runs, reward claimable once.
* Cloud sync is **forward-only** (completed levels stay completed; stars/bests only rise; unlocks are added), versioned, and per game. Guest progress is importable but stored as **unverified** and never reaches a leaderboard. A bug-hunter run resumed from a checkpoint is a local run (its clock does not start at zero).

## 7. Tests actually executed

* `pytest tests/test_play_zone.py`: 32 tests on in-memory SQLite plus pure functions (verification, ranking, periods, achievements, challenges, sync, rollback, privacy, auth).
* The PostgreSQL migration was **generated offline as SQL and inspected** but **not run against a live PostgreSQL**; the full existing backend suite that needs a local PostgreSQL was not run here.
