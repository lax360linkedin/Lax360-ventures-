import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { site as defaults } from '../data/site.js'
import { EMPTY, getState, loadContent, loadSite, subscribe } from '../services/siteService.js'
import { pagePathToKey } from '../utils/cms.js'

const digits = (v) => String(v || '').replace(/\D/g, '')
const toTel = (display) => `+${digits(display)}`

/** The built-in company facts (data/site.js) with any overrides an administrator has saved. Safe to call anywhere. */
export function mergeSite(s = {}, channels = null) {
  const phones = [s.contact_phone_1, s.contact_phone_2].filter(Boolean).map((display) => ({ display, tel: toTel(display) }))
  const overrides = { Instagram: s.social_instagram, LinkedIn: s.social_linkedin, X: s.social_x, Facebook: s.social_facebook, YouTube: s.social_youtube }
  const social = defaults.social.map((x) => ({ ...x, href: overrides[x.label] || x.href }))
  ;['Facebook', 'YouTube'].forEach((label) => { if (overrides[label] && !social.some((x) => x.label === label)) social.push({ label, href: overrides[label] }) })
  const merged = {
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
    businessHours: s.business_hours || '',
  }
  return Array.isArray(channels) ? withChannels(merged, channels) : merged
}

/** The primary facts (first email / phones / WhatsApp / address) come from the managed "Social & contact" list once the server has answered, so every place that uses them follows it. */
function withChannels(site, channels) {
  const of = (type) => channels.filter((c) => c.kind === 'contact' && c.type === type)
  const phones = of('phone').map((c) => ({ display: c.value, tel: String(c.href || '').replace(/^tel:/, '') || toTel(c.value), label: c.note || '' }))
  const emails = of('email')
  const addresses = of('address')
  return {
    ...site,
    phones: phones.length ? phones : site.phones,
    email: emails[0]?.value || site.email,
    email2: emails[1]?.value || '',
    whatsappNumber: digits(of('whatsapp')[0]?.value) || site.whatsappNumber,
    address: addresses.map((c) => c.value).join('\n'),
    social: channels.filter((c) => c.kind === 'social').map((c) => ({ label: c.label, href: c.href })),
  }
}

const useSiteState = () => useSyncExternalStore(subscribe, getState, () => EMPTY)

/** Raw public settings saved in the admin panel (e.g. chatbot_enabled, maintenance_mode). */
export function useSiteSettings() {
  useEffect(() => { loadSite() }, [])
  return useSiteState().settings
}

/** True once the public settings request has finished (successfully or not). */
export function useSiteLoaded() {
  useEffect(() => { loadSite() }, [])
  return useSiteState().loaded
}

export function useSite() {
  const settings = useSiteSettings()
  const { channels } = useSiteState()
  return useMemo(() => mergeSite(settings, channels), [settings, channels])
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

const LEGACY_PLATFORM = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', youtube: 'YouTube', x: 'X (Twitter)' }
const EVERYWHERE = ['header', 'footer', 'contact', 'social_band']
const CONTACT_PLACES = ['header', 'footer', 'contact']

/** The social links and contact details the website showed before the "Social & contact" list existed (settings, built-in values): used only until the server's list has loaded, or when it cannot be reached. */
function legacyChannels(site, cmsSocial) {
  const social = cmsSocial
    ? cmsSocial.filter((i) => i.data.enabled !== false && i.data.url && LEGACY_PLATFORM[i.data.platform]).map((i) => ({ type: i.data.platform, label: LEGACY_PLATFORM[i.data.platform], href: i.data.url }))
    : site.social.map((x) => ({ type: x.label.toLowerCase(), label: LEGACY_PLATFORM[x.label.toLowerCase()] || x.label, href: x.href })).filter((x) => LEGACY_PLATFORM[x.type])
  const out = social.map((x, i) => ({ id: `s${i}`, kind: 'social', type: x.type, label: x.label, value: x.href, href: x.href, locations: EVERYWHERE }))
  const contact = (type, label, value, href, locations, note) => out.push({ id: `c${out.length}`, kind: 'contact', type, label, value, href, note, locations })
  contact('email', 'Email', site.email, `mailto:${site.email}`, CONTACT_PLACES)
  site.phones.forEach((p, n) => contact('phone', 'Phone', p.display, `tel:${p.tel}`, n === 0 ? CONTACT_PLACES : ['footer', 'contact'], p.label))
  if (site.whatsappNumber) contact('whatsapp', 'WhatsApp', `+${site.whatsappNumber}`, `https://wa.me/${site.whatsappNumber}`, CONTACT_PLACES)
  if (site.email2) contact('email', 'Email', site.email2, `mailto:${site.email2}`, ['contact'], 'Careers')
  if (site.address) contact('address', 'Office address', site.address, null, ['contact'])
  return out
}

/** Everything managed in the admin panel under "Social & contact" that is shown at `location` ('header', 'footer', 'contact' or 'social_band'), in the order set there.
 *  Each entry: { id, kind: 'social' | 'contact', type, label, value, href, note, detail, icon }. A disabled item is never included. */
export function useChannels(location) {
  const state = useSiteState()
  const cms = useContent('social_link')
  return useMemo(() => {
    const all = state.channels ?? legacyChannels(mergeSite(state.settings), cms)
    return all.filter((c) => (c.locations || []).includes(location))
  }, [state.channels, state.settings, cms, location])
}

/** The social links and contact details of ONE branch (type 'branch', ref = its slug) or ONE partner (type 'partner', ref = its slug), managed in the admin panel under that branch / partner.
 *  They are that owner's own: never the LAX360 links and never another branch's or partner's. Returns { social, contacts } (empty until the server has answered, or when there are none). */
export function useOwnedChannels(type, ref) {
  const { owned } = useSiteState()
  return useMemo(() => {
    const list = (owned && owned[type] && owned[type][ref]) || []
    return { social: list.filter((c) => c.kind === 'social').map((c) => ({ ...c, platform: c.type })), contacts: list.filter((c) => c.kind === 'contact') }
  }, [owned, type, ref])
}

/** Social profiles at a location as { platform, label, href, icon }. */
export function useSocial(location = 'header') {
  const list = useChannels(location)
  return useMemo(() => list.filter((c) => c.kind === 'social').map((c) => ({ id: c.id, platform: c.type, label: c.label, href: c.href, icon: c.icon, kind: 'social', type: c.type })), [list])
}

/** Contact details (phones, emails, WhatsApp, addresses, branch / enquiry contacts ...) at a location. */
export function useContacts(location) {
  const list = useChannels(location)
  return useMemo(() => list.filter((c) => c.kind === 'contact'), [list])
}

/** Which pages show the contact bar / social section: "all" (or empty), "home", or a comma list like "home,about,contact". */
export function showOnPage(setting, pathname) {
  const list = String(setting || 'all').toLowerCase().split(/[,\s]+/).filter(Boolean)
  if (!list.length || list.includes('all')) return true
  const path = pathname.replace(/\/+$/, '') || '/'
  return list.some((t) => { const to = t === 'home' ? '/' : `/${t.replace(/^\//, '')}`; return to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`) })
}
