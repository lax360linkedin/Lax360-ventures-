// Client-side Play Zone tests (no browser needed): node scripts/test-play-zone-client.mjs
// Covers the admin-controlled configuration rules, the WebGL capability check, the error boundary and the route table.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

// .jsx files are loaded through Vite's own transformer (the same one the build uses), so no extra test framework is needed.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()] })
const { default: ErrorBoundary, SiteCrashPage } = await vite.ssrLoadModule('/src/components/ErrorBoundary.jsx')
const { games } = await vite.ssrLoadModule('/src/playzone/data/games.js')
const { applyConfig, unavailableReason } = await vite.ssrLoadModule('/src/playzone/configRules.js')

let passed = 0
const test = async (name, fn) => { try { await fn(); passed += 1; console.log(`  ok  ${name}`) } catch (e) { console.error(`FAIL  ${name}\n      ${e.stack.split('\n').slice(0, 3).join('\n      ')}`); process.exitCode = 1 } }
const cfg = (over = {}, gameOver = {}) => ({ enabled: true, maintenance: false, maintenance_message: '', guest_play: true, games: games.map((g, i) => ({ slug: g.slug, title: null, short_description: null, enabled: true, published: true, visibility: 'public', maintenance: false, featured: false, sort_order: i + 1, thumbnail_url: null, banner_url: null, ...(gameOver[g.slug] || {}) })), ...over })

