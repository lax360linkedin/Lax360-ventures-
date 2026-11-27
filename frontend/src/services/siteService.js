// Public, read-only data managed from the admin panel: website settings and PUBLISHED content. If the API is unreachable or
// nothing is published, the site simply keeps its built-in text (see data/*.js), so the public website never depends on it.
//
// Content for every managed section arrives in ONE request (/api/public/content-all). An administrator can open the site with
// `?cms_preview=1` (from the admin panel's "Preview on the website" button) to see their unpublished DRAFTS in the real design: that mode reads
// /api/admin/preview/* (it needs the admin session; without one it quietly falls back to the public data). Visitors can never see drafts.
import { api, setAdminBearer } from './apiClient.js'

// `channels` = the managed social links and contact details (null until the server has answered; the website then shows its built-in ones)
export const EMPTY = { settings: {}, channels: null, owned: null, content: {}, loaded: false, ready: false, preview: false }
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

// The public data of the last visit is kept in the browser (localStorage) and used at once on the next page load or refresh, while the fresh copy is fetched in the background and replaces it when
// it differs: a refresh or a new page load shows the managed content and the chosen theme immediately instead of waiting for the API. Administrators' draft previews are never cached.
const CACHE_PREFIX = 'lax360-public-v1:'
const CACHE_MAX_AGE = 7 * 24 * 3600 * 1000
const readCache = (name) => { try { const x = JSON.parse(localStorage.getItem(CACHE_PREFIX + name) || 'null'); return x && Date.now() - x.t < CACHE_MAX_AGE ? x.v : null } catch { return null } }
const writeCache = (name, value) => { try { localStorage.setItem(CACHE_PREFIX + name, JSON.stringify({ t: Date.now(), v: value })) } catch { /* storage full or blocked: the site just works without the cache */ } }
const sameData = (a, b) => { try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false } }

const siteStateOf = (r) => ({ settings: r.settings || {}, channels: Array.isArray(r.channels) ? r.channels : null, owned: r.owned && typeof r.owned === 'object' ? r.owned : null, loaded: true })

let siteRequested = false
export function loadSite() {
  if (siteRequested) return
  siteRequested = true
  const preview = wantsPreview()
  const publicSite = () => api('/api/public/site')
  const cached = preview ? null : readCache('site')
  if (cached) emit(siteStateOf(cached)) // shown at once; refreshed below
  ;(preview ? api('/api/admin/preview/site').catch(publicSite) : publicSite())
    .then((r) => { if (!preview) writeCache('site', r); if (!(cached && sameData(cached, r))) emit(siteStateOf(r)) })
    .catch(() => { if (!cached) emit({ loaded: true }) })
}

let contentRequested = false
/** Loads every managed content kind once (the `kind` argument is kept for callers; one request serves them all). */
export function loadContent() {
  if (contentRequested) return
  contentRequested = true
  const preview = wantsPreview()
  const publicContent = () => api('/api/public/content-all').then((r) => ({ r, preview: false }))
  const cached = preview ? null : readCache('content')
  if (cached) emit({ content: cached.kinds || {}, ready: true, preview: false }) // shown at once; refreshed below
  ;(preview ? api('/api/admin/preview/content').then((r) => ({ r, preview: true })).catch(publicContent) : publicContent())
    .then(({ r, preview: isPreview }) => { if (!isPreview) writeCache('content', r); if (!(cached && !isPreview && sameData(cached, r))) emit({ content: r.kinds || {}, ready: true, preview: isPreview }) })
    .catch(() => { if (!cached) emit({ ready: true }) })
}
