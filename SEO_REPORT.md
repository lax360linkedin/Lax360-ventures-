# LAX360 Pvt Ltd: SEO and business growth report

Scope: the existing website (React + Vite frontend, FastAPI backend, Supabase). Nothing was rebuilt; branding, design, animations and existing features are unchanged. No credentials, keys or client data were touched.

## 1. Initial SEO audit

Method: a build-output audit (`npm run seo:audit`) reads the 114 prerendered pages exactly as a crawler receives them (before any JavaScript) and checks titles, descriptions, canonical, headings, Open Graph / Twitter, JSON-LD, images, sitemap and robots. A link checker (`npm run seo:links`) checks every internal reference.

What was already good (kept as it was):
- **Rendering:** every public route is statically prerendered to real HTML (own `<title>`, description, canonical, Open Graph, JSON-LD) and hydrated in the browser. Googlebot gets the content without running JavaScript, so SSR is **not** needed.
- One `<h1>` per page, no images without `alt`, a prerendered `404.html` with `noindex`, a honeypot and rate limits on forms, backend security headers, admin pages `noindex`.
- An existing "Page titles & SEO" admin entry, article SEO title/description fields, Organization schema with the real branch addresses.

## 2. Issues found (before the work)

| # | Issue | Severity |
|---|-------|----------|
| 1 | Canonical links, `og:url`, `sitemap.xml` and `robots.txt` all point at the placeholder `https://www.example.com` unless `SITE_URL` is set for the build | Critical (needs your domain) |
| 2 | Twitter Card had no `twitter:title`, `twitter:description` or `twitter:image` on any of the 110 pages | High |
| 3 | No `BreadcrumbList` structured data on any page; no `LocalBusiness` schema for the branches | High |
| 4 | 91 pages had titles up to 109 characters or descriptions up to 300 characters (cut off in Google) | Medium |
| 5 | `robots.txt` did not disallow `/company-admin`, `/user`, `/register`, `/forgot-password`, `/reset-password` | Medium |
| 6 | The sitemap was a static list of built-in pages: articles, products, industries and partners published in the admin never reached it | High |
| 7 | `/websites` is a public page but was not prerendered or in the sitemap | Medium |
| 8 | No security headers on the website host (vercel.json), no `X-Robots-Tag` on admin | Medium |
| 9 | No analytics, no conversion tracking, no Search Console verification | Medium |
| 10 | No redirect management; no per-page keywords, indexing or structured-data control; "Page titles & SEO" covered only 10 pages | Medium |
| 11 | No e-mail notification to the team for new enquiries | Medium |
| 12 | Article schema lacked `mainEntityOfPage`, `dateModified`, publisher logo and an absolute image | Low |

Baseline audit: 341 problems and 200 warnings. After the work: **0 problems with a real `SITE_URL`**; the 112 remaining reports when it is unset are all "canonical points at the placeholder domain" (issue 1), and 13 titles of 71 to 76 characters are flagged as a warning.

## 3. Implemented improvements

**Technical SEO (frontend)**
- One head engine (`hooks/useDocumentHead.js`, `utils/seo.js`) used by the browser and the prerender: title, description, keywords, canonical (overridable), robots (`index, follow, max-image-preview:large` or `noindex, nofollow`), `og:*` with `og:type` (article for articles) and `og:locale`, full Twitter Card with image, default sharing image fallback.
- Built-in titles/descriptions are trimmed to search-friendly lengths at word boundaries; admin-set text is never altered.
- `BreadcrumbList` JSON-LD generated for every indexable page; `LocalBusiness` JSON-LD for each branch with an address on /contact (real address, phone, map; fields that cannot be derived, such as a region for a new city, are left out, never invented); richer `Article` schema; Organization schema kept.
- `robots.txt` regenerated with the full disallow list and both sitemaps; `/websites` prerendered and listed.
- Build warnings when `SITE_URL` is not set; `npm run seo:audit` and `npm run seo:links`.
- Verified: unique titles and descriptions across all 115 pages, one `<h1>` per page, no missing `alt`, valid JSON-LD, 9,494 internal references with no broken link.

