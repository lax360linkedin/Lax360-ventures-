import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'
import DivisionArt from '../art/DivisionArt.jsx'
import { concepts } from '../../data/projects.js'
import { divisions } from '../../data/services.js'

const names = Object.fromEntries(divisions.map((d) => [d.slug, d.name]))
const enquiry = { software: 'project', ai: 'ai', growth: 'marketing', engineering: 'cad' }

/**
 * Layered "capability concepts" stack. There are no approved client projects yet, so these are clearly labelled
 * illustrative concepts. Desktop: overlapping fan that spreads on hover/focus, hovered card comes forward and
 * the others desaturate. Mobile: a horizontal snap-scroll row (no hover needed). Each card links to an enquiry.
 */
export default function ConceptStack() {
  return (
    <section aria-labelledby="concepts-title" className="border-t border-edge bg-base2/50">
      <div className="wrap section">
        <SectionHeading id="concepts-title" eyebrow="Capabilities showcase" title="What each division" gradient="can build." lead="Illustrative concepts — not client work, and no results are implied. Verified case studies will appear here with client permission." />
      </div>
      <div className="fan relative -mt-4 pb-16 md:h-[31rem] md:pb-0">
        <ul className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 md:relative md:block md:h-full md:overflow-visible md:px-0 md:pb-0" aria-label="Capability concepts">
          {concepts.map((c, i) => {
            const k = i - (concepts.length - 1) / 2
            return (
              <Reveal as="li" key={c.id} delay={i * 0.08} className="shrink-0 snap-center md:absolute md:left-1/2 md:top-6 md:-ml-[9.5rem]" style={{ '--k': k, zIndex: 10 - Math.abs(Math.round(k)) }}>
                <Link to={`/contact?type=${enquiry[c.division]}`} className="fan-card glass group block w-[17.5rem] p-4 md:w-[19rem]">
                  <DivisionArt id={c.division} className="h-36 w-full rounded-xl border border-edge bg-night/40 p-2" />
                  <p className="eyebrow mt-4 text-lav">{names[c.division]}</p>
                  <h3 className="mt-1 font-display text-xl font-semibold leading-tight">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-soft">{c.text}</p>
                  <span className="mt-4 flex items-center justify-between border-t border-edge pt-3 text-sm font-semibold">
                    <span className="tag !py-0.5 !text-xs">Concept</span>
                    <span className="inline-flex items-center gap-1 text-lav">Discuss something similar <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></span>
                  </span>
                </Link>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
