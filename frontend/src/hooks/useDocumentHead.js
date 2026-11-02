import { useEffect } from 'react'

const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '')
const DEFAULT_TITLE = 'LAX360 Ventures — Software, AI, Digital Growth, CAD & Academy'

function upsert(selector, tag, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(tag)
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
}

/**
 * Per-route title, description, canonical, Open Graph and optional JSON-LD.
 *
 * - At build time (no `document`) the values are recorded on `globalThis.__SSR_HEAD__`, and
 *   scripts/prerender.js writes them into each page's static HTML.
 * - In the browser an effect keeps the tags in sync during client-side navigation.
 */
export function useDocumentHead({ title, description, path = '/', jsonLd = null, noindex = false }) {
  const fullTitle = title ? `${title} | LAX360 Ventures` : DEFAULT_TITLE

  if (typeof document === 'undefined') {
    globalThis.__SSR_HEAD__ = { title: fullTitle, description, path, jsonLd, noindex }
  }

  useEffect(() => {
    const url = (SITE_URL || window.location.origin) + path
    document.title = fullTitle
    upsert('meta[name="description"]', 'meta', { name: 'description', content: description })
    upsert('link[rel="canonical"]', 'link', { rel: 'canonical', href: url })
    upsert('meta[property="og:title"]', 'meta', { property: 'og:title', content: fullTitle })
    upsert('meta[property="og:description"]', 'meta', { property: 'og:description', content: description })
    upsert('meta[property="og:url"]', 'meta', { property: 'og:url', content: url })

    const robots = document.head.querySelector('meta[name="robots"]')
    if (noindex) upsert('meta[name="robots"]', 'meta', { name: 'robots', content: 'noindex' })
    else robots?.remove()

    const ld = document.head.querySelector('script#page-jsonld')
    if (jsonLd) {
      const el = ld || Object.assign(document.createElement('script'), { id: 'page-jsonld', type: 'application/ld+json' })
      el.textContent = JSON.stringify(jsonLd)
      if (!ld) document.head.appendChild(el)
    } else {
      ld?.remove()
    }
  }, [fullTitle, description, path, jsonLd, noindex])
}
