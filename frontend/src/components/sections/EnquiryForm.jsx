import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, MessageCircle } from 'lucide-react'
import FormField from '../ui/FormField.jsx'
import Button from '../ui/Button.jsx'
import { enquiryTypes } from '../../data/navigation.js'
import { courses } from '../../data/courses.js'
import { submitEnquiry } from '../../services/enquiryService.js'
import { useBranches } from '../../hooks/useBranches.js'
import { useSiteSettings } from '../../hooks/useSite.js'
import { whatsappLink } from '../../utils/whatsapp.js'
import { EMAIL } from '../../utils/validators.js'

const opts = (arr) => arr.map((o) => ({ value: o, label: o }))

// Extra fields shown per enquiry type (planning document, "Form specification").
const typeFields = {
  project: [{ id: 'timeline', label: 'Timeline', kind: 'select', options: opts(['Within a month', '1–3 months', 'More than 3 months', 'Not sure yet']) }],
  ai: [{ id: 'task', label: 'Task you want automated', kind: 'text', required: true, hint: 'For example: replying to common customer questions.' }],
  'website-app': [{ id: 'projectType', label: 'Project type', kind: 'select', required: true, options: opts(['Website', 'Web app', 'Android app', 'iOS app', 'Android and iOS']) }],
  marketing: [
    { id: 'goal', label: 'Main goal', kind: 'select', options: opts(['Leads', 'Sales', 'Awareness']) },
    { id: 'websiteUrl', label: 'Current website', kind: 'text', placeholder: 'https://' },
  ],
  course: [
    { id: 'course', label: 'Course of interest', kind: 'select', options: courses.map((c) => ({ value: c.title, label: c.title })) },
    { id: 'mode', label: 'Preferred mode', kind: 'select', options: opts(['Online', 'In person', 'No preference']) },
    { id: 'status', label: 'Current status', kind: 'select', options: opts(['Student', 'Working professional']) },
  ],
  workshop: [
    { id: 'college', label: 'College or institution', kind: 'text', required: true },
    { id: 'students', label: 'Expected number of students', kind: 'text', inputMode: 'numeric' },
  ],
  partnership: [
    { id: 'company', label: 'Company', kind: 'text', required: true },
    { id: 'partnershipType', label: 'Partnership type', kind: 'select', required: true, options: opts(['Referral', 'White-label', 'Technology', 'College']) },
  ],
  general: [],
}

const PHONE = /^(\+?91)?[6-9]\d{9}$/

