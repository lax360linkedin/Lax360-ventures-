import { useMemo } from 'react'
import { faqOnPage, useContent } from './useSite.js'
import faqData from '../data/faqs.json'
import { industries } from '../data/industries.js'
import { articles, articleCategories } from '../data/articles.js'
import { networkEntries } from '../data/network.js'

const lines = (text) => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean)

/** Industries: the ones published in the admin panel, otherwise the built-in list. */
export function useIndustries() {
  const items = useContent('industry')
  return useMemo(() => (items
    ? items.map((i) => ({ slug: i.slug, title: i.title, summary: i.data.summary, description: i.data.description, solutions: lines(i.data.solutions), image: i.data.image, imageAlt: i.data.image_alt || '' }))
    : industries), [items])
}

/** Articles, newest first: the ones published in the admin panel, otherwise the built-in starter articles. */
export function useArticles() {
  const items = useContent('article')
  return useMemo(() => {
    const list = items
      ? items.map((i) => ({ slug: i.slug, title: i.title, category: i.data.category, publishedOn: i.data.published_on, author: i.data.author || 'LAX360 Team', excerpt: i.data.excerpt, body: i.data.body, image: i.data.image, imageAlt: i.data.image_alt || '' }))
      : articles
    return [...list].sort((a, b) => String(b.publishedOn).localeCompare(String(a.publishedOn)))
  }, [items])
}

export const categoryLabel = (value) => articleCategories.find((c) => c.value === value)?.label || 'Insights'

export function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Network entries: the ones published in the admin panel, otherwise the built-in list. */
export function useNetwork() {
  const items = useContent('network_partner')
  return useMemo(() => (items
    ? items.map((i) => ({ slug: i.slug, title: i.title, category: i.data.category, location: i.data.location, description: i.data.description, website: i.data.website_link, logo: i.data.logo, logoAlt: i.data.logo_alt || '' }))
    : networkEntries), [items])
}

/** Team profiles published in the admin panel (there are no built-in profiles), in the order set there. */
export function useTeam() {
  const items = useContent('team_member')
  return useMemo(() => (items || []).map((i) => ({ slug: i.slug, name: i.title, group: i.data.group, designation: i.data.designation, bio: i.data.bio, photo: i.data.photo, photoAlt: i.data.photo_alt || '', linkedin: i.data.linkedin_link })), [items])
}

/** The home page FAQ: categories and questions published in the admin panel (Website content > FAQ entries / FAQ categories), otherwise the built-in set. */
export function useHomeFaq() {
  const cats = useContent('faq_category')
  const items = useContent('faq')
  return useMemo(() => {
    const managed = (items || []).filter((i) => faqOnPage(i.data.group, 'home'))
    const source = managed.length ? managed.map((i) => ({ q: i.title, a: i.data.answer, category: i.data.category || '' })) : faqData.items
    const named = cats ? cats.map((c) => ({ slug: c.slug, title: c.title })) : faqData.categories.map(({ slug, title }) => ({ slug, title }))
    const known = new Set(named.map((c) => c.slug))
    const extra = source.some((q) => !q.category || !known.has(q.category)) ? [{ slug: '', title: 'General' }] : []
    const categories = [...named, ...extra].filter((c) => source.some((q) => (c.slug ? q.category === c.slug : !q.category || !known.has(q.category))))
    const withCat = source.map((q) => ({ ...q, category: q.category && known.has(q.category) ? q.category : '' }))
    return { categories, items: withCat }
  }, [cats, items])
}

/** About page section switches managed in the admin panel (Website content > About page sections): a section is shown unless switched off there. */
export function useAboutSections() {
  const items = useContent('about_section')
  return useMemo(() => {
    const off = new Set((items || []).filter((i) => i.data.enabled === false).map((i) => i.data.key))
    return (key) => !off.has(key)
  }, [items])
}
