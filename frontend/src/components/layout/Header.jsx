import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Logo from './Logo.jsx'
import HeaderBot from './HeaderBot.jsx'
import AccountMenu from './AccountMenu.jsx'
import ThemeToggle from '../ui/ThemeToggle.jsx'
import { primaryNav } from '../../data/navigation.js'
import { useNav } from '../../hooks/useSite.js'
import { useScrolledPast } from '../../hooks/useScrollDirection.js'
import { useMediaQuery } from '../../hooks/useMediaQuery.js'

const linkCls = 'relative z-10 inline-flex min-h-11 items-center px-2.5 text-sm xl:px-4 xl:text-[0.9375rem] 2xl:px-[1.125rem] font-medium tracking-tight transition-colors duration-200'

/**
 * The one shared header. It is `position: fixed` on every page and never hides on scroll; its height is constant
 * (72px / 92px from `lg`), so nothing shifts and the page padding in RootLayout matches it exactly.
 *
 * Desktop layout is a three-column grid — [logo] [navigation] [theme toggle + CTA] with `minmax(0,1fr)` outer columns —
 * so the links stay truly centred whatever the logo or the controls need. Below `lg` it is logo + controls + menu button.
 * Order: About → Services → Industries → Insights → Our Network → Our Team → Careers → Contact. Dark: transparent deep-violet glass; light: translucent
 * white glass; both get a more opaque, blurred surface after scrolling.
 *
 * The mini-bot (HeaderBot) lives in a non-interactive overlay. It rests above the active page's link (the "A" of LAX360 on Home) and travels to hovered/clicked links.
 */
