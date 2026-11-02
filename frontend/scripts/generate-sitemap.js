// Generates sitemap.xml from the route list below. Runs after `vite build` (see package.json).
// Set SITE_URL (or VITE_SITE_URL) to the production domain before deploying.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { routes } from '../src/routes.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const site = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://www.example.com').replace(/\/$/, '')


const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${site}${r === '/' ? '' : r}</loc></url>`).join('\n')}
</urlset>
`

for (const dir of ['public', 'dist']) {
  try {
    mkdirSync(resolve(root, dir), { recursive: true })
    writeFileSync(resolve(root, dir, 'sitemap.xml'), xml)
  } catch (e) {
    console.warn(`sitemap: could not write to ${dir}`, e.message)
  }
}
const robots = `User-agent: *
Allow: /
Disallow: /login
Disallow: /profile
Disallow: /demo
Disallow: /admin
Disallow: /api/

Sitemap: ${site}/sitemap.xml
`
for (const dir of ['public', 'dist']) {
  try { writeFileSync(resolve(root, dir, 'robots.txt'), robots) } catch (e) { console.warn(`robots: could not write to ${dir}`, e.message) }
}
console.log(`sitemap.xml written for ${site} (${routes.length} URLs)`)
