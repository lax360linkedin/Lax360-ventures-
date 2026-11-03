// Public, read-only data managed from the admin panel: website settings and PUBLISHED content. If the API is unreachable or
// nothing is published, the site simply keeps its built-in text (see data/*.js), so the public website never depends on it.
//
// Content for every managed section arrives in ONE request (/api/public/content-all). An administrator can open the site with
// `?cms_preview=1` (from the admin panel's "Preview on the website" button) to see their unpublished DRAFTS in the real design: that mode reads
// /api/admin/preview/* (it needs the admin session; without one it quietly falls back to the public data). Visitors can never see drafts.
import { api, setAdminBearer } from './apiClient.js'

export const EMPTY = { settings: {}, content: {}, loaded: false, ready: false, preview: false }
let state = EMPTY
const listeners = new Set()
const emit = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }

export const getState = () => state
export const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

const PREVIEW_KEY = 'lax360-cms-preview'
function wantsPreview() {
  if (typeof window === 'undefined') return false
  try {
    const q = new URLSearchParams(window.location.search).get('cms_preview')
    if (q === '1') sessionStorage.setItem(PREVIEW_KEY, '1')
    else if (q === '0') sessionStorage.removeItem(PREVIEW_KEY)
    const on = sessionStorage.getItem(PREVIEW_KEY) === '1'
    if (on) setAdminBearer(sessionStorage.getItem('lax360-admin-bearer')) // the admin session's fallback token, when the cookie is blocked
    return on
  } catch { return false }
}

let siteRequested = false
export function loadSite() {
  if (siteRequested) return
  siteRequested = true
  const preview = wantsPreview()
  const publicSite = () => api('/api/public/site')
  ;(preview ? api('/api/admin/preview/site').catch(publicSite) : publicSite())
    .then((r) => emit({ settings: r.settings || {}, loaded: true }))
    .catch(() => emit({ loaded: true }))
}

let contentRequested = false
/** Loads every managed content kind once (the `kind` argument is kept for callers; one request serves them all). */
export function loadContent() {
  if (contentRequested) return
  contentRequested = true
  const preview = wantsPreview()
  const publicContent = () => api('/api/public/content-all').then((r) => ({ r, preview: false }))
  ;(preview ? api('/api/admin/preview/content').then((r) => ({ r, preview: true })).catch(publicContent) : publicContent())
    .then(({ r, preview: isPreview }) => emit({ content: r.kinds || {}, ready: true, preview: isPreview }))
    .catch(() => emit({ ready: true }))
}
