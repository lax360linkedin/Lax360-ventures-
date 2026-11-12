import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import FormField from '../components/ui/FormField.jsx'
import Button from '../components/ui/Button.jsx'
import MiniBot from '../components/art/MiniBot.jsx'
import { resetPassword } from '../services/authService.js'

const MIN_PASSWORD = 8

/** Choose a new password with the link from the e-mail → POST /api/auth/reset-password. The link works once; every session of the account is signed out. */
export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [values, setValues] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('idle') // idle | saving | done | error
  const [serverError, setServerError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'saving') return
    const found = {}
    if (values.password.length < MIN_PASSWORD) found.password = `Use at least ${MIN_PASSWORD} characters.`
    if (values.confirm !== values.password) found.confirm = 'The two passwords do not match.'
    setErrors(found)
    if (Object.keys(found).length) return
    setStatus('saving')
    setServerError('')
    try {
      await resetPassword(token, values.password)
      setStatus('done')
    } catch (err) {
      setErrors(err.fields ? { password: err.fields.new_password } : {})
      setServerError(err.fields ? '' : err.message)
      setStatus('error')
    }
  }

  return (
    <PageContainer path="/reset-password" title="Choose a new password" description="Choose a new password for your LAX360 Pvt Ltd account." noindex>
      <div className="wrap section flex justify-center">
        <div className="glass w-full max-w-md p-6 md:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-edge bg-glass" aria-hidden="true"><MiniBot pose="wave" size={36} /></span>
            <h1 className="h3">Choose a new password</h1>
          </div>
          {status === 'done' ? (
            <div role="status" className="mt-7 space-y-4">
              <p className="flex items-start gap-2 rounded-lg border border-edge bg-glass p-3 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> Your password has been changed and you were signed out everywhere. Log in with the new one.</p>
              <Button to="/login" arrow>Go to login</Button>
            </div>
          ) : !token ? (
            <p role="alert" className="mt-7 text-soft">This page needs the link from the reset email. <Link to="/forgot-password" className="font-semibold text-fg underline">Request a new link</Link>.</p>
          ) : (
            <form onSubmit={onSubmit} noValidate aria-busy={status === 'saving'} className="mt-7 space-y-5">
              {serverError && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border-2 border-error bg-glass p-3 text-sm font-medium text-error"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {serverError} <Link to="/forgot-password" className="underline">Request a new link</Link></p>
              )}
              <FormField id="reset-password" label="New password" type={show ? 'text' : 'password'} required autoComplete="new-password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} error={errors.password}
                adornment={<button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="inline-flex size-10 items-center justify-center rounded-full text-soft transition-colors hover:text-fg">{show ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}</button>} />
              <FormField id="reset-confirm" label="Confirm new password" type={show ? 'text' : 'password'} required autoComplete="new-password" value={values.confirm} onChange={(e) => setValues({ ...values, confirm: e.target.value })} error={errors.confirm} />
              <Button type="submit" className="w-full" loading={status === 'saving'}><KeyRound className="size-5" aria-hidden="true" /> {status === 'saving' ? 'Saving…' : 'Change password'}</Button>
            </form>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
