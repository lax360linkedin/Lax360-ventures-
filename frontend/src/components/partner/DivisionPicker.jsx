import { useId } from 'react'
import { Check } from 'lucide-react'
import { usePartnerDivisions } from '../../hooks/usePartnerDivisions.js'
import { StatusBadge } from '../upcoming/UpcomingUI.jsx'

/**
 * Business-division multi-select for every partnership form (checkboxes, so it works the same with keyboard, touch and screen readers).
 *   value    = { divisions: string[] (slugs), other: boolean, otherText: string }
 *   "All Business Divisions" selects every available division (it is ticked whenever all of them are); each division can still be unticked, which unticks "All".
 *   "Others" reveals a text box for the visitor's own business interest (not part of "All").
 * The list comes from the admin panel (see usePartnerDivisions), so it follows divisions that are added, renamed or switched off.
 */
export const emptyDivisions = (divisions = []) => ({ divisions, other: false, otherText: '' })

export default function DivisionPicker({ value, onChange, error, otherError, legend = 'Business divisions of interest', hint = 'Choose one, several or all. You do not need a separate application for each.', idPrefix = 'dv' }) {
  const options = usePartnerDivisions()
  const uid = useId()
  const all = options.length > 0 && options.every((o) => value.divisions.includes(o.slug))
  const toggle = (slug) => onChange({ ...value, divisions: value.divisions.includes(slug) ? value.divisions.filter((s) => s !== slug) : [...value.divisions, slug] })
  const toggleAll = () => onChange({ ...value, divisions: all ? [] : options.map((o) => o.slug) })
  const toggleOther = () => onChange({ ...value, other: !value.other })

  const box = (checked) => (
    <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${checked ? 'border-transparent bg-primary text-white' : 'border-edge-strong bg-glass'}`}>{checked && <Check className="size-3.5" strokeWidth={3} />}</span>
  )
  const row = (id, checked, onToggle, label, extra = null, strong = false) => (
    <label key={id} htmlFor={id} className={`group flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-lav hover:-translate-y-px ${checked ? 'border-primary/60 bg-primary/10' : 'border-edge bg-glass hover:border-edge-strong'} ${strong ? 'sm:col-span-2' : ''}`}>
      <input id={id} type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
      {box(checked)}
      <span className={`flex-1 text-[0.9375rem] leading-snug ${strong ? 'font-semibold' : 'font-medium'}`}>{label}</span>
      {extra}
    </label>
  )

  return (
    <fieldset className="md:col-span-2" aria-describedby={`${uid}-hint`} aria-invalid={error ? 'true' : undefined}>
      <legend className="mb-1 text-sm font-semibold">{legend} <span className="text-error" aria-hidden="true">*</span></legend>
      <p id={`${uid}-hint`} className="mb-3 text-sm text-soft">{hint}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map((o) => row(`${idPrefix}-${o.slug}`, value.divisions.includes(o.slug), () => toggle(o.slug), o.label, o.statusLabel ? <StatusBadge status={o.status} /> : null))}
        {row(`${idPrefix}-all`, all, toggleAll, 'All Business Divisions', <span className="hidden text-xs text-soft sm:inline">selects every division above</span>, true)}
        {row(`${idPrefix}-other`, value.other, toggleOther, 'Others', null, true)}
      </div>
      {value.other && (
        <div className="mt-3">
          <label htmlFor={`${idPrefix}-other-text`} className="mb-1 block text-sm font-semibold">Your business division, service or partnership interest <span className="text-error" aria-hidden="true">*</span></label>
          <input id={`${idPrefix}-other-text`} type="text" maxLength={300} value={value.otherText} onChange={(e) => onChange({ ...value, otherText: e.target.value })} placeholder="For example: solar installation, a new city or a service you would like us to offer"
            aria-invalid={otherError ? 'true' : undefined} aria-describedby={otherError ? `${idPrefix}-other-err` : undefined} className={`h-12 w-full rounded-xl border bg-glass px-4 text-fg placeholder:text-soft/70 focus:border-lav focus:outline-none ${otherError ? 'border-error' : 'border-edge-strong'}`} />
          {otherError && <p id={`${idPrefix}-other-err`} role="alert" className="mt-1.5 text-sm font-medium text-error">{otherError}</p>}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-medium text-error">{error}</p>}
      <p className="mt-3 text-xs text-soft" aria-live="polite">{value.divisions.length + (value.other ? 1 : 0)} selected{options.some((o) => o.upcoming) ? '. Divisions marked Coming Soon or Under Development are not available yet: choosing them registers your interest only.' : '.'}</p>
    </fieldset>
  )
}
