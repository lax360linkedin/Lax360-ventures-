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
import { getState, loadContent, subscribe as subscribeContent } from '../services/siteService.js'
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

const CONTENT_WAIT_MS = 10000
const contentWait = { waiting: false, gaveUp: false }
function waitForContent() {
  if (contentWait.waiting) return
  contentWait.waiting = true
  loadContent()
  let unsub = () => {}
  let timer = 0
  const resume = (gaveUp) => {
    if (!contentWait.waiting) return
    contentWait.waiting = false
    contentWait.gaveUp = gaveUp || contentWait.gaveUp
    window.clearTimeout(timer)
    unsub()
    if (state === 'revealing' || state === 'playing') setIntroState('done') // decide now: cards if there are some, otherwise the homepage
  }
  unsub = subscribeContent(() => { if (getState().ready) resume(false) })
  timer = window.setTimeout(() => resume(true), CONTENT_WAIT_MS)
}

export function setIntroState(next) {
  // The intro animation (unchanged) ends by setting 'done': when the welcome cards are enabled they follow it, floating over the homepage, instead.
  if (next === 'done' && (state === 'revealing' || state === 'playing')) {
    // The managed content may still be on its way (a slow or cold-starting server): wait for it (bounded) instead of deciding "no cards" too early.
    if (!getState().ready && !contentWait.gaveUp) { waitForContent(); return }
    if (welcomePlan()) next = 'cards'
  }
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

// What the visitor has already seen is remembered with the list of promotional cards that were in front of them, so a NEW festival greeting or offer is shown even in a
// browsing session that has already seen the regular cards.
export const welcomeSeen = (sig = '') => { try { return sessionStorage.getItem(SEEN_KEY) === `seen:${sig}` } catch { return false } }
export const markWelcomeSeen = (sig = '') => { try { sessionStorage.setItem(SEEN_KEY, `seen:${sig}`) } catch { /* storage blocked: it may show again, which is harmless */ } }
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

/** The welcome experience to show now ({ cards, finalLabel, sig }), or null when it is off, has nothing to show, was already seen this session or the content is not loaded.
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
  const sig = live.filter((c) => c.promo).map((c) => c.id).sort().join(',')
  if (!cards.length) return null
  if (!previewing && !forced && page.once_per_session !== false && welcomeSeen(sig)) return null
  return { cards, sig }
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
