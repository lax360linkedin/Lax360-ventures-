// Broken-link check of the BUILT site (run after `npm run build`):  node scripts/check-links.mjs   (npm run seo:links)
// Collects every internal link (<a href="/...">) and image/script/stylesheet reference from the prerendered pages and checks that it points at a page that is prerendered, a file in dist/ or
// public/, or an address under a path the website serves from managed content (services/products/industries/insights/our-network/our-team/websites). Exits with 1 when something dangles.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { noindexRoutes, routes } from '../src/routes.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const known = new Set([...routes, ...noindexRoutes, '/demo', '/user/dashboard', '/profile', '/company-admin', '/admin', '/projects'])
const DYNAMIC = ['/services/', '/products/', '/industries/', '/insights/', '/our-network/', '/our-team/', '/websites/']
const bad = new Map()
let checked = 0

const ok = (p0) => {
  const p = p0.replace(/^\/(ta|hi)(?=\/|$)/, '') || '/' // a translated address is the same page under /ta or /hi
  const path = p.length > 1 ? p.replace(/\/+$/, '') : p
  if (known.has(path)) return true
  if (existsSync(join(dist, path)) || existsSync(join(root, 'public', path))) return true
  return DYNAMIC.some((d) => path.startsWith(d)) // a page created from managed content (checked at run time by the website)
}

const pages = [...routes, ...noindexRoutes]
for (const route of [...pages, ...['ta', 'hi'].flatMap((l) => routes.map((r) => `/${l}${r === '/' ? '' : r}`))]) {
  const file = route === '/' ? join(dist, 'index.html') : join(dist, route.slice(1), 'index.html')
  if (!existsSync(file)) continue
  const html = readFileSync(file, 'utf8')
  for (const m of html.matchAll(/\s(?:href|src)="(\/[^"#?]*)(?:[#?][^"]*)?"/g)) {
    const target = decodeURI(m[1])
    if (target.startsWith('//')) continue
    checked += 1
    if (!ok(target)) { if (!bad.has(target)) bad.set(target, new Set()); bad.get(target).add(route) }
  }
}
console.log(`${checked} internal references checked on ${routes.length + noindexRoutes.length} pages`)
if (bad.size) {
  for (const [t, from] of bad) console.log(`  BROKEN ${t}  (on ${[...from].slice(0, 3).join(', ')}${from.size > 3 ? ` +${from.size - 3}` : ''})`)
  process.exit(1)
}
console.log('No broken internal links.')
