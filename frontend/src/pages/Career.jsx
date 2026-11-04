import { Link } from 'react-router-dom'
import { ArrowUpRight, Mail } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import BranchCards from '../components/sections/BranchCards.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import BotHighlight from '../components/ui/BotHighlight.jsx'
import { allDivisions } from '../data/services.js'
import { branchSentence } from '../data/branches.js'
import CmsJobs, { useJobs } from '../components/cms/CmsJobs.jsx'
import { useSite } from '../hooks/useSite.js'
import { divisionIcons } from '../utils/divisionIcons.js'

// Honest content: there are no verified open roles, salaries or perks to publish, so this page invites
// people to get in touch and shows the areas LAX360 works in. Nothing below describes a vacancy.
const principles = [
  { title: 'Clear', text: 'Plain English, short sentences, outcomes before technology names.' },
  { title: 'Practical', text: 'We recommend what fits the problem, including when the answer is simpler than expected.' },
  { title: 'Accountable', text: 'One team owns the work from discovery to support.' },
]

export default function Career() {
  const site = useSite()
  const jobs = useJobs()
  return (
    <PageContainer
      path="/career"
      title="Career"
      description={`Interested in working with LAX360 Ventures? We have branches in ${branchSentence}. Tell us about yourself.`}
    >
      <section className="relative overflow-hidden border-b border-edge">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-24 size-[32rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.28), transparent)' }} />
        <div className="wrap relative pb-10 pt-6 md:pb-16 md:pt-10">
          <Reveal y={12} className="max-w-4xl">
            <p className="eyebrow mb-6 flex items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-10 bg-current" />Career</p>
            <h1 className="h1 !text-[clamp(2.5rem,5.6vw,5.5rem)]">
              Build your career with <BotHighlight delay={0.4}><span className="text-gradient">LAX360.</span></BotHighlight>
            </h1>
            <p className="lead mt-7 text-soft">
              LAX360 Ventures brings software, AI, digital growth, CAD engineering and training under one roof, with branches in {branchSentence}. If that sounds like a place you&apos;d like to work, we&apos;d like to hear from you.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button to="/contact?type=career" arrow>Tell us about yourself</Button>
              <Button href={`mailto:${site.email}?subject=Career%20enquiry`} variant="secondary"><Mail className="size-5" aria-hidden="true" /> Email us</Button>
            </div>
            <p className="mt-6 max-w-xl text-sm text-soft">{jobs.length ? <>We are hiring: see the <a href="#openings" className="font-semibold text-fg underline">open positions</a> below, or tell us about yourself.</> : 'We don&apos;t list open roles on this site yet. Send an enquiry and the team will get back to you.'}</p>
          </Reveal>
        </div>
      </section>

      <CmsJobs />

      <section className="wrap section" aria-labelledby="areas-title">
        <SectionHeading id="areas-title" eyebrow="Where we work" title="Four areas" gradient="to explore." lead="These are the areas LAX360 Ventures works in — not a list of vacancies." />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {allDivisions.map((d, i) => {
            const Icon = divisionIcons[d.slug]
            return (
              <Reveal as="li" key={d.slug} delay={i * 0.08}>
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
      </section>

      <section className="border-y border-edge bg-base2/50" aria-labelledby="how-title">
        <div className="wrap section">
          <SectionHeading id="how-title" eyebrow="How we work" title="Working principles." />
          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            {principles.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 0.1} className="glass-flat p-6 md:p-8">
                <p className="font-display text-sm font-semibold text-lav">0{i + 1}</p>
                <h3 className="mt-5 font-display text-2xl font-semibold">{p.title}</h3>
                <p className="mt-2 text-base text-soft">{p.text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="branches-career-title">
        <SectionHeading id="branches-career-title" eyebrow="Our branches" title="Three cities," gradient="one team." />
        <BranchCards className="mt-12" />
      </section>

      <ContactCta defaultType="career" title="Interested in joining us?" />
    </PageContainer>
  )
}
