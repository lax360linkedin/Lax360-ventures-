import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Check, Lightbulb } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import ProcessTimeline from '../components/sections/ProcessTimeline.jsx'
import Accordion from '../components/ui/Accordion.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { heroes, serviceSections } from '../components/sections/services/CategoryLayouts.jsx'
import CmsServiceDetail from '../components/cms/CmsServiceDetail.jsx'
import { getDivision, divisions } from '../data/services.js'
import { divisionIcons } from '../utils/divisionIcons.js'
import { useContent, useContentReady } from '../hooks/useSite.js'
import NotFound from './NotFound.jsx'

/**
 * /services/<category> — one page per service category. Every category has its own hero and its own way of presenting its services
 * (see components/sections/services/CategoryLayouts.jsx); the shared parts below are the overview, category extras, use cases, process, FAQ,
 * related categories and the closing call to action.
 */
export default function ServiceDetail() {
  const { slug } = useParams()
  const d = getDivision(slug)
  const cmsServices = useContent('service')
  const cmsCategories = useContent('service_category')
  const ready = useContentReady()
  if (!d) { // not one of the built-in categories: maybe a service created in the admin panel
    const svc = cmsServices?.find((s) => s.slug === slug)
    if (svc) return <CmsServiceDetail service={svc} categoryTitle={cmsCategories?.find((c) => c.slug === svc.data.category)?.title} />
    if (!ready) return <div className="wrap section min-h-[50vh]" role="status"><p className="text-soft">Loading…</p></div>
    return <NotFound />
  }
  const isAi = d.slug === 'ai'
  const Hero = heroes[d.slug]
  const Services = serviceSections[d.slug]
  const related = d.related.map(getDivision).filter(Boolean)
  const Icon = divisionIcons[d.slug]

  return (
    <PageContainer
      path={`/services/${d.slug}`}
      title={d.metaTitle}
      description={d.metaDescription}
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: d.name,
        description: d.metaDescription,
        provider: { '@type': 'Organization', name: 'LAX360 Ventures' },
        hasOfferCatalog: { '@type': 'OfferCatalog', name: d.name, itemListElement: d.offerings.map((o) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: o.name, description: o.text } })) },
      }}
    >
      <Hero d={d} />

      {/* overview + problems */}
      <section className="wrap section grid gap-10 lg:grid-cols-12 lg:gap-16" aria-labelledby="overview-title">
        <Reveal className="lg:col-span-7">
          <p className="eyebrow flex items-center gap-2 text-lav"><Icon className="size-4" aria-hidden="true" />Overview</p>
          <h2 id="overview-title" className="h2 mt-3">What this category covers.</h2>
          <p className="mt-5 text-lg text-soft">{d.overview}</p>
          <p className="mt-4 text-lg text-soft">{d.outcome}</p>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-5">
          <div className="glass p-6 md:p-8">
            <h3 className="font-display text-xl font-semibold">Challenges we address</h3>
            <ul className="mt-4 space-y-3">{d.challenges.map((c) => <li key={c} className="flex gap-3"><Check className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" />{c}</li>)}</ul>
          </div>
        </Reveal>
      </section>

      {/* the services: a different layout for each category */}
      <section id="services" className="scroll-mt-[calc(var(--header-bottom,92px)+1rem)] border-y border-edge bg-glass" aria-labelledby="services-title">
        <div className="wrap section">
          <SectionHeading id="services-title" eyebrow={`${d.offerings.length} services`} title="Explore" gradient="every service." lead="Select a service for a full description, key features, benefits and examples." />
          <div className="mt-10"><Services d={d} /></div>
        </div>
      </section>

      {d.highlights && (
        <section className="wrap section" aria-labelledby="highlights-title">
          <SectionHeading id="highlights-title" eyebrow="Built for integration" title="What this category" gradient="gives you." lead={`For ${d.audiences.join(', ').toLowerCase()}.`} />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {d.highlights.map((h, i) => (
              <Reveal as="li" key={h.title} delay={(i % 3) * 0.06} className="glass-flat lift p-6"><p className="font-display text-xl font-semibold">{h.title}</p><p className="mt-1 text-soft">{h.text}</p></Reveal>
            ))}
          </ul>
        </section>
      )}

      {isAi && (
        <section className="wrap section" aria-labelledby="safety-title">
          <h2 id="safety-title" className="h2">How we keep data safe.</h2>
          <ul className="mt-6 max-w-2xl space-y-3 text-lg text-soft">{d.dataSafety.map((s) => <li key={s} className="flex gap-3"><Check className="mt-1.5 size-5 shrink-0 text-lav" aria-hidden="true" />{s}</li>)}</ul>
        </section>
      )}

      {/* use cases */}
      <section className="border-y border-edge bg-base2/50" aria-labelledby="uses-title">
        <div className="wrap section">
          <h2 id="uses-title" className="h2 flex items-center gap-3"><Lightbulb className="size-7 text-lav" aria-hidden="true" />Typical use cases</h2>
          <ul className="mt-6 flex flex-wrap gap-2.5">{d.useCases.map((u) => <li key={u} className="tag !py-2 !text-base">{u}</li>)}</ul>
          {d.stack && <p className="mt-8 max-w-3xl text-soft"><span className="font-semibold text-fg">Technology we work with: </span>{d.stack.join(' · ')}. {d.stackNote}</p>}
        </div>
      </section>

      <ProcessTimeline eyebrow="Engagement" title="How we work with you." lead={d.engagement} />

      <section className="wrap section border-t border-edge" aria-labelledby="faq-title">
        <div className="grid gap-10 lg:grid-cols-12">
          <SectionHeading id="faq-title" className="lg:col-span-4" eyebrow="FAQ" title="Questions about this category." />
          <div className="lg:col-span-8"><Accordion items={d.faqs} /></div>
        </div>
      </section>

      {/* related categories */}
      <section className="border-t border-edge bg-glass" aria-labelledby="related-title">
        <div className="wrap section">
          <h2 id="related-title" className="h3">Related categories</h2>
          <ul className="mt-6 grid gap-5 md:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link to={`/services/${r.slug}`} className="glass-flat lift group flex h-full items-center gap-5 overflow-hidden p-4">
                  <img src={r.photo} alt="" width="200" height="150" loading="lazy" decoding="async" className="h-24 w-28 shrink-0 rounded-2xl object-cover" />
                  <span className="flex-1"><span className="block font-display text-xl font-semibold leading-tight">{r.name}</span><span className="mt-1 block text-soft">{r.short}</span></span>
                  <ArrowRight className="size-6 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-soft">All categories: {divisions.map((x, i) => <span key={x.slug}>{i > 0 && ' · '}{x.slug === d.slug ? x.name : <Link to={`/services/${x.slug}`} className="hover:text-lav">{x.name}</Link>}</span>)}.</p>
        </div>
      </section>

      {/* call to action */}
      <section className="wrap py-16 md:py-24" aria-labelledby="cat-cta-title">
        <Reveal>
          <div className="glass relative overflow-hidden p-8 text-center md:p-14">
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-0 size-72 rounded-full bg-primary/25 blur-3xl" />
            <h2 id="cat-cta-title" className="h2 relative">{isAi ? 'Describe the repetitive task.' : 'Tell us what you need.'}</h2>
            <p className="lead relative mx-auto mt-5 max-w-2xl text-soft">Share what you are planning and we will help you explore the right approach within {d.name}.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button to={`/contact?type=${d.enquiryType}`} arrow>Enquire Now</Button>
              <Button to="/services" variant="secondary">All services</Button>
            </div>
            <p className="relative mt-4 text-sm text-soft"><Link to="/contact?type=project" className="link-underline inline-flex items-center gap-1 font-semibold text-lav">Start a Project <ArrowUpRight className="size-4" aria-hidden="true" /></Link></p>
          </div>
        </Reveal>
      </section>
    </PageContainer>
  )
}
