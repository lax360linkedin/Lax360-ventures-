import { Bot, Database, Globe2, Smartphone } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'

// Only tools already named in our service content. These are the kinds of tools we work with — no vendor
// logos and no partnership claims.
const groups = [
  { icon: Globe2, title: 'Web', items: ['React', 'Node.js', 'REST APIs'], accent: 'from-primary to-accent' },
  { icon: Database, title: 'Data', items: ['Relational databases', 'Reporting'], accent: 'from-sky to-primary' },
  { icon: Smartphone, title: 'Mobile', items: ['Android', 'iOS'], accent: 'from-accent to-[#e879f9]' },
  { icon: Bot, title: 'AI & automation', items: ['AI assistants', 'Workflow automation', 'Document processing'], accent: 'from-lav to-accent' },
]

export default function TechStack() {
  return (
    <section aria-labelledby="tech-title" className="wrap section">
      <SectionHeading id="tech-title" eyebrow="Technology" title="The kinds of tools we" gradient="build with." lead="Chosen for your requirement — this is a sample of what we work with, not a fixed menu." />
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g, i) => (
          <Reveal as="li" key={g.title} delay={i * 0.1}>
            <div className="glass-flat lift shine group h-full p-6">
              <span className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${g.accent} text-white transition-transform duration-500 group-hover:rotate-[360deg]`}>
                <g.icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold transition-colors group-hover:text-lav">{g.title}</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {g.items.map((it, k) => (
                  <Reveal as="li" key={it} delay={i * 0.1 + 0.25 + k * 0.08} y={8} className="tag">{it}</Reveal>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}
