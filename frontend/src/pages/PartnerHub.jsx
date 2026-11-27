import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Code2, GraduationCap, Megaphone } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import { CoursesButton } from '../components/partner/CourseCatalogue.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import { Block, Checklist, ComparisonTable, Cta, Crumbs, Faqs, PartnerHero, PartnerTabs, Steps } from '../components/partner/PartnerUI.jsx'
import { CATEGORIES, DIVISIONS, ECOSYSTEM, GENERAL_FAQS, JOURNEY, PARTNER_PAGES, PARTNER_POLICIES, WHO_CAN_APPLY, WHY, opportunityPath, webPageLd } from '../data/partnership.js'
import { pageOverride, usePartnerContent } from '../services/partnershipService.js'
import { UpcomingMatrix } from '../components/upcoming/UpcomingPartner.jsx'
import PartnerEnquiryForm from '../components/partner/PartnerEnquiryForm.jsx'
import { warmBackend } from '../services/backendWake.js'

const ICON = { graduation: GraduationCap, megaphone: Megaphone, code: Code2 }
const meta = PARTNER_PAGES.overview

export default function PartnerHub() {
  const data = usePartnerContent()
  useEffect(() => { warmBackend() }, [])
  const o = pageOverride(data, 'overview')
  const faqs = [...(data?.faqs?.overview || []), ...(data?.faqs?.general || []), ...GENERAL_FAQS].filter((f, i, a) => a.findIndex((x) => x.q === f.q) === i)
  return (
    <PageContainer path={meta.path} title={o.seo_title || meta.seoTitle} description={o.seo_description || meta.seoDescription} noindex={!!o.noindex} jsonLd={webPageLd(meta.title, o.seo_description || meta.seoDescription)} keywords="franchise opportunities, authorized partner program, referral partner program, business partnership opportunities in India">
      <div className="pp">
      <PartnerHero eyebrow="Partner With Us" title={o.content?.hero_heading || 'Partner With LAX360. Grow With Us.'} accent="var(--color-primary)" imageUrl={o.hero_url} imageAlt={o.hero_alt}
        lead={o.content?.hero_lead || 'Build your business, explore new opportunities and collaborate with LAX360 across Education, Digital Marketing and Information Technology through our franchise and partnership programs.'}>
        <Button href="#programs" arrow>Explore Opportunities</Button>
        <Button to="/partner-with-us/apply" variant="secondary">Become a Partner</Button>
        <Button to="/contact?type=partnership" variant="secondary">Talk to Our Team</Button>
      </PartnerHero>
      <Crumbs items={[{ label: 'Home', to: '/' }, { label: 'Partner With Us' }]} />
      <PartnerTabs category={null} />

      <Block id="intro" eyebrow="Introduction" title="One Partnership. Multiple Business Opportunities.">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="space-y-5 text-lg leading-relaxed text-soft lg:col-span-7">
            {(o.content?.intro?.length ? o.content.intro : [
              'LAX360 Pvt Ltd builds software, AI and automation solutions, runs digital marketing, and delivers training. Our partnership ecosystem exists so that people and businesses who want to grow with us have a clear, honest way to do it.',
              'You can open an approved LAX360 business as a franchisee, support our sales as an authorized partner, or simply refer people who need our services. Each model has its own commitment, responsibilities and earning rules, which we explain openly before you apply.',
              'These programs are open to entrepreneurs, professionals and existing businesses. Every application is an enquiry: approval follows a consultation, verification and an agreement.',
            ]).map((p) => <p key={p}>{p}</p>)}
          </div>
          <div className="lg:col-span-5"><h3 className="eyebrow mb-4 text-soft">Three business divisions</h3><ul className="divide-y divide-edge border-y border-edge">{DIVISIONS.map((d) => <li key={d.slug} className="flex items-center gap-3 py-3.5"><span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: d.accent }} /><span className="font-semibold">{d.long}</span></li>)}</ul></div>
        </div>
      </Block>

      <section id="programs" aria-labelledby="programs-t" className="scroll-mt-40 border-b border-edge">
        <div className="wrap pt-12 md:pt-16"><h2 id="programs-t" className="h2 max-w-3xl">Explore Our Partnership Programs</h2><p className="lead mt-5 max-w-3xl text-soft">Choose how you want to take part. Each program has its own page for Education, Digital Marketing and IT &amp; Software.</p></div>
        {CATEGORIES.map((c, i) => (
          <div key={c.slug} id={`program-${c.slug}`} className={`wrap scroll-mt-40 grid items-center gap-8 py-10 md:py-14 lg:grid-cols-12 lg:gap-14 ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
            <Reveal className="lg:col-span-5">
              <div className="border-l-4 pl-6" style={{ borderColor: c.accent }}>
                <p className="eyebrow mb-3" style={{ color: c.accent }}>{`0${i + 1}`} · {c.short}</p>
                <h3 className="font-display text-3xl font-semibold leading-tight md:text-4xl">{c.label === 'Franchise' ? 'Franchise Opportunities' : c.label === 'Authorized Partner' ? 'Authorized Partner Program' : 'Referral Partner Program'}</h3>
                <p className="mt-4 leading-relaxed text-soft">{c.summary}</p>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-7">
              <ul className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-3">
                {DIVISIONS.map((d) => <li key={d.slug} className="bg-night"><Link to={opportunityPath(c.slug, d.slug)} className="group flex h-full min-h-28 flex-col justify-between p-5 transition-colors hover:bg-glass"><span className="font-display text-lg font-semibold">{d.label}</span><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: d.accent }}>View details<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span></Link></li>)}
              </ul>
              <div className="mt-5"><Button to={c.path} variant="secondary">{c.slug === 'franchise' ? 'Explore Franchise Opportunities' : c.slug === 'authorized-partner' ? 'Explore Authorized Partnership' : 'Explore Referral Partnership'}</Button></div>
            </Reveal>
          </div>
        ))}
      </section>

      <Block id="divisions" eyebrow="Our business divisions" title="Where you can build with LAX360" lead="Only services LAX360 offers or has approved for publication are described here." tint>
        <div className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge lg:grid-cols-3">
          {DIVISIONS.map((d) => { const Icon = ICON[d.icon]; return (
            <article key={d.slug} className="bg-night p-7">
              <div className="mb-5 h-1.5 w-16 rounded-full" style={{ background: d.accent }} />
              <Icon className="size-7" style={{ color: d.accent }} aria-hidden="true" />
              <h3 className="mt-4 font-display text-2xl font-semibold">{d.long}</h3>
              <p className="mt-2 text-soft">{d.blurb}</p>
              <ul className="mt-5 space-y-1.5 text-sm">{d.services.map((s) => <li key={s} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full" style={{ background: d.accent }} />{s}</li>)}</ul>
              {d.slug === 'education' && <div className="mt-6"><CoursesButton accent={d.accent} /></div>}
            </article>
          )})}
        </div>
      </Block>

      <Block id="upcoming" eyebrow="Coming soon" title="Upcoming service areas" lead="CAD and engineering design, robotics, and blockchain and Web 3.0 are planned for all three programs. They are not open yet." tint><UpcomingMatrix /></Block>

      <Block id="why" eyebrow="Why partner" title="Why Partner With LAX360?" lead="Support commitments apply as set out in the partnership agreement for each program.">
        <ul className="grid gap-x-12 gap-y-7 md:grid-cols-2">{WHY.map(([t, d]) => <li key={t}><h3 className="font-display text-xl font-semibold">{t}</h3><p className="mt-1.5 text-soft">{d}</p></li>)}</ul>
      </Block>

      <Block id="compare" eyebrow="Compare" title="Partnership comparison" lead="Franchise investment and fees are not finalised: they are available on consultation. Authorized and referral partner registration is free." tint>
        <ComparisonTable />
      </Block>

      <Block id="journey" eyebrow="How it works" title="How to become a partner" lead="Submitting an application is an enquiry. It does not make you a partner."><Steps items={JOURNEY} /></Block>

      <Block id="who" eyebrow="Eligibility" title="Who can become a partner?" lead="Eligibility depends on the program you choose." tint>
        <ul className="flex flex-wrap gap-2.5">{WHO_CAN_APPLY.map((w) => <li key={w} className="rounded-full border border-edge px-4 py-2 text-sm font-semibold">{w}</li>)}</ul>
      </Block>

      <Block id="ecosystem" eyebrow="Support" title="Partner support ecosystem" lead="Which of these apply depends on the program and your agreement."><Checklist items={ECOSYSTEM} cols /></Block>

      <Block id="commercial" eyebrow="Commercial policies" title="How authorized and referral partners are rewarded" lead="Public summary of the approved model. Rates and internal terms are not published." tint>
        <dl className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2">{PARTNER_POLICIES.map(([k, v]) => <div key={k} className="bg-night p-5"><dt className="font-semibold">{k}</dt><dd className="mt-1 text-soft">{v}</dd></div>)}</dl>
      </Block>

      <Block id="faq" eyebrow="FAQ" title="Frequently asked questions"><Faqs items={faqs.slice(0, 8)} /><p className="mt-5"><Link to="/partner-with-us/faq" className="link-underline font-semibold">See all partnership FAQs</Link></p></Block>

      <section aria-labelledby="final-t" className="border-t border-edge"><div className="wrap py-16 text-center md:py-24">
        <h2 id="final-t" className="h2 mx-auto max-w-3xl">Your Next Business Opportunity Starts Here.</h2>
        <Cta className="mt-8 justify-center" brochureUrl={data?.general_brochure_url} portalUrl={data?.portal_url} />
        <p className="mt-8 text-sm text-soft"><Link to="/partner-with-us/faq" className="link-underline">Partnership FAQs</Link> · <Link to="/partner-with-us/privacy-policy" className="link-underline">Partnership privacy notice</Link> · <Link to="/partner-with-us/terms-and-conditions" className="link-underline">Partnership terms</Link></p>
      </div></section>
    <PartnerEnquiryForm />
      </div>
    </PageContainer>
  )
}
