import { Link, useParams } from 'react-router-dom'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import PartnerEnquiryForm from '../components/partner/PartnerEnquiryForm.jsx'
import EnquiryForm from '../components/sections/EnquiryForm.jsx'
import { StatusBadge, UpcomingIcon } from '../components/upcoming/UpcomingUI.jsx'
import { STATUSES, PROGRAMS, isLive } from '../data/upcomingServices.js'
import { useUpcomingCategory } from '../hooks/useUpcoming.js'
import NotFound from './NotFound.jsx'

/**
 * One upcoming service category (/cad-engineering, /robotics, /blockchain, /upcoming/<slug>). Says plainly what is planned, shows the status of the category and of each service in it
 * (Coming Soon, Under Development, Available, Temporarily Unavailable), lists the partnership programs it will be offered under in future, and lets visitors register their interest.
 * It never presents an upcoming service as available, and never presents a partnership as open. Everything is managed in Admin > Services; "Available" turns it into a normal service page.
 */
export default function UpcomingService({ slug: fixed }) {
  const params = useParams()
  const c = useUpcomingCategory(fixed || params.slug)
  if (!c) return <NotFound />
  return <Page c={c} />
}

const INTEREST_NOTE = 'Registering your interest is an enquiry: it does not reserve a service, make you a partner or create any agreement.'

