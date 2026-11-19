// Static prerender: renders every route to HTML (with its own head tags and JSON-LD) after the
// client and SSR bundles are built. Output: dist/<route>/index.html and dist/404.html.
//
//   vite build && vite build --ssr src/entry-server.jsx --outDir dist-server && node scripts/prerender.js
//
// Set SITE_URL (or VITE_SITE_URL) to the production origin so canonical and og:url are absolute.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { noindexRoutes, routes } from '../src/routes.js'
import { SITE_TOKEN, postalAddress } from '../src/utils/seo.js'
import { LANGUAGES, pathIn, prefixOf } from '../src/i18n/languages.js'
import { norm, setDictionary } from '../src/i18n/translator.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://lax360-ventures.vercel.app').replace(/\/$/, '')
if (/example\.com/.test(SITE)) console.warn('!! SITE_URL is not set: canonical links, the sitemap and social previews point at https://www.example.com. Set SITE_URL (the real website address) for the production build.')
const { render, site, setDictionary: setSsrDictionary } = await import(pathToFileURL(resolve(root, 'dist-server/entry-server.js')).href)
const template = readFileSync(resolve(root, 'dist/index.html'), 'utf8')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
// JSON inside <script> must not contain "</script>" or HTML comment openers.
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c')

const postal = postalAddress

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'LAX360 Pvt Ltd',
  legalName: site.legalEntity,
  url: SITE,
  logo: `${SITE}/assets/logo-shield.png`,
  email: site.email,
  telephone: site.phones.map((p) => p.tel),
  address: postal(site.branches[0]),
  // One Place per branch, with the official address and phone from data/branches.js.
  location: site.branches.map((b) => ({ '@type': 'Place', name: b.name, telephone: b.tel, hasMap: b.mapUrl, address: postal(b) })),
  sameAs: site.social.map((s) => s.href),
}

// Search-engine / social verification tags, from the environment (public values): Google Search Console and Bing Webmaster Tools.
const verification = [
  process.env.VITE_GSC_VERIFICATION ? `<meta name="google-site-verification" content="${esc(process.env.VITE_GSC_VERIFICATION)}" />` : '',
  process.env.VITE_BING_VERIFICATION ? `<meta name="msvalidate.01" content="${esc(process.env.VITE_BING_VERIFICATION)}" />` : '',
].filter(Boolean)

