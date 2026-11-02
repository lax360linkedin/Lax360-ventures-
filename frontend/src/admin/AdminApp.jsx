import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Bot, CalendarCheck, ExternalLink, Eye, EyeOff, FileText, Film, Image as ImageIcon, Inbox, LayoutDashboard, LogIn, LogOut, Menu, ScrollText, Settings as SettingsIcon, ShieldCheck, Users, X } from 'lucide-react'
import ThemeToggle from '../components/ui/ThemeToggle.jsx'
import { useAdminAuth } from '../hooks/useAdminAuth.js'
import { useDocumentHead } from '../hooks/useDocumentHead.js'
import { api } from '../services/apiClient.js'
import { Badge, Btn, Card, ErrorState, Field, Input, Spinner, ToastProvider, cx, useFetch } from './ui.jsx'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Enquiries = lazy(() => import('./pages/Enquiries.jsx'))
const Demos = lazy(() => import('./pages/Demos.jsx'))
const Content = lazy(() => import('./pages/Content.jsx'))
const Chatbot = lazy(() => import('./pages/Chatbot.jsx'))
const Media = lazy(() => import('./pages/Media.jsx'))
const HeroVideos = lazy(() => import('./pages/HeroVideos.jsx'))
const SiteSettings = lazy(() => import('./pages/SiteSettings.jsx'))
const Staff = lazy(() => import('./pages/Staff.jsx'))
const Audit = lazy(() => import('./pages/Audit.jsx'))
const System = lazy(() => import('./pages/System.jsx'))

const NAV = [
  { to: '/company-admin/dashboard', end: true, label: 'Dashboard', icon: LayoutDashboard, module: null },
  { to: '/company-admin/enquiries', label: 'Enquiries', icon: Inbox, module: 'enquiries' },
  { to: '/company-admin/demos', label: 'Demo requests', icon: CalendarCheck, module: 'demo_requests' },
  { to: '/company-admin/content', label: 'Website content', icon: FileText, module: 'content' },
  { to: '/company-admin/chatbot', label: 'AI chatbot', icon: Bot, module: 'chatbot' },
  { to: '/company-admin/media', label: 'Media', icon: ImageIcon, module: 'media' },
  { to: '/company-admin/homepage-videos', label: 'Homepage videos', icon: Film, module: 'hero_videos' },
  { to: '/company-admin/settings', label: 'Settings', icon: SettingsIcon, module: 'settings' },
  { to: '/company-admin/users', label: 'Administrators', icon: Users, module: 'users' },
  { to: '/company-admin/audit', label: 'Audit log', icon: ScrollText, module: 'audit' },
  { to: '/company-admin/system', label: 'System status', icon: Activity, module: 'system' },
]

const AdminCtx = createContext(null)
export const useAdmin = () => useContext(AdminCtx)

