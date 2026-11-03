import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHero from '../components/sections/PageHero.jsx'
import DivisionArt from '../components/art/DivisionArt.jsx'
import ProcessTimeline from '../components/sections/ProcessTimeline.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Accordion from '../components/ui/Accordion.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { getDivision, divisions } from '../data/services.js'
import { slugify } from '../utils/slugify.js'
import CmsServiceDetail from '../components/cms/CmsServiceDetail.jsx'
import { useContent, useContentReady } from '../hooks/useSite.js'
import NotFound from './NotFound.jsx'

/** One template for all four division pages; the AI page swaps in the violet accent and workflow block. */
export default function ServiceDetail() {
  const { slug } = useParams()
  const d = getDivision(slug)
  const cmsServices = useContent('service')
  const cmsCategories = useContent('service_category')
  const ready = useContentReady()
  if (!d) { // not one of the built-in divisions: maybe a service created in the admin panel
    const svc = cmsServices?.find((s) => s.slug === slug)
    if (svc) return <CmsServiceDetail service={svc} categoryTitle={cmsCategories?.find((c) => c.slug === svc.data.category)?.title} />
    if (!ready) return <div className="wrap section min-h-[50vh]" role="status"><p className="text-soft">Loading…</p></div>
    return <NotFound />
  }
  const isAi = d.slug === 'ai'
  const accentText = isAi ? 'text-violet' : 'text-lav'
  const related = d.related.map(getDivision).filter(Boolean)

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
      }}
    >
      <PageHero eyebrow={`${d.number} — ${d.name}`} title={d.heroLine} lead={d.short} accent={isAi ? 'violet' : 'monogram'} art={<DivisionArt id={d.slug} className="h-auto w-full" />}>
        <Button to={`/contact?type=${d.enquiryType}`} variant={isAi ? 'violet' : 'primary'} arrow>
          {isAi ? 'Book an AI consultation' : 'Discuss Your Project'}
        </Button>
        <Button to="/services" variant="secondary">All services</Button>
      </PageHero>

      <section className="wrap section grid gap-10 lg:grid-cols-12 lg:gap-16" aria-labelledby="overview-title">
        <h2 id="overview-title" className="h2 lg:col-span-5">What this division does.</h2>
        <p className="text-lg text-soft lg:col-span-7">{d.overview}</p>
      </section>

      <section className="border-y border-edge bg-glass" aria-labelledby="offerings-title">
        <div className="wrap section">
          <SectionHeading id="offerings-title" eyebrow="Capabilities" title={isAi ? 'Four things we build.' : `What we ${d.slug === 'engineering' ? 'prepare' : 'offer'}.`} />
          <ol className="mt-12 divide-y divide-edge border-y border-edge">
            {d.offerings.map((o, i) => (
              <Reveal as="li" key={o.name} id={slugify(o.name)} delay={i * 0.04} className="grid gap-2 py-6 md:grid-cols-[5rem_1fr_1.4fr] md:gap-8">
                <span className={`font-display text-2xl font-medium ${accentText}`}>0{i + 1}</span>
                <h3 className="font-display text-2xl font-semibold">{o.name}</h3>
                <p className="text-soft">{o.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="wrap section grid gap-12 lg:grid-cols-2 lg:gap-20" aria-labelledby="challenges-title">
        <div>
          <h2 id="challenges-title" className="h2">Challenges we address.</h2>
          <ul className="mt-8 space-y-4">
            {d.challenges.map((c) => (
              <li key={c} className="flex gap-3 text-lg"><Check className={`mt-1.5 size-5 shrink-0 ${accentText}`} aria-hidden="true" />{c}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="h3">Typical use cases</h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {d.useCases.map((u) => <li key={u} className="tag !py-1.5 !text-base">{u}</li>)}
          </ul>
          {d.stack && (
            <>
              <h2 className="h3 mt-10">Technology we work with</h2>
              <p className="mt-4 text-soft">{d.stack.join(' · ')}</p>
              <p className="mt-2 text-sm text-soft">{d.stackNote}</p>
            </>
          )}
        </div>
      </section>

      {isAi && (
        <section className="border-y border-edge bg-glass" aria-labelledby="workflow-title">
          <div className="wrap section">
            <h2 id="workflow-title" className="h2">An example workflow.</h2>
            <p className="eyebrow mt-4 text-violet">{d.workflowLabel}</p>
            <ol className="mt-8 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-4">
              {d.workflow.map((s, i) => (
                <li key={s} className="flex items-center gap-4 bg-night p-6 md:flex-col md:items-start md:gap-8">
                  <span className="font-display text-3xl font-semibold text-violet">0{i + 1}</span>
                  <span className="font-display text-xl font-semibold">{s}</span>
                </li>
              ))}
            </ol>
            <h3 className="h3 mt-14">How we keep data safe</h3>
            <ul className="mt-5 max-w-2xl space-y-3 text-soft">
              {d.dataSafety.map((s) => <li key={s} className="flex gap-3"><Check className="mt-1.5 size-5 shrink-0 text-violet" aria-hidden="true" />{s}</li>)}
            </ul>
          </div>
        </section>
      )}

      <ProcessTimeline eyebrow="Engagement" title="How we work with you." lead={d.engagement} />

      <section className="wrap section border-t border-edge" aria-labelledby="faq-title">
        <div className="grid gap-10 lg:grid-cols-12">
          <SectionHeading id="faq-title" className="lg:col-span-4" eyebrow="FAQ" title="Questions about this division." />
          <div className="lg:col-span-8"><Accordion items={d.faqs} /></div>
        </div>
      </section>

      <section className="border-t border-edge bg-glass" aria-labelledby="related-title">
        <div className="wrap section">
          <h2 id="related-title" className="h3">Related services</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link to={`/services/${r.slug}`} className="group flex h-full items-center justify-between gap-4 rounded-xl border border-edge bg-night p-6 hover:border-2 hover:border-edge-strong hover:p-[23px]">
                  <span>
                    <span className="block font-display text-2xl font-semibold">{r.name}</span>
                    <span className="mt-1 block text-soft">{r.short}</span>
                  </span>
                  <ArrowRight className="size-6 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-soft">Other divisions: {divisions.filter((x) => x.slug !== d.slug).map((x) => x.name).join(', ')}.</p>
        </div>
      </section>

      <ContactCta defaultType={d.enquiryType} title={isAi ? 'Describe the repetitive task.' : 'Tell us what you need.'} />
    </PageContainer>
  )
}
