// State of the welcome intro (module-level store, same pattern as useAuth/useTheme).
//   off       – nothing to show (reduced motion / data saver, the visit did not start on "/", or it failed to load)
//   pending   – the intro should play; assets are being preloaded; the page underneath is held back
//   playing   – the intro is running over the page
//   revealing – the intro is fading out and the homepage content is animating in
//   done      – finished or skipped
//
// There is deliberately NO sessionStorage / localStorage here: the intro plays on every full page load (a browser refresh starts it again
// from the beginning). It does not restart on normal in-app navigation, because this module's state lives only as long as the page does.
// The server / prerender snapshot is always "off", so hydration matches the prerendered HTML.
import { useSyncExternalStore } from 'react'

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const saveData = () => Boolean(typeof navigator !== 'undefined' && navigator.connection?.saveData)

function initial() {
  if (typeof window === 'undefined' || window.location.pathname !== '/') return 'off' // only when the page load itself is the homepage
  return prefersReducedMotion() || saveData() ? 'off' : 'pending' // keep in sync with the inline script in index.html
}

let state = initial()
// Start downloading the intro code right away (in parallel with React starting up) instead of when the homepage first renders.
if (state === 'pending') import('../components/intro/WelcomeIntro.jsx').catch(() => {})
const listeners = new Set()
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

export function setIntroState(next) {
  if (state === next) return
  state = next
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (next === 'pending' || next === 'playing' || next === 'revealing') root.setAttribute('data-intro', next)
    else root.removeAttribute('data-intro')
  }
  listeners.forEach((l) => l())
}

export const useIntroState = () => useSyncExternalStore(subscribe, () => state, () => 'off')

/** Replay on request (footer button). Returns false when the visitor prefers reduced motion. */
export function replayIntro() {
  if (prefersReducedMotion()) return false
  window.scrollTo(0, 0)
  setIntroState('pending')
  return true
}
