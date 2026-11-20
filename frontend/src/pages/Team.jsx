import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { m, useReducedMotion } from 'framer-motion'
import { ArrowRight, Plus, Briefcase, Bot, Brain, Cloud, Code2, GraduationCap, Layers, Megaphone, Search, Server, Sparkles, Workflow } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Button from '../components/ui/Button.jsx'
import { Avatar, EmptyNote, SkillTags, Social } from '../components/team/TeamBits.jsx'
import MemberProfile from '../components/team/MemberProfile.jsx'
import LifeCarousel from '../components/team/LifeCarousel.jsx'
import { useJobs } from '../components/cms/CmsJobs.jsx'
import { defaultExpertise, leaderRank, roleLabels, roleRank, teamText } from '../data/team.js'
import { useTeam, useDepartmentList, useTeamExpertise, useTeamGallery, useTeamPageText, useTeamSections } from '../hooks/useCmsPages.js'

const ICONS = { code: Code2, server: Server, sparkles: Sparkles, brain: Brain, layers: Layers, cloud: Cloud, workflow: Workflow, megaphone: Megaphone, bot: Bot, briefcase: Briefcase }

const SampleTag = ({ className = '' }) => <span className={`inline-flex w-fit items-center rounded-full border border-dashed border-edge-strong bg-glass px-2.5 py-0.5 text-[0.66rem] font-bold uppercase tracking-wider text-soft ${className}`}>Sample profile</span>

/**
 * The founder (Founder, CEO and Managing Director are one person: shown once). A centred, compact portrait inside a single slowly turning ring of light, then the name, designation and introduction.
 * Everything animates with transform / opacity only (cheap on the GPU) and the motion is off for reduced motion.
 */
function FounderSpotlight({ p, onOpen }) {
  const reduce = useReducedMotion()
  const rise = (delay = 0) => (reduce ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-50px' }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] } })
  return (
    <section id="leadership" aria-labelledby="founder-name" className="relative scroll-mt-24 overflow-hidden border-b border-edge">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="fd-glow absolute left-1/2 top-[8%] size-[34rem] max-w-[130vw] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.22), transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'radial-gradient(55% 70% at 50% 30%, #000, transparent)', WebkitMaskImage: 'radial-gradient(55% 70% at 50% 30%, #000, transparent)' }} />
      </div>
      <div className="wrap relative flex flex-col items-center px-4 pb-12 pt-10 text-center md:pb-16 md:pt-14">
        <m.p {...rise()} className="eyebrow flex items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-transparent to-current" />Founder<span aria-hidden="true" className="h-px w-8 bg-gradient-to-l from-transparent to-current" /></m.p>

        <m.div {...(reduce ? {} : { initial: { opacity: 0, scale: 0.92, y: 24 }, whileInView: { opacity: 1, scale: 1, y: 0 }, viewport: { once: true, margin: '-40px' }, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } })} className="relative mt-7">
          <div className="relative grid size-[12.5rem] place-items-center sm:size-[14.5rem] md:size-[16rem]">
            <span aria-hidden="true" className="fd-ring absolute -inset-3 rounded-full opacity-90" style={{ background: 'conic-gradient(from 0deg, rgb(var(--glow)), transparent 30%, rgb(var(--glow2)) 55%, transparent 80%, rgb(var(--glow)))', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))', mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))' }} />
            <figure className="relative m-0 size-full overflow-hidden rounded-full border-[3px] border-white/30 shadow-[0_24px_60px_-22px_rgb(var(--glow)/0.65)]">
              <Avatar person={p} className="size-full !aspect-auto" sizes="(min-width: 768px) 16rem, 14.5rem" />
              <span aria-hidden="true" className="fd-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </figure>
          </div>
        </m.div>

        <m.h2 {...rise(0.12)} id="founder-name" className="mt-8 font-display text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl">{p.name}</m.h2>
        <m.p {...rise(0.2)} className="mt-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-base font-semibold text-transparent md:text-xl">{p.designation}</m.p>
        {p.sample && <m.div {...rise(0.25)} className="mt-3"><SampleTag /></m.div>}
        {p.bio && (
          <m.blockquote {...rise(0.3)} className="relative mt-6 max-w-2xl rounded-2xl border border-edge bg-glass px-5 py-5 text-left text-[0.95rem] leading-relaxed text-soft shadow-[0_18px_40px_-28px_rgb(var(--glow)/0.5)] backdrop-blur sm:text-center md:px-8 md:py-6 md:text-base">
            <span aria-hidden="true" className="absolute -top-3 left-6 grid size-7 place-items-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-lg leading-none text-white">“</span>
            {p.bio}
          </m.blockquote>
        )}
        <m.div {...rise(0.38)} className="mt-5 flex flex-col items-center"><SkillTags items={p.expertise} label={`${p.name}: skills`} className="justify-center" /><Social person={p} />
          <button type="button" onClick={() => onOpen(p)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-edge-strong bg-glass px-5 text-sm font-semibold transition-colors hover:border-lav hover:bg-glass-strong">View full profile <ArrowRight className="size-4" aria-hidden="true" /></button></m.div>
      </div>
    </section>
  )
}

