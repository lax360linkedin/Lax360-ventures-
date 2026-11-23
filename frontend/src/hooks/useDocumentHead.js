import { useEffect } from 'react'
import { useSeo, useSiteSettings } from './useSite.js'
import { SITE_NAME, SITE_TOKEN, breadcrumbList, fitDescription, fitTitle } from '../utils/seo.js'
import { LANGUAGES, langOf, pathIn, prefixOf } from '../i18n/languages.js'
import { useLang } from '../i18n/store.js'
import { tr } from '../i18n/translator.js'

// The canonical origin. In a production build it falls back to the company domain, so a page served from the old Vercel address or the www host still declares https://lax360.in as canonical.
const SITE_URL = (import.meta.env.VITE_SITE_URL || (import.meta.env.PROD ? 'https://lax360.in' : '')).replace(/\/$/, '')
const DEFAULT_TITLE = 'LAX360 Pvt Ltd — Software, AI, Digital Growth & Training'

function upsert(selector, tag, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(tag)
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
}
const remove = (selector) => document.head.querySelector(selector)?.remove()
const swapToken = (value, origin) => JSON.parse(JSON.stringify(value).split(SITE_TOKEN).join(origin))

/**
 * Per-route head: title, description, keywords, canonical, robots, Open Graph, Twitter Card and JSON-LD (the page's own, its BreadcrumbList and any extra structured data set in the admin panel).
 *
 * - The admin panel (SEO management) can override the title, description, keywords, sharing image, indexing and canonical address of a page; the built-in text is trimmed to a search-friendly length.
 * - At build time (no `document`) the result is recorded on `globalThis.__SSR_HEAD__` and scripts/prerender.js writes it into each page's static HTML (absolute URLs carry a token it replaces).
 * - In the browser an effect keeps the tags in sync during client-side navigation.
 */
export function useDocumentHead({ title, description, path = '/', jsonLd = null, noindex = false, ogType = 'website', image: pageImage = null, keywords: pageKeywords = '', breadcrumb = true }) {
  const seo = useSeo(path)
  const lang = useLang()
  const T = (text) => (lang === 'en' ? text : tr(text)) // built-in texts in the visitor's language (the English when there is no translation); text an administrator typed for a page is used as it is
  const settings = useSiteSettings()
  const fullTitle = seo?.title || (title ? fitTitle(`${T(title)} | ${SITE_NAME}`) : T(DEFAULT_TITLE))
  const desc = seo?.description || fitDescription(T(description))
  const image = seo?.image || pageImage || settings.default_og_image_url || '/assets/og-image.png' // the default sharing image (replaceable in Settings)
  const hidden = noindex || seo?.noindex === true
  const keywords = seo?.keywords || pageKeywords
  const canonical = seo?.canonical || ''
  const leaf = title || ''
  const crumbs = breadcrumb && !hidden && path !== '/404' ? breadcrumbList(path, leaf, SITE_TOKEN, T, prefixOf(lang)) : null
  const ld = [...[].concat(jsonLd || []), ...(crumbs ? [crumbs] : []), ...(seo?.structured || [])]

  if (typeof document === 'undefined') {
    globalThis.__SSR_HEAD__ = { title: fullTitle, description: desc, titleKey: title || DEFAULT_TITLE, descriptionKey: description || '', path, lang, jsonLd: ld.length ? ld : null, noindex: hidden, image, keywords, ogType, canonical }
  }

  useEffect(() => {
    const origin = SITE_URL || window.location.origin
    const url = canonical || origin + (path === '/' ? prefixOf(lang) : pathIn(lang, path))
    const abs = image && !/^https?:/.test(image) ? origin + image : image
    document.title = fullTitle
    upsert('meta[name="description"]', 'meta', { name: 'description', content: desc })
    upsert('link[rel="canonical"]', 'link', { rel: 'canonical', href: url })
    upsert('meta[property="og:type"]', 'meta', { property: 'og:type', content: ogType })
    upsert('meta[property="og:locale"]', 'meta', { property: 'og:locale', content: langOf(lang).locale })
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove()) // the same page in every language, for search engines
    if (!hidden && path !== '/404') {
      LANGUAGES.forEach((l) => { const a = document.createElement('link'); a.rel = 'alternate'; a.hreflang = l.htmlLang; a.href = origin + (path === '/' ? prefixOf(l.code) : pathIn(l.code, path)); document.head.appendChild(a) })
      const d = document.createElement('link'); d.rel = 'alternate'; d.hreflang = 'x-default'; d.href = origin + (path === '/' ? '' : path); document.head.appendChild(d)
    }
    upsert('meta[property="og:title"]', 'meta', { property: 'og:title', content: fullTitle })
    upsert('meta[property="og:description"]', 'meta', { property: 'og:description', content: desc })
    upsert('meta[property="og:url"]', 'meta', { property: 'og:url', content: url })
    upsert('meta[name="twitter:card"]', 'meta', { name: 'twitter:card', content: 'summary_large_image' })
    upsert('meta[name="twitter:title"]', 'meta', { name: 'twitter:title', content: fullTitle })
    upsert('meta[name="twitter:description"]', 'meta', { name: 'twitter:description', content: desc })
    if (abs) {
      upsert('meta[property="og:image"]', 'meta', { property: 'og:image', content: abs })
      upsert('meta[name="twitter:image"]', 'meta', { name: 'twitter:image', content: abs })
    }
    if (keywords) upsert('meta[name="keywords"]', 'meta', { name: 'keywords', content: keywords })
    else remove('meta[name="keywords"]')
    if (hidden) upsert('meta[name="robots"]', 'meta', { name: 'robots', content: 'noindex, nofollow' })
    else remove('meta[name="robots"]')

    const el = document.head.querySelector('script#page-jsonld')
    if (ld.length) {
      const node = el || Object.assign(document.createElement('script'), { id: 'page-jsonld', type: 'application/ld+json' })
      node.textContent = JSON.stringify(swapToken(ld.length === 1 ? ld[0] : ld, origin))
      if (!el) document.head.appendChild(node)
    } else {
      el?.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullTitle, desc, path, JSON.stringify(ld), hidden, image, keywords, canonical, ogType, lang])
}
