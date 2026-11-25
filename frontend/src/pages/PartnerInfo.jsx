import { Link } from 'react-router-dom'
import PageContainer from '../components/layout/PageContainer.jsx'
import { Block, Cta, Crumbs, Faqs, PartnerHero } from '../components/partner/PartnerUI.jsx'
import { CATEGORIES, GENERAL_FAQS, PARTNER_PAGES, faqJsonLd, opportunities, webPageLd } from '../data/partnership.js'
import { usePartnerContent } from '../services/partnershipService.js'

/** /partner-with-us/faq, /partner-with-us/privacy-policy and /partner-with-us/terms-and-conditions. Policy text is shown ONLY when management has published it; otherwise the page says what applies meanwhile. */
export default function PartnerInfo({ kind }) {
  const data = usePartnerContent()
  const meta = PARTNER_PAGES[kind]
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Partner With Us', to: '/partner-with-us' }, { label: meta.title }]
  const published = (data?.policies || []).filter((p) => p.key === (kind === 'privacy' ? 'privacy' : 'terms') && p.scope === 'general')

  if (kind === 'faq') {
    const admin = Object.entries(data?.faqs || {}).flatMap(([scope, list]) => list.map((f) => ({ ...f, scope })))
    const groups = [{ title: 'General', items: [...admin.filter((f) => f.scope === 'general' || f.scope === 'overview'), ...GENERAL_FAQS].filter((f, i, a) => a.findIndex((x) => x.q === f.q) === i) },
      ...CATEGORIES.map((c) => ({ title: c.short, items: [...admin.filter((f) => f.scope === c.slug), ...opportunities.filter((o) => o.category === c.slug).flatMap((o) => o.faqs.slice(0, 2).map((f) => ({ q: `${o.title}: ${f.q}`, a: f.a })))] }))]
    return (
      <PageContainer path={meta.path} title={meta.seoTitle} description={meta.seoDescription} jsonLd={faqJsonLd(groups.flatMap((g) => g.items))}>
        <PartnerHero eyebrow="Partner With Us" title="Partnership FAQs" lead="Answers about fees, eligibility, commission, agreements and how applications work." accent="var(--color-primary)" />
        <Crumbs items={crumbs} />
        {groups.map((g, i) => <Block key={g.title} id={`faq-${i}`} eyebrow="FAQ" title={g.title} tint={i % 2 === 1}><Faqs items={g.items} /></Block>)}
        <section className="wrap py-14"><Cta brochureUrl={data?.general_brochure_url} portalUrl={data?.portal_url} /></section>
      </PageContainer>
    )
  }
  const isPrivacy = kind === 'privacy'
  return (
    <PageContainer path={meta.path} title={meta.seoTitle} description={meta.seoDescription} jsonLd={webPageLd(meta.title, meta.seoDescription)}>
      <PartnerHero eyebrow="Partner With Us" title={meta.title} lead={isPrivacy ? 'How we handle the details you share when you enquire about a franchise or partnership program.' : 'The terms that apply when you enquire about a franchise or partnership program.'} accent="var(--color-primary)" />
      <Crumbs items={crumbs} />
      <div className="wrap max-w-3xl py-12">
        {published.length ? published.map((p) => (
          <article key={p.version} className="space-y-4"><h2 className="h2">{p.title}</h2><p className="text-sm text-soft">Version {p.version}{p.effective_date ? ` · effective ${p.effective_date}` : ''}{p.updated_at ? ` · last updated ${p.updated_at}` : ''}</p>{p.body.split(/\n\n+/).map((t) => <p key={t} className="text-lg leading-relaxed text-soft">{t}</p>)}</article>
        )) : (
          <div className="space-y-5 text-lg leading-relaxed text-soft">
            {isPrivacy ? <>
              <p>This notice is being finalised and will be published here once it has been approved. Until then, the details you submit in a partnership enquiry are used only to respond to that enquiry, are kept confidential, and are handled as described in the <Link to="/privacy" className="link-underline">LAX360 Privacy Policy</Link>.</p>
              <p>The form asks for contact and basic business details. It does not ask for identity documents, bank details or passwords. Marketing messages are sent only if you tick the separate optional box.</p>
            </> : <>
              <p>Binding terms for a franchise or partner program are set out in the agreement you receive during the approval process. They are not published on this page until management and legal review has approved them.</p>
              <p>Submitting an enquiry does not make you a partner, does not guarantee approval and does not create any commercial commitment on either side. Franchise investment and fees are available upon consultation. No income, profit, admission or placement is guaranteed.</p>
            </>}
            <p className="text-sm">See also the <Link to="/terms" className="link-underline">LAX360 terms of use</Link>.</p>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
