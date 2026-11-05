import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { site as defaults } from '../data/site.js'
import { EMPTY, getState, loadContent, loadSite, subscribe } from '../services/siteService.js'
import { pagePathToKey } from '../utils/cms.js'

const digits = (v) => String(v || '').replace(/\D/g, '')
const toTel = (display) => `+${digits(display)}`

/** The built-in company facts (data/site.js) with any overrides an administrator has saved. Safe to call anywhere. */
export function mergeSite(s = {}) {
  const phones = [s.contact_phone_1, s.contact_phone_2].filter(Boolean).map((display) => ({ display, tel: toTel(display) }))
  const overrides = { Instagram: s.social_instagram, LinkedIn: s.social_linkedin, X: s.social_x, Facebook: s.social_facebook, YouTube: s.social_youtube }
  const social = defaults.social.map((x) => ({ ...x, href: overrides[x.label] || x.href }))
  ;['Facebook', 'YouTube'].forEach((label) => { if (overrides[label] && !social.some((x) => x.label === label)) social.push({ label, href: overrides[label] }) })
  return {
    ...defaults,
    tagline: s.tagline || defaults.tagline,
    email: s.contact_email || defaults.email,
    phones: phones.length ? phones : defaults.phones,
    whatsappNumber: digits(s.whatsapp_number) || defaults.whatsappNumber,
    legalLine: s.footer_text || defaults.legalLine,
    social,
    // managed in the admin panel (Website settings): all optional, the built-in website supplies defaults
    siteName: s.site_name || '',
    logoUrl: s.site_logo_url || null,
    faviconUrl: s.site_favicon_url || null,
    defaultImage: s.default_og_image_url || null,
    address: s.contact_address || '',
    contactIntro: s.contact_description || '',
    mapLink: s.map_link || '',
    email2: s.contact_email_2 || '',
    footerTagline: s.footer_tagline || '',
  }
}

const useSiteState = () => useSyncExternalStore(subscribe, getState, () => EMPTY)

/** Raw public settings saved in the admin panel (e.g. chatbot_enabled, maintenance_mode). */
export function useSiteSettings() {
  useEffect(() => { loadSite() }, [])
  return useSiteState().settings
}

export function useSite() {
  const settings = useSiteSettings()
  return useMemo(() => mergeSite(settings), [settings])
}

/** Published CMS items of one kind, or null when there are none (callers then fall back to the built-in content). */
export function useContent(kind) {
  useEffect(() => { loadContent(kind) }, [kind])
  const items = useSiteState().content[kind]
  return items && items.length ? items : null
}

/** Which page(s) a question is for: "home" = home and services (the original setting), "home_only", "services_only". */
export const faqOnPage = (where, page) => {
  const w = where || 'home'
  return page === 'services' ? w === 'home' || w === 'services_only' : w === 'home' || w === 'home_only'
}

/** FAQ entries for a page group: the published CMS entries when there are any, otherwise the built-in `fallback` list. */
export function useFaqs(group, fallback) {
  const items = useContent('faq')
  return useMemo(() => {
    const mine = (items || []).filter((i) => faqOnPage(i.data.group, group))
    return mine.length ? mine.map((i) => ({ q: i.title, a: i.data.answer })) : fallback
  }, [items, group, fallback])
}

/** True once the managed content has been fetched (so a page can tell "not published" from "not loaded yet"). */
export function useContentReady() {
  useEffect(() => { loadContent() }, [])
  return useSiteState().ready
}

/** Is the site showing an administrator's unpublished drafts (the "Preview on the website" button)? */
export function usePreviewMode() {
  useEffect(() => { loadContent() }, [])
  return useSiteState().preview
}

/** Menu links: the published navigation items for this menu when there are any, otherwise the built-in `fallback`. */
export function useNav(place, fallback) {
  const items = useContent('nav_item')
  return useMemo(() => {
    const mine = (items || []).filter((i) => i.data.place === place && i.data.enabled !== false && i.data.link)
    return mine.length ? mine.map((i) => ({ label: i.title, to: i.data.link, external: /^https?:/.test(i.data.link) })) : fallback
  }, [items, place, fallback])
}

/** Title / description / image set for a page in the admin panel ("Page titles & SEO"), or null to keep the built-in text. */
export function useSeo(path) {
  const items = useContent('seo_page')
  const key = pagePathToKey(path)
  return useMemo(() => {
    const mine = key && (items || []).find((i) => i.data.page === key)
    return mine ? { title: mine.title, description: mine.data.meta_description || '', image: mine.data.image || null } : null
  }, [items, key])
}

/** Home page sections in display order: the built-in order, re-ordered / hidden by the published "Home page sections" items. */
export function useHomeSections(defaults) {
  const items = useContent('section')
  return useMemo(() => {
    if (!items) return defaults
    const cfg = new Map(items.map((i) => [i.data.key, i]))
    const listed = [...cfg.values()].filter((i) => defaults.includes(i.data.key)).sort((a, b) => a.sort_order - b.sort_order).map((i) => i.data.key)
    const slots = defaults.map((k, i) => (cfg.has(k) ? i : -1)).filter((i) => i >= 0)
    const order = [...defaults]
    slots.forEach((slot, n) => { order[slot] = listed[n] }) // listed sections swap places among their own slots; the others stay where they are
    return order.filter((k) => cfg.get(k)?.data.enabled !== false)
  }, [items, defaults])
}

const PLATFORM_LABEL = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', youtube: 'YouTube', x: 'X' }

/** Social profiles for the contact bar and the social section: the published "Social media links" items (order, on/off) when there are
 *  any, otherwise the built-in / Website-settings links. Each entry is { platform, label, href }. */
export function useSocial() {
  const items = useContent('social_link')
  const site = useSite()
  return useMemo(() => {
    if (items) {
      return items.filter((i) => i.data.enabled !== false && i.data.url && PLATFORM_LABEL[i.data.platform])
        .map((i) => ({ platform: i.data.platform, label: i.title || PLATFORM_LABEL[i.data.platform], href: i.data.url }))
    }
    return site.social.map((x) => ({ platform: x.label.toLowerCase(), label: x.label, href: x.href })).filter((x) => PLATFORM_LABEL[x.platform])
  }, [items, site.social])
}

/** Which pages show the contact bar / social section: "all" (or empty), "home", or a comma list like "home,about,contact". */
export function showOnPage(setting, pathname) {
  const list = String(setting || 'all').toLowerCase().split(/[,\s]+/).filter(Boolean)
  if (!list.length || list.includes('all')) return true
  const path = pathname.replace(/\/+$/, '') || '/'
  return list.some((t) => { const to = t === 'home' ? '/' : `/${t.replace(/^\//, '')}`; return to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`) })
}
