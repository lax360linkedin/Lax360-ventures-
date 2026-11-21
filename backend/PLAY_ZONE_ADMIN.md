# LAX360 Play Zone: administration (Milestone 7)

The Play Zone is managed from the **existing company admin panel** (`/company-admin/play-zone/...`). There is no separate admin app or login: it uses the same admin session, CSRF protection, roles, audit trail and design system as the rest of the panel.

## 1. Admin modules (sidebar section "Play Zone")

Overview · Games · Players · Leaderboards · Achievements · Daily challenges · Game media · Analytics & reports · Play Zone settings · Play Zone audit logs. Every module is lazy-loaded (its own JavaScript chunk), paginated where it lists records, and shows loading, empty, error and "backend unavailable" states.

## 2. Permissions (RBAC)

Added to the existing module list in `app/core/permissions.py` (so they appear in Administrators → permissions and the audit trail records who holds them):

| Permission | Allows |
| --- | --- |
| `pz_analytics` | Overview, analytics, CSV exports |
| `pz_games` | Game switches, text, pictures, level availability, gameplay profiles |
| `pz_players` | Player directory and detail, suspend / restore Play Zone participation |
| `pz_moderation` | Live leaderboards, score submissions, invalidate / restore / approve |
| `pz_achievements` | Achievement definitions |
| `pz_challenges` | Daily challenge templates and scheduling |
| `pz_media` | Upload / replace / delete Play Zone images |
| `pz_settings` | Global Play Zone settings |
| `pz_audit` | Play Zone audit log |

A super admin holds all of them; other administrators only the ones granted. **Existing administrators receive none automatically**: a super admin must tick the boxes. Every route checks the permission on the server (`permission("pz_...")`); a website customer's session is rejected (401/403), and the old `content`-permission Play Zone preview page was removed.

## 3. API (all under `/api/admin/play-zone`, all rate limited, writes need CSRF)

`GET /overview`, `GET /analytics`, `GET /analytics/export` · `GET /games`, `PATCH /games/{game}`, `GET /games/{game}/versions` · `GET /players`, `GET /players/{id}`, `GET /players/{id}/scores`, `POST /players/{id}/suspend|restore` · `GET /leaderboards`, `GET /scores`, `GET /scores/{id}`, `POST /scores/{id}/invalidate|restore|approve` · `GET/POST /achievements`, `PATCH /achievements/{code}`, `GET /achievements/{code}/eligible` · `GET/POST /challenges`, `PATCH /challenges/{id}` · `GET/POST /media`, `PUT /media/{id}/file`, `PATCH|DELETE /media/{id}` · `GET/PATCH /settings` · `GET /audit-logs`.

Public side: `GET /api/play-zone/config` (global switches, per-game availability/title/text/pictures; no private data).

## 4. Database (migration `0027_play_zone_admin`, additive only)

Adds columns `pz_profiles.suspended/suspended_at/suspended_reason` and `pz_achievement_defs.rule_type/rule_params/reward_points/icon_media_id`, and tables `pz_game_configs`, `pz_game_config_versions`, `pz_settings`, `pz_moderation_events`, `pz_challenge_templates` (seeded with the five existing challenges), `pz_media_links`, plus date-range indexes for the dashboards. It drops and rewrites nothing: players, verified scores, progress, achievements and admin accounts are untouched. Until it is applied, the public Play Zone behaves exactly as in Milestone 6 (configuration falls back to defaults) and the admin screens show a clear "database not ready" state.

**Rollback:** `alembic downgrade 0026` removes the new tables/columns (losing the Milestone 7 configuration, moderation history and suspensions only).

## 5. Policies

