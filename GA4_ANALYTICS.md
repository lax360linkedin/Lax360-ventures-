# Google Analytics 4 on lax360.in

**Property:** LAX360 Official Website · **Measurement ID:** `G-S5BSB8RDBW` · Tag Manager container `GTM-MQC8T28C` is **not used** (the direct GA4 tag is sufficient).

## The one setting (Vercel > Project > Settings > Environment Variables)
| Name | Value | Environments |
|---|---|---|
| `VITE_GA_MEASUREMENT_ID` | `G-S5BSB8RDBW` | Production (add Preview only if you want preview deployments measured) |

* It is a build-time value: the site must be **built again after adding it**. In Vercel use Deployments > latest > Redeploy with "Use existing Build Cache" switched off (or push a commit).
* **Do not set `VITE_GTM_ID`.** When a container id is present it takes precedence: events then go only to the dataLayer and the direct GA4 tag is not loaded.
* Locally, put the same line in `frontend/.env.local` only if you want to test (it is git-ignored); use a throw-away id such as `G-TESTTEST01` so test traffic never reaches the real property.

## How it works (`frontend/src/utils/analytics.js`)
* Loads `gtag.js` once, and only when the id is set **and** the visitor accepted analytics cookies in the cookie banner; honours Do Not Track / Global Privacy Control; withdrawing consent disables the tag and deletes `_ga*` cookies. Nothing is embedded in `index.html` or the prerendered pages.
* `send_page_view: false`; page views are sent by `SeoWatcher` on every route change (SPA), once per page (a duplicate trigger within 1.5 s is dropped). Admin, sign-in, registration and password-reset pages are never reported.
* Every reported address is `origin + path` (no query string or #fragment); Google's automatic events are kept on that clean address too.
* `trackEvent()` drops any parameter that looks like personal data (name, e-mail, phone, message, token ... and any value containing an e-mail address or 8+ digits). Events carry only fixed labels.

## Events (successful actions only)
| Event | When | Parameters |
|---|---|---|
| `page_view` | each route change | `page_path`, `page_title`, `page_location` |
| `generate_lead` + `contact_form_submit` / `career_application` / `partner_enquiry` | an enquiry form was accepted by the server (not for errors, not for a duplicate the server detected) | `lead_type`, `lead_source` |
| `demo_request` | the demo request was saved | `interest` |
| `partner_application` | the Partner With Us application was saved | `partner_type`, `division` |
| `sign_up` | the account was created | `method: email` |
| `file_download` | a link to a file (pdf, doc, xls, ppt, zip ...) was clicked, a brochure marked `data-download`, or a product resource arrived from the server | `file_extension`, `link_location` (never the file name) |
| `whatsapp_click`, `phone_click`, `email_click` | click on a WhatsApp / `tel:` / `mailto:` link | `link_location` (never the number or address) |

Mark `generate_lead`, `partner_application`, `demo_request`, `sign_up` (and optionally `career_application`) as **key events** in GA4 (Admin > Events > "Mark as key event").

## Settings to change inside GA4 (they cannot be set from code)
Admin > Data streams > LAX360 Official Website > **Enhanced measurement > gear icon**: turn **OFF**
* **Page changes based on browser history events** (otherwise every route change is counted twice),
* **File downloads** (the site sends its own `file_download`),
* **Form interactions** (it would report form attempts, not successful submissions).
Leave "Scrolls", "Outbound clicks", "Site search" and "Video engagement" as you prefer.

## Checks that ship with the code
* `npm run test:analytics` (13 checks: consent gating, one tag, no duplicates, clean addresses, PII stripping, click events, withdrawal, success-only ordering in every form, no tag in HTML).
* `npm run build`, `seo:audit`, `seo:links`, `seo:routes`, `test:client` still pass.

## Production verification (after you approve, deploy and add the variable)
1. Open https://lax360.in in a clean/incognito window: the cookie banner shows; DevTools > Network (filter `googletagmanager`, `collect`) shows **no** request yet.
2. Click **Accept all**: one `gtag/js?id=G-S5BSB8RDBW` request and one `collect` request with `en=page_view`.
3. In GA4 > Admin > **DebugView** (enable with the "Google Analytics Debugger" Chrome extension), browse three pages by clicking menu links: exactly one `page_view` per page, none on back/forward duplicates, `dl` (page location) has no `?query`.
4. Click the WhatsApp button, a phone link, an e-mail link, and a brochure/PDF link: `whatsapp_click`, `phone_click`, `email_click`, `file_download` appear once each.
5. Submit a real test enquiry, a demo request, a Partner With Us application, a career application and a registration (use clearly fake test details and delete them in the admin afterwards): each produces its event **once**, only after the success message; a form with a validation error produces none.
6. In DebugView open any event: no name, e-mail, phone, message or token appears in any parameter.
7. Click **Cookie settings** in the footer and switch analytics off: no further `collect` requests, `_ga` cookies are removed.
8. GA4 > Reports > Realtime shows your visit within ~30 seconds; wait 24-48 hours before judging standard reports.
