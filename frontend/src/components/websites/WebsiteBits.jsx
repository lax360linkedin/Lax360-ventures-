import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Globe } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'
import { websiteKinds, websiteTypes } from '../../hooks/useWebsites.js'

const KIND_CLS = {
  client: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  company: 'border-sky/50 bg-sky/10 text-sky-700 dark:text-sky',
  demo: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

export const KindBadge = ({ kind }) => <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${KIND_CLS[kind] || KIND_CLS.demo}`}>{websiteKinds[kind]?.label || websiteKinds.demo.label}</span>
export const TypeBadge = ({ type }) => (type ? <span className="inline-flex items-center rounded-full border border-edge-strong bg-glass px-3 py-1 text-xs font-semibold text-soft">{websiteTypes[type].label}</span> : null)

/** The website's preview: its screenshot, or a quiet placeholder when it has none yet. */
export function WebsiteShot({ site, className = '', eager = false }) {
  if (site.image) return <img src={site.image} alt={`${site.name} website preview`} width="1200" height="750" loading={eager ? 'eager' : 'lazy'} decoding="async" className={`h-full w-full object-cover object-top ${className}`} />
  return <span className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent text-soft ${className}`}><Globe className="size-10 text-lav" aria-hidden="true" /><span className="text-sm font-semibold">Preview coming soon</span></span>
}

/** One portfolio card: screenshot, kind and type, category, name, description, Explore Website (live site, new tab) and View Details. */
export function WebsiteCard({ site, delay = 0 }) {
  return (
    <Reveal as="li" delay={delay} className="h-full">
      <article className="glass-flat lift group flex h-full flex-col overflow-hidden">
        <Link to={`/websites/${site.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] overflow-hidden border-b border-edge">
          <WebsiteShot site={site} className="transition-transform duration-700 group-hover:scale-[1.04]" />
        </Link>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2"><KindBadge kind={site.kind} /><TypeBadge type={site.type} /></div>
          <p className="eyebrow text-lav">{site.category}</p>
          <h3 className="font-display text-xl font-semibold leading-tight"><Link to={`/websites/${site.slug}`} className="transition-colors hover:text-lav">{site.name}</Link></h3>
          <p className="flex-1 text-soft">{site.summary}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {site.url
              ? <a href={site.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--btn-hover)]">Explore Website <ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> {site.name} (opens in a new tab)</span></a>
              : <span className="inline-flex min-h-11 items-center rounded-full border border-dashed border-edge-strong px-5 text-sm font-semibold text-soft">Live link coming soon</span>}
            <Link to={`/websites/${site.slug}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-edge-strong px-5 text-sm font-semibold transition-colors hover:border-lav">View Details <ArrowRight className="size-4" aria-hidden="true" /><span className="sr-only"> of {site.name}</span></Link>
          </div>
        </div>
      </article>
    </Reveal>
  )
}
