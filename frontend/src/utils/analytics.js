// Analytics, prepared but OFF until an identifier is configured (public values, set as build-time environment variables):
//   VITE_GTM_ID             Google Tag Manager container, e.g. GTM-XXXXXXX     (events go to the dataLayer; configure GA4 inside the container)
//   VITE_GA_MEASUREMENT_ID  Google Analytics 4 measurement id, e.g. G-XXXXXXXXXX (used directly when no container is set)
// Nothing is loaded, stored or sent without one of them, nor when the visitor's browser sends Do Not Track / Global Privacy Control. Events: page_view, generate_lead (every enquiry form: contact,
// quote, partner, career ...), demo_request, whatsapp_click, phone_click, email_click. No personal details (names, emails, messages) are ever put into an event.
const GTM = (import.meta.env.VITE_GTM_ID || '').trim()
const GA = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim()
let started = false

const optedOut = () => typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true)
export const analyticsEnabled = () => typeof window !== 'undefined' && Boolean(GTM || GA) && !optedOut()

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

/** Send one event (to the GTM dataLayer, or to GA4 directly). */
export function trackEvent(name, params = {}) {
  if (!started) return
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