**Live sitemap and redirects (backend)**
- `GET /api/public/sitemap-content.xml` lists published articles, products, industries, partners and website demos with `lastmod`; publishing, editing, hiding (noindex), unpublishing or deleting changes it immediately. The site serves it at `/sitemap-content.xml` through a rewrite in `vercel.json`. Pages with an active redirect or marked noindex are left out.
- `GET /api/public/redirects`; redirects are applied in the browser (`SeoWatcher`), with loop protection.

**Admin: SEO management** (Pages and settings, SEO management)
- **Pages:** title, description with Google snippet, WhatsApp and LinkedIn previews; keywords; social sharing image upload; index / noindex; canonical address; extra JSON-LD (validated, must be schema.org); any page can be targeted by its address (products, privacy, terms and so on).
- **Articles:** SEO title, description, keywords and noindex per article.
- **Redirects:** add, edit, switch off and delete (301 or 302, validated, no loops, one per old address).
- **Setup:** links to both sitemaps and robots.txt and the setup steps for Search Console, Analytics and notifications.

**Business growth (reused, not duplicated)**
Already present and left in place: service enquiry forms, product demo requests (now reachable from product pages), WhatsApp enquiry buttons, enquiries stored in the CRM-style admin pipeline with lead source, Google Sheets sync, partner and franchise enquiry forms, career applications, testimonial and portfolio management. Added: e-mail notification to the team for every new enquiry and demo request (`ENQUIRY_NOTIFY_EMAIL` + SMTP, sent after the response, never blocking a submission).

**Analytics (off until configured)**
`VITE_GTM_ID` (Tag Manager) or `VITE_GA_MEASUREMENT_ID` (GA4), `VITE_GSC_VERIFICATION`, `VITE_BING_VERIFICATION`. Nothing loads without an id, nor for visitors who send Do Not Track or Global Privacy Control. Events: `page_view` (also for in-page navigation), `generate_lead`, `contact_form_submit`, `partner_enquiry`, `career_application`, `demo_request`, `whatsapp_click`, `phone_click`, `email_click`. No personal details are put in events.

**Security and performance**
- `vercel.json`: HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP and a conservative CSP (`frame-ancestors`, `base-uri`, `object-src`, `form-action`); `X-Robots-Tag: noindex` and `no-store` on `/company-admin`, noindex on `/user` and `/demo`.
- Existing: honeypot and rate limits on forms, body size limits, backend security headers.
- Images were already WebP, lazy-loaded and sized; fonts are self-hosted variable fonts; the main script is about 151 kB gzipped. No change was made to the design.

## 4. Files

Created: `frontend/src/utils/seo.js`, `utils/analytics.js`, `components/layout/SeoWatcher.jsx`, `admin/pages/SeoAdmin.jsx`, `scripts/seo-audit.mjs`, `scripts/check-links.mjs`, `backend/app/services/seo_service.py`, `services/notify_service.py`, `tests/test_seo.py`, `SEO_REPORT.md`.

Modified: `frontend/src/hooks/useDocumentHead.js`, `hooks/useSite.js`, `components/layout/PageContainer.jsx`, `RootLayout.jsx`, `pages/ArticleDetail.jsx`, `pages/Contact.jsx`, `hooks/useCmsPages.js`, `services/enquiryService.js`, `services/branchService.js`, `main.jsx`, `routes.js`, `admin/AdminApp.jsx`, `scripts/prerender.js`, `scripts/generate-sitemap.js`, `vercel.json`, `package.json`, `.env.example`; `backend/app/api/routes/public.py`, `contact.py`, `demos.py`, `core/config.py`, `services/content_service.py`, `.env.example`, existing tests that list content kinds.

## 5. Third-party configuration you need

1. **The real website address** (critical): set `SITE_URL` (or `VITE_SITE_URL`) in the frontend build environment, and `FRONTEND_ORIGIN` / `CORS_ORIGINS` in the backend, to the production domain. Until then canonical links and sitemaps use `https://www.example.com`.
2. If the API is not at `https://lax360-ventures.onrender.com`, update the two rewrite destinations in `vercel.json` (`/api/...` and `/sitemap-content.xml`).
3. Google Search Console, Google Analytics 4 / Tag Manager and (optionally) Bing Webmaster Tools accounts.
4. An SMTP account (`SMTP_HOST`, `SMTP_FROM`, ...) and `ENQUIRY_NOTIFY_EMAIL` for team notifications.

