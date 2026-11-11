# LAX360 Pvt Ltd — backend

FastAPI + PostgreSQL + SQLAlchemy 2 + Alembic. Real login (HttpOnly cookie sessions), profile, branches, demo requests,
contact enquiries, and an AI assistant that calls the **OpenAI Responses API** from the server.

Versions are pinned in `requirements.txt` (Python 3.12 tested; 3.11+ should work).

## 1. Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt   # use requirements.txt in production
copy .env.example .env            # then edit .env (never commit it)
```

### PostgreSQL
**Supabase is the intended database - see "Database: Supabase PostgreSQL" below.** Any PostgreSQL 14+ also works. Create an empty database and a user, then put the URL in `.env`:
`DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME`.
No PostgreSQL installed? For **local development only**: `python scripts/local_postgres.py start` starts a throwaway server
(stored in `.pgdev/`) and prints the URL; `python scripts/local_postgres.py stop` stops it.

### Required `.env` values
`DATABASE_URL`, `AUTH_SECRET` (32+ random chars: `python -c "import secrets; print(secrets.token_urlsafe(48))"`),
`AI_PROVIDER` (`gemini` by default, or `openai`) and the key + model of **the selected provider only**:
`GEMINI_API_KEY` + `GEMINI_MODEL` for Gemini, or `OPENAI_API_KEY` + `OPENAI_MODEL` for OpenAI. No model name is assumed.
Everything else has a safe default; see `.env.example`. Production also needs `APP_ENV=production`, `COOKIE_SECURE=true` and
https `CORS_ORIGINS`/`FRONTEND_ORIGIN`; the app refuses to start with an unsafe production configuration.

### Migrate and create the first admin
```bash
alembic upgrade head              # creates the schema and seeds Salem, Bangalore, Mumbai (non-destructive)
python -m app.cli create-user --email you@example.com --name "Your Name" --role admin   # prompts for a password
```
There is no public sign-up and no default account. Regular users are created the same way (`--role user`).
`python -m app.cli set-password --email …` resets a password; `python -m app.cli purge-chats` deletes expired chats.

### Run
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive API docs (development only): http://localhost:8000/api/docs. Health: `/api/health`, readiness: `/api/health/ready`.

## Database: Supabase PostgreSQL

The backend talks to PostgreSQL directly (SQLAlchemy 2 + `psycopg` 3 + Alembic). Supabase is just the PostgreSQL host, so **no
Supabase API keys are needed or used** (`SUPABASE_URL`, anon key and service-role key do not exist in this project, and must never be
placed in the frontend). Nothing has been created in your Supabase project yet: you run the schema below.

### 1. Create the project and find the connection string
1. https://supabase.com -> **New project**. Choose a region near your users and set a **database password** (save it; you can reset it
   under Project Settings -> Database).
2. When the project is ready, click **Connect** (top of the dashboard) -> **Connection string** -> type **URI**.
3. Which one to copy:
   - **Session pooler** (host `aws-0-<region>.pooler.supabase.com`, port **5432**, user `postgres.<project-ref>`): works on any network (IPv4).
     **Recommended for local development and for running migrations.**
   - **Direct connection** (host `db.<project-ref>.supabase.co`, port 5432, user `postgres`): fine if your network supports IPv6.
   - **Transaction pooler** (port **6543**): for serverless/many short connections. Supported (prepared statements are switched off
     automatically), but use port 5432 for `alembic upgrade head`.
4. Paste it into `backend/.env` as `DATABASE_URL=...`, replacing `[YOUR-PASSWORD]` with your password. **URL-encode special
   characters** in the password (`@` -> `%40`, `:` -> `%3A`, `/` -> `%2F`, `#` -> `%23`). `postgresql://` is converted to the
   `psycopg` driver URL automatically, and `sslmode=require` is added for Supabase hosts.

### 2. Create the tables (choose ONE way)
- **Recommended:** `alembic upgrade head` (applies migrations 0001 tables + seeded branches, 0002 row-level security).
- **Or in the dashboard:** open **SQL Editor -> New query**, paste the whole of `backend/sql/supabase_schema.sql`, **Run**. Use this on an
  empty database only, and do not also run Alembic on the same database. (`python scripts/export_sql.py` regenerates the file; a test fails if it is stale.)

Then create your admin user: `python -m app.cli create-user --email you@example.com --name "Your Name" --role admin`.

### 3. Test the connection
```powershell
python -m app.cli check-db          # real connection; prints target (no password), server, migration revision, tables, RLS status
uvicorn app.main:app --reload --port 8000
# in another terminal, or in the browser: http://localhost:8000/api/health/ready   -> {"database": "ok", ...} only after a real SELECT 1
```
`/api/health` and `/health` never touch the database; `/api/health/ready` does (and returns 503 with `"database": "unreachable"` on failure).

