import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { CalendarCheck, LogIn, LogOut, MessageCircle, Phone, UserRound, X } from 'lucide-react'
import Logo from './Logo.jsx'
import Button from '../ui/Button.jsx'
import ThemeToggle from '../ui/ThemeToggle.jsx'
import { primaryNav } from '../../data/navigation.js'
import { useSite } from '../../hooks/useSite.js'
import { whatsappLink } from '../../utils/whatsapp.js'
import { useAuth } from '../../hooks/useAuth.js'

const acct = 'flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium text-fg transition-colors hover:bg-tint/10'
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Frosted full-screen sheet for < 1024px: staggered items, focus trapped, Esc closes, body scroll locked. */
export default function MobileMenu({ open, onClose, returnFocusRef }) {
  const site = useSite()
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
              {primaryNav.map((n, i) => (
                <m.li key={n.to} {...item(i)}><Link to={n.to} onClick={onClose} className={link(n.to)}>{n.label}</Link></m.li>
              ))}
            </ul>
          </nav>

          <div className="wrap grid gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
            <ThemeToggle showLabel className="w-full" />
            {loading ? null : user ? (
              <div className="rounded-2xl border border-edge bg-glass p-2">
                <p className="truncate px-3 pt-1 font-semibold text-fg">{user.full_name}</p>
                <p className="truncate px-3 pb-2 text-sm text-soft">{user.email}</p>
                <Link to="/user/dashboard" onClick={onClose} className={acct}><UserRound className="size-5 text-lav" aria-hidden="true" /> My Dashboard</Link>
                <Link to="/demo" onClick={onClose} className={acct}><CalendarCheck className="size-5 text-lav" aria-hidden="true" /> Get a Demo</Link>
                <button type="button" onClick={() => { onClose(); navigate('/'); void signOut() }} className={`${acct} w-full text-left`}><LogOut className="size-5 text-lav" aria-hidden="true" /> Logout</button>
              </div>
            ) : (
              <Button to="/login" onClick={onClose}><LogIn className="size-5" aria-hidden="true" /> Login</Button>
            )}
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