## 6. Google setup instructions

1. Deploy with `SITE_URL` set. Check `https://<domain>/robots.txt` and both sitemaps.
2. Search Console: add a URL-prefix property, choose "HTML tag", copy the `content` value into `VITE_GSC_VERIFICATION`, redeploy, press Verify, then submit `sitemap.xml` and `sitemap-content.xml` under Sitemaps.
3. Analytics: create a GA4 property and web stream, put the `G-` id in `VITE_GA_MEASUREMENT_ID` (or use a Tag Manager container id in `VITE_GTM_ID` and add the GA4 configuration tag in it), redeploy, and check Realtime. In GA4 mark `generate_lead`, `demo_request` and `whatsapp_click` as key events (conversions).
4. Inspect key pages with Search Console's URL Inspection ("Test live URL", "View tested page") to confirm the rendered HTML; validate structured data with Google's Rich Results Test.
5. In the admin panel open SEO management and fill in each page's description and sharing image.

## 7. Remaining manual actions

- Set the production domain (item 5.1); everything else depends on it.
- Google URL Inspection, Rich Results Test and PageSpeed / Core Web Vitals measurements need the deployed site and your Google accounts; they could not be run from here.
- Real redirects at the edge (HTTP 301) would need Vercel redirect rules; the admin redirects are applied in the browser, which search engines treat as a soft redirect. Export `GET /api/public/redirects` into `vercel.json` `redirects` for important old URLs.
- Pages published in the admin panel (articles, products and so on) are rendered in the browser (Googlebot runs JavaScript, so they are indexable); statically prerendering them would need a build-time fetch of the API.
- Write real descriptions and add a 1200 x 630 sharing image per key page; add genuine case studies, testimonials and certifications only when they are real.
- CAD is not advertised in the SEO text, schema or sitemap; the home carousel card named "CAD & Engineering" (an industry card, added earlier at your request) is the only place the words appear: review it.

## 8. Testing report

See the final summary in the conversation; commands to repeat the checks: `npm run build`, `npm run seo:audit`, `npm run seo:links`, and `pytest` in `backend/`.


---

## Addendum: content corrections, location pages and the production domain

**Production domain.** The builds, `robots.txt`, `sitemap.xml`, canonical links and social previews now default to `https://lax360-ventures.vercel.app` (override with `SITE_URL`). With it, `npm run seo:audit` reports **no problems** on the 119 prerendered pages and `npm run seo:links` finds no broken internal link (10,269 references). The backend sitemap uses `FRONTEND_ORIGIN`: set it to the same address in the backend environment.

**CAD / 2D and 3D clean-up.** Removed: the "2D & 3D Modelling" label of the home page strip; the "CAD & Engineering" card of the home carousel (code, seed and the existing database row, migration 0022); CAD and engineering course wording in the CADPOINT Academy and CADPOINT website descriptions; a sample testimonial about 2D drawings and 3D models in the sample-data loader. A search of the built HTML finds no "CAD & Engineering", "CADD", "2D & 3D" or "CAD".
Left as they are, because they are real names, not services: the partner **CADPOINT** (Our Network, its website entry, the welcome card and a student testimonial) and the demo website description that mentions a "3D architectural model" section (a feature of that demo site). Tell me if you also want these changed.

**Duplicate and text fixes.** The home page shows the same services in the strip, the carousel and the Services overview. No card is repeated inside any section; the carousel cards that reused the Services overview sentences word for word now have their own wording (migration 0023). Fixed "our Our Network page" in the FAQ. All sections were kept.

