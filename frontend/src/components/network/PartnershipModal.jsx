import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import FormField from '../ui/FormField.jsx'
import { partnershipCategories } from '../../data/partnerships.js'
import { submitEnquiry } from '../../services/enquiryService.js'
import { EMAIL } from '../../utils/validators.js'

const PHONE = /^\+?[0-9][0-9\s().-]{6,19}$/
const blank = { name: '', company: '', email: '', phone: '', country: '', state: '', city: '', website: '', category: 'franchise', background: '', interest: '', message: '', consent: false, trap: '' }

function validate(v) {
  const e = {}
  if (v.name.trim().length < 2) e.name = 'Enter your full name.'
  if (v.company.trim().length < 2) e.company = 'Enter your company or organisation name.'
  if (!EMAIL.test(v.email.trim())) e.email = 'Enter a valid email address.'
  if (!PHONE.test(v.phone.trim())) e.phone = 'Enter a valid mobile number, e.g. +91 98765 43210.'
  if (v.country.trim().length < 2) e.country = 'Enter your country.'
  if (v.state.trim().length < 2) e.state = 'Enter your state.'
  if (v.city.trim().length < 2) e.city = 'Enter your city.'
  if (v.website.trim() && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(v.website.trim())) e.website = 'Enter the full address, starting with https://'
  if (v.background.trim().length < 10) e.background = 'Tell us a little about your business background (at least 10 characters).'
  if (v.interest.trim().length < 10) e.interest = 'Tell us what you are interested in (at least 10 characters).'
  if (!v.consent) e.consent = 'Please agree so we can respond to your enquiry.'
  return e
}

/**
 * A partnership enquiry in a modal dialog (the native <dialog>: focus is trapped, Escape closes it). The category chosen on the card is preselected.
 * No account is needed. It uses the website's existing enquiry API: the enquiry is stored in the database and appears in the admin panel under
 * Enquiries (type "Partnership: ..."). The hidden "company_url" input is the spam trap; the API also rate-limits and rejects repeats.
 */