/**
 * A team member in the gallery: the photograph only. The name is read by screen readers and the whole tile is a button that opens the full profile. On hover the photograph zooms gently,
 * a ring of light draws round it and a small "open" mark appears. Every tile is the same size whatever the photograph.
 */
function PhotoTile({ p, i, onOpen }) {
  return (
    <Reveal as="li" delay={(i % 4) * 0.05}>
      <button type="button" onClick={() => onOpen(p)} aria-haspopup="dialog" aria-label={`${p.name}, ${p.designation}`} className="group relative block w-full overflow-hidden rounded-3xl border border-edge bg-glass text-left outline-none transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-1.5 hover:border-lav hover:shadow-[0_26px_50px_-26px_rgb(var(--glow)/0.7)] focus-visible:ring-2 focus-visible:ring-lav">
        <Avatar person={p} className="aspect-[4/5]" sizes="(min-width: 1024px) 19rem, (min-width: 640px) 45vw, 90vw" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 ring-1 ring-inset ring-white/40 transition-opacity duration-500 group-hover:opacity-100" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span aria-hidden="true" className="absolute bottom-3 right-3 grid size-10 translate-y-2 place-items-center rounded-full bg-white/90 text-night opacity-0 shadow-lg transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 max-sm:translate-y-0 max-sm:opacity-100"><Plus className="size-5" /></span>
        {(p.isHead || p.role === 'team_lead') && <span aria-hidden="true" className="absolute left-3 top-3 rounded-full bg-night/80 px-3 py-1 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">{roleLabels[p.role]}</span>}
        {p.sample && <span aria-hidden="true" className="absolute right-3 top-3 rounded-full border border-dashed border-white/50 bg-night/70 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white backdrop-blur">Sample</span>}
      </button>
    </Reveal>
  )
}

/** Cards in rows of a steady width: a team of three looks as balanced as a team of thirty. */
const Gallery = ({ people, label, onOpen }) => (
  <ul aria-label={label} className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
    {people.map((p, i) => <PhotoTile key={p.slug} p={p} i={i} onOpen={onOpen} />)}
  </ul>
)

/**
 * Our Team. The sections come from the admin panel (Team > Page sections), the people and departments from Team > Employees / Departments; nothing is built in.
 *   Departments off:  Leadership (Founder / CEO / Managing Director), then every other employee in one gallery.
 *   Departments on:   Leadership, then the departments, each with its Department Head first and its employees below, grouped automatically from each profile's department.
 * Moving a person to another department (or changing their position) in their profile moves them here too: nobody is entered twice.
 */
