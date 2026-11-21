# LAX360 Play Zone: release readiness (Milestone 8)

Status: **Not ready: blocking items remain, all operational.** No open critical or high defect is known in the code that was tested, but the Play Zone has never run against the production backend or database, and several required checks could not be executed. Nothing was deployed, committed or pushed.

## 1. Audit summary and prioritised findings

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | High | No React error boundary anywhere: any render error, failed lazy chunk after a deployment, or WebGL start-up failure blanked the whole site | **Fixed** (site-wide boundary + crash page; per-game boundary) |
| 2 | High | No WebGL capability check: `<Canvas>` throws on devices without WebGL | **Fixed** (checked before any 3D code loads; clear message, rest of Play Zone still works) |
| 3 | Medium | WebGL context loss ended the game with "reload the page" | **Fixed** (game pauses; "Restart the 3D view") |
| 4 | Medium | Graphics presets: UI offered Auto/High/Battery saver; `medium` ignored; Auto optimistic on integrated GPUs | **Fixed** (Auto/Low/Medium/High; Auto is conservative: software → Low, integrated/mobile never High) |
| 5 | High (honesty) | FAQ told visitors the games and leaderboards were not live | **Fixed** |
| 6 | Medium | A retried "complete" request lost the new-achievement notice | **Fixed** (outcome re-reports achievements earned by that run) |
| 7 | Medium | Lobby fetched leaderboard, achievements and challenges on load | **Fixed** (loaded when scrolled into view); backend wake-up starts when the Play Zone opens |
| 8 | **Blocking** | Production backend (Render) returns 404 for every `/api/play-zone` route: Play Zone backend, migrations 0026 and 0027 are not deployed | Open: deployment (needs your approval) |
| 9 | **Blocking** | Render cold start: first request after idle took **53.7 s** (later 0.6-0.9 s). This is the cause of "The server took too long to respond" | Open: hosting (paid instance, or keep-alive ping every <= 10 min). The site already wakes the backend and waits honestly; timeouts were not simply raised |
| 10 | Medium | Catch the Stars score is only **bounded** by the server (between the plain total and double, by item counts); it cannot be recomputed because the x2 power-up timing is not sent. The three level games and Puzzle Pop (replay) are recomputed | Documented limitation |
| 11 | Low | Play Zone pages are `noindex` until release approval | Decision for you |

## 2. Four-game testing: what was actually run
* `npm run test:game` (27 rule tests: all 5 Puzzle Pop worlds / 25 levels winnable by a bot, five Bug Hunter levels, Jump levels, Catch scoring): **pass**. These are logic tests, not play-throughs.
* In a browser (Chromium, Intel UHD integrated GPU, WebGL2): **Catch the Stars** loaded lazily, started and ran. **Not browser-tested this session:** LAXBOT Jump, Puzzle Pop, Bug Hunter gameplay, touch controls, virtual joystick, portrait/landscape, fullscreen, Firefox/Safari/Edge, Android/iOS. **No physical-device testing was done.**

## 3. Backend, player system, leaderboards, admin (automated)
75 backend tests pass on SQLite plus pure code (`test_play_zone.py` 32, `test_play_zone_admin.py` 24, `test_play_zone_e2e.py` 5, hero-video URL/retries 14): guest access; verified submission; inflated, impossible, instant, expired, oversized, cross-player and locked-level submissions rejected; duplicate and retried requests idempotent; daily/weekly/all-time and per-game/overall boards; privacy (no e-mail or real name in public responses); achievements and challenges (one award, one claim); admin moderation and ranking recalculation; permissions on every admin endpoint; settings, media, analytics, CSV, audit; the offline PostgreSQL SQL of migrations 0026/0027 (upgrade and rollback).
Frontend: 8 client tests (`npm run test:client`): configuration rules, error boundary, crash page, WebGL check, Vercel rewrites, routes. Build, SEO audit and link audit pass.
**Not run:** the migrations on a real PostgreSQL; the existing backend suites that need a local PostgreSQL; CSRF/cookie behaviour on a live session; admin UI with a real signed-in admin (the ten admin pages were exercised in the browser only against sample data with a stand-in login).

## 4. Security
Verified by reading code and tests: identity only from the server session; admin session cookie scoped to `/api/admin`; HttpOnly + Secure + SameSite cookies and CSRF header; production start-up refuses unsafe settings (short secret, non-HTTPS CORS, wildcard CORS); rate limits per IP and per player; server-side permission checks on every admin route; secrets filtered from audit records. Remaining trust limit: browser games cannot be made tamper-proof; defences are server sessions, plausibility limits, replay (Puzzle Pop), anomaly flags and moderation.

## 5. Performance (measured here, indicative only)
* Three.js is only in lazy game chunks (not loaded on `/` or `/play-zone`). `/play-zone` locally: LCP 744 ms, CLS 0, 277 KB JS transferred.
* Home page locally: LCP was 12.5 s here because the first call to each API endpoint took 2-5 s from this PC to the remote database (warm calls 0.2 s); not measured on production.
* Catch the Stars: 27-46 FPS on an Intel UHD integrated GPU; an idle page in the same browser pane runs about 50 FPS and results varied a lot between runs, so no quality-level comparison is reliable. No "before/after" numbers are claimed. Targets (60/30 FPS) are **unverified**.
* Supabase media: GET returns `public, max-age=31536000` (Cloudflare HIT); valid HTTPS; durable storage configured; Play Zone media uses the same pipeline (never Render's disk). Our Team images and hero video URLs respond 200.

## 6. Database
Migrations 0026 and 0027 are additive (new tables/columns, no drops); FKs, unique constraints and indexes reviewed; RLS enabled on new tables. Never applied to production. Rollback: `alembic downgrade 0026` then `0025` (deletes Play Zone data only).

## 7. Deployment checklist (do not run until approved)
1. Back up Supabase. 2. Deploy backend; run `alembic upgrade head`; confirm `/api/health`, `/api/play-zone/config` 200. 3. Grant the new `pz_*` permissions to the staff who need them. 4. Deploy frontend. 5. Decide Render plan or keep-alive. 6. Remove `noindex` when approved. Environment: no new required variables (optional `PZ_*` rate limits); CORS must list the Vercel origin; `/api/*` rewrite already points to Render.

## 8. Production smoke tests (to run on the live URL after deployment; none done yet)
Homepage; admin login; Our Team images; hero video; Play Zone opens; four games load; guest play; player login; score saves; leaderboard shows real data; achievement unlocks; admin Play Zone modules; mobile layouts; no critical console errors.

## 9. Monitoring recommended
External uptime ping on `/api/health` (also stops cold starts); Render logs (slow requests >1.5 s are already logged without bodies or tokens); Supabase database/storage dashboards; count of `rejected`/`flagged` verdicts from the admin Analytics; a privacy-safe client error report hook can be attached to `ErrorBoundary.onError` (not implemented).

## 10. Rollback
Frontend: redeploy previous Vercel build. Backend: redeploy previous Render build (new tables stay inert). Data: `alembic downgrade` only if Play Zone data may be discarded.
