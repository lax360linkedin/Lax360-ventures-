// SEO audit of the BUILT site (run after `npm run build`):  node scripts/seo-audit.mjs   (npm run seo:audit)
// Reads every prerendered page in dist/ (what a crawler receives before any JavaScript runs) and checks: unique title and description (and their length), canonical, a single h1, a heading
// order without skips, Open Graph / Twitter tags, the robots meta of noindex pages, valid JSON-LD, images without an alt attribute, and the sitemap / robots.txt. Exits with 1 if a rule is broken.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { noindexRoutes, routes } from '../src/routes.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const problems = []
const warnings = []
const rows = []
const titles = new Map()
const descriptions = new Map()

const pageFile = (route) => (route === '/' ? join(dist, 'index.html') : join(dist, route.slice(1), 'index.html'))
const attr = (tag, name) => (new RegExp(`${name}="([^"]*)"`, 'i').exec(tag) || [])[1]
const meta = (html, key, value) => { const m = new RegExp(`<meta[^>]*${key}="${value}"[^>]*>`, 'i').exec(html); return m ? attr(m[0], 'content') : undefined }
const decode = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&#39;/g, "'")

function audit(route, { indexable }) {
  const file = pageFile(route)
  if (!existsSync(file)) { problems.push(`${route}: not prerendered (${relative(root, file)} missing)`); return }
  const html = readFileSync(file, 'utf8')
  const title = decode((/<title>([\s\S]*?)<\/title>/i.exec(html) || [])[1])
  const desc = decode(meta(html, 'name', 'description'))
  const canonical = (/<link[^>]*rel="canonical"[^>]*>/i.exec(html) || [''])[0]
  const issues = []
  if (!title) issues.push('no <title>')
  else if (title.length > 70) warnings.push(`${route}: title is ${title.length} characters (search results cut it at about 60)`)
  if (!desc) issues.push('no meta description')
  else if (desc.length > 170) warnings.push(`${route}: description is ${desc.length} characters (search results cut it at about 155)`)
  else if (desc.length < 50) warnings.push(`${route}: description is only ${desc.length} characters`)
  if (indexable) {
    if (!canonical) issues.push('no canonical link')
    for (const [map, v, label] of [[titles, title, 'title'], [descriptions, desc, 'description']]) {
      if (!v) continue
      if (map.has(v)) issues.push(`duplicate ${label} (also on ${map.get(v)})`)
      else map.set(v, route)
    }
    if (/<meta[^>]*name="robots"[^>]*noindex/i.test(html)) issues.push('indexable page has noindex')
  } else if (!/<meta[^>]*name="robots"[^>]*noindex/i.test(html)) issues.push('noindex page is missing its robots meta')
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  const h1 = (body.match(/<h1[\s>]/gi) || []).length
  if (h1 !== 1) issues.push(`${h1} <h1> elements (expected exactly 1)`)
  const levels = [...body.matchAll(/<h([1-6])[\s>]/gi)].map((m) => Number(m[1]))
  for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) { warnings.push(`${route}: heading level jumps from h${levels[i - 1]} to h${levels[i]}`); break }
  for (const k of ['og:title', 'og:description', 'og:url', 'og:image']) if (!meta(html, 'property', k)) issues.push(`missing ${k}`)
  for (const k of ['twitter:card', 'twitter:image', 'twitter:title']) if (!meta(html, 'name', k)) issues.push(`missing ${k}`)
  const ld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  const types = []
  for (const m of ld) {
    try { const j = JSON.parse(m[1]); [].concat(j['@graph'] || j).forEach((n) => types.push([].concat(n['@type']).join('+'))) } catch { issues.push('invalid JSON-LD') }
  }
  if (indexable && route !== '/' && !types.some((t) => /BreadcrumbList/.test(t))) warnings.push(`${route}: no BreadcrumbList structured data`)
  const noAlt = (body.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) || []).length
  if (noAlt) issues.push(`${noAlt} image(s) without an alt attribute`)
  const sample = (/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i.exec(html) || [])[1] || ''
  if (indexable && /example\.com/.test(sample)) issues.push('canonical points at the placeholder domain (set SITE_URL for the build)')
  issues.forEach((i) => problems.push(`${route}: ${i}`))
  rows.push({ route, title: title.slice(0, 48), desc: desc.length, h1, ld: types.join(',') || '-', ok: issues.length === 0 })
}

routes.forEach((r) => audit(r, { indexable: true }))
noindexRoutes.forEach((r) => audit(r, { indexable: false }))
if (existsSync(join(dist, '404.html'))) { const h = readFileSync(join(dist, '404.html'), 'utf8'); if (!/noindex/i.test(h)) problems.push('/404: the not-found page must be noindex') } else problems.push('dist/404.html is missing')

// sitemap and robots
const sm = existsSync(join(dist, 'sitemap.xml')) ? readFileSync(join(dist, 'sitemap.xml'), 'utf8') : ''
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
if (!urls.length) problems.push('sitemap.xml has no URLs')
if (new Set(urls).size !== urls.length) problems.push('sitemap.xml lists a URL twice')
if (urls.some((u) => /example\.com/.test(u))) problems.push('sitemap.xml uses the placeholder domain (set SITE_URL for the build)')
for (const bad of [...noindexRoutes, '/company-admin', '/user', '/demo']) if (urls.some((u) => u.endsWith(bad))) problems.push(`sitemap.xml lists ${bad}`)
const robots = existsSync(join(dist, 'robots.txt')) ? readFileSync(join(dist, 'robots.txt'), 'utf8') : ''
if (!/Sitemap:\s*https?:\/\//.test(robots)) problems.push('robots.txt has no Sitemap line')
for (const p of ['/company-admin', '/user', '/api/']) if (!robots.includes(`Disallow: ${p}`)) problems.push(`robots.txt does not disallow ${p}`)

const pad = (s, n) => String(s).padEnd(n).slice(0, n)
console.log(`${pad('route', 46)} ${pad('title', 48)} desc  h1  structured data`)
rows.forEach((r) => console.log(`${r.ok ? ' ' : '!'}${pad(r.route, 45)} ${pad(r.title, 48)} ${pad(r.desc, 5)} ${pad(r.h1, 3)} ${r.ld}`))
console.log(`\n${rows.length} pages, ${urls.length} sitemap URLs`)
if (warnings.length) console.log(`\nWarnings (${warnings.length}):\n  ${warnings.join('\n  ')}`)
if (problems.length) { console.log(`\nProblems (${problems.length}):\n  ${problems.join('\n  ')}`); process.exit(1) }
console.log('\nNo problems found.')
// (statSync / readdirSync are imported for ad-hoc extensions of this script)
void statSync; void readdirSync