export default function Header({ onOpenMenu, menuButtonRef }) {
  const { pathname } = useLocation()
  const nav = useNav('header', primaryNav) // the admin panel can replace the menu
  const scrolled = useScrolledPast(24)
  const wide = useMediaQuery('(min-width: 1024px)')
  const [indicator, setIndicator] = useState(null)
  const navRef = useRef(null)
  const aRef = useRef(null)
  const botRef = useRef(null)
  const headerRef = useRef(null)
  const leaveTimer = useRef(null)


  // The nav item for the page being viewed (Services also covers /services/*). Null on Home (the bot stands on the "A" of LAX360 there, even though Home is now a menu link) and on pages outside the nav.
  const activeTo = nav.find((n) => !n.external && n.to !== '/' && (pathname === n.to || pathname.startsWith(`${n.to}/`)))?.to ?? null

  // ---- glass highlight under the current / hovered link (relative to the nav pill) ----
  const measure = useCallback((el) => {
    if (!el || !navRef.current) return null
    const n = navRef.current.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    return { x: r.left - n.left, w: r.width }
  }, [])
  const settle = useCallback(() => {
    setIndicator(measure(navRef.current?.querySelector('[aria-current="page"]')))
  }, [measure])
  useEffect(() => { settle() }, [pathname, settle])
  useEffect(() => {
    window.addEventListener('resize', settle)
    return () => { window.removeEventListener('resize', settle); clearTimeout(leaveTimer.current) }
  }, [settle])

  // ---- positions for the bot, measured from the DOM every time (nothing is hard-coded) ----
  // Where the bot settles: above the active page's link, or on the "A" of LAX360 (Home, other pages, and below lg).
  // The bot is positioned inside the header, which sits below the fixed contact bar, so viewport measurements are made relative to the header's top edge.
  const headerTop = () => headerRef.current?.getBoundingClientRect().top || 0
  const measureLink = useCallback((path) => {
    const a = navRef.current?.querySelector(`a[href="${path}"]`)
    if (!a || a.offsetParent === null) return null // nav is hidden below lg
    const range = document.createRange()
    range.selectNodeContents(a)
    const t = range.getBoundingClientRect()
    return { x: t.left + t.width / 2, y: t.top - 1 - headerTop() } // feet just above the label text
  }, [])
  const measureRest = useCallback(() => {
    const link = activeTo && measureLink(activeTo)
    if (link) return link
    const r = aRef.current?.getBoundingClientRect()
    if (!r || !r.width) return null
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.22 - headerTop() } // feet on the apex of the "A"
  }, [activeTo, measureLink])

  // Keep the bot on its spot when the layout moves without a window resize (fonts, account control, theme).
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => botRef.current?.refresh())
    ;[navRef.current, aRef.current?.parentElement].forEach((el) => el && ro.observe(el))
    return () => ro.disconnect()
  }, [])

  // Publish where the fixed header (and the contact bar above it) ends, as --header-bottom, so sticky bars and anchor scrolling can sit exactly below it.
  useEffect(() => {
    const root = document.documentElement
    const el = headerRef.current
    if (!el) return undefined
    const apply = () => root.style.setProperty('--header-bottom', `${Math.round(el.getBoundingClientRect().bottom)}px`)
    apply()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply)
    ro?.observe(el)
    const mo = new MutationObserver(apply) // the contact bar changes --topbar-offset on <html>, which moves the header
    mo.observe(root, { attributes: true, attributeFilter: ['style'] })
    window.addEventListener('resize', apply)
    return () => { ro?.disconnect(); mo.disconnect(); window.removeEventListener('resize', apply) }
  }, [])

  const canHover = () => window.matchMedia('(hover: hover)').matches
  const enter = (el, to) => {
    clearTimeout(leaveTimer.current)
    const m = measure(el)
    if (m) setIndicator(m)
    if (canHover()) botRef.current?.hover(to)
  }
  const leave = () => {
    clearTimeout(leaveTimer.current)
    leaveTimer.current = setTimeout(settle, 140)
    botRef.current?.leave()
  }

  const color = (active) => (active ? 'text-fg' : 'text-soft hover:text-fg focus-visible:text-fg')

  return (
    <header
      ref={headerRef}
      className={`a-drop fixed inset-x-0 top-[var(--topbar-offset,0px)] z-40 border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${scrolled ? 'border-edge bg-night/75 shadow-[0_10px_40px_-18px_rgb(var(--glow)/0.5)] backdrop-blur-xl' : 'border-edge/60 bg-night/40 backdrop-blur-md [[data-theme=light]_&]:bg-night/85' /* light mode: solid enough to read over the vivid hero video */}`}
      style={{ '--d': '0.1s' }}
    >
      <div className="wrap flex h-[72px] items-center justify-between gap-3 pt-2 lg:grid lg:h-[92px] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6 lg:pt-3">
        <Logo aRef={aRef} className="lg:justify-self-start" />

        <nav aria-label="Primary" className="a-fade hidden items-center lg:flex" style={{ '--d': '0.75s' }}>
          <div
            ref={navRef}
            className="relative flex items-center rounded-full border border-edge bg-glass px-1.5"
            onMouseLeave={leave}
            onBlur={(e) => !navRef.current?.contains(e.relatedTarget) && leave()}
          >
            {indicator && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-1 left-0 z-0 rounded-full bg-gradient-to-b from-tint/14 to-tint/5 ring-1 ring-edge-strong transition-[transform,width] duration-300 ease-signal"
                style={{ transform: `translateX(${indicator.x}px)`, width: indicator.w }}
              />
            )}
            {nav.map((item) => (item.external ? (
              <a key={item.to} href={item.to} target="_blank" rel="noopener noreferrer" className={`${linkCls} ${color(false)}`}>{item.label}<span className="sr-only"> (opens in a new tab)</span></a>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={(e) => enter(e.currentTarget, item.to)}
                onFocus={(e) => enter(e.currentTarget, item.to)}
                onClick={() => botRef.current?.click(item.to)}
                className={({ isActive }) => `${linkCls} ${color(isActive)}`}
              >
                {item.label}
              </NavLink>
            )))}
          </div>
        </nav>

        <div className="a-fade ml-auto flex items-center gap-2 sm:gap-3 lg:justify-self-end" style={{ '--d': '0.85s' }}>
          <ThemeToggle />
          <div className="hidden lg:block"><AccountMenu /></div>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={onOpenMenu}
            aria-label="Open menu"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-edge-strong bg-glass px-4 text-sm font-semibold lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" /> <span className="hidden min-[400px]:inline">Menu</span>
          </button>
        </div>
      </div>

      {/* the mini-bot: decorative overlay, never intercepts the pointer */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30">
        <HeaderBot ref={botRef} active={activeTo} measureRest={measureRest} measureLink={measureLink} size={wide ? 26 : 20} />
      </div>
    </header>
  )
}
