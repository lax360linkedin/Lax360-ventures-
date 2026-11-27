import { Link } from 'react-router-dom'
import { CalendarCheck, LogIn } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'

/**
 * Header account control. Signed out: a "Login" button linking to /login.
 * Signed in: a "User Profile" button (the user's dashboard) with a "Get Demo" button right next to it. Logging out is on the profile page and in the mobile menu.
 */
export default function AccountMenu() {
  const { user, loading } = useAuth()
  // While the backend session check runs, reserve the button's space so the header does not shift.
  if (loading) return <span aria-hidden="true" className="inline-block h-11 w-[6.5rem]" />

  if (!user) {
    return (
      <Link
        to="/login"
        aria-label="Login"
        className="hdr-login group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-primary px-5 text-[0.9375rem] font-semibold text-white shadow-[0_8px_24px_-10px_rgb(var(--glow)/0.9)] transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-[var(--btn-hover)] hover:shadow-[0_14px_34px_-10px_rgb(var(--glow2)/0.9)]"
      >
        <LogIn className="size-4" aria-hidden="true" /> <span className="hdr-label">Login</span>
      </Link>
    )
  }

  // The centred menu leaves little room beside it: User Profile is the user's round initial (named for screen readers and as a tooltip) and Get Demo is a round icon that gains its words from 2xl.
  const pill = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[0.9375rem] font-semibold transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-0.5'
  return (
    <div className="flex items-center gap-2">
      <Link to="/user/dashboard" aria-label={`User Profile: ${user.full_name}`} title="User Profile"
        className={`${pill} size-11 border border-edge-strong bg-glass text-fg hover:border-lav hover:bg-glass-strong`}>
        <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-base font-bold text-white" aria-hidden="true">{user.full_name[0]?.toUpperCase()}</span>
      </Link>
      <Link to="/demo" aria-label="Get Demo" title="Get Demo"
        className={`${pill} size-11 border border-white/10 bg-primary text-white shadow-[0_8px_24px_-10px_rgb(var(--glow)/0.9)] hover:shadow-[0_12px_28px_-10px_rgb(var(--glow)/1)] 2xl:size-auto 2xl:min-h-11 2xl:px-4`}>
        <CalendarCheck className="size-5 2xl:size-4" aria-hidden="true" /><span className="hidden 2xl:inline">Get Demo</span>
      </Link>
    </div>
  )
}
