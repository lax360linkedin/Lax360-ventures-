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
await test('the Education course catalogue holds all 20 IT courses of the supplied document, numbered 1-20, each shown once', async () => {
  const { IT_COURSES, IT_GROUPS, NON_IT_COURSES } = await vite.ssrLoadModule('/src/data/educationCourses.js')
  const { EDU } = await vite.ssrLoadModule('/src/data/educationFranchise.js')
  assert.deepEqual(IT_COURSES.map((c) => c.no), Array.from({ length: 20 }, (_, i) => i + 1))
  assert.equal(IT_COURSES[0].name, 'Python Programming'); assert.equal(IT_COURSES[19].name, 'Microsoft Office & Advanced Excel'); assert.equal(new Set(IT_COURSES.map((c) => c.name)).size, 20)
  assert.deepEqual(IT_GROUPS.flatMap((g) => g.nos).sort((a, b) => a - b), IT_COURSES.map((c) => c.no)) // the on-screen grouping drops and repeats nothing
  assert.equal(NON_IT_COURSES.length, 0) // the document gives no Non-IT list: none is invented
  assert.equal(EDU.faqs.length, 10); assert.equal(EDU.documents.length, 24); assert.equal(EDU.onboarding.length, 9); assert.equal(EDU.packages.length, 3); assert.equal(EDU.crm.rows.length, 10); assert.equal(EDU.infrastructure.length, 10); assert.equal(EDU.responsibilities.length, 12)
})
process.exit(process.exitCode || 0) // Vite's dev server keeps handles open; the tests are finished
