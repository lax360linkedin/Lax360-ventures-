// Public, read-only data managed from the admin panel: website settings and PUBLISHED content. If the API is unreachable or
// nothing is published, the site simply keeps its built-in text (see data/*.js), so the public website never depends on it.
import { api } from './apiClient.js'

export const EMPTY = { settings: {}, content: {}, loaded: false }
let state = EMPTY
const listeners = new Set()
const emit = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }

export const getState = () => state
export const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

let siteRequested = false
export function loadSite() {
  if (siteRequested) return
  siteRequested = true
  api('/api/public/site').then((r) => emit({ settings: r.settings || {}, loaded: true })).catch(() => emit({ loaded: true }))
}

const requested = new Set()
export function loadContent(kind) {
  if (requested.has(kind)) return
  requested.add(kind)
  api(`/api/public/content?kind=${encodeURIComponent(kind)}`)
    .then((r) => emit({ content: { ...state.content, [kind]: r.items || [] } }))
    .catch(() => {})
}
