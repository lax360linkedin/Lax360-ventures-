import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import Button from '../ui/Button.jsx'
import FormField from '../ui/FormField.jsx'
import Reveal from '../ui/Reveal.jsx'
import DivisionPicker, { emptyDivisions } from './DivisionPicker.jsx'
import { CATEGORIES } from '../../data/partnership.js'
import { usePartnerDivisions } from '../../hooks/usePartnerDivisions.js'
import { submitApplication, usePartnerContent } from '../../services/partnershipService.js'
import { warmBackend } from '../../services/backendWake.js'
import { trackEvent } from '../../utils/analytics.js'

const CATEGORY_KEY = { franchise: 'franchise', 'authorized-partner': 'authorized', 'referral-partner': 'referral' } // the server stores the short names
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/

/** The request body for the partnership applications endpoint from a picker value. "All" is sent as a flag as well as the explicit list. */
export function divisionFields(value, options) {
  const all = options.length > 0 && options.every((o) => value.divisions.includes(o.slug))
  return { divisions: [...value.divisions, ...(value.other ? ['other'] : [])], all_divisions: all, other_interest: value.other ? value.otherText.trim() : undefined, division: value.divisions[0] || (value.other ? 'other' : '') }
}

/**
 * The partnership enquiry form at the bottom of every partnership page. The partnership type and business division of the page are preselected; the visitor can change them and choose
 * more divisions. It stores one application (the same record as the full application form), so an enquiry for several divisions is a single record in the admin panel.
 *   category = the page's partnership type slug ('franchise' | 'authorized-partner' | 'referral-partner'), division = the page's division slug. Both are optional (the hub has neither).
 */
