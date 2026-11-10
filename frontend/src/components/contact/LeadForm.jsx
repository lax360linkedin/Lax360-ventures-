import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, FileText, Loader2, Upload, X } from 'lucide-react'
import FormField from '../ui/FormField.jsx'
import EnquiryForm from '../sections/EnquiryForm.jsx'
import { api } from '../../services/apiClient.js'
import { submitEnquiry } from '../../services/enquiryService.js'
import { EMAIL } from '../../utils/validators.js'

const PHONE = /^\+?[0-9][0-9\s().-]{6,19}$/
const STEPS = ['You', 'Company', 'Services', 'Project', 'Meeting & files', 'Review']
const blank = {
  name: '', email: '', phone: '', whatsapp: '', designation: '', contact_method: 'email',
  company: '', industry: '', website: '', location: '', company_size: '', business_type: '',
  mains: [], subs: [],
  project_name: '', description: '', challenges: '', expected_solution: '', budget: '', timeline: '', start_date: '', additional: '',
  referral: '', meeting_type: 'online', meeting_time: '', consent: false, trap: '',
}

function validate(step, v) {
  const e = {}
  if (step === 0) {
    if (v.name.trim().length < 2) e.name = 'Enter your full name.'
    if (!EMAIL.test(v.email.trim())) e.email = 'Enter a valid email address.'
    if (!PHONE.test(v.phone.trim())) e.phone = 'Enter a valid mobile number, e.g. +91 98765 43210.'
    if (v.whatsapp.trim() && !PHONE.test(v.whatsapp.trim())) e.whatsapp = 'Enter a valid WhatsApp number, or leave it empty.'
    if (!v.contact_method) e.contact_method = 'Choose how you would like us to reach you.'
  }
  if (step === 1) {
    if (v.company.trim().length < 2) e.company = 'Enter your company or business name (or your own name if you are an individual).'
    if (!v.industry) e.industry = 'Choose the closest industry.'
    if (v.website.trim() && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(v.website.trim())) e.website = 'Enter the full address, starting with https://'
    if (v.location.trim().length < 2) e.location = 'Enter your city or location.'
    if (!v.company_size) e.company_size = 'Choose your company size.'
    if (!v.business_type) e.business_type = 'Choose your business type.'
  }
  if (step === 2 && v.mains.length === 0) e.mains = 'Choose at least one service you are interested in.'
  if (step === 3) {
    if (v.description.trim().length < 20) e.description = 'Please describe the project in at least 20 characters.'
    if (!v.budget) e.budget = 'Choose a budget range (or “Not decided yet”).'
    if (!v.timeline) e.timeline = 'Choose an expected timeline.'
  }
  return e
}

const Select = ({ id, label, options, value, onChange, error, required = true, hint, className }) => (
  <FormField id={id} as="select" label={label} required={required} value={value} onChange={onChange} error={error} hint={hint} className={className}>
    <option value="">Select…</option>
    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </FormField>
)

/**
 * The Contact page's multi-step business enquiry form: you, company, services (with sub-services), project, meeting and files, then a review.
 * The choices come from the backend (/api/public/contact-options) so the form and the API always agree. It submits through the existing enquiry API
 * (stored in the database, listed in the admin panel under Enquiries as a lead); project documents are uploaded first and stay private.
 * If the choices cannot be loaded, the simple enquiry form is shown instead so a visitor can still get in touch.
 */
