import { Link } from 'react-router-dom'
import { ArrowRight, Boxes, Bot, LayoutDashboard, Users } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'
import { solutions } from '../../data/solutions.js'

const icons = { crm: Users, erp: Boxes, assistants: Bot, 'custom-apps': LayoutDashboard }

/**
 * Four solutions revealed column by column. Each tile links to its block on /solutions. The "what can be
 * included" list is always visible (no hover-only content); hover adds lift, border and arrow motion.
 */
export default function SolutionsStrip() {
  return (
    <section aria-labelledby="solutions-title" className="border-t border-edge bg-base2/50">
      <div className="wrap section">
        <SectionHeading id="solutions-title" eyebrow="Solutions" title="Business problems," gradient="packaged." lead="Four starting points for owners who want an answer, not a technology list." />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {solutions.map((s, i) => {
            const Icon = icons[s.id]
            return (
              <Reveal as="li" key={s.id} delay={i * 0.1}>
                <Link to={`/solutions#${s.id}`} className="glass-flat lift group flex h-full flex-col p-6">
                  <span className="flex size-11 items-center justify-center rounded-xl border border-edge bg-primary/20 text-lav transition-[background-color,transform] duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold leading-tight transition-colors group-hover:text-lav">{s.title}</h3>
                  <p className="mt-2 text-base text-soft">{s.problem}</p>
                  <ul className="mt-4 space-y-1.5 border-t border-edge pt-4 text-sm text-soft">
                    {s.included.slice(0, 3).map((x) => (
                      <li key={x} className="flex items-start gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-accent" />{x}</li>
                    ))}
                  </ul>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 font-semibold text-lav">
                    See details <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1.5" aria-hidden="true" />
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