export default function PartnershipModal({ category, onClose }) {
  const ref = useRef(null)
  const [v, setV] = useState({ ...blank, category })
  const [errors, setErrors] = useState({})
  const [state, setState] = useState('idle') // idle | sending | done | duplicate | error
  const [message, setMessage] = useState('')
  const cat = partnershipCategories.find((c) => c.id === v.category) || partnershipCategories[0]
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = '' } // the dialog leaves the page with the component; closing it here would fire onClose again
  }, [])
  useEffect(() => { setV((x) => ({ ...x, category })) }, [category])

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(v)
    setErrors(found)
    if (Object.keys(found).length) { setState('idle'); return }
    setState('sending')
    const extra = Object.fromEntries(Object.entries({
      partnership_category: cat.label, country: v.country, state: v.state, city: v.city, website: v.website, business_background: v.background, additional_message: v.message,
    }).map(([k, x]) => [k, String(x || '').trim()]).filter(([, x]) => x))
    try {
      const res = await submitEnquiry({ type: cat.type, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), company: v.company.trim(), message: v.interest.trim(), extra, consent: v.consent, website: v.trap, source: 'our-network' })
      setState(res.duplicate ? 'duplicate' : 'done')
    } catch (err) {
      if (err.fields) setErrors((prev) => ({ ...prev, ...err.fields }))
      setMessage(err.message || 'Something went wrong. Please try again or contact us directly.')
      setState('error')
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose() }} aria-labelledby="pm-title"
      className="m-auto max-h-[92dvh] w-[min(46rem,calc(100vw-1.5rem))] overflow-y-auto rounded-3xl border border-edge-strong bg-night p-0 text-fg shadow-menu backdrop:bg-black/60 backdrop:backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-edge bg-night/95 px-6 py-4 backdrop-blur md:px-8">
        <div>
          <p className="eyebrow text-lav">Partnership enquiry</p>
          <h2 id="pm-title" className="mt-1 font-display text-2xl font-semibold leading-tight">{cat.title}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close the enquiry form" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-edge-strong transition-colors hover:border-lav"><X className="size-5" aria-hidden="true" /></button>
      </div>
      <div className="px-6 py-6 md:px-8">
        {state === 'done' || state === 'duplicate' ? (
          <div className="py-8 text-center" role="status">
            <CheckCircle2 className="mx-auto size-12 text-lav" aria-hidden="true" />
            <p className="mt-4 font-display text-3xl font-semibold">{state === 'duplicate' ? 'We already have this enquiry.' : 'Thank you — your enquiry has been received.'}</p>
            <p className="mx-auto mt-3 max-w-md text-lg text-soft">{state === 'duplicate' ? 'You sent this same enquiry recently, so it was not stored twice. Our team will follow up.' : 'Our team will review your details and get in touch to discuss next steps. Receiving an enquiry does not mean a partnership has been agreed.'}</p>
            <button type="button" onClick={onClose} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-7 font-semibold text-white">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative grid gap-5 md:grid-cols-2" aria-label="Partnership enquiry">
            <FormField id="pm-cat" as="select" label="Partnership category" required value={v.category} onChange={set('category')} className="md:col-span-2">
              {partnershipCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </FormField>
            <FormField id="pm-name" label="Full name" required autoComplete="name" value={v.name} onChange={set('name')} error={errors.name} />
            <FormField id="pm-company" label="Company / organisation name" required autoComplete="organization" value={v.company} onChange={set('company')} error={errors.company} />
            <FormField id="pm-email" label="Email address" required type="email" autoComplete="email" value={v.email} onChange={set('email')} error={errors.email} />
            <FormField id="pm-phone" label="Mobile number" required type="tel" autoComplete="tel" value={v.phone} onChange={set('phone')} error={errors.phone} />
            <FormField id="pm-country" label="Country" required autoComplete="country-name" value={v.country} onChange={set('country')} error={errors.country} />
            <FormField id="pm-state" label="State" required autoComplete="address-level1" value={v.state} onChange={set('state')} error={errors.state} />
            <FormField id="pm-city" label="City" required autoComplete="address-level2" value={v.city} onChange={set('city')} error={errors.city} />
            <FormField id="pm-site" label="Website" type="url" placeholder="https://" value={v.website} onChange={set('website')} error={errors.website} />
            <FormField id="pm-bg" as="textarea" label="Business background" required maxLength={1500} value={v.background} onChange={set('background')} error={errors.background} hint="What does your business do, and for how long?" className="md:col-span-2" />
            <FormField id="pm-interest" as="textarea" label="Partnership interest / requirements" required maxLength={1500} value={v.interest} onChange={set('interest')} error={errors.interest} hint="What would you like to achieve through this partnership?" className="md:col-span-2" />
            <FormField id="pm-msg" as="textarea" label="Additional message" maxLength={1500} value={v.message} onChange={set('message')} className="md:col-span-2" />
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Leave this empty<input tabIndex={-1} autoComplete="off" value={v.trap} onChange={set('trap')} name="company_url" /></label></div>
            <div className="md:col-span-2">
              <label className="flex items-start gap-3 text-sm text-soft">
                <input type="checkbox" checked={v.consent} onChange={set('consent')} aria-invalid={errors.consent ? 'true' : undefined} className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" />
                <span>I agree to LAX360 using these details to respond to my enquiry, as described in the <a href="/privacy" className="font-semibold text-fg underline">Privacy Policy</a>.</span>
              </label>
              {errors.consent && <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-error"><AlertCircle className="size-4" aria-hidden="true" />{errors.consent}</p>}
            </div>
            {state === 'error' && <p className="flex items-center gap-2 rounded-xl border border-error/50 bg-error/10 p-3 font-semibold text-error md:col-span-2" role="alert"><AlertCircle className="size-5 shrink-0" aria-hidden="true" />{message}</p>}
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <button type="submit" disabled={state === 'sending'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--btn-hover)] disabled:cursor-not-allowed disabled:opacity-60">
                {state === 'sending' && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}{state === 'sending' ? 'Sending…' : 'Submit enquiry'}
              </button>
              <button type="button" onClick={onClose} className="inline-flex min-h-12 items-center rounded-full border border-edge-strong px-6 font-semibold transition-colors hover:border-lav">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  )
}
