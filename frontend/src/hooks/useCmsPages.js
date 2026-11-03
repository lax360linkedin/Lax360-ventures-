import { useMemo } from 'react'
import { useContent } from './useSite.js'
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