function validate(values, fields) {
  const errors = {}
  if (values.name.trim().length < 2) errors.name = 'Enter your name.'
  const phone = values.phone.replace(/[\s()-]/g, '')
  if (!phone) errors.phone = 'Enter a phone or WhatsApp number.'
  else if (!PHONE.test(phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number, optionally with +91.'
  if (!values.email.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL.test(values.email.trim())) errors.email = 'Enter a valid email address, like name@example.com.'
  const len = values.message.trim().length
  if (len < 20) errors.message = `Tell us a little more — at least 20 characters (you have ${len}).`
  else if (len > 2000) errors.message = 'Please keep your message under 2,000 characters.'
  fields.forEach((f) => {
    if (f.required && !String(values[f.id] || '').trim()) errors[f.id] = `${f.label} is required.`
  })
  if (!values.consent) errors.consent = 'Please agree so we can respond to your enquiry.'
  return errors
}

/**
 * Shared enquiry form → POST /api/contact (via `enquiryService`). The backend re-validates, rate-limits and stores the
 * enquiry; it does not send email, so the success state never says one was sent.
 */
export default function EnquiryForm({ defaultType = 'project', tone = 'light', compact = false, idPrefix = 'enq', source = 'contact', presets = {} }) {
  const validType = enquiryTypes.some((t) => t.id === defaultType) ? defaultType : 'project'
  const [type, setType] = useState(validType)
  const [values, setValues] = useState({ name: '', phone: '', email: '', company: '', message: '', consent: false, website: '', branch: '', ...presets })
  const branches = useBranches()
  const siteSettings = useSiteSettings() // contact form switch + notice (admin panel)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [serverError, setServerError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [duplicate, setDuplicate] = useState(false)
  const resultRef = useRef(null)
  const summaryRef = useRef(null)
  const dark = tone === 'dark'

  useEffect(() => setType(validType), [validType])
  // After a failed submit, move focus to the error summary so it is announced and reachable.
  useEffect(() => {
    if (attempt) summaryRef.current?.focus()
  }, [attempt])
  useEffect(() => {
    if (status === 'success' || status === 'error') resultRef.current?.focus()
  }, [status])

  const fields = compact ? [] : typeFields[type] || []
  const set = (id) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setValues((v) => ({ ...v, [id]: value }))
    if (errors[id]) setErrors((er) => ({ ...er, [id]: undefined }))
  }
  const fid = (k) => `${idPrefix}-${k}`

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return // duplicate-submission protection
    const found = validate(values, fields)
    setErrors(found)
    if (Object.keys(found).length) {
      setAttempt((a) => a + 1)
      return
    }
    setStatus('submitting')
    setServerError('')
    const extra = Object.fromEntries(fields.map((f) => [f.id, values[f.id] || '']).filter(([, v]) => v))
    try {
      const result = await submitEnquiry({
        type, name: values.name.trim(), phone: values.phone.trim(), email: values.email.trim(), company: values.company.trim(), message: values.message.trim(),
        extra, consent: values.consent, branchId: values.branch, website: values.website, source,
      })
      setDuplicate(result.duplicate)
      setStatus('success')
    } catch (err) {
      if (err.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, msg]) => [k === 'branch_id' ? 'branch' : k, msg])))
        setAttempt((a) => a + 1)
      }
      setServerError(err.message)
      setStatus('error')
    }
  }

  const reset = () => {
    setValues({ name: '', phone: '', email: '', company: '', message: '', consent: false, website: '', branch: '' })
    setErrors({})
    setStatus('idle')
  }

  if (siteSettings.contact_form_enabled === false) {
    return <p role="status" className="rounded-xl border border-edge bg-glass p-5 text-soft">{siteSettings.contact_form_notice || 'The enquiry form is temporarily unavailable. Please contact us by phone, email or WhatsApp.'}</p>
  }

  if (status === 'success') {
    return (
      <div ref={resultRef} tabIndex={-1} role="status" className="rounded-xl border border-edge bg-glass p-6 text-fg md:p-8">
        <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
        <h3 className="h3 mt-3">{duplicate ? 'We already have this enquiry' : 'Enquiry received'}</h3>
        <p className="mt-3 text-soft">
          Thanks, {values.name.trim() || 'there'}. <strong className="text-fg">Your enquiry has been saved and the team will follow up.</strong> We don&apos;t send an automatic confirmation email — for anything urgent, use WhatsApp or phone.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={whatsappLink(`Hi LAX360 Ventures, I would like to discuss: ${values.message.trim().slice(0, 200)}`)}>
            <MessageCircle className="size-5" aria-hidden="true" /> Continue on WhatsApp
          </Button>
          <Button variant="secondary" onClick={reset}>Edit enquiry</Button>
        </div>
      </div>
    )
  }

  const errorList = Object.entries(errors).filter(([, v]) => v)
  const submitting = status === 'submitting'
  const selectCls = 'appearance-none'

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={submitting} className="space-y-5">
      {siteSettings.contact_form_notice && <p role="note" className="rounded-lg border border-edge bg-glass p-3 text-sm text-soft">{siteSettings.contact_form_notice}</p>}
      <div ref={summaryRef} tabIndex={-1} className={errorList.length ? 'rounded-lg border-2 border-error bg-glass p-4 text-fg' : 'sr-only'} role={errorList.length ? 'alert' : undefined}>
        {errorList.length > 0 && (
          <>
            <p className="flex items-center gap-2 font-bold text-error"><AlertCircle className="size-5" aria-hidden="true" /> Please fix {errorList.length === 1 ? 'this field' : `these ${errorList.length} fields`}:</p>
            <ul className="mt-2 list-inside list-disc text-sm">
              {errorList.map(([k, v]) => (
                <li key={k}><a href={`#${fid(k)}`} className="underline">{v}</a></li>
              ))}
            </ul>
          </>
        )}
      </div>

      {status === 'error' && (
        <div ref={resultRef} tabIndex={-1} role="alert" className="rounded-lg border-2 border-error bg-glass p-4 text-fg">
          <p className="flex items-center gap-2 font-bold text-error"><AlertCircle className="size-5" aria-hidden="true" /> We couldn&apos;t submit your enquiry.</p>
          <p className="mt-1 text-sm">{serverError} Your details are still here — try again, or contact us on WhatsApp.</p>
        </div>
      )}

      <fieldset>
        <legend className={`mb-2 text-sm font-bold ${dark ? 'text-fg' : 'text-fg'}`}>What is this about? <span aria-hidden="true">*</span></legend>
        <div className="flex flex-wrap gap-2">
          {enquiryTypes.map((t) => (
            <label key={t.id} className="cursor-pointer">
              <input type="radio" name={fid('type')} value={t.id} checked={type === t.id} onChange={() => setType(t.id)} className="peer sr-only" />
              <span className="inline-flex min-h-11 items-center rounded-full border border-edge bg-glass px-4 text-sm font-semibold text-fg transition-colors hover:border-edge-strong peer-checked:border-lav peer-checked:bg-primary/45 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lav">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField id={fid('name')} label="Name" required tone={tone} autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} />
        <FormField id={fid('phone')} label="Phone / WhatsApp" required tone={tone} type="tel" autoComplete="tel" inputMode="tel" value={values.phone} onChange={set('phone')} error={errors.phone} hint="10-digit mobile number, optionally with +91" />
        <FormField id={fid('email')} label="Email" required tone={tone} type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
        {!compact && <FormField id={fid('company')} label="Company name" tone={tone} autoComplete="organization" value={values.company} onChange={set('company')} />}
        {!compact && branches.length > 0 && (
          <FormField id={fid('branch')} as="select" label="Preferred branch" tone={tone} className={selectCls} value={values.branch} onChange={set('branch')} error={errors.branch}>
            <option value="">No preference</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.city}</option>)}
          </FormField>
        )}
      </div>

      {fields.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {fields.map((f) =>
            f.kind === 'select' ? (
              <FormField key={f.id} id={fid(f.id)} as="select" label={f.label} required={f.required} tone={tone} className={selectCls} value={values[f.id] || ''} onChange={set(f.id)} error={errors[f.id]}>
                <option value="">Select…</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </FormField>
            ) : (
              <FormField key={f.id} id={fid(f.id)} label={f.label} required={f.required} tone={tone} placeholder={f.placeholder} inputMode={f.inputMode} hint={f.hint} value={values[f.id] || ''} onChange={set(f.id)} error={errors[f.id]} />
            ),
          )}
        </div>
      )}

      <FormField id={fid('message')} as="textarea" label="Project description" required tone={tone} value={values.message} onChange={set('message')} error={errors.message} maxLength={2000} hint="At least 20 characters." />

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} /></label>
      </div>

      <div>
        <label className={`flex cursor-pointer items-start gap-3 text-base ${dark ? 'text-fg' : 'text-fg'}`}>
          <input
            id={fid('consent')}
            type="checkbox"
            checked={values.consent}
            onChange={set('consent')}
            aria-invalid={errors.consent ? 'true' : undefined}
            aria-describedby={errors.consent ? fid('consent-error') : undefined}
            className="mt-1 size-5 shrink-0 accent-primary"
          />
          <span>I agree to LAX360 using these details to respond to my enquiry, as described in the <Link to="/privacy" className="underline">Privacy Policy</Link>.</span>
        </label>
        {errors.consent && (
          <p id={fid('consent-error')} className="mt-1.5 flex items-start gap-1.5 rounded bg-glass px-2 py-1 text-sm font-medium text-error">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{errors.consent}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant={dark ? 'onDark' : 'primary'} loading={submitting} arrow className="min-w-48" aria-disabled={submitting}>
          {submitting ? 'Sending…' : 'Send enquiry'}
        </Button>
      </div>
    </form>
  )
}
