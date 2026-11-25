import { Link } from 'react-router-dom'
import { Block, Checklist, Facts } from './PartnerUI.jsx'
import { ProductsButton } from './ProductCatalogue.jsx'
import { ITR } from '../../data/itReferral.js'

// In-page navigation of the IT & Software Referral Partner page, in page order. PartnerOpportunity inserts Responsibilities and Process between the two lists.
export const ITR_NAV_A = [['about', 'About'], ['who', 'Who can join'], ['opportunities', 'Earning opportunities'], ['provide', 'Benefits'], ['how', 'How it works'], ['lead', 'Lead ownership'], ['portal', 'Referral portal'], ['commission', 'Commission & payouts']]
export const ITR_NAV_B = [['apply-details', 'Register']]

const NumList = ({ items }) => <ol className="grid gap-x-10 gap-y-2 md:grid-cols-2">{items.map((t, i) => <li key={t} className="flex gap-3"><span className="w-6 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span><span>{t}</span></li>)}</ol>

/** Part A: about to commission and payouts. Content is LAX360's own supplied text (see data/itReferral.js). `published` holds commercial values an administrator has published. */
export function ItReferralA({ accent, published = {} }) {
  const e = ITR
  const extra = [published.registration_fee && ['Registration fee', published.registration_fee], published.commission_model && ['Commission', published.commission_model]].filter(Boolean)
  return (
    <>
      <Block id="about" eyebrow="LAX360 IT & Software" title={e.about.tagline}><div className="max-w-3xl space-y-5 text-lg leading-relaxed text-soft">{e.about.paragraphs.map((p) => <p key={p}>{p}</p>)}</div></Block>
      <Block id="who" eyebrow="Eligibility" title="Who can join?" tint><Checklist items={e.who.items} accent={accent} cols /><p className="mt-5 text-sm text-soft">{e.who.note}</p></Block>
      <Block id="opportunities" eyebrow="Referral opportunities" title="Referral and earning opportunities" lead={e.opportunities.lead}>
        <div className="mb-8"><ProductsButton accent={accent} /></div>
        <h3 className="font-display text-xl font-semibold">{e.opportunities.customersTitle}</h3><div className="mt-4"><Checklist items={e.opportunities.customers} accent={accent} cols /></div>
      </Block>
      <Block id="provide" eyebrow="Partner benefits" title="Referral partner benefits" tint><Checklist items={e.benefits.items} accent={accent} cols /><p className="mt-5 rounded-lg border border-edge p-4 text-sm font-semibold">{e.benefits.note}</p></Block>
      <Block id="how" eyebrow="Referral programme" title="How the referral programme works"><NumList items={e.how} /></Block>
      <Block id="lead" eyebrow="Lead registration and ownership" title="Lead registration & ownership" tint><div className="max-w-3xl space-y-4 text-lg leading-relaxed text-soft">{e.lead.map((p) => <p key={p}>{p}</p>)}</div></Block>
      <Block id="portal" eyebrow="Referral partner portal" title="Referral partner portal" lead={e.portal.lead}><Facts rows={e.portal.rows} /><p className="mt-4 text-sm text-soft">{e.portal.note}</p></Block>
      <Block id="commission" eyebrow="Commission and recurring earnings" title="Commission & recurring earnings" lead={e.commission.lead} tint>
        <div className="grid gap-10 md:grid-cols-2">{[e.commission.own, e.commission.third].map(([t, d]) => <div key={t}><h3 className="font-display text-xl font-semibold">{t}</h3><p className="mt-3 text-soft">{d}</p></div>)}</div>
        {extra.length > 0 && <div className="mt-8"><Facts rows={extra} /></div>}
        <h3 className="mt-10 font-display text-xl font-semibold">{e.commission.payoutTitle}</h3><div className="mt-4"><Checklist items={e.commission.payouts} accent={accent} /></div>
        <p className="mt-6 rounded-lg border border-edge p-4 text-sm font-semibold">{e.commission.note}</p>
      </Block>
    </>
  )
}

/** Part B: what the registration asks, and contact. */
export function ItReferralB({ accent }) {
  const e = ITR
  return (
    <>
      <Block id="apply-details" eyebrow="Register as a referral partner" title="Become a LAX360 IT & Software Referral Partner" lead={e.applyLead}>
        <div className="grid gap-8 md:grid-cols-2">{e.profile.map(([t, items]) => <div key={t}><h3 className="font-display text-xl font-semibold">{t}</h3><div className="mt-3"><Checklist items={items} accent={accent} /></div></div>)}</div>
        <h3 className="mt-10 font-display text-xl font-semibold">Referral interests</h3><div className="mt-4"><Checklist items={e.interests} accent={accent} cols /></div>
        <p className="mt-6 text-sm text-soft">{e.onboardingNote} See the <Link to="/partner-with-us/privacy-policy" className="link-underline">partnership privacy notice</Link>.</p>
      </Block>
      <Block id="contact" eyebrow="Contact" title={e.contact.name} tint><p className="text-soft">{e.contact.line}</p><ul className="mt-3 space-y-1"><li>Website: <a className="link-underline" href="https://lax360.in">lax360.in</a></li><li>Locations: {e.contact.locations.join(' | ')}</li></ul></Block>
    </>
  )
}
