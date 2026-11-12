import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import FormField from '../components/ui/FormField.jsx'
import Button from '../components/ui/Button.jsx'
import MiniBot from '../components/art/MiniBot.jsx'
import DetailsSections from '../components/auth/DetailsSections.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { EMAIL } from '../utils/validators.js'
import { detailsPayload, emptyDetails, validateDetails } from '../data/registration.js'

const MIN_PASSWORD = 8

function validate(v) {
  const errors = {}
  if (v.full_name.trim().length < 2) errors.full_name = 'Enter your name (at least 2 characters).'
  if (!v.email.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL.test(v.email.trim())) errors.email = 'Enter a valid email address, like name@example.com.'
  if (v.password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`
  if (v.confirm !== v.password) errors.confirm = 'The two passwords do not match.'
  return { ...errors, ...validateDetails(v) }
}

/**
 * Public sign-up → POST /api/auth/register. Three short sections: your account, about you (the fields depend on the category you pick), and why you are visiting.
 * Always creates a website customer; nothing here can create an administrator. After signing up the customer is on the public website, signed in.
 */
export default function Register() {
  const { user, signUp } = useAuth()
  const location = useLocation()
  const from = typeof location.state?.from === 'string' ? location.state.from : '/'
  const [values, setValues] = useState({ full_name: '', email: '', password: '', confirm: '', ...emptyDetails() })
  const [errors, setErrors] = useState({})
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | error
  const [serverError, setServerError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const formRef = useRef(null)

  useEffect(() => {
    if (attempt) formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [attempt])

  if (user) return <Navigate to={from} replace state={location.state?.reopenChat ? { reopenChat: true } : undefined} /> // customers always land on the public website, never an admin page

  const change = (patch) => {
    setValues((v) => ({ ...v, ...patch }))
    setErrors((er) => { const next = { ...er }; for (const k of Object.keys(patch)) delete next[k]; return next })
  }
  const set = (id) => (e) => change({ [id]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) {
      setAttempt((a) => a + 1)
      return
    }
    setStatus('submitting')
    setServerError('')
    const result = await signUp({ fullName: values.full_name.trim(), email: values.email.trim(), password: values.password, details: detailsPayload(values) })
    if (!result.ok) {
      setErrors(result.fields || {})
      setServerError(result.fields ? 'Please check the highlighted fields.' : result.error)
      setStatus('error')
      setAttempt((a) => a + 1)
    }
    // On success the session store updates and this page redirects to the public website (see the guard above).
  }

  const toggle = (
    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide passwords' : 'Show passwords'} aria-pressed={show} className="inline-flex size-10 items-center justify-center rounded-full text-soft transition-colors hover:text-fg">
      {show ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
    </button>
  )

  return (
    <PageContainer path="/register" title="Create account" description="Create a LAX360 Pvt Ltd account to request demos, track your requests and chat without limits." noindex>
      <div className="wrap section flex justify-center">
        <div className="glass w-full max-w-2xl p-6 md:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-edge bg-glass" aria-hidden="true">
              <MiniBot pose="wave" size={36} />
            </span>
            <div>
              <h1 className="h3">Create your account</h1>
              <p className="mt-1 text-soft">Free, and it takes about two minutes. Fields marked <span className="text-accent">*</span> are required.</p>
            </div>
          </div>

          <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={status === 'submitting'} className="mt-7 space-y-8">
            {serverError && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border-2 border-error bg-glass p-3 text-sm font-medium text-error">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {serverError}
              </p>
            )}

            <fieldset className="space-y-4">
              <legend className="mb-1 flex items-center gap-2 font-display text-lg font-semibold"><span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white" aria-hidden="true">1</span> Your account</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField className="sm:col-span-2" id="reg-name" label="Full name" required autoComplete="name" value={values.full_name} onChange={set('full_name')} error={errors.full_name} placeholder="Your name" />
                <FormField id="reg-email" label="Email address" type="email" required autoComplete="email" inputMode="email" value={values.email} onChange={set('email')} error={errors.email} placeholder="name@example.com" />
                <FormField id="reg-mobile" label="Mobile number" type="tel" required autoComplete="tel" inputMode="tel" value={values.mobile} onChange={set('mobile')} error={errors.mobile} placeholder="+91 98765 43210" />
                <FormField id="reg-password" label="Password" type={show ? 'text' : 'password'} required autoComplete="new-password" value={values.password} onChange={set('password')} error={errors.password} adornment={toggle} hint="At least 8 characters." />
                <FormField id="reg-confirm" label="Confirm password" type={show ? 'text' : 'password'} required autoComplete="new-password" value={values.confirm} onChange={set('confirm')} error={errors.confirm} />
              </div>
            </fieldset>

            <DetailsSections values={values} errors={errors} onChange={change} first={2} idPrefix="reg" />

            <div>
              <Button type="submit" className="w-full" loading={status === 'submitting'}>
                <UserPlus className="size-5" aria-hidden="true" /> {status === 'submitting' ? 'Creating account…' : 'Create account'}
              </Button>
              <p className="mt-3 text-xs text-soft">We use these details only to give you relevant information and follow up on your requests. See our <Link to="/privacy" className="underline">Privacy policy</Link>. You can log in later with just your email and password.</p>
            </div>
          </form>

          <p className="mt-6 text-sm text-soft">
            Already have an account? <Link to="/login" state={location.state} className="font-semibold text-fg underline">Log in</Link>.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
