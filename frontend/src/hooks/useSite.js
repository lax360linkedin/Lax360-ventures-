import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { site as defaults } from '../data/site.js'
import { EMPTY, getState, loadContent, loadSite, subscribe } from '../services/siteService.js'

const digits = (v) => String(v || '').replace(/\D/g, '')
const toTel = (display) => `+${digits(display)}`

/** The built-in company facts (data/site.js) with any overrides an administrator has saved. Safe to call anywhere. */
export function mergeSite(s = {}) {
  const phones = [s.contact_phone_1, s.contact_phone_2].filter(Boolean).map((display) => ({ display, tel: toTel(display) }))
  const overrides = { Instagram: s.social_instagram, LinkedIn: s.social_linkedin, X: s.social_x, Facebook: s.social_facebook }
  const social = defaults.social.map((x) => ({ ...x, href: overrides[x.label] || x.href }))
  if (overrides.Facebook && !social.some((x) => x.label === 'Facebook')) social.push({ label: 'Facebook', href: overrides.Facebook })
  return {
    ...defaults,
    tagline: s.tagline || defaults.tagline,
    email: s.contact_email || defaults.email,
    phones: phones.length ? phones : defaults.phones,
    whatsappNumber: digits(s.whatsapp_number) || defaults.whatsappNumber,
    legalLine: s.footer_text || defaults.legalLine,
    social,
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

/** FAQ entries for a page group: the published CMS entries when there are any, otherwise the built-in `fallback` list. */
export function useFaqs(group, fallback) {
  const items = useContent('faq')
  return useMemo(() => {
    const mine = (items || []).filter((i) => (i.data.group || 'home') === group)
    return mine.length ? mine.map((i) => ({ q: i.title, a: i.data.answer })) : fallback
  }, [items, group, fallback])
}
