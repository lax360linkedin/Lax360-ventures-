import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'

// Illustrative situations, not claims about past clients. [Confirm] in the planning document.
const rows = [
  { problem: 'Billing, stock and customers live in five different places.', solution: 'One CRM / ERP built around your process.', to: '/services/software', cta: 'Software & Apps' },
  { problem: 'Your team answers the same questions all day.', solution: 'An AI assistant that answers from approved information.', to: '/services/ai', cta: 'AI & Automation' },
  { problem: 'People find you, but they don’t enquire.', solution: 'A website and digital growth plan that work together.', to: '/services/growth', cta: 'Digital Growth' },
]

export default function Outcomes() {
  return (
    <section aria-labelledby="outcomes-title" className="border-t border-edge">
      <div className="wrap section">
        <SectionHeading id="outcomes-title" eyebrow="Where we can help" title="Where we can come in." lead="Situations we are set up to solve — described plainly." />
        <div className="mt-12 divide-y divide-edge border-y border-edge">
          {rows.map((r, i) => (
            <Reveal key={r.problem} delay={i * 0.05} className="grid gap-4 py-8 md:grid-cols-2 md:gap-12 md:py-10">
              <p className="text-xl text-soft md:text-2xl">{r.problem}</p>
              <div>
                <p className="font-display text-2xl font-semibold leading-tight md:text-3xl">{r.solution}</p>
                <Link to={r.to} className="link-underline group mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-lav">
                  {r.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
