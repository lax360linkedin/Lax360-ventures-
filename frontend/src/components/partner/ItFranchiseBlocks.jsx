import { Link } from 'react-router-dom'
import { Block, Checklist } from './PartnerUI.jsx'
import { ProductsButton } from './ProductCatalogue.jsx'
import { ITF } from '../../data/itFranchise.js'

// In-page navigation of the IT & Software Franchise page, in page order. PartnerOpportunity inserts Responsibilities, Process and Commercial between the two lists.
export const ITF_NAV_A = [['about', 'About'], ['who', 'Who can apply'], ['opportunities', 'Business opportunities'], ['provide', 'What we provide'], ['branding', 'Branding kit'], ['support', 'Sales & technical support'], ['crm', 'CRM & portal'], ['training', 'Training & infrastructure'], ['revenue', 'Revenue']]
export const ITF_NAV_B = [['apply-details', 'Apply']]

const Two = ({ a, b, accent }) => <div className="grid gap-10 md:grid-cols-2"><div><h3 className="font-display text-xl font-semibold">{a[0]}</h3><div className="mt-4"><Checklist items={a[1]} accent={accent} /></div></div><div><h3 className="font-display text-xl font-semibold">{b[0]}</h3><div className="mt-4"><Checklist items={b[1]} accent={accent} /></div></div></div>

/** Part A: about to revenue. Content is LAX360's own supplied text (see data/itFranchise.js). */
export function ItFranchiseA({ accent }) {
  const e = ITF
  return (
    <>
      <Block id="about" eyebrow="LAX360 IT & Software" title={e.about.tagline}><div className="max-w-3xl space-y-5 text-lg leading-relaxed text-soft">{e.about.paragraphs.map((p) => <p key={p}>{p}</p>)}</div></Block>
      <Block id="who" eyebrow="Eligibility" title="Who can apply?" tint><Checklist items={e.who.items} accent={accent} cols /><p className="mt-5 text-sm text-soft">{e.who.note}</p></Block>
      <Block id="opportunities" eyebrow="Business opportunities" title="Build a diversified technology business" lead={e.opportunities.lead}>
        <div className="mb-8"><ProductsButton accent={accent} /></div>
        <Checklist items={e.opportunities.areas} accent={accent} cols />
      </Block>
      <Block id="provide" eyebrow="Franchise benefits" title={`${e.benefits.lead}`} tint><Checklist items={e.benefits.items} accent={accent} cols /><p className="mt-5 text-sm text-soft">{e.benefits.note}</p></Block>
      <Block id="branding" eyebrow="Franchise partner package" title="Branding kit" lead={e.branding.lead}>
        <div className="grid gap-8 md:grid-cols-2">{e.branding.groups.map(([t, items]) => <div key={t}><h3 className="font-display text-xl font-semibold">{t}</h3><div className="mt-3"><Checklist items={items} accent={accent} /></div></div>)}</div>
      </Block>
      <Block id="support" eyebrow="Sales and technical support" title="Sales & technical support" lead={e.support.lead} tint>
        <h3 className="font-display text-xl font-semibold">Project workflow</h3>
        <ol className="mt-4 flex flex-wrap items-center gap-2">{e.support.workflow.map((s, i) => <li key={s} className="inline-flex items-center gap-2 rounded-full border border-edge bg-night px-3.5 py-2 text-sm font-semibold"><span className="tabular-nums" style={{ color: accent }}>{i + 1}</span>{s}</li>)}</ol>
      </Block>
      <Block id="crm" eyebrow="CRM and partner portal" title="CRM & partner portal" lead={e.crm.lead}><Checklist items={e.crm.items} accent={accent} cols /><p className="mt-5 text-sm text-soft">Access depends on system readiness and the franchise agreement.</p></Block>
      <Block id="training" eyebrow="Training and infrastructure" title="Training & infrastructure" tint>
        <Two a={['Training', e.training.training]} b={['Suggested infrastructure', e.training.infrastructure]} accent={accent} />
        <h3 className="mt-10 font-display text-xl font-semibold">Suggested staffing</h3><p className="mt-2 max-w-3xl text-soft">{e.training.staffing}</p>
      </Block>
      <Block id="revenue" eyebrow="Revenue opportunities" title="Revenue opportunities">
        <Two a={['One-time opportunities', e.revenue.oneTime]} b={['Recurring opportunities', e.revenue.recurring]} accent={accent} />
        <p className="mt-6 rounded-lg border border-edge p-4 text-sm font-semibold">{e.revenue.note}</p>
      </Block>
    </>
  )
}

/** Part B: what the application asks, and contact. */
export function ItFranchiseB({ accent }) {
  const e = ITF
  return (
    <>
      <Block id="apply-details" eyebrow="Apply for franchise" title="Become a LAX360 IT & Software Franchise Partner" lead={e.applyLead} tint>
        <h3 className="font-display text-xl font-semibold">Business interests you can tell us about</h3><div className="mt-4"><Checklist items={e.interests} accent={accent} cols /></div>
        <p className="mt-6 text-sm text-soft">Submitting an application is an enquiry. It does not make you a partner; approval follows evaluation, verification and a signed agreement. See the <Link to="/partner-with-us/privacy-policy" className="link-underline">partnership privacy notice</Link>.</p>
      </Block>
      <Block id="contact" eyebrow="Contact" title={e.contact.name}><p className="text-soft">{e.contact.line}</p><ul className="mt-3 space-y-1"><li>Website: <a className="link-underline" href="https://lax360.in">lax360.in</a></li><li>Locations: {e.contact.locations.join(' | ')}</li></ul></Block>
    </>
  )
}