### Homepage background videos: permanent storage (Supabase Storage)
Render's disk is **temporary** (wiped on every restart, redeploy and spin-down), so videos must live in Supabase Storage. On Render set:
`SUPABASE_URL=https://<project-ref>.supabase.co` and `SUPABASE_SERVICE_ROLE_KEY=<service_role key>` (Project Settings -> API; **backend only**, never in the frontend or Vercel). and `SUPABASE_VIDEO_BUCKET=lax360-videos` (the bucket name; `HERO_VIDEO_BUCKET` is accepted too; default `lax360-videos`).
- The bucket is created **public** on the first upload (visitors play the video straight from the storage CDN); the service key is only used by the backend. If you create it yourself: Storage -> New bucket -> `lax360-videos` -> turn on **Public bucket** -> Create. No other storage policies are needed (uploads/deletes use the service key; RLS stays on).
- An upload only counts as successful after the backend has **verified** the object exists in the bucket and is publicly readable (size checked); otherwise the new object is removed, no record is saved and the admin sees why. A database row is never treated as proof that a file exists.
- **Deletion only happens when an authorized admin confirms it** (Delete -> confirm). Refreshing, logging out, deactivating, reordering, changing the schedule, a restart or a redeploy never delete a video. Deleting marks the record, removes the stored file, and only after the file is confirmed gone drops the record; if storage refuses, the record is kept as a pending deletion ("Deletions that did not finish") that can be retried or restored. Every step is in the audit log.
- Admin -> Homepage Videos shows per video: file status (verified/missing/error + time + reason), where it is stored, the last playback result reported by visitors, availability window and fallback. **Check files** re-verifies everything; a missing file is skipped (never deleted) and you can re-upload it with **Replace file**. The star marks the single **fallback video** that plays only when no scheduled video is eligible.

**Recovery commands** (run in `backend/`; none of them deletes anything):
```powershell
python -m app.cli hero-videos-report --json > videos-metadata-backup.json   # metadata backup + which stored files exist
python -m app.cli hero-videos-report --verify                               # also records the check on each video
python -m app.cli hero-videos-selftest                                      # REAL Supabase test: config, bucket, upload, public read, delete (one temporary file; add --create-bucket to create a missing public bucket)
python -m app.cli hero-videos-migrate                                       # dry run: videos still on the server disk
python -m app.cli hero-videos-migrate --apply                               # copy them to Supabase, verified, local file left in place
```

