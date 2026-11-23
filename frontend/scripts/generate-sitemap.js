// Generates sitemap.xml from the route list below. Runs after `vite build` (see package.json).
// Set SITE_URL (or VITE_SITE_URL) to the production domain before deploying.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { routes } from '../src/routes.js'
import { LANGUAGES, pathIn, prefixOf } from '../src/i18n/languages.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const site = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://lax360.in').replace(/\/$/, '')


// Every page in every language, each with its hreflang alternates (the same page in the other languages and the English as the default)
const urlOf = (lang, r) => `${site}${r === '/' ? prefixOf(lang) : pathIn(lang, r)}`
const entry = (lang, r) => {
  const alts = [...LANGUAGES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l.htmlLang}" href="${urlOf(l.code, r)}" />`), `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlOf('en', r)}" />`].join('\n')
  return `  <url>\n    <loc>${urlOf(lang, r)}</loc>\n${alts}\n  </url>`
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGUAGES.flatMap((l) => routes.map((r) => entry(l.code, r))).join('\n')}
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
// robots.txt: everything public is crawlable; account, admin and API paths are not. Two sitemaps: the pages built into the website (this file, rebuilt with each deploy) and the pages published in the
// admin panel (served live by the backend through the rewrite in vercel.json, so a newly published article / product / industry / partner appears without a deploy).
const robots = `User-agent: *
Allow: /
Disallow: /company-admin
Disallow: /admin
Disallow: /user
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /profile
Disallow: /demo
Disallow: /api/

Sitemap: ${site}/sitemap.xml
Sitemap: ${site}/sitemap-content.xml
`
for (const dir of ['public', 'dist']) {
  try { writeFileSync(resolve(root, dir, 'robots.txt'), robots) } catch (e) { console.warn(`robots: could not write to ${dir}`, e.message) }
}
if (/example\.com/.test(site)) console.warn('!! SITE_URL is not set: sitemap.xml and robots.txt point at https://www.example.com. Set SITE_URL to the real website address for the production build.')
console.log(`sitemap.xml written for ${site} (${routes.length * LANGUAGES.length} URLs: ${routes.length} pages in ${LANGUAGES.length} languages)`)
