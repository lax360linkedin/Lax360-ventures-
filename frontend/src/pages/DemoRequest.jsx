import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, MessageCircle } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import FormField from '../components/ui/FormField.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useBranches } from '../hooks/useBranches.js'
import { createDemoRequest, fetchMyDemoRequests } from '../services/branchService.js'
import { EMAIL } from '../utils/validators.js'
import { whatsappLink } from '../utils/whatsapp.js'

const interests = ['Custom software, CRM or ERP', 'Websites and mobile apps', 'AI assistants and automation', 'Digital marketing', 'CAD and engineering', 'Academy training', 'Not sure yet']
const STATUS_TEXT = { pending: 'Pending — the team will follow up', contacted: 'Contacted', confirmed: 'Confirmed', cancelled: 'Cancelled' }
// Backend field names → this form's field ids.
const FIELD_MAP = { preferred_date: 'date', branch_id: 'branch' }

// Local calendar date as YYYY-MM-DD (toISOString would shift it by the time zone).
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function validate(v) {
  const errors = {}
  if (v.name.trim().length < 2) errors.name = 'Enter your name.'
  if (!v.email.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL.test(v.email.trim())) errors.email = 'Enter a valid email address, like name@example.com.'
  if (!v.company.trim()) errors.company = 'Enter your company or organisation name.'
  if (!v.date) errors.date = 'Choose a preferred date.'
  else if (v.date < today()) errors.date = 'Choose today or a future date.'
  if (v.message.length > 1000) errors.message = 'Please keep your message under 1,000 characters.'
  return errors
}

/**
 * Demo request (signed-in users only; reached from the profile menu) → POST /api/demo-requests.
 * A saved request is "pending": nothing is booked or confirmed until the team follows up.
 */
export default function DemoRequest() {
  const { user } = useAuth()
  const branches = useBranches()
  const [values, setValues] = useState({ name: user?.full_name || '', email: user?.email || '', company: '', date: '', interest: '', branch: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [serverError, setServerError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [mine, setMine] = useState({ state: 'loading', items: [] }) // loading | ready | error
  const formRef = useRef(null)
  const resultRef = useRef(null)

  const loadMine = useCallback(() => {
    fetchMyDemoRequests().then((items) => setMine({ state: 'ready', items })).catch(() => setMine({ state: 'error', items: [] }))
  }, [])
  useEffect(() => { loadMine() }, [loadMine])

  useEffect(() => {
    if (attempt) formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [attempt])
  useEffect(() => {
    if (status === 'success') resultRef.current?.focus()
  }, [status])

  const set = (id) => (e) => {
    setValues((v) => ({ ...v, [id]: e.target.value }))
    if (errors[id]) setErrors((er) => ({ ...er, [id]: undefined }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return // duplicate-submission protection
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) {
      setAttempt((a) => a + 1)
      return
    }
    setStatus('submitting')
    setServerError('')
    try {
      await createDemoRequest({
        name: values.name.trim(),
        email: values.email.trim(),
        company: values.company.trim(),
        preferred_date: values.date,
        interest: values.interest || null,
        branch_id: values.branch || null,
        message: values.message.trim() || null,
      })
      setStatus('success')
      loadMine()
    } catch (err) {
      if (err.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, msg]) => [FIELD_MAP[k] || k, msg])))
        setAttempt((a) => a + 1)
      }
      setServerError(err.fields ? '' : err.message)
      setStatus('error')
    }
  }

  return (
    <PageContainer path="/demo" title="Get a Demo" description="Request a demo of the LAX360 Ventures software, AI and digital services." noindex>
      <div className="wrap section flex flex-col items-center gap-8">
        <div className="glass w-full max-w-2xl p-6 md:p-8">
          <h1 className="h2">Get a demo</h1>
          <p className="mt-3 text-soft">Tell us who you are and when suits you. The team uses this to plan a walkthrough of the services you care about.</p>

          {status === 'success' ? (
            <div ref={resultRef} tabIndex={-1} role="status" className="mt-6 rounded-xl border border-edge bg-glass p-6 text-fg">
              <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
              <h2 className="h3 mt-3">Request received</h2>
              <p className="mt-3 text-soft">
                Thanks, {values.name.trim()}. Your request is saved as <strong className="text-fg">pending</strong>. <strong className="text-fg">No date is booked yet</strong> — a member of the team will contact you to confirm. We don&apos;t send a confirmation email.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href={whatsappLink(`Hi LAX360 Ventures, I have requested a demo${values.date ? ` around ${values.date}` : ''}.`)}>
                  <MessageCircle className="size-5" aria-hidden="true" /> Message us on WhatsApp
                </Button>
                <Button variant="secondary" onClick={() => { setValues((v) => ({ ...v, company: '', date: '', interest: '', branch: '', message: '' })); setStatus('idle') }}>Make another request</Button>
              </div>
            </div>
          ) : (
            <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={status === 'submitting'} className="mt-6 grid gap-5 sm:grid-cols-2">
              {serverError && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border-2 border-error bg-glass p-3 text-sm font-medium text-error sm:col-span-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {serverError}
                </p>
              )}
              <FormField id="demo-name" label="Name" required autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} />
              <FormField id="demo-email" label="Email" type="email" required autoComplete="email" inputMode="email" value={values.email} onChange={set('email')} error={errors.email} />
              <FormField id="demo-company" label="Company name" required autoComplete="organization" value={values.company} onChange={set('company')} error={errors.company} />
              <FormField id="demo-date" label="Preferred date" type="date" required min={today()} value={values.date} onChange={set('date')} error={errors.date} />
              <FormField id="demo-interest" label="Area of interest" as="select" value={values.interest} onChange={set('interest')}>
                <option value="">Select an area</option>
                {interests.map((i) => <option key={i} value={i}>{i}</option>)}
              </FormField>
              <FormField id="demo-branch" label="Preferred branch" as="select" value={values.branch} onChange={set('branch')} error={errors.branch}>
                <option value="">No preference</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.city}</option>)}
              </FormField>
              <FormField id="demo-message" label="Message" as="textarea" value={values.message} onChange={set('message')} error={errors.message} hint="Anything the team should know before the demo." className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <Button type="submit" loading={status === 'submitting'} arrow>{status === 'submitting' ? 'Sending…' : 'Request demo'}</Button>
              </div>
            </form>
          )}
        </div>

        <section className="glass w-full max-w-2xl p-6 md:p-8" aria-labelledby="my-demos">
          <h2 id="my-demos" className="h3">Your requests</h2>
          {mine.state === 'loading' && <p className="mt-3 text-soft" role="status">Loading…</p>}
          {mine.state === 'error' && <p className="mt-3 text-soft">We couldn&apos;t load your earlier requests right now.</p>}
          {mine.state === 'ready' && mine.items.length === 0 && <p className="mt-3 text-soft">You haven&apos;t requested a demo yet.</p>}
          {mine.items.length > 0 && (
            <ul className="mt-4 divide-y divide-edge">
              {mine.items.map((r) => (
                <li key={r.id} className="py-3">
                  <p className="font-semibold">{r.company || r.name}{r.branch_city ? ` · ${r.branch_city}` : ''}</p>
                  <p className="text-sm text-soft">
                    {r.preferred_date ? `Preferred ${r.preferred_date} · ` : ''}Requested {new Date(r.created_at).toLocaleDateString()} · <span className="font-medium text-fg">{STATUS_TEXT[r.status] || r.status}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  )
}
