// Partnership module client: the admin-managed layer on top of the built-in page content, the navigation menu, and the application form submission.
// The pages render fully from the built-in content (that is what search engines read); this layer only ADDS what an administrator has set. If the backend is asleep or down, the pages still work.
import { useCallback, useEffect, useState } from 'react'
import { api } from './apiClient.js'
import { CATEGORIES, DIVISIONS } from '../data/partnership.js'

let cached = null
let cachedAt = 0
let inflight = null
let settled = false

/** One shared request for every partnership page (cached for a minute). Resolves with the payload, or null when it cannot be loaded. */
export function loadPartnerContent() {
  if (cached && Date.now() - cachedAt < 60000) return Promise.resolve(cached)
  if (!inflight) inflight = api('/api/public/partnerships', { timeoutMs: 8000 }).then((c) => { cached = c; cachedAt = Date.now(); return c }).catch(() => cached).finally(() => { inflight = null; settled = true })
  return inflight
}

/** The payload plus whether the first attempt has finished (so a page can show "loading" instead of flashing "not found" for an administrator-created entry). */
export function usePartnerContentState() {
  const [state, setState] = useState({ data: cached, loaded: settled })
  useEffect(() => { let alive = true; loadPartnerContent().then((c) => alive && setState({ data: c, loaded: true })); return () => { alive = false } }, [])
  return state
}

export const usePartnerContent = () => usePartnerContentState().data

// ---- the Partner With Us menu --------------------------------------------------------------------------
// The built-in menu is available instantly (no request on page load). The live menu (administrator changes) is fetched the first time a visitor opens the menu, then kept for five minutes.
export const BUILTIN_MENU = CATEGORIES.map((c) => ({ slug: c.slug, label: c.short, path: c.path, items: DIVISIONS.map((d) => ({ slug: d.slug, label: d.label, path: `${c.path}/${d.slug}`, builtin: true })) }))

let menu = null
let menuAt = 0
let menuInflight = null
const menuListeners = new Set()

export function loadPartnerMenu() {
  if (menu && Date.now() - menuAt < 300000) return Promise.resolve(menu)
  if (!menuInflight) {
    menuInflight = api('/api/public/partnerships/menu', { timeoutMs: 6000 })
      .then((r) => { menu = r.categories; menuAt = Date.now(); menuListeners.forEach((l) => l(menu)); return menu })
      .catch(() => menu) // a failure keeps the menu that is already shown
      .finally(() => { menuInflight = null })
  }
  return menuInflight
}

/** { categories, refresh }: the menu to show now, and a function that loads the live one (call it when the menu is opened). */
export function usePartnerMenu() {
  const [categories, setCategories] = useState(menu || BUILTIN_MENU)
  useEffect(() => { menuListeners.add(setCategories); return () => menuListeners.delete(setCategories) }, [])
  const refresh = useCallback(() => { loadPartnerMenu() }, [])
  return { categories, refresh }
}

/** The entries of one category (live when the visitor or the page has loaded it, otherwise the built-in ones). Also uses the page payload's menu when it is available. */
export function useDivisionItems(category) {
  const { categories } = usePartnerMenu()
  const data = usePartnerContent()
  const live = data?.menu || categories
  return (live.find((c) => c.slug === category) || BUILTIN_MENU.find((c) => c.slug === category))?.items || []
}

export const submitApplication = (body) => api('/api/public/partnerships/applications', { method: 'POST', body, timeoutMs: 25000 })

/** Admin overrides for one page slug ('overview', 'franchise', 'franchise/education', ...), or an empty object. */
export const pageOverride = (data, slug) => data?.pages?.[slug] || {}
