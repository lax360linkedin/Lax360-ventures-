import { Link, useParams } from 'react-router-dom'
import PageContainer from '../components/layout/PageContainer.jsx'
import { Block, Checklist, Commercial, Cta, Crumbs, DivisionSwitcher, Facts, Faqs, PartnerHero, PartnerTabs, SectionNav, Steps, StickyApply } from '../components/partner/PartnerUI.jsx'
import { SECTION_LABELS, categoryBySlug, customOpportunity, divisionBySlug, opportunityBySlug } from '../data/partnership.js'
import { pageOverride, usePartnerContentState } from '../services/partnershipService.js'
import NotFound from './NotFound.jsx'
import { EDU } from '../data/educationFranchise.js'
import { EDUA } from '../data/educationAuthorized.js'
import { EducationReferralA, EducationReferralB, EDUR_NAV_A, EDUR_NAV_B } from '../components/partner/EducationReferralBlocks.jsx'
import { EducationAuthorizedA, EducationAuthorizedB, EDUA_NAV_A, EDUA_NAV_B } from '../components/partner/EducationAuthorizedBlocks.jsx'
import { CoursesButton } from '../components/partner/CourseCatalogue.jsx'
import { EDU_NAV_A, EDU_NAV_B, EducationBlocksA, EducationBlocksB } from '../components/partner/EducationFranchiseBlocks.jsx'

