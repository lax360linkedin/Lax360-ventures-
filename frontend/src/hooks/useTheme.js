import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useSiteLoaded, useSiteSettings } from './useSite.js'

// Themes: "dark" (default), "light", and the light-family palettes "snow", "rose" and "sage".
// On <html>, `data-theme` is "light" or "dark" (so every existing light/dark rule keeps working) and the three palettes add
// `data-palette="snow|rose|sage"` on top of "light" to re-colour the shared tokens in styles/index.css.
// A visitor's Dark/Light choice is stored in localStorage. When a Super Admin picks a theme under Website settings > Appearance, that
// theme (stored in the database as `site_theme`) applies to every visitor; it is cached in localStorage so the next page load paints it
// at once. The inline script in index.html applies the cached theme before first paint, so there is no flash.
export const THEME_KEY = 'lax360-theme'
export const SITE_THEME_KEY = 'lax360-site-theme'
export const THEMES = ['dark', 'light', 'snow', 'rose', 'sage']
const PALETTES = ['snow', 'rose', 'sage']
const META_COLOR = { light: '#ffffff', dark: '#0a0c10', snow: '#fafafa', rose: '#fffafa', sage: '#fbfdfa' }

const listeners = new Set()
const read = () => {
  const root = document.documentElement
  const palette = root.getAttribute('data-palette')
  if (PALETTES.includes(palette)) return palette
  return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

let switchTimer
function apply(theme, persist = true) {
  const root = document.documentElement
  if (!THEMES.includes(theme)) return
  // Brief cross-fade, skipped for people who prefer reduced motion.
  if (read() !== theme && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-switching')
    clearTimeout(switchTimer)
    switchTimer = setTimeout(() => root.classList.remove('theme-switching'), 450)
  }
  root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
  if (PALETTES.includes(theme)) root.setAttribute('data-palette', theme)
  else root.removeAttribute('data-palette')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme])
  if (persist) {
    try {
      window.localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* private mode / blocked storage: the choice just won't persist */
    }
  }
  listeners.forEach((l) => l())
}

function subscribe(callback) {
  listeners.add(callback)
  const onStorage = (e) => {
    if (e.key === THEME_KEY && THEMES.includes(e.newValue)) apply(e.newValue, false)
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', onStorage)
  }
}

/** The theme the Super Admin chose for the whole website, or '' when visitors choose Dark / Light themselves. */
export function useSiteTheme() {
  const value = useSiteSettings().site_theme
  return THEMES.includes(value) ? value : ''
}

/** Public site only: applies the Super Admin's theme (and caches it for the next visit). Renders nothing. */
export function SiteThemeSync() {
  const known = useSiteLoaded()
  const siteTheme = useSiteTheme()
  const reachable = Object.keys(useSiteSettings()).length > 0
  useEffect(() => {
    if (!known || !reachable) return // settings not loaded yet, or the API is unreachable: keep whatever is already applied
    try {
      if (siteTheme) window.localStorage.setItem(SITE_THEME_KEY, siteTheme)
      else window.localStorage.removeItem(SITE_THEME_KEY)
    } catch { /* ignore */ }
    if (siteTheme) apply(siteTheme, false)
    else {
      let saved = null
      try { saved = window.localStorage.getItem(THEME_KEY) } catch { /* ignore */ }
      apply(THEMES.includes(saved) ? saved : 'dark', false)
    }
  }, [known, reachable, siteTheme])
  return null
}

export function useTheme() {
  // Server (prerender) snapshot is always "dark"; the real value is applied right after hydration.
  const theme = useSyncExternalStore(subscribe, read, () => 'dark')
  const forced = useSiteTheme()
  const setTheme = useCallback((t) => apply(t), [])
  const toggle = useCallback(() => apply(read() === 'dark' ? 'light' : 'dark'), [])
  return { theme, setTheme, toggle, forced }
}
