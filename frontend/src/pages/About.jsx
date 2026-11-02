import PageContainer from '../components/layout/PageContainer.jsx'
import PageHero from '../components/sections/PageHero.jsx'
import Ring360 from '../components/art/Ring360.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Button from '../components/ui/Button.jsx'
import { allDivisions } from '../data/services.js'
import { useSite } from '../hooks/useSite.js'
import { branchSentence } from '../data/branches.js'
import BranchCards from '../components/sections/BranchCards.jsx'
import { Link } from 'react-router-dom'

// Working principles are drawn from the planning document's brand attributes.
// No team members, history, awards or mission statements are shown until they are approved.
const principles = [
  { title: 'Clear', text: 'Plain English, short sentences, outcomes before technology names.' },
  { title: 'Dependable', text: 'We write down scope and expectations so you can plan around us.' },
  { title: 'Practical', text: 'We recommend what fits the problem — including when the answer is simpler than you expected.' },
  { title: 'Accountable', text: 'One team owns the work from discovery to support.' },
]

export default function About() {
  const site = useSite()
  return (
    <PageContainer
      path="/about"
      title="About Us"
      description="LAX360 Ventures is one accountable team that builds, automates and grows businesses — software, AI, digital growth, CAD engineering and training."
    >
      <PageHero
        eyebrow={site.tagline}
        title="One accountable team behind your technology."
        art={<Ring360 className="h-auto w-full" />}
        lead="LAX360 Ventures designs, builds and supports software, AI automation and digital growth for businesses — and trains people to use it."
      />

      <section className="wrap section grid gap-10 lg:grid-cols-12" aria-labelledby="intro-title">
        <h2 id="intro-title" className="h2 lg:col-span-5">Technology that works together.</h2>
        <div className="space-y-5 text-lg text-soft lg:col-span-7">
          <p>Many businesses end up with a different vendor for the website, the software, the marketing and the training. Each does their part, and nobody owns how it all fits together.</p>
          <p>LAX360 Ventures brings those pieces under one roof. We start by understanding the business problem, then design, build and support the solution — whether that is a custom application, an AI assistant, a website with marketing behind it, or training for your team.</p>
          <p>We have branches in {branchSentence}.</p>
        </div>
      </section>

      <section className="border-y border-edge bg-base2/50" aria-labelledby="principles-title">
        <div className="wrap section">
          <SectionHeading id="principles-title" tone="dark" eyebrow="How we work" title="Four working principles." />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 0.06} className="glass-flat p-6 md:p-8">
                <p className="font-display text-sm font-semibold text-soft">0{i + 1}</p>
                <h3 className="mt-6 font-display text-2xl font-semibold">{p.title}</h3>
                <p className="mt-3 text-base text-soft">{p.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="caps-title">
        <SectionHeading id="caps-title" eyebrow="Capabilities" title="Five divisions, one story." lead="Technology consulting runs through all five as the first step of every engagement." />
        <ul className="mt-12 divide-y divide-edge border-y border-edge">
          {allDivisions.map((d) => (
            <li key={d.slug}>
              <Link to={d.to} className="group grid items-baseline gap-2 py-6 md:grid-cols-[5rem_1fr_1.4fr] md:gap-8">
                <span className="font-display text-2xl font-medium text-lav">{d.number}</span>
                <span className="font-display text-2xl font-semibold group-hover:underline">{d.name}</span>
                <span className="text-soft">{d.short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-edge bg-glass" aria-labelledby="approach-title">
        <div className="wrap section grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="approach-title" className="h2">Our development approach.</h2>
            <p className="mt-5 text-soft">Discover, design, develop, then deploy and improve — in small steps with feedback along the way.</p>
            <div className="mt-8"><Button to="/services" variant="secondary" arrow>See how we work</Button></div>
          </div>
          <dl className="grid gap-6 lg:col-span-7">
            <div className="rounded-xl border border-edge bg-night p-6">
              <dt className="font-display text-xl font-semibold">Legal entity</dt>
              <dd className="mt-2 text-soft">{site.legalLine}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="branches-about-title">
        <SectionHeading id="branches-about-title" eyebrow="Our branches" title="Three cities," gradient="one team." lead={`LAX360 Ventures has branches in ${branchSentence}.`} />
        <BranchCards className="mt-12" />
      </section>

      <ContactCta title="Talk to the team." />
    </PageContainer>
  )
}
