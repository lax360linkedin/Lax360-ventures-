import { useMemo } from 'react'
import { useContent, useDatabaseItems } from './useSite.js'
import { COURSE_GROUPS } from '../data/educationCourses.js'
import { toLines, toParagraphs } from '../utils/cms.js'

/**
 * Education & Training content managed in the admin panel (Services > Education & Training). Everything is an OPTIONAL layer over the built-in text:
 * nothing published = the website's own content (the approved course catalogue and the written pages), so the pages are never empty.
 *   - education_page    : headline / intro / overview / benefits / hero image / button of the /services/education page
 *   - education_program : text and image of each of the eight programmes (their own pages and cards)
 *   - education_course  : additions, replacements and hidden courses on top of the approved catalogue (shown on the Education page and on every Education partner page)
 */

/** The category page's overrides (every field empty = built-in). */
export function useEducationPage() {
  const d = useContent('education_page')?.[0]?.data || {}
  return useMemo(() => ({
    headline: d.headline || '', lead: d.lead || '', overview: toParagraphs(d.overview), image: d.hero_image || '',
    benefits: toLines(d.benefits).map((l) => { const i = l.indexOf(':'); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, ''] }),
    benefitsTitle: d.benefits_title || '', coursesIntro: d.courses_intro || '', ctaLabel: d.cta_label || '', ctaLink: d.cta_link || '',
  }), [d])
}

/** Overrides per programme slug: { [slug]: { summary, about, features, image } }. */
export function useEducationPrograms() {
  const items = useContent('education_program')
  return useMemo(() => Object.fromEntries((items || []).filter((i) => i.data.program).map((i) => [i.data.program, {
    title: i.title, summary: i.data.summary || '', about: toParagraphs(i.data.description), features: toLines(i.data.details).map((l) => [l, '']), image: i.data.image || '',
  }])), [items])
}

/** A programme (built-in offering, with or without its detail copy) with the administrator's text and image laid over it. */
export function withProgram(o, ov) {
  if (!o || !ov) return o
  return {
    ...o,
    ...(ov.summary ? { text: ov.summary, intro: ov.summary } : {}),
    ...(ov.about?.length ? { about: ov.about } : {}),
    ...(ov.features?.length ? { features: ov.features } : {}),
    ...(ov.image ? { photo: ov.image } : {}),
  }
}

const norm = (s) => String(s || '').trim().toLowerCase()

/** The approved course catalogue with the administrator's changes applied, numbered 1..n: { groups: [{ title, courses: [{ no, name, software }] }], count, summary }.
 *  An entry with a "replaces" name swaps that course in place (or hides it when "Hidden" is ticked); an entry with the exact name of a course and "Hidden" ticked hides it; any other entry is added to its category (a new category is created at the end). */
export function useCourseCatalogue() {
  const items = useContent('education_course')
  const db = useDatabaseItems('education_course', 'courses') // migrated: the 53 courses live in the database, which is then the only source
  return useMemo(() => {
    if (db) {
      const groups = []
      for (const it of db) {
        if (it.data?.hidden === true || !(it.title || '').trim()) continue
        const title = (it.data?.category || 'More courses').trim()
        let g = groups.find((x) => norm(x.title) === norm(title))
        if (!g) { g = { title, courses: [] }; groups.push(g) }
        g.courses.push({ name: it.title.trim(), software: it.data?.software || '' })
      }
      let k = 0
      const out = groups.map((g) => ({ title: g.title, courses: g.courses.map((c) => ({ ...c, no: (k += 1) })) }))
      return { groups: out, count: k, summary: `${k} certification courses in ${out.length} categories` }
    }
    const groups = COURSE_GROUPS.map((g) => ({ title: g.title, courses: g.courses.map((c) => ({ name: c.name, software: c.software })) }))
    const find = (name) => { for (const g of groups) { const i = g.courses.findIndex((c) => norm(c.name) === norm(name)); if (i >= 0) return [g, i] } return null }
    for (const it of items || []) {
      const d = it.data || {}
      const name = (it.title || '').trim()
      if (!name) continue
      const hidden = d.hidden === true
      const target = find(d.replaces || (hidden ? name : ''))
      if (target) {
        const [g, i] = target
        if (hidden) g.courses.splice(i, 1)
        else g.courses[i] = { name, software: d.software || '' }
      } else if (!hidden) {
        const title = (d.category || 'More courses').trim()
        let g = groups.find((x) => norm(x.title) === norm(title))
        if (!g) { g = { title, courses: [] }; groups.push(g) }
        g.courses.push({ name, software: d.software || '' })
      }
    }
    let n = 0
    const out = groups.filter((g) => g.courses.length).map((g) => ({ title: g.title, courses: g.courses.map((c) => ({ ...c, no: (n += 1) })) }))
    return { groups: out, count: n, summary: `${n} certification courses in ${out.length} categories` }
  }, [items, db])
}
