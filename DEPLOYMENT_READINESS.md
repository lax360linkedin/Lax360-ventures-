# LAX360 — deployment readiness (service structure, themes, performance, layout)

## What is deployed by this release
- **Frontend (Vercel):** revised service structure (3 active + 4 upcoming divisions), database-driven divisions, Theme Builder (37 presets, custom themes, live preview), header fit and mini-bot fixes, performance work, 111 new 301 redirects in `vercel.json`.
- **Backend (Render):** new content kinds (`division`, `division_service`), `custom_themes` setting, cache for partnership/redirect endpoints, WebP conversion of new uploads (needs `Pillow`, already in `requirements.txt`), chatbot knowledge for the new structure, contact-form service catalog, new CLI commands.
- **No schema migration.** Alembic head is 0030 and the production database is already at 0030. Nothing in this release adds a table or column.

## Already done on the production database (from my side, additive and compatible with the version that is live now)
| Step | Result |
|---|---|
| Backup + `python -m app.cli migrate-content` | Backup `backend/backups/content-20261127-110959.json`. Added: 3 service divisions, 53 sub-services (`division`, `division_service`), the Artificial Intelligence upcoming division with its services (36 upcoming items). Marked the `divisions` domain as migrated. Nothing existing was changed. |
| Earlier: `python -m app.cli optimize-media` | All 34 large library pictures converted to WebP (originals kept as private "previous-" items). |
| Earlier: migrations 0029, 0030 | Applied. |

The old frontend ignores the new `division*` rows and shows the new AI division as one more upcoming category, so the live site keeps working until you deploy.

## Do AFTER deploying (not run: it overwrites text an administrator may have edited)
```powershell
cd backend
python -m app.cli refresh-upcoming          # report only
python -m app.cli refresh-upcoming --apply  # writes a backup first
```
It updates the Robotics, CAD and Blockchain upcoming entries (and their sub-services) to the new structure (names, text, "Under Development") and saves three superseded sub-services as drafts. It was blocked by the safety classifier as an overwrite of production content, so it is left for you. Until it runs, those three keep their old text and status "Coming Soon".

