import { Link } from 'react-router-dom'
import { Block, Checklist } from './PartnerUI.jsx'
import { DM, DMA, DMR } from '../../data/dmPartners.js'

// In-page navigation of the two Digital Marketing partner pages, in page order (PartnerOpportunity appends FAQs when an administrator has added some).
export const DM_NAV = [['program', 'The program'], ['choose', 'Choose your partnership'], ['services', 'Digital marketing services'], ['benefits', 'Benefits'], ['who', 'Who can join'], ['how', 'How it works'], ['support', 'Partner support'], ['why', 'Why partner with us']]

const NumList = ({ items }) => <ol className="grid gap-x-10 gap-y-3 md:grid-cols-2">{items.map((t, i) => <li key={t} className="flex gap-3"><span className="w-7 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span><span>{t}</span></li>)}</ol>

/** The sections of the Digital Marketing Authorized Partner (kind="authorized") and Referral Partner (kind="referral") pages. Content: data/dmPartners.js (LAX360's own supplied text). */
export default function DmPartnerBlocks({ kind, accent }) {
  const auth = kind === 'authorized'
  const P = auth ? DMA : DMR
  const mine = auth ? 1 : 0 // the column of this programme in the comparison
  const other = auth ? { label: 'Referral Partner program', to: '/referral-partner/digital-marketing' } : { label: 'Authorized Partner program', to: '/authorized-partner/digital-marketing' }
  return (
    <>
      <Block id="program" eyebrow={P.title} title={P.tagline}><p className="max-w-3xl text-lg leading-relaxed text-soft">{P.intro}</p></Block>

      <Block id="choose" eyebrow="Partner with us for digital marketing" title={DM.compare.title} lead={DM.hero.sub} tint>
        <div className="overflow-hidden rounded-xl border border-edge">
          <div className="hidden bg-glass md:grid md:grid-cols-[13rem_1fr_1fr]" aria-hidden="true">
            <span className="p-4" />
            {DM.compare.columns.map((c, i) => <span key={c} className={`p-4 font-display text-lg font-semibold ${i === mine ? 'text-lav' : ''}`}>{c}{i === mine && <span className="ml-2 rounded-full border border-edge px-2 py-0.5 align-middle text-[0.6875rem] font-semibold text-soft">This page</span>}</span>)}
          </div>
          {DM.compare.rows.map(([k, ...cells]) => (
            <div key={k} className="grid border-t border-edge bg-night first:border-t-0 md:grid-cols-[13rem_1fr_1fr]">
              <p className="bg-glass p-4 font-semibold md:bg-transparent">{k}</p>
              {cells.map((c, i) => <p key={DM.compare.columns[i]} className={`p-4 pt-1 md:pt-4 ${i === mine ? 'bg-glass' : 'text-soft'}`}><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-soft md:hidden">{DM.compare.columns[i]}</span>{c}</p>)}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-soft">Looking for the other partnership? See the <Link to={other.to} className="link-underline">{other.label}</Link>.</p>
      </Block>

      <Block id="services" eyebrow="Our digital marketing services" title="Our Digital Marketing Services" lead={DM.services.lead}>
        <ul className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-2">
          {DM.services.items.map(([t, d, sub]) => (
            <li key={t} className="bg-night p-5">
              <h3 className="font-display text-lg font-semibold">{t}</h3><p className="mt-1 text-soft">{d}</p>
              {sub && <ul className="mt-3 space-y-2 border-l-2 border-edge pl-4">{sub.map(([a, b]) => <li key={a}><span className="font-semibold">{a}</span>{b && <span className="text-soft">: {b}</span>}</li>)}</ul>}
            </li>
          ))}
        </ul>
      </Block>

      <Block id="benefits" eyebrow="Partner benefits" title={`${auth ? 'Authorized' : 'Referral'} Partner Benefits`} tint><Checklist items={P.benefits} accent={accent} cols /></Block>
      <Block id="who" eyebrow="Eligibility" title={`Who Can Become ${auth ? 'an Authorized' : 'a Referral'} Partner?`}><Checklist items={P.who} accent={accent} cols /></Block>
      <Block id="how" eyebrow="How it works" title="How It Works" tint><NumList items={P.how} /></Block>

      <Block id="support" eyebrow="Partner Support Program" title={DM.support.title} lead={DM.support.lead}>
        <ol className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-2">
          {DM.support.items.map(([t, d], i) => <li key={t} className="bg-night p-5"><span className="font-display text-2xl font-semibold tabular-nums" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span><p className="mt-1 font-semibold">{t}</p><p className="mt-1 text-soft">{d}</p></li>)}
        </ol>
      </Block>

      <Block id="why" eyebrow="Why partner with us" title="Why Partner with Us?" tint><Checklist items={DM.why} accent={accent} cols /></Block>
    </>
  )
}
