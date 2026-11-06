import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Button from '../components/ui/Button.jsx'
import { Avatar, DemoBadge, EmptyNote, SkillTags, Social } from '../components/team/TeamBits.jsx'
import { useContentReady } from '../hooks/useSite.js'
import { useDepartmentList, useTeam } from '../hooks/useCmsPages.js'
import { toParagraphs } from '../utils/cms.js'

function BackLink() {
  return (
    <Link to="/our-team#departments" className="group inline-flex min-h-11 items-center gap-2 font-semibold text-lav hover:underline">
      <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" /> Back to Our Team
    </Link>
  )
}

/** The department head, shown prominently: a large portrait beside the name, designation, biography and expertise. */
function HeadCard({ p }) {
  return (
    <Reveal>
      <article className="glass lift group grid overflow-hidden md:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="overflow-hidden"><Avatar person={p} className="aspect-[4/5] md:h-full" sizes="(min-width: 768px) 20rem, 100vw" /></div>
        <div className="flex flex-col gap-2 p-6 md:p-10">
          <p className="eyebrow text-lav">Department Head</p>
          {p.demo && <DemoBadge />}
          <h3 className="font-display text-3xl font-semibold leading-tight md:text-4xl">{p.name}</h3>
          <p className="text-lg font-semibold text-soft">{p.designation}</p>
          {p.reportsTo && <p className="text-sm text-soft">Reports to: {p.reportsTo}</p>}
          {p.bio && <p className="mt-3 max-w-2xl text-lg text-soft">{p.bio}</p>}
          <SkillTags items={p.expertise} label={`${p.name}: areas of expertise`} className="mt-4" />
          <div className="mt-auto"><Social person={p} /></div>
        </div>
      </article>
    </Reveal>
  )
}

function MemberCard({ p, i }) {
  return (
    <Reveal as="li" delay={(i % 3) * 0.05}>
      <article className="glass-flat lift group flex h-full flex-col overflow-hidden">
        <div className="overflow-hidden"><Avatar person={p} className="aspect-[4/5]" sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 100vw" /></div>
        <div className="flex flex-1 flex-col gap-1 p-5">
          {p.demo && <DemoBadge />}
          <h3 className="font-display text-xl font-semibold leading-tight">{p.name}</h3>
          <p className="text-sm font-semibold text-lav">{p.designation}</p>
          {p.reportsTo && <p className="text-xs text-soft">Reports to: {p.reportsTo}</p>}
          {p.bio && <p className="mt-2 text-sm text-soft">{p.bio}</p>}
          <SkillTags items={p.expertise} label={`${p.name}: skills`} className="mt-3" />
          <div className="mt-auto"><Social person={p} /></div>
        </div>
      </article>
    </Reveal>
  )
}

