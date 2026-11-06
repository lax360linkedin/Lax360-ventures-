import PageContainer from '../components/layout/PageContainer.jsx'
import PageHero from '../components/sections/PageHero.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import DivisionArt from '../components/art/DivisionArt.jsx'
import SocialIcon from '../components/layout/SocialIcon.jsx'
import { teamGroups } from '../data/team.js'
import { useTeam } from '../hooks/useCmsPages.js'

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

function Member({ m, i }) {
  return (
    <Reveal as="li" delay={(i % 4) * 0.06}>
      <article className="glass-flat lift flex h-full flex-col overflow-hidden">
        {m.photo
          ? <img src={m.photo} alt={m.photoAlt || m.name} width="600" height="600" loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
          : <div aria-hidden="true" className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-primary/40 to-accent/30 font-display text-5xl font-bold text-fg">{initials(m.name)}</div>}
        <div className="flex flex-1 flex-col gap-1 p-5">
          <h4 className="font-display text-xl font-semibold leading-tight">{m.name}</h4>
          <p className="text-sm font-semibold text-lav">{m.designation}</p>
          {m.bio && <p className="mt-2 flex-1 text-sm text-soft">{m.bio}</p>}
          {m.linkedin && (
            <a href={m.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${m.name} on LinkedIn (opens in a new tab)`} className="mt-3 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-lav hover:underline">
              <SocialIcon platform="linkedin" className="size-4" /> LinkedIn
            </a>
          )}
        </div>
      </article>
    </Reveal>
  )
}

/** Our Team: the people behind LAX360 Ventures, grouped by team. Profiles are managed in the admin panel (there are no built-in profiles). */
export default function Team() {
  const people = useTeam()
  return (
    <PageContainer
      path="/our-team"
      title="Our Team"
      description="Meet the people behind LAX360 Ventures: founder and leadership, management, department heads and our software, AI, and digital marketing teams."
    >
      <PageHero
        eyebrow="Our Team"
        title="The people behind LAX360."
        art={<DivisionArt id="software" className="h-auto w-full" />}
        lead="One accountable team across software, AI, digital growth — from leadership to the specialists who do the work."
      />

      <section className="wrap section" aria-labelledby="team-title">
        <h2 id="team-title" className="sr-only">Our teams</h2>
        {people.length === 0 && (
          <p role="note" className="mb-10 rounded-2xl border border-dashed border-edge px-5 py-4 text-soft">Team profiles are being added. Until then, here is how our teams are organised.</p>
        )}
        <div className="space-y-16">
          {teamGroups.map((g) => {
            const list = people.filter((p) => p.group === g.value)
            if (!list.length && people.length > 0) return null // once profiles exist, only show teams that have people
            return (
              <div key={g.value} id={g.value} className="scroll-mt-32">
                <Reveal>
                  <h3 className="font-display text-2xl font-semibold md:text-3xl">{g.label}</h3>
                  <p className="mt-2 max-w-2xl text-soft">{g.text}</p>
                </Reveal>
                {list.length > 0 && (
                  <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {list.map((m, i) => <Member key={m.slug} m={m} i={i} />)}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <ContactCta title="Want to work with our team?" />
    </PageContainer>
  )
}