function headTags(head, route, lang = 'en') {
  const url = head.canonical || SITE + (route === '/' ? prefixOf(lang) : pathIn(lang, route))
  const raw = head.image || '/assets/og-image.png'
  const image = /^https?:/.test(raw) ? raw : SITE + raw
  const tags = [
    `<title>${esc(head.title)}</title>`,
    `<meta name="description" content="${esc(head.description)}" />`,
    head.keywords ? `<meta name="keywords" content="${esc(head.keywords)}" />` : '',
    `<link rel="canonical" href="${esc(url)}" />`,
    head.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />',
    `<meta property="og:type" content="${esc(head.ogType || 'website')}" />`,
    '<meta property="og:site_name" content="LAX360 Pvt Ltd" />',
    `<meta property="og:locale" content="${esc(LANGUAGES.find((l) => l.code === lang).locale)}" />`,
    `<meta property="og:title" content="${esc(head.title)}" />`,
    `<meta property="og:description" content="${esc(head.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(head.title)}" />`,
    `<meta name="twitter:description" content="${esc(head.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    ...(head.noindex || route === '/404' ? [] : [...LANGUAGES.map((l) => `<link rel="alternate" hreflang="${l.htmlLang}" href="${esc(SITE + (route === '/' ? prefixOf(l.code) : pathIn(l.code, route)))}" />`), `<link rel="alternate" hreflang="x-default" href="${esc(SITE + (route === '/' ? '' : route))}" />`]),
    ...verification,
    head.noindex ? '' : `<script type="application/ld+json">${json(organization)}</script>`,
    head.jsonLd ? `<script type="application/ld+json" id="page-jsonld">${json(head.jsonLd).split(SITE_TOKEN).join(SITE)}</script>` : '',
  ]
  return tags.filter(Boolean).join('\n    ')
}

// Strip the generic defaults from index.html; they are replaced per route.
const stripped = template
  .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
  .replace(/<meta\s+(?:name="(?:description|twitter:[a-z]+|robots|keywords)"|property="og:[^"]+")[^>]*>\s*/gi, '')

// ---- translated HTML ----------------------------------------------------------------------------------------------------------------------------------
// The page is rendered once in English (React, with the language set so links and the head carry the language prefix), then every English text of the HTML is replaced by its translation
// (text between tags and the placeholder / title / alt / aria-label attributes), exactly what the browser does at run time (src/i18n/translator.js). A text with no translation stays English.
const decode = (t) => t.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const encode = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const ATTR = /\b(placeholder|title|alt|aria-label|aria-description)="([^"]*)"/g
const RAW = /(<(script|style|textarea)\b[\s\S]*?<\/\2>)/gi

function translateHtml(html, dict) {
  const keep = []
  const masked = html.replace(RAW, (m) => { keep.push(m); return `\u0000${keep.length - 1}\u0000` })
  const out = masked
    .replace(/>([^<>]+)</g, (m, text) => {
      const key = norm(decode(text))
      const t = key && dict[key]
      if (!t || t === key) return m
      return `>${/^\s*/.exec(text)[0]}${encode(t)}${/\s*$/.exec(text)[0]}<`
    })
    .replace(ATTR, (m, name, val) => {
      const t = dict[norm(decode(val))]
      return t ? `${name}="${esc(t)}"` : m
    })
  return out.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[Number(i)])
}

// ---- the strings of a page (for the admin panel's Translations screen) -------------------------------------------------------------------------------
const meaningful = (t) => t.length > 1 && /\p{L}/u.test(t) && !/^[\w.+-]+@[\w.-]+$/.test(t) && !/^https?:\/\//.test(t) && !/^[+\d\s().-]{6,}$/.test(t)
function extractStrings(html) {
  const found = []
  let section = ''
  let heading = null
  const body = html.replace(RAW, '').replace(/<head[\s\S]*?<\/head>/i, '')
  for (const m of body.matchAll(/<(\/?)(h[1-3])\b[^>]*>|<[^>]+>|([^<]+)/g)) {
    if (m[2]) { heading = m[1] ? null : ''; continue }
    if (m[3]) {
      const t = norm(decode(m[3]))
      if (heading !== null) heading += (heading ? ' ' : '') + t
      if (meaningful(t)) found.push({ s: t, section })
      if (heading !== null) section = heading
      continue
    }
    for (const a of m[0].matchAll(ATTR)) { const t = norm(decode(a[2])); if (meaningful(t)) found.push({ s: t, section }) }
  }
  return found
}
const collected = { pages: [] }

const dictionaries = { en: {} }
for (const l of LANGUAGES) {
  const file = resolve(root, `src/i18n/catalogs/${l.code}.json`)
  if (l.code !== 'en' && existsSync(file)) dictionaries[l.code] = JSON.parse(readFileSync(file, 'utf8'))
}

async function build(route, outFile, lang = 'en') {
  const dict = dictionaries[lang] || {}
  setSsrDictionary(dict) // the head text is translated while React renders (hooks/useDocumentHead.js)
  const { html, head } = await render(route, lang)
  if (!head) throw new Error(`No head data recorded for ${route}`)
  const body = lang === 'en' ? html : translateHtml(html, dict)
  const ln = LANGUAGES.find((l) => l.code === lang)
  const page = stripped
    .replace('<html lang="en">', `<html lang="${ln.htmlLang}">`)
    .replace('</head>', `    ${headTags(head, route === '/404' ? '/404' : route, lang)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root" data-route="${route}">${body}</div>`)
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, page)
  if (lang === 'en') {
    const seen = new Set()
    const strings = [{ s: norm(head.titleKey), section: 'Search & sharing (title)' }, { s: norm(head.descriptionKey), section: 'Search & sharing (description)' }, ...extractStrings(page)].filter((e) => e.s && !seen.has(e.s) && seen.add(e.s))
    collected.pages.push({ route, title: head.title, strings })
  }
  console.log(`prerendered ${(lang === 'en' ? '' : `/${lang}`) + route} `.padEnd(34) + `${(page.length / 1024).toFixed(1)} kB  "${head.title}"`)
}

for (const route of [...routes, ...noindexRoutes]) {
  await build(route, route === '/' ? resolve(root, 'dist/index.html') : resolve(root, 'dist', route.slice(1), 'index.html'))
}
await build('/404', resolve(root, 'dist/404.html'))
// every language version of every public page: /ta/about, /hi/about ... (sign-in and account pages have none)
for (const l of LANGUAGES.filter((x) => x.code !== 'en')) {
  for (const route of routes) await build(route, route === '/' ? resolve(root, 'dist', l.code, 'index.html') : resolve(root, 'dist', l.code, route.slice(1), 'index.html'), l.code)
}
// the list of the website's texts, grouped by page, for Admin Panel > Translations. A text found on most pages (menu, footer, buttons) is listed once, as a shared text.
const freq = new Map()
collected.pages.forEach((p) => p.strings.forEach((e) => freq.set(e.s, (freq.get(e.s) || 0) + 1)))
const limit = Math.max(4, collected.pages.length * 0.4)
const sharedMap = new Map()
collected.pages.forEach((p) => { p.strings = p.strings.filter((e) => { if (freq.get(e.s) > limit) { if (!sharedMap.has(e.s)) sharedMap.set(e.s, { s: e.s, section: '' }); return false } return true }) })
const catalog = JSON.stringify({ generated: new Date().toISOString(), languages: LANGUAGES.filter((l) => l.code !== 'en').map((l) => ({ code: l.code, name: l.name, native: l.native })), shared: [...sharedMap.values()], pages: collected.pages })
for (const dir of ['public', 'dist']) { try { writeFileSync(resolve(root, dir, 'i18n-strings.json'), catalog) } catch (e) { console.warn(`i18n strings: could not write to ${dir}`, e.message) } }
console.log(`i18n-strings.json: ${collected.pages.length} pages, ${sharedMap.size} shared texts, ${freq.size} distinct texts`)
