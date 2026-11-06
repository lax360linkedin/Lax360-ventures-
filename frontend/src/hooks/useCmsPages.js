import { useMemo } from 'react'
import { faqOnPage, useContent } from './useSite.js'
import faqData from '../data/faqs.json'
import { industries, industryVisuals } from '../data/industries.js'
import { articles, articleCategories, categoryPhotos, legacyCategories } from '../data/articles.js'
import { networkEntries, softwareEntries } from '../data/network.js'
import { toParagraphs } from '../utils/cms.js'

const lines = (text) => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean)

const toList = (text) => lines(text)
const pairs = (text) => lines(text).map((l) => { const [problem, ...rest] = l.split('=>'); return { problem: problem.trim(), solution: rest.join('=>').trim() } }).filter((x) => x.problem && x.solution)
const titled = (text) => lines(text).map((l) => { const m = /^([^:]{2,70}):\s+(.+)$/.exec(l); return m ? { title: m[1], text: m[2] } : { title: l, text: '' } })

/** One industry in the shape the Industries pages use (works for admin-panel items and the built-in set). */
export function normaliseIndustry(item) {
  const d = item.data || {}
  const v = industryVisuals[item.slug] || {}
  return {
    slug: item.slug, name: item.title, group: d.group || 'industry', featured: d.featured === true, summary: d.summary || '',
    overview: toParagraphs(d.description),
    challenges: toList(d.challenges), pairs: pairs(d.problem_solution), solutions: toList(d.solutions), ai: titled(d.ai_opportunities), useCases: toList(d.use_cases),
    benefits: toList(d.benefits), services: toList(d.services), products: toList(d.products), insightCategories: toList(d.insight_categories),
    image: d.image || v.photo || '', heroImage: d.hero_image || d.image || v.photo || '', imageAlt: d.image_alt || '', icon: v.icon || 'briefcase',
    seoTitle: d.seo_title || '', metaDescription: d.meta_description || '',
  }
}

/** Industries, in the order set in the admin panel: the published ones, otherwise the built-in set of 20. */
export function useIndustries() {
  const items = useContent('industry')
  return useMemo(() => (items || industries).map(normaliseIndustry), [items])
}

const words = (text) => String(text || '').split(/\s+/).filter(Boolean).length
const canonCategory = (c) => legacyCategories[c] || (articleCategories.some((x) => x.value === c) ? c : 'trends')

/** One article in the shape the Insights pages use (works for admin-panel items and the built-in starter articles). */
function normaliseArticle(a) {
  const category = canonCategory(a.category)
  return {
    slug: a.slug, title: a.title, category, publishedOn: a.publishedOn, author: a.author || 'LAX360 Team', excerpt: a.excerpt, body: a.body,
    image: a.image || categoryPhotos[category], imageAlt: a.imageAlt || '', featured: Boolean(a.featured), tags: a.tags || [],
    inlineImages: a.inlineImages || [], seoTitle: a.seoTitle || '', metaDescription: a.metaDescription || '', order: a.order ?? 0,
    readMinutes: Math.max(1, Math.round(words(a.body) / 200)),
  }
}

/** Articles, featured first then newest first: the ones published in the admin panel, otherwise the built-in starter articles. */
export function useArticles() {
  const items = useContent('article')
  return useMemo(() => {
    const list = items
      ? items.map((i, n) => ({
        slug: i.slug, title: i.title, category: i.data.category, publishedOn: i.data.published_on, author: i.data.author, excerpt: i.data.excerpt, body: i.data.body,
        image: i.data.image, imageAlt: i.data.image_alt, featured: i.data.featured === true, tags: String(i.data.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
        inlineImages: [i.data.inline_image_1, i.data.inline_image_2], seoTitle: i.data.seo_title, metaDescription: i.data.meta_description, order: n,
      }))
      : articles
    return list.map(normaliseArticle).sort((a, b) => String(b.publishedOn).localeCompare(String(a.publishedOn)))
  }, [items])
}

export const categoryLabel = (value) => articleCategories.find((c) => c.value === canonCategory(value))?.label || 'Insights'

export function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

const notExpired = (iso) => !iso || new Date(`${iso}T23:59:59`).getTime() >= Date.now()

/** One network company in the shape the Our Network page uses. The partnership designation is exposed only when it is verified and has not expired. */
export function normaliseCompany(i) {
  const d = i.data || {}
  const verified = d.verification === 'verified' && notExpired(d.expires_on)
  return {
    slug: i.slug, name: i.title, category: d.category || 'associated', relationship: d.relationship || '', businessCategory: d.business_category || '', description: d.description || '',
    designation: verified ? d.designation || '' : '', claim: d.designation || '', verified, verification: d.verification || 'pending', products: toList(d.products), sameLocation: d.location_type === 'same', location: d.location || '', email: d.contact_email || '', phone: d.contact_phone || '',
    website: d.website_link || '', ctaLabel: d.cta_label || 'Visit website', featured: d.featured === true, logo: d.logo || '', logoAlt: d.logo_alt || '',
  }
}

/** Network companies and partners: the published ones from the admin panel, otherwise the built-in published entries. Drafts are never public. */
export function useNetwork() {
  const items = useContent('network_partner')
  return useMemo(() => (items || networkEntries).map(normaliseCompany), [items])
}

/** Extra network categories created in the admin panel (name and description), keyed by their slug. */
export function useNetworkCategories() {
  const items = useContent('network_category')
  return useMemo(() => Object.fromEntries((items || []).map((c) => [c.slug, { label: c.title, text: c.data.description || '' }])), [items])
}

/** Software distribution products (vendor, category and type) published in the admin panel, otherwise the built-in published ones. */
export function useSoftware() {
  const items = useContent('software_product')
  return useMemo(() => (items || softwareEntries).map((i) => ({ slug: i.slug, name: i.title, vendor: i.data.vendor || '', category: i.data.software_category || 'other', ownership: i.data.ownership || 'third_party', description: i.data.description || '', link: i.data.product_link || '', cta: i.data.cta_link || '' })), [items])
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
