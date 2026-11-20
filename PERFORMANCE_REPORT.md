# LAX360 production performance and admin-login investigation (2026-11-20)

Measurements marked **LOCAL** were taken on this PC (Vite preview of the production build + the local API, which talks to the same Supabase project from about 180 ms away). Measurements marked **PROD** were taken against the live internet. Nothing was deployed, no environment variable was changed, and no production data or file was modified.

## 1. Root causes found (with evidence)

| # | Finding | Evidence | Fixable in code? |
|---|---|---|---|
| A | **The Render backend does not answer HTTP at all.** TCP and TLS to `lax360-ventures.onrender.com` succeed in about 0.4 s, then no response bytes for 100-150 s, on 5 separate attempts over about 15 minutes, including `/health`, which does no database work. The Vercel site itself answers normally. | PROD: `curl` to `/health` and `/api/health/ready`: connect 0.06-0.17 s, TLS 0.1-0.4 s, then timeout with 0 bytes (90 s, 150 s, 3 x 100 s). | **No.** A healthy sleeping free instance wakes in about 30-60 s. Five minutes of silence means the service is suspended, crash-looping at start-up (for example `validate_for_production` refusing an unsafe setting, a failed `alembic upgrade`, a bad `DATABASE_URL`) or not deployed. Render's Logs and Events tab shows which. |
| B | **A fixed 20 s timeout is shorter than a cold start**, so "The server took too long to respond" appears even when the backend is only asleep. The login screen had no waking or retry behaviour. | `apiClient.js` `timeoutMs = 20000`; Render free instances need roughly 30-60 s to start. | Yes (fixed below). Cold starts themselves cannot be removed by the frontend. |
| C | **Our Team photographs are camera-sized PNG/JPEG originals with no browser caching.** All 36 CMS images in the Supabase `site-media` bucket are PNG (34) or JPEG (2), **55.2 MB in total**; the seven team photos are 0.33-1.8 MB each (about 7.5 MB); the largest image is 4.2 MB. Every one is served with `Cache-Control: private, no-cache` and `CF-Cache-Status: DYNAMIC`, so browsers revalidate every time and the CDN does not hold them. | PROD (Supabase HEAD requests). The URLs are persistent Supabase public URLs: **no localhost URLs and no dependence on Render's disk were found.** | Yes for display and new uploads (below). Existing objects keep their headers until re-uploaded or served through the image optimiser. |
| D | **Layout shift on every page:** the contact bar's height was measured by script after first paint, so everything jumped down 33 px (CLS 0.056), and the assistant greeting bubble resized its container (CLS 0.079). | LOCAL, `/our-team`: CLS **0.135** before. | Yes (fixed). |
| E | Each database round trip costs about 180 ms from this PC (Supabase pooler `aws-0-eu-west-1`, port 6543). A failed login runs 4 queries and takes about 1.6 s warm and about 5.6 s on the first request (new TLS connection to the database); a successful login adds a session insert, an audit insert and a commit. On a healthy backend this is seconds, not a timeout. | LOCAL, repeated `POST /api/admin/auth/login` with a non-existent user. | Partly; the real cost is the distance between Render and Supabase (section 9). |
| F | MongoDB: **no MongoDB code, driver or setting exists anywhere in the project** (only unrelated third-party library strings). It is not an active dependency and nothing needed removing. A leftover `MONGO_URL` in Render's environment, if any, is unused. | Search of all project source for `mongo` and `27017`. | n/a |

## 2. Files modified (this task)
Backend: `backend/app/main.py`, `backend/app/api/routes/public.py`.
Frontend: `services/backendWake.js` (new), `services/apiClient.js`, `services/adminAuthService.js`, `hooks/useAdminAuth.js`, `admin/AdminApp.jsx`, `components/ui/OptimizedImage.jsx` (new), `components/team/TeamBits.jsx`, `LifeCarousel.jsx`, `MemberProfile.jsx`, `pages/Team.jsx`, `pages/TeamDepartment.jsx`, `utils/optimizeUpload.js` (new), `admin/ImageUpload.jsx`, `admin/MediaPicker.jsx`, `components/layout/TopBar.jsx`, `components/chatbot/ChatLauncher.jsx`, `vercel.json`. Plus this file.

