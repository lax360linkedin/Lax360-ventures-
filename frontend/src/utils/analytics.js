// Analytics, prepared but OFF until an identifier is configured (public values, set as build-time environment variables) AND the visitor has accepted analytics cookies in the cookie banner (utils/consent.js):
//   VITE_GTM_ID             Google Tag Manager container, e.g. GTM-XXXXXXX     (events go to the dataLayer; configure GA4 inside the container)
//   VITE_GA_MEASUREMENT_ID  Google Analytics 4 measurement id, e.g. G-XXXXXXXXXX (used directly when no container is set)
// Nothing is loaded, stored or sent without an identifier, without the visitor's consent, nor when the browser sends Do Not Track / Global Privacy Control. Withdrawing consent stops all sending and removes the analytics cookies. Events: page_view, generate_lead (every enquiry form: contact,
// quote, partner, career ...), demo_request, whatsapp_click, phone_click, email_click. No personal details (names, emails, messages) are ever put into an event.
const GTM = (import.meta.env.VITE_GTM_ID || '').trim()
const GA = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim()
import { analyticsAllowed, onConsentChange } from './consent.js'

let started = false

const optedOut = () => typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true)
export const analyticsEnabled = () => typeof window !== 'undefined' && Boolean(GTM || GA) && !optedOut() && analyticsAllowed()

function script(src) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

/** Load the configured tags once. Safe to call anywhere on the client. */
export function initAnalytics() {
  if (started || !analyticsEnabled()) return
  started = true
  window.dataLayer = window.dataLayer || []
  const gtag = function gtag() { window.dataLayer.push(arguments) } // eslint-disable-line prefer-rest-params
  window.gtag = window.gtag || gtag
  if (GTM && /^GTM-[A-Z0-9]+$/.test(GTM)) {
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
    script(`https://www.googletagmanager.com/gtm.js?id=${GTM}`)
  } else if (GA && /^G-[A-Z0-9]+$/.test(GA)) {
    script(`https://www.googletagmanager.com/gtag/js?id=${GA}`)
    window.gtag('js', new Date())
    window.gtag('config', GA, { send_page_view: false }) // page views are sent by trackPageView so client-side navigation is counted too
  }
}

/** Send one event (to the GTM dataLayer, or to GA4 directly). Nothing is sent unless the visitor has consented. */
export function trackEvent(name, params = {}) {
  if (!started || !analyticsAllowed()) return
  if (GTM) window.dataLayer.push({ event: name, ...params })
  else if (window.gtag) window.gtag('event', name, params)
}

export const trackPageView = (path, title) => trackEvent('page_view', { page_path: path, page_title: title, page_location: window.location.href })

let listening = false
/** One delegated listener: clicks on WhatsApp, phone and email links anywhere on the website. */
export function trackOutboundClicks() {
  if (listening || typeof document === 'undefined') return
  listening = true
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]')
    if (!a) return
    const href = a.getAttribute('href') || ''
    const where = a.closest('footer') ? 'footer' : a.closest('header, [data-topbar]') ? 'header' : a.closest('main') ? 'page' : 'other'
    if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//i.test(href)) trackEvent('whatsapp_click', { link_location: where })
    else if (href.startsWith('tel:')) trackEvent('phone_click', { link_location: where })
    else if (href.startsWith('mailto:')) trackEvent('email_click', { link_location: where })
  }, true)
}

/** The visitor withdrew consent: stop measuring and remove the analytics cookies this site's tags set. */
function withdraw() {
  if (typeof window === 'undefined') return
  if (GA) window[`ga-disable-${GA}`] = true
  if (window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' })
  const host = window.location.hostname
  const parts = host.split('.')
  const domains = [host, `.${host}`, ...(parts.length > 2 ? [`.${parts.slice(-2).join('.')}`] : [])]
  document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^(_ga|_gid|_gat|_gcl)/.test(n)).forEach((n) => domains.forEach((d) => { document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}` }))
}

/** Start the tags when consent is given (now, or later when the visitor accepts), and stop them if it is withdrawn. Called once at start-up. */
export function connectConsent() {
  if (typeof window === 'undefined') return
  const sync = () => {
    if (analyticsAllowed()) {
      if (GA) window[`ga-disable-${GA}`] = false
      const first = !started
      initAnalytics()
      if (started && window.gtag) window.gtag('consent', 'update', { analytics_storage: 'granted' })
      if (first && started) trackPageView(window.location.pathname, document.title) // the page the visitor is on when they accept
    } else if (started) withdraw()
  }
  sync()
  onConsentChange(sync)
}
