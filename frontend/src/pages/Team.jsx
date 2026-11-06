import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Briefcase, Bot, Brain, Cloud, Code2, GraduationCap, Layers, Megaphone, Search, Server, Sparkles, Users, Workflow } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Button from '../components/ui/Button.jsx'
import SocialIcon from '../components/layout/SocialIcon.jsx'
import { useJobs } from '../components/cms/CmsJobs.jsx'
import { cultureCategories, defaultDepartments, defaultExpertise, leadershipRoles, teamText } from '../data/team.js'
import { useTeam, useTeamDepartments, useTeamExpertise, useTeamGallery, useTeamPageText } from '../hooks/useCmsPages.js'

const ICONS = { code: Code2, server: Server, sparkles: Sparkles, brain: Brain, layers: Layers, cloud: Cloud, workflow: Workflow, megaphone: Megaphone, bot: Bot, briefcase: Briefcase }
const SOCIAL_LABEL = { linkedin: 'LinkedIn', x: 'X', github: 'GitHub', instagram: 'Instagram' }
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const slugOf = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function Avatar({ person, className = 'aspect-[4/5]' }) {
  return person.photo
    ? <img src={person.photo} alt={person.photoAlt || person.name} width="600" height="750" loading="lazy" decoding="async" className={`${className} w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]`} />
    : <div aria-hidden="true" className={`${className} flex w-full items-center justify-center bg-gradient-to-br from-primary/30 to-accent/20 font-display text-5xl font-bold text-fg`}>{initials(person.name)}</div>
}

function Social({ person }) {
  if (!person.links.length) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {person.links.map((l) => (
        <li key={l.platform}>
          <a href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`${person.name} on ${SOCIAL_LABEL[l.platform]} (opens in a new tab)`} className="inline-flex size-11 items-center justify-center rounded-full border border-edge-strong bg-glass text-fg transition-colors hover:border-lav hover:bg-glass-strong hover:text-lav">
            <SocialIcon platform={l.platform} className="size-4" />
          </a>
        </li>
      ))}
    </ul>
  )
}

