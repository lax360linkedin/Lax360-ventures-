// Google Analytics 4 integration checks (no browser, no network, nothing is sent to Google): node scripts/test-analytics.mjs   (npm run test:analytics)
// A fake browser (document, window, localStorage, a click listener) is installed, the real src/utils/analytics.js runs against it with a placeholder measurement id, and the dataLayer is inspected.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'

const GA_TEST_ID = 'G-TESTTEST01'
process.env.VITE_GA_MEASUREMENT_ID = GA_TEST_ID
delete process.env.VITE_GTM_ID

// ---- a minimal browser ----
const store = new Map()
const scripts = []
let clickHandler = null
globalThis.window = globalThis
Object.defineProperty(globalThis, 'navigator', { value: { doNotTrack: null, globalPrivacyControl: false }, configurable: true, writable: true })
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
window.location = { origin: 'https://lax360.in', hostname: 'lax360.in', pathname: '/', href: 'https://lax360.in/' }
window.matchMedia = () => ({ matches: false })
globalThis.document = {
  title: 'LAX360 Pvt Ltd', cookie: '',
  head: { appendChild: (s) => scripts.push(s) },
  querySelector: (sel) => scripts.find((s) => sel === `script[src="${s.src}"]`) || null,
  createElement: () => ({}),
  addEventListener: (type, fn) => { if (type === 'click') clickHandler = fn },
}
const link = (href, attrs = {}, inside = 'main') => ({ closest: (q) => (q === 'a[href]' ? link(href, attrs, inside) : q.includes(inside) ? {} : null), getAttribute: (n) => (n === 'href' ? href : attrs[n] ?? null), hasAttribute: (n) => n in attrs })
const click = (href, attrs, inside) => { const a = link(href, attrs, inside); clickHandler({ target: { closest: (q) => (q === 'a[href]' ? a : null) } }) }

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', configFile: false })
const A = await vite.ssrLoadModule('/src/utils/analytics.js')
const C = await vite.ssrLoadModule('/src/utils/consent.js')

let passed = 0
let failed = 0
const test = async (name, fn) => { try { await fn(); passed += 1; console.log(`  ok  ${name}`) } catch (e) { failed += 1; console.error(`FAIL  ${name}\n      ${e.stack.split('\n').slice(0, 3).join('\n      ')}`) } }
const events = () => (window.dataLayer || []).map((x) => Array.from(x)).filter((x) => x[0] === 'event').map((x) => ({ name: x[1], ...x[2] }))
const named = (n) => events().filter((e) => e.name === n)
const gaScripts = () => scripts.filter((s) => s.src.includes('googletagmanager.com/gtag/js'))

await test('nothing is loaded, stored or sent before the visitor accepts analytics cookies', () => {
  A.connectConsent(); A.trackOutboundClicks()
  A.initAnalytics(); A.trackEvent('generate_lead', { lead_type: 'project' }); A.trackPageView('/about', 'About')
  assert.equal(scripts.length, 0); assert.equal(window.dataLayer, undefined); assert.equal(A.analyticsEnabled(), false)
})

await test('Do Not Track / Global Privacy Control stops analytics even after consent', () => {
  navigator.doNotTrack = '1'
  C.setConsent({ analytics: true })
  assert.equal(A.analyticsEnabled(), false); assert.equal(scripts.length, 0, 'no tag may load')
  navigator.doNotTrack = null; navigator.globalPrivacyControl = true
  C.setConsent({ analytics: true })
  assert.equal(scripts.length, 0)
  navigator.globalPrivacyControl = false
})

await test('after consent exactly ONE GA4 tag loads, with the configured id and automatic page views off', () => {
  C.setConsent({ analytics: true })
  assert.equal(gaScripts().length, 1); assert.ok(gaScripts()[0].src.endsWith(`?id=${GA_TEST_ID}`))
  const config = window.dataLayer.map((x) => Array.from(x)).filter((x) => x[0] === 'config')
  assert.equal(config.length, 1); assert.equal(config[0][1], GA_TEST_ID); assert.equal(config[0][2].send_page_view, false)
  assert.equal(scripts.filter((s) => s.src.includes('gtm.js')).length, 0, 'Tag Manager must not be installed alongside the direct tag')
})

await test('repeated start-up calls and repeated consent changes never add a second tag or a second config', () => {
  A.initAnalytics(); A.initAnalytics(); A.connectConsent(); C.setConsent({ analytics: true }); C.setConsent({ analytics: true })
  assert.equal(gaScripts().length, 1)
  assert.equal(window.dataLayer.map((x) => Array.from(x)).filter((x) => x[0] === 'config').length, 1)
})

