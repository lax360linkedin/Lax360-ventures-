import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import FormField from '../ui/FormField.jsx'
import { submitEnquiry } from '../../services/enquiryService.js'
import { EMAIL } from '../../utils/validators.js'

const PHONE = /^\+?[0-9][0-9\s().-]{6,19}$/
const GENERAL = 'General application'
const blank = { position: GENERAL, name: '', email: '', phone: '', experience: '', link: '', message: '', consent: false, trap: '' }

function validate(v) {
  const e = {}
  if (v.name.trim().length < 2) e.name = 'Enter your name.'
  if (!EMAIL.test(v.email.trim())) e.email = 'Enter a valid email address.'
  if (!PHONE.test(v.phone.trim())) e.phone = 'Enter a valid phone number.'
  if (v.link.trim() && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(v.link.trim())) e.link = 'Enter the full address, starting with https://'
  if (v.message.trim().length < 10) e.message = 'Please write at least 10 characters.'
  if (!v.consent) e.consent = 'Please agree so we can respond to your application.'
  return e
}

/**
 * Job application form. It uses the website's existing enquiry API (type "career"): the application is stored in the database and appears in the admin
 * panel under Enquiries, where it can be filtered by type, given a status and notes. The role, experience and profile/portfolio link travel in `extra`.
 * There is no file upload: applicants share a link to their CV, LinkedIn or portfolio. The hidden "company_url" input is the spam trap.
 */
export default function ApplyForm({ jobs, position }) {
  const [values, setValues] = useState({ ...blank, position: position || GENERAL })
  const [errors, setErrors] = useState({})
  const [state, setState] = useState('idle') // idle | sending | done | duplicate | error
  const [message, setMessage] = useState('')
  useEffect(() => { if (position) setValues((v) => ({ ...v, position })) }, [position])
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) { setState('idle'); return }
    setState('sending')
    try {
      const extra = { position: values.position, ...(values.experience.trim() ? { experience: values.experience.trim() } : {}), ...(values.link.trim() ? { profile_link: values.link.trim() } : {}) }
      const res = await submitEnquiry({ type: 'career', name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim(), message: values.message.trim(), extra, consent: values.consent, website: values.trap, source: 'career' })
      setState(res.duplicate ? 'duplicate' : 'done')
      if (!res.duplicate) { setValues({ ...blank, position: values.position }); setErrors({}) }
    } catch (err) {
      if (err.fields) setErrors((prev) => ({ ...prev, ...err.fields }))
      setMessage(err.message || 'Something went wrong. Please try again or email us directly.')
      setState('error')
    }
  }

  if (state === 'done' || state === 'duplicate') {
    return (
      <div className="glass p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto size-10 text-lav" aria-hidden="true" />
        <p className="mt-4 font-display text-2xl font-semibold">{state === 'duplicate' ? 'We already have this application.' : 'Thank you — your application has been received.'}</p>
        <p className="mt-2 text-soft">{state === 'duplicate' ? 'You sent this same message recently, so it was not stored twice. Our team will follow up.' : 'Our team will review it and get back to you on the contact details you gave.'}</p>
        <button type="button" onClick={() => setState('idle')} className="link-underline mt-4 inline-flex min-h-11 items-center font-semibold text-lav">Send another application</button>
      </div>
    )
  }
  return (
    <form onSubmit={submit} noValidate className="glass relative grid gap-5 p-6 md:grid-cols-2 md:p-8" aria-label="Job application">
      <FormField id="ap-position" as="select" label="Role you are applying for" required value={values.position} onChange={set('position')} className="md:col-span-2">
        <option value={GENERAL}>{GENERAL}</option>
        {jobs.map((j) => <option key={j.id} value={j.title}>{j.title}{j.location ? ` — ${j.location}` : ''}</option>)}
      </FormField>
      <FormField id="ap-name" label="Your name" required autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} />
      <FormField id="ap-email" label="Email" required type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
      <FormField id="ap-phone" label="Phone number" required type="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} error={errors.phone} />
      <FormField id="ap-exp" label="Experience (optional)" placeholder="e.g. Fresher, or 2 years" maxLength={80} value={values.experience} onChange={set('experience')} />
      <FormField id="ap-link" label="Link to your CV, LinkedIn or portfolio (optional)" type="url" placeholder="https://" value={values.link} onChange={set('link')} error={errors.link} hint="Share a link, for example a Google Drive file set to “anyone with the link can view”." className="md:col-span-2" />
      <FormField id="ap-message" as="textarea" label="About you" required maxLength={2000} value={values.message} onChange={set('message')} error={errors.message} hint="Tell us a little about yourself and why you would like to join." className="md:col-span-2" />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Leave this empty<input tabIndex={-1} autoComplete="off" value={values.trap} onChange={set('trap')} name="company_url" /></label></div>
      <div className="md:col-span-2">
        <label className="flex items-start gap-3 text-sm text-soft">
          <input type="checkbox" checked={values.consent} onChange={set('consent')} aria-invalid={errors.consent ? 'true' : undefined} className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" />
          <span>I agree to LAX360 using these details to respond to my application, as described in the Privacy Policy.</span>
        </label>
        {errors.consent && <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-error"><AlertCircle className="size-4" aria-hidden="true" />{errors.consent}</p>}
      </div>
      {state === 'error' && <p className="flex items-center gap-2 rounded-xl border border-error/50 bg-error/10 p-3 font-semibold text-error md:col-span-2" role="alert"><AlertCircle className="size-5 shrink-0" aria-hidden="true" />{message}</p>}
      <div className="md:col-span-2">
        <button type="submit" disabled={state === 'sending'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--btn-hover)] disabled:cursor-not-allowed disabled:opacity-60">
          {state === 'sending' && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}{state === 'sending' ? 'Sending…' : 'Submit application'}
        </button>
      </div>
    </form>
  )
}
