import { useMemo } from 'react'
import { useDatabaseItems } from './useSite.js'
import { divisions as BUILT_IN, MOVED_CATEGORIES } from '../data/services.js'
import { divisionUrl, setOfferingSlugs } from '../utils/slugify.js'
import { toLines, toParagraphs } from '../utils/cms.js'

/**
 * The ACTIVE service divisions and their sub-services.
 *
 * They are stored in the database (Admin > Services > "Service divisions" and "Division sub-services") and this hook turns those entries into the same objects the website has always used
 * (data/services.js). Until the content has been moved to the database (`python -m app.cli migrate-content`), and while the first page is prerendered, the built-in copy is used: nothing is
 * ever empty. Once it is in the database, the database is the only source: divisions and sub-services can be added, renamed, reordered, moved between divisions, hidden (draft) or removed,
 * and every page, menu and card follows. A field an administrator leaves empty falls back to the built-in text of the same division / sub-service.
 */
const ok = (v) => (typeof v === 'string' ? v.trim() : '')
const titled = (text) => toLines(text).map((l) => {
  const [head, bullets] = l.split(' || ')
  const i = head.indexOf(':')
  const row = i > 0 ? [head.slice(0, i).trim(), head.slice(i + 1).trim()] : [head.trim(), '']
  const list = bullets ? bullets.split(';').map((x) => x.trim()).filter(Boolean) : []
  return list.length ? [...row, list] : row
})
const faqs = (text) => toLines(text).map((l) => { const i = l.indexOf(' | '); return i > 0 ? { q: l.slice(0, i).trim(), a: l.slice(i + 3).trim() } : null }).filter(Boolean)
const builtinOffering = (slug) => BUILT_IN.flatMap((d) => d.offerings).find((o) => o.slug === slug)

function fromDatabase(divs, svcs) {
  return divs.map((item, index) => {
    const d = item.data || {}
    const slug = ok(d.url_slug) || item.slug
    const base = BUILT_IN.find((b) => b.slug === slug) || {}
    const lines = (key, fallback) => { const v = toLines(d[key]); return v.length ? v : fallback || [] }
    const offerings = svcs.filter((s) => ok(s.data?.division) === slug).map((s) => {
      const sd = s.data || {}
      const sslug = ok(sd.url_slug) || s.slug.split('--').pop()
      const b = builtinOffering(sslug) || {}
      const about = toParagraphs(sd.about)
      return {
        ...b, slug: sslug, name: s.title, group: ok(sd.group) || b.group || 'Services', text: ok(sd.text) || b.text || '',
        intro: ok(sd.intro) || undefined, about: about.length ? about : undefined, offers: toLines(sd.offers).length ? toLines(sd.offers) : undefined,
        solves: toLines(sd.solves).length ? toLines(sd.solves) : undefined, features: titled(sd.features).length ? titled(sd.features) : undefined,
        benefits: toLines(sd.benefits).length ? toLines(sd.benefits) : undefined, uses: titled(sd.uses).length ? titled(sd.uses) : undefined,
        photo: sd.image || undefined, iconImage: sd.icon || '', fromDatabase: true,
      }
    })
    return {
      ...base, slug, number: String(index + 1).padStart(2, '0'), name: item.title, status: 'active',
      short: ok(d.short) || base.short || '', outcome: ok(d.outcome) || base.outcome || '', tags: lines('tags', base.tags), enquiryType: ok(d.enquiry_type) || base.enquiryType || 'project',
      heroLine: ok(d.hero_line) || base.heroLine || item.title, overview: ok(d.overview) || base.overview || '', challenges: lines('challenges', base.challenges), useCases: lines('use_cases', base.useCases),
      stack: lines('stack', base.stack), stackNote: ok(d.stack_note) || base.stackNote || '', engagement: ok(d.engagement) || base.engagement || '',
      faqs: faqs(d.faqs).length ? faqs(d.faqs) : base.faqs || [], metaTitle: ok(d.meta_title) || base.metaTitle || item.title, metaDescription: ok(d.meta_description) || base.metaDescription || ok(d.short),
      photo: d.image || base.photo || '/assets/services/software.webp', iconImage: d.icon || '', accent: base.accent || 'monogram', related: [], offerings,
    }
  })
}

/** All active divisions in website order. */
export function useDivisions() {
  const divs = useDatabaseItems('division', 'divisions')
  const svcs = useDatabaseItems('division_service', 'divisions')
  return useMemo(() => {
    if (divs === undefined) return BUILT_IN
    const built = fromDatabase(divs, svcs || [])
    setOfferingSlugs(built.flatMap((d) => d.offerings.map((o) => [o.name, o.slug])))
    return built
  }, [divs, svcs])
}

/** The divisions with their page address, plus the lookup used by the pages. A division by its id or its address segment (growth is /services/digitalmarketing); the earlier
 *  category ids (headless, automation, mobile) resolve to Software & IT Services. */
export function useDivisionTools() {
  const divisions = useDivisions()
  return useMemo(() => {
    const allDivisions = divisions.map((d) => ({ ...d, to: `/services/${divisionUrl(d.slug)}` }))
    const getDivision = (slug) => divisions.find((d) => d.slug === (MOVED_CATEGORIES[slug] || slug) || divisionUrl(d.slug) === slug)
    return { divisions, allDivisions, getDivision }
  }, [divisions])
}
