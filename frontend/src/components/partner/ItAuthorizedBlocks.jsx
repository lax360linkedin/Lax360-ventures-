import { Link } from 'react-router-dom'
import { Block, Checklist, Facts } from './PartnerUI.jsx'
import { ProductsButton } from './ProductCatalogue.jsx'
import { ITA } from '../../data/itAuthorized.js'

// In-page navigation of the IT & Software Authorized Partner page, in page order. PartnerOpportunity inserts Responsibilities and Process between the two lists.
export const ITA_NAV_A = [['about', 'About'], ['who', 'Who can apply'], ['opportunities', 'Business opportunities'], ['provide', 'Benefits'], ['training', 'Training & sales support'], ['sales', 'Sales process'], ['portal', 'Partner portal'], ['tech', 'Technical support'], ['commission', 'Commission']]
export const ITA_NAV_B = [['apply-details', 'Apply']]

const NumList = ({ items }) => <ol className="grid gap-x-10 gap-y-2 md:grid-cols-2">{items.map((t, i) => <li key={t} className="flex gap-3"><span className="w-6 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span><span>{t}</span></li>)}</ol>

/** Part A: about to commission. Content is LAX360's own supplied text (see data/itAuthorized.js). `published` holds commercial values an administrator has published. */
export function ItAuthorizedA({ accent, published = {} }) {
  const e = ITA
  const extra = [published.registration_fee && ['Registration fee', published.registration_fee], published.commission_model && ['Commission', published.commission_model]].filter(Boolean)
  return (
    <>
      <Block id="about" eyebrow="LAX360 IT & Software" title={e.about.tagline}><div className="max-w-3xl space-y-5 text-lg leading-relaxed text-soft">{e.about.paragraphs.map((p) => <p key={p}>{p}</p>)}</div></Block>
      <Block id="who" eyebrow="Eligibility" title="Who can apply?" tint><Checklist items={e.who.items} accent={accent} cols /><p className="mt-5 text-sm text-soft">{e.who.note}</p></Block>
      <Block id="opportunities" eyebrow="Business opportunities" title="Business opportunities" lead={e.opportunities.lead}>
        <div className="mb-8"><ProductsButton accent={accent} label="Explore Products & Services" /></div>
        <Checklist items={e.opportunities.areas} accent={accent} cols />
      </Block>
      <Block id="provide" eyebrow="Partner benefits" title="Authorized partner benefits" tint><Checklist items={e.benefits.items} accent={accent} cols /><p className="mt-5 rounded-lg border border-edge p-4 text-sm font-semibold">{e.benefits.note}</p></Block>
      <Block id="training" eyebrow="Branding, product training and sales support" title="Branding, product training & sales support" lead={e.training.lead}><Checklist items={e.training.items} accent={accent} cols /><p className="mt-5 text-sm text-soft">{e.training.note}</p></Block>
      <Block id="sales" eyebrow="Customer acquisition" title="Customer acquisition & sales process" tint><NumList items={e.sales.items} /><p className="mt-5 text-sm text-soft">{e.sales.note}</p></Block>
      <Block id="portal" eyebrow="Partner management portal" title="Partner management portal" lead={e.portal.lead}><Facts rows={e.portal.rows} /><p className="mt-4 text-sm text-soft">{e.portal.note}</p></Block>
      <Block id="tech" eyebrow="Technical and customer support" title="Technical & customer support" tint><p className="max-w-3xl text-lg leading-relaxed text-soft">{e.support}</p></Block>
      <Block id="commission" eyebrow="Commission and recurring earnings" title="Commission & recurring earnings" lead={e.commission.lead}>
        <div className="grid gap-10 md:grid-cols-2">{[e.commission.own, e.commission.third].map(([t, d]) => <div key={t}><h3 className="font-display text-xl font-semibold">{t}</h3><p className="mt-3 text-soft">{d}</p></div>)}</div>
        {extra.length > 0 && <div className="mt-8"><Facts rows={extra} /></div>}
        <h3 className="mt-10 font-display text-xl font-semibold">{e.commission.payoutTitle}</h3><div className="mt-4"><Checklist items={e.commission.payouts} accent={accent} /></div>
        <p className="mt-6 rounded-lg border border-edge p-4 text-sm font-semibold">{e.commission.note}</p>
      </Block>
    </>
  )
}

/** Part B: what the application asks, and contact. */
export function ItAuthorizedB({ accent }) {
  const e = ITA
  return (
    <>
      <Block id="apply-details" eyebrow="Apply for authorized partner" title="Become a LAX360 IT & Software Authorized Partner" lead={e.applyLead} tint>
        <div className="grid gap-8 md:grid-cols-2">{e.profile.map(([t, items]) => <div key={t}><h3 className="font-display text-xl font-semibold">{t}</h3><div className="mt-3"><Checklist items={items} accent={accent} /></div></div>)}</div>
        <h3 className="mt-10 font-display text-xl font-semibold">Business interests you can tell us about</h3><div className="mt-4"><Checklist items={e.interests} accent={accent} cols /></div>
        <p className="mt-6 text-sm text-soft">{e.onboardingNote} See the <Link to="/partner-with-us/privacy-policy" className="link-underline">partnership privacy notice</Link>.</p>
      </Block>
      <Block id="contact" eyebrow="Contact" title={e.contact.name}><p className="text-soft">{e.contact.line}</p><ul className="mt-3 space-y-1"><li>Website: <a className="link-underline" href="https://lax360.in">lax360.in</a></li><li>Locations: {e.contact.locations.join(' | ')}</li></ul></Block>
    </>
  )
}
