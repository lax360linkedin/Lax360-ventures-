import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import { Checklist, Cta, Crumbs, DivisionSwitcher, Faqs, PartnerHero, PartnerTabs, Steps, StickyApply } from '../components/partner/PartnerUI.jsx'
import { DIVISIONS, GENERAL_FAQS, JOURNEY, PARTNER_POLICIES, categoryBySlug, opportunities, opportunityPath, webPageLd } from '../data/partnership.js'
import { pageOverride, useDivisionItems, usePartnerContent } from '../services/partnershipService.js'
import NotFound from './NotFound.jsx'

const KEY = { franchise: 'franchise', 'authorized-partner': 'authorized', 'referral-partner': 'referral' }

/** /franchise, /authorized-partner, /referral-partner: the category landing page, with the division switcher leading to the three independent opportunity pages. */
export default function PartnerCategory({ category }) {
  const c = categoryBySlug(category)
  const data = usePartnerContent()
  const items = useDivisionItems(category)
  if (!c) return <NotFound />
  const o = pageOverride(data, c.slug)
  if (o.published === false) return <NotFound />
  const mine = opportunities.filter((x) => x.category === c.slug)
  const sample = mine[0]
  const faqs = [...(data?.faqs?.[c.slug] || []), ...sample.faqs.slice(0, 3)]
  const apply = `/partner-with-us/apply?type=${c.slug}`
  return (
    <PageContainer path={c.path} title={o.seo_title || c.seoTitle} description={o.seo_description || c.seoDescription} noindex={!!o.noindex} jsonLd={webPageLd(c.short, o.seo_description || c.seoDescription)}>
      <PartnerHero eyebrow={c.short} title={o.content?.hero_heading || `${c.short}: ${c.tagline}`} accent={c.accent} imageUrl={o.hero_url} imageAlt={o.hero_alt} lead={o.content?.hero_lead || c.summary}>
        <Link to={apply} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white">Become a Partner<ArrowRight className="size-4" aria-hidden="true" /></Link>
      </PartnerHero>
      <Crumbs items={[{ label: 'Home', to: '/' }, { label: 'Partner With Us', to: '/partner-with-us' }, { label: c.label }]} />
      <PartnerTabs category={c.slug} />
      <div className="wrap grid gap-10 py-12 lg:grid-cols-12 lg:py-16">
        <aside className="lg:col-span-3"><DivisionSwitcher category={c.slug} division={null} /></aside>
        <div className="space-y-14 lg:col-span-9">
          <section aria-labelledby="pick-t">
            <h2 id="pick-t" className="h2">Choose your business division</h2>
            <ul className="mt-7 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-3">
              {items.map((it) => { const op = mine.find((x) => x.division === it.slug); const d = DIVISIONS.find((x) => x.slug === it.slug) || { accent: c.accent }; return (
                <li key={it.slug} className="bg-night"><Link to={opportunityPath(c.slug, it.slug)} className="group flex h-full flex-col p-6 transition-colors hover:bg-glass">
                  <span className="mb-4 h-1 w-12 rounded-full" style={{ background: d.accent }} aria-hidden="true" />
                  <span className="font-display text-xl font-semibold">{op ? op.title : `${it.label} ${c.label}`}</span>
                  <span className="mt-2 flex-1 text-sm text-soft">{op ? op.heroHeading : it.description || ''}</span>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: d.accent }}>Explore<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                </Link></li>
              )})}
            </ul>
          </section>
          <section aria-labelledby="how-t"><h2 id="how-t" className="h2">How it works</h2><div className="mt-6"><Steps items={sample.process} accent={c.accent} /></div></section>
          <section aria-labelledby="who-t"><h2 id="who-t" className="h2">Who it suits</h2><p className="mt-4 text-lg text-soft">{c.profile}</p><div className="mt-5"><Checklist items={sample.eligibility} accent={c.accent} cols /></div></section>
          <section aria-labelledby="supp-t"><h2 id="supp-t" className="h2">Support, subject to the agreement</h2><div className="mt-5"><Checklist items={sample.support} accent={c.accent} cols /></div></section>
          {KEY[c.slug] !== 'franchise' && (
            <section aria-labelledby="pol-t"><h2 id="pol-t" className="h2">Commercial policies</h2><dl className="mt-6 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2">{PARTNER_POLICIES.slice(0, 8).map(([k, v]) => <div key={k} className="bg-night p-5"><dt className="font-semibold">{k}</dt><dd className="mt-1 text-soft">{v}</dd></div>)}</dl></section>
          )}
          {KEY[c.slug] === 'franchise' && <section aria-labelledby="inv-t"><h2 id="inv-t" className="h2">Investment and fees</h2><p className="mt-4 text-lg text-soft">Franchise investment details are available upon consultation. Commercial terms will be discussed during the franchise evaluation process, and final terms are subject to the approved franchise agreement. LAX360 does not guarantee income, profit or any business result.</p></section>}
          <section aria-labelledby="faq-t"><h2 id="faq-t" className="h2">Frequently asked questions</h2><div className="mt-6"><Faqs items={faqs.length ? faqs : GENERAL_FAQS.slice(0, 3)} /></div></section>
          <Cta applyTo={apply} brochureUrl={data?.general_brochure_url} portalUrl={KEY[c.slug] === 'franchise' ? null : data?.portal_url} />
        </div>
      </div>
      <StickyApply to={apply} />
      <div aria-hidden="true" className="h-16 lg:hidden" />
    </PageContainer>
  )
}
