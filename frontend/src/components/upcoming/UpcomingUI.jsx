import { Link } from 'react-router-dom'
import { ArrowUpRight, Blocks, Bot, Cog, DraftingCompass, Sparkles } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import { STATUSES, isLive } from '../../data/upcomingServices.js'
import { useUpcoming } from '../../hooks/useUpcoming.js'

const TONES = {
  amber: 'border-amber-400/60 bg-amber-400/15 text-amber-700 dark:text-amber-300',
  violet: 'border-lav/50 bg-lav/10 text-lav',
  green: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  rose: 'border-rose-400/60 bg-rose-400/15 text-rose-700 dark:text-rose-300',
}
const ICONS = { cad: DraftingCompass, robot: Bot, chain: Blocks }
export const upcomingIcon = (c) => ICONS[c?.icon] || (c?.services ? Cog : Sparkles)

/** "Coming Soon" / "Under Development" / "Available" / "Temporarily Unavailable": the status of an upcoming service, as a badge (the text is always there, never colour alone). */
export function StatusBadge({ status, className = '' }) {
  const s = STATUSES[status] || STATUSES.coming_soon
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] ${TONES[s.tone]} ${className}`}>{s.label}</span>
}

/** The icon of a category or service: the administrator's uploaded icon, otherwise a built-in symbol. */
export function UpcomingIcon({ item, className = 'size-5' }) {
  if (item.iconImage) return <img src={item.iconImage} alt="" className={`${className} object-contain`} />
  const Icon = upcomingIcon(item)
  return <Icon className={className} aria-hidden="true" />
}

/** A card for one upcoming category: icon, name, status badge, short description and the services it will contain. A category that is Available reads as a normal service card. */
export function UpcomingCard({ c, delay = 0 }) {
  const live = isLive(c.status)
  return (
    <Reveal as="li" delay={delay}>
      <Link to={c.path} data-upcoming-card className="glass-flat lift group flex h-full flex-col overflow-hidden">
        {c.image && <img src={c.image} alt="" loading="lazy" decoding="async" className="aspect-[16/8] w-full object-cover" />}
        <span className="flex flex-1 flex-col gap-3 p-5">
          <span className="flex items-start justify-between gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg"><UpcomingIcon item={c} /></span>
            <StatusBadge status={c.status} />
          </span>
          <span className="font-display text-xl font-semibold leading-tight transition-colors group-hover:text-lav">{c.name}</span>
          <span className="text-sm text-soft">{c.tagline}</span>
          {c.services.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {c.services.map((s) => <span key={s.slug} className="rounded-full border border-edge bg-glass px-2.5 py-1 text-xs font-medium text-soft">{s.name}</span>)}
            </span>
          )}
          <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-lav">
            {live ? 'Learn more' : 'Learn more and register interest'} <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </span>
      </Link>
    </Reveal>
  )
}

/** The "Upcoming services" section (home page, Services page): one card per category with its status. Renders nothing when no category is to be shown. */
export default function UpcomingServicesSection({ id = 'upcoming', home = false }) {
  const all = useUpcoming()
  const list = home ? all.filter((c) => c.showHome) : all
  if (!list.length) return null
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="wrap section scroll-mt-28">
      <SectionHeading id={`${id}-title`} eyebrow="Coming soon" title="Upcoming" gradient="services."
        lead="New service areas we are building: CAD and engineering design, robotics, and blockchain and Web 3.0. They are under development and will be launched in the future. Register your interest and we will keep you informed." />
      <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{list.map((c, i) => <UpcomingCard key={c.slug} c={c} delay={i * 0.07} />)}</ul>
      <p className="mt-6 max-w-3xl text-sm text-soft">Upcoming services are not available to order yet. Details, scope and launch information will be published here when each service is ready.</p>
    </section>
  )
}