/** One of the nine independently indexable opportunity pages: /franchise/education, /authorized-partner/it, /referral-partner/digital-marketing, ... */
export default function PartnerOpportunity({ category, division: fixed }) {
  const params = useParams()
  const division = fixed || params.division
  const { data, loaded } = usePartnerContentState()
  let op = opportunityBySlug(`${category}/${division}`)
  const added = op ? null : data?.custom_pages?.[`${category}/${division}`] // a division or service an administrator added in the menu manager
  if (added) op = customOpportunity(category, division, added.label, added.description)
  if (!op) return loaded ? <NotFound /> : <div className="wrap py-48 text-center text-soft" role="status" aria-busy="true">Loading…</div>
  const c = categoryBySlug(category)
  const d = divisionBySlug(division) || { slug: division, label: op.navLabel, long: op.navLabel, accent: c.accent }
  const o = pageOverride(data, op.slug)
  if (o.published === false) return <NotFound />
  const hidden = new Set(o.content?.hidden_sections || [])
  const published = o.commercial || {}
  const intro = o.content?.intro?.length ? o.content.intro : op.intro
  const apply = `/partner-with-us/apply?type=${category}&division=${division}`
  const franchise = op.key === 'franchise'
  const eduF = op.slug === 'franchise/education' // written from the supplied LAX360 Education franchise document
  const eduA = op.slug === 'authorized-partner/education' // written from the supplied Authorized Partnership document
  const eduR = op.slug === 'referral-partner/education' // written from the supplied Referral Programme document
  const edu = eduF || eduA || eduR
  const accent = d.accent
  const policies = (data?.policies || []).filter((p) => p.scope === op.slug || p.scope === category || p.scope === 'general')
  const faqs = [...(data?.faqs?.[op.slug] || []), ...op.faqs]
  const extras = (o.content?.extra_sections || []).filter((s) => s.enabled !== false)
  const on = (k) => !hidden.has(k)
  const empty = { opportunities: !op.opportunities.length, model: !op.model.length } // a page added in the admin panel has no built-in lists until they are written
  const roles = op.responsibilities.partner.length > 0
  const generic = (k) => on(k) && !empty[k] && !(edu && ['overview', 'opportunities', 'model', 'benefits', 'support', 'policies'].includes(k)) // the Education page covers these in its own sections
  const base = [
    generic('overview') && 'overview', generic('opportunities') && 'opportunities', generic('model') && 'model', on('eligibility') && !eduA && !eduR && 'eligibility', franchise && op.infrastructure && on('infrastructure') && 'infrastructure', roles && on('responsibilities') && 'responsibilities',
    generic('benefits') && 'benefits', generic('support') && 'support', on('process') && !eduR && 'process', on('commercial') && !eduR && 'commercial', generic('policies') && 'policies', on('faq') && faqs.length > 0 && 'faq',
  ].filter(Boolean).map((id) => ({ id, label: SECTION_LABELS[id] }))
  const nav = eduR ? [...EDUR_NAV_A.map(([id, label]) => ({ id, label })), ...base.filter((s) => s.id === 'responsibilities'), ...EDUR_NAV_B.map(([id, label]) => ({ id, label })), { id: 'faq', label: 'FAQs' }] : eduA ? [...EDUA_NAV_A.map(([id, label]) => ({ id, label })), ...base.filter((s) => ['responsibilities', 'process', 'commercial'].includes(s.id)), ...EDUA_NAV_B.map(([id, label]) => ({ id, label })), { id: 'faq', label: 'FAQs' }] : eduF ? [...EDU_NAV_A.map(([id, label]) => ({ id, label })), ...base.filter((s) => ['eligibility', 'infrastructure', 'responsibilities', 'process', 'commercial'].includes(s.id)), ...EDU_NAV_B.map(([id, label]) => ({ id, label })), { id: 'faq', label: 'FAQs' }] : base
  const eduCommercial = EDU.commercial.map(([k, v]) => [k, { 'Franchise fee': published.registration_fee, 'Security deposit': published.security_deposit, 'Agreement period': published.agreement_duration, 'Renewal charges': published.renewal_fee, 'Royalty / revenue sharing': published.royalty, 'Territory rights': published.territory }[k] || v])
  const keys = Object.keys(op.commercial)
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebPage', name: op.title, description: o.seo_description || op.seoDescription, isPartOf: { '@id': '__SITE__/#website' }, about: { '@type': 'Organization', name: 'LAX360 Pvt Ltd', url: '__SITE__/' } }
  return (
    <PageContainer path={op.path} title={o.seo_title || op.seoTitle} description={o.seo_description || op.seoDescription} noindex={!!o.noindex} jsonLd={jsonLd}>
      <PartnerHero eyebrow={`${c.label} · ${d.long}`} title={o.content?.hero_heading || op.heroHeading} accent={accent} imageUrl={o.hero_url} imageAlt={o.hero_alt} lead={o.content?.hero_lead || op.heroLead}>
        <Link to={apply} className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white">{o.content?.cta_label || 'Apply Now'}</Link>
        <Link to="/contact?type=partnership" className="inline-flex min-h-12 items-center rounded-full border border-edge-strong px-6 text-sm font-semibold hover:bg-glass-strong">Request a Consultation</Link>
        {division === 'education' && <CoursesButton accent={accent} />}
      </PartnerHero>
      <Crumbs items={[{ label: 'Home', to: '/' }, { label: 'Partner With Us', to: '/partner-with-us' }, { label: c.label, to: c.path }, { label: d.label }]} />
      <PartnerTabs category={category} division={division} />
      <SectionNav items={nav} />
      <div className="wrap grid gap-0 lg:grid-cols-12 lg:gap-10">
        <aside className="pt-8 lg:col-span-3 lg:pt-12"><DivisionSwitcher category={category} division={division} /></aside>
        <div className="lg:col-span-9">
          {generic('overview') && <Block id="overview" eyebrow={op.title} title={franchise ? 'Introduction' : 'About this program'}><div className="space-y-5 text-lg leading-relaxed text-soft">{intro.map((p) => <p key={p}>{p}</p>)}</div></Block>}
          {generic('opportunities') && <Block id="opportunities" eyebrow={d.long} title="Business opportunities" tint><Checklist items={op.opportunities} accent={accent} cols /></Block>}
          {generic('model') && <Block id="model" eyebrow="Model" title={franchise ? 'How the business works' : 'How the program works'}><Facts rows={op.model} /></Block>}
          {eduF && <EducationBlocksA accent={accent} />}{eduA && <EducationAuthorizedA accent={accent} />}{eduR && <EducationReferralA accent={accent} published={published} />}
          {on('eligibility') && !eduA && !eduR && <Block id="eligibility" eyebrow="Eligibility" title="Who can apply" lead="Eligibility is confirmed during consultation and verification." tint><Checklist items={op.eligibility} accent={accent} /></Block>}
          {franchise && op.infrastructure && on('infrastructure') && (
            <Block id="infrastructure" eyebrow="Setup" title="Proposed infrastructure and team" lead="Indicative requirements. The final specification is provided during evaluation.">
              <div className="grid gap-10 md:grid-cols-2"><div><h3 className="font-display text-xl font-semibold">Premises and equipment</h3><div className="mt-4"><Checklist items={op.infrastructure.place} accent={accent} /></div></div><div><h3 className="font-display text-xl font-semibold">Team</h3><div className="mt-4"><Checklist items={op.infrastructure.team} accent={accent} /></div></div></div>
            </Block>
          )}
          {roles && on('responsibilities') && <Block id="responsibilities" eyebrow="Roles" title="Responsibilities" tint><div className="grid gap-10 md:grid-cols-2"><div><h3 className="font-display text-xl font-semibold">{franchise ? 'Franchisee' : 'Partner'}</h3><div className="mt-4"><Checklist items={op.responsibilities.partner} accent={accent} /></div></div><div><h3 className="font-display text-xl font-semibold">LAX360</h3><div className="mt-4"><Checklist items={op.responsibilities.lax} accent={accent} /></div></div></div></Block>}
          {generic('benefits') && <Block id="benefits" eyebrow="Benefits" title="Why partner with LAX360"><Checklist items={op.benefits} accent={accent} cols /></Block>}
          {generic('support') && <Block id="support" eyebrow="Support" title="Support, subject to the agreement" lead="Which support applies to you is set out in your agreement." tint><Checklist items={op.support} accent={accent} cols /></Block>}
          {on('process') && !eduR && <Block id="process" eyebrow="Process" title="How to get started" lead="Submitting an application is an enquiry. It does not make you a partner."><Steps items={op.process} accent={accent} /></Block>}
          {on('commercial') && !eduR && <Block id="commercial" eyebrow="Commercial" title={franchise ? 'Investment and commercial information' : 'Fees and commission'} tint>{eduA ? <><p className="mb-5 max-w-3xl text-lg text-soft">{EDUA.commercial.lead}</p><Facts rows={EDUA.commercial.rows} /><h3 className="mt-8 font-display text-xl font-semibold">Commercial policies</h3><div className="mt-3"><Checklist items={EDUA.commercial.policies} accent={accent} cols /></div></> : eduF ? <><Facts rows={eduCommercial} /><p className="mt-3 text-sm text-soft">Commercial details are confirmed in the approved franchise proposal and the signed agreement. Investment details are available upon consultation.</p></> : <Commercial category={op.key} keys={keys} published={published} />}</Block>}
          {eduF && <EducationBlocksB accent={accent} />}{eduA && <EducationAuthorizedB accent={accent} />}{eduR && <EducationReferralB accent={accent} />}
          {generic('policies') && (
            <Block id="policies" eyebrow="Policies" title="Policies and terms" lead="A summary of the approach. Binding terms are in the agreement you are given; unapproved policy drafts are not published.">
              <dl className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2">{op.policies.map(([k, v]) => <div key={k} className="bg-bg p-5"><dt className="font-semibold">{k}</dt><dd className="mt-1 text-soft">{v}</dd></div>)}</dl>
              {policies.map((p) => <article key={`${p.key}${p.scope}`} className="mt-6 rounded-xl border border-edge p-5"><h3 className="font-display text-lg font-semibold">{p.title}</h3><p className="mt-1 text-xs text-soft">Version {p.version}{p.effective_date ? ` · effective ${p.effective_date}` : ''}</p>{p.body.split(/\n\n+/).map((t) => <p key={t} className="mt-3 text-soft">{t}</p>)}</article>)}
              <p className="mt-5 text-sm text-soft">How we handle your details: see the <Link to="/partner-with-us/privacy-policy" className="link-underline">partnership privacy notice</Link> and the <Link to="/privacy" className="link-underline">LAX360 Privacy Policy</Link>.</p>
            </Block>
          )}
          {extras.map((s, i) => <Block key={s.heading} id={`extra-${i}`} eyebrow="More" title={s.heading} tint={i % 2 === 0}><div className="space-y-4 text-lg text-soft">{s.body.split(/\n+/).map((t) => <p key={t}>{t}</p>)}</div></Block>)}
          {on('faq') && faqs.length > 0 && <Block id="faq" eyebrow="FAQ" title="Frequently asked questions" tint><Faqs items={faqs} /></Block>}
          <section aria-labelledby="enq-t" className="py-14"><h2 id="enq-t" className="h2 max-w-2xl">{eduR ? 'Become a LAX360 Education Referral Partner' : eduA ? 'Become a LAX360 Education Authorized Partner' : eduF ? 'Become a LAX360 Education Franchise Partner' : 'Ready to start a conversation?'}</h2>{eduF && <p className="mt-3 max-w-2xl text-lg text-soft">Build your own education and skill development centre with the support of LAX360 Pvt Ltd. Start your education business journey with us.</p>}{eduR && <p className="mt-3 max-w-2xl text-lg text-soft">Join the LAX360 Education network and create opportunities through education and professional training.</p>}{eduA && <p className="mt-3 max-w-2xl text-lg text-soft">Build a strong educational partnership with LAX360 Education and create opportunities for students, institutions and industry professionals.</p>}<ul className="mt-5 space-y-1 text-sm text-soft">{op.disclaimers.map((t) => <li key={t}>{t}</li>)}</ul><Cta className="mt-7" applyTo={apply} brochureUrl={o.brochure_url} portalUrl={franchise ? null : data?.portal_url} /></section>
        </div>
      </div>
      <StickyApply to={apply} label={o.content?.cta_label || 'Apply now'} />
      <div aria-hidden="true" className="h-16 lg:hidden" />
    </PageContainer>
  )
}

