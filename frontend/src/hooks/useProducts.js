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
    screenshots: [d.screenshot_1, d.screenshot_2, d.screenshot_3, d.screenshot_4].filter(Boolean),
    productLink: d.product_link || '',
    demoLink: d.demo_link || '',
    ctaLabel: d.cta_label || 'Enquire about this product',
  }
}

/** The products to show: those published in the admin panel, or the built-in list until some are published. */
export function useProducts() {
  const cms = useContent('product')
  return useMemo(() => (cms && cms.length ? cms : builtInProducts).map(normaliseProduct), [cms])
}
