import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import FormField from '../components/ui/FormField.jsx'
import { Crumbs, PartnerHero } from '../components/partner/PartnerUI.jsx'
import { CATEGORIES, DIVISIONS, PARTNER_PAGES } from '../data/partnership.js'
import { branches } from '../data/branches.js'
import { submitApplication, useDivisionItems, usePartnerContent } from '../services/partnershipService.js'
import { warmBackend } from '../services/backendWake.js'
import { trackEvent } from '../utils/analytics.js'

const meta = PARTNER_PAGES.apply
const CATEGORY_KEY = { franchise: 'franchise', 'authorized-partner': 'authorized', 'referral-partner': 'referral' } // the server stores the short names
const STEPS = ['Opportunity', 'Your details', 'Business', 'Partnership', 'Consultation', 'Review']
const EMPTY = { category: '', division: '', preferred_location: '', preferred_branch: '', full_name: '', email: '', phone: '', country: 'India', state: '', city: '', occupation: '', entity_type: 'individual', organization: '', industry: '', years_experience: '', office_available: '', relevant_experience: '',
  proposed_location: '', franchise_interest: '', investment_budget: '', business_experience: '', start_date: '', existing_infrastructure: '', participation: '', additional_info: '', customer_network: '', sales_experience: '', preferred_products: '', target_segment: '', operating_region: '',
  professional_background: '', areas_of_interest: '', referral_network: '', preferred_services: '', expected_categories: '', c_date: '', c_time: '', c_method: 'phone', c_mode: 'online', c_message: '', consent_processing: false, consent_marketing: false, website: '' }
const ANSWER_FIELDS = ['franchise_interest', 'industry', 'years_experience', 'office_available', 'relevant_experience', 'proposed_location', 'investment_budget', 'business_experience', 'start_date', 'existing_infrastructure', 'participation', 'additional_info', 'customer_network', 'sales_experience',
  'preferred_products', 'target_segment', 'operating_region', 'professional_background', 'areas_of_interest', 'referral_network', 'preferred_services', 'expected_categories']
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/

function stepErrors(step, v) {
  const e = {}
  if (step === 0) { if (!v.category) e.category = 'Choose a partnership type.'; if (!v.division) e.division = 'Choose a business division.' }
  if (step === 1) {
    if (v.full_name.trim().length < 2) e.full_name = 'Enter your full name.'
    if (!EMAIL.test(v.email.trim())) e.email = 'Enter a valid e-mail address.'
    if (v.phone.replace(/\D/g, '').length < 8) e.phone = 'Enter a valid mobile number.'
    if (!v.country.trim()) e.country = 'Select your country.'
  }
  if (step === 2 && v.entity_type === 'organization' && !v.organization.trim()) e.organization = 'Enter the organization name.'
  if (step === 3 && v.category === 'franchise' && !v.proposed_location.trim()) e.proposed_location = 'Tell us where you would like to operate.'
  if (step === 5 && !v.consent_processing) e.consent_processing = 'Please agree so we can respond to your enquiry.'
  return e
}

