import LanguageSwitcher from './LanguageSwitcher.jsx'
import { useEffect, useRef, useState } from 'react'
import { usePartnerMenu } from '../../services/partnershipService.js'
import { useUpcoming } from '../../hooks/useUpcoming.js'
import { PROGRAM_BY_SLUG } from '../../data/upcomingServices.js'
import { StatusBadge } from '../upcoming/UpcomingUI.jsx'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { CalendarCheck, ChevronDown, Gamepad2, Handshake, LogIn, LogOut, MessageCircle, Phone, UserRound, X } from 'lucide-react'
import Logo from './Logo.jsx'
import Button from '../ui/Button.jsx'
import ThemeToggle from '../ui/ThemeToggle.jsx'
import { primaryNav } from '../../data/navigation.js'
import { useNav, useSite } from '../../hooks/useSite.js'
import { whatsappLink } from '../../utils/whatsapp.js'
import { useAuth } from '../../hooks/useAuth.js'

const acct = 'flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium text-fg transition-colors hover:bg-tint/10'
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Frosted full-screen sheet for < 1024px: staggered items, focus trapped, Esc closes, body scroll locked. */
export default function MobileMenu({ open, onClose, returnFocusRef }) {
  const site = useSite()
  const nav = useNav('header', primaryNav).filter((n) => n.to !== '/partner-with-us')
  const { categories, refresh } = usePartnerMenu()
  const upcoming = useUpcoming()
  const [pOpen, setPOpen] = useState(false)
  const [pCat, setPCat] = useState(null)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, loading, signOut } = useAuth()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    const ret = returnFocusRef?.current
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
      ret?.focus()
    }
  }, [open, onClose, returnFocusRef])

  const item = (i) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: 0.08 + i * 0.05, ease: [0.2, 0.8, 0.2, 1] },
  })
  const link = (to) => `flex min-h-14 items-center justify-between py-3 transition-colors ${pathname === to || pathname.startsWith(`${to}/`) ? 'text-lav' : 'text-fg'}`

  return (
    <AnimatePresence>
      {open && (
        <m.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-night/90 backdrop-blur-2xl lg:hidden"
        >
          <div className="wrap flex h-[72px] shrink-0 items-center justify-between pt-2">
            <Logo />
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close menu" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-edge-strong bg-glass px-4 text-sm font-semibold">
              <X className="size-5" aria-hidden="true" /> Close
            </button>
          </div>

          <nav aria-label="Mobile" className="wrap flex-1 py-4">
            <ul className="divide-y divide-edge border-y border-edge font-display text-3xl font-semibold">
              {nav.map((n, i) => (
                <m.li key={n.to} {...item(i)}>{n.external ? <a href={n.to} target="_blank" rel="noopener noreferrer" onClick={onClose} className={link(n.to)}>{n.label}</a> : <Link to={n.to} onClick={onClose} className={link(n.to)}>{n.label}</Link>}</m.li>
              ))}
            </ul>
          </nav>

          <div className="wrap grid gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
            <ThemeToggle showLabel className="w-full" />
            {/* Partner With Us: touch-friendly expandable list (programs, then their business divisions) */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-primary text-white shadow-[0_8px_24px_-10px_rgb(var(--glow)/0.9)]">
              <div className="flex items-stretch">
                <Link to="/partner-with-us" onClick={onClose} className="flex min-h-12 flex-1 items-center gap-3 px-4 font-semibold"><Handshake className="size-5" aria-hidden="true" /> Partner With Us</Link>
                <button type="button" aria-expanded={pOpen} aria-controls="m-partner" aria-label={pOpen ? 'Collapse Partner With Us' : 'Expand Partner With Us'} onClick={() => { setPOpen((o) => { if (!o) refresh(); return !o }); setPCat(null) }} className="grid min-h-12 w-14 place-items-center border-l border-white/25">
                  <ChevronDown className={`size-5 transition-transform duration-200 ${pOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </div>
              <div id="m-partner" hidden={!pOpen} className="bg-night/95 p-2 text-fg">
                {categories.map((c) => (
                  <div key={c.slug}>
                    <div className="flex items-stretch">
                      <Link to={c.path} onClick={onClose} className="flex min-h-12 flex-1 items-center rounded-xl px-3 font-semibold">{c.label}</Link>
                      <button type="button" aria-expanded={pCat === c.slug} aria-label={`${c.label}: show business divisions`} onClick={() => setPCat(pCat === c.slug ? null : c.slug)} className="grid min-h-12 w-12 place-items-center text-soft"><ChevronDown className={`size-4 transition-transform duration-200 ${pCat === c.slug ? 'rotate-180' : ''}`} aria-hidden="true" /></button>
                    </div>
                    <ul hidden={pCat !== c.slug} className="mb-1 ml-3 border-l border-edge pl-2">
                      {c.items.map((d) => <li key={d.slug}><Link to={d.path} onClick={onClose} className="flex min-h-12 items-center rounded-xl px-3 text-fg/90 hover:bg-glass">{d.label}</Link></li>)}
                      {upcoming.filter((u) => u.partners[PROGRAM_BY_SLUG[c.slug]]).map((u) => <li key={u.slug}><Link to={u.path} onClick={onClose} className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-xl px-3 text-fg/90 hover:bg-glass">{u.short}<StatusBadge status={u.status} /></Link></li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            {loading ? null : user ? (
              <div className="rounded-2xl border border-edge bg-glass p-2">
                <p className="truncate px-3 pt-1 font-semibold text-fg">{user.full_name}</p>
                <p className="truncate px-3 pb-2 text-sm text-soft">{user.email}</p>
                <Link to="/user/dashboard" onClick={onClose} className={acct}><UserRound className="size-5 text-lav" aria-hidden="true" /> User Profile</Link>
                <Link to="/demo" onClick={onClose} className={acct}><CalendarCheck className="size-5 text-lav" aria-hidden="true" /> Get Demo</Link>
                <button type="button" onClick={() => { onClose(); navigate('/'); void signOut() }} className={`${acct} w-full text-left`}><LogOut className="size-5 text-lav" aria-hidden="true" /> Logout</button>
              </div>
            ) : (
              <Button to="/login" onClick={onClose}><LogIn className="size-5" aria-hidden="true" /> Login</Button>
            )}
            <Button variant="secondary" to="/play-zone" onClick={onClose}><Gamepad2 className="size-5" aria-hidden="true" /> Play Zone</Button>
            <LanguageSwitcher variant="list" />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" href={whatsappLink()}><MessageCircle className="size-5" aria-hidden="true" /> WhatsApp</Button>
              <Button variant="secondary" href={`tel:${site.phones[0].tel}`}><Phone className="size-5" aria-hidden="true" /> Call</Button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