## Solutions portfolio (64 solutions, 6 categories, 70 preview images) — added 2026-11-28
Built in code and verified on isolated test databases only; **production has none of it yet** (a dry-run of `attach-solution-images` on production found 0 records, as expected).
- Data: `backend/scripts/build_solutions.py` -> `frontend/src/data/solutions*.json`, `backend/app/seed_data/solutions.json`. Previews: `solution_visuals.py` + `render_solution_images.py` -> `frontend/public/assets/solutions/<slug>.webp` (+ `-800.webp`), labelled Product Interface / Website Design / Solution / Concept Preview (never "screenshot").
- Admin (Website content > Solutions / Solution categories): add, edit, delete, duplicate, reorder, publish/unpublish, bulk actions, preview, thumbnails; main image upload/replace (auto-optimised), gallery, alt text, caption; 10 link fields with button texts (live website, live app, demo, landing page, Play Store, App Store, desktop download, documentation, demo video, custom) validated server-side (placeholders such as example.com or # are refused); 7 availability statuses (Available, Live, Demo Available, Custom, Under Development, Coming Soon, Temporarily Unavailable). Buttons for links appear only for valid links and only for statuses that are launched; under development / coming soon / temporarily unavailable show only "Register your interest".
- Public pages read the database once migrated (cache is dropped on every save); before migration the built-in copy is used.
- Tests: full backend suite passed (two skipped) before the link fields were added; `tests/test_solutions.py` (7) and the rest of the changed tests pass after. Frontend production build, route check and SEO audit: see the report.

### Do AFTER deploying (in this order; each only after the backend and frontend are live)
```powershell
cd backend
python -m app.cli migrate-content                      # backs up first, adds the 6 categories + 64 solutions (idempotent, keeps edits) and uploads the 70 preview pictures to the media library
python -m app.cli attach-solution-images --dry-run     # optional re-check: expect 0 (already attached by the line above)
python -m app.cli refresh-upcoming --apply             # (see above)
```

## Deployment order
1. Deploy the backend (Render) and wait until `/api/health` answers.
2. Deploy the frontend (Vercel).
3. Run `refresh-upcoming` (above).
4. Reload the site twice (the first reload can still show cached content) and check: `/services`, `/artificial-intelligence`, `/robotics`, `/cad-engineering`, `/blockchain`, `/services/software/enterprise-software-solutions`, `/services/headless` (redirects to `/services/software`), the admin pages Services > Service divisions / Division sub-services, Website settings > Appearance (Theme builder).
5. Submit one test enquiry from `/contact` and one upcoming-interest registration; confirm both reach the admin and the Google Sheet.

## Known limits (not blockers)
- Tamil / Hindi: complete as of 2026-11-28.
- Admin edits to the heading of the three designed division pages change SEO text and the generic page; the hero headlines of those three designed layouts are still in the page code.
- Testimonials assigned to the former AI / Headless / Workflow / Mobile service pages need re-assigning to the matching Software & IT Services sub-services.
- Lighthouse mobile scores are about 35-45 in simulation; desktop 60-80. Real-device and hosting limits (Render cold starts, database distance) apply.

## Unified Products page and Admin > Products (2026-11-28)
- **Public /products** is one portfolio: LAX360 products, the live websites (real screenshots, original live links, "View Live Website") and the 64 solutions, filtered by All Products / Software / Web Applications / Mobile Applications / Websites / Headless SaaS & API Solutions / AI Agents & Automation, with search and an availability filter. There is no separate "Solution Portfolio" section. A solution that is the page of an existing LAX360 product is not listed twice. Generated pictures carry a Product Interface / Website Design / Solution / Concept Preview tag; real products and websites carry none. `/solutions` and `/solutions/<page>` still exist (SEO, detail pages).
- **Admin > Products** (sidebar "Products") is the single manager: products, solutions and websites together, with thumbnails, category tabs (from the database, "Manage categories" adds or renames them), availability and published filters, grid/table, search, New product / New solution / New website, edit (content, main image, gallery, link fields and button texts, availability, CTA, SEO), publish/unpublish, duplicate, reorder inside a category, delete. The separate Solution portfolio sidebar entries were removed (the kinds also appear under Website content > Products).
- Products got a "Portfolio category" choice (default mapping built in) and the same link fields as solutions (live website / application, landing page, stores, download, documentation, demo video, custom); buttons show only for valid https links on Live/Beta products.
- Verified in a browser on an isolated copy (in-memory database, local media, nothing of production touched): 84 public items (21 websites with live links), filters, 96 admin records, product edit with a live link saved and shown as a button after reload.
- `migrate-content` now also loads the website portfolio when it is empty, and uploads the 70 preview pictures.

## Why the Solution Portfolio is not in your Admin Panel yet (checked 2026-11-28)
The live Admin Panel is the old build and the live database has no solution rows: both arrive only with the deploy + `migrate-content`.

## Final verification (2026-11-28, last run on the final code)
| Check | Result |
|---|---|
| Full backend suite (real PostgreSQL, `pytest tests`) | All tests passed, no failures (a few skipped by design). |
| Frontend production build + prerender | Passed. |
| Route / rewrite check | 204 routes, 209 alias redirects, 26 rewrites: no problems. |
| SEO audit | No problems found. |
| Internal link check | No broken internal links. |
| Browser test of Admin > Products (isolated: temporary SQLite file, local media folder, storage credentials blanked; production database and Supabase never touched) | Create product, edit, picture upload (cover image, logo), picture replace, duplicate, publish / unpublish (hidden / shown on the public API at once), grid and table view, category filter, reorder up and down (and restored), new category (appears as a tab, in the "Portfolio category" choice and as a public filter), delete with confirmation (cancel keeps, confirm removes, gone publicly), live application + demo video links, new solution with 2-picture gallery (order, caption), links with button texts and Live status: all persisted and visible on the public API. |

### Cache invalidation (fixed)
Cause: public API responses carried `max-age=10, stale-while-revalidate=600`, so a browser or the CDN showed the previous version first and the new one only after another reload. Now `max-age=0, s-maxage=3, stale-if-error=600` (the CDN still answers from its copy for at most 3 s, and for up to 10 min only while the server is down), and every successful admin save also clears the browser's saved copy of the public site. Tested: with a deliberately stale saved copy, the first page load showed the new link within about a second.

### The 64 solutions and the "nine" Headless SaaS & API items
64 solutions: Software 11, Web 9, Mobile 14, Websites 10, API 10, AI agents 10. The earlier nine was my own consolidation: two API solutions (Authentication, Email & SMS) are backed by the LAX360 API Hub product and were hidden behind its card (12 solutions in total were hidden this way). That is removed: every record is now listed once and none hidden, so the public count equals the admin count (API shows 11 = the 10 solutions + the API Hub product). Websites show 31 = 21 live websites + 10 industry website design previews.

### The 21 live websites
All 21 entries are kept as seeded and unchanged: 19 have their original live link and screenshot (checked that every image loads). Two demo entries (Event Management, Academy) have no live link and no screenshot in the original data ("live link will be added soon"); they show Coming Soon and no button. Production's own copies could not be inspected (no production access during testing); `migrate-content` only loads the website list when it is empty.

## Remaining blockers / limits (nothing blocks deployment)
- The solutions, preview pictures and unified Products admin reach production only after you deploy and run the commands below; until then the live Admin Panel is the old one.
- Not tested against real Supabase storage or real Google Sheets (by your rule): upload and sheet sync were tested against local storage and fakes. Check one picture upload and one enquiry after deploy.
- Product edit forms keep their own 8 screenshot slots; the new drag-and-drop gallery editor is on solutions.
- Tamil / Hindi: complete for every string the build collects (2026-11-28); new English copy added later needs translating (check `public/i18n-strings.json` against the catalogs after each build).
- Demo-request interest is not written to the Consultation worksheet (it never had that column).

## Mandatory commands after deploying (backend first, then frontend)
```powershell
cd backend
python -m app.cli migrate-content
python -m app.cli refresh-upcoming --apply
```
`migrate-content` backs up first, adds the 6 categories, 64 solutions, the website list if empty and uploads the 70 preview pictures; it never overwrites edits. `refresh-upcoming --apply` overwrites the upcoming-division text with the revised structure (backup first), so it is deliberately not automatic. Then open Admin > Products and check it shows about 96 records.

## Product reconciliation (2026-11-28, second pass) — why the admin showed only 32
**Cause (checked read-only on the live database):** it holds 11 products + 21 websites = 32 content rows and **no** `solution` / `solution_category` rows and no `solutions` marker; Alembic is at 0030 (the same as the code, so no schema migration is needed). The live admin is also the old build, which does not know those content kinds. The 64 solutions therefore exist only in the new code until it is deployed and `migrate-content` runs. Nothing is filtered or hidden by an API.

**Verified on a copy of the real production content** (439 content rows + 85 media rows read from the live database inside a READ ONLY transaction, loaded into a local throwaway PostgreSQL; the migration and the admin ran there; no write to production, no production storage key present, a guard refuses to start otherwise). Production was re-read afterwards: unchanged (0030, 439 / 85).

| Item | Count |
|---|---|
| Original products + websites | 11 + 21 = **32** |
| Solutions provided | **64** (6 categories) |
| Duplicates found by purpose and functionality | **10** solutions are an existing product |
| Merged into the existing product record | 10 solutions into 9 products |
| Newly added unique solutions | **54** (+ 6 category records) |
| **Final unique total** | **86** (11 products + 21 websites + 54 solutions) |

Merged pairs: Inventory & Billing Software, Smart Billing & POS (LAX360 Smart Billing & POS); Warehouse Management, LAX360 Inventory Management; Clinic Management Software and Clinic Management Web Application, both into LAX360 Clinic Management; CRM into LAX360 Business CRM; HR & Employee Management, LAX360 HR & Employee Management; LMS, LAX360 Learning Platform; Appointment & Booking, LAX360 Bookings; Field Staff & Location Tracking App, LAX360 Field Operations; AI Business Workflow Automation, LAX360 Workflow Automation. A merge only fills empty fields and appends new unique lines within the field limits (features, benefits, problems, industries, users, search title and description) and adds the solution's modules as product modules the product lacked (50 modules); nothing the product already had is changed. LAX360 API Hub and LAX360 Project Management have no twin and stay as they are. Kept as separate solutions on purpose: the Authentication API and the Email & SMS API (single APIs, distinct purpose from the API Hub platform), and platform variants that are separate deliverables (for example Employee Management App vs HR system, Attendance App, Appointment Booking App, Hospital Management Software vs Web Application).

**Final category counts (admin and public page agree):** Software 11 · Web Applications 9 · Mobile Applications 14 · Websites 31 (21 live websites + 10 industry website designs) · Headless SaaS & API Solutions 11 (API Hub + 10) · AI Agents & Automation 10 · **Total 86**.

**Images:** 54 solution + 6 category pictures, each stored under the name of its record, all distinct (54 of 54 different), none regenerated this pass (the 20 files of the merged solutions were deleted as unused). The 11 products keep their existing photos (now also shown in the admin list and form). 19 of 21 websites keep their original screenshot and live link; 84 of 86 admin thumbnails load; the two without are the Event Management and Academy demo entries, which never had a screenshot or live link (kept as Coming Soon, no generated picture passed off as a real screenshot).

**Fallback:** once `migrate-content` has run the product list is database-only (marker `products`): a deleted or unpublished product no longer returns from the built-in list (tested: unpublish removed it from the page and search; restored afterwards). Websites and solutions never had a built-in fallback after migration.

**Added:** search title / description fields on products (product pages use them), `seed_solution_merges`, and `migrate-content` now reports the merge.

**Remaining deployment dependency:** deploy the backend, then the frontend, then run `python -m app.cli migrate-content` (backs up first, adds the 54 solutions + 6 categories + pictures, applies the merges, marks products as database-driven) and `python -m app.cli refresh-upcoming --apply`. The solutions cannot appear in the live admin before that.

## Third pass: one list of 86, no status labels (2026-11-28)
**Why the live admin still shows 32 (the actual database, read-only):** the live database holds exactly 439 content rows: 11 products + 21 websites + their siblings, **0 solution rows, no `solutions` / `products` markers, Alembic 0030**. Nothing in the API or the screen filters anything out: the 54 unique solutions and 6 categories have simply never been written to that database, because that is what `migrate-content` does and it has not been run there. The code on this PC (admin, API, public page) already shows all 86 as soon as the rows exist; proven on a fresh copy of the live content (439 + 85 media rows, read inside a READ ONLY transaction) with the real migration run on it: 86 unique (Software 11, Web 9, Mobile 14, Websites 31, API 11, AI 10), no duplicate title or slug, 54 of 54 pictures distinct and correctly mapped, 19 of 21 live links kept. Production was re-read afterwards and is unchanged.

**Changes this pass**
- Admin > Products always lists everything (default view = all 86, hidden ones included); the "Published / Unpublished / Draft / availability" badges and the availability filter are gone from the cards and table. A hidden record shows only a small eye-off icon; Publish / Unpublish stays as a button; "Show: All / On the website / Hidden" is the only visibility control.
- Public cards and pages show no Published, Live, Available or Custom Development labels and no availability filter; an offered solution carries the single sentence "LAX360 provides this solution and can customise it to your business requirements." Only solutions that are NOT offered yet (the 9 AI agents under development) say so, plus their Concept Preview picture tag. Buttons: Enquire Now / Discuss Customisation (Register Your Interest for the not-yet-offered ones). Solution text (FAQ, overview) rewritten in the same voice; admin availability options renamed "Offered ...".
- Nothing is called live or production-ready unless it is a product or website that already was; the "Live" product label was removed.

**To make the live admin show all 86 (needs your go-ahead, then in this order):** deploy backend and frontend, then run `python -m app.cli migrate-content` (backs up first; additive; keeps edits). Running it BEFORE deploying would add the rows but the old admin could not display them, and the old product form would reject the 9 merged products on save (it does not know the new search-title fields), so it is deliberately not done early.

## Production migration executed (2026-11-28, at the owner's instruction)
`python -m app.cli migrate-content` was run on the production database. Backup first: `backend/backups/content-20261128-061738.json`. Result (read back read-only afterwards): 54 solutions + 6 categories added, 10 solutions merged into 9 existing products (48 fields, 50 product modules), 60 pictures uploaded to the media library and attached (media 85 to 145), markers `solutions`, `solution-merges`, `products` set. Totals: 11 products + 21 websites + 54 solutions = **86** (Software 11, Web 9, Mobile 14, Websites 31, API 11, AI 10), no duplicate (kind, slug), Alembic still 0030. Nothing existing was overwritten.
**Still needed:** deploy the new backend + frontend. Until then the old live admin cannot show the new rows, and its product form should not be used to save the 9 merged products (it does not know their new search-title fields).