/** Loads what the signed-in staff member may use (from the server). The UI hides what is not allowed; the API enforces it. */
function AdminShell() {
  const { identity, loading, signOut } = useAdminAuth() // the company-admin session only: a customer's website login never appears here
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [location.pathname])

  if (loading) return <div className="grid min-h-dvh place-items-center bg-night"><Spinner label="Checking your session…" /></div>
  if (!identity) return <Navigate to="/company-admin/login" replace state={{ from: location.pathname }} />

  const { permissions, user: profile } = identity
  const can = (module) => module === null || permissions.includes(module)
  const logout = async () => { await signOut(); navigate('/company-admin/login', { replace: true }) }

  return (
    <AdminCtx.Provider value={{ me: identity, can }}>
      <div className="min-h-dvh bg-night text-fg lg:grid lg:grid-cols-[17rem_1fr]">
        <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
        {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
        <aside className={cx('fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-edge bg-night transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-auto lg:max-w-none lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
          <div className="flex h-16 items-center justify-between gap-2 px-5">
            <Link to="/company-admin/dashboard" className="flex items-center gap-2 font-display text-lg font-bold">
              <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-white"><ShieldCheck className="size-4" aria-hidden="true" /></span>
              LAX360 <span className="text-lav">Admin</span>
            </Link>
            <button type="button" className="rounded-lg p-1.5 text-soft hover:bg-glass-strong lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X className="size-5" aria-hidden="true" /></button>
          </div>
          <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            {NAV.filter((n) => can(n.module)).map(({ to, end, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors', isActive ? 'bg-primary/25 text-fg ring-1 ring-edge-strong' : 'text-soft hover:bg-glass-strong hover:text-fg')}>
                <Icon className="size-[1.1rem] shrink-0" aria-hidden="true" /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-edge p-3">
            <div className="mb-2 px-2"><p className="truncate text-sm font-semibold">{profile.full_name}</p><p className="truncate text-xs text-soft">{profile.email}</p><div className="mt-1"><Badge value={profile.role} /></div></div>
            <Btn kind="ghost" className="w-full justify-start" onClick={logout}><LogOut className="size-4" aria-hidden="true" /> Log out</Btn>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-edge bg-night/85 px-4 backdrop-blur-xl md:px-8">
            <button type="button" className="rounded-lg p-2 text-soft hover:bg-glass-strong lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu className="size-5" aria-hidden="true" /></button>
            <span className="hidden text-sm text-soft lg:block">Signed in as <strong className="text-fg">{profile.full_name}</strong></span>
            <div className="flex items-center gap-2">
              <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-soft hover:bg-glass-strong hover:text-fg">View website <ExternalLink className="size-3.5" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
              <ThemeToggle />
            </div>
          </header>
          <main id="admin-main" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 outline-none md:px-8 md:py-8">
            <Suspense fallback={<Spinner />}><Outlet /></Suspense>
          </main>
        </div>
      </div>
    </AdminCtx.Provider>
  )
}

/** Hides a page from people without its module (the server also refuses their API calls). */
function Guard({ module, children }) {
  const { can } = useAdmin()
  if (!can(module)) return <Card className="mx-auto max-w-md text-center"><h1 className="font-display text-xl font-semibold">Not allowed</h1><p className="mt-2 text-sm text-soft">You do not have permission to use this section. A super admin can grant it.</p></Card>
  return children
}

function AdminLogin() {
  const { user, loading, notice, signIn } = useAdminAuth()
  const location = useLocation()
  const [values, setValues] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [state, setState] = useState({ busy: false, error: '', fields: {} })
  if (!loading && user) return <Navigate to={typeof location.state?.from === 'string' && location.state.from.startsWith('/company-admin') ? location.state.from : '/company-admin/dashboard'} replace />

  const submit = async (e) => {
    e.preventDefault()
    if (state.busy) return
    const fields = {}
    if (!values.email.trim()) fields.email = 'Enter your email or username.'
    if (!values.password) fields.password = 'Enter your password.'
    if (Object.keys(fields).length) return setState({ busy: false, error: '', fields })
    setState({ busy: true, error: '', fields: {} })
    const r = await signIn({ email: values.email.trim(), password: values.password })
    if (!r.ok) setState({ busy: false, error: r.fields ? '' : r.error, fields: r.fields || {} })
    // On success the admin session store updates and this page redirects to the dashboard (see the guard above).
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-night px-4 py-10 text-fg">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg"><ShieldCheck className="size-6" aria-hidden="true" /></span>
          <h1 className="mt-4 font-display text-2xl font-semibold">Company Admin Login</h1>
          <p className="mt-1 text-sm text-soft">For authorised LAX360 administrators only.</p>
        </div>
        <Card>
          {notice === 'expired' && <p role="status" className="mb-4 rounded-lg border border-edge bg-glass-strong p-3 text-sm">Your session expired. Please sign in again.</p>}
          {notice === 'lost' && <p role="status" className="mb-4 rounded-lg border border-edge bg-glass-strong p-3 text-sm">The server no longer recognises your admin session (it may have ended or been signed out elsewhere). Please sign in again.</p>}
          <form onSubmit={submit} noValidate className="space-y-4" aria-busy={state.busy}>
            {state.error && <p role="alert" className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm font-medium text-error">{state.error}</p>}
            <Field label="Email or username" required error={state.fields.email}>{(p) => <Input {...p} type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="admin@example.com" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />}</Field>
            <Field label="Password" required error={state.fields.password}>
              {(p) => (
                <div className="relative">
                  <Input {...p} type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className="pr-11" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
                  <button type="button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-soft hover:text-fg">{show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</button>
                </div>
              )}
            </Field>
            <Btn kind="primary" type="submit" className="w-full" loading={state.busy}><LogIn className="size-4" aria-hidden="true" /> Sign in</Btn>
          </form>
          <p className="mt-4 text-xs text-soft">Administrator accounts are created by a super admin (the first one from the server settings). Forgot your password? Ask a super admin to reset it. Website customers sign in at the <Link to="/login" className="underline">website login</Link> instead.</p>
        </Card>
        <p className="mt-4 text-center text-sm"><Link to="/" className="text-soft hover:text-fg">← Back to the website</Link></p>
      </div>
    </div>
  )
}

export default function AdminApp() {
  useDocumentHead({ title: 'Company Admin', description: 'LAX360 Ventures administration.', path: '/company-admin', noindex: true })
  return (
    <ToastProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<AdminShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="enquiries" element={<Guard module="enquiries"><Enquiries /></Guard>} />
          <Route path="demos" element={<Guard module="demo_requests"><Demos /></Guard>} />
          <Route path="content" element={<Guard module="content"><Content /></Guard>} />
          <Route path="chatbot" element={<Guard module="chatbot"><Chatbot /></Guard>} />
          <Route path="media" element={<Guard module="media"><Media /></Guard>} />
          <Route path="homepage-videos" element={<Guard module="hero_videos"><HeroVideos /></Guard>} />
          <Route path="hero-videos" element={<Navigate to="/company-admin/homepage-videos" replace />} />
          <Route path="settings" element={<Guard module="settings"><SiteSettings /></Guard>} />
          <Route path="users" element={<Guard module="users"><Staff /></Guard>} />
          <Route path="audit" element={<Guard module="audit"><Audit /></Guard>} />
          <Route path="system" element={<Guard module="system"><System /></Guard>} />
          <Route path="*" element={<Navigate to="/company-admin/dashboard" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
