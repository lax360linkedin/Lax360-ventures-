import { useMemo } from 'react'
import { useContent, useDatabaseItems } from './useSite.js'
import { UPCOMING_CATEGORIES, STATUSES, PROGRAMS, upcomingPath } from '../data/upcomingServices.js'
import { toLines, toParagraphs } from '../utils/cms.js'

/**
 * Upcoming service categories (CAD & Engineering Design, Robotics, Blockchain & Web 3.0) with the administrator's changes laid over the built-in content, so the pages are never empty
 * and nothing needs to be re-entered. Admin > Services > "Upcoming service categories" and "Upcoming services":
 *   - an entry whose Page URL is a built-in slug (cad-engineering, robotics, blockchain / mechanical-cad, civil-cad, ...) changes that built-in item;
 *   - any other entry is added as a new category / service;
 *   - the launch status drives every badge, notice and call to action; a service follows its category's status unless it has its own.
 */
// The three original categories keep their addresses and icons when they come from the database.
const LEGACY = { 'cad-engineering': { path: '/cad-engineering', icon: 'cad' }, robotics: { path: '/robotics', icon: 'robot' }, blockchain: { path: '/blockchain', icon: 'chain' } }
const titled = (text) => toLines(text).map((l) => { const i = l.indexOf(':'); return i > 0 ? { title: l.slice(0, i).trim(), text: l.slice(i + 1).trim() } : { title: l, text: '' } })
const linked = (text) => toLines(text).map((l) => { const [label, ...rest] = l.split('|'); return { label: label.trim(), to: rest.join('|').trim() } }).filter((x) => x.label && x.to)
const ok = (v) => (typeof v === 'string' ? v.trim() : '')
const flag = (v) => v !== false // partnership availability defaults to "on" until an administrator turns it off

function partners(src, base) {
  return Object.fromEntries(PROGRAMS.map((p) => [p.key, src ? flag(src[p.flag]) : base ? base[p.key] : true]))
}

export function useUpcoming() {
  const foundCats = useContent('upcoming_category')
  const foundSvcs = useContent('upcoming_service')
  const dbCats = useDatabaseItems('upcoming_category', 'upcoming') // migrated: the database is the only source, nothing comes back from the built-in copy
  const dbSvcs = useDatabaseItems('upcoming_service', 'upcoming')
  const fromDb = dbCats !== undefined
  const cats = fromDb ? dbCats : foundCats
  const svcs = fromDb ? dbSvcs : foundSvcs
  return useMemo(() => {
    const catItems = new Map((cats || []).map((i) => [i.slug, i]))
    const base = fromDb ? [] : UPCOMING_CATEGORIES.map((c) => ({ ...c, builtin: true }))
    const known = new Set(base.map((c) => c.slug))
    const extra = (cats || []).filter((i) => !known.has(i.slug)).map((i) => ({ slug: i.slug, name: i.title, short: i.title, builtin: false, services: [], areas: [], icon: '' }))

    const categories = [...base, ...extra].map((c) => {
      const it = catItems.get(c.slug)
      const d = it?.data || {}
      const status = STATUSES[d.status] ? d.status : c.status || 'coming_soon'
      const paragraphs = toParagraphs(d.description)
      return {
        slug: c.slug, builtin: c.builtin, path: LEGACY[c.slug]?.path || upcomingPath(c.slug, c.builtin ? c : null),
        name: it?.title || c.name, short: ok(d.short_name) || c.short || it?.title || c.name,
        status, icon: c.icon || LEGACY[c.slug]?.icon || '', image: d.image || '', iconImage: d.icon || '',
        tagline: ok(d.tagline) || c.tagline || '', description: paragraphs.length ? paragraphs : c.description || [],
        launchNote: ok(d.launch_note), showHome: it ? d.show_home !== false : true,
        partners: partners(it ? d : null, null), ctaLabel: ok(d.cta_label), ctaLink: ok(d.cta_link),
        seoTitle: ok(d.seo_title) || c.seoTitle || `${it?.title || c.name} (${STATUSES[status].label})`,
        seoDescription: ok(d.seo_description) || c.seoDescription || ok(d.tagline) || `${it?.title || c.name}: an upcoming LAX360 service category. Register your interest.`,
        headline: ok(d.headline) || c.headline || it?.title || c.name, lead: ok(d.lead) || c.lead || ok(d.tagline),
        areas: d.areas ? titled(d.areas) : c.areas || [], today: d.today ? toLines(d.today) : c.today || [], todayLinks: d.today_links ? linked(d.today_links) : c.todayLinks || [],
        services: [],
      }
    })

    const byCat = new Map(categories.map((c) => [c.slug, c]))
    const add = (c, s) => c.services.push(s)
    // built-in services first, with the administrator's changes
    const svcItems = new Map((svcs || []).map((i) => [i.slug, i]))
    for (const c0 of base) {
      const c = byCat.get(c0.slug)
      for (const s of c0.services) {
        const it = svcItems.get(s.slug)
        const d = it?.data || {}
        const own = it && it.data?.category && it.data.category !== c.slug ? it.data.category : ''
        const target = own && byCat.get(own) ? byCat.get(own) : c
        add(target, {
          slug: s.slug, name: it?.title || s.name, summary: ok(d.summary) || s.summary, description: toParagraphs(d.description),
          image: d.image || '', iconImage: d.icon || '', status: STATUSES[d.status] ? d.status : target.status, ownStatus: !!STATUSES[d.status],
          partners: it ? partners(d, null) : { ...target.partners },
        })
      }
    }
    // services an administrator added
    const builtinSvc = new Set(base.flatMap((c) => c.services.map((s) => s.slug)))
    for (const it of svcs || []) {
      if (builtinSvc.has(it.slug)) continue
      const d = it.data || {}
      const c = byCat.get(d.category)
      if (!c) continue
      add(c, {
        slug: it.slug, name: it.title, summary: ok(d.summary), description: toParagraphs(d.description), image: d.image || '', iconImage: d.icon || '',
        status: STATUSES[d.status] ? d.status : c.status, ownStatus: !!STATUSES[d.status], partners: partners(d, null),
      })
    }
    return categories
  }, [cats, svcs, fromDb])
}

/** One category by slug, or undefined. */
export function useUpcomingCategory(slug) {
  return useUpcoming().find((c) => c.slug === slug)
}

/** The categories (and, inside each, the services) offered under one partnership program: 'franchise' | 'authorized' | 'referral'. Nothing is returned for a service an administrator switched off. */
export function useUpcomingForProgram(programKey) {
  const all = useUpcoming()
  return useMemo(() => all.filter((c) => c.partners[programKey]).map((c) => ({ ...c, services: c.services.filter((s) => s.partners[programKey]) })), [all, programKey])
}
