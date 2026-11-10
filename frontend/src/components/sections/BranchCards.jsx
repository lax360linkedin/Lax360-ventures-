import { ArrowUpRight, MapPin, Phone } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'
import { branches } from '../../data/branches.js'

/**
 * The three LAX360 Pvt Ltd branches as glass cards. Data comes from `data/branches.js`.
 * Each card shows the official address, a tap-to-call phone number and a Google Maps link for that branch.
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
            {b.phone && (
              <a href={`tel:${b.tel}`} className="mt-3 inline-flex min-h-11 items-center gap-2 self-start font-semibold text-fg hover:text-lav">
                <Phone className="size-4 text-lav" aria-hidden="true" /> {b.phone}
              </a>
            )}
            {b.mapUrl && (
              <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start pt-1 text-sm font-semibold text-lav hover:underline">
                View on Google Maps <ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </article>
        </Reveal>
      ))}
    </ul>
  )
}