await test('accepting later reports the page the visitor is on once; a route change reports one page view per page', () => {
  assert.deepEqual(named('page_view').map((e) => e.page_path), ['/'], 'accepting later reports the current page exactly once (repeated consent changes added nothing)')
  A.trackPageView('/franchise/it', 'IT & Software Franchise Opportunity')
  A.trackPageView('/franchise/it', 'IT & Software Franchise Opportunity') // a duplicate trigger (e.g. a re-render) within 1.5 s
  assert.equal(named('page_view').length, 2)
  A.trackPageView('/partner-with-us', 'Franchise & Partnership Opportunities')
  assert.deepEqual(named('page_view').map((e) => e.page_path), ['/', '/franchise/it', '/partner-with-us'])
  assert.equal(named('page_view')[1].page_location, 'https://lax360.in/franchise/it')
})

await test('page views never include a query string or fragment, and admin / sign-in / password-reset pages are never reported', () => {
  const before = named('page_view').length
  for (const p of ['/company-admin/enquiries', '/admin', '/login', '/register', '/forgot-password', '/reset-password?token=abc123']) A.trackPageView(p, 'x')
  assert.equal(named('page_view').length, before)
  A.trackPageView('/contact?type=partnership&email=someone@example.com#top', 'Contact')
  const last = named('page_view').at(-1)
  assert.equal(last.page_path, '/contact'); assert.equal(last.page_location, 'https://lax360.in/contact')
  assert.ok(!JSON.stringify(window.dataLayer).includes('someone@example.com'))
})

