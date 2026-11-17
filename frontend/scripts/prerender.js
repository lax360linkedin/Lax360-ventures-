// Static prerender: renders every route to HTML (with its own head tags and JSON-LD) after the
// client and SSR bundles are built. Output: dist/<route>/index.html and dist/404.html.
//
//   vite build && vite build --ssr src/entry-server.jsx --outDir dist-server && node scripts/prerender.js
//
// Set SITE_URL (or VITE_SITE_URL) to the production origin so canonical and og:url are absolute.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { noindexRoutes, routes } from '../src/routes.js'
import { SITE_TOKEN, postalAddress } from '../src/utils/seo.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://lax360-ventures.vercel.app').replace(/\/$/, '')
if (/example\.com/.test(SITE)) console.warn('!! SITE_URL is not set: canonical links, the sitemap and social previews point at https://www.example.com. Set SITE_URL (the real website address) for the production build.')
const { render, site } = await import(pathToFileURL(resolve(root, 'dist-server/entry-server.js')).href)
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

function headTags(head, route) {
  const url = head.canonical || SITE + (route === '/' ? '' : route)
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
    '<meta property="og:locale" content="en_IN" />',
    `<meta property="og:title" content="${esc(head.title)}" />`,
    `<meta property="og:description" content="${esc(head.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(head.title)}" />`,
    `<meta name="twitter:description" content="${esc(head.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
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

async function build(route, outFile) {
  const { html, head } = await render(route)
  if (!head) throw new Error(`No head data recorded for ${route}`)
  const page = stripped
    .replace('</head>', `    ${headTags(head, route === '/404' ? '/404' : route)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root" data-route="${route}">${html}</div>`)
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, page)
  console.log(`prerendered ${route.padEnd(24)} ${(page.length / 1024).toFixed(1)} kB  "${head.title}"`)
}

for (const route of [...routes, ...noindexRoutes]) {
  await build(route, route === '/' ? resolve(root, 'dist/index.html') : resolve(root, 'dist', route.slice(1), 'index.html'))
}
await build('/404', resolve(root, 'dist/404.html'))
