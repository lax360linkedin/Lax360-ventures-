import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useSiteLoaded, useSiteSettings } from './useSite.js'
import { ALL_THEME_IDS, PALETTE_IDS, PALETTE_THEMES } from '../data/themes.js'
import { presetById } from '../data/themePresets.js'
import { customThemeCss, themeBg } from '../utils/themeEngine.js'

// Themes: "dark" (default), "light", and the light-family palettes "snow", "rose" and "sage".
// On <html>, `data-theme` is "light" or "dark" (so every existing light/dark rule keeps working) and the three palettes add
// `data-palette="snow|rose|sage"` on top of "light" to re-colour the shared tokens in styles/index.css.
// A visitor's Dark/Light choice is stored in localStorage. When a Super Admin picks a theme under Website settings > Appearance, that
// theme (stored in the database as `site_theme`) applies to every visitor; it is cached in localStorage so the next page load paints it
// at once. The inline script in index.html applies the cached theme before first paint, so there is no flash.
export const THEME_KEY = 'lax360-theme'
export const SITE_THEME_KEY = 'lax360-site-theme'
export const THEMES = ALL_THEME_IDS // dark, light, the first three palettes (snow, rose, sage) and the 21 extra palette themes (data/themes.js)
const PALETTES = PALETTE_IDS
const META_COLOR = { light: '#ffffff', dark: '#0a0c10', snow: '#fafafa', rose: '#fffafa', sage: '#fbfdfa', ...Object.fromEntries(PALETTE_THEMES.map((t) => [t.id, t.bg])) }

// Built in the admin panel (Theme builder) or ready-made presets: ids "custom-..." / "preset-...". Their colours are generated in the browser (utils/themeEngine.js) into one <style> element, and
// <html> gets data-palette="custom". The generated CSS of the last visit is kept in localStorage so the inline script in index.html can paint it before the first frame (no flash).
export const CUSTOM_CSS_KEY = 'lax360-custom-css'
const DYNAMIC = /^(custom|preset)-[a-z0-9]+(-[a-z0-9]+)*$/
export const isDynamicTheme = (id) => typeof id === 'string' && DYNAMIC.test(id)
let customDefs = [] // the administrator's custom themes (from the public settings)
export const setCustomDefs = (list) => { customDefs = Array.isArray(list) ? list : [] }
export const defOf = (id) => presetById(id) || customDefs.find((t) => t.id === id) || null
const STYLE_ID = 'lax360-custom-theme'
const setCss = (css) => {
  let el = document.getElementById(STYLE_ID)
  if (!css) { el?.remove(); return }
  if (!el) { el = document.createElement('style'); el.id = STYLE_ID; document.head.appendChild(el) }
  if (el.textContent !== css) el.textContent = css
}
/** The appearance (light / dark) a theme definition starts in: fixed for light-only and dark-only themes; for "both" the visitor's last choice, else light. */
function modeFor(def) {
  if (def.mode === 'light' || def.mode === 'dark') return def.mode
  let saved = null
  try { saved = window.localStorage.getItem(THEME_KEY) } catch { /* ignore */ }
  return saved === 'dark' ? 'dark' : 'light'
}
/** Applies a definition to the page (also used for the admin panel's live preview of an unsaved theme). */
export function applyDef(def, { cache = false, mode } = {}) {
  const root = document.documentElement
  const css = customThemeCss(def)
  setCss(css)
  const m = mode || modeFor(def)
  root.setAttribute('data-theme', m)
  root.setAttribute('data-palette', 'custom')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeBg(def, m === 'dark'))
  if (cache) { try { window.localStorage.setItem(CUSTOM_CSS_KEY, JSON.stringify({ id: def.id, css, mode: def.mode, bgL: themeBg(def, false), bgD: themeBg(def, true) })) } catch { /* ignore */ } }
  listeners.forEach((l) => l())
}

const listeners = new Set()
const read = () => {
  const root = document.documentElement
  const palette = root.getAttribute('data-palette')
  if (PALETTES.includes(palette)) return palette
  return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

let switchTimer
function apply(theme, persist = true, animate = true) {
  const root = document.documentElement
  if (!THEMES.includes(theme)) return
  // Brief cross-fade for a visitor's own Dark / Light choice, skipped for people who prefer reduced motion. NOT used when the website applies the administrator's theme after the settings
  // arrive: that switch happens while the page loads, and cross-fading every element (about 2,000 transitions, over a second of style work) only slowed the first page down.
  if (animate && read() !== theme && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-switching')
    clearTimeout(switchTimer)
    switchTimer = setTimeout(() => root.classList.remove('theme-switching'), 450)
  }
  setCss('') // leaving a custom / preset theme
  root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
  if (PALETTES.includes(theme)) root.setAttribute('data-palette', theme)
  else root.removeAttribute('data-palette')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme] || '#ffffff')
  if (persist) {
    try {
      window.localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* private mode / blocked storage: the choice just won't persist */
    }
  }
  listeners.forEach((l) => l())
}

