// Cookie consent: the visitor's choice, kept in this browser (localStorage, key below) so the banner does not come back after a decision, and read by everything that sets non-essential cookies or loads
// tracking scripts (utils/analytics.js). Necessary cookies (sign-in session, security, remembering this choice and the display theme) never wait for consent.
//   analytics: Google Analytics / Tag Manager. Off until the visitor accepts it; switching it off again stops sending events and removes the analytics cookies.
import { useSyncExternalStore } from 'react'

const KEY = 'lax360-cookie-consent'
const VERSION = 1 // raise it when the categories change: everyone is asked again

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v && v.v === VERSION && typeof v.analytics === 'boolean') return { decided: true, analytics: v.analytics }
  } catch { /* private mode or blocked storage: the visitor is simply asked each visit */ }
  return { decided: false, analytics: false }
}

let state = typeof window === 'undefined' ? { decided: true, analytics: false } : read()
let settingsRequested = 0
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

export const getConsent = () => state
export const analyticsAllowed = () => state.analytics === true
/** Run `fn` now and again whenever the visitor's choice changes. Returns the unsubscribe function. */
export const onConsentChange = (fn) => subscribe(fn)

/** Save the visitor's choice (nothing optional is ever on unless this says so). */
export function setConsent({ analytics }) {
  state = { decided: true, analytics: Boolean(analytics) }
  try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, analytics: state.analytics, at: new Date().toISOString() })) } catch { /* not saved: asked again next visit */ }
  emit()
}

/** The footer's "Cookie settings": open the banner's settings, even after a choice was made. */
export function openCookieSettings() { settingsRequested += 1; emit() }

export const useConsent = () => useSyncExternalStore(subscribe, () => state, () => ({ decided: true, analytics: false }))
export const useSettingsRequest = () => useSyncExternalStore(subscribe, () => settingsRequested, () => 0)