await test('without a configuration (backend down) every game stays listed and playable', () => {
  assert.equal(applyConfig(games, null).length, 4)
  assert.equal(unavailableReason(null, 'puzzle-pop'), null)
})
await test('hidden and unpublished games leave the lobby; titles, order and featured follow the admin settings', () => {
  const c = cfg({}, { 'puzzle-pop': { visibility: 'hidden' }, 'bug-hunter': { published: false }, 'laxbot-jump': { title: 'Jump!', sort_order: 0 } })
  assert.deepEqual(applyConfig(games, c).map((g) => g.slug), ['laxbot-jump', 'catch-the-stars'])
  assert.equal(applyConfig(games, c)[0].title, 'Jump!')
  const f = cfg({}, { 'catch-the-stars': { sort_order: 9, featured: true } })
  assert.equal(applyConfig(games, f)[0].slug, 'catch-the-stars')
})
await test('closing the Play Zone, maintenance and per-game switches give a reason', () => {
  assert.match(unavailableReason(cfg({ enabled: false }), 'puzzle-pop'), /closed/)
  assert.equal(unavailableReason(cfg({ maintenance: true, maintenance_message: 'Back at 6' }), 'puzzle-pop'), 'Back at 6')
  assert.match(unavailableReason(cfg({}, { 'puzzle-pop': { enabled: false } }), 'puzzle-pop'), /not available/)
  assert.match(unavailableReason(cfg({}, { 'puzzle-pop': { maintenance: true } }), 'puzzle-pop'), /maintenance/)
  assert.equal(unavailableReason(cfg({}, { 'puzzle-pop': { enabled: false } }), 'bug-hunter'), null)
})
await test('the error boundary shows its fallback instead of children after an error, and recovers on reset', () => {
  assert.deepEqual(ErrorBoundary.getDerivedStateFromError(new Error('x')), { error: new Error('x') })
  const ok = renderToString(createElement(ErrorBoundary, { fallback: 'FALLBACK' }, createElement('p', null, 'CHILD')))
  assert.match(ok, /CHILD/)
  const b = new ErrorBoundary({ fallback: (e, reset) => `${e.message}:${typeof reset}`, children: 'c' })
  b.state = { error: new Error('boom') }
  assert.equal(b.render(), 'boom:function')
  let called
  b.setState = (s) => { called = s }
  b.reset()
  assert.deepEqual(called, { error: null })
})
await test('the crash page tells a stale deployment apart from a real error and never needs a provider', () => {
  const stale = renderToString(createElement(SiteCrashPage, { error: new Error('Failed to fetch dynamically imported module: /assets/x.js'), reset() {} }))
  assert.match(stale, /newer version/)
  const real = renderToString(createElement(SiteCrashPage, { error: new Error('boom'), reset() {} }))
  assert.match(real, /Something went wrong/); assert.match(real, /Try again/)
})
await test('the WebGL check returns false (never throws) when the browser cannot create a context', async () => {
  globalThis.document = { createElement: () => ({ getContext: () => { throw new Error('blocked') } }) }
  const m = await vite.ssrLoadModule('/src/utils/webgl.js')
  assert.equal(m.webglSupported(), false)
  assert.equal(m.gpuInfo().weak, false)
})
await test('the Vercel config rewrites every Play Zone and admin Play Zone route to the SPA', () => {
  const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)))
  const src = v.rewrites.map((r) => r.source)
  assert.ok(src.includes('/play-zone') && src.includes('/play-zone/:path*') && src.includes('/company-admin/:path*') && src.includes('/api/:path*'))
})
await test('every game in the catalogue is live and has a route in the app', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  for (const p of ['play-zone"', 'play-zone/leaderboard', 'play-zone/profile', 'play-zone/:game']) assert.ok(app.includes(p), p)
  assert.ok(games.every((g) => g.status === 'live'))
})
console.log(`\n${passed} client tests passed`)
await test('the Education course catalogue holds exactly the 53 courses of the supplied course list, numbered 1-53, each shown once', async () => {
  const { IT_COURSES, IT_GROUPS, COURSE_GROUPS, COURSE_COUNT } = await vite.ssrLoadModule('/src/data/educationCourses.js')
  const { EDU } = await vite.ssrLoadModule('/src/data/educationFranchise.js')
  assert.equal(COURSE_COUNT, 53); assert.equal(COURSE_GROUPS.length, 11)
  assert.deepEqual(IT_COURSES.map((c) => c.no), Array.from({ length: 53 }, (_, i) => i + 1))
  assert.equal(IT_COURSES[0].name, 'Certificate in Python Programming'); assert.equal(IT_COURSES[16].name, 'MERN Stack Development With AI'); assert.equal(IT_COURSES[52].name, 'Certificate in React Native'); assert.equal(new Set(IT_COURSES.map((c) => c.name)).size, 53)
  assert.deepEqual(COURSE_GROUPS.map((g) => g.courses.length), [6, 6, 4, 5, 5, 4, 6, 4, 4, 5, 4])
  assert.deepEqual(IT_GROUPS.flatMap((g) => g.nos).sort((a, b) => a - b), IT_COURSES.map((c) => c.no)) // the on-screen grouping drops and repeats nothing
  assert.equal(IT_COURSES.filter((c) => c.software === '').length, 5) // the five "Full Stack Development with AI" courses have no software entry ("-") in the document
  assert.equal(EDU.faqs.length, 10); assert.equal(EDU.documents.length, 24); assert.equal(EDU.onboarding.length, 9); assert.equal(EDU.packages.length, 3); assert.equal(EDU.crm.rows.length, 10); assert.equal(EDU.infrastructure.length, 10); assert.equal(EDU.responsibilities.length, 12)
})
await test('no Education programme page mentions Non-IT courses or the removed course list; all three pages read the one course file', async () => {
  const { readFileSync } = await import('node:fs')
  const files = ['data/educationFranchise.js', 'data/educationAuthorized.js', 'data/educationReferral.js', 'data/educationCourses.js', 'components/partner/EducationFranchiseBlocks.jsx', 'components/partner/EducationAuthorizedBlocks.jsx', 'components/partner/EducationReferralBlocks.jsx', 'components/partner/CourseCatalogue.jsx', 'pages/PartnerApply.jsx']
  for (const f of files) {
    const t = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
    assert.ok(!/Non-IT|NON_IT/.test(t.replace(/^\/\/.*$/gm, '')), `${f} still mentions Non-IT courses`)
    assert.ok(!/Microsoft Office & Advanced Excel|Ethical Hacking/.test(t), `${f} still lists a course that is not offered`)
  }
  for (const f of ['components/partner/EducationFranchiseBlocks.jsx', 'components/partner/EducationAuthorizedBlocks.jsx', 'components/partner/EducationReferralBlocks.jsx']) assert.ok(readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8').includes('CourseGroupsList'), `${f} must render the shared course list`)
})
await test('every partnership page is in the sitemap routes with a unique, correctly sized title and description, and FAQ structured data matches visible questions', async () => {
  const { CATEGORIES, opportunities, PARTNER_PAGES, faqJsonLd } = await vite.ssrLoadModule('/src/data/partnership.js')
  const { routes } = await vite.ssrLoadModule('/src/routes.js')
  const { fitTitle, fitDescription } = await vite.ssrLoadModule('/src/utils/seo.js')
  const pages = [...Object.values(PARTNER_PAGES).map((p) => [p.path, p.seoTitle, p.seoDescription]), ...CATEGORIES.map((c) => [c.path, c.seoTitle, c.seoDescription]), ...opportunities.map((o) => [o.path, o.seoTitle, o.seoDescription])]
  assert.equal(pages.length, 17)
  const seen = new Set()
  for (const [path, title, desc] of pages) {
    assert.ok(routes.includes(path), `${path} is missing from the sitemap routes`)
    const full = `${title} | LAX360 Pvt Ltd`
    assert.equal(fitTitle(full), full, `${path}: the title would be shortened by fitTitle (${full.length} characters)`)
    assert.ok(desc.length >= 100 && desc.length <= 160 && fitDescription(desc) === desc && desc.endsWith('.'), `${path}: description length ${desc.length}`)
    assert.ok(!seen.has(title) && !seen.has(desc), `${path}: title or description repeated`); seen.add(title); seen.add(desc)
    assert.ok(!/Non-IT|guarantee(d)? (income|placement|job)/i.test(title + desc), `${path}: banned wording`)
  }
  const ld = faqJsonLd([{ q: 'Is it free?', a: 'Yes.' }, { q: '', a: 'x' }])
  assert.equal(ld['@type'], 'FAQPage'); assert.equal(ld.mainEntity.length, 1); assert.equal(faqJsonLd([]), null)
})
await test('partnership pages use only the global theme tokens: no hard-coded colours and no colour utility that the theme does not define', async () => {
  const { readFileSync, readdirSync } = await import('node:fs')
  const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
  const css = src('styles/index.css')
  const tokens = new Set([...css.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1])) // the colours the theme system defines (they change with the selected theme)
  const ok = new Set([...tokens, 'transparent', 'current', 'white', 'black', 'inherit'])
  const dirs = ['components/partner', 'pages', 'admin/partnerships']
  const files = [...dirs.flatMap((d) => readdirSync(new URL(`../src/${d}/`, import.meta.url)).filter((f) => f.endsWith('.jsx') && (d !== 'pages' || f.startsWith('Partner'))).map((f) => `${d}/${f}`)), 'components/layout/PartnerMenu.jsx', 'data/partnership.js']
  const nonColour = /^(?:\d|\[|gradient-|linear-|radial-|conic-|clip-|no-repeat|repeat|origin-|position-|blend-|size-|cover$|contain$|center$|none$|fixed$|local$|scroll$)/
  for (const f of files) {
    const t = src(f).replace(/^\s*\/\/.*$/gm, '')
    assert.ok(!/(?<![&\w])#[0-9a-fA-F]{3,8}\b(?![\w-])/.test(t.replace(/&#\d+;/g, '').replace(/href="#[^"]*"|['"`]#[a-z-]+['"`]|\$\{[^}]*#[^}]*\}/g, '')), `${f}: hard-coded hex colour; use a theme token (var(--color-primary), bg-primary, text-lav ...)`)
    assert.ok(!/\b(?:bg|text|border|from|to|via|ring|fill|stroke|divide|outline|shadow)-(?:slate|gray|zinc|neutral|stone|red|green|blue|indigo|purple|violet|sky|pink|rose|amber|yellow|emerald|teal|cyan|orange|lime|fuchsia)-\d{2,3}\b/.test(t), `${f}: fixed Tailwind palette colour; use a theme token`)
    for (const m of t.matchAll(/(?<=[\s"'`:])(?:bg|from|to|via|ring-offset)-([a-z][a-z0-9-]*)(?:\/\d+)?(?=[\s"'`}])/g)) {
      const name = m[1]
      if (ok.has(name) || nonColour.test(name)) continue
      assert.fail(`${f}: bg-${name} is not a colour defined by the theme (it would render transparent). Defined: ${[...tokens].join(', ')}`)
    }
  }
  assert.ok(tokens.has('night') && tokens.has('primary') && tokens.has('edge') && !tokens.has('bg'))
})
process.exit(process.exitCode || 0) // Vite's dev server keeps handles open; the tests are finished