export default function LeadForm({ defaultType = 'quote', initialMains = [] }) {
  const [opts, setOpts] = useState(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [step, setStep] = useState(0)
  const [v, setV] = useState({ ...blank, mains: initialMains })
  const [errors, setErrors] = useState({})
  const [files, setFiles] = useState([]) // { id, filename, size } uploaded; uploading flag in `busyFile`
  const [busyFile, setBusyFile] = useState('')
  const [fileError, setFileError] = useState('')
  const [state, setState] = useState('idle') // idle | sending | done | duplicate | error
  const [message, setMessage] = useState('')
  const top = useRef(null)

  useEffect(() => { api('/api/public/contact-options').then(setOpts).catch(() => setLoadFailed(true)) }, [])
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const mains = opts?.services || []
  const label = (list, value) => list?.find((o) => o.value === value)?.label || value
  const subsOf = useMemo(() => Object.fromEntries(mains.map((m) => [m.value, m.subs])), [mains])

  const go = (n) => { setStep(n); setErrors({}); requestAnimationFrame(() => top.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })) }
  const next = () => { const found = validate(step, v); setErrors(found); if (!Object.keys(found).length) go(step + 1) }
  const toggleMain = (m) => setV((x) => {
    const on = x.mains.includes(m)
    const mainsNow = on ? x.mains.filter((y) => y !== m) : [...x.mains, m]
    const keep = new Set(mainsNow.flatMap((y) => (subsOf[y] || []).map((s) => s.value)))
    return { ...x, mains: mainsNow, subs: x.subs.filter((s) => keep.has(s)) }
  })
  const toggleSub = (s) => setV((x) => ({ ...x, subs: x.subs.includes(s) ? x.subs.filter((y) => y !== s) : [...x.subs, s] }))

  const addFiles = async (list) => {
    setFileError('')
    const limits = opts?.limits || { files: 3, file_bytes: 5 * 1024 * 1024, file_types: [] }
    for (const file of Array.from(list)) {
      if (files.length >= limits.files) { setFileError(`You can attach up to ${limits.files} files.`); break }
      if (!limits.file_types.includes(file.type)) { setFileError(`${file.name}: please attach a PDF or a PNG, JPEG or WebP image.`); continue }
      if (file.size > limits.file_bytes) { setFileError(`${file.name} is larger than ${Math.round(limits.file_bytes / 1024 / 1024)} MB.`); continue }
      setBusyFile(file.name)
      try {
        const r = await api(`/api/contact/attachments?filename=${encodeURIComponent(file.name)}`, { method: 'POST', rawBody: file, contentType: file.type, timeoutMs: 60000 })
        setFiles((f) => [...f, { id: r.id, filename: r.filename, size: r.size }])
      } catch (err) { setFileError(`${file.name}: ${err.message}`) }
    }
    setBusyFile('')
  }

  const submit = async () => {
    if (!v.consent) { setErrors({ consent: 'Please agree so we can respond to your enquiry.' }); return }
    for (let i = 0; i < 4; i += 1) { const found = validate(i, v); if (Object.keys(found).length) { setErrors(found); go(i); return } }
    setState('sending')
    const extra = Object.fromEntries(Object.entries({
      designation: v.designation, whatsapp: v.whatsapp, contact_method: v.contact_method, industry: v.industry, company_size: v.company_size, business_type: v.business_type, location: v.location, website: v.website,
      service_mains: v.mains.join(','), service_subs: v.subs.join(','), project_name: v.project_name, challenges: v.challenges, expected_solution: v.expected_solution, budget: v.budget,
      timeline: v.timeline, start_date: v.start_date, additional_requirements: v.additional, referral: v.referral, meeting_type: v.meeting_type, meeting_time: v.meeting_time,
    }).map(([k, x]) => [k, String(x || '').trim()]).filter(([, x]) => x))
    try {
      const res = await submitEnquiry({ type: defaultType, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), company: v.company.trim(), message: v.description.trim(), extra, consent: v.consent, website: v.trap, source: 'contact', attachments: files.map((f) => f.id) })
      setState(res.duplicate ? 'duplicate' : 'done')
    } catch (err) {
      if (err.fields) { setErrors(err.fields); const stepOf = (k) => (['name', 'email', 'phone', 'whatsapp', 'contact_method'].includes(k) ? 0 : ['company', 'industry', 'website', 'location', 'company_size', 'business_type'].includes(k) ? 1 : k.startsWith('service') ? 2 : 3); go(Math.min(...Object.keys(err.fields).map(stepOf))) }
      setMessage(err.message || 'Something went wrong. Please try again or contact us directly.')
      setState('error')
    }
  }

  if (loadFailed) return <EnquiryForm defaultType="project" idPrefix="contact" source="contact" />
  if (!opts) return <div className="flex items-center gap-2 py-10 text-soft" role="status"><Loader2 className="size-5 animate-spin" aria-hidden="true" /> Loading the form…</div>

  if (state === 'done' || state === 'duplicate') {
    return (
      <div className="py-6 text-center" role="status">
        <CheckCircle2 className="mx-auto size-12 text-lav" aria-hidden="true" />
        <p className="mt-4 font-display text-3xl font-semibold">{state === 'duplicate' ? 'We already have this enquiry.' : 'Thank you — your enquiry has been received.'}</p>
        <p className="mx-auto mt-3 max-w-xl text-lg text-soft">{state === 'duplicate' ? 'You sent this same enquiry recently, so it was not stored twice. Our team will follow up.' : `Our team will review your requirements and get back to you by ${label(opts.contact_methods, v.contact_method).toLowerCase()}.`}</p>
        <button type="button" onClick={() => { setV(blank); setFiles([]); setStep(0); setState('idle') }} className="link-underline mt-6 inline-flex min-h-11 items-center font-semibold text-lav">Send another enquiry</button>
      </div>
    )
  }

  const subsShown = v.mains.filter((m) => (subsOf[m] || []).length > 0)
  const summary = [
    ['You', [['Name', v.name], ['Email', v.email], ['Mobile', v.phone], ['WhatsApp', v.whatsapp], ['Designation', v.designation], ['Preferred contact', label(opts.contact_methods, v.contact_method)]]],
    ['Company', [['Company', v.company], ['Industry', v.industry], ['Website', v.website], ['Location', v.location], ['Size', v.company_size], ['Business type', label(opts.business_types, v.business_type)]]],
    ['Services', [['Services', v.mains.map((m) => label(mains, m)).join(', ')], ['Sub-services', v.subs.map((s) => Object.values(subsOf).flat().find((x) => x.value === s)?.label || s).join(', ')]]],
    ['Project', [['Project', v.project_name], ['Description', v.description], ['Challenges', v.challenges], ['Expected solution', v.expected_solution], ['Budget', v.budget], ['Timeline', v.timeline], ['Start date', v.start_date], ['Additional', v.additional]]],
    ['Meeting & files', [['Heard about us', v.referral], ['Meeting', label(opts.meeting_types, v.meeting_type)], ['Preferred time', v.meeting_time], ['Documents', files.map((f) => f.filename).join(', ')]]],
  ]

  return (
    <div ref={top} className="scroll-mt-[calc(var(--header-bottom,92px)+1rem)]">
      <ol className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-1" aria-label="Form progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex shrink-0 items-center gap-1.5" aria-current={i === step ? 'step' : undefined}>
            <span className={`flex size-8 items-center justify-center rounded-full border text-sm font-bold ${i === step ? 'border-primary bg-primary text-white' : i < step ? 'border-lav text-lav' : 'border-edge text-soft'}`}>{i < step ? <CheckCircle2 className="size-4" aria-hidden="true" /> : i + 1}</span>
            <span className={`hidden text-sm font-semibold sm:inline ${i === step ? 'text-fg' : 'text-soft'}`}>{s}</span>
            {i < STEPS.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-4 bg-edge-strong sm:w-6" />}
          </li>
        ))}
      </ol>
      <p className="mb-5 text-sm text-soft"><span className="font-semibold text-fg">Step {step + 1} of {STEPS.length}: {STEPS[step]}.</span> Fields marked <span aria-hidden="true">*</span> are required; the others are optional.</p>

      <form noValidate onSubmit={(e) => { e.preventDefault(); if (step === STEPS.length - 1) submit(); else next() }} aria-label={`Enquiry form, step ${step + 1} of ${STEPS.length}`}>
        {step === 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            <FormField id="lf-name" label="Full name" required autoComplete="name" value={v.name} onChange={set('name')} error={errors.name} />
            <FormField id="lf-email" label="Email address" required type="email" autoComplete="email" value={v.email} onChange={set('email')} error={errors.email} />
            <FormField id="lf-phone" label="Mobile number" required type="tel" autoComplete="tel" value={v.phone} onChange={set('phone')} error={errors.phone} />
            <FormField id="lf-wa" label="WhatsApp number" type="tel" value={v.whatsapp} onChange={set('whatsapp')} error={errors.whatsapp} hint="If different from your mobile number." />
            <FormField id="lf-role" label="Job designation" autoComplete="organization-title" value={v.designation} onChange={set('designation')} maxLength={80} />
            <Select id="lf-method" label="Preferred contact method" options={opts.contact_methods} value={v.contact_method} onChange={set('contact_method')} error={errors.contact_method} />
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-5 md:grid-cols-2">
            <FormField id="lf-company" label="Company or business name" required autoComplete="organization" value={v.company} onChange={set('company')} error={errors.company} className="md:col-span-2" />
            <Select id="lf-industry" label="Industry / business category" options={opts.industries} value={v.industry} onChange={set('industry')} error={errors.industry} />
            <Select id="lf-type" label="Business type" options={opts.business_types} value={v.business_type} onChange={set('business_type')} error={errors.business_type} />
            <FormField id="lf-location" label="Company location" required placeholder="City, state" value={v.location} onChange={set('location')} error={errors.location} />
            <Select id="lf-size" label="Company size" options={opts.company_sizes} value={v.company_size} onChange={set('company_size')} error={errors.company_size} />
            <FormField id="lf-site" label="Company website" type="url" placeholder="https://" value={v.website} onChange={set('website')} error={errors.website} className="md:col-span-2" />
          </div>
        )}
        {step === 2 && (
          <div>
            <fieldset aria-describedby={errors.mains ? 'lf-mains-error' : undefined}>
              <legend className="mb-3 text-sm font-bold">Which services are you interested in? <span aria-hidden="true" className="text-accent">*</span> <span className="font-normal text-soft">Choose one or more.</span></legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {mains.map((m) => (
                  <label key={m.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${v.mains.includes(m.value) ? 'border-primary bg-glass-strong' : 'border-edge hover:border-edge-strong'}`}>
                    <input type="checkbox" checked={v.mains.includes(m.value)} onChange={() => toggleMain(m.value)} className="size-5 shrink-0 accent-[var(--color-primary)]" />
                    <span className="font-semibold">{m.label}</span>
                  </label>
                ))}
              </div>
              {errors.mains && <p id="lf-mains-error" className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-error"><AlertCircle className="size-4" aria-hidden="true" />{errors.mains}</p>}
            </fieldset>
            {subsShown.map((m) => (
              <fieldset key={m} className="mt-6 rounded-2xl border border-edge bg-glass p-4">
                <legend className="px-2 text-sm font-bold">{label(mains, m)}: what exactly do you need? <span className="font-normal text-soft">(optional)</span></legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {subsOf[m].map((s) => (
                    <label key={s.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-glass-strong">
                      <input type="checkbox" checked={v.subs.includes(s.value)} onChange={() => toggleSub(s.value)} className="size-5 shrink-0 accent-[var(--color-primary)]" />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            {v.mains.includes('other') && <p className="mt-4 text-soft">For “Other services”, please describe what you need in the next step.</p>}
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-5 md:grid-cols-2">
            <FormField id="lf-pname" label="Project name" value={v.project_name} onChange={set('project_name')} maxLength={120} className="md:col-span-2" />
            <FormField id="lf-desc" as="textarea" label="Project description" required maxLength={1500} value={v.description} onChange={set('description')} error={errors.description} hint="What would you like to build or achieve?" className="md:col-span-2" />
            <FormField id="lf-chal" as="textarea" label="Current business challenges" maxLength={1000} value={v.challenges} onChange={set('challenges')} />
            <FormField id="lf-sol" as="textarea" label="Expected solution" maxLength={1000} value={v.expected_solution} onChange={set('expected_solution')} />
            <Select id="lf-budget" label="Project budget range" options={opts.budgets} value={v.budget} onChange={set('budget')} error={errors.budget} />
            <Select id="lf-timeline" label="Expected project timeline" options={opts.timelines} value={v.timeline} onChange={set('timeline')} error={errors.timeline} />
            <FormField id="lf-start" label="Preferred start date" type="date" value={v.start_date} onChange={set('start_date')} />
            <FormField id="lf-add" as="textarea" label="Additional requirements" maxLength={1000} value={v.additional} onChange={set('additional')} />
          </div>
        )}
        {step === 4 && (
          <div className="grid gap-5 md:grid-cols-2">
            <Select id="lf-ref" label="How did you hear about LAX360?" options={opts.referrals} value={v.referral} onChange={set('referral')} required={false} />
            <Select id="lf-meet" label="Preferred meeting type" options={opts.meeting_types} value={v.meeting_type} onChange={set('meeting_type')} required={false} />
            <FormField id="lf-mtime" label="Preferred meeting date or time" value={v.meeting_time} onChange={set('meeting_time')} maxLength={120} placeholder="e.g. Weekday mornings, or 15 Dec afternoon" className="md:col-span-2" />
            <div className="md:col-span-2">
              <p className="mb-1.5 text-sm font-bold">Project documents or reference files <span className="font-normal text-soft">(optional)</span></p>
              <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-edge-strong bg-glass p-4 text-center transition-colors hover:border-lav ${files.length >= opts.limits.files ? 'pointer-events-none opacity-60' : ''}`}>
                <Upload className="size-6 text-lav" aria-hidden="true" />
                <span className="font-semibold">Choose files to attach</span>
                <span className="text-sm text-soft">PDF, PNG, JPEG or WebP · up to {Math.round(opts.limits.file_bytes / 1024 / 1024)} MB each · up to {opts.limits.files} files. Please do not upload passwords, bank details or ID documents.</span>
                <input type="file" multiple accept={opts.limits.file_types.join(',')} className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
              </label>
              {busyFile && <p className="mt-2 flex items-center gap-2 text-sm text-soft" role="status"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Uploading {busyFile}…</p>}
              {fileError && <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-error" role="alert"><AlertCircle className="size-4 shrink-0" aria-hidden="true" />{fileError}</p>}
              {files.length > 0 && (
                <ul className="mt-3 space-y-2">{files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-glass px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-lav" aria-hidden="true" /><span className="truncate">{f.filename}</span><span className="shrink-0 text-soft">{Math.max(1, Math.round(f.size / 1024))} KB</span></span>
                    <button type="button" onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-glass-strong" aria-label={`Remove ${f.filename}`}><X className="size-4" aria-hidden="true" /></button>
                  </li>))}</ul>
              )}
            </div>
          </div>
        )}
        {step === 5 && (
          <div>
            <p className="mb-4 text-soft">Please check your details. Use “Edit” to change anything before you send.</p>
            <div className="space-y-3">
              {summary.map(([title, rows], i) => (
                <section key={title} className="rounded-2xl border border-edge bg-glass p-4">
                  <div className="flex items-center justify-between gap-3"><h3 className="font-display text-lg font-semibold">{title}</h3><button type="button" onClick={() => go(title === 'Meeting & files' ? 4 : i)} className="inline-flex min-h-11 items-center font-semibold text-lav hover:underline">Edit<span className="sr-only"> {title}</span></button></div>
                  <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[9rem_1fr]">{rows.filter(([, x]) => x).map(([k, x]) => <div key={k} className="contents"><dt className="text-soft">{k}</dt><dd className="whitespace-pre-wrap break-words">{x}</dd></div>)}</dl>
                </section>
              ))}
            </div>
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Leave this empty<input tabIndex={-1} autoComplete="off" value={v.trap} onChange={set('trap')} name="company_url" /></label></div>
            <label className="mt-5 flex items-start gap-3 text-sm text-soft">
              <input type="checkbox" checked={v.consent} onChange={set('consent')} aria-invalid={errors.consent ? 'true' : undefined} className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" />
              <span>I agree to LAX360 Pvt Ltd storing the details and documents I have given here and using them only to respond to this enquiry, prepare a proposal and follow up with me, as described in the <a href="/privacy" className="font-semibold text-fg underline">Privacy Policy</a>. I can ask for them to be deleted at any time.</span>
            </label>
            {errors.consent && <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-error"><AlertCircle className="size-4" aria-hidden="true" />{errors.consent}</p>}
            {state === 'error' && <p className="mt-4 flex items-center gap-2 rounded-xl border border-error/50 bg-error/10 p-3 font-semibold text-error" role="alert"><AlertCircle className="size-5 shrink-0" aria-hidden="true" />{message}</p>}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          {step > 0 ? <button type="button" onClick={() => go(step - 1)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-edge-strong px-6 font-semibold transition-colors hover:border-lav"><ArrowLeft className="size-4" aria-hidden="true" />Back</button> : <span />}
          {step < STEPS.length - 1
            ? <button type="submit" disabled={Boolean(busyFile)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--btn-hover)] disabled:opacity-60">Continue<ArrowRight className="size-4" aria-hidden="true" /></button>
            : <button type="submit" disabled={state === 'sending'} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--btn-hover)] disabled:opacity-60">
              {state === 'sending' && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}{state === 'sending' ? 'Sending…' : 'Submit enquiry'}</button>}
        </div>
      </form>
    </div>
  )
}
