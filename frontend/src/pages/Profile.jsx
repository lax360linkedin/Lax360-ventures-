import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CalendarCheck, CheckCircle2, LogOut } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import FormField from '../components/ui/FormField.jsx'
import { useAuth } from '../hooks/useAuth.js'

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
    <PageContainer path="/user/dashboard" title="My Dashboard" description="Your LAX360 Ventures account." noindex>
      <div className="wrap section flex justify-center">
        <div className="glass w-full max-w-xl p-6 md:p-8">
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

          <div className="mt-6 flex flex-wrap gap-3 border-t border-edge pt-6">
            <Button to="/demo" arrow><CalendarCheck className="size-5" aria-hidden="true" /> Get a Demo</Button>
            <Button variant="secondary" onClick={logout}><LogOut className="size-5" aria-hidden="true" /> Logout</Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
