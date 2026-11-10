# LAX360 Pvt Ltd — frontend

React + Vite (JavaScript/JSX), Tailwind CSS v4, React Router, Lucide, Framer Motion.
The website talks to the FastAPI backend in `../backend` through `/api/...` (login, profile, demo requests, contact form, AI assistant). It holds no secrets: the OpenAI key, database and auth secret live only in `backend/.env`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (proxies /api to http://localhost:8000)
npm run build      # client + SSR build, prerender every route, sitemap.xml, robots.txt
npm run preview    # serve the production build
```

## Where things live

| Need to change… | Edit |
| --- | --- |
| Phone, email, address, social, legal line, "needs confirmation" list | `src/data/site.js` |
| Divisions / service pages / FAQs | `src/data/services.js` |
| Courses & workshops | `src/data/courses.js` |
| Projects (Work page) | `src/data/projects.js` + set `workIsLive` in `site.js` |
| Navigation, enquiry types | `src/data/navigation.js` |
| Privacy / Terms outline text | `src/data/legal.js` |
| Colours, fonts, spacing tokens | `src/styles/index.css` (`@theme`) |
| Logo / wordmark | `src/components/layout/Logo.jsx` |
| AI assistant client | `src/services/chatService.js` |
| Enquiry submission | `src/services/enquiryService.js` |
| All API calls (cookies, CSRF, errors) | `src/services/apiClient.js` |
| API base URL | `src/services/apiConfig.js` (`VITE_API_BASE_URL`, empty = same origin) |

## Routes

`/`, `/about`, `/services`, `/services/{software,ai,growth}`, `/work`, `/career`, `/contact`, `/privacy`, `/terms`, 404.
`/projects` redirects to `/work` (the planning document's canonical URL).
Contact accepts `?type=` (project, ai, website-app, marketing, course, workshop, partnership, general) and `?course=<slug>`.

## Demo behaviour (important)

- **Contact / enquiry form** validates and shows a "demo submission" result. Nothing is sent or stored, and the UI says so.
- **LAX360 AI Assistant** gives scripted replies and is labelled "Demo mode". It never calls OpenAI. Conversation is held in memory only.
- In dev only, add `?demo=error` to a form URL to exercise the error state.

## Visual system — "Violet Glass"

- **Tokens** (`src/styles/index.css`, `@theme`): `night #0B0714`, `base2 #120B20`, `deep #24103D`, `primary #7C3AED`, `accent #A855F7`, `lav #C4B5FD`, `sky #60A5FA`, `fg #F8F7FC`, `soft #C4BED2`, glass/edge tokens. NOTE: the colour token is named `night` (not `base`) so it can't collide with Tailwind's `text-base` font-size class.
- **Surfaces:** `.glass` (blur 14px, for header/modal/chat/panels), `.glass-flat` (same look, no blur, for repeated cards), `.lift` (hover lift + violet shadow), `.shine` (one-shot highlight sweep), `.text-gradient` (selected words only).
- **Load sequence (CSS-only, runs before hydration):** header drops in with a bounce → nav labels fade → hero eyebrow, headline lines, text, CTAs, status chips → product composition → floating controls pop in (assistant 1.6s, WhatsApp 1.9s). Classes: `a-drop`, `a-rise`, `a-pop`, `a-fade` with `--d` delay.
- **Scroll reveals:** `Reveal` (Framer Motion, once). Fan/stack, accordion and marquees use CSS.
- **Enquiry modal:** `src/components/layout/EnquiryModal.jsx`. **Never opens automatically.** Opened by the header "Discuss Your Project" button or `window.dispatchEvent(new CustomEvent('lax360:open-enquiry'))`. Esc, backdrop click and "Maybe later" close it; focus is trapped and returned.
- **Floating controls:** assistant launcher (primary, all sizes) and a WhatsApp button (desktop only, only when a number is configured in `site.js`). Phones use the bottom bar instead.
- **Honest content:** no testimonials, team or portfolio — there is no verified material. The capability concepts are labelled illustrative.

## Navigation, mini-bot and branches

- **Header order:** About → Services → Industries → Insights → Our Network → Our Team → Careers → Contact (`primaryNav` in `src/data/navigation.js`). Logo + brand name link to `/`. Services is a plain link — no dropdown. Work remains reachable from Services, the footer and the home page. `/career` is a new page (no open roles are listed; it invites enquiries via `/contact?type=career`).
- **Fixed header (`Header.jsx`):** one shared header, `position: fixed`, constant height (72px, 92px from `lg`), never hides on scroll; more opaque/blurred after scrolling. `RootLayout` pads `<main>` by the same amount (`pt-[72px] lg:pt-[92px]`; the home hero is full-bleed under it) and the sticky Services category bar uses the same offsets. From `lg` it is a three-column grid (`minmax(0,1fr) auto minmax(0,1fr)`) so the nav is truly centred; the CTA is icon-only at `lg`, with text from `xl`.
- **Mini-bot (`src/components/art/MiniBot.jsx`):** a vector version of the LAX360 mascot with separate parts (head, eyes, two arms, heart). Poses live in `BOT_POSES`.
- **Header bot (`src/components/layout/HeaderBot.jsx`):** lives in a non-interactive overlay (`pointer-events: none`, `aria-hidden`) and stands on the "A" of LAX360 (`Logo` exposes `aRef`). On load it drops in, bounces, lands and waves, then idles. Clicking a nav link makes it hop along the navbar to that link, land, react with a per-link pose, then hop back to the "A"; navigation is never delayed. Hovering (hover-capable devices only, 220ms debounce) sends it to the link too. Every ~30–45s it does a small wave or short walk, paused while scrolling/hovering/hidden. Positions are measured from the DOM (A and link text rects) and re-measured on resize; motion uses the Web Animations API with transforms only. Below `lg` it stays on the "A" (smaller). Reduced motion: it simply stands on the "A".
- **Where the bot rests:** always above the *active* page's link (`Header.jsx` computes it from the route; Services also covers `/services/*`), or on the "A" of LAX360 on Home, on pages outside the nav (Work, Login…) and below `lg`. Hover and click trips never change that; navigating (link, logo, footer, back button) hops it to the new active link. Resize, theme switches and layout changes re-measure it.
- **Login / profile:** the header's right side shows a **Login** button (→ `/login`) or, when signed in, an avatar menu with My Profile (`/profile`), Get a Demo (`/demo`) and Logout; the mobile menu has the same entries. Sign-in is real: `useAuth` asks the backend (`GET /api/auth/me`) and the session is an HttpOnly cookie. `/profile` and `/demo` are guarded by `RequireAuth` (the server re-checks every call). Accounts are created by the CLI in `backend/`; there is no public sign-up. `/login` is prerendered but noindex and kept out of the sitemap; `/profile` and `/demo` are browser-rendered only.
- **Word highlight (`src/components/ui/BotHighlight.jsx`):** replaces the old underline strokes. Wrap a key word/phrase; when it scrolls into view it gets a soft halo, a small bot appears beside it, points, holds ~2s, then idles. The bot sits in a reserved inline slot (no layout shift, handles multi-line headings). Used sparingly: hero keyword, positioning statement, services bento heading, Services hero, Contact branches heading, Career hero. `SectionHeading` accepts `bot` for headings that use `gradient`.
- **Branches (`src/data/branches.js`):** Salem, Bangalore, Mumbai — single source for the hero, footer, About, Contact (`#branches` cards), Career, chatbot demo and Organization JSON-LD. Only Salem has an address on file; add `address` to the others when real details exist.

## Backend

Setup, API, security and deployment notes: [../backend/README.md](../backend/README.md). If the backend is down, forms and login show an error instead of pretending to succeed.

## Light / dark theme

- **Dark is the default** (the original violet glass look); **light** is a clean white version of the same identity. Toggle: sun/moon button in the navbar (all sizes) and a labelled "Light mode / Dark mode" button in the mobile menu.
- **How it works:** the theme is the `data-theme` attribute on `<html>`. All colours are CSS variables: Tailwind tokens in `@theme` (dark values) plus `:root[data-theme="light"]` overrides in `src/styles/index.css` (also the `--glass-*`, `--grad-*`, `--art-*` helper variables used by gradients and SVG art). Components must use tokens (`bg-night`, `text-fg`, `bg-tint/10`…) — never hard-coded theme colours.
- **Persistence:** saved in `localStorage` (`lax360-theme`), applied by a tiny inline script in `index.html` *before first paint* (no flash), and synced across tabs. `?theme=light` / `?theme=dark` on any URL sets it too.
- **Code:** `src/hooks/useTheme.js`, `src/components/ui/ThemeToggle.jsx`.
- Switching cross-fades colours for ~0.4s (skipped under `prefers-reduced-motion`). The prerendered HTML is always dark; light is applied on load.

## SEO — prerendering

`npm run build` now produces **static HTML for every route**: the client bundle is built, an SSR bundle (`src/entry-server.jsx`) is built, and `scripts/prerender.js` renders each page to `dist/<route>/index.html` (plus `dist/404.html`, marked `noindex`). Each file contains the real page content, its own title, description, canonical, Open Graph / Twitter tags, Organization JSON-LD, and Service JSON-LD on division pages. The browser then hydrates the page (`src/main.jsx`).

- **Set the production origin before building**: `VITE_SITE_URL=https://your-domain npm run build` (used for canonicals, og:url, og:image, sitemap and robots.txt). It currently defaults to `https://www.example.com`.
- **Hosting must serve `<route>/index.html`** for `/route` (Vercel/Netlify do; configure clean URLs). `vite preview` does not — use a trailing slash (`/about/`) when testing locally.
- Route list lives in `src/routes.js` (feeds prerender and sitemap). Add new routes there and in `src/App.jsx`.
- Per-page head values come from `useDocumentHead` (build time: recorded for the prerender script; browser: keeps tags in sync during navigation).
- OG share image: `public/assets/og-image.png` (1200×630, generated placeholder — replace with a designed one).
- Not yet done: Course / FAQPage / BreadcrumbList JSON-LD, LocalBusiness (needs confirmed address), hreflang (English only).

## Backend phase checklist

1. `POST /api/enquiry` — validate, spam token (Turnstile), rate limit, email, lead log. Shapes are documented at the top of `enquiryService.js`.
2. `POST /api/chat` — OpenAI behind a server, answering only from approved content in `src/data/`. Shape documented in `chatService.js`.
3. Privacy Policy updated to disclose AI processing; legal review of `legal.js`.
4. Secrets only on the server — never in `VITE_` variables.
