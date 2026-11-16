import { ArrowUpRight, MapPin, Phone } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'
import { Rise } from '../contact/Motion.jsx'
import BranchMap from '../ui/BranchMap.jsx'
import { useBranchDirectory } from '../../hooks/useBranches.js'

/**
 * The LAX360 Pvt Ltd branches as glass cards, from the database (Admin > Branch locations): a branch the administrator adds, edits, disables or deletes is what visitors see, with no code change.
 * A branch with a Google Maps embed shows its interactive map inside its card. (data/branches.js is only the stand-in while the list loads or if the server is unreachable.)
 * Each card shows the official address, a tap-to-call phone number and a Google Maps link for that branch.
 */
export default function BranchCards({ className = '', refined = false }) {
  const Item = refined ? Rise : Reveal
  const { branches } = useBranchDirectory()
  const columns = branches.length >= 3 ? 'md:grid-cols-3' : branches.length === 2 ? 'md:grid-cols-2' : ''
  return (
    <ul className={`grid gap-4 ${columns} ${className}`}>
      {branches.map((b, i) => (
        <Item as="li" key={b.id} delay={i * 0.1}>
          <article className={`glass-flat ${refined ? 'ct-card' : 'lift'} group flex h-full flex-col p-6`}>
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
            {b.embed && <BranchMap src={b.embed} title={`Map of the ${b.city} branch`} className="mt-4" />}
            {b.mapUrl && (
              <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start pt-1 text-sm font-semibold text-lav hover:underline">
                View on Google Maps <ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </article>
        </Item>
      ))}
    </ul>
  )
}