* **Switching a game or level off** (or maintenance, or closing the Play Zone) stops **new** sessions at once (`game_unavailable`, `level_unavailable`, `game_maintenance`, `play_zone_maintenance`, `play_zone_closed`). A session that already started may still be completed until it expires (3 hours), so rounds in progress are not lost. The public pages also hide the game and show a notice.
* **Score validation is never configurable.** Gameplay profiles (`params`) are validated against safe ranges (unknown keys, wrong types and out-of-range values are rejected), versioned (`config_version`, history in `pz_game_config_versions`) and pinned to every new session, so a result can always be traced to the profile it started under. The verifiers keep their built-in limits. **The shipped game clients still use their built-in gameplay values**; applying a saved profile inside a client needs a client release (listed under limitations).
* **Moderation:** a score value can never be edited. A moderator can *invalidate* (accepted/flagged → hidden), *restore* (hidden → accepted) or *approve* (flagged → accepted), each with a required reason stored in `pz_moderation_events` and the audit log. Rankings recalculate immediately (cache dropped, the player's points rebuilt from the scores that still count). Approving a flagged score applies its progress, counters, challenges and achievements exactly once. Invalidating does **not** undo progress or achievements already earned (they were earned from a verified result at the time).
* **Suspension** pauses Play Zone only: the player cannot start games, submit scores, sync progress or edit the profile, and is removed from leaderboards. The website account (`users.is_active`) is never changed.
* **Privacy:** admin screens identify players by nickname and Player ID. E-mail, phone and real name are not shown; search is by nickname or Player ID only.
* **Achievements** use fixed rule types with validated parameters (`games_played`, `score_at_least`, `levels_completed`, `stat_total`, `distinct_games`, `points_at_least`, `challenges_claimed`); no code or SQL is accepted. The `(player, achievement)` primary key makes a duplicate award impossible. Reward points count in the player's ranking points once. The condition of a built-in achievement is fixed; its text, icon, points and visibility can be edited.
* **Daily challenges:** templates generate each local day's challenge the first time the day is requested. Edits and schedules (start/end dates, active flag) apply to days not generated yet; an existing day's challenge is a snapshot, so players' progress and rewards stay valid. Rewards are claimed once and expire with the day. **Weekly challenges are not supported** by the current backend.
* **Media:** images only (PNG, JPEG, WebP, GIF; real file content checked; max 5 MB), stored through the existing durable media pipeline (Supabase Storage in production; never Render's temporary disk) and delivered over HTTPS. Replacing keeps the item id so every reference follows; deleting is refused while a game, achievement, challenge or website page still uses the image.
* **Settings:** play zone enabled, maintenance (+message), guest play, public leaderboards, daily challenges, featured game, nickname length (3–10 / 12–24), approved avatars, graphics options. Disruptive changes (closing, maintenance, switching a feature off) require explicit confirmation. No setting touches sign-in or verification.
* **Audit:** every write records an entry with the admin, action (`playzone.*`), target, timestamp, a short change summary and any reason, using the shared append-only audit log (a database trigger refuses edits/deletes; secrets are filtered out).

## 6. Metric definitions (Analytics)

Days are `APP_TIMEZONE` calendar days, weeks start Monday. *Daily active* = distinct players who started a session that day. *Weekly active* = same per week. *New players* = profiles created that day. *Returning* = active that day with a profile created on an earlier day. *Sessions* = sessions started. *Average duration* = mean server-measured duration of completed sessions (unfinished runs have none and are excluded). *Completion rate* = accepted sessions ÷ sessions started (per game and per level). *Popular worlds* = sessions grouped by the level's world. *Achievement unlock rate* = players who earned it ÷ all players. *Challenge participation* = per challenge code: players with progress, completed, claimed. **Retention is not reported**: the stored data is too thin for a trustworthy figure. Large ranges read at most 200,000 rows per series and say so; aggregates are cached for 30 seconds. CSV cells beginning with `= + - @` are neutralised.

## 7. Deployment (do not run until approved)

1. Back up the database. 2. Deploy the backend (it starts normally before the migration). 3. `alembic upgrade head` (applies `0027`). 4. In **Administrators**, grant the new Play Zone permissions to the staff who need them (super admins already have them). 5. Deploy the frontend. No new environment variables are required; optional `PZ_ADMIN_RATE_LIMIT_MAX` / `PZ_ADMIN_RATE_LIMIT_WINDOW_SECONDS` tune admin write limits. Play Zone media uses the existing `MEDIA_BUCKET` Supabase configuration.

## 8. Tests actually executed

`pytest tests/test_play_zone_admin.py tests/test_play_zone.py` (SQLite + pure code): access control and permissions for every endpoint, game switches and the running-session policy, configuration validation/versioning, player directory/search/pagination/privacy, suspension, score moderation and ranking recalculation, flagged-score approval, achievement and challenge CRUD/rules/scheduling, media upload/replace/delete rules, analytics accuracy, date filters, CSV safety, settings persistence/confirmation/enforcement, audit logging, rate limiting, and the offline PostgreSQL SQL of migration 0027 (upgrade and rollback). The migration was **not** run against a live PostgreSQL, and the existing backend suites that need a local PostgreSQL were not run here.
