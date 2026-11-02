# LAX360 Ventures

```
.
├── frontend/   React + Vite website (JavaScript/JSX, Tailwind v4)  — its own package.json, node_modules, .env
├── backend/    Python FastAPI API (PostgreSQL, SQLAlchemy, Alembic, OpenAI) — its own venv, requirements, .env
└── .claude/    editor/agent launch configuration
```

The two apps are independent: separate dependencies, separate environment files, run in separate terminals.
The browser only ever talks to the backend through `/api/...`; no secret is ever placed in the frontend.

## Prerequisites
Node.js 20+ and npm; Python 3.11+ (3.12 tested); a PostgreSQL database you administer.

## 1. Backend (terminal 1)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1            # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt     # production: requirements.txt
copy .env.example .env                  # then fill in backend\.env — see below
alembic upgrade head                    # create tables, seed branches
python -m app.cli create-user --email you@example.com --name "Your Name" --role admin
uvicorn app.main:app --reload --port 8000
```
API docs (development only): http://localhost:8000/api/docs. Health: http://localhost:8000/api/health.
Values to set in `backend/.env`: `DATABASE_URL`, `AUTH_SECRET`, `AI_PROVIDER` (gemini by default), and `GEMINI_API_KEY` + `GEMINI_MODEL` (or the `OPENAI_*` pair if you switch)
(full list and meaning in `backend/.env.example`). No PostgreSQL? For local development only:
`python scripts/local_postgres.py start` prints a `DATABASE_URL`.
More detail, security design and deployment: [backend/README.md](backend/README.md).

## 2. Frontend (terminal 2)
```powershell
cd frontend
npm install
copy .env.example .env.local            # optional: VITE_SITE_URL, VITE_WHATSAPP_NUMBER (public values only)
npm run dev                             # http://localhost:5173 — proxies /api to http://localhost:8000
```
`npm run build` produces the prerendered production site in `frontend/dist`; `npm run preview` serves it.
`VITE_API_BASE_URL` stays empty to call the same origin (dev proxy / production reverse proxy); set it only if the API is
on another host. It may contain a URL only, never a secret. Details: [frontend/README.md](frontend/README.md).

## 3. Tests
```powershell
cd backend ; python -m pytest           # real PostgreSQL (started automatically), OpenAI faked
cd frontend ; npm run build             # production build + prerender is the frontend check
```

## Admin panel

Open **`/company-admin/login`** (development: http://localhost:5173/company-admin/login; the old `/admin/...` URLs redirect there). Every action is authorised **on the server**;
hiding a menu item in the UI is only a convenience.

### Initial super admin from `backend/.env`
Set `ADMIN_EMAIL`, `ADMIN_USERNAME` and `ADMIN_PASSWORD` (8+ characters, chosen by you) in `backend/.env`, then restart the backend (or run `python -m app.cli provision-admin`).
The account is created once, with a hashed password; sign in at `/company-admin/login` with the email **or** the username. While `ADMIN_PASSWORD` is empty or too short nothing is created
and the login page tells you so (development only). An existing account is never changed implicitly: use `provision-admin --reset-password` or `--promote` deliberately.
After the account exists you can remove `ADMIN_PASSWORD` from the file. Run `alembic upgrade head` first (migration 0004 adds the username column).

### Or create it by hand (once, from the `backend` folder)
```powershell
python -m app.cli create-user --email you@example.com --name "Your Name" --role super_admin   # prompts for a password (8+ characters)
```
After that, sign in and create further administrators from **Administrators**. Staff accounts with limited access can also be made on the command line:
`python -m app.cli create-user --email staff@example.com --name "Staff" --role admin --permissions enquiries,content`.
There is no default account and no public way to become an administrator. If a password is forgotten, a super admin resets it in the panel
(there is no email-based reset because the site sends no email); if no super admin can sign in, use `python -m app.cli set-password --email ...`.

### Two separate sign-in systems
| | Public website | Company admin |
|---|---|---|
| Who | Customers and visitors (role `user`, a.k.a. public user) | LAX360 staff (roles `admin` / `super_admin`, a.k.a. company admin) |
| Pages | `/login`, `/register`, `/user/dashboard` (`/profile` redirects) | `/company-admin/login`, `/company-admin/dashboard`, `/company-admin/homepage-videos`, `/company-admin/settings`, ... |
| API | `POST /api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/users/me` | `POST /api/admin/auth/login`, `GET /api/admin/auth/session`, `POST /api/admin/auth/logout`, every `/api/admin/*` call |
| Session cookie | `lax360_session` (path `/`, 12 h) | `lax360_admin_session` (path **`/api/admin`**, 8 h): never sent to public endpoints |
| Sign-up | Anyone can register; the account is always a customer (the request has no role field) | None. Created by a super admin, the `ADMIN_*` bootstrap or the CLI only |

Sessions carry a `realm` (`public` or `admin`) in the database and only work in their own realm, so a customer session can never open admin APIs, an admin session can never act as a customer, and logging out of one leaves the other alone.
Staff credentials entered on the public login are refused (they get no website session) and customer credentials entered on the admin login get the same "incorrect email/username or password" as a wrong password. Every admin API checks the role **and** the module permission on the server; frontend route guards only decide what is shown.
Existing roles were kept (`user`, `admin`, `super_admin`) rather than renamed, so existing accounts and data are untouched. Migration `0006` only adds `auth_sessions.realm`; staff must sign in again once through the admin login.

### Roles
| Role | Can do |
|---|---|
| **Super admin** | Everything: all modules, administrators and permissions, audit log, system status. The last active super admin can never be removed or demoted. |
| **Admin** | Only the modules a super admin ticked: Customer enquiries, Demo requests, Website content, AI chatbot, Media library, Website settings. Cannot manage administrators, see the audit log or system status, or change their own permissions. |
| Customer | Website visitor with an account: no admin access at all. |

### Modules
- **Dashboard**: live counts and charts from the database (enquiries, demo requests, customers, chatbot conversations, AI errors), date filter, status distribution, recent activity.
- **Enquiries**: search (name, email, phone, type), filter (status, dates, archived), sort, paginate; status workflow New → In progress → Contacted → Converted → Closed; assign to an admin; internal notes; archive; delete (with confirmation); CSV export of the filtered list.
- **Demo requests**: search/filter and status updates.
- **Website content**: hero text and buttons (home page), FAQ entries (home/services and academy pages), projects (Work page): create, edit, preview, publish, unpublish, delete. If nothing is published the website keeps its built-in text.
- **AI chatbot**: switch on/off, welcome message, fallback message, extra business information for the assistant, conversation history (search/filter, viewing is audited), usage and failure review. Provider and model are shown read-only; they are set in the server environment, and API keys are never shown or editable.
- **Media**: upload PNG/JPEG/GIF/WebP/PDF (checked by their real bytes, max `MEDIA_MAX_BYTES`, default 2 MB), preview, replace, delete, public/private. Files live in the database and are private unless made public.
- **Settings**: contact email/phones, WhatsApp number, social links, footer line, About tagline, contact-form switch and notice, maintenance mode.
- **Administrators**, **Audit log** (append-only; the database itself refuses edits and deletes), **System status** (“Connected” only after a real check).

### What the public website reads from the panel
Contact details and social links (footer, contact pages, mobile menu, chat panel, WhatsApp button), footer legal line, About tagline, the home hero, FAQ lists,
the Work page projects, chatbot on/off and welcome text, contact-form switch/notice and maintenance mode. Everything else (services, solutions, courses, About body text,
testimonials) is **not** managed from the panel yet and still lives in `frontend/src/data/`.

### Welcome intro
Every time the homepage (`/`) is loaded or refreshed in the browser, it opens with a ~10 second welcome animation (nothing is stored in session or local storage, so a refresh always replays it from the beginning; moving between pages inside the site never restarts it). The LAX360 mascot walks in and waves, **"WELCOME TO LAX360!"** is revealed letter by letter (the mascot hops with it), the mascot pulls the official shield logo to the centre on a rope, the logo bounces and settles with a glow, then 26 service icons (software, AI, AI tools, digital marketing, CAD) rain down, bounce and settle in rows in front. Finally the logo flies into the header and the homepage (background video, heading, text, buttons) is revealed, without a page reload.
- It uses only the existing files `frontend/public/assets/mascot-welcome.webp` and `logo-shield.png`, unmodified (nothing is redrawn or duplicated). Both are static images, so the movement is whole-image transforms (walk bob, lean, squash, hop) plus a drawn rope and light effects. A rigged or pre-rendered video of the mascot would be needed for real arm and face acting.
- Icons: Lucide (already in the project) for general concepts; official vector marks for Claude, Google Gemini, Cursor, GitHub Copilot, Google Ads and Meta from the CC0 `simple-icons` package (the marks remain their owners' trademarks). ChatGPT/OpenAI has no mark in that package, so it uses a generic Lucide chat icon rather than a redrawn logo. The list is in `frontend/src/components/intro/introIcons.js`.
- Physics: each icon follows closed-form gravity with soft bounces (38% restitution), tumble, and squash on impact, as a pure function of time; positions are written straight to the DOM each frame (26 elements, transforms only).
- Not shown for visitors who prefer reduced motion or data saving, never on `/login`, `/register`, `/user/dashboard` or `/company-admin/*`, and only when the page load itself is the homepage. **Skip intro** (or Esc) shows the homepage at once; the footer link **Replay welcome intro** plays it again without reloading.
- It loads as a separate chunk (fetched at start-up in parallel with React) and preloads only the two brand images; if either fails to load within 3 seconds the intro is skipped. While it plays, scrolling is locked and the page underneath is inert.
- Code: `frontend/src/components/intro/WelcomeIntro.jsx` (animation), `introIcons.js`, `frontend/src/utils/welcomeIntro.js` (state), the small inline script in `frontend/index.html` (holds the page back before first paint) and a few lines in `frontend/src/styles/index.css`. In development, `/?introT=4100` freezes the animation at that millisecond for inspection.

### Homepage background videos
**Admin → Homepage videos** (`/company-admin/homepage-videos`; super admins, or admins who were given the *Homepage videos* module).
- Upload one or more **MP4 (H.264) or WebM** files (default limit 50 MB, 1 second to 30 minutes; a short silent loop of 10-30 s at 1080p or less works best). The server checks the real file content, size and duration, and the page checks the video plays in the browser. A poster frame is taken automatically.
- **Files are stored on disk, not in the database** (`HERO_VIDEO_DIR`, default `backend/storage/hero_videos`, Git-ignored). The database holds only titles, order, status and the schedule.
- **Schedule:** every active video gets one slot (default **3 days**) and loops continuously during it; then the next video in the queue takes over, and after the last one the queue repeats (switchable). Slots are counted from a saved schedule in the server timezone (`APP_TIMEZONE`, default `Asia/Kolkata`, midnight boundaries), never from when a visitor arrives, so refreshing never restarts it.
- **Edits never interrupt the playing slot:** uploading, reordering, switching videos on/off or changing the slot length only affect what comes *after* the current slot. If the playing video is switched off, deleted or its file goes missing, the next video takes over immediately and the rotation carries on; with no video the homepage shows its built-in animated background. A single active video simply keeps looping.
- The homepage asks `GET /api/public/hero-video` after it has rendered, again when the slot ends and at least every 10 minutes, then cross-fades to the new video without a reload. Only the playing and the next video can be fetched publicly. Reduced-motion and data-saver visitors get the poster image only.
- Production: mount a **persistent volume** at `HERO_VIDEO_DIR` (the Docker image declares `/srv/storage`); files on an ephemeral disk disappear on redeploy. Serve large files through your reverse proxy with Range requests enabled and raise its body-size limit above `HERO_VIDEO_MAX_BYTES` for `/api/admin/hero-videos` (see `deploy/nginx.conf.example`).
- Testing rotation quickly (development only): set `HERO_VIDEO_SLOT_SECONDS=90` in `backend/.env`, upload videos, watch the homepage switch every 90 seconds; remove it afterwards.

### Database changes
Migration `0005` adds `hero_videos` and `hero_video_config` (homepage videos; metadata only). Migration `0003` adds the role `super_admin`, per-admin permissions, enquiry workflow columns, and the tables `enquiry_notes`, `site_settings`, `content_items`,
`media_assets` and `audit_logs` (all with row-level security on). On a database that already has migrations 0001–0002 (e.g. your Supabase project) run **`alembic upgrade head`**:
it applies only 0003. Use `backend/sql/supabase_schema.sql` only on an *empty* database.

## Secrets and Git
`.env` files are git-ignored in the root, `frontend/` and `backend/`; only the `*.example` templates are committed.
Never put the OpenAI key, database password or `AUTH_SECRET` in a `VITE_` variable or in frontend code.

## 4. Production deployment (manual — nothing is deployed automatically)

**Recommended layout:** one domain. A reverse proxy serves the built website and forwards `/api/*` to the backend, so the login
cookie and CSRF protection work without cross-site settings. An example is in [deploy/nginx.conf.example](deploy/nginx.conf.example)
(untested here). Any host works as long as `/api` reaches the FastAPI app on the same domain.

1. **Supabase:** create the project, copy the **Session pooler** connection string, and apply the schema once: `alembic upgrade head`
   (or paste `backend/sql/supabase_schema.sql` into the SQL editor on an empty database). Details: [backend/README.md](backend/README.md).
2. **Backend settings** (on the server's secret store / environment, never in Git). Set at least:
   ```
   APP_ENV=production
   DATABASE_URL=<Supabase connection string>
   AUTH_SECRET=<new random 48+ char value for production>
   COOKIE_SECURE=true
   FRONTEND_ORIGIN=https://<your-domain>
   CORS_ORIGINS=https://<your-domain>
   TRUST_PROXY_HEADERS=true          # only behind your own reverse proxy
   AI_PROVIDER=gemini
   GEMINI_API_KEY=<key>   GEMINI_MODEL=<model id>
   CHAT_DAILY_TOKEN_BUDGET=<e.g. a limit you are comfortable with>
   ```
   The app **refuses to start** in production with a weak secret, insecure cookies, `*`/http CORS origins or no database. Check:
   `python -m app.cli check-config` then `python -m app.cli check-db`.
3. **Install and run the API** (Python 3.11+):
   ```bash
   cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
   alembic upgrade head
   python -m app.cli create-user --email you@yourdomain.com --name "Your Name" --role admin
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --proxy-headers
   ```
   Run it under a process manager (systemd, a container — see `backend/Dockerfile`, untested — or your platform's runner) so it restarts.
   Keep **one worker**, or accept that the in-memory rate limits multiply by the number of workers/instances.
4. **Build the website** with your real domain (it is baked into canonical links, the sitemap and robots.txt):
   ```bash
   cd frontend && npm ci
   SITE_URL=https://<your-domain> VITE_SITE_URL=https://<your-domain> npm run build     # PowerShell: $env:SITE_URL="https://<your-domain>"; ...
   ```
   Leave `VITE_API_BASE_URL` empty (same origin). Copy `frontend/dist/` to the web root. Put your real WhatsApp number in
   `VITE_WHATSAPP_NUMBER` (digits, country code, no `+`) before building.
5. **HTTPS** is required (the session cookie is `Secure`). Use your host's certificates or Let's Encrypt.
6. **Smoke test:** `https://<your-domain>/api/health/ready` shows `"database": "ok"`; log in; submit a test enquiry and demo request;
   send one chat message; log out. Then check the rows appear in Supabase (Table Editor).
7. **Housekeeping:** schedule `python -m app.cli purge-chats` and `python -m app.cli purge-sessions` (daily). Set spending limits on your
   Gemini/Google project. Back up the database (Supabase offers backups per plan). Rotate any key that was ever pasted in chat or email.
