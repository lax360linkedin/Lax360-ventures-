import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, Lightbulb, TrendingUp, Wrench } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { getOffering } from '../data/services.js'
import { divisionIcons } from '../utils/divisionIcons.js'
import { serviceIcons } from '../utils/serviceIcons.js'
import { offeringHref } from '../utils/slugify.js'
import ServiceTestimonials from '../components/sections/ServiceTestimonials.jsx'
import ServiceClients from '../components/sections/ServiceClients.jsx'
import NotFound from './NotFound.jsx'

const crumb = 'inline-flex min-h-9 items-center transition-colors hover:text-lav'

/**
 * /services/<category>/<service> — one page per individual service: summary and photo, what it is, what we provide, the problems it addresses,
 * key capabilities, practical benefits, examples, related services and an enquiry call to action. Copy comes from data/serviceDetails.js.
 */
export default function ServiceItem() {
  const { slug, service } = useParams()
  const s = getOffering(slug, service)
  if (!s) return <NotFound />
  const d = s.category
  const CatIcon = divisionIcons[d.slug]
  const Icon = serviceIcons[s.slug] || CatIcon
  const idx = d.offerings.findIndex((o) => o.slug === s.slug)
  const prev = d.offerings[idx - 1]
  const next = d.offerings[idx + 1]
  const sameGroup = d.offerings.filter((o) => o.slug !== s.slug && o.group === s.group)
  const related = [...sameGroup, ...d.offerings.filter((o) => o.slug !== s.slug && o.group !== s.group)].slice(0, 3)
  const enquiry = `/contact?type=${d.enquiryType}`
  const path = `/services/${d.slug}/${s.slug}`
  return (
    <PageContainer
      path={path}
      title={`${s.name} — ${d.name}`}
      description={`${s.intro} ${s.about?.[0] || ''}`.slice(0, 300)}
      jsonLd={{ '@context': 'https://schema.org', '@type': 'Service', name: s.name, description: s.intro, provider: { '@type': 'Organization', name: 'LAX360 Pvt Ltd' }, category: d.name }}
    >
      {/* hero */}
      <section className="relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night">
        <div aria-hidden="true" className="absolute -left-28 top-10 -z-10 size-[24rem] rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-24 bottom-0 -z-10 size-[24rem] rounded-full bg-sky/15 blur-3xl" />
        <div className="wrap pb-14 pt-8 md:pt-10 lg:pb-20">
          <nav aria-label="Breadcrumb" className="text-sm text-soft">
            <ol className="flex flex-wrap items-center gap-x-1.5">
              <li><Link to="/" className={crumb}>Home</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li><Link to="/services" className={crumb}>Services</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li><Link to={`/services/${d.slug}`} className={crumb}>{d.name}</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li aria-current="page" className="font-semibold text-fg">{s.name}</li>
            </ol>
          </nav>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-6">
              <p className="inline-flex items-center gap-2.5 rounded-full border border-edge-strong bg-glass px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lav">
                <CatIcon className="size-3.5" aria-hidden="true" />{d.name}
              </p>
              <h1 className="h1 mt-5 !text-[clamp(2.1rem,4.4vw,3.8rem)]">{s.name}</h1>
              <p className="lead mt-5 text-soft">{s.intro}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button to={enquiry} arrow>Enquire Now</Button>
                <Button to={`/services/${d.slug}`} variant="secondary"><ArrowLeft className="size-4" aria-hidden="true" />All {d.name}</Button>
              </div>
            </div>
            <Reveal x={24} y={0} className="lg:col-span-6">
              <div className="relative">
                <div className="overflow-hidden rounded-[2rem] border border-edge-strong shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]">
                  <img src={s.photo} alt="" width="900" height="675" decoding="async" fetchPriority="high" className="aspect-[4/3] w-full object-cover" />
                </div>
                <span className="glass absolute -bottom-5 left-5 flex items-center gap-3 px-4 py-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Icon className="size-5" aria-hidden="true" /></span>
                  <span><span className="block text-xs font-semibold uppercase tracking-wider text-soft">{s.group}</span><span className="block font-display text-sm font-semibold leading-tight">{s.name}</span></span>
                </span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* what it is + what we provide */}
      <section className="wrap section grid gap-10 lg:grid-cols-12 lg:gap-14" aria-labelledby="about-title">
        <Reveal className="lg:col-span-7">
          <h2 id="about-title" className="h2">About this service</h2>
          <div className="mt-5 space-y-4 text-lg text-soft">{s.about.map((p) => <p key={p}>{p}</p>)}</div>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-5">
          <div className="glass p-6 md:p-8">
            <h3 className="font-display text-xl font-semibold">What we provide</h3>
            <ul className="mt-4 space-y-3">
              {s.offers.map((o) => <li key={o} className="flex gap-3"><Check className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" />{o}</li>)}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* problems */}
      <section className="border-y border-edge bg-glass" aria-labelledby="solves-title">
        <div className="wrap section">
          <SectionHeading id="solves-title" eyebrow="Why it matters" title="Problems this" gradient="service addresses." />
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {s.solves.map((p, i) => (
              <Reveal as="li" key={p} delay={i * 0.07} className="glass-flat p-6">
                <span className="font-display text-sm font-bold text-lav">0{i + 1}</span>
                <p className="mt-3 text-lg">{p}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* features */}
      <section className="wrap section" aria-labelledby="features-title">
        <SectionHeading id="features-title" eyebrow="Capabilities" title="Key features" gradient="and capabilities." />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {s.features.map(([t, text], i) => (
            <Reveal as="li" key={t} delay={i * 0.06} className="glass-flat lift flex h-full flex-col gap-3 p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Wrench className="size-5" aria-hidden="true" /></span>
              <p className="font-display text-lg font-semibold leading-tight">{t}</p>
              <p className="text-soft">{text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* benefits + use cases */}
      <section className="border-y border-edge bg-base2/50" aria-labelledby="benefits-title">
        <div className="wrap section grid gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <h2 id="benefits-title" className="h2 flex items-center gap-3"><TrendingUp className="size-7 text-lav" aria-hidden="true" />Practical benefits</h2>
            <ul className="mt-6 space-y-3">
              {s.benefits.map((b) => <li key={b} className="flex gap-3 rounded-2xl border border-edge bg-glass p-4 text-lg"><Check className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" />{b}</li>)}
            </ul>
          </div>
          <div className="lg:col-span-7">
            <h2 className="h2 flex items-center gap-3"><Lightbulb className="size-7 text-lav" aria-hidden="true" />Examples &amp; use cases</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {s.uses.map(([t, text], i) => (
                <Reveal as="li" key={t} delay={i * 0.06} className={`glass-flat p-5 ${i === 2 && s.uses.length % 2 ? 'sm:col-span-2' : ''}`}>
                  <p className="font-display text-lg font-semibold">{t}</p>
                  <p className="mt-1 text-soft">{text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <ServiceTestimonials category={d.slug} sub={s.slug} serviceName={s.name} />

      <ServiceClients category={d.slug} sub={s.slug} serviceName={s.name} />

      {/* related */}
      <section className="wrap section" aria-labelledby="related-title">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading id="related-title" eyebrow={d.name} title="Related" gradient="services." />
          <Link to={`/services/${d.slug}`} className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold text-lav">View all in this category <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {related.map((r, i) => {
            const RIcon = serviceIcons[r.slug] || CatIcon
            return (
              <Reveal as="li" key={r.slug} delay={i * 0.07}>
                <Link to={offeringHref(d.slug, r.name)} className="glass-flat lift group flex h-full flex-col gap-3 p-6">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-lav transition-colors duration-300 group-hover:bg-primary group-hover:text-white"><RIcon className="size-5" aria-hidden="true" /></span>
                  <span className="font-display text-lg font-semibold leading-tight">{r.name}</span>
                  <span className="flex-1 text-soft">{r.text}</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-lav">Read more <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                </Link>
              </Reveal>
            )
          })}
        </ul>
        <nav aria-label="Previous and next service" className="mt-8 flex flex-col justify-between gap-3 border-t border-edge pt-6 sm:flex-row">
          {prev ? <Link to={offeringHref(d.slug, prev.name)} className="group inline-flex min-h-11 items-center gap-2 text-soft hover:text-lav"><ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" /><span><span className="block text-xs uppercase tracking-wider">Previous</span><span className="font-semibold text-fg group-hover:text-lav">{prev.name}</span></span></Link> : <span />}
          {next ? <Link to={offeringHref(d.slug, next.name)} className="group inline-flex min-h-11 items-center gap-2 text-right text-soft hover:text-lav sm:ml-auto"><span><span className="block text-xs uppercase tracking-wider">Next</span><span className="font-semibold text-fg group-hover:text-lav">{next.name}</span></span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link> : null}
        </nav>
      </section>

      {/* call to action */}
      <section className="wrap pb-16 md:pb-24" aria-labelledby="item-cta-title">
        <Reveal>
          <div className="glass relative overflow-hidden p-8 text-center md:p-14">
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-0 size-72 rounded-full bg-primary/25 blur-3xl" />
            <h2 id="item-cta-title" className="h2 relative">Interested in <span className="text-gradient">{s.name}?</span></h2>
            <p className="lead relative mx-auto mt-5 max-w-2xl text-soft">Tell us what you are planning. Our team can help you explore whether this service suits your requirements and what a sensible first step would be.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button to={enquiry} arrow>Enquire Now</Button>
              <Button to="/contact?type=project" variant="secondary">Start a Project</Button>
            </div>
          </div>
        </Reveal>
      </section>
    </PageContainer>
  )
}
