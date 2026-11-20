// Shared SEO helpers (used by hooks/useDocumentHead.js in the browser and by the build-time prerender, so a page's head is worked out in ONE place).

export const SITE_NAME = 'LAX360 Pvt Ltd'
/** In the prerender (no browser) absolute URLs are written with this token; scripts/prerender.js replaces it with the production origin (SITE_URL). */
export const SITE_TOKEN = '__SITE__'

/** Names for the path segments in breadcrumbs. A segment not listed here is shown as the page's own title (it is always the last one). */
const CRUMB = {
  about: 'About Us', services: 'Services', products: 'Products', industries: 'Industries', insights: 'Insights', 'our-network': 'Our Network', 'our-team': 'Our Team', work: 'Work',
  career: 'Careers', contact: 'Contact', locations: 'Locations', websites: 'Websites', robotics: 'Robotics', blockchain: 'Blockchain', privacy: 'Privacy Policy', terms: 'Terms of Use',
}
const titleCase = (slug) => slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/** Shorten a built-in title to about `max` characters without losing the brand: "Long phrase — more | LAX360 Pvt Ltd" keeps the brand suffix and trims the phrase. */
export function fitTitle(title, limit = 76) {
  const max = title && /[^\x00-\u024F]/.test(title) ? Math.max(limit, 110) : limit // Tamil and Hindi words run longer than English ones: trimming at 76 characters would drop the part that tells two similar pages apart
  if (!title || title.length <= max) return title
  const m = / \| LAX360 Pvt Ltd$/.exec(title)
  const suffix = m ? m[0] : ''
  let head = m ? title.slice(0, m.index) : title
  const cuts = [' — ', ' – ', ': ', ' - ']
  for (const c of cuts) { const i = head.indexOf(c); if (i > 12) { head = head.slice(0, i); break } }
  if (head.length + suffix.length > max) {
    head = head.slice(0, Math.max(10, max - suffix.length - 1))
    head = head.replace(/\s+\S*$/, '').replace(/[\s,:;–—-]+$/, '') + '…'
  }
  return head + suffix
}

/** Shorten a built-in description to about `max` characters, at a sentence end when there is one, otherwise at a word. */
export function fitDescription(text, max = 160) {
  const d = String(text || '').replace(/\s+/g, ' ').trim()
  if (d.length <= max) return d
  const cut = d.slice(0, max)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
  if (stop > max * 0.6) return cut.slice(0, stop + 1)
  return cut.replace(/\s+\S*$/, '').replace(/[\s,:;–—-]+$/, '') + '…'
}

/** BreadcrumbList for a path: Home > section > ... > this page. Returns null for the home page and for pages that are not indexable. */
export function breadcrumbList(path, leafName, origin = SITE_TOKEN, t = (x) => x, prefix = '') {
  const parts = path.split('/').filter(Boolean)
  if (!parts.length) return null
  const items = [{ name: t('Home'), url: `${origin}${prefix}/` }]
  parts.forEach((seg, i) => {
    const url = `${origin}${prefix}/${parts.slice(0, i + 1).join('/')}`
    const last = i === parts.length - 1
    items.push({ name: t(last ? leafName || CRUMB[seg] || titleCase(seg) : CRUMB[seg] || titleCase(seg)), url })
  })
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  }
}

const REGION = { Salem: 'Tamil Nadu', Bangalore: 'Karnataka', Bengaluru: 'Karnataka', Mumbai: 'Maharashtra' }

/** Structured-data postal address from a branch's address lines (the last line ends with the PIN code). Fields that cannot be worked out from the real address are left out, never guessed. */
export function postalAddress(b) {
  const lines = b.address || []
  const pin = ((lines.at(-1) || '').match(/(\d{6})\s*$/) || [])[1]
  return {
    '@type': 'PostalAddress',
    ...(lines.length ? { streetAddress: (pin ? lines.slice(0, -1) : lines).join(', ') } : {}),
    addressLocality: b.city === 'Bangalore' ? 'Bengaluru' : b.city,
    ...(REGION[b.city] ? { addressRegion: REGION[b.city] } : {}),
    ...(pin ? { postalCode: pin } : {}),
    addressCountry: 'IN',
  }
}

/** One LocalBusiness per branch (its real address, phone, map and, when it has them, its own social profiles). Branches without an address are skipped. */
export function localBusinessSchemas(branches, { email, logo, social = {}, origin = SITE_TOKEN } = {}) {
  return (branches || []).filter((b) => b.address?.length).map((b) => ({
    '@context': 'https://schema.org', '@type': 'LocalBusiness', '@id': `${origin}/contact#${b.id}`,
    name: b.name || `${SITE_NAME} — ${b.city}`, parentOrganization: { '@type': 'Organization', name: SITE_NAME, url: `${origin}/` },
    url: `${origin}/contact`, ...(logo ? { image: logo } : {}), ...(email ? { email } : {}),
    ...(b.phones?.length ? { telephone: b.phones.length > 1 ? b.phones.map((p) => p.tel) : b.phones[0].tel } : b.tel ? { telephone: b.tel } : {}), address: postalAddress(b), ...(b.mapUrl ? { hasMap: b.mapUrl } : {}),
    ...((social[b.id] || []).length ? { sameAs: social[b.id] } : {}),
  }))
}

/** A page's custom structured data (admin panel) parsed safely: only an object (or list of objects) with a schema.org @context is accepted. */
export function parseCustomJsonLd(text) {
  if (!text || !String(text).trim()) return null
  try {
    const j = JSON.parse(text)
    const list = [].concat(j).filter((n) => n && typeof n === 'object' && /schema\.org/.test(String(n['@context'] || '')))
    return list.length ? list : null
  } catch { return null }
}