## 3. Backend changes
- Start-up no longer waits for the initial-admin database check (it runs in a background thread). The app accepts connections immediately; a slow or waking database used to delay every first request. Local start-up to first answer: 66 ms.
- Every API response carries `Server-Timing: app;dur=...` (visible in the browser's Network panel), and any request slower than 1.5 s is logged as a warning with method, path and duration only (no query string, body, cookie or token).
- Public content responses add `s-maxage=15, stale-while-revalidate=600`: Vercel's CDN can answer from its copy (at most about 15 s old, so an edit still shows quickly) and, while Render is asleep or restarting, keep showing the last copy for up to 10 minutes while it wakes. Browsers still keep a response for 10 s. Only published, public data is affected.
- Already correct and left alone: DB connect timeout (10 s), pool settings, idle-connection check, read-only autocommit sessions, an in-process response cache, Supabase-aware SSL/pooler arguments, CORS with explicit origins, rate-limited login, argon2id hashing (about 120 ms here).

## 4. Frontend changes
- **Admin login:** a cold-start-aware sign-in. If the request times out, fails, or returns 502/503/504 from the proxy, the screen says "The server is starting up... Ns" and polls `/api/health` (no database work) for up to 2 minutes, then repeats the sign-in once. A wrong password is never retried. If the server never answers it says so plainly (it may be down, not merely asleep). The sign-in request now allows 30 s. The login page also sends one harmless health request on load, so a sleeping server starts waking while the password is typed. This does not shorten a cold start; it removes the false error and shows progress.
- **Layout shift:** the contact-bar height is declared in the HTML (33 px) and measured before paint; the assistant greeting no longer resizes its container.
- **Caching:** hashed `/assets/*.js` and `*.css` are `immutable, max-age=1 year` in `vercel.json`.

## 5. Image changes
- `OptimizedImage` (team hero, leadership, gallery, department, profile and life-carousel pictures): on the production site, Supabase pictures are requested through Vercel Image Optimization (`/_vercel/image`, WebP/AVIF, widths 320-1600, quality 75) with `srcset` and `sizes`. If that URL ever fails it falls back to the original once. It sets explicit `width`/`height`, shows a placeholder until loaded, lazy-loads by default and uses **eager + `fetchpriority=high` for the main visible pictures** (team hero image, first leadership photo, department image). Locally, and for files not on Supabase, the original URL is used unchanged.
- `vercel.json` gains an `images` block (Supabase public-object pattern, 1-year minimum cache).
- New uploads: the admin upload paths shrink PNG/JPEG photographs over 200 KB in the browser (longest side at most 1600 px, WebP quality 0.82, only if at least 20% smaller; GIF, SVG, WebP, PDF and video are untouched). Upload, replace and delete in the admin panel are unchanged.
- The backend already sends `Cache-Control: max-age=31536000` when it uploads, yet the stored objects are served `private, no-cache`. I did not run a test upload against production storage. Run `python -m app.cli storage-selftest` (it writes and deletes one temporary object) and check the response headers to learn whether Supabase ignores that header.
- No team photograph was replaced and no stock photo was added.

## 6. Measurements

LOCAL, `/our-team`, 512 px wide Browser pane, Vite preview (production build), API on localhost using the real Supabase database:

| Metric | Before | After |
|---|---|---|
| Cumulative Layout Shift | 0.135 | **0** |
| First Contentful Paint | 472 ms | 480 ms |
| Largest Contentful Paint | 1768 ms (text; waits for the content API) | 1512 ms |
| `/api/public/content-all` | 1756 ms | unchanged (a remote database costs about 180 ms per query) |
| `/api/public/site` | 1403 ms | unchanged |
| Main JS entry | 509 kB (158 kB gzip) | 509 kB (158 kB gzip) |
| Main CSS | 276 kB (42 kB gzip) | unchanged |
| Three.js / game code on public pages | none (only in the lazy game chunks) | none |

Not measurable locally: the Vercel image optimiser exists only on Vercel, so the **image transfer saving is not measured**. The originals total 55.2 MB; WebP at 320-960 px normally cuts photographs like these by 90% or more, but confirm in production. Interaction to Next Paint was not measured. Lighthouse could not be run here (its download was blocked), so the numbers above come from the browser's own Performance APIs.

PROD: Render `/health` and `/api/health/ready` gave **no response in 90-150 s** (finding A). Admin login time, Team API time and image load time on production could not be measured because the backend does not answer. The Supabase image HEAD results above are production facts.

## 7. Local tests completed
- Frontend production build passes; link audit and SEO audit pass; game rule tests (`npm run test:game`) pass.
- The sign-in waking flow was exercised in the browser with a simulated 504 on login, 504 twice on health, then success: the status text appeared, one retry happened, and the correct final error was shown.
- Our Team page: CLS 0 and no console errors other than the site's existing 401 for signed-out visitors.
- The backend `pytest` suite needs a PostgreSQL that is not available here and **was not run**. `app.main` was imported and exercised with `TestClient` (start-up, `/health`, `/api/health`, login with an unknown user).

## 8. Production checks still pending (need access I do not have)
Render deploy and runtime logs and Events (is the service suspended, failing to boot, or just slow); `GET /api/health/ready` once it answers; a real admin login and its duration; Team API duration; image load times through the optimiser; Vercel Image Optimization enabled on the project (Hobby plan allows 1,000 source images per month; there are 36); the same-site cookie setup described in the README; uploads surviving a redeploy (they are stored in Supabase, so they should).

## 9. Configuration changes required (not applied)
1. **Render:** open the service's Logs and Events and fix whatever stops the app answering (run `python -m app.cli check-config` and `check-db` in the Render shell). Confirm `DATABASE_URL` uses the Supabase **session pooler** host, `APP_ENV=production`, `CORS_ORIGINS` lists the Vercel origin, and `AUTH_SECRET`, `ADMIN_*`, `SUPABASE_*` are set.
2. **Render plan / keep-alive:** a free instance sleeps after about 15 minutes idle. Use a paid always-on instance, or an external uptime monitor pinging `https://lax360-ventures.onrender.com/health` every 5-10 minutes (a work-around, not a fix).
3. **Region:** put Render and Supabase in the same region (the database is in `eu-west-1`); every query pays the distance, and login needs about six.
4. **Vercel:** redeploy so `vercel.json` (images, immutable asset headers) applies; keep `VITE_API_BASE_URL` empty (API through the website's own domain).
5. **Supabase Storage:** optionally re-upload the largest photographs (new uploads are shrunk automatically); the optimiser covers existing ones on the public site.

## 10. Remaining infrastructure limitations
The frontend cannot remove a Render cold start or a crashed service. The Vercel CDN copy (stale-while-revalidate) keeps public pages showing content for up to 10 minutes while the backend wakes, but admin login always needs a live backend. Image optimisation depends on Vercel's optimiser being enabled and within plan limits.
