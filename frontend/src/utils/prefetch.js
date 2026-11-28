// Route prefetching: a page's code is fetched while the visitor is still deciding to click, so the click opens the page from the cache instead of waiting for a download.
//   - hovering, focusing (keyboard) or touching a link prefetches that page's chunk;
//   - once the first page is idle, the main pages are fetched in the background (skipped on Save-Data and slow connections).
// The loaders use the same module paths as the lazy routes in App.jsx, so the bundler shares the chunks: nothing is downloaded twice.
const ROUTES = [
  [/^\/about$/, () => import('../pages/About.jsx')],
  [/^\/services$/, () => import('../pages/Services.jsx')],
  [/^\/services\/[^/]+$/, () => import('../pages/ServiceDetail.jsx')],
  [/^\/services\/[^/]+\/[^/]+$/, () => import('../pages/ServiceItem.jsx')],
  [/^\/products$/, () => import('../pages/Products.jsx')],
  [/^\/products\/[^/]+$/, () => import('../pages/ProductDetail.jsx')],
  [/^\/industries$/, () => import('../pages/Industries.jsx')],
  [/^\/industries\/[^/]+$/, () => import('../pages/IndustryDetail.jsx')],
  [/^\/insights$/, () => import('../pages/Insights.jsx')],
  [/^\/insights\/[^/]+$/, () => import('../pages/ArticleDetail.jsx')],
  [/^\/our-network$/, () => import('../pages/Network.jsx')],
  [/^\/solutions$/, () => import('../pages/Solutions.jsx')],
  [/^\/solutions\/[^/]+$/, () => import('../pages/SolutionDetail.jsx')],
  [/^\/our-network\/[^/]+$/, () => import('../pages/NetworkPartner.jsx')],
  [/^\/our-team$/, () => import('../pages/Team.jsx')],
  [/^\/career$/, () => import('../pages/Career.jsx')],
  [/^\/contact$/, () => import('../pages/Contact.jsx')],
  [/^\/work$/, () => import('../pages/Projects.jsx')],
  [/^\/websites$/, () => import('../pages/Websites.jsx')],
  [/^\/locations$/, () => import('../pages/Locations.jsx')],
  [/^\/partner-with-us$/, () => import('../pages/PartnerHub.jsx')],
  [/^\/(franchise|authorized-partner|referral-partner)$/, () => import('../pages/PartnerCategory.jsx')],
  [/^\/(franchise|authorized-partner|referral-partner)\/[^/]+$/, () => import('../pages/PartnerOpportunity.jsx')],
  [/^\/(cad-engineering|robotics|blockchain|upcoming\/[^/]+)$/, () => import('../pages/UpcomingService.jsx')],
  [/^\/login$/, () => import('../pages/Login.jsx')],
  [/^\/register$/, () => import('../pages/Register.jsx')],
]
const done = new Set()

/** Fetch the code of the page behind an internal address (a path, with or without language prefix, query or hash). Quietly does nothing for anything else. */
export function prefetchPath(href) {
  let path
  try {
    const u = new URL(href, window.location.href)
    if (u.origin !== window.location.origin) return
    path = u.pathname.replace(/^\/(ta|hi)(?=\/|$)/, '').replace(/\/+$/, '') || '/'
  } catch { return }
  const hit = ROUTES.find(([re]) => re.test(path))
  if (!hit || done.has(hit[0])) return
  done.add(hit[0])
  hit[1]().catch(() => done.delete(hit[0])) // a failed download may be tried again
}

const slow = () => { const c = navigator.connection; return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) }
const linkOf = (e) => e.target?.closest?.('a[href]')

/** Start prefetching (hover / focus / touch, then idle prefetch of the main pages). Returns a function that stops it. */
export function installPrefetch() {
  if (typeof window === 'undefined' || slow()) return () => {}
  const on = (e) => { const a = linkOf(e); if (a && !a.target && a.origin === window.location.origin) prefetchPath(a.href) }
  const opts = { passive: true, capture: true }
  document.addEventListener('pointerover', on, opts) // mouse and pen: the page is already on its way when the click lands
  document.addEventListener('focusin', on, opts)     // keyboard
  document.addEventListener('touchstart', on, opts)  // touch: before the tap completes
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 2500))
  const handle = idle(() => ['/services', '/about', '/contact', '/our-network', '/products'].forEach((p, i) => setTimeout(() => prefetchPath(p), i * 600)), { timeout: 6000 })
  return () => {
    document.removeEventListener('pointerover', on, opts); document.removeEventListener('focusin', on, opts); document.removeEventListener('touchstart', on, opts)
    if (window.cancelIdleCallback && typeof handle === 'number') window.cancelIdleCallback(handle)
  }
}