/** One department of the Our Team page (/our-team/<department>): overview, the department head at the top, then the people who report into it. */
export default function TeamDepartment() {
  const { dept } = useParams()
  const departments = useDepartmentList()
  const people = useTeam()
  const ready = useContentReady()
  const d = departments.find((x) => x.slug === dept)

  if (!d) {
    return (
      <PageContainer path={`/our-team/${dept}`} title="Department not found" description="This department is not listed on the Our Team page." noindex>
        <section className="wrap section">
          <BackLink />
          <h1 className="h2 mt-8">{ready ? 'We could not find that department.' : 'Loading…'}</h1>
          {ready && <p className="mt-4 max-w-xl text-lg text-soft">It may have been renamed or removed. See all departments on the Our Team page.</p>}
        </section>
      </PageContainer>
    )
  }

  const mine = people.filter((p) => p.department === d.slug)
  const heads = mine.filter((p) => p.leadershipRole === 'department_head')
  const team = mine.filter((p) => p.leadershipRole !== 'department_head').sort((a, b) => Number(b.featured) - Number(a.featured))
  const overview = toParagraphs(d.overview || d.description)

  return (
    <PageContainer path={`/our-team/${d.slug}`} title={`${d.name} | Our Team`} description={d.description}>
      <section className="relative overflow-hidden border-b border-edge">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-[30rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.25), transparent)' }} />
        <div className="wrap relative grid items-center gap-10 pb-12 pt-8 md:pb-16 lg:grid-cols-12">
          <Reveal y={12} className={d.image ? 'lg:col-span-7' : 'lg:col-span-12'}>
            <BackLink />
            <p className="eyebrow mb-4 mt-6 flex items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-10 bg-current" />Department</p>
            <h1 className="h1 !text-[clamp(2.5rem,5.2vw,5rem)]">{d.name}</h1>
            <div className="lead mt-6 max-w-3xl space-y-4 text-soft">{overview.map((t) => <p key={t}>{t}</p>)}</div>
            <p className="mt-6 text-soft"><span className="font-semibold text-fg">{mine.length}</span> {mine.length === 1 ? 'team member' : 'team members'}</p>
          </Reveal>
          {d.image && <Reveal delay={0.1} className="lg:col-span-5"><img src={d.image} alt={d.imageAlt || ''} width="900" height="600" decoding="async" className="aspect-[3/2] w-full rounded-2xl border border-edge object-cover" /></Reveal>}
        </div>
      </section>

      <section className="wrap section" aria-labelledby="head-title">
        <SectionHeading id="head-title" eyebrow="Leadership" title={heads.length > 1 ? 'Department Heads' : 'Department Head'} />
        <div className="mt-10 space-y-6">
          {heads.length ? heads.map((p) => <HeadCard key={p.slug} p={p} />) : <EmptyNote>The head of this department will be introduced here soon.</EmptyNote>}
        </div>
      </section>

      <section className="border-y border-edge bg-base2/60" aria-labelledby="members-title">
        <div className="wrap section">
          <SectionHeading id="members-title" eyebrow="The team" title={`${d.name} Team`} lead={heads.length ? `${team.length} ${team.length === 1 ? 'person reports' : 'people report'} into this department.` : undefined} />
          <div className="mt-10">
            {team.length
              ? <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{team.map((p, i) => <MemberCard key={p.slug} p={p} i={i} />)}</ul>
              : <EmptyNote>No team members have been published for this department yet.</EmptyNote>}
          </div>
        </div>
      </section>

      {(d.roles.length > 0 || d.responsibilities.length > 0 || d.expertise.length > 0) && (
        <section className="wrap section" aria-labelledby="scope-title">
          <SectionHeading id="scope-title" eyebrow="What we do" title="Responsibilities & Expertise" />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {d.roles.length > 0 && (
              <Reveal className="glass-flat p-6">
                <h3 className="font-display text-xl font-semibold">Roles</h3>
                <ul className="mt-4 space-y-2">{d.roles.map((r) => <li key={r} className="flex items-start gap-2 text-soft"><CheckCircle2 className="mt-1 size-4 shrink-0 text-lav" aria-hidden="true" />{r}</li>)}</ul>
              </Reveal>
            )}
            {d.responsibilities.length > 0 && (
              <Reveal delay={0.05} className="glass-flat p-6">
                <h3 className="font-display text-xl font-semibold">Responsibilities</h3>
                <ul className="mt-4 space-y-2">{d.responsibilities.map((r) => <li key={r} className="flex items-start gap-2 text-soft"><CheckCircle2 className="mt-1 size-4 shrink-0 text-lav" aria-hidden="true" />{r}</li>)}</ul>
              </Reveal>
            )}
            {d.expertise.length > 0 && (
              <Reveal delay={0.1} className="glass-flat p-6">
                <h3 className="font-display text-xl font-semibold">Key areas of expertise</h3>
                <SkillTags items={d.expertise} label={`${d.name}: key areas of expertise`} className="mt-4" />
              </Reveal>
            )}
          </div>
        </section>
      )}

      <section className="wrap pb-16 md:pb-24">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-edge bg-glass p-6 sm:flex-row sm:items-center">
          <BackLink />
          <Button to="/career" variant="secondary">Careers at LAX360 <ArrowRight className="size-4" aria-hidden="true" /></Button>
        </div>
      </section>
    </PageContainer>
  )
}
