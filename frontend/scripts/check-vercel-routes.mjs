// Routing checks for vercel.json (no network): node scripts/check-vercel-routes.mjs   (npm run seo:routes)
// 1) every indexable route has a prerendered page, 2) no redirect chain or loop, 3) every redirect lands on a real route, 4) dynamic (admin-published) page shapes can be opened directly.
import { existsSync, readFileSync } from 'node:fs'
import { routes } from '../src/routes.js'

const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
const problems = []
for (const r of routes) {
  const file = r === '/' ? 'dist/index.html' : `dist${r}/index.html`
  if (!existsSync(new URL(`../${file}`, import.meta.url))) problems.push(`no prerendered page for ${r}`)
}
const literal = v.redirects.filter((r) => !r.has && !/[:(*]/.test(r.source))
const sources = new Set(literal.map((r) => r.source))
const known = new Set(routes)
for (const r of literal) {
  const dest = (r.destination.replace('https://lax360.in', '') || '/').replace(/^\/(ta|hi)(?=\/|$)/, '') || '/' // Tamil / Hindi targets are the same pages under a language prefix
  if (r.destination.startsWith('https://lax360.in') && sources.has(dest)) problems.push(`redirect chain: ${r.source} -> ${dest} -> ...`)
  if (r.source === dest) problems.push(`redirect loop: ${r.source}`)
  if (!known.has(dest)) problems.push(`redirect ${r.source} lands on ${dest}, which is not a real route`)
  if (!r.permanent) problems.push(`redirect ${r.source} is not permanent`)
}
for (const r of literal) if (known.has(r.source)) problems.push(`redirect source ${r.source} is a live page`)
const rewrites = new Set(v.rewrites.map((r) => r.source.replace(/\(\[a-z0-9-\]\{1,80\}\)/g, '')))
for (const r of v.rewrites) if (/:(slug|dept|service)(\/|$)/.test(r.source) && !/:(slug|dept|service)\(\[a-z0-9-\]\{1,80\}\)/.test(r.source)) problems.push(`rewrite ${r.source} must restrict the slug to [a-z0-9-] (up to 80 characters) so junk URLs get a real 404`)
for (const s of ['/products/:slug', '/industries/:slug', '/insights/:slug', '/our-network/:slug', '/websites/:slug', '/services/:slug', '/services/:slug/:service', '/locations/:slug', '/our-team/:dept', '/api/:path*']) if (!rewrites.has(s)) problems.push(`missing rewrite ${s}`)
// 5) response headers: both sitemaps carry "X-Robots-Tag: noindex" (the sitemap file itself must not be indexed; it stays a public 200 and is NOT blocked in robots.txt), and no public page does
const noindexRules = (v.headers || []).filter((h) => h.headers.some((x) => x.key.toLowerCase() === 'x-robots-tag' && /noindex/i.test(x.value)))
const noindexSources = new Set(noindexRules.map((h) => h.source))
for (const s of ['/sitemap.xml', '/sitemap-content.xml']) if (!noindexSources.has(s)) problems.push(`vercel.json has no "X-Robots-Tag: noindex" header rule for ${s}`)
const allowedNoindex = ['/company-admin/:path*', '/user/:path*', '/demo', '/sitemap.xml', '/sitemap-content.xml']
for (const s of noindexSources) if (!allowedNoindex.includes(s)) problems.push(`"X-Robots-Tag: noindex" is applied to ${s}, which could hide public pages`)
if (existsSync(new URL('../dist/robots.txt', import.meta.url))) {
  const robots = readFileSync(new URL('../dist/robots.txt', import.meta.url), 'utf8')
  if (/^\s*Disallow:\s*\/sitemap/im.test(robots)) problems.push('robots.txt blocks a sitemap')
  for (const s of ['/sitemap.xml', '/sitemap-content.xml']) if (!robots.includes(`Sitemap: https://lax360.in${s}`)) problems.push(`robots.txt does not list ${s}`)
}
console.log(`${routes.length} routes checked, ${literal.length} alias redirects, ${v.rewrites.length} rewrites, ${noindexRules.length} noindex header rules`)
if (problems.length) { console.log('Problems:\n  ' + problems.join('\n  ')); process.exit(1) }
console.log('Routing checks passed.')
