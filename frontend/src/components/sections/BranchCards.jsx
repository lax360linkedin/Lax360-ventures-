import { MapPin } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'
import { branches } from '../../data/branches.js'

/**
 * The three LAX360 Ventures branches as glass cards. Data comes from `data/branches.js`.
 * A street address is shown only when one exists in that data (currently Salem only) — never invented.
 */
export default function BranchCards({ className = '' }) {
  return (
    <ul className={`grid gap-4 md:grid-cols-3 ${className}`}>
      {branches.map((b, i) => (
        <Reveal as="li" key={b.id} delay={i * 0.1}>
          <article className="glass-flat lift group flex h-full flex-col p-6">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
              <MapPin className="size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-display text-2xl font-semibold transition-colors group-hover:text-lav">{b.city}</h3>
            <p className="mt-1 text-base text-soft">{b.name}</p>
            {b.address && (
              <address className="mt-4 border-t border-edge pt-4 text-sm not-italic leading-relaxed text-soft">
                {b.address.map((line) => <span key={line} className="block">{line}</span>)}
              </address>
            )}
          </article>
        </Reveal>
      ))}
    </ul>
  )
}