function Page({ c }) {
  const live = isLive(c.status)
  const note = STATUSES[c.status]?.note
  const programs = PROGRAMS.filter((p) => c.partners[p.key])
  return (
    <PageContainer path={c.path} title={c.seoTitle} description={c.seoDescription}>
      <section className="relative overflow-hidden border-b border-edge">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-24 size-[34rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.28), transparent)' }} />
        <div className="wrap relative grid items-center gap-10 pb-14 pt-10 md:pb-20 md:pt-16 lg:grid-cols-12">
          <Reveal y={12} className={c.image ? 'lg:col-span-7' : 'lg:col-span-10'}>
            <p className="eyebrow mb-6 flex flex-wrap items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-10 bg-current" />{c.name}<StatusBadge status={c.status} /></p>
            <h1 className="h1 !text-[clamp(2.4rem,5.4vw,5rem)]">{c.headline}</h1>
            <p className="lead mt-7 max-w-3xl text-soft">{c.lead || c.tagline}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {live && c.ctaLink ? <Button href={c.ctaLink.startsWith('/') ? undefined : c.ctaLink} to={c.ctaLink.startsWith('/') ? c.ctaLink : undefined} arrow>{c.ctaLabel || 'Get started'}</Button> : null}
              <Button href="#interest" variant={live && c.ctaLink ? 'secondary' : 'primary'} arrow={!live}>{live ? 'Make an enquiry' : 'Register your interest'}</Button>
              <Button to="/services" variant="secondary">All services</Button>
            </div>
          </Reveal>
          {c.image && (
            <Reveal delay={0.1} className="lg:col-span-5">
              <img src={c.image} alt="" loading="eager" decoding="async" className="aspect-[5/4] w-full rounded-3xl border border-edge object-cover shadow-xl" />
            </Reveal>
          )}
        </div>
      </section>

      <section className="wrap section" aria-labelledby="status-title">
        <Reveal className={`glass max-w-4xl border-l-4 p-6 md:p-8 ${live ? 'border-emerald-500' : 'border-amber-400'}`}>
          <h2 id="status-title" className="flex flex-wrap items-center gap-3 font-display text-2xl font-semibold">{live ? 'Available now' : 'Status of this service'}<StatusBadge status={c.status} /></h2>
          <p className="mt-3 text-lg text-soft">{note}</p>
          {c.description.map((p) => <p key={p} className="mt-3 text-soft">{p}</p>)}
          {c.launchNote && <p className="mt-3 font-semibold">{c.launchNote}</p>}
        </Reveal>
      </section>

      {c.services.length > 0 && (
        <section className="wrap section pt-0" aria-labelledby="services-title">
          <SectionHeading id="services-title" eyebrow={live ? 'Services' : 'Planned services'} title={live ? 'What we' : 'What is'} gradient={live ? 'offer.' : 'planned.'} />
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {c.services.map((s, i) => (
              <Reveal as="li" key={s.slug} delay={i * 0.06} className="glass flex flex-col gap-3 p-6">
                {s.image && <img src={s.image} alt="" loading="lazy" decoding="async" className="aspect-[16/8] w-full rounded-2xl object-cover" />}
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white"><UpcomingIcon item={s.iconImage ? s : c} /></span>
                  <StatusBadge status={s.status} />
                </div>
                <h3 className="font-display text-xl font-semibold">{s.name}</h3>
                <p className="text-soft">{s.summary}</p>
                {s.description.map((p) => <p key={p} className="text-soft">{p}</p>)}
                <a href={`#interest`} className="mt-auto inline-flex min-h-11 items-center pt-1 text-sm font-semibold text-lav">{isLive(s.status) ? 'Enquire about this service' : 'Register interest in this service'}</a>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {c.areas.length > 0 && (
        <section className="wrap section pt-0" aria-labelledby="areas-title">
          <SectionHeading id="areas-title" eyebrow="Direction" title="Our planned direction and areas of interest" />
          <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {c.areas.map((a, i) => (
              <Reveal as="li" key={a.title} delay={i * 0.05} className="glass p-6">
                <h3 className="font-display text-xl font-semibold">{a.title}</h3>
                <p className="mt-2 text-soft">{a.text}</p>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {c.today.length > 0 && (
        <section className="wrap section pt-0" aria-labelledby="now-title">
          <h2 id="now-title" className="sr-only">What is available today</h2>
          <Reveal className="glass p-6 md:p-8">
            <p className="eyebrow text-lav">Available today</p>
            <p className="mt-2 font-display text-2xl font-semibold">What LAX360 already delivers</p>
            <ul className="mt-4 space-y-2 text-soft">{c.today.map((x) => <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-lav" />{x}</li>)}</ul>
            <div className="mt-6 flex flex-wrap gap-3">{c.todayLinks.map((l) => <Button key={l.to} to={l.to} variant="secondary">{l.label}</Button>)}</div>
          </Reveal>
        </section>
      )}

      {programs.length > 0 && (
        <section className="wrap section pt-0" aria-labelledby="programs-title">
          <SectionHeading id="programs-title" eyebrow="Partnership programs" title="Planned for our" gradient="partner programs."
            lead={live ? 'This service is included in the following partnership programs. Each program has its own eligibility and agreement.'
              : 'We plan to include this category in our partnership programs when it launches. These programs are not open for it yet: there is no franchise, authorized partner or referral arrangement for it today.'} />
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {programs.map((p, i) => (
              <Reveal as="li" key={p.key} delay={i * 0.06} className="glass flex flex-col gap-2 p-6">
                <h3 className="font-display text-lg font-semibold">{p.label}</h3>
                {!live && <StatusBadge status={c.status} className="self-start" />}
                <p className="text-sm text-soft">{live ? 'Open to applications under the program terms.' : 'Planned for the future. Not open yet.'}</p>
                <Link to={p.path} className="mt-auto inline-flex min-h-11 items-center pt-1 text-sm font-semibold text-lav">About the {p.label}</Link>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      <section id="interest" className="wrap section pt-0 scroll-mt-28" aria-labelledby="interest-title">
        <div className="grid gap-10 lg:grid-cols-12">
          <SectionHeading id="interest-title" className="lg:col-span-4" eyebrow={live ? 'Enquire' : 'Stay informed'} title={live ? 'Make an' : 'Register your'} gradient={live ? 'enquiry.' : 'interest.'}
            lead={live ? 'Tell us what you need and we will get back to you.' : `Tell us you are interested in ${c.name} and we will contact you as the plans progress. ${INTEREST_NOTE}`} />
          <Reveal className="glass p-5 sm:p-8 lg:col-span-8">
            <EnquiryForm key={c.slug} defaultType="upcoming-interest" presets={{ service: c.name }} idPrefix={`interest-${c.slug}`} source="upcoming" />
          </Reveal>
        </div>
      </section>
      <PartnerEnquiryForm id="partner-enquiry" division={c.slug} title={`Partner with us on ${c.short}`} lead={live ? 'Tell us which partnership programs and business divisions interest you.' : `${c.name} is not open for partnership yet. Register your interest: one enquiry can cover several business divisions.`} />
    </PageContainer>
  )
}
