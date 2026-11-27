// The visitor's language. The URL is the source of truth (/ta/about is Tamil, /about is English), the choice is remembered in this browser (localStorage) so a later visit to an English
// address opens in the saved language, and switching changes the address and re-renders the page in place (no reload). Rendered on the server / at build time, the language is set by the prerender script.
import { useSyncExternalStore } from 'react'
import { DEFAULT_LANG, isLang, pathIn, prefixOf, splitPath } from './languages.js'

const KEY = 'lax360-language'
const listeners = new Set()
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

const saved = () => { try { const v = localStorage.getItem(KEY); return isLang(v) ? v : null } catch { return null } }
const PRIVATE = /^\/(company-admin|admin|api|user|login|register|forgot-password|reset-password|demo)(\/|$)/ // pages with no language versions: never prefixed or redirected

function initial() {
  if (typeof window === 'undefined') return globalThis.__LANG__ || DEFAULT_LANG
  const { lang, path } = splitPath(window.location.pathname)
  if (lang !== DEFAULT_LANG) return lang
  const s = saved()
  if (s && s !== DEFAULT_LANG && !PRIVATE.test(path)) { // an English address, but the visitor chose another language earlier: continue in it
    window.history.replaceState(null, '', pathIn(s, path) + window.location.search + window.location.hash)
    return s
  }
  return DEFAULT_LANG
}

let current = initial()
export const getLang = () => current
export const useLang = () => useSyncExternalStore(subscribe, () => current, () => globalThis.__LANG__ || DEFAULT_LANG)

/** Switch language: remember it, move to the same page in that language and re-render. */
export function setLang(code) {
  if (!isLang(code) || code === current) return
  const { path } = splitPath(window.location.pathname)
  try { localStorage.setItem(KEY, code) } catch { /* not remembered */ }
  window.history.pushState(null, '', pathIn(code, path) + window.location.search + window.location.hash)
  current = code
  document.documentElement.lang = code === 'en' ? 'en-IN' : code
  listeners.forEach((l) => l())
}

export { prefixOf }
