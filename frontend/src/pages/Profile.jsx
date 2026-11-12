import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CalendarCheck, CheckCircle2, LogOut } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import FormField from '../components/ui/FormField.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { changePassword, myDemoRequests, myEnquiries, myProfile, saveMyProfile } from '../services/authService.js'
import DetailsSections from '../components/auth/DetailsSections.jsx'
import { detailsFromServer, detailsPayload, emptyDetails, validateDetails } from '../data/registration.js'

const STATUS = { new: 'Received', in_progress: 'In progress', contacted: 'We have contacted you', converted: 'Completed', closed: 'Closed', pending: 'Received', confirmed: 'Confirmed', cancelled: 'Cancelled' }
const day = (iso) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })

/** The signed-in customer's own requests (matched by account on the server) and a password change. Customers have no access to anything administrative. */
function MyRequests() {
  const [data, setData] = useState({ enquiries: null, demos: null })
  useEffect(() => {
    let live = true
    Promise.all([myEnquiries().catch(() => []), myDemoRequests().catch(() => [])]).then(([enquiries, demos]) => { if (live) setData({ enquiries, demos }) })
    return () => { live = false }
  }, [])
  const rows = [...(data.enquiries || []).map((e) => ({ id: `e${e.id}`, title: e.subject, status: e.status, at: e.created_at, kind: 'Enquiry' })), ...(data.demos || []).map((d) => ({ id: `d${d.id}`, title: d.interest || 'Product demo', status: d.status, at: d.created_at, kind: 'Demo request' }))]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
  return (
    <section aria-labelledby="my-requests" className="mt-6 border-t border-edge pt-6">
      <h2 id="my-requests" className="h4">My requests</h2>
      {data.enquiries === null ? <p className="mt-2 text-soft" role="status">Loading…</p>
        : rows.length === 0 ? <p className="mt-2 text-soft">You have not sent a request yet. <Link to="/contact" className="font-semibold text-fg underline">Send an enquiry</Link> or <Link to="/demo" className="font-semibold text-fg underline">request a demo</Link> and track it here.</p>
          : <ul className="mt-3 space-y-2">{rows.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-edge bg-glass px-4 py-3 text-sm"><span><strong>{r.title}</strong> <span className="text-soft">· {r.kind} · {day(r.at)}</span></span><span className="rounded-full border border-edge-strong px-3 py-0.5 text-xs font-semibold">{STATUS[r.status] || r.status}</span></li>)}</ul>}
    </section>
  )
}

/** The details given at sign-up: editable here (and a chance for accounts created before they were collected to complete them). Only the owner can read or change them. */
function MyDetails() {
  const [values, setValues] = useState(null)
  const [errors, setErrors] = useState({})
  const [state, setState] = useState({ status: 'idle', error: '' })
  useEffect(() => { let live = true; myProfile().then((d) => { if (live) setValues(detailsFromServer(d)) }).catch(() => { if (live) setValues(emptyDetails()) }); return () => { live = false } }, [])
  if (!values) return null
  const change = (patch) => { setValues((v) => ({ ...v, ...patch })); setErrors((er) => { const n = { ...er }; Object.keys(patch).forEach((k) => delete n[k]); return n }); setState({ status: 'idle', error: '' }) }
  const submit = async (e) => {
    e.preventDefault()
    const found = validateDetails(values)
    setErrors(found)
    if (Object.keys(found).length) return
    setState({ status: 'saving', error: '' })
    try { await saveMyProfile(detailsPayload(values)); setState({ status: 'saved', error: '' }) } catch (err) { setErrors(err.fields || {}); setState({ status: 'error', error: err.fields ? 'Please check the highlighted fields.' : err.message }) }
  }
  return (
    <form onSubmit={submit} noValidate className="mt-6 space-y-6 border-t border-edge pt-6" aria-labelledby="details-title">
      <div><h2 id="details-title" className="h4">My details</h2><p className="mt-1 text-sm text-soft">Only you and authorised LAX360 staff can see these. Keep them up to date so we can give you relevant information.</p></div>
      <FormField id="my-mobile" label="Mobile number" type="tel" required autoComplete="tel" value={values.mobile} onChange={(e) => change({ mobile: e.target.value })} error={errors.mobile} />
      <DetailsSections values={values} errors={errors} onChange={change} idPrefix="my" />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" loading={state.status === 'saving'}>Save my details</Button>
        {state.status === 'saved' && <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-success"><CheckCircle2 className="size-4" aria-hidden="true" /> Saved.</p>}
        {state.status === 'error' && <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-error"><AlertCircle className="size-4" aria-hidden="true" /> {state.error}</p>}
      </div>
    </form>
  )
}

function PasswordChange() {
  const [v, setV] = useState({ current: '', next: '' })
  const [state, setState] = useState({ status: 'idle', error: '' })
  const submit = async (e) => {
    e.preventDefault()
    if (v.next.length < 8) { setState({ status: 'error', error: 'Use at least 8 characters for the new password.' }); return }
    setState({ status: 'saving', error: '' })
    try { await changePassword(v.current, v.next); setV({ current: '', next: '' }); setState({ status: 'saved', error: '' }) } catch (err) { setState({ status: 'error', error: err.fields?.current_password || err.fields?.new_password || err.message }) }
  }
  return (
    <form onSubmit={submit} noValidate className="mt-6 space-y-4 border-t border-edge pt-6" aria-labelledby="pw-title">
      <h2 id="pw-title" className="h4">Change password</h2>
      <FormField id="pw-current" label="Current password" type="password" autoComplete="current-password" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} />
      <FormField id="pw-new" label="New password" type="password" autoComplete="new-password" value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} error={state.status === 'error' ? state.error : undefined} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" loading={state.status === 'saving'}>Change password</Button>
        {state.status === 'saved' && <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-success"><CheckCircle2 className="size-4" aria-hidden="true" /> Password changed. Your other devices were signed out.</p>}
      </div>
    </form>
  )
}

export default function Profile() {
  const { user, signOut, updateName } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.full_name || '')
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const [error, setError] = useState('')

  const logout = () => { navigate('/'); void signOut() }
  const save = async (e) => {
    e.preventDefault()
    if (status === 'saving') return
    if (name.trim().length < 2) { setError('Enter your name (at least 2 characters).'); setStatus('error'); return }
    setStatus('saving')
    setError('')
    try {
      await updateName(name.trim())
      setStatus('saved')
    } catch (err) {
      setError(err.fields?.full_name || err.message)
      setStatus('error')
    }
  }

  return (
    <PageContainer path="/user/dashboard" title="My Dashboard" description="Your LAX360 Pvt Ltd account." noindex>
      <div className="wrap section flex justify-center">
        <div className="glass w-full max-w-2xl p-6 md:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-2xl font-bold text-white" aria-hidden="true">
              {user?.full_name?.[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="h3 break-words">{user?.full_name}</h1>
              <p className="break-all text-soft">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={save} noValidate aria-busy={status === 'saving'} className="mt-6 space-y-4">
            <FormField id="profile-name" label="Full name" required autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setStatus('idle') }} error={status === 'error' ? error : undefined} hint="Your email address can't be changed here." />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="secondary" loading={status === 'saving'}>{status === 'saving' ? 'Saving…' : 'Save changes'}</Button>
              {status === 'saved' && <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-success"><CheckCircle2 className="size-4" aria-hidden="true" /> Saved</p>}
              {status === 'error' && !error.includes('name') && <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-error"><AlertCircle className="size-4" aria-hidden="true" /> {error}</p>}
            </div>
          </form>

          <MyRequests />
          <MyDetails />
          <PasswordChange />

          <div className="mt-6 flex flex-wrap gap-3 border-t border-edge pt-6">
            <Button to="/demo" arrow><CalendarCheck className="size-5" aria-hidden="true" /> Get a Demo</Button>
            <Button variant="secondary" onClick={logout}><LogOut className="size-5" aria-hidden="true" /> Logout</Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