**Location pages (new).** `/locations` and one page each for Salem, Bangalore and Mumbai (`/locations/salem` and so on): real address, phone, e-mail, Google Maps link and embedded map when saved, WhatsApp, the branch's own social links, the services you can enquire about, three factual questions and answers, breadcrumbs, `LocalBusiness` and `FAQPage` structured data, and links to the other offices. The text is built from each office's own details, so no two pages repeat each other. An office added in Admin > Branch locations gets its page automatically (and a place in the live sitemap); a disabled office does not. Linked from the Contact page cards, the footer cards and the footer menu.

**Database changes in this work.** Migrations: 0018 (social and contact list), 0019 (branch and partner owners), 0020 (services carousel), 0021 (products shown as Live), 0022 (CAD removal), 0023 (carousel wording). All were applied to your Supabase database with `alembic upgrade head`; nothing was deployed.

**Not verified.** No Google indexing or ranking is claimed. Search Console, URL Inspection, Rich Results Test and PageSpeed need the deployed site and your Google account.

## Multilingual support (English, Tamil, Hindi)

**How it works.** English stays the default at the normal addresses. Tamil lives under `/ta/...` and Hindi under `/hi/...`; they are the same pages, so every existing link, menu and button works unchanged. The language switcher (globe icon) is in the top contact bar and in the mobile menu. Choosing a language changes the address, re-renders the page in place (no full reload) and is remembered in the browser (`localStorage`, key `lax360-language`); a visitor who returns to an unprefixed address is sent to their saved language. Admin, login and other private pages are never redirected.

**Translations.** The text of each page is looked up in a dictionary (English text to translation) that ships with the website (`src/i18n/catalogs/ta.json`, `hi.json`) and is overridden by what an administrator saves in **Admin > Translations** (stored in the `translations` table, live at once). A text with no translation shows in English, so nothing is ever empty. Admin > Translations lists every text of every page grouped by page and section, shows which are missing, and lets you add a text that is not listed (for example the title of a new article).

**SEO.** Every page is prerendered once per language with a translated title and description, `<html lang>`, a language-specific canonical, `og:locale`, and `hreflang` alternates for `en`, `ta`, `hi` and `x-default`. The static and live sitemaps list every language with `xhtml:link` alternates. `npm run seo:audit` and `npm run seo:links` now cover the `/ta` and `/hi` pages too.

**Fonts and layout.** Noto Sans Tamil and Noto Sans Devanagari are loaded for those languages with adjusted line height and heading sizes; the header menu is set a little smaller in Tamil and Hindi so it stays on one row at 1024px and wider. Checked at 1024, 1280 and 375px.

**Adding a language.** Add it to `src/i18n/languages.js`, create `src/i18n/catalogs/<code>.json`, add the code to `LANGUAGES` in `backend/app/services/translation_service.py`, and add a font and an `html:lang(<code>)` rule in `src/styles/index.css` if the script needs one. Rebuild.

**Translation completion pass.** Every text the built website produces (4,148 distinct texts on 120 pages: Services and all service detail pages, Products and product details, Industries and each industry, Insights and articles, Our Network and partners, Team, Careers, Work, Websites, Locations, Contact, Privacy, Terms, login and registration, forms, validation messages, pop-ups and the footer) now has a Tamil and a Hindi translation, plus the texts of the website demos, team profiles and page labels that come from Admin-managed content. A browser sweep of the Tamil site (27 routes) and the Hindi service pages found English only in company, person and demo-project names, code samples, a technology list and one visitor-written testimonial: these are names or the visitor's own words and stay as written.

**Admin-managed content.** Admin > Translations has a new page, "Content managed in admin (articles, products, team…)", which lists every readable text of published content (title, summary, bio…) with its kind and shows which are missing in the chosen language, so new content can be translated the day it is published. Endpoint: `GET /api/admin/translations/content-strings`.

**Honest limits.** The Tamil and Hindi texts were written for this website and have not been reviewed by a native speaker; please have them reviewed (Admin > Translations makes corrections easy). Every page, section and form that existed at build time is translated. Text that an administrator adds later (a new article, product or team member) has no translation until it is added in Admin > Translations, and shows in English until then. The mobile menu's language list is hidden if the top bar is turned off. Database change: migration 0024 (`translations` table), applied locally; the backend must be restarted to serve `/api/public/translations/{lang}`. Nothing was committed or deployed.
