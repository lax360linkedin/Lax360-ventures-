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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://www.example.com').replace(/\/$/, '')
const { render, site } = await import(pathToFileURL(resolve(root, 'dist-server/entry-server.js')).href)
const template = readFileSync(resolve(root, 'dist/index.html'), 'utf8')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
// JSON inside <script> must not contain "</script>" or HTML comment openers.
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c')

const REGION = { Salem: 'Tamil Nadu', Bangalore: 'Karnataka', Mumbai: 'Maharashtra' }
/** Structured-data postal address from a branch's address lines (last line ends with the PIN code). */
const postal = (b) => ({
  '@type': 'PostalAddress',
  streetAddress: b.address.slice(0, -1).join(', '),
  addressLocality: b.city === 'Bangalore' ? 'Bengaluru' : b.city,
  addressRegion: REGION[b.city],
  postalCode: (b.address.at(-1).match(/(\d{6})\s*$/) || [])[1],
  addressCountry: 'IN',
})

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'LAX360 Ventures',
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

function headTags(head, route) {
  const url = SITE + (route === '/' ? '' : route)
  const image = `${SITE}/assets/og-image.png`
  const tags = [
    `<title>${esc(head.title)}</title>`,
    `<meta name="description" content="${esc(head.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    head.noindex ? '<meta name="robots" content="noindex" />' : '',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="LAX360 Ventures" />',
    `<meta property="og:title" content="${esc(head.title)}" />`,
    `<meta property="og:description" content="${esc(head.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<script type="application/ld+json">${json(organization)}</script>`,
    head.jsonLd ? `<script type="application/ld+json" id="page-jsonld">${json(head.jsonLd)}</script>` : '',
  ]
  return tags.filter(Boolean).join('\n    ')
}

// Strip the generic defaults from index.html; they are replaced per route.
const stripped = template
  .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
  .replace(/<meta\s+(?:name="description"|property="og:[^"]+"|name="twitter:card")[^>]*>\s*/gi, '')

async function build(route, outFile) {
  const { html, head } = await render(route)
  if (!head) throw new Error(`No head data recorded for ${route}`)
  const page = stripped
    .replace('</head>', `    ${headTags(head, route === '/404' ? '/404' : route)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, page)
  console.log(`prerendered ${route.padEnd(24)} ${(page.length / 1024).toFixed(1)} kB  "${head.title}"`)
}

for (const route of [...routes, ...noindexRoutes]) {
  await build(route, route === '/' ? resolve(root, 'dist/index.html') : resolve(root, 'dist', route.slice(1), 'index.html'))
}
await build('/404', resolve(root, 'dist/404.html'))