let previewBackup = null
const snapshot = () => { const r = document.documentElement; return { theme: r.getAttribute('data-theme'), palette: r.getAttribute('data-palette'), css: document.getElementById(STYLE_ID)?.textContent || '', meta: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') } }
/** Admin theme preview: shows a theme (a built-in id, a preset / custom id, or an unsaved definition object) on the page WITHOUT saving it anywhere. `endPreview()` puts the previous look back. */
export function previewTheme(theme, mode) {
  if (previewBackup === null) previewBackup = snapshot()
  if (theme && typeof theme === 'object') { applyDef(theme, { mode }); return }
  const def = isDynamicTheme(theme) ? defOf(theme) : null
  if (def) applyDef(def, { mode })
  else apply(theme, false, false)
}
export function endPreview() {
  if (previewBackup === null) return
  const b = previewBackup
  previewBackup = null
  const root = document.documentElement
  setCss(b.css)
  if (b.theme) root.setAttribute('data-theme', b.theme)
  if (b.palette) root.setAttribute('data-palette', b.palette); else root.removeAttribute('data-palette')
  if (b.meta) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', b.meta)
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
  const settings = useSiteSettings()
  const value = settings.site_theme
  if (isDynamicTheme(value)) return presetById(value) || (Array.isArray(settings.custom_themes) && settings.custom_themes.some((t) => t.id === value)) ? value : ''
  return THEMES.includes(value) ? value : ''
}

/** Public site only: applies the Super Admin's theme (and caches it for the next visit). Renders nothing. */
export function SiteThemeSync() {
  const known = useSiteLoaded()
  const siteTheme = useSiteTheme()
  const settings = useSiteSettings()
  const reachable = Object.keys(settings).length > 0
  const customList = settings.custom_themes
  useEffect(() => {
    if (!known || !reachable) return // settings not loaded yet, or the API is unreachable: keep whatever is already applied
    setCustomDefs(customList)
    try {
      if (siteTheme) window.localStorage.setItem(SITE_THEME_KEY, siteTheme)
      else { window.localStorage.removeItem(SITE_THEME_KEY); window.localStorage.removeItem(CUSTOM_CSS_KEY) }
    } catch { /* ignore */ }
    if (previewBackup !== null) return // the admin panel is previewing a theme: leave it alone
    if (isDynamicTheme(siteTheme)) applyDef(defOf(siteTheme), { cache: true })
    else if (siteTheme) apply(siteTheme, false, false)
    else {
      let saved = null
      try { saved = window.localStorage.getItem(THEME_KEY) } catch { /* ignore */ }
      apply(THEMES.includes(saved) ? saved : 'dark', false, false)
    }
  }, [known, reachable, siteTheme, customList])
  // The admin panel's Theme builder shows the public website in an iframe (/...?themepreview=1) and sends it the theme being edited: same origin only, colours only.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('themepreview')) return undefined
    const on = (e) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'lax360-theme-preview') return
      if (previewBackup === null) previewBackup = snapshot()
      if (e.data.def) applyDef(e.data.def, { mode: e.data.mode === 'dark' ? 'dark' : 'light' })
      else apply(e.data.theme === 'dark' ? 'dark' : 'light', false, false)
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [])
  return null
}

export function useTheme() {
  // Server (prerender) snapshot is always "dark"; the real value is applied right after hydration.
  const theme = useSyncExternalStore(subscribe, read, () => 'dark')
  const site = useSiteTheme()
  const siteDef = isDynamicTheme(site) ? defOf(site) : null
  const forced = siteDef && siteDef.mode === 'both' ? '' : site // a theme that has both appearances keeps the visitor's Light / Dark switch
  const setTheme = useCallback((t) => apply(t), [])
  const toggle = useCallback(() => {
    const next = read() === 'dark' ? 'light' : 'dark'
    if (document.documentElement.getAttribute('data-palette') === 'custom') { // custom / preset theme: only the appearance changes
      document.documentElement.setAttribute('data-theme', next)
      try { window.localStorage.setItem(THEME_KEY, next) } catch { /* ignore */ }
      const def = defOf(site)
      if (def) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeBg(def, next === 'dark'))
      listeners.forEach((l) => l())
      return
    }
    apply(next)
  }, [site])
  return { theme, setTheme, toggle, forced }
}