export default function PartnerApply() {
  const [params] = useSearchParams()
  const data = usePartnerContent()
  const topRef = useRef(null)
  const [step, setStep] = useState(0)
  const [v, setV] = useState(() => ({ ...EMPTY, category: CATEGORIES.some((c) => c.slug === params.get('type')) ? params.get('type') : '', division: /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/.test(params.get('division') || '') ? params.get('division') : '' })) // the server checks it against the live menu (administrators can add divisions)
  const options = useDivisionItems(CATEGORIES.some((c) => c.slug === v.category) ? v.category : 'franchise')
  const optionLabel = (slug) => options.find((o) => o.slug === slug)?.label || DIVISIONS.find((d) => d.slug === slug)?.long
  const [errors, setErrors] = useState({})
  const [state, setState] = useState({ busy: false, error: '', done: null })
  useEffect(() => { warmBackend() }, [])
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })); if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined })) }
  const cat = v.category
  const go = (n) => { setStep(n); setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30) }
  const next = () => { const e = stepErrors(step, v); setErrors(e); if (!Object.keys(e).length) go(step + 1) }
  const closed = data && data.applications_open === false

  const submit = async () => {
    const all = Object.assign({}, ...[0, 1, 2, 3, 5].map((s) => stepErrors(s, v)))
    if (Object.keys(all).length) { setErrors(all); const first = [0, 1, 2, 3, 5].find((s) => Object.keys(stepErrors(s, v)).length); go(first); return }
    setState({ busy: true, error: '', done: null })
    const answers = Object.fromEntries(ANSWER_FIELDS.filter((k) => String(v[k]).trim()).map((k) => [k, v[k]]))
    const body = { category: CATEGORY_KEY[v.category] || v.category, division: v.division, full_name: v.full_name, email: v.email, phone: v.phone, country: v.country, state: v.state, city: v.city, occupation: v.occupation, entity_type: v.entity_type, organization: v.organization,
      preferred_location: v.preferred_location, preferred_branch: v.preferred_branch, answers, consultation: { date: v.c_date || undefined, time: v.c_time || undefined, method: v.c_method, mode: v.c_mode, message: v.c_message || undefined },
      consent_processing: v.consent_processing, consent_marketing: v.consent_marketing, source_page: `${window.location.pathname}`.slice(0, 160), website: v.website }
    try {
      const out = await submitApplication(body) // success is shown only after the server confirms the application is stored
      trackEvent('partner_application', { partner_type: v.category, division: v.division })
      setState({ busy: false, error: '', done: out })
    } catch (err) {
      if (err.fields) { const m = {}; Object.entries(err.fields).forEach(([k, t]) => { m[k.replace('answers.', '')] = t }); setErrors(m); go(1) }
      setState({ busy: false, error: err.fields ? 'Please check the highlighted fields.' : err.code === 'timeout' || err.code === 'network' || err.code === 'backend_unavailable' ? 'The server is slow to respond or starting up. Your details have not been lost on this page: please wait a moment and press Submit again.' : err.message, done: null })
    }
  }

  const summary = useMemo(() => [['Partnership', CATEGORIES.find((c) => c.slug === v.category)?.short], ['Division', optionLabel(v.division)], ['Name', v.full_name], ['E-mail', v.email], ['Mobile', v.phone], ['Location', [v.city, v.state, v.country].filter(Boolean).join(', ')],
    ['Preferred meeting', [v.c_date, v.c_time].filter(Boolean).join(' ') || 'Not specified']].filter(([, x]) => x), [v])
  const text = (k, label, extra = {}) => <FormField id={`pa-${k}`} label={label} value={v[k]} onChange={set(k)} error={errors[k]} {...extra} />
  const area = (k, label, extra = {}) => <FormField id={`pa-${k}`} as="textarea" label={label} value={v[k]} onChange={set(k)} error={errors[k]} maxLength={600} className="md:col-span-2" {...extra} />

  if (state.done) {
    return (
      <PageContainer path={meta.path} title={meta.seoTitle} description={meta.seoDescription} noindex>
        <section className="wrap py-20" role="status" aria-live="polite"><div className="mx-auto max-w-2xl text-center">
          <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
          <h1 className="h2 mt-5">Application received</h1>
          <p className="lead mt-4 text-soft">{state.done.message}</p>
          <p className="mt-6 rounded-xl border border-edge p-4"><span className="text-sm text-soft">Your application reference</span><br /><strong className="font-display text-2xl tracking-wide">{state.done.reference}</strong></p>
          <p className="mt-5 text-sm text-soft">Please keep this reference. Submitting this form does not make you a partner: approval follows consultation, verification and an agreement.{state.done.duplicate ? ' We already had an application from you for this program, so we did not create a second one.' : ''}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button to="/partner-with-us">Back to Partner With Us</Button><Button to="/" variant="secondary">Go to the home page</Button></div>
        </div></section>
      </PageContainer>
    )
  }

  return (
    <PageContainer path={meta.path} title={meta.seoTitle} description={meta.seoDescription} noindex={false}>
      <PartnerHero eyebrow="Partner With Us" title="Become a Partner" accent="#6d5efc" lead="Tell us about yourself and the opportunity you are interested in. This is an enquiry: it does not make you a partner, and no documents or identity numbers are needed at this stage." />
      <Crumbs items={[{ label: 'Home', to: '/' }, { label: 'Partner With Us', to: '/partner-with-us' }, { label: 'Apply' }]} />
      <section ref={topRef} aria-labelledby="form-t" className="wrap scroll-mt-32 py-10 md:py-14">
        <h2 id="form-t" className="sr-only">Partnership application form</h2>
        {closed && <p role="alert" className="mb-6 rounded-xl border border-edge p-4">Applications are not being accepted right now. Please contact us through the <Link to="/contact?type=partnership" className="link-underline font-semibold">Contact page</Link>.</p>}
        <ol className="mb-8 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Application steps">{STEPS.map((s, i) => <li key={s} aria-current={i === step ? 'step' : undefined} className={`border-t-4 pt-2 text-xs font-semibold ${i < step ? 'border-primary text-fg' : i === step ? 'border-primary text-fg' : 'border-edge text-soft'}`}>{i + 1}. {s}</li>)}</ol>
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (step < 5) next(); else submit() }} className="mx-auto max-w-3xl">
          <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={v.website} onChange={set('website')} /></label></div>
          <fieldset disabled={state.busy || closed} className="grid gap-5 md:grid-cols-2">
            {step === 0 && <>
              <legend className="h3 mb-2 md:col-span-2">Select your opportunity</legend>
              <FormField id="pa-category" as="select" label="Partnership type" required value={v.category} onChange={set('category')} error={errors.category}><option value="">Choose…</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.short}</option>)}</FormField>
              <FormField id="pa-division" as="select" label="Business division" required value={v.division} onChange={set('division')} error={errors.division}><option value="">Choose…</option>{options.map((d) => <option key={d.slug} value={d.slug}>{DIVISIONS.find((x) => x.slug === d.slug)?.long || d.label}</option>)}{v.division && !options.some((d) => d.slug === v.division) && <option value={v.division}>{optionLabel(v.division) || v.division}</option>}</FormField>
              {text('preferred_location', 'Preferred location (city or area)', { required: false, className: 'md:col-span-2' })}
              <FormField id="pa-branch" as="select" label="Nearest LAX360 office" className="md:col-span-2" value={v.preferred_branch} onChange={set('preferred_branch')} hint="Final assignment is made by LAX360."><option value="">No preference</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.city}</option>)}</FormField>
            </>}
            {step === 1 && <>
              <legend className="h3 mb-2 md:col-span-2">Your details</legend>
              {text('full_name', 'Full name', { required: true, autoComplete: 'name' })}
              {text('email', 'E-mail address', { required: true, type: 'email', autoComplete: 'email' })}
              {text('phone', 'Mobile number', { required: true, type: 'tel', autoComplete: 'tel', inputMode: 'tel' })}
              {text('country', 'Country', { required: true, autoComplete: 'country-name' })}
              {text('state', 'State', { autoComplete: 'address-level1' })}
              {text('city', 'City', { autoComplete: 'address-level2' })}
              {text('occupation', 'Current occupation', { className: 'md:col-span-2' })}
            </>}
            {step === 2 && <>
              <legend className="h3 mb-2 md:col-span-2">Business details</legend>
              <FormField id="pa-entity" as="select" label="Applying as" required value={v.entity_type} onChange={set('entity_type')}><option value="individual">An individual</option><option value="organization">An organization</option></FormField>
              {v.entity_type === 'organization' ? text('organization', 'Organization name', { required: true }) : <div />}
              {text('industry', 'Industry')}
              {text('years_experience', 'Years of experience')}
              <FormField id="pa-office" as="select" label="Do you have an office available?" value={v.office_available} onChange={set('office_available')}><option value="">Prefer not to say</option><option value="yes">Yes</option><option value="no">No</option></FormField>
              <div className="hidden md:block" />
              {area('relevant_experience', 'Relevant professional experience')}
            </>}
            {step === 3 && <>
              <legend className="h3 mb-2 md:col-span-2">{cat === 'franchise' ? 'Franchise questions' : cat === 'authorized-partner' ? 'Authorized partner questions' : cat === 'referral-partner' ? 'Referral partner questions' : 'Partnership questions'}</legend>
              {!cat && <p className="md:col-span-2 text-soft">Go back to step 1 and choose a partnership type first.</p>}
              {cat === 'franchise' && <>
                {text('proposed_location', 'Proposed franchise location', { required: true })}
                {v.division === 'education' && <FormField id="pa-interest" as="select" label="Franchise interest" value={v.franchise_interest} onChange={set('franchise_interest')}><option value="">Choose…</option><option value="IT courses">IT Courses</option><option value="Non-IT courses">Non-IT Courses</option><option value="Both IT and Non-IT">Both IT &amp; Non-IT</option></FormField>}
                {text('investment_budget', 'Investment budget you have in mind', { hint: 'Optional. LAX360 franchise investment is not yet finalised and is discussed in consultation.' })}
                {text('start_date', 'Expected business start date')}
                <FormField id="pa-part" as="select" label="Your role" value={v.participation} onChange={set('participation')}><option value="">Choose…</option><option value="operator">Active business operator</option><option value="investor">Investor</option><option value="both">Both</option></FormField>
                {area('business_experience', 'Business experience')}
                {area('existing_infrastructure', 'Existing infrastructure (premises, equipment, team)')}
                {area('additional_info', 'Anything else we should know')}
              </>}
              {cat === 'authorized-partner' && <>
                {area('customer_network', 'Your existing customer network')}
                {area('business_experience', 'Relevant business experience')}
                {area('sales_experience', 'Sales experience')}
                {text('preferred_products', 'Preferred products or services')}
                {text('target_segment', 'Target customer segment')}
                {text('operating_region', 'Expected operating region', { className: 'md:col-span-2' })}
              </>}
              {cat === 'referral-partner' && <>
                {area('professional_background', 'Professional background')}
                {text('areas_of_interest', 'Areas of interest')}
                {text('preferred_services', 'Preferred services')}
                {area('referral_network', 'Your referral network')}
                {text('expected_categories', 'Expected referral categories', { className: 'md:col-span-2' })}
              </>}
            </>}
            {step === 4 && <>
              <legend className="h3 mb-2 md:col-span-2">Consultation preferences</legend>
              <p className="md:col-span-2 -mt-2 text-sm text-soft">A preferred time is a request, not a confirmed booking. We will contact you to agree a time.</p>
              <FormField id="pa-cdate" type="date" label="Preferred meeting date" value={v.c_date} onChange={set('c_date')} min={new Date().toISOString().slice(0, 10)} />
              {text('c_time', 'Preferred time', { placeholder: 'For example, 11:00 AM' })}
              <FormField id="pa-cmethod" as="select" label="Preferred contact method" value={v.c_method} onChange={set('c_method')}><option value="phone">Phone call</option><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option></FormField>
              <FormField id="pa-cmode" as="select" label="Meeting preference" value={v.c_mode} onChange={set('c_mode')}><option value="online">Online</option><option value="offline">In person</option></FormField>
              {area('c_message', 'Additional message', { required: false })}
            </>}
            {step === 5 && <>
              <legend className="h3 mb-2 md:col-span-2">Review and submit</legend>
              <dl className="md:col-span-2 divide-y divide-edge rounded-xl border border-edge">{summary.map(([k, x]) => <div key={k} className="grid gap-1 p-3 sm:grid-cols-3"><dt className="font-semibold">{k}</dt><dd className="text-soft sm:col-span-2">{x}</dd></div>)}</dl>
              <p className="md:col-span-2 text-sm text-soft">We use these details only to respond to your enquiry. Read the <Link to="/partner-with-us/privacy-policy" className="link-underline" target="_blank">partnership privacy notice</Link> and the <Link to="/privacy" className="link-underline" target="_blank">LAX360 Privacy Policy</Link>. We do not ask for identity documents at this stage.</p>
              <label className="md:col-span-2 flex gap-3"><input type="checkbox" checked={v.consent_processing} onChange={set('consent_processing')} className="mt-1 size-5 shrink-0" aria-invalid={errors.consent_processing ? 'true' : undefined} /><span>I agree that LAX360 may process my details to respond to this enquiry. <span className="text-accent" aria-hidden="true">*</span></span></label>
              {errors.consent_processing && <p role="alert" className="md:col-span-2 text-sm font-medium text-error">{errors.consent_processing}</p>}
              <label className="md:col-span-2 flex gap-3"><input type="checkbox" checked={v.consent_marketing} onChange={set('consent_marketing')} className="mt-1 size-5 shrink-0" /><span className="text-soft">Optional: I would also like to receive news and offers from LAX360.</span></label>
            </>}
          </fieldset>
          {state.error && <p role="alert" className="mt-5 rounded-xl border border-error/40 p-3 text-sm font-medium text-error">{state.error}</p>}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" type="button" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0 || state.busy}>Back</Button>
            <Button type="submit" loading={state.busy} disabled={closed}>{step < 5 ? 'Continue' : 'Submit application'}</Button>
          </div>
        </form>
      </section>
    </PageContainer>
  )
}
