import Reveal from '../ui/Reveal.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import { useContent } from '../../hooks/useSite.js'

export function Tile({ c }) {
  const body = (
    <>
      <span className="flex h-24 w-56 items-center justify-center rounded-2xl border border-edge bg-white p-3 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.6)]">
        {c.logo
          ? <img src={c.logo} alt={c.alt || `${c.name} logo`} loading="lazy" decoding="async" draggable="false" className="max-h-full max-w-full object-contain" />
          : <span className="px-1 text-center font-display text-base font-semibold leading-tight text-[#1a1033]">{c.name}</span>}
      </span>
      <span className="mt-2 block max-w-56 truncate text-center text-sm font-medium text-soft">{c.name}</span>
    </>
  )
  return c.website
    ? <a href={c.website} target="_blank" rel="noopener noreferrer" className="block shrink-0 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5">{body}<span className="sr-only"> (opens in a new tab)</span></a>
    : <div className="shrink-0">{body}</div>
}

/**
 * Home "Our Clients": the clients added in the admin panel (Website content > Clients), logos at their own proportions with the company name.
 * There are no built-in clients: with none published the section is not shown. Four or more logos slide continuously (pauses on hover,
 * static under reduced motion); fewer are shown as a centred row.
 */
export default function OurClients() {
  // Every published entry appears here, whichever service it was assigned to; an administrator can hide one ("Hide from the home page").
  const homeItems = useContent('client')?.filter((x) => x.data.hide_on_home !== true)
  const items = homeItems?.length ? homeItems : null
  if (!items) return null
  const clients = items.map((i) => ({ id: i.id, name: i.title, logo: i.data.logo || i.data.logo_url, alt: i.data.logo_alt || (i.data.is_sample ? `${i.title} (sample logo)` : undefined), website: i.data.website_link }))
  const slide = clients.length >= 4
  const reps = Math.max(1, Math.ceil(8 / clients.length)) // each half of the loop must be wider than the screen
  const half = (dup) => (
    <ul className={`flex shrink-0 items-start gap-6 pr-6 ${dup ? 'marquee-dup' : ''}`} aria-hidden={dup || undefined} aria-label={dup ? undefined : 'Our clients'}>
      {Array.from({ length: reps }).flatMap((_, r) => clients.map((c) => <li key={`${r}-${c.id}`}><Tile c={c} /></li>))}
    </ul>
  )
  return (
    <section aria-labelledby="clients-title" className="border-t border-edge">
      <div className="wrap py-8 md:py-12">
        <SectionHeading id="clients-title" eyebrow="Trusted by" title="Our" gradient="Clients" center />
      </div>
      <Reveal className="pb-8 md:pb-12">
        {slide ? (
          <div className="marquee overflow-hidden" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' }}>
            <div className="marquee-track" style={{ animationDuration: `${Math.max(30, clients.length * reps * 5)}s` }}>
              {half(false)}
              {half(true)}
            </div>
          </div>
        ) : (
          <ul className="wrap flex flex-wrap items-start justify-center gap-6" aria-label="Our clients">
            {clients.map((c) => <li key={c.id}><Tile c={c} /></li>)}
          </ul>
        )}
      </Reveal>
    </section>
  )
}
