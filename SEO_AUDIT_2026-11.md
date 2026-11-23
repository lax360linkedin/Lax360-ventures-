# LAX360 technical SEO audit and fixes (second pass)

Local work only. Nothing deployed, committed or pushed. Builds on `SEO_REPORT.md` (first SEO pass) and `SEO_DOMAIN_MIGRATION.md` (move to lax360.in).

## Architecture (inspected)
React 19 + Vite 8, `react-router-dom` client routing, **every public route statically prerendered** to real HTML (title, description, canonical, Open Graph, Twitter, hreflang, JSON-LD in the first response) and hydrated. Vercel serves prerendered files first; `vercel.json` rewrites handle pages that exist only in the browser. Backend (Render) serves `/api` and the live content sitemap.

## Findings

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | **Critical** | **Careers 404.** The only careers URL is `/career`; the page is prerendered and works. Google's sitelink points to a different address (almost certainly `/careers`, which has never existed on this site), and Vercel answers it with its 404 page. | **Fixed**: permanent redirects `/careers`, `/Careers`, `/Career`, `/jobs`, `.html` variants (with and without trailing slash) to `https://lax360.in/career`. I cannot see the exact URL Google lists: confirm it in Search Console (URL Inspection) |
| 2 | High | Admin-published products, industries, articles, partners, website demos, team departments and sub-services could not be opened directly or refreshed on Vercel (no rewrite for `/products/:slug`, `/industries/:slug`, `/insights/:slug`, `/our-network/:slug`, `/websites/:slug`, `/our-team/:dept`, `/services/:slug/:service`): Vercel 404 | **Fixed** (rewrites added; static files still win, `/api`, assets and `/_vercel` untouched). Trade-off: a mistyped slug under those prefixes renders the site's own "Page not found" page (noindex) with status 200 instead of 404; top-level unknown URLs still get a real 404 |
| 3 | High | Legacy URLs from the previous lax360.in site are unknown (no old sitemap, redirect file or Search Console export in the repository) | **Partly done**: 80 conservative alias redirects for common equivalents (about-us, contact-us, privacy-policy, terms-and-conditions, blog/news to insights, our-services, team, portfolio, home, index.html...). **Needs your input**: export Search Console > Pages (and the old site's sitemap) so the real list can be mapped; URLs with no equivalent page keep a real 404 (no blanket redirect to the homepage) |
| 4 | Medium | No automated routing check | **Fixed**: `npm run seo:routes` (every route prerendered, no chain/loop, every redirect lands on a real route and is permanent, dynamic rewrites present) |
| 5 | Info | Titles, descriptions, canonicals, Open Graph/Twitter, hreflang, robots, sitemap (345 URLs, no admin/login/private/Play Zone), JSON-LD (Organization, WebSite, BreadcrumbList, Article, Service, SoftwareApplication, LocalBusiness from real branch data), image alt text, GA4 | Verified by `npm run seo:audit` on all 345 built pages: 0 problems (warnings: four Hindi article titles about 90 characters; two short descriptions) |
| 6 | Info | GA4: already implemented, off until `VITE_GA_MEASUREMENT_ID` (or GTM id) is set, consent-gated, respects Do Not Track, page views on client navigation, success-only events (`generate_lead`, `contact_form_submit`, `career_application`, `partner_enquiry`, `demo_request`, `whatsapp_click`, `phone_click`, `email_click`) | No change; **Measurement ID needed from you** |
| 7 | Info | Admin SEO manager exists and persists through the backend (titles, descriptions, social image, index/noindex, canonical, structured data, per-page) | No change. **Not present:** redirect management and sitemap status in the admin; proposal: a small `redirects` table plus a backend-served redirect list needs a schema change and your approval |

## Redirect design (no chains)
Alias redirects use an absolute `https://lax360.in/...` destination and come before the host rules, so `www.lax360.in/careers` and `lax360-ventures.vercel.app/careers` reach `/career` in **one** hop. Host redirects (www / old Vercel host to lax360.in) keep path and query. Verified by simulation and `seo:routes`; **not tested live** (needs the domain connected). Vercel preserves query strings on redirects.

## Tests
Automated (run): `npm run build`; `seo:audit` (0 problems, 345 pages); `seo:links` (no broken internal links); `seo:routes` (115 routes, 80 redirects, 22 rewrites: pass); `vercel.json` valid JSON. **Not run:** live direct-load/refresh of every route, Careers on the real domain, Rich Results Test, Lighthouse/Core Web Vitals (earlier local measurements are in `PERFORMANCE_REPORT.md`), Search Console checks, browser console on production.

## Manual steps
**Vercel:** deploy this change; confirm the Domains list shows `lax360.in` (primary) and `www.lax360.in`; set `VITE_SITE_URL=https://lax360.in`; after deploy open `https://lax360.in/careers` and `https://www.lax360.in/careers?x=1` (expect 308 to `https://lax360.in/career?x=1`), then refresh `/career`.
**Search Console:** verify the Domain property by DNS; submit `https://lax360.in/sitemap.xml` and `sitemap-content.xml`; URL Inspection on `https://lax360.in/career` > Request indexing; export Pages > "Not found (404)" and "Indexed" lists and send them to extend the legacy mapping; use Validate Fix after redirects are live. Google decides when pages leave the index; nothing here claims a page is indexed.
**Content gaps / approvals:** none invented. Any redirect for an old URL whose meaning I cannot confirm waits for the Search Console export.

---

# Addendum: soft 404s and production deployment readiness

## Soft 404 on dynamic URLs
**Why it happens:** the site is static files plus a client-side router. Vercel can only decide "file exists or not" and "does the URL shape match a rewrite". It cannot know whether an admin-published slug exists (that lives in the database), so any URL matching a rewrite is answered with `index.html` and status 200, and React then shows "Page not found".

**Done (no architecture change):** every dynamic rewrite now only matches a valid slug shape (`[a-z0-9-]`, 1-80 characters, the exact form the site and backend generate). Junk such as `/insights/foo.php`, `/products/Foo`, `/products/x_y`, over-long slugs and extra path segments now gets Vercel's real **404**. Valid existing pages are unchanged: prerendered pages are served as files first, and admin-published pages still load directly and survive refresh. All missing-slug screens are `noindex`, so Google excludes them rather than indexing them. `npm run seo:routes` now fails if a slug rewrite loses the restriction. Existing redirects, metadata, sitemap and canonicals are untouched.

**Still true:** a well-formed but non-existent slug (e.g. `/insights/does-not-exist`) returns 200 with a noindex "Page not found" page.

**Options for a true 404 on those (not implemented; needs your decision):**
| Option | How | Pros | Cons |
|---|---|---|---|
| A. Keep as is (current) | noindex soft 404 | No risk, no new moving parts | Search Console may list these as "Soft 404" (informational, not a ranking problem) |
| B. Vercel Edge Middleware | A small `middleware.js` asks the Render API whether the slug exists and returns 404 if not | Real 404s for admin-published content | New runtime dependency on Render (cold start up to ~50 s: must time out in ~1.5 s and fail open to 200); adds latency to every dynamic-page request; needs a cheap "exists" API endpoint (none exists today; `content-all` is too heavy); more to monitor |
| C. Rebuild on publish | Vercel deploy hook fired when content is published, so new pages are prerendered and the rewrites can be dropped | Real static pages and real 404s, best SEO and speed | Needs a backend hook call and a deploy per publish (minutes of delay; build-minute cost); changes publishing flow |
| D. SSR framework | Move to Next.js/Remix | Full control | Major rewrite: rejected |
My recommendation: A now, then C if publishing frequency is low and instant 404s matter. B only if you accept the Render dependency.

## Deployment readiness (website SEO and routing)
**Ready to deploy, with manual steps:** build, `seo:audit` (0 problems), `seo:links`, `seo:routes`, 8 client tests, 27 game tests and 61 Play Zone backend tests all pass locally. Changes are limited to `vercel.json`, build/audit scripts, `.env.example`, the head hook default and the Play Zone/SEO docs; no data, auth, API or backend behaviour changed.
**Must happen around deployment:** set `VITE_SITE_URL=https://lax360.in` in Vercel before building; connect `lax360.in` and `www.lax360.in` in Vercel Domains and GoDaddy DNS; update Render `FRONTEND_ORIGIN` and `CORS_ORIGINS`; then run the live checks (`/careers` to `/career` 308, `www` to apex with query kept, direct load and refresh of `/career` and one admin-published page, sitemap and robots on the live domain, Rich Results Test, Search Console submission).
**Not verified:** anything on the live domain, Core Web Vitals in production, the exact URL behind Google's Careers sitelink, legacy URLs beyond the 80 common aliases (needs the Search Console export).
**Separate from SEO (see `RELEASE_READINESS.md`):** the Play Zone backend and migrations 0026/0027 are not on Render yet; deploy those first or the Play Zone pages show their "unavailable" state. The Play Zone remains `noindex`.
