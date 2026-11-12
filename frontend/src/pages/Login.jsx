import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, Info, LogIn } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import FormField from '../components/ui/FormField.jsx'
import Button from '../components/ui/Button.jsx'
import MiniBot from '../components/art/MiniBot.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { EMAIL } from '../utils/validators.js'

function validate({ email, password }) {
  const errors = {}
  if (!email.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL.test(email.trim())) errors.email = 'Enter a valid email address, like name@example.com.'
  if (!password) errors.password = 'Enter your password.'
  return errors
}

/** Login page → POST /api/auth/login. The server checks the credentials and sets an HttpOnly session cookie. */
export default function Login() {
  const { user, notice, signIn } = useAuth()
  const location = useLocation()
  const from = typeof location.state?.from === 'string' ? location.state.from : '/'
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | error
  const [serverError, setServerError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const formRef = useRef(null)

  // After a failed submit, move focus to the first invalid field.
  useEffect(() => {
    if (attempt) formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [attempt])

  if (user) return <Navigate to={from} replace state={location.state?.reopenChat ? { reopenChat: true } : undefined} /> // customers always land on the public website, never an admin page

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
    const result = await signIn({ email: values.email.trim(), password: values.password })
    if (!result.ok) {
      setErrors(result.fields || {})
      setServerError(result.fields ? '' : result.error)
      setStatus('error')
      setAttempt((a) => a + 1)
    }
    // On success the session store updates and this page redirects (see the guard above).
  }

  return (
    <PageContainer path="/login" title="Login" description="Sign in to your LAX360 Pvt Ltd account to manage your profile and request a demo." noindex>
      <div className="wrap section flex justify-center">
        <div className="glass w-full max-w-md p-6 md:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-edge bg-glass" aria-hidden="true">
              <MiniBot pose="wave" size={36} />
            </span>
            <div>
              <h1 className="h3">Welcome back</h1>
              <p className="mt-1 text-soft">Log in to your LAX360 account.</p>
            </div>
          </div>

          <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={status === 'submitting'} className="mt-7 space-y-5">
            {notice === 'expired' && !serverError && (
              <p role="status" className="flex items-start gap-2 rounded-lg border border-edge bg-glass p-3 text-sm text-fg">
                <Info className="mt-0.5 size-4 shrink-0 text-lav" aria-hidden="true" /> Your session expired. Please log in again.
              </p>
            )}
            {serverError && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border-2 border-error bg-glass p-3 text-sm font-medium text-error">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {serverError}
              </p>
            )}
            <FormField id="login-email" label="Email" type="email" required autoComplete="email" inputMode="email" value={values.email} onChange={set('email')} error={errors.email} placeholder="name@example.com" />
            <FormField
              id="login-password"
              label="Password"
              type={show ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={values.password}
              onChange={set('password')}
              error={errors.password}
              adornment={
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  aria-pressed={show}
                  className="inline-flex size-10 items-center justify-center rounded-full text-soft transition-colors hover:text-fg"
                >
                  {show ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                </button>
              }
            />
            <p className="-mt-2 text-right text-sm"><Link to="/forgot-password" className="font-semibold text-fg underline">Forgot your password?</Link></p>
            <Button type="submit" className="w-full" loading={status === 'submitting'}>
              <LogIn className="size-5" aria-hidden="true" /> {status === 'submitting' ? 'Signing in…' : 'Login'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-soft">
            New to LAX360? <Link to="/register" state={location.state} className="font-semibold text-fg underline">Create an account</Link>. This login is for website customers; LAX360 staff use the separate company admin login.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
