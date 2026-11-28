import { useMemo } from 'react'
import { useProducts } from './useProducts.js'
import { useSolutionIndex } from './useSolutions.js'
import { useWebsites } from './useWebsites.js'
import { availabilityOf } from '../data/portfolio.js'

/**
 * The whole product portfolio as one list: LAX360's own products, the live websites (with their live links) and the solutions of the Software & IT portfolio, each with one category and one
 * availability. Every record is listed once and none is hidden: the portfolio count equals the admin count. Everything is managed in Admin > Products.
 */
export function usePortfolio() {
  const products = useProducts()
  const websites = useWebsites()
  const { solutions, categories } = useSolutionIndex()
  return useMemo(() => {
    const own = products.map((p) => ({
      key: `p:${p.slug}`, type: 'product', category: p.portfolioCategory, name: p.name, summary: p.summary, status: availabilityOf('product', p.status), image: p.image, href: `/products/${p.slug}`,
      liveUrl: p.demoSiteLink || '', real: true, tags: [],
    }))
    const sites = websites.map((w) => ({
      key: `w:${w.slug}`, type: 'website', category: 'websites', name: w.name, summary: w.summary, status: 'available', image: w.image, href: `/websites/${w.slug}`, liveUrl: w.url, real: true, tags: [w.category].filter(Boolean),
    }))
    const sols = solutions.map((s) => ({
      key: `s:${s.slug}`, type: 'solution', category: s.category, name: s.name, summary: s.pitch, status: availabilityOf('solution', s.status), image: s.image, href: `/solutions/${s.slug}`,
      liveUrl: '', real: false, tags: (s.industries || []).slice(0, 3),
    }))
    const rank = (c) => { const k = categories.findIndex((x) => x.slug === c); return k < 0 ? 99 : k }
    return [...own, ...sites, ...sols].map((x, i) => ({ ...x, i })).sort((a, b) => rank(a.category) - rank(b.category) || Number(b.real) - Number(a.real) || a.i - b.i)
  }, [products, websites, solutions, categories])
}
