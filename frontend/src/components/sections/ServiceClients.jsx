import Reveal from '../ui/Reveal.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import { Tile } from './OurClients.jsx'
import { useServiceContent } from '../../hooks/useServiceContent.js'

/**
 * "Our Clients" for ONE service page (a main service, or one of its sub-services), in the same style as the home page strip: logos at their own
 * proportions with the company name, sliding continuously (pauses on hover, static under reduced motion) when there are four or more, and a centred
 * row when there are fewer. The backend picks the admin-panel clients (Website content > Clients) that belong to this page through the service
 * hierarchy; the section is hidden when there are none. The home page component itself is not touched: this one reuses its logo tile and scroll styles.
 */
export default function ServiceClients({ category, sub, serviceName }) {
  const items = useServiceContent(category, sub).clients
  if (!items.length) return null
  const clients = items.map((i) => ({ id: i.id, name: i.title, logo: i.data.logo || i.data.logo_url, alt: i.data.is_sample ? `${i.title} (sample logo)` : undefined, website: i.data.website_link }))
  const slide = clients.length >= 4
  const reps = Math.max(1, Math.ceil(8 / clients.length)) // each half of the loop must be wider than the screen
  const half = (dup) => (
    <ul className={`flex shrink-0 items-start gap-6 pr-6 ${dup ? 'marquee-dup' : ''}`} aria-hidden={dup || undefined} aria-label={dup ? undefined : `${serviceName} clients`}>
      {Array.from({ length: reps }).flatMap((_, r) => clients.map((c) => <li key={`${r}-${c.id}`}><Tile c={c} /></li>))}
    </ul>
  )
  return (
    <section aria-labelledby="service-clients-title" className="border-t border-edge">
      <div className="wrap py-8 md:py-12">
        <SectionHeading id="service-clients-title" eyebrow="Trusted by" title="Our clients for" gradient={`${serviceName}.`} center className="!max-w-4xl" />
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
          <ul className="wrap flex flex-wrap items-start justify-center gap-6" aria-label={`${serviceName} clients`}>
            {clients.map((c) => <li key={c.id}><Tile c={c} /></li>)}
          </ul>
        )}
      </Reveal>
    </section>
  )
}
