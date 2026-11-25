import { Link } from 'react-router-dom'
import { Block, Checklist, Facts } from './PartnerUI.jsx'
import { CoursesButton } from './CourseCatalogue.jsx'
import { EDUR } from '../../data/educationReferral.js'
import { EDU } from '../../data/educationFranchise.js'
import { IT_COURSES, NON_IT_COURSES, NON_IT_DESCRIPTION } from '../../data/educationCourses.js'

// In-page navigation of the Education Referral Partner page, in page order. PartnerOpportunity inserts "Responsibilities" between the two lists.
export const EDUR_NAV_A = [['about', 'About'], ['who', 'Who can join'], ['models', 'Partner models'], ['courses', 'Courses & services'], ['commission', 'Commission'], ['benefits', 'Benefits'], ['branding', 'Branding kit'], ['process', 'How it works'], ['tracking', 'Tracking']]
export const EDUR_NAV_B = [['agreement', 'Agreement'], ['why', 'Why partner'], ['application', 'Apply']]

/** Part A: introduction to referral tracking. Content is LAX360's own supplied text (see data/educationReferral.js). `published` holds commercial values an administrator has published. */
export function EducationReferralA({ accent, published = {} }) {
  const e = EDUR
  const extra = [published.registration_fee && ['Registration fee', published.registration_fee], published.commission_model && ['Commission', published.commission_model]].filter(Boolean)
  return (
    <>
      <Block id="about" eyebrow="LAX360 Education" title={e.about.tagline}>
        <div className="grid gap-10 lg:grid-cols-12"><div className="space-y-5 text-lg leading-relaxed text-soft lg:col-span-7">{e.about.paragraphs.map((p) => <p key={p}>{p}</p>)}</div>
          <div className="lg:col-span-5"><h3 className="eyebrow mb-3 text-soft">Our partnership vision</h3><Checklist items={e.about.vision} accent={accent} /></div></div>
      </Block>
      <Block id="who" eyebrow="Eligibility" title="Who can become a referral partner?" tint>
        <ul className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-3">{e.who.map(([t, d]) => <li key={t} className="bg-bg p-5"><p className="font-display text-lg font-semibold">{t}</p><p className="mt-1 text-sm text-soft">{d}</p></li>)}</ul>
      </Block>
      <Block id="models" eyebrow="Referral partnership models" title="Choose the model that matches your role" lead="We offer different partnership models based on the partner's role and activities.">
        <div className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-2 lg:grid-cols-3">
          {e.models.map((m) => (
            <article key={m.id} className="bg-bg p-6">
              <p className="eyebrow" style={{ color: accent }}>Model {m.id} · {m.tag}</p><h3 className="mt-1 font-display text-xl font-semibold">{m.name}</h3>
              <div className="mt-4"><Checklist items={m.items} accent={accent} /></div>
            </article>
          ))}
        </div>
      </Block>
      <Block id="courses" eyebrow="Products and services for referral" title="LAX360 Education products and services" lead={e.programmes.lead} tint>
        <div className="mb-8"><CoursesButton accent={accent} /></div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-2">
          <div className="bg-bg p-6"><h3 className="font-display text-xl font-semibold">A. IT training programmes</h3><p className="mt-1 text-sm text-soft">Software, programming, AI and technology training.</p>
            <ol className="mt-4 columns-1 gap-8 sm:columns-2">{IT_COURSES.map((c) => <li key={c.no} value={c.no} className="break-inside-avoid py-0.5 text-[0.9375rem]"><span className="mr-2 inline-block w-6 text-right font-semibold tabular-nums text-soft">{c.no}.</span>{c.name}</li>)}</ol></div>
          <div className="bg-bg p-6"><h3 className="font-display text-xl font-semibold">B. Non-IT training programmes</h3><p className="mt-1 text-sm text-soft">{NON_IT_DESCRIPTION}</p>
            {NON_IT_COURSES.length ? <ol className="mt-4 space-y-1">{NON_IT_COURSES.map((c, i) => <li key={c}>{i + 1}. {c}</li>)}</ol> : <p className="mt-4 text-soft">The individual Non-IT course list has not been published yet. Ask our team for the current catalogue.</p>}</div>
        </div>
        <h3 className="mt-10 font-display text-xl font-semibold">C. Additional services</h3><div className="mt-3"><Checklist items={e.programmes.services} accent={accent} cols /></div>
        <p className="mt-4 text-sm text-soft">{e.programmes.note}</p>
      </Block>
      <Block id="commission" eyebrow="Referral commission" title="Referral commission structure" lead={e.commission.lead}>
        <Facts rows={[...e.commission.rows, ...extra]} /><p className="mt-3 text-sm text-soft">{e.commission.note}</p>
        <h3 className="mt-10 font-display text-xl font-semibold">{e.commission.policyTitle}</h3><p className="mt-1 text-soft">{e.commission.policyLead}</p>
        <ol className="mt-4 grid gap-x-10 gap-y-2 md:grid-cols-2">{e.commission.policy.map((t, i) => <li key={t} className="flex gap-3"><span className="w-6 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span><span>{t}</span></li>)}</ol>
        <p className="mt-6 rounded-lg border border-edge p-4 text-sm"><strong>{e.commission.payout[0]}:</strong> {e.commission.payout[1]}</p>
      </Block>
      <Block id="benefits" eyebrow="Benefits" title="Referral partner benefits" lead="LAX360 Education provides the following benefits to approved referral partners." tint>
        <ol className="grid gap-x-10 gap-y-2 md:grid-cols-2">{e.benefits.map((t, i) => <li key={t} className="flex gap-3"><span className="w-6 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span><span>{t}</span></li>)}</ol>
      </Block>
      <Block id="branding" eyebrow="Official partner resources" title="Referral partner branding kit" lead={e.branding.lead}><Facts rows={e.branding.rows} /><p className="mt-4 text-sm text-soft">{e.branding.note}</p></Block>
      <Block id="process" eyebrow="Referral process" title="How it works" lead="Submitting an application is an enquiry. It does not make you a partner." tint>
        <ol className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-3">
          {e.process.map(([t, d], i) => <li key={t} className="bg-bg p-5"><span className="font-display text-3xl font-semibold tabular-nums" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span><p className="mt-2 font-semibold leading-snug">{t}</p><p className="mt-1 text-sm text-soft">{d}</p></li>)}
        </ol>
      </Block>
      <Block id="tracking" eyebrow="Referral tracking and partner dashboard" title="Referral tracking and partner dashboard" lead={e.tracking.lead}>
        <Facts rows={e.tracking.rows} />
        <h3 className="mt-8 font-display text-xl font-semibold">Suggested referral statuses</h3>
        <ol className="mt-4 flex flex-wrap gap-2">{e.tracking.statuses.map((s, i) => <li key={s} className="inline-flex items-center gap-2 rounded-full border border-edge px-3 py-1.5 text-sm"><span className="font-semibold tabular-nums text-soft">{i + 1}</span>{s}</li>)}</ol>
        <p className="mt-4 text-sm text-soft">{e.tracking.note}</p>
      </Block>
    </>
  )
}

/** Part B: agreement, why partner, application details, contact. */
export function EducationReferralB({ accent }) {
  const e = EDUR
  return (
    <>
      <Block id="agreement" eyebrow="Referral partnership agreement" title="Important terms" lead={e.agreement.lead} tint>
        <h3 className="font-display text-xl font-semibold">The agreement should include</h3>
        <ol className="mt-4 grid gap-x-10 gap-y-2 md:grid-cols-2">{e.agreement.items.map((t, i) => <li key={t} className="flex gap-3"><span className="w-6 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span><span>{t}</span></li>)}</ol>
        <p className="mt-6 rounded-lg border border-edge p-4 text-sm font-semibold">Important: {e.agreement.important}</p>
        <p className="mt-4 text-sm text-soft">See also the <Link to="/partner-with-us/terms-and-conditions" className="link-underline">partnership terms</Link> and the <Link to="/partner-with-us/privacy-policy" className="link-underline">partnership privacy notice</Link>.</p>
      </Block>
      <Block id="why" eyebrow="Why partner" title="Why partner with LAX360 Education?"><Checklist items={e.why} accent={accent} cols /></Block>
      <Block id="application" eyebrow="Referral partnership registration" title="Become a referral partner" lead={e.application.lead} tint>
        <h3 className="font-display text-xl font-semibold">Application details</h3><div className="mt-4"><Checklist items={e.application.details} accent={accent} cols /></div>
        <p className="mt-6 text-sm text-soft">Submitting an application is an enquiry. It does not make you a partner; approval follows verification and a written agreement.</p>
      </Block>
      <Block id="contact" eyebrow="Contact and partnership enquiries" title={EDU.contact.name}>
        <p className="text-soft">{EDU.contact.line} · Referral Partnership Department</p>
        <ul className="mt-3 space-y-1"><li>Email: <a className="link-underline" href={`mailto:${EDU.contact.email}`}>{EDU.contact.email}</a></li><li>Locations: {EDU.contact.locations.join(' | ')}</li></ul>
      </Block>
    </>
  )
}
