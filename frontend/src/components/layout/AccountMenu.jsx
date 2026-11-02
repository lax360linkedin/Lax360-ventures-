import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CalendarCheck, ChevronDown, LogIn, LogOut, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'

const itemCls = 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[0.9375rem] font-medium text-fg transition-colors hover:bg-tint/10 focus-visible:bg-tint/10'

/**
 * Header account control. Signed out: a "Login" button linking to /login.
 * Signed in: an avatar button that opens a menu — My Dashboard, Get a Demo, Logout (ARIA menu button pattern:
 * arrow keys / Home / End move, Esc and outside click close and return focus, Tab closes).
 */
export default function AccountMenu() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  useEffect(() => setOpen(false), [pathname, user])

  useEffect(() => {
    if (!open) return undefined
    menuRef.current?.querySelector('[role="menuitem"]')?.focus()
    const onPointer = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  // While the backend session check runs, reserve the button's space so the header does not shift.
  if (loading) return <span aria-hidden="true" className="inline-block h-11 w-[6.5rem]" />

  if (!user) {
    return (
      <Link
        to="/login"
        className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-primary px-5 text-[0.9375rem] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-[#8b4df0] hover:shadow-[0_14px_34px_-10px_rgba(168,85,247,0.9)]"
      >
        <LogIn className="size-4" aria-hidden="true" /> Login
      </Link>
    )
  }

  const close = (returnFocus = true) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }
  const onMenuKey = (e) => {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')]
    const i = items.indexOf(document.activeElement)
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') setOpen(false)
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus() }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus() }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus() }
  }
  const logout = () => {
    setOpen(false)
    navigate('/') // leave any protected page first, then end the session on the server
    void signOut()
  }

  return (
    <div ref={wrapRef} className="relative z-40">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) } }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${user.full_name}`}
        className="group inline-flex min-h-11 items-center gap-1.5 rounded-full border border-edge-strong bg-glass py-1 pl-1 pr-3 transition-[background-color,border-color] duration-200 hover:border-lav hover:bg-glass-strong"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-base font-bold text-white" aria-hidden="true">
          {user.full_name[0]?.toUpperCase()}
        </span>
        <ChevronDown className={`size-4 text-soft transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full mt-3 w-64 rounded-2xl border border-edge-strong bg-night/95 p-2 shadow-[0_24px_60px_-20px_rgba(124,58,237,0.6)] backdrop-blur-xl"
        >
          <div className="border-b border-edge px-3 pb-2 pt-1">
            <p className="truncate font-semibold text-fg">{user.full_name}</p>
            <p className="truncate text-sm text-soft">{user.email}</p>
          </div>
          <div className="pt-2">
            <Link role="menuitem" to="/user/dashboard" className={itemCls}><UserRound className="size-5 text-lav" aria-hidden="true" /> My Dashboard</Link>
            <Link role="menuitem" to="/demo" className={itemCls}><CalendarCheck className="size-5 text-lav" aria-hidden="true" /> Get a Demo</Link>
            <button role="menuitem" type="button" onClick={logout} className={itemCls}><LogOut className="size-5 text-lav" aria-hidden="true" /> Logout</button>
          </div>
        </div>
      )}
    </div>
  )
}