export default function PartnerEnquiryForm({ category = '', division = '', id = 'partner-enquiry', title = 'Send a partnership enquiry', lead = 'Tell us which opportunities interest you. One enquiry can cover one, several or all business divisions.' }) {
  const { pathname } = useLocation()
  const options = usePartnerDivisions()
  const data = usePartnerContent()
  const [v, setV] = useState({ category: CATEGORIES.some((c) => c.slug === category) ? category : '', name: '', email: '', phone: '', country: 'India', city: '', message: '', consent: false, website: '' })
  const [dv, setDv] = useState(() => emptyDivisions(division ? [division] : []))
  const [errors, setErrors] = useState({})
  const [state, setState] = useState({ busy: false, error: '', done: null })
  const doneRef = useRef(null)
  const busy = useRef(false) // a second tap or Enter while a submission is in flight is ignored
  useEffect(() => { warmBackend() }, [])
  // the page's own type and division are the defaults again when the visitor moves to another partnership page
  useEffect(() => {
    setV((s) => ({ ...s, category: CATEGORIES.some((c) => c.slug === category) ? category : '' }))
    setDv(emptyDivisions(division ? [division] : []))
    setErrors({})
  }, [category, division, pathname])
  useEffect(() => { if (state.done) doneRef.current?.focus() }, [state.done])
  const closed = data && data.applications_open === false
  const cfg = data?.enquiry_form || {} // admin panel: Partnerships > Partnership settings (switch the form off, change its heading and introduction)
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })); if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined })) }

  const validate = () => {
    const e = {}
    if (!v.category) e.category = 'Choose a partnership type.'
    if (!dv.divisions.length && !dv.other) e.divisions = 'Choose at least one business division.'
    if (dv.other && !dv.otherText.trim()) e.other_interest = 'Tell us the business division, service or partnership interest you have in mind.'
    if (v.name.trim().length < 2) e.name = 'Enter your full name.'
    if (!EMAIL.test(v.email.trim())) e.email = 'Enter a valid e-mail address.'
    if (v.phone.replace(/\D/g, '').length < 8) e.phone = 'Enter a valid mobile number.'
    if (!v.country.trim()) e.country = 'Enter your country.'
    if (!v.consent) e.consent = 'Please agree so we can respond to your enquiry.'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (busy.current || state.busy) return
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) { document.getElementById(`${id}-form`)?.querySelector('[aria-invalid="true"]')?.focus(); return }
    busy.current = true
    setState({ busy: true, error: '', done: null })
    try {
      const out = await submitApplication({
        category: CATEGORY_KEY[v.category] || v.category, ...divisionFields(dv, options), full_name: v.name, email: v.email, phone: v.phone, country: v.country, city: v.city || undefined,
        consultation: v.message.trim() ? { message: v.message.trim() } : {}, consent_processing: v.consent, source_page: pathname.slice(0, 160), website: v.website, quick: true,
      })
      trackEvent('partner_enquiry', { partner_type: v.category, divisions: dv.divisions.length })
      setState({ busy: false, error: '', done: out })
    } catch (err) {
      if (err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, t]) => [k === 'full_name' ? 'name' : k.replace('answers.', ''), t])))
      setState({ busy: false, error: err.fields ? 'Please check the highlighted fields.' : ['timeout', 'network', 'backend_unavailable'].includes(err.code) ? 'The server is slow to respond or starting up. Your details have not been sent: please try again in a moment.' : err.message || 'Something went wrong. Please try again.', done: null })
    } finally { busy.current = false }
  }

  if (cfg.enabled === false) return null
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-40 border-t border-edge bg-glass/40">
      <div className="wrap grid gap-10 py-14 md:py-20 lg:grid-cols-12 lg:gap-14">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow mb-4 flex items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-accent to-transparent" />Partnership enquiry</p>
          <h2 id={`${id}-t`} className="h2">{cfg.title || title}</h2>
          <p className="lead mt-4 text-soft">{cfg.lead || lead}</p>
          <ul className="mt-6 space-y-3 text-sm text-soft">
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-lav" aria-hidden="true" />An enquiry is not an application for approval and does not make you a partner.</li>
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-lav" aria-hidden="true" />Prefer a longer form? Use the <Link to={`/partner-with-us/apply${category ? `?type=${category}${division ? `&division=${division}` : ''}` : ''}`} className="link-underline font-semibold">full application</Link>.</li>
          </ul>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-8">
          {state.done ? (
            <div ref={doneRef} tabIndex={-1} role="status" aria-live="polite" className="rounded-2xl border border-edge-strong bg-night p-6 text-center outline-none sm:p-10">
              <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
              <h3 className="mt-4 font-display text-2xl font-semibold">Enquiry received</h3>
              <p className="mt-3 text-soft">{state.done.message}</p>
              <p className="mt-5 inline-block rounded-xl border border-edge px-5 py-3"><span className="text-sm text-soft">Your reference</span><br /><strong className="font-display text-xl tracking-wide">{state.done.reference}</strong></p>
              {state.done.duplicate && <p className="mt-3 text-sm text-soft">We already had this enquiry from you, so no second record was made.</p>}
            </div>
          ) : (
            <form id={`${id}-form`} noValidate onSubmit={submit} className="rounded-2xl border border-edge-strong bg-night p-5 shadow-menu sm:p-8">
              <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={v.website} onChange={set('website')} /></label></div>
              {closed && <p role="alert" className="mb-5 rounded-xl border border-edge p-4 text-sm">Enquiries are not being accepted right now. Please use the <Link to="/contact?type=partnership" className="link-underline font-semibold">Contact page</Link>.</p>}
              <fieldset disabled={state.busy || closed} className="grid gap-5 md:grid-cols-2">
                <FormField id={`${id}-category`} as="select" label="Partnership type" required className="md:col-span-2" value={v.category} onChange={set('category')} error={errors.category}>
                  <option value="">Choose…</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.short}</option>)}
                </FormField>
                <DivisionPicker idPrefix={`${id}-dv`} value={dv} onChange={(x) => { setDv(x); setErrors((e) => ({ ...e, divisions: undefined, other_interest: undefined })) }} error={errors.divisions} otherError={errors.other_interest} />
                <FormField id={`${id}-name`} label="Full name" required autoComplete="name" value={v.name} onChange={set('name')} error={errors.name} />
                <FormField id={`${id}-email`} type="email" label="E-mail address" required autoComplete="email" value={v.email} onChange={set('email')} error={errors.email} />
                <FormField id={`${id}-phone`} type="tel" label="Mobile number" required autoComplete="tel" inputMode="tel" value={v.phone} onChange={set('phone')} error={errors.phone} />
                <FormField id={`${id}-country`} label="Country" required autoComplete="country-name" value={v.country} onChange={set('country')} error={errors.country} />
                <FormField id={`${id}-city`} label="City" autoComplete="address-level2" className="md:col-span-2" value={v.city} onChange={set('city')} error={errors.city} />
                <FormField id={`${id}-message`} as="textarea" label="Message" maxLength={1000} className="md:col-span-2" value={v.message} onChange={set('message')} error={errors.message} hint="Optional. Anything that helps us respond, such as your location or experience." />
                <div className="md:col-span-2">
                  <label className="flex gap-3"><input type="checkbox" checked={v.consent} onChange={set('consent')} className="mt-1 size-5 shrink-0" aria-invalid={errors.consent ? 'true' : undefined} /><span className="text-sm text-soft">I agree that LAX360 may use these details to respond to my enquiry. See the <Link to="/partner-with-us/privacy-policy" target="_blank" rel="noopener noreferrer" className="link-underline">partnership privacy notice</Link>.</span></label>
                  {errors.consent && <p role="alert" className="mt-1.5 text-sm font-medium text-error">{errors.consent}</p>}
                </div>
              </fieldset>
              {state.error && <p role="alert" className="mt-5 rounded-xl border border-error/40 p-3 text-sm font-medium text-error">{state.error}</p>}
              <div className="mt-6"><Button type="submit" arrow loading={state.busy} disabled={closed} className="w-full sm:w-auto">{state.busy ? 'Sending…' : 'Send enquiry'}</Button></div>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  )
}
