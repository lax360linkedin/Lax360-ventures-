import FormField from '../ui/FormField.jsx'
import { CATEGORIES, INDUSTRIES, PURPOSES, STUDY_YEARS } from '../../data/registration.js'

const legend = 'mb-1 flex items-center gap-2 font-display text-lg font-semibold'
const step = 'inline-flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white'

/**
 * The two "tell us about you" sections shared by the sign-up form and the account page: who you are (with the fields of the chosen category only) and why you visit.
 * `values` / `errors` use the server's field names; `onChange(patch)` merges a change. `first` is the number shown on the first section heading (0 = no numbers).
 */
export default function DetailsSections({ values, errors, onChange, first = 0, idPrefix = 'd' }) {
  const set = (k) => (e) => onChange({ [k]: e.target.value })
  const id = (k) => `${idPrefix}-${k}`
  const togglePurpose = (code) => onChange({ purposes: values.purposes.includes(code) ? values.purposes.filter((c) => c !== code) : [...values.purposes, code] })
  const num = (n) => (first ? <span className={step} aria-hidden="true">{first + n}</span> : null)

  return (
    <>
      <fieldset className="space-y-4">
        <legend className={legend}>{num(0)} About you</legend>
        <p className="text-sm text-soft">Which of these describes you? We only ask for details that fit your choice.</p>
        <div role="radiogroup" aria-label="I am" aria-required="true" aria-invalid={errors.category ? 'true' : undefined} className="grid gap-3 sm:grid-cols-3">
          {CATEGORIES.map((c) => {
            const on = values.category === c.value
            return (
              <label key={c.value} className={`flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-3 text-left transition-colors focus-within:border-lav ${on ? 'border-primary bg-primary/10' : 'border-edge bg-glass hover:border-lav'}`}>
                <input type="radio" name={id('category')} value={c.value} checked={on} onChange={() => onChange({ category: c.value })} className="sr-only" />
                <span className="font-semibold">{c.label}</span>
                <span className="text-xs text-soft">{c.hint}</span>
              </label>
            )
          })}
        </div>
        {errors.category && <p role="alert" className="text-sm font-medium text-error">{errors.category}</p>}

        {values.category === 'student' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField className="sm:col-span-2" id={id('institution')} label="College / Institution name" required autoComplete="organization" value={values.institution} onChange={set('institution')} error={errors.institution} />
            <FormField id={id('course')} label="Course / Degree" required value={values.course} onChange={set('course')} error={errors.course} placeholder="e.g. B.E., B.Sc., MBA" />
            <FormField id={id('department')} label="Department / Specialization" required value={values.department} onChange={set('department')} error={errors.department} placeholder="e.g. Computer Science" />
            <FormField id={id('study_year')} label="Current year of study" required as="select" value={values.study_year} onChange={set('study_year')} error={errors.study_year}>
              <option value="">Select…</option>{STUDY_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </FormField>
          </div>
        )}
        {values.category === 'professional' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField className="sm:col-span-2" id={id('company')} label="Company name" required autoComplete="organization" value={values.company} onChange={set('company')} error={errors.company} />
            <FormField id={id('job_role')} label="Current job role / Designation" required autoComplete="organization-title" value={values.job_role} onChange={set('job_role')} error={errors.job_role} />
            <FormField id={id('industry')} label="Industry / Business sector" required list={id('industries')} value={values.industry} onChange={set('industry')} error={errors.industry} placeholder="Choose or type" />
            <datalist id={id('industries')}>{INDUSTRIES.map((i) => <option key={i} value={i} />)}</datalist>
            <FormField id={id('experience_years')} label="Years of experience" type="number" inputMode="numeric" min="0" max="60" value={values.experience_years} onChange={set('experience_years')} error={errors.experience_years} />
          </div>
        )}
        {values.category === 'other' && (
          <FormField id={id('other_details')} label="Tell us a little about yourself" maxLength={300} value={values.other_details} onChange={set('other_details')} error={errors.other_details} placeholder="e.g. Freelance designer, job seeker, business owner" hint="A line is enough: it helps us give you relevant information." />
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={legend}>{num(1)} What is your primary purpose for visiting LAX360? <span className="text-accent" aria-hidden="true">*</span></legend>
        <p className="text-sm text-soft">Choose one or more.</p>
        <div className="grid gap-2 sm:grid-cols-2" aria-invalid={errors.purposes ? 'true' : undefined}>
          {PURPOSES.map((p) => (
            <label key={p.value} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors focus-within:border-lav ${values.purposes.includes(p.value) ? 'border-primary bg-primary/10 font-semibold' : 'border-edge bg-glass hover:border-lav'}`}>
              <input type="checkbox" checked={values.purposes.includes(p.value)} onChange={() => togglePurpose(p.value)} className="size-4 shrink-0 accent-[rgb(var(--primary))]" />
              {p.label}
            </label>
          ))}
        </div>
        {errors.purposes && <p role="alert" className="text-sm font-medium text-error">{errors.purposes}</p>}
        <FormField id={id('purpose_note')} label="Anything else you would like us to know?" as="textarea" maxLength={500} value={values.purpose_note} onChange={set('purpose_note')} error={errors.purpose_note} className="pt-1" />
      </fieldset>
    </>
  )
}
