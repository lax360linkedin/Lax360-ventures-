import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import FormField from '../components/ui/FormField.jsx'
import Button from '../components/ui/Button.jsx'
import MiniBot from '../components/art/MiniBot.jsx'
import { forgotPassword } from '../services/authService.js'
import { EMAIL } from '../utils/validators.js'

/** Ask for a password-reset link → POST /api/auth/forgot-password. The answer is the same whether or not the address has an account. */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    if (!EMAIL.test(email.trim())) { setError('Enter a valid email address, like name@example.com.'); return }
    setStatus('sending')
    setError('')
    try {
      await forgotPassword(email.trim())
      setStatus('sent')
    } catch (err) {
      setError(err.fields?.email || err.message)
      setStatus('error')
    }
  }

  return (
    <PageContainer path="/forgot-password" title="Forgot password" description="Reset your LAX360 Pvt Ltd account password." noindex>
      <div className="wrap section flex justify-center">
        <div className="glass w-full max-w-md p-6 md:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-edge bg-glass" aria-hidden="true"><MiniBot pose="wave" size={36} /></span>
            <div>
              <h1 className="h3">Forgot your password?</h1>
              <p className="mt-1 text-soft">We will email you a link to choose a new one.</p>
            </div>
          </div>
          {status === 'sent' ? (
            <div role="status" className="mt-7 space-y-4">
              <p className="flex items-start gap-2 rounded-lg border border-edge bg-glass p-3 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. It works for one hour and only once. Check your spam folder too.</p>
              <Link to="/login" className="inline-block text-sm font-semibold text-fg underline">Back to login</Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate aria-busy={status === 'sending'} className="mt-7 space-y-5">
              {status === 'error' && <p role="alert" className="flex items-start gap-2 rounded-lg border-2 border-error bg-glass p-3 text-sm font-medium text-error"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}</p>}
              <FormField id="forgot-email" label="Email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} error={status === 'error' ? undefined : error} placeholder="name@example.com" />
              <Button type="submit" className="w-full" loading={status === 'sending'}><Mail className="size-5" aria-hidden="true" /> {status === 'sending' ? 'Sending…' : 'Send reset link'}</Button>
              <p className="text-sm text-soft">Remembered it? <Link to="/login" className="font-semibold text-fg underline">Log in</Link></p>
            </form>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
