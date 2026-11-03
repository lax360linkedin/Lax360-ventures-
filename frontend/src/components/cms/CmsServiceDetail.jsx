import { Check } from 'lucide-react'
import PageContainer from '../layout/PageContainer.jsx'
import PageHero from '../sections/PageHero.jsx'
import ContactCta from '../sections/ContactCta.jsx'
import Button from '../ui/Button.jsx'
import Reveal from '../ui/Reveal.jsx'
import { toLines, toParagraphs } from '../../utils/cms.js'

/** The detail page for a service created in the admin panel (/services/<its slug>). */
export default function CmsServiceDetail({ service, categoryTitle }) {
  const d = service.data
  const points = toLines(d.details)
  const link = d.cta_link || '/contact?type=project'
  return (
    <PageContainer path={`/services/${service.slug}`} title={service.title} description={d.summary}
      jsonLd={{ '@context': 'https://schema.org', '@type': 'Service', name: service.title, description: d.summary, provider: { '@type': 'Organization', name: 'LAX360 Ventures' } }}>
      <PageHero eyebrow={categoryTitle || 'Service'} title={service.title} lead={d.summary}
        art={d.image ? <img src={d.image} alt={d.image_alt || ''} className="h-auto w-full rounded-xl object-cover" /> : null}>
        <Button to={/^https?:/.test(link) ? undefined : link} href={/^https?:/.test(link) ? link : undefined} arrow>{d.cta_label || 'Discuss Your Project'}</Button>
      </PageHero>
      {(d.description || points.length > 0) && (
        <section className="wrap section grid gap-10 lg:grid-cols-12" aria-label="About this service">
          <div className="space-y-5 text-lg text-soft lg:col-span-7">
            {toParagraphs(d.description).map((p, i) => <Reveal as="p" key={i} delay={i * 0.04}>{p}</Reveal>)}
          </div>
          {points.length > 0 && (
            <Reveal className="lg:col-span-5">
              <ul className="glass-flat space-y-3 p-6 md:p-8">
                {points.map((p) => <li key={p} className="flex gap-3"><Check className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" /><span>{p}</span></li>)}
              </ul>
            </Reveal>
          )}
        </section>
      )}
      <ContactCta title="Discuss your requirements." />
    </PageContainer>
  )
}
