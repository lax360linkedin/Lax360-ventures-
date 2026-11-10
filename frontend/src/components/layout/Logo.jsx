import { Link, useLocation } from 'react-router-dom'
import { useSite } from '../../hooks/useSite.js'

/**
 * Shield mark (transparent PNG cut from the supplied logo) on a soft glass tile + temporary text wordmark.
 * Replace this component's contents when the official "LAX360 Pvt Ltd" SVG lockup is supplied.
 *
 * `aRef` is attached to the letter "A" in LAX360 — the header mini-bot measures it so it can stand on that letter.
 * The icon and the text are one link to Home.
 */
export default function Logo({ className = '', aRef }) {
  const site = useSite()
  const { pathname } = useLocation()
  // Already on Home: the link would do nothing, so bring the visitor back to the top instead.
  const toTop = () => {
    if (pathname !== '/') return
    const opts = { top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }
    window.scrollTo(opts)
    document.body.scrollTo?.(opts) // the page body is the scroller in some layouts
  }
  return (
    <Link to="/" onClick={toTop} aria-label="LAX360 Pvt Ltd home" className={`group inline-flex items-center gap-3 ${className}`}>
      <span className="rounded-xl bg-white/95 p-1 shadow-[0_0_0_1px_rgb(var(--glow3)/0.35)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">
        <img src={site.logoUrl || '/assets/logo-shield.png'} alt="" width="40" height="42" className="h-9 w-auto" />
      </span>
      <span className="flex flex-col font-display leading-none text-fg">
        <span className="text-xl font-bold tracking-tight">L<span ref={aRef} className="inline-block">A</span>X360</span>{' '}
        <span className="mt-1 text-[0.6875rem] font-semibold uppercase tracking-[0.34em] text-lav">Pvt Ltd</span>
      </span>
    </Link>
  )
}
