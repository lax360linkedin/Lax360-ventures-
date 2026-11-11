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
//
// After the intro animation the 7-card Welcome Experience (components/intro/WelcomeExperience.jsx) may follow:
//   cards     – the welcome cards are showing over the held-back homepage; leaving them reveals the homepage ('revealing' -> 'done')
// The cards are managed in the admin panel (Welcome Experience). They are shown once per browsing session (sessionStorage, optional) and can be replayed from the footer.
import { useSyncExternalStore } from 'react'
import { getState } from '../services/siteService.js'
import { toParagraphs } from './cms.js'

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const saveData = () => Boolean(typeof navigator !== 'undefined' && navigator.connection?.saveData)
const wantsPreview = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('welcome') === 'preview'

function initial() {
  if (typeof window === 'undefined' || window.location.pathname !== '/' || wantsPreview()) return 'off' // only when the page load itself is the homepage (a preview of the cards skips the animation)
  return prefersReducedMotion() || saveData() ? 'off' : 'pending' // keep in sync with the inline script in index.html
}

let state = initial()
// Start downloading the intro code right away (in parallel with React starting up) instead of when the homepage first renders.
if (state === 'pending') {
  import('../components/intro/WelcomeIntro.jsx').catch(() => {})
  import('../components/intro/WelcomeExperience.jsx').catch(() => {}) // ready (and cached) by the time the animation hands over to the cards
}
const listeners = new Set()
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

export function setIntroState(next) {
  // The intro animation (unchanged) ends by setting 'done': when the welcome cards are enabled they follow it, floating over the homepage, instead.
  if (next === 'done' && (state === 'revealing' || state === 'playing') && welcomePlan()) next = 'cards'
  if (state === next) return
  state = next
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (next === 'pending' || next === 'playing' || next === 'revealing' || next === 'cards') root.setAttribute('data-intro', next)
    else root.removeAttribute('data-intro')
  }
  listeners.forEach((l) => l())
}

export const useIntroState = () => useSyncExternalStore(subscribe, () => state, () => 'off')

// ---- the Welcome Experience cards ---------------------------------------------------------------------------------------------------
const SEEN_KEY = 'lax360-welcome-seen'
let forced = false // a visitor asked to see it again (footer): ignore the once-per-session rule
let previewing = false // an administrator is previewing it: ignore the on/off switches

export const welcomeSeen = () => { try { return sessionStorage.getItem(SEEN_KEY) === '1' } catch { return false } }
export const markWelcomeSeen = () => { try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* storage blocked: it may show again, which is harmless */ } }
export const isWelcomePreview = () => previewing

export function normaliseWelcomeCard(item) {
  const d = item.data || {}
  return {
    id: item.id || item.slug, slug: item.slug, name: item.title, theme: d.theme || 'welcome', headline: d.headline || item.title, paragraphs: toParagraphs(d.description),
    status: d.status_label || '', image: d.image || '', imageAlt: d.image_alt || '', exploreLabel: d.explore_label || '', exploreLink: d.explore_link || '',
    franchise: d.franchise_enabled === true, franchiseLabel: d.franchise_label || 'Franchise Opportunities', division: d.franchise_division || item.title,
    enabled: d.enabled !== false, order: item.sort_order || 0,
  }
}

/** The welcome experience to show now ({ cards, skipLabel, finalLabel }), or null when it is off, has no cards, was already seen this session or the content is not loaded. */
export function welcomePlan() {
  const { content, ready } = getState()
  if (!ready) return null
  const page = (content.welcome_page || [])[0]?.data || {}
  if (!previewing && page.enabled === false) return null
  if (!previewing && !forced && page.once_per_session !== false && welcomeSeen()) return null
  const cards = (content.welcome_card || []).map(normaliseWelcomeCard).filter((c) => c.enabled).sort((a, b) => a.order - b.order)
  return cards.length ? { cards, finalLabel: page.final_label || 'Next' } : null
}

/** Show the cards now (the intro animation has ended or was skipped). Returns false when there is nothing to show. */
export function goToCards() {
  if (!welcomePlan()) return false
  setIntroState('cards')
  return true
}

/** Open the cards directly (admin preview, or the footer when the animation is not wanted). `preview` ignores the switches so a draft can be checked. */
export function openWelcomeExperience({ preview = false } = {}) {
  previewing = preview
  forced = true
  window.scrollTo(0, 0)
  return goToCards()
}

/** Replay on request (footer button). Returns false when the visitor prefers reduced motion. The cards follow the animation again. */
export function replayIntro() {
  if (prefersReducedMotion()) return false
  forced = true
  window.scrollTo(0, 0)
  setIntroState('pending')
  return true
}
