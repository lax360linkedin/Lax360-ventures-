import { Link } from 'react-router-dom'
import { ArrowUpRight, Layers } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import { useContent } from '../../hooks/useSite.js'

/** Group the published services under their (managed) categories, in the order set in the admin panel. */
export function useServiceGroups() {
  const services = useContent('service')
  const categories = useContent('service_category') || []
  if (!services) return []
  const known = new Set(categories.map((c) => c.slug))
  const groups = categories.map((c) => ({ key: c.slug, title: c.title, text: c.data.description, icon: c.data.icon, items: services.filter((s) => s.data.category === c.slug) })).filter((g) => g.items.length)
  const other = services.filter((s) => !known.has(s.data.category))
  return other.length ? [...groups, { key: 'other', title: 'More services', text: '', icon: null, items: other }] : groups
}

/** Services published in the admin panel, listed by category. Renders nothing when there are none (the built-in services page is unchanged). */
export default function CmsServices() {
  const groups = useServiceGroups()
  if (!groups.length) return null
  return (
    <section className="wrap section" aria-labelledby="more-services-title" id="more-services">
      <SectionHeading id="more-services-title" eyebrow="More from LAX360" title="Our" gradient="services." lead="Everything we offer, by category." />
      <div className="mt-12 space-y-14">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="flex items-center gap-4">
              {g.icon ? <img src={g.icon} alt="" className="size-12 rounded-2xl border border-edge bg-glass object-contain p-1.5" loading="lazy" /> : <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white"><Layers className="size-6" aria-hidden="true" /></span>}
              <div><h3 className="font-display text-2xl font-semibold">{g.title}</h3>{g.text && <p className="text-soft">{g.text}</p>}</div>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((s, i) => (
                <Reveal as="li" key={s.id} delay={i * 0.05}>
                  <Link to={`/services/${s.slug}`} className="glass-flat lift group flex h-full flex-col overflow-hidden">
                    {s.data.image && <img src={s.data.image} alt={s.data.image_alt || ''} className="aspect-[16/9] w-full object-cover" loading="lazy" />}
                    <span className="flex flex-1 flex-col p-6">
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-display text-xl font-semibold transition-colors group-hover:text-lav">{s.title}</span>
                        {s.data.icon ? <img src={s.data.icon} alt="" className="size-9 shrink-0 object-contain" loading="lazy" /> : <ArrowUpRight className="mt-1 size-5 shrink-0 text-soft transition-colors group-hover:text-lav" aria-hidden="true" />}
                      </span>
                      <span className="mt-3 flex-1 text-soft">{s.data.summary}</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
