// State of the welcome intro (module-level store, same pattern as useAuth/useTheme).
//   off       – nothing to show (reduced motion / data saver, the visit did not start on "/", or it failed to load)
//   pending   – the intro should play; assets are being preloaded; the page underneath is held back
//   playing   – the intro is running over the page
//   revealing – the intro is fading out and the homepage content is animating in
//   done      – finished or skipped
//
// The intro plays on every full page load (a browser refresh starts it again
// from the beginning). It does not restart on normal in-app navigation, because this module's state lives only as long as the page does.
// The server / prerender snapshot is always "off", so hydration matches the prerendered HTML.
//
// The Welcome Cards (components/sections/WelcomeCards.jsx) are a section of the home page, directly below the home header: they are NOT part of this state machine (the intro animation ends with 'done'
// and the page, cards included, is simply there). They are managed in the admin panel (Welcome cards), PERMANENT: always there on every load and refresh, whatever the visitor has already seen (nothing is stored in the browser). The footer button replays the intro.
import { useMemo, useSyncExternalStore } from 'react'
import { getState } from '../services/siteService.js'
import { useContentReady } from '../hooks/useSite.js'
import { toParagraphs } from './cms.js'

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const saveData = () => Boolean(typeof navigator !== 'undefined' && navigator.connection?.saveData)
const wantsPreview = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('welcome') === 'preview'

function initial() {
  if (typeof window === 'undefined' || !/^\/([a-z]{2})?\/?$/.test(window.location.pathname) || wantsPreview()) return 'off' // only when the page load itself is the homepage (a preview of the cards skips the animation)
  return prefersReducedMotion() || saveData() ? 'off' : 'pending' // keep in sync with the inline script in index.html
}

let state = initial()
// Start downloading the intro code right away (in parallel with React starting up) instead of when the homepage first renders.
if (state === 'pending') {
  import('../components/intro/WelcomeIntro.jsx').catch(() => {})
  import('../components/sections/WelcomeCards.jsx').catch(() => {}) // ready (and cached) by the time the animation hands over to the page
}
const listeners = new Set()
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

export function setIntroState(next) {
  if (state === next) return
  state = next
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (next === 'pending' || next === 'playing' || next === 'revealing') root.setAttribute('data-intro', next)
    else {
      root.setAttribute('data-intro-ending', '') // transitions stay off for the frame in which the page is revealed (see index.css)
      root.removeAttribute('data-intro')
      requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-intro-ending')))
    }
  }
  listeners.forEach((l) => l())
}

export const useIntroState = () => useSyncExternalStore(subscribe, () => state, () => 'off')

// ---- the Welcome Cards -----------------------------------------------------------------------------------------------------------------
// The cards are PERMANENT: a fixed section of the home page below the header. Nothing a visitor does (viewing them, finishing them, refreshing, coming back) hides or skips them, and
// nothing about them is stored in localStorage / sessionStorage. Only the administrator's own switches (Welcome cards in the admin panel) decide whether they exist.
let previewing = false // an administrator is previewing it: ignore the on/off switches so drafts can be checked
export const isWelcomePreview = () => previewing

const PROMO_LABEL = { festival: 'Festival greeting', announcement: 'Announcement', offer: 'Special offer' }
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function normaliseWelcomeCard(item) {
  const d = item.data || {}
  const promo = PROMO_LABEL[d.card_type] ? d.card_type : ''
  return {
    id: item.id || item.slug, slug: item.slug, name: item.title, theme: d.theme || 'welcome', headline: d.headline || item.title, paragraphs: toParagraphs(d.description),
    promo, status: d.status_label || (promo ? PROMO_LABEL[promo] : ''), image: d.image || '', imageAlt: d.image_alt || '', exploreLabel: d.explore_label || '', exploreLink: d.explore_link || '',
    franchise: d.franchise_enabled === true, franchiseLabel: d.franchise_label || 'Franchise Opportunities', division: d.franchise_division || item.title,
    enabled: d.enabled !== false, order: item.sort_order || 0, start: d.start_date || '', end: d.end_date || '',
  }
}

/** Is the card inside its start / end dates today (inclusive)? A card with no dates is always inside. Expired and not-yet-started cards are not shown. */
export const welcomeCardActive = (c, today = localToday()) => (!c.start || c.start <= today) && (!c.end || c.end >= today)

/** The cards to show ({ cards }), or null when the administrator has switched the section off, has no card on, or the content is not loaded yet. Whether the visitor has seen them before plays NO part.
 *  Active festival greetings / announcements / offers come first (in their configured order), then the regular cards in theirs. */
export function welcomePlan() {
  const { content, ready } = getState()
  if (!ready) return null
  const page = (content.welcome_page || [])[0]?.data || {}
  if (!previewing && page.enabled === false) return null
  const today = localToday()
  const byOrder = (a, b) => a.order - b.order
  const live = (content.welcome_card || []).map(normaliseWelcomeCard).filter((c) => c.enabled && (previewing || welcomeCardActive(c, today)))
  const cards = [...live.filter((c) => c.promo).sort(byOrder), ...live.filter((c) => !c.promo).sort(byOrder)]
  if (!cards.length) return null
  return { cards }
}

// A request to show the cards from the first one, at the top of the screen (footer replay, admin preview). The section takes it when it exists, or when it mounts.
let openRequested = false
let version = 0
const bump = () => { version += 1; listeners.forEach((l) => l()) }
export const takeOpenRequest = () => { const r = openRequested; openRequested = false; return r }

/** The cards for the Welcome Cards section of the home page (null: the administrator has none switched on). Worked out when the content is ready or a replay / preview is asked for. */
export function useWelcomePlan() {
  const ready = useContentReady()
  const v = useSyncExternalStore(subscribe, () => version, () => 0)
  return useMemo(() => (ready ? welcomePlan() : null), [ready, v]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Show the cards from the first one (admin preview, or the footer when the animation is not wanted). `preview` ignores the on/off switches so a draft can be checked.
 *  Returns false when there is nothing to show. */
export function openWelcomeExperience({ preview = false } = {}) {
  previewing = preview
  openRequested = true
  bump()
  window.dispatchEvent(new Event('lax360:welcome-open'))
  return Boolean(welcomePlan())
}

/** Replay on request (footer button). Returns false when the visitor prefers reduced motion. The cards are there again when the animation has ended. */
export function replayIntro() {
  if (prefersReducedMotion()) return false
  window.scrollTo(0, 0)
  bump()
  setIntroState('pending')
  return true
}