**Exact setup (once):**
1. Supabase dashboard -> *Storage* -> *New bucket* -> name `lax360-videos` -> switch **Public bucket** on -> *Create bucket*. (Optional: bucket settings -> *Restrict file size* 50 MB and allowed types `video/mp4, video/webm, image/jpeg, image/png, image/webp`. The backend also creates the bucket itself on the first upload if it is missing.) Also check *Storage -> Settings -> Global file size limit* is at least 50 MB (the backend's limit is `HERO_VIDEO_MAX_BYTES`, 50 MB).
2. Supabase -> *Project Settings -> API*: copy the **Project URL** and the **service_role** secret (not the anon key).
3. Render -> your backend service -> *Environment*: add `SUPABASE_URL` (the Project URL), `SUPABASE_SERVICE_ROLE_KEY` (the service_role key) and `SUPABASE_VIDEO_BUCKET=lax360-videos`; leave `HERO_VIDEO_DISK_IS_PERSISTENT` unset; *Save, rebuild and deploy*.
4. Admin -> Homepage Videos: the amber "Videos may disappear" warning is replaced by a green **Permanent storage is working** note once the backend has really reached the bucket with the key (it checks the bucket, its public flag and the key; press **Check files** to re-check). If something is wrong the warning names it (key rejected, bucket missing or private, Supabase unreachable). The backend log says the same.
5. Videos that were uploaded before are listed in an amber note **"N videos must be uploaded again"** (they exist only on Render's disk, or are already lost): on each one press **Replace file** and choose the video again. Its place in the queue, schedule and fallback flag are kept, and the file now goes to Supabase.

**Restart test (proves permanence):** upload a video, confirm it plays on the homepage and in Admin, note its title and the "Stored permanently (lax360-videos)" label. Render -> *Manual Deploy -> Clear build cache & deploy* (or *Restart service*). When it is back, reload the homepage and Admin -> Homepage Videos -> **Check files**: the video must still play and show "verified". In Supabase -> Storage -> `lax360-videos` the object is listed throughout.

### Security notes for Supabase
- **Row-level security is enabled on every table (migration 0002) with no policies**, and the `anon`/`authenticated` API roles are
  stripped of table privileges. Supabase otherwise exposes `public` tables through its REST API using the public anon key. The backend
  is the table owner and is not affected by RLS. Never add `FORCE ROW LEVEL SECURITY`, and when you add tables in future migrations, add
  `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for them too.
- The database password lives only in `backend/.env` (git-ignored). Use a separate Supabase project for production and rotate the password if it ever leaks.
- Least privilege: for production consider a dedicated database role for the app instead of the `postgres` owner (then run migrations as the owner).

### Troubleshooting (`python -m app.cli check-db` prints a hint)
| Symptom | Likely cause / fix |
|---|---|
| `DATABASE_URL is not set` | Edit `backend/.env`; run commands from the `backend` folder. |
| `password authentication failed` | Wrong password, or special characters not URL-encoded. Reset it in Project Settings -> Database. |
| `Tenant or user not found` | Pooler user must be `postgres.<project-ref>` and the host the exact region host shown in **Connect**. |
| `could not translate host name` / hangs | Typo in host, or direct host on an IPv4-only network: use the **Session pooler** string. |
| `timeout` / `connection refused` | Firewall or VPN blocking port 5432/6543; wrong port. |
| `prepared statement ... does not exist` | You are on port 6543 with prepared statements on: set `DB_DISABLE_PREPARED_STATEMENTS=true` or use 5432. |
| `Tables MISSING` / `Row-level security OFF` | Run `alembic upgrade head` (or the SQL file) on this database. |
| `remaining connection slots are reserved` | Too many connections: lower `DB_POOL_SIZE` / `DB_MAX_OVERFLOW`, or use the pooler. |

## 2. Frontend
From the repository root: `npm install && npm run dev`. Vite proxies `/api` to `http://localhost:8000`
(override with `DEV_API_PROXY_TARGET`), so the browser sees one origin. `VITE_API_BASE_URL` stays empty unless the API is on a
different host; it must hold only a URL, never a secret.

## 3. API summary
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Profile | `GET/PATCH /api/users/me`, `POST /api/users/me/password` |
| Branches | `GET /api/branches` |
| Demo | `POST /api/demo-requests` (login), `GET /api/demo-requests/me` |
| Contact | `POST /api/contact` (public, rate-limited) |
| Chat | `POST /api/chat` (public, rate-limited) |
| Admin | `GET/PATCH /api/admin/demo-requests`, `GET/PATCH /api/admin/contact-enquiries`, `GET /api/admin/ai-usage` |

Errors always use `{"error": {"code", "message", "fields"?}}`.

## 4. Authentication design
Opaque random session token in an **HttpOnly, SameSite** cookie (Secure in production); only its keyed hash is stored
server-side, so sessions can be revoked and a database leak reveals no live tokens. State-changing requests need the
`X-CSRF-Token` header (returned by login/`me`, kept in memory by the frontend — nothing sensitive in localStorage).
Passwords use argon2id. Login is rate-limited. Cookies with `SameSite=lax` need the site and API on the same registrable
domain (ideally one origin through a reverse proxy routing `/api`); a separate cross-site API needs `COOKIE_SAMESITE=none`
plus `COOKIE_SECURE=true` and exact `CORS_ORIGINS`.

## 5. AI assistant (Gemini now, OpenAI later)
Layout: `app/providers/{base,gemini_provider,openai_provider}.py` (one class per provider behind the `AIProvider` interface),
`app/services/ai_service.py` (selects the provider from `AI_PROVIDER`), `app/services/chat_service.py` (validation, sessions,
bounded context, usage, errors), `app/knowledge/lax360_knowledge.py` (verified company facts + assistant instructions).

- **Gemini** uses the official Google Gen AI SDK (`google-genai`, `client.aio.models.generate_content`).
- **OpenAI** uses the official `openai` SDK and the Responses API (`store=False`). It is implemented for configuration-based
  selection but has **not** been tested with real credentials.
- Exactly one provider is used. A failure is returned as an error (502/503/504/429 with a safe message); the app never
  silently switches provider and never returns a fake answer. Gemini mode does not need, import-time check or call OpenAI.
- Safe client messages; server logs hold only provider, status, latency, token counts. Prompt/reply text and keys are never logged.
- The model only returns text. Links and follow-up chips come from fixed server rules; it has no tools and cannot submit forms,
  book demos or send email. Client-supplied `history` accepts only `user`/`assistant` roles (max 20 items, 1000 chars each), is
  used only to seed a brand-new conversation, and is never stored; the system prompt is built server-side.
- Context: conversations are stored in PostgreSQL (`chat_sessions`/`chat_messages`), keyed by an id plus a secret token returned
  once. Only the last `CHAT_CONTEXT_MESSAGES` go to the model; `CHAT_MAX_MESSAGES_PER_SESSION` caps a conversation; rows expire
  after `CHAT_RETENTION_DAYS` (`python -m app.cli purge-chats`). Rate limiting is per client IP and **in memory per process**
  (put a gateway/Redis limit in front before running several instances). Application-side limits complement, not replace,
  spending limits in your Google/OpenAI account.

### Getting a Gemini key and choosing a model
1. Open https://aistudio.google.com/apikey, sign in, **Create API key** (choose or create a Google Cloud project).
2. Put it in `backend/.env` as `GEMINI_API_KEY=...` (never in the frontend, never in Git).
3. Pick a model id from https://ai.google.dev/gemini-api/docs/models and set `GEMINI_MODEL=<that id>`. Model availability and
   free-tier limits change, so check the page; if the id is wrong the API returns an error (`provider_bad_request`, see logs).
4. `AI_PROVIDER=gemini`, restart the server.

### Trying the chat in Swagger
Start the server, open http://localhost:8000/api/docs → `POST /api/chat` → **Try it out** with
`{"message": "What services do you provide?"}` → Execute. The response has `reply`, `conversation_id`, `provider`, and (the
first time) `session_token`. For a follow-up, send `{"message": "...", "conversation_id": "<id>", "session_token": "<token>"}`.
`GET /health` (no database, no AI call) and `GET /api/health/ready` (database + whether the selected provider is configured —
booleans only) are free to call.

### Switching to OpenAI later
Set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_MODEL`, restart. No frontend change is needed (same `/api/chat` contract).

### Production CORS
`CORS_ORIGINS=https://www.your-domain.com` (comma-separated, exact origins, https, never `*`) and `FRONTEND_ORIGIN` the same.
CORS only controls which browsers may read responses; it is not authentication. Abuse is limited by rate limits, input limits
and the provider budget.

## 6. Tests
```bash
python -m pytest              # PostgreSQL is started automatically (pgserver) unless TEST_DATABASE_URL is set
```
`TEST_DATABASE_URL` must name a database containing "test" (tables are truncated). The suite applies the real Alembic
migration. OpenAI is faked (plus the real SDK against a mocked HTTP transport); no test needs a key.

### Live provider tests (optional, one real call each)
```powershell
# Gemini
$env:RUN_GEMINI_INTEGRATION="1"; $env:GEMINI_API_KEY="<key>"; $env:GEMINI_MODEL="<model>"
python -m pytest tests/test_gemini_live.py -s
# OpenAI
$env:RUN_OPENAI_INTEGRATION="1"; $env:OPENAI_API_KEY="<key>"; $env:OPENAI_MODEL="<model>"
python -m pytest tests/test_openai_live.py -s
```
Until a live test has passed on your machine, treat that provider as **unverified**.
`scripts/mock_openai_server.py` is a canned local stand-in used only for UI testing with `OPENAI_BASE_URL`.

**Windows/OneDrive tip:** the test database's files live in your temp folder (`LAX360_PGTEST_DIR` to change), because a
PostgreSQL data directory inside a synced folder (OneDrive) can make start-up very slow.

## 7. Production deployment
See "Production deployment" in the repository's root README for the full step-by-step list. Backend specifics:
`python -m app.cli check-config` (which required values are set), `check-db` (real connection, tables, row-level security),
`purge-chats` / `purge-sessions` (daily). `/health` is the liveness probe (no database, no AI call); `/api/health/ready`
checks the database. Interactive docs are off in production. `backend/Dockerfile` is provided but untested.

## 8. Known gaps
No email delivery; no password-reset flow; no admin web UI (API only); the first requests can be slow on machines where
password hashing is heavy (argon2 parameters can be tuned in `app/core/security.py`).

## Admin panel API
All under `/api/admin/*`, all requiring a signed-in **admin** (with the module's permission) or **super admin**; every state-changing call also needs the `X-CSRF-Token` header.
`GET /me`, `GET /dashboard`, `/enquiries` (list, detail, `PATCH`, `/notes`, `/archive`, `DELETE`, `/export.csv`, `/assignees`), `/demo-requests`, `/content/{kind}` + `/content/item/{id}`, `/settings`,
`/chatbot/settings|conversations|usage`, `/media` (raw-body upload: `POST /media?filename=x.png`), and super-admin only: `/users`, `/audit-logs`, `/system`, `POST /system/test-ai`.
Public, read-only: `GET /api/public/site`, `GET /api/public/content?kind=faq|hero|project`, `GET /api/media/{id}` (public files only). Interactive docs: `/api/docs` in development.
New environment variable: `MEDIA_MAX_BYTES` (default 2097152).
