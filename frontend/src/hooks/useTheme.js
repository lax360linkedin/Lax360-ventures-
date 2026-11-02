import { useCallback, useSyncExternalStore } from 'react'

// Theme = the `data-theme` attribute on <html> ("light" or "dark"; dark is the default when absent).
// The inline script in index.html applies the saved choice before first paint, so there is no flash.
// The preference is stored in localStorage and synced across tabs; storage failures are ignored.
export const THEME_KEY = 'lax360-theme'
const META_COLOR = { light: '#ffffff', dark: '#0b0714' }

const listeners = new Set()
const read = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark')

let switchTimer
function apply(theme, persist = true) {
  const root = document.documentElement
  // Brief cross-fade, skipped for people who prefer reduced motion.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-switching')
    clearTimeout(switchTimer)
    switchTimer = setTimeout(() => root.classList.remove('theme-switching'), 450)
  }
  root.setAttribute('data-theme', theme)
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
    if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) apply(e.newValue, false)
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', onStorage)
  }
}

export function useTheme() {
  // Server (prerender) snapshot is always "dark"; the real value is applied right after hydration.
  const theme = useSyncExternalStore(subscribe, read, () => 'dark')
  const setTheme = useCallback((t) => apply(t), [])
  const toggle = useCallback(() => apply(read() === 'light' ? 'dark' : 'light'), [])
  return { theme, setTheme, toggle }
}
