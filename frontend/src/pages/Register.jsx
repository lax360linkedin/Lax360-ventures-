import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import FormField from '../components/ui/FormField.jsx'
import Button from '../components/ui/Button.jsx'
import MiniBot from '../components/art/MiniBot.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { EMAIL } from '../utils/validators.js'

const MIN_PASSWORD = 8

function validate({ fullName, email, password, confirm }) {
  const errors = {}
  if (fullName.trim().length < 2) errors.fullName = 'Enter your name (at least 2 characters).'
  if (!email.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL.test(email.trim())) errors.email = 'Enter a valid email address, like name@example.com.'
  if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`
  if (confirm !== password) errors.confirm = 'The two passwords do not match.'
  return errors
}

/** Public sign-up → POST /api/auth/register. Always creates a website customer; nothing here can create an administrator. */
export default function Register() {
  const { user, signUp } = useAuth()
  const location = useLocation()
  const from = typeof location.state?.from === 'string' ? location.state.from : '/user/dashboard'
  const [values, setValues] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | error
  const [serverError, setServerError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const formRef = useRef(null)

  useEffect(() => {
    if (attempt) formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [attempt])

  if (user) return <Navigate to={from} replace />

  const set = (id) => (e) => {
    setValues((v) => ({ ...v, [id]: e.target.value }))
    if (errors[id]) setErrors((er) => ({ ...er, [id]: undefined }))
  }

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
    const result = await signUp({ fullName: values.fullName.trim(), email: values.email.trim(), password: values.password })
    if (!result.ok) {
      const f = result.fields || {}
      setErrors({ fullName: f.full_name, email: f.email, password: f.password })
      setServerError(result.fields ? '' : result.error)
      setStatus('error')
      setAttempt((a) => a + 1)
    }
    // On success the session store updates and this page redirects to the dashboard (see the guard above).
  }

  const toggle = (
    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide passwords' : 'Show passwords'} aria-pressed={show} className="inline-flex size-10 items-center justify-center rounded-full text-soft transition-colors hover:text-fg">
      {show ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
    </button>
  )

  return (
    <PageContainer path="/register" title="Create account" description="Create a LAX360 Ventures account to manage your profile and request a demo." noindex>
      <div className="wrap section flex justify-center">
        <div className="glass w-full max-w-md p-6 md:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-edge bg-glass" aria-hidden="true">
              <MiniBot pose="wave" size={36} />
            </span>
            <div>
              <h1 className="h3">Create your account</h1>
              <p className="mt-1 text-soft">Free, and it takes a minute.</p>
            </div>
          </div>

          <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={status === 'submitting'} className="mt-7 space-y-5">
            {serverError && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border-2 border-error bg-glass p-3 text-sm font-medium text-error">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {serverError}
              </p>
            )}
            <FormField id="reg-name" label="Full name" required autoComplete="name" value={values.fullName} onChange={set('fullName')} error={errors.fullName} placeholder="Your name" />
            <FormField id="reg-email" label="Email" type="email" required autoComplete="email" inputMode="email" value={values.email} onChange={set('email')} error={errors.email} placeholder="name@example.com" />
            <FormField id="reg-password" label="Password" type={show ? 'text' : 'password'} required autoComplete="new-password" value={values.password} onChange={set('password')} error={errors.password} adornment={toggle} />
            <FormField id="reg-confirm" label="Confirm password" type={show ? 'text' : 'password'} required autoComplete="new-password" value={values.confirm} onChange={set('confirm')} error={errors.confirm} />
            <Button type="submit" className="w-full" loading={status === 'submitting'}>
              <UserPlus className="size-5" aria-hidden="true" /> {status === 'submitting' ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-soft">
            Already have an account? <Link to="/login" state={location.state} className="font-semibold text-fg underline">Log in</Link>.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