function LeaderCard({ p, i, deptName }) {
  const role = leadershipRoles[p.leadershipRole]?.label
  return (
    <Reveal as="li" delay={(i % 3) * 0.06}>
      <article className="glass-flat lift group flex h-full flex-col overflow-hidden">
        <div className="overflow-hidden"><Avatar person={p} /></div>
        <div className="flex flex-1 flex-col gap-1 p-6">
          {role && <p className="eyebrow text-lav">{role}</p>}
          <h3 className="font-display text-2xl font-semibold leading-tight">{p.name}</h3>
          <p className="text-sm font-semibold text-soft">{p.designation}{deptName ? ` · ${deptName}` : ''}</p>
          {p.bio && <p className="mt-3 text-soft">{p.bio}</p>}
          {p.expertise.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${p.name}: areas of expertise`}>
              {p.expertise.map((t) => <li key={t} className="rounded-full border border-edge bg-glass px-3 py-1 text-xs font-semibold">{t}</li>)}
            </ul>
          )}
          <div className="mt-auto"><Social person={p} /></div>
        </div>
      </article>
    </Reveal>
  )
}

function MemberCard({ p, i, deptName }) {
  return (
    <Reveal as="li" delay={(i % 4) * 0.05}>
      <article className="glass-flat lift group flex h-full flex-col overflow-hidden">
        <div className="overflow-hidden"><Avatar person={p} className="aspect-square" /></div>
        <div className="flex flex-1 flex-col gap-1 p-5">
          <h3 className="font-display text-xl font-semibold leading-tight">{p.name}</h3>
          <p className="text-sm font-semibold text-lav">{p.designation}</p>
          {deptName && <p className="text-xs font-semibold uppercase tracking-wider text-soft">{deptName}</p>}
          {p.bio && <p className="mt-2 line-clamp-4 text-sm text-soft">{p.bio}</p>}
          <div className="mt-auto"><Social person={p} /></div>
        </div>
      </article>
    </Reveal>
  )
}

function EmptyNote({ children }) {
  return <p role="note" className="rounded-2xl border border-dashed border-edge px-5 py-6 text-soft">{children}</p>
}

/** Our Team: hero, leadership, departments, directory, culture, expertise and careers. Everything is managed in the admin panel (Website content > Team). */
export default function Team() {
  const people = useTeam()
  const cmsDepartments = useTeamDepartments()
  const gallery = useTeamGallery()
  const cmsExpertise = useTeamExpertise()
  const page = useTeamPageText()
  const jobs = useJobs()

  const [dept, setDept] = useState('all')
  const [query, setQuery] = useState('')
  const [shot, setShot] = useState('all')

  // The departments: those created in the admin panel, otherwise the four built-in ones. Members link to a department by its slug.
  const departments = useMemo(() => (cmsDepartments.length ? cmsDepartments : defaultDepartments.map((d) => ({ ...d, image: '', imageAlt: '' }))), [cmsDepartments])
  const deptName = (slug) => departments.find((d) => d.slug === slug)?.name || ''
  const members = (slug) => people.filter((p) => p.department === slug)

  const order = (p) => leadershipRoles[p.leadershipRole]?.rank ?? 5
  const leaders = useMemo(() => people.filter((p) => p.isLeader).sort((a, b) => order(a) - order(b)), [people])
  const staff = useMemo(() => people.filter((p) => !p.isLeader).sort((a, b) => Number(b.featured) - Number(a.featured)), [people])

  const usedDepts = departments.filter((d) => staff.some((p) => p.department === d.slug))
  const showFilters = staff.length >= 4 && usedDepts.length > 1
  const showSearch = staff.length >= 6
  const q = query.trim().toLowerCase()
  const shown = staff.filter((p) => (dept === 'all' || p.department === dept) && (!q || [p.name, p.designation, p.bio, deptName(p.department), p.expertise.join(' ')].join(' ').toLowerCase().includes(q)))

  const expertise = cmsExpertise || defaultExpertise
  const shotCats = cultureCategories.filter((c) => gallery.some((g) => g.category === c.value))
  const shots = gallery.filter((g) => shot === 'all' || g.category === shot)
  const openings = jobs.length

  const filterTo = (slug) => { setDept(slug); setQuery(''); document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' }) }
  const chip = (on) => `inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${on ? 'border-primary bg-primary text-white' : 'border-edge-strong bg-glass hover:border-lav hover:bg-glass-strong'}`

  return (
    <PageContainer
      path="/our-team"
      title="Our Team"
      description="Meet the people behind LAX360 Ventures: leadership, departments and the software, AI and digital marketing specialists who build and grow our clients' businesses."
    >
      {/* 1. Hero */}
      <section className={`relative overflow-hidden border-b border-edge ${page.hero_image ? 'media-dark' : ''}`}>
        {page.hero_image && (
          <>
            <img src={page.hero_image} alt={page.hero_image_alt || ''} width="1600" height="900" decoding="async" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-night/80 via-night/60 to-night" />
          </>
        )}
        {!page.hero_image && <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-[32rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.28), transparent)' }} />}
        <div className="wrap relative grid gap-10 pb-14 pt-12 md:pb-20 md:pt-20">
          <Reveal y={12} className="max-w-4xl">
            <p className="eyebrow mb-6 flex items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-10 bg-current" />{page.hero_eyebrow || teamText.heroEyebrow}</p>
            <h1 className="h1 !text-[clamp(2.5rem,5.6vw,5.5rem)]">{page.hero_title || teamText.heroTitle}</h1>
            <p className="lead mt-7 max-w-3xl text-soft">{page.hero_lead || teamText.heroLead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href="#leadership" arrow>Meet the leadership</Button>
              <Button href="#careers" variant="secondary">Join our team</Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. Leadership */}
      <section id="leadership" className="wrap section" aria-labelledby="leadership-title">
        <SectionHeading id="leadership-title" eyebrow="Leadership" title={page.leadership_title || teamText.leadershipTitle} lead={page.leadership_lead || teamText.leadershipLead} />
        <div className="mt-10">
          {leaders.length
            ? <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{leaders.map((p, i) => <LeaderCard key={p.slug} p={p} i={i} deptName={deptName(p.department)} />)}</ul>
            : <EmptyNote>Leadership profiles are being added. Check back soon to meet the people who lead LAX360 Ventures.</EmptyNote>}
        </div>
      </section>

      {/* 3. Departments */}
      <section id="departments" className="border-y border-edge bg-base2/60" aria-labelledby="departments-title">
        <div className="wrap section">
          <SectionHeading id="departments-title" eyebrow="Departments" title={page.departments_title || teamText.departmentsTitle} lead={page.departments_lead || teamText.departmentsLead} />
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {departments.map((d, i) => {
              const Icon = ICONS[d.icon] || Users
              const list = members(d.slug)
              return (
                <Reveal as="li" key={d.slug} delay={(i % 2) * 0.06}>
                  <article id={`dept-${d.slug}`} className="glass-flat lift group flex h-full flex-col overflow-hidden">
                    {d.image
                      ? <div className="overflow-hidden"><img src={d.image} alt={d.imageAlt || d.name} width="900" height="400" loading="lazy" decoding="async" className="aspect-[16/7] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /></div>
                      : <div aria-hidden="true" className="flex aspect-[16/6] items-center justify-center bg-gradient-to-br from-primary/25 via-accent/15 to-transparent"><Icon className="size-14 text-lav transition-transform duration-300 group-hover:scale-110" strokeWidth={1.4} /></div>}
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="font-display text-2xl font-semibold">{d.name}</h3>
                      <p className="mt-2 text-soft">{d.description}</p>
                      {d.roles.length > 0 && (
                        <ul className="mt-4 flex flex-wrap gap-2" aria-label={`Roles in ${d.name}`}>
                          {d.roles.map((r) => <li key={r} className="rounded-full border border-edge bg-glass px-3 py-1 text-sm font-semibold">{r}</li>)}
                        </ul>
                      )}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-4">
                        {list.length > 0
                          ? <p className="text-sm text-soft"><span className="font-semibold text-fg">{list.length}</span> {list.length === 1 ? 'team member' : 'team members'}: {list.slice(0, 3).map((p) => p.name).join(', ')}{list.length > 3 ? ` +${list.length - 3} more` : ''}</p>
                          : <p className="text-sm text-soft">Team members are being added.</p>}
                        {list.some((p) => !p.isLeader) && <button type="button" onClick={() => filterTo(d.slug)} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-lav hover:underline">View team <ArrowRight className="size-4" aria-hidden="true" /></button>}
                      </div>
                    </div>
                  </article>
                </Reveal>
              )
            })}
          </ul>
        </div>
      </section>

      {/* 4. Directory */}
      <section id="directory" className="wrap section" aria-labelledby="directory-title">
        <SectionHeading id="directory-title" eyebrow="The team" title={page.directory_title || teamText.directoryTitle} lead={page.directory_lead || teamText.directoryLead} />
        {(showFilters || showSearch) && (
          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {showFilters && (
              <div role="group" aria-label="Filter by department" className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={dept === 'all'} onClick={() => setDept('all')} className={chip(dept === 'all')}>All</button>
                {usedDepts.map((d) => <button key={d.slug} type="button" aria-pressed={dept === d.slug} onClick={() => setDept(d.slug)} className={chip(dept === d.slug)}>{d.name}</button>)}
              </div>
            )}
            {showSearch && (
              <label className="relative block w-full lg:max-w-xs">
                <span className="sr-only">Search the team</span>
                <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-soft" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or role" className="min-h-12 w-full rounded-full border border-edge-strong bg-glass pl-12 pr-4 text-base text-fg placeholder:text-soft focus:border-lav focus:outline-none" />
              </label>
            )}
          </div>
        )}
        <div className="mt-10" aria-live="polite">
          {staff.length === 0 && <EmptyNote>Team profiles are being added. Verified profiles will appear here as soon as they are published.</EmptyNote>}
          {staff.length > 0 && shown.length === 0 && <EmptyNote>No team members match your search.</EmptyNote>}
          {shown.length > 0 && <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{shown.map((p, i) => <MemberCard key={p.slug} p={p} i={i} deptName={deptName(p.department)} />)}</ul>}
        </div>
      </section>

      {/* 5. People & culture */}
      <section id="culture" className="border-y border-edge bg-base2/60" aria-labelledby="culture-title">
        <div className="wrap section">
          <SectionHeading id="culture-title" eyebrow="Culture" title={page.culture_title || teamText.cultureTitle} lead={page.culture_lead || teamText.cultureLead} />
          {gallery.length === 0 ? (
            <div className="mt-10">
              <EmptyNote>Photographs of our team, office, workshops and celebrations will appear here. We only show genuine LAX360 photos.</EmptyNote>
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="What we share here">{cultureCategories.map((c) => <li key={c.value} className="rounded-full border border-edge bg-glass px-3 py-1 text-sm font-semibold">{c.label}</li>)}</ul>
            </div>
          ) : (
            <>
              {shotCats.length > 1 && (
                <div role="group" aria-label="Filter photographs" className="mt-8 flex flex-wrap gap-2">
                  <button type="button" aria-pressed={shot === 'all'} onClick={() => setShot('all')} className={chip(shot === 'all')}>All</button>
                  {shotCats.map((c) => <button key={c.value} type="button" aria-pressed={shot === c.value} onClick={() => setShot(c.value)} className={chip(shot === c.value)}>{c.label}</button>)}
                </div>
              )}
              <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shots.map((g, i) => (
                  <Reveal as="li" key={g.slug} delay={(i % 3) * 0.05}>
                    <figure className="group relative overflow-hidden rounded-2xl border border-edge">
                      <img src={g.image} alt={g.alt} width="800" height="600" loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                      <figcaption className="media-dark absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/90 to-transparent p-4 pt-10">
                        <p className="text-xs font-bold uppercase tracking-wider text-lav">{cultureCategories.find((c) => c.value === g.category)?.label}</p>
                        <p className="font-display text-lg font-semibold text-fg">{g.caption}</p>
                        {g.text && <p className="mt-1 text-sm text-soft">{g.text}</p>}
                      </figcaption>
                    </figure>
                  </Reveal>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* 6. Expertise */}
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

      {/* 7. Careers (links into the existing Career page and contact form; nothing is duplicated here) */}
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
    </PageContainer>
  )
}
