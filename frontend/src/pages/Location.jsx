import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, ChevronRight, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import BranchMap from '../components/ui/BranchMap.jsx'
import OwnerLinks from '../components/layout/OwnerLinks.jsx'
import { allDivisions } from '../data/services.js'
import { useBranchDirectory } from '../hooks/useBranches.js'
import { useContentReady, useSite } from '../hooks/useSite.js'
import { localBusinessSchemas } from '../utils/seo.js'
import { whatsappLink } from '../utils/whatsapp.js'
import NotFound from './NotFound.jsx'

const crumb = 'inline-flex min-h-9 items-center transition-colors hover:text-lav'

/** The part of an address that names the neighbourhood (the second line when the address has three), for the page text. Nothing is invented: it is read from the branch's own address. */
const areaOf = (b) => (b.address && b.address.length >= 3 ? b.address[1].replace(/,.*$/, '') : '')

/**
 * /locations/<branch>: one office of LAX360 Pvt Ltd with its real address, phone, map and directions, how to reach it, and what a visitor can enquire about. Every branch the administrator adds
 * (Admin Panel > Branch locations) gets its page automatically; the three built-in offices are prerendered. The text is built from the branch's own details, so no page repeats another's.
 */
export default function Location() {
  const { slug } = useParams()
  const { branches, live } = useBranchDirectory()
  const ready = useContentReady()
  const site = useSite()
  const b = branches.find((x) => x.id === slug)
  if (!b) return live && ready ? <NotFound /> : <div className="wrap section min-h-[50vh]" role="status"><p className="text-soft">Loading…</p></div>
  const area = areaOf(b)
  const others = branches.filter((x) => x.id !== b.id)
  const place = [b.address?.[0], area].filter(Boolean).join(', ')
  const addressText = (b.address || []).join(', ')
  const path = `/locations/${b.id}`
  const faq = [
    { q: `Where is the LAX360 Pvt Ltd office in ${b.city}?`, a: `${b.name.replace('LAX360 Pvt Ltd — ', 'LAX360 Pvt Ltd, ')} is at ${addressText || b.city}.` },
    ...(b.phone ? [{ q: `How can I contact LAX360 in ${b.city}?`, a: `Call ${b.phone}${site.email ? ` or write to ${site.email}` : ''}. You can also message the team on WhatsApp or send an enquiry through the contact page.` }] : []),
    { q: `What can I enquire about at the ${b.city} office?`, a: `${allDivisions.map((d) => d.name).join(', ')}, and technology training. Tell us about your requirement and the team will come back with a clear next step.` },
  ]
  const jsonLd = [
    ...localBusinessSchemas([b], { email: site.email, logo: '__SITE__/assets/logo-shield.png' }).map((n) => ({ ...n, url: `__SITE__${path}`, '@id': `__SITE__${path}#office` })),
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ]
  return (
    <PageContainer
      path={path}
      title={`LAX360 ${b.city}: Office, Contact & Directions`}
      description={`Visit LAX360 Pvt Ltd in ${b.city}${place ? `: ${place}` : ''}. ${b.phone ? `Call ${b.phone} for ` : 'Enquire about '}software, AI automation, digital marketing and training.`}
      jsonLd={jsonLd}
    >
      <section className="relative overflow-hidden border-b border-edge">
        <div className="wrap pb-12 pt-8 md:pb-16 md:pt-10">
          <nav aria-label="Breadcrumb" className="text-sm text-soft">
            <ol className="flex flex-wrap items-center gap-x-1.5">
              <li><Link to="/" className={crumb}>Home</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li><Link to="/locations" className={crumb}>Locations</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li aria-current="page" className="font-semibold text-fg">{b.city}</li>
            </ol>
          </nav>
          <p className="eyebrow mt-8 flex items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-10 bg-current" />LAX360 Pvt Ltd · {b.city} office</p>
          <h1 className="h1 mt-5 !text-[clamp(2.25rem,5vw,4.5rem)]">LAX360 in <span className="text-gradient">{b.city}</span></h1>
          <p className="lead mt-6 max-w-2xl text-soft">
            Our {b.city} office{place ? ` is at ${place}` : ''}. Visit us, call or message the team to talk about software, AI and business automation, digital marketing or technology training for your business.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {b.phone && <Button href={`tel:${b.tel}`}><Phone className="size-5" aria-hidden="true" /> Call {b.phone}</Button>}
            <Button href={whatsappLink(`Hi LAX360 Pvt Ltd, I would like to talk to the ${b.city} office.`)} variant="secondary"><MessageCircle className="size-5" aria-hidden="true" /> WhatsApp</Button>
            {b.mapUrl && <Button href={b.mapUrl} variant="secondary"><MapPin className="size-5" aria-hidden="true" /> Get directions</Button>}
          </div>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="office-title">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <SectionHeading id="office-title" eyebrow="Office details" title="Find" gradient={`our ${b.city} office.`} />
            <address className="mt-6 not-italic">
              <p className="font-display text-xl font-semibold">{b.name}</p>
              <p className="mt-3 space-y-1 text-soft">{(b.address || []).map((l) => <span key={l} className="block">{l}</span>)}</p>
            </address>
            <ul className="mt-5 space-y-1">
              {b.phone && <li><a href={`tel:${b.tel}`} className="inline-flex min-h-11 items-center gap-2 font-semibold hover:text-lav"><Phone className="size-4 text-lav" aria-hidden="true" />{b.phone}</a></li>}
              {site.email && <li><a href={`mailto:${site.email}`} className="inline-flex min-h-11 items-center gap-2 break-all font-semibold hover:text-lav"><Mail className="size-4 shrink-0 text-lav" aria-hidden="true" />{site.email}</a></li>}
              {b.mapUrl && <li><a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-semibold text-lav hover:underline">View on Google Maps<ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></li>}
            </ul>
            {site.businessHours && <p className="mt-4 whitespace-pre-line text-sm text-soft"><strong className="text-fg">Hours: </strong>{site.businessHours}</p>}
            <OwnerLinks type="branch" owner={b.id} name={`${b.city} branch`} title="Follow this office" className="mt-6" />
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-7">
            {b.embed ? <BranchMap src={b.embed} title={`Map of the LAX360 ${b.city} office`} /> : (
              <div className="glass-flat flex aspect-[4/3] flex-col items-center justify-center gap-4 p-6 text-center"><MapPin className="size-10 text-lav" aria-hidden="true" /><p className="text-soft">Open the office on Google Maps for directions.</p>{b.mapUrl && <Button href={b.mapUrl} arrow>Open Google Maps</Button>}</div>
            )}
          </Reveal>
        </div>
      </section>

      <section className="border-y border-edge bg-base2/50" aria-labelledby="enquire-title">
        <div className="wrap section">
          <SectionHeading id="enquire-title" eyebrow="What you can ask us" title="Services you can enquire about in" gradient={`${b.city}.`} lead="The same LAX360 team and services are reached through every office. Choose what you need and send an enquiry, or visit us." />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allDivisions.map((d, i) => (
              <Reveal as="li" key={d.slug} delay={i * 0.05}>
                <Link to={d.to} className="glass-flat lift group flex h-full flex-col gap-2 p-5">
                  <span className="font-display text-lg font-semibold transition-colors group-hover:text-lav">{d.name}</span>
                  <span className="flex-1 text-sm text-soft">{d.short}</span>
                  <span className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-lav">Learn more <ArrowRight className="size-4" aria-hidden="true" /></span>
                </Link>
              </Reveal>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button to="/contact?type=quote" arrow>Request a quote</Button><Button to="/demo" variant="secondary">Get a demo</Button></div>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="faq-title">
        <SectionHeading id="faq-title" eyebrow={`${b.city} office`} title="Quick" gradient="answers." />
        <dl className="mt-8 grid gap-4 md:grid-cols-3">
          {faq.map((f) => <div key={f.q} className="glass-flat p-5"><dt className="font-display text-lg font-semibold">{f.q}</dt><dd className="mt-2 text-soft">{f.a}</dd></div>)}
        </dl>
        {others.length > 0 && (
          <div className="mt-10 border-t border-edge pt-6">
            <h2 className="font-display text-xl font-semibold">Our other offices</h2>
            <ul className="mt-3 flex flex-wrap gap-3">{others.map((o) => <li key={o.id}><Link to={`/locations/${o.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-edge-strong bg-glass px-5 font-semibold transition-colors hover:border-lav hover:text-lav"><MapPin className="size-4 text-lav" aria-hidden="true" />LAX360 {o.city}</Link></li>)}</ul>
          </div>
        )}
      </section>
    </PageContainer>
  )
}
