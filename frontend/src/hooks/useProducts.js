import { useMemo } from 'react'
import { builtInProducts, productVisuals } from '../data/products.js'
import { useContent } from './useSite.js'
import { toLines, toParagraphs } from '../utils/cms.js'

const FEATURE = /^([^:]{2,60}):\s+(.+)$/

/** One product in the shape the Products pages use (works for admin-panel items and the built-in list). */
export function normaliseProduct(item) {
  const d = item.data || {}
  const features = toLines(d.features).map((line) => {
    const m = FEATURE.exec(line)
    return m ? { title: m[1], text: m[2] } : { title: line, text: '' }
  })
  return {
    slug: item.slug,
    name: item.title,
    category: d.category || 'other',
    status: ['live', 'beta', 'in_development', 'soon'].includes(d.status) ? d.status : 'soon',
    summary: d.summary || '',
    overview: toParagraphs(d.overview),
    features,
    problems: toLines(d.problems),
    benefits: toLines(d.benefits),
    useCases: toLines(d.use_cases),
    users: toLines(d.users),
    industries: toLines(d.industries),
    icon: productVisuals[item.slug]?.icon || 'package',
    logo: d.logo || '',
    image: d.image || productVisuals[item.slug]?.photo || '',
    banner: d.banner || '',
    workflow: toLines(d.workflow).map((line) => { const m = FEATURE.exec(line); return m ? { title: m[1], text: m[2] } : { title: line, text: '' } }),
    screenshots: [d.screenshot_1, d.screenshot_2, d.screenshot_3, d.screenshot_4, d.screenshot_5, d.screenshot_6, d.screenshot_7, d.screenshot_8].filter(Boolean),
    demoSiteLink: d.demo_site_link || '',
    productLink: d.product_link || '',
    demoLink: d.demo_link || '',
    ctaLabel: d.cta_label || 'Enquire about this product',
  }
}

/** The modules of one product (admin panel > Products > Product modules), in the order set there. */
export function useProductModules(slug) {
  const items = useContent('product_module')
  return useMemo(() => (items || []).filter((i) => i.data.product === slug).map((i) => ({
    id: i.id, name: i.title, summary: i.data.summary || '', description: toParagraphs(i.data.description), points: toLines(i.data.features), image: i.data.image || '', imageAlt: i.data.image_alt || '',
  })), [items, slug])
}

/** The downloads of one product (demo PDFs, brochures, documentation). The browser only knows their names: the files are sent by the server after the login check. */
export function useProductResources(slug) {
  const items = useContent('product_resource')
  return useMemo(() => (items || []).filter((i) => i.data.product === slug && i.data.file).map((i) => ({
    id: i.id, name: i.title, type: i.data.resource_type || 'other', description: i.data.description || '', requiresLogin: i.data.requires_login !== false, info: i.data.file_info || null,
  })), [items, slug])
}

/** The products to show: those published in the admin panel, or the built-in list until some are published. */
export function useProducts() {
  const cms = useContent('product')
  return useMemo(() => (cms && cms.length ? cms : builtInProducts).map(normaliseProduct), [cms])
}