await test('automatic events from Google are kept on the clean address too (no query string, no token)', () => {
  window.location.pathname = '/reset-password'
  A.trackPageView('/reset-password?token=SECRETTOKEN', 'Reset')
  const sets = window.dataLayer.map((x) => Array.from(x)).filter((x) => x[0] === 'set').map((x) => x[1].page_location)
  assert.ok(sets.length >= 1 && sets.every((u) => !/[?#]/.test(u)), 'every page_location set is clean')
  assert.equal(sets.at(-1), 'https://lax360.in/reset-password')
  assert.ok(!JSON.stringify(window.dataLayer).includes('SECRETTOKEN'))
  window.location.pathname = '/'
})

await test('personal data is stripped from every event, whatever calls trackEvent', () => {
  A.trackEvent('generate_lead', { lead_type: 'project', lead_source: 'contact', name: 'Asha Rao', email: 'asha@example.com', phone: '+91 98765 43210', message: 'Please call me', note: 'mail me at asha@example.com', num: '9876543210' })
  const e = named('generate_lead').at(-1)
  assert.deepEqual(Object.keys(e).sort(), ['lead_source', 'lead_type', 'name'].sort())
  assert.equal(e.lead_type, 'project'); assert.equal(e.name, 'generate_lead')
  const all = JSON.stringify(window.dataLayer)
  for (const secret of ['Asha Rao', 'asha@example.com', '98765', 'Please call me']) assert.ok(!all.includes(secret), `${secret} leaked`)
  assert.deepEqual(A.cleanParams({ interest: 'web', long: 'x'.repeat(300) }).long.length, 100)
  assert.equal(A.cleanParams({ user_id: '7', uid: 'u' }).user_id, undefined)
})

await test('event names are validated (nothing unusual is sent)', () => {
  const before = events().length
  A.trackEvent('Bad Name!', {}); A.trackEvent('', {}); A.trackEvent('x'.repeat(50), {})
  assert.equal(events().length, before)
})

await test('WhatsApp, phone, e-mail and file-download clicks are tracked once each; ordinary links are not', () => {
  const n = () => events().length
  let b = n(); click('https://wa.me/919566679928?text=Hi', {}, 'footer'); assert.equal(n(), b + 1); assert.deepEqual([named('whatsapp_click').at(-1).link_location], ['footer'])
  b = n(); click('tel:+919566679928', {}, 'header'); assert.equal(named('phone_click').length, 1); assert.equal(n(), b + 1)
  b = n(); click('mailto:hr@lax360.in', {}, 'main'); assert.equal(named('email_click').length, 1); assert.equal(n(), b + 1)
  assert.ok(!JSON.stringify(events()).includes('919566679928') && !JSON.stringify(events()).includes('hr@lax360.in'), 'the number / address must not be sent')
  b = n(); click('https://files.example.com/brochure.pdf?x=1', {}, 'main'); assert.equal(n(), b + 1); assert.equal(named('file_download').at(-1).file_extension, 'pdf')
  b = n(); click('https://cdn.example.com/signed/abc', { 'data-download': 'pdf' }, 'main'); assert.equal(n(), b + 1)
  b = n(); click('blob:https://lax360.in/1234', {}, 'main'); assert.equal(n(), b, 'blob downloads are reported by the code that creates them')
  b = n(); click('/about', {}, 'main'); click('https://example.com/page.html', {}, 'main'); assert.equal(n(), b)
  assert.ok(!JSON.stringify(named('file_download')).includes('brochure'), 'the file name is never sent')
  A.trackFileDownload('PDF!', 'product'); assert.equal(named('file_download').at(-1).file_extension, 'pdf')
})

await test('withdrawing consent stops all sending and disables the tag; accepting again resumes without a second tag', () => {
  C.setConsent({ analytics: false })
  assert.equal(window[`ga-disable-${GA_TEST_ID}`], true)
  const before = events().length
  A.trackEvent('generate_lead', { lead_type: 'project' }); click('tel:+91000', {}, 'main'); A.trackPageView('/about', 'About')
  assert.equal(events().length, before)
  C.setConsent({ analytics: true })
  assert.equal(window[`ga-disable-${GA_TEST_ID}`], false); assert.equal(gaScripts().length, 1)
  A.trackEvent('generate_lead', { lead_type: 'project' }); assert.equal(events().length, before + 1)
})

// ---- source checks: success-only events, one loader, no hard-coded tag ----
const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
const after = (text, first, second) => { const a = text.indexOf(first); const b = text.indexOf(second); return a >= 0 && b > a }

await test('conversion events fire only after the server confirmed the action (never for an attempt or an error)', () => {
  const enq = src('services/enquiryService.js')
  assert.ok(after(enq, "await api('/api/contact'", "trackEvent('generate_lead'") && enq.includes('if (!res.duplicate)'), 'enquiry: after the API call, not for a duplicate')
  assert.ok(src('services/branchService.js').includes("api('/api/demo-requests', { method: 'POST', body: payload }).then((r) => { trackEvent('demo_request'"), 'demo request: in .then of the API call')
  const partner = src('pages/PartnerApply.jsx'); const tryAt = partner.indexOf("await submitApplication(body)"); const trackAt = partner.indexOf("trackEvent('partner_application'"); const catchAt = partner.indexOf('} catch (err)', tryAt)
  assert.ok(tryAt > 0 && trackAt > tryAt && trackAt < catchAt, 'partner application: after submitApplication succeeded, before the catch')
  const auth = src('hooks/useAuth.js'); const reg = auth.indexOf('await register('); assert.ok(reg > 0 && auth.indexOf("trackEvent('sign_up'") > reg && auth.indexOf("trackEvent('sign_up'") < auth.indexOf('} catch', reg), 'sign-up: after register succeeded')
  const dl = src('components/products/ProductDownloads.jsx'); assert.ok(after(dl, "/download`, { as: 'blob' })", 'trackFileDownload(') && dl.indexOf('trackFileDownload(') < dl.indexOf('} catch (e)'), 'download: after the file arrived')
  for (const f of ['components/career/ApplyForm.jsx', 'components/contact/LeadForm.jsx', 'components/sections/EnquiryForm.jsx', 'components/network/PartnerForm.jsx', 'components/network/PartnershipModal.jsx', 'components/sections/WelcomeContactCard.jsx']) assert.ok(!src(f).includes('trackEvent('), `${f} must not track on its own: enquiries are tracked once in submitEnquiry`)
})

await test('there is exactly one analytics loader: no tag in index.html, no second script URL anywhere, no duplicate page-view caller', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.ok(!/googletagmanager|gtag\(|dataLayer|G-[A-Z0-9]{8,}|GTM-[A-Z0-9]{5,}/.test(html), 'index.html must not embed a tag')
  const files = ['main.jsx', 'App.jsx', 'components/layout/RootLayout.jsx', 'components/layout/SeoWatcher.jsx', 'components/layout/CookieBanner.jsx', 'pages/Home.jsx']
  for (const f of files) assert.ok(!/googletagmanager\.com/.test(src(f)), `${f} loads a tag`)
  assert.ok((src('utils/analytics.js').match(/googletagmanager\.com/g) || []).length === 2, 'only analytics.js loads gtag.js / gtm.js')
  const callers = ['components/layout/SeoWatcher.jsx', 'components/layout/RootLayout.jsx', 'App.jsx', 'main.jsx'].filter((f) => /trackPageView\(/.test(src(f)))
  assert.deepEqual(callers, ['components/layout/SeoWatcher.jsx'], 'only the route watcher reports page views')
  assert.ok(!/G-[A-Z0-9]{8,}/.test(src('utils/analytics.js').replace(/G-XXXXXXXXXX/g, '')), 'the measurement id comes from VITE_GA_MEASUREMENT_ID, never hard-coded')
})

console.log(`\n${passed} analytics checks passed${failed ? `, ${failed} FAILED` : ''}`)
process.exit(failed ? 1 : 0)
