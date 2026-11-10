import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Briefcase, CalendarClock, ChevronDown, Clock, GraduationCap, Heart, Laptop, Mail, MapPin, Rocket, Search, Sparkles, TrendingUp, Users } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import BranchCards from '../components/sections/BranchCards.jsx'
import ApplyForm from '../components/career/ApplyForm.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import BotHighlight from '../components/ui/BotHighlight.jsx'
import { allDivisions } from '../data/services.js'
import { branchSentence, branches } from '../data/branches.js'
import { applySteps, careerText, principles, typeLabels, workModeLabels } from '../data/career.js'
import { useCareerJobs, useCareerPageText, useCareerPerks } from '../hooks/useCmsPages.js'
import { useSite } from '../hooks/useSite.js'
import { divisionIcons } from '../utils/divisionIcons.js'

const ICONS = { sparkles: Sparkles, rocket: Rocket, graduation: GraduationCap, users: Users, laptop: Laptop, heart: Heart, trending: TrendingUp, clock: Clock, map: MapPin }
const fmtDate = (iso) => { const d = new Date(`${iso}T00:00:00`); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
const chip = (on) => `inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${on ? 'border-primary bg-primary text-white' : 'border-edge-strong bg-glass hover:border-lav hover:bg-glass-strong'}`

function Meta({ job }) {
  const bits = [
    job.department && [Briefcase, job.department], job.location && [MapPin, job.location], job.type && [Clock, typeLabels[job.type] || job.type], job.mode && [Laptop, workModeLabels[job.mode] || job.mode],
    job.closing && [CalendarClock, `Apply by ${fmtDate(job.closing)}`],
  ].filter(Boolean)
  return <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-soft">{bits.map(([Icon, text]) => <li key={text} className="inline-flex items-center gap-1.5"><Icon className="size-4 text-lav" aria-hidden="true" />{text}</li>)}</ul>
}

function JobCard({ job, i, onApply }) {
  const [open, setOpen] = useState(false)
  const detailsId = `job-${job.id}`
  const hasMore = job.description.length > 0 || job.responsibilities.length > 0 || job.requirements.length > 0 || job.eligibility
  return (
    <Reveal as="li" delay={(i % 2) * 0.05}>
      <article className="glass-flat lift flex h-full flex-col p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="font-display text-2xl font-semibold leading-tight">{job.title}</h3>
          {job.featured && <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-lav">Featured</span>}
        </div>
        <div className="mt-3"><Meta job={job} /></div>
        {(job.summary || job.description[0]) && <p className="mt-4 text-soft">{job.summary || job.description[0]}</p>}
        {job.skills.length > 0 && <ul className="mt-4 flex flex-wrap gap-2" aria-label="Key skills">{job.skills.map((s) => <li key={s} className="rounded-full border border-edge bg-glass px-3 py-1 text-xs font-semibold">{s}</li>)}</ul>}
        {job.experience && <p className="mt-3 text-sm text-soft"><span className="font-semibold text-fg">Experience:</span> {job.experience}</p>}
        {hasMore && (
          <div className="mt-4">
            <button type="button" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen((o) => !o)} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-lav hover:underline">
              {open ? 'Hide details' : 'View details'} <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <div id={detailsId} hidden={!open} className="space-y-4 border-t border-edge pt-4 text-soft">
              {job.description.map((p) => <p key={p} className="whitespace-pre-line">{p}</p>)}
              {job.responsibilities.length > 0 && <div><h4 className="font-semibold text-fg">Responsibilities</h4><ul className="mt-2 list-disc space-y-1 pl-5">{job.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul></div>}
              {job.requirements.length > 0 && <div><h4 className="font-semibold text-fg">Requirements</h4><ul className="mt-2 list-disc space-y-1 pl-5">{job.requirements.map((r) => <li key={r}>{r}</li>)}</ul></div>}
              {job.eligibility && <p><span className="font-semibold text-fg">Eligibility:</span> {job.eligibility}</p>}
            </div>
          </div>
        )}
        <div className="mt-auto pt-6">
          {job.applyLink
            ? <Button href={job.applyLink} arrow>Apply for this role</Button>
            : <Button onClick={() => onApply(job.title)} arrow>Apply for this role</Button>}
        </div>
      </article>
    </Reveal>
  )
}

/**
 * /career — the careers portal: hero, why join us, open positions (filterable), how applying works, areas of work, branches and an application form.
 * Positions, "why join us" items and the page text are managed in the admin panel (Website content > Careers); applications use the existing
 * enquiry API and appear under Enquiries (type "Careers"). No vacancy, salary or perk is built in.
 */
export default function Career() {
  const site = useSite()
  const jobs = useCareerJobs()
  const page = useCareerPageText()
  const perks = useCareerPerks()
  const [dept, setDept] = useState('all')
  const [kind, setKind] = useState('all')
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState('')

  const depts = useMemo(() => [...new Set(jobs.map((j) => j.department).filter(Boolean))], [jobs])
  const kinds = useMemo(() => [...new Set(jobs.map((j) => j.type).filter(Boolean))], [jobs])
  const q = query.trim().toLowerCase()
  const shown = jobs.filter((j) => (dept === 'all' || j.department === dept) && (kind === 'all' || j.type === kind) && (!q || [j.title, j.department, j.location, j.summary, j.skills.join(' ')].join(' ').toLowerCase().includes(q)))
  const apply = (title) => { setPosition(title); document.getElementById('apply')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }
  const why = perks.length ? perks : principles

  return (
    <PageContainer
      path="/career"
      title="Careers"
      description={`Build your career with LAX360 Pvt Ltd: software, AI, digital growth and training, with branches in ${branchSentence}. See open positions and apply online.`}
    >
      {/* Hero */}
      <section className={`relative overflow-hidden border-b border-edge ${page.hero_image ? 'media-dark' : ''}`}>
        {page.hero_image && (
          <>
            <img src={page.hero_image} alt={page.hero_image_alt || ''} width="1600" height="900" decoding="async" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-night/80 via-night/60 to-night" />
          </>
        )}
        {!page.hero_image && <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-24 size-[32rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.28), transparent)' }} />}
        <div className="wrap relative grid items-center gap-10 pb-14 pt-10 md:pb-20 md:pt-14 lg:grid-cols-12">
          <Reveal y={12} className="lg:col-span-8">
            <p className="eyebrow mb-6 flex items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-10 bg-current" />{page.hero_eyebrow || careerText.heroEyebrow}</p>
            <h1 className="h1 !text-[clamp(2.5rem,5.6vw,5.5rem)]">
              {page.hero_title || careerText.heroTitle} {!page.hero_title && <BotHighlight delay={0.4}><span className="text-gradient">{careerText.heroGradient}</span></BotHighlight>}
            </h1>
            <p className="lead mt-7 max-w-2xl text-soft">{page.hero_lead || careerText.heroLead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href={jobs.length ? '#openings' : '#apply'} arrow>{jobs.length ? 'View open positions' : 'Apply now'}</Button>
              <Button href="#apply" variant="secondary">{jobs.length ? 'Send an application' : 'Tell us about yourself'}</Button>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4">
            <dl className="glass grid grid-cols-3 gap-2 p-5 text-center lg:grid-cols-1 lg:gap-5 lg:text-left">
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-soft">Open positions</dt><dd className="font-display text-3xl font-semibold">{jobs.length || 'Apply anytime'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-soft">Areas of work</dt><dd className="font-display text-3xl font-semibold">{allDivisions.length}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-soft">Branches</dt><dd className="font-display text-3xl font-semibold">{branches.length}</dd></div>
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Why join us */}
      <section id="why" className="wrap section scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="why-title">
        <SectionHeading id="why-title" eyebrow="Why join us" title={page.why_title || careerText.whyTitle} gradient={page.why_title ? undefined : careerText.whyGradient} lead={page.why_lead || careerText.whyLead} />
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {why.map((p, i) => {
            const Icon = ICONS[p.icon] || Sparkles
            return (
              <Reveal as="li" key={p.id || p.title} delay={(i % 3) * 0.08} className="glass-flat lift p-6 md:p-8">
                <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Icon className="size-6" aria-hidden="true" /></span>
                <h3 className="mt-5 font-display text-2xl font-semibold">{p.title}</h3>
                <p className="mt-2 text-base text-soft">{p.text}</p>
              </Reveal>
            )
          })}
        </ul>
      </section>

      {/* Open positions */}
      <section id="openings" className="border-y border-edge bg-base2/50 scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="openings-title">
        <div className="wrap section">
          <SectionHeading id="openings-title" eyebrow="Open positions" title={page.openings_title || careerText.openingsTitle} gradient={page.openings_title ? undefined : careerText.openingsGradient} lead={page.openings_lead || careerText.openingsLead} />
          {jobs.length > 0 && (depts.length > 1 || kinds.length > 1 || jobs.length >= 6) && (
            <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter openings">
                <button type="button" aria-pressed={dept === 'all' && kind === 'all'} onClick={() => { setDept('all'); setKind('all') }} className={chip(dept === 'all' && kind === 'all')}>All</button>
                {depts.length > 1 && depts.map((d) => <button key={d} type="button" aria-pressed={dept === d} onClick={() => { setDept(dept === d ? 'all' : d) }} className={chip(dept === d)}>{d}</button>)}
                {kinds.length > 1 && kinds.map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(kind === k ? 'all' : k)} className={chip(kind === k)}>{typeLabels[k] || k}</button>)}
              </div>
              {jobs.length >= 6 && (
                <label className="relative block w-full lg:max-w-xs">
                  <span className="sr-only">Search positions</span>
                  <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-soft" />
                  <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roles" className="min-h-12 w-full rounded-full border border-edge-strong bg-glass pl-12 pr-4 text-base text-fg placeholder:text-soft focus:border-lav focus:outline-none" />
                </label>
              )}
            </div>
          )}
          <div className="mt-10" aria-live="polite">
            {jobs.length === 0 && (
              <div className="glass p-8 text-center md:p-10">
                <Briefcase className="mx-auto size-10 text-lav" aria-hidden="true" />
                <p className="mt-4 font-display text-2xl font-semibold">No open positions right now.</p>
                <p className="mx-auto mt-2 max-w-xl text-soft">We are always glad to hear from capable people. Send a general application and tell us which area you would like to work in.</p>
                <div className="mt-6"><Button href="#apply" arrow>Send a general application</Button></div>
              </div>
            )}
            {jobs.length > 0 && shown.length === 0 && <p role="note" className="rounded-2xl border border-dashed border-edge px-5 py-6 text-soft">No openings match your filters.</p>}
            {shown.length > 0 && <ul className="grid gap-5 lg:grid-cols-2">{shown.map((j, i) => <JobCard key={j.id} job={j} i={i} onApply={apply} />)}</ul>}
          </div>
        </div>
      </section>

      {/* How applying works */}
      <section className="wrap section" aria-labelledby="steps-title">
        <SectionHeading id="steps-title" eyebrow="How it works" title="Applying is" gradient="simple." />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {applySteps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 0.08} className="glass-flat relative p-6 md:p-8">
              <span className="flex size-11 items-center justify-center rounded-full border-2 border-accent font-display text-lg font-bold text-lav">{i + 1}</span>
              <h3 className="mt-5 font-display text-2xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-soft">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Areas */}
      <section className="border-y border-edge bg-base2/50" aria-labelledby="areas-title">
        <div className="wrap section">
          <SectionHeading id="areas-title" eyebrow="Where we work" title="Six areas" gradient="to explore." lead="The areas LAX360 Pvt Ltd works in. They describe what we do, not a list of vacancies." />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allDivisions.map((d, i) => {
              const Icon = divisionIcons[d.slug]
              return (
                <Reveal as="li" key={d.slug} delay={(i % 3) * 0.06}>
                  <Link to={d.to} className="glass-flat lift group flex h-full flex-col p-6">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"><Icon className="size-5" aria-hidden="true" /></span>
                    <h3 className="mt-4 font-display text-xl font-semibold transition-colors group-hover:text-lav">{d.name}</h3>
                    <p className="mt-1 text-base text-soft">{d.short}</p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-4 font-semibold text-lav">Learn more <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></span>
                  </Link>
                </Reveal>
              )
            })}
          </ul>
          <p className="mt-8 text-soft">Curious about the people? <Link to="/our-team" className="inline-flex min-h-11 items-center gap-1 font-semibold text-lav hover:underline">Meet our team <ArrowRight className="size-4" aria-hidden="true" /></Link></p>
        </div>
      </section>

      {/* Branches */}
      <section className="wrap section" aria-labelledby="branches-career-title">
        <SectionHeading id="branches-career-title" eyebrow="Our branches" title="Three cities," gradient="one team." />
        <BranchCards className="mt-12" />
      </section>

      {/* Application */}
      <section id="apply" className="relative overflow-hidden border-t border-edge bg-gradient-to-b from-base2 to-deep/50 scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="apply-title">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-0 size-[30rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.22), transparent)' }} />
        <div className="wrap section relative grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <SectionHeading id="apply-title" eyebrow="Apply" title={page.apply_title || careerText.applyTitle} gradient={page.apply_title ? undefined : careerText.applyGradient} lead={page.apply_lead || careerText.applyLead} />
            <p className="mt-8 text-soft">Prefer email? Write to <a className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-fg underline" href={`mailto:${site.email}?subject=Career%20enquiry`}><Mail className="size-4" aria-hidden="true" />{site.email}</a></p>
          </div>
          <div className="lg:col-span-7"><ApplyForm jobs={jobs} position={position} /></div>
        </div>
      </section>
    </PageContainer>
  )
}