export default function Team() {
  const people = useTeam()
  const departments = useDepartmentList()
  const gallery = useTeamGallery()
  const cmsExpertise = useTeamExpertise()
  const page = useTeamPageText()
  const show = useTeamSections()
  const jobs = useJobs()
  const [query, setQuery] = useState('')
  const [openPerson, setOpenPerson] = useState(null) // the team member whose profile is open

  const deptByslug = useMemo(() => Object.fromEntries(departments.map((d) => [d.slug, d])), [departments])
  // Founder, CEO and Managing Director are one person: only the first one marked is shown as the founder (any other is listed with the team, never twice)
  const leaders = useMemo(() => (show.leadership ? people.filter((p) => p.isLeader).sort((a, b) => leaderRank[a.role] - leaderRank[b.role] || a.order - b.order).slice(0, 1) : []), [people, show.leadership])
  const staff = useMemo(() => people.filter((p) => !leaders.includes(p)), [people, leaders]) // with Leadership switched off the leaders join the gallery, so nobody disappears
  const byRole = (a, b) => (roleRank[a.role] ?? -1) - (roleRank[b.role] ?? -1) || a.order - b.order
  const grouped = show.departments && departments.length > 0
  const blocks = useMemo(() => {
    if (!grouped) return []
    const out = departments.map((d) => ({ d, list: staff.filter((p) => p.department === d.slug).sort(byRole) })).filter((b) => b.list.length)
    const rest = staff.filter((p) => !deptByslug[p.department])
    if (rest.length) out.push({ d: null, list: rest.sort(byRole) })
    return out
  }, [grouped, departments, staff, deptByslug]) // eslint-disable-line react-hooks/exhaustive-deps
  const q = query.trim().toLowerCase()
  const flat = useMemo(() => [...staff].sort((a, b) => (a.isLeader ? -1 : 0) - (b.isLeader ? -1 : 0) || a.order - b.order), [staff])
  const searchable = flat.length >= 12
  const shown = flat.filter((p) => !q || [p.name, p.designation, p.bio, deptByslug[p.department]?.name, p.expertise.join(' ')].join(' ').toLowerCase().includes(q))

  const expertise = cmsExpertise || defaultExpertise
  const openings = jobs.length
  const hasPeople = leaders.length + staff.length > 0
  const chip = (on) => `inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${on ? 'border-primary bg-primary text-white' : 'border-edge-strong bg-glass hover:border-lav hover:bg-glass-strong'}`

  return (
    <PageContainer
      path="/our-team"
      title="Our Team"
      description="Meet the people behind LAX360 Pvt Ltd: our leadership and the specialists who build and grow our clients' businesses."
    >
      {/* Hero */}
      <section className={`relative overflow-hidden border-b border-edge ${page.hero_image ? 'media-dark' : ''}`}>
        {page.hero_image && (
          <>
            <img src={page.hero_image} alt={page.hero_image_alt || ''} width="1600" height="900" decoding="async" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-night/80 via-night/60 to-night" />
          </>
        )}
        {!page.hero_image && <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-[32rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.28), transparent)' }} />}
        <div className="wrap relative grid gap-8 pb-10 pt-10 md:pb-12 md:pt-16">
          <Reveal y={12} className="max-w-4xl">
            <p className="eyebrow mb-6 flex items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-10 bg-current" />{page.hero_eyebrow || teamText.heroEyebrow}</p>
            <h1 className="h1 !text-[clamp(2.5rem,5.6vw,5.5rem)]">{page.hero_title || teamText.heroTitle}</h1>
            <p className="lead mt-7 max-w-3xl text-soft">{page.hero_lead || teamText.heroLead}</p>
            {hasPeople && (
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button href={leaders.length ? '#leadership' : grouped ? '#departments' : '#team'} arrow>{leaders.length ? 'Meet our founder' : 'Meet the team'}</Button>
                {show.careers && <Button href="#careers" variant="secondary">Join our team</Button>}
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* The founder */}
      {leaders.length > 0 && <FounderSpotlight p={leaders[0]} onOpen={setOpenPerson} />}

      {!hasPeople && (
        <section className="wrap section"><EmptyNote>Our team profiles are being added. Check back soon to meet the people behind LAX360 Pvt Ltd.</EmptyNote></section>
      )}

      {/* Departments on: employees grouped automatically under their departments */}
      {grouped && blocks.length > 0 && (
        <section id="departments" className="border-y border-edge bg-base2/60 scroll-mt-24" aria-labelledby="departments-title">
          <div className="wrap section">
            <SectionHeading id="departments-title" eyebrow="Departments" title={page.departments_title || teamText.departmentsTitle} lead={page.departments_lead || teamText.departmentsLead} />
            {blocks.length > 1 && (
              <nav aria-label="Jump to a department" className="mt-8 flex flex-wrap gap-2">
                {blocks.map((b) => <a key={b.d?.slug || 'other'} href={`#dept-${b.d?.slug || 'other'}`} className={chip(false)}>{b.d?.name || 'Other team members'}</a>)}
              </nav>
            )}
            <div className="mt-12 space-y-16">
              {blocks.map(({ d, list }) => {
                const Icon = ICONS[d?.icon] || Briefcase
                return (
                  <div key={d?.slug || 'other'} id={`dept-${d?.slug || 'other'}`} className="scroll-mt-28">
                    <Reveal className="mb-8 flex flex-col gap-5 md:flex-row md:items-center">
                      {d?.image
                        ? <img src={d.image} alt={d.imageAlt || ''} width="480" height="270" loading="lazy" decoding="async" className="aspect-[16/9] w-full max-w-[17rem] rounded-2xl border border-edge object-cover" />
                        : d && <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white"><Icon className="size-8" strokeWidth={1.5} /></span>}
                      <div className="min-w-0">
                        <h3 className="font-display text-3xl font-semibold leading-tight">{d?.name || 'Other team members'}</h3>
                        {d?.description && <p className="mt-2 max-w-2xl text-soft">{d.description}</p>}
                        {d && (d.overview || d.roles.length > 0) && <Link to={`/our-team/${d.slug}`} className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-lav hover:underline">About this department <ArrowRight className="size-4" aria-hidden="true" /></Link>}
                      </div>
                    </Reveal>
                    <Gallery people={list} label={`${d?.name || 'Other team members'}: people`} onOpen={setOpenPerson} />
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Departments off (or none created yet): every other employee in one gallery */}
      {!grouped && show.directory && flat.length > 0 && (
        <section id="team" className="relative scroll-mt-24 overflow-hidden" aria-labelledby="directory-title">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '24px 24px', maskImage: 'linear-gradient(to bottom, #000, transparent 70%)', WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent 70%)' }} />
          <div className="wrap section relative">
          <SectionHeading id="directory-title" eyebrow="The team" title={page.directory_title || teamText.directoryTitle} lead={page.directory_lead || teamText.directoryLead} />
          {searchable && (
            <label className="relative mt-8 block w-full sm:max-w-xs">
              <span className="sr-only">Search the team</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-soft" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or role" className="min-h-12 w-full rounded-full border border-edge-strong bg-glass pl-12 pr-4 text-base text-fg placeholder:text-soft focus:border-lav focus:outline-none" />
            </label>
          )}
          <div className="mt-10" aria-live="polite">
            {shown.length > 0 ? <Gallery people={shown} label="Team members" onOpen={setOpenPerson} /> : <EmptyNote>No team members match your search.</EmptyNote>}
          </div>
          </div>
        </section>
      )}

      {/* Life at LAX360: one common carousel of games, functions, celebrations and other events (not part of any profile) */}
      {show.culture && gallery.length > 0 && (
        <section id="culture" className="relative overflow-hidden border-y border-edge bg-base2/60" aria-labelledby="culture-title">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-10 size-[26rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow2)/0.14), transparent 70%)' }} />
          <div className="wrap section relative">
            <SectionHeading id="culture-title" eyebrow={teamText.cultureEyebrow} title={page.culture_title || teamText.cultureTitle} lead={page.culture_lead || teamText.cultureLead} />
          </div>
          <LifeCarousel items={gallery} chip={chip} />
        </section>
      )}

      {/* Expertise (off by default) */}
      {show.expertise && (
        <section id="expertise" className="wrap section" aria-labelledby="expertise-title">
          <SectionHeading id="expertise-title" eyebrow="Expertise" title={page.expertise_title || teamText.expertiseTitle} lead={page.expertise_lead || teamText.expertiseLead} />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {expertise.map((e, i) => {
              const Icon = ICONS[e.icon] || GraduationCap
              return (
                <Reveal as="li" key={e.title} delay={(i % 4) * 0.05}>
                  <div className="glass-flat lift flex h-full flex-col gap-3 p-5">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Icon className="size-5" aria-hidden="true" /></span>
                    <h3 className="font-display text-lg font-semibold leading-tight">{e.title}</h3>
                    {e.text && <p className="text-sm text-soft">{e.text}</p>}
                    {e.tags?.length > 0 && <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">{e.tags.map((g) => <li key={g} className="rounded-full border border-edge bg-glass px-2.5 py-1 text-xs font-semibold">{g}</li>)}</ul>}
                  </div>
                </Reveal>
              )
            })}
          </ul>
        </section>
      )}

      {/* Careers (links into the existing Career page and contact form; nothing is duplicated here) */}
      {show.careers && (
        <section id="careers" className="relative overflow-hidden border-t border-edge bg-gradient-to-b from-base2 to-deep/50" aria-labelledby="careers-title">
          <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-0 size-[30rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.25), transparent)' }} />
          <div className="wrap section relative">
            <Reveal className="max-w-3xl">
              <p className="eyebrow mb-5 flex items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-10 bg-lav" />Careers</p>
              <h2 id="careers-title" className="h1 !text-[clamp(2.5rem,5vw,4.5rem)]"><span className="text-gradient">{page.careers_title || teamText.careersTitle}</span></h2>
              <p className="lead mt-6 text-soft">{page.careers_lead || teamText.careersLead}</p>
            </Reveal>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: 'Explore Career Opportunities', text: 'See the areas we work in and how to get started.', to: '/career', cta: 'Explore careers' },
                { title: 'Current Job Openings', text: openings ? `${openings} open ${openings === 1 ? 'position' : 'positions'} right now.` : 'No openings are listed at the moment. Tell us about yourself.', to: openings ? '/career#openings' : '/career', cta: openings ? 'View openings' : 'Visit careers' },
                { title: 'Internship Opportunities', text: 'Starting out? Tell us what you want to learn.', to: '/contact?type=career', cta: 'Ask about internships' },
                { title: 'Submit Your Resume', text: 'Send your details and the area you are interested in.', to: '/contact?type=career', cta: 'Submit your details' },
              ].map((c, i) => (
                <Reveal as="li" key={c.title} delay={i * 0.05}>
                  <Link to={c.to} className="glass-flat lift group flex h-full flex-col gap-2 p-5">
                    <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                    <p className="text-sm text-soft">{c.text}</p>
                    <span className="mt-auto inline-flex min-h-11 items-center gap-1 pt-2 font-semibold text-lav">{c.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}
      <MemberProfile person={openPerson} department={openPerson ? deptByslug[openPerson.department]?.name : ''} onClose={() => setOpenPerson(null)} />
    </PageContainer>
  )
}
