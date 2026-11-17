import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRedirects } from '../../hooks/useSite.js'
import { trackPageView } from '../../utils/analytics.js'

const clean = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p)

/**
 * Two small jobs that follow the route (renders nothing):
 *  - redirects set in the admin panel (SEO management > Redirects): when the address matches an active redirect, the visitor is sent to the new address (a path inside the website, or a full https:// address);
 *  - Google Analytics / Tag Manager page views for client-side navigation (only when an analytics id is configured).
 * A redirect that would lead back to the page being shown is ignored, so a mistake in the list can never trap a visitor in a loop.
 */
export default function SeoWatcher() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const redirects = useRedirects()

  useEffect(() => {
    const hit = redirects.find((r) => clean(r.from) === clean(pathname))
    if (!hit || clean(hit.to) === clean(pathname)) return
    if (/^https?:\/\//i.test(hit.to)) window.location.replace(hit.to)
    else navigate(hit.to, { replace: true })
  }, [pathname, redirects, navigate])

  useEffect(() => { trackPageView(pathname, document.title) }, [pathname])
  return null
}
