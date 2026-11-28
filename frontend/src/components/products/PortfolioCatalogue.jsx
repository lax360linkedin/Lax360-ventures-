import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Globe, Search, X } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'
import { StatusBadge } from '../solutions/SolutionBits.jsx'
import { previewLabel } from '../../data/portfolio.js'
import { useSolutionIndex } from '../../hooks/useSolutions.js'
import { imgSet } from '../../data/solutions.js'
import { usePortfolio } from '../../hooks/usePortfolio.js'

const PAGE = 12 // cards shown before "Show more": the page never loads every picture at once
const selectCls = 'min-h-11 w-full rounded-xl border border-edge-strong bg-glass px-3 text-sm font-medium text-fg focus-visible:outline-2 focus-visible:outline-lav'

function Card({ it, delay, categoryLabel }) {
  const tag = it.real ? '' : previewLabel(it.category, it.status)
  return (
    <Reveal as="li" delay={delay} className="h-full">
      <article className="glass-flat lift group flex h-full flex-col overflow-hidden">
        <Link to={it.href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[3/2] overflow-hidden bg-glass-strong">
          {it.image
            ? <img {...imgSet(it.image)} sizes="(min-width:1024px) 360px, (min-width:640px) 45vw, 92vw" alt="" width="1600" height="1067" loading="lazy" decoding="async" className={`size-full object-cover ${it.type === 'website' ? 'object-top' : ''} transition-transform duration-500 group-hover:scale-[1.03]`} />
            : <span className="flex size-full items-center justify-center text-lav"><Globe className="size-10" aria-hidden="true" /></span>}
          {tag && <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">{tag}</span>}
        </Link>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={it.status === 'available' && it.type === 'website' ? 'live' : it.status} /><span className="text-xs font-semibold text-soft">{categoryLabel(it.category)}</span></div>
          <h3 className="font-display text-lg font-semibold leading-snug"><Link to={it.href} className="transition-colors hover:text-lav focus-visible:text-lav">{it.name}</Link></h3>
          <p className="line-clamp-3 text-soft">{it.summary}</p>
          {it.tags.length > 0 && <ul className="flex flex-wrap gap-1.5" aria-label="Tags">{it.tags.map((t) => <li key={t} className="rounded-full border border-edge px-2.5 py-0.5 text-xs font-medium text-soft">{t}</li>)}</ul>}
          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 pt-2">
            {it.liveUrl && <a href={it.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5">{it.type === 'website' ? 'View Live Website' : 'Try Live Demo'} <ArrowUpRight className="size-4" aria-hidden="true" /></a>}
            <Link to={it.href} className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold text-lav">View details <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            {it.type === 'solution' && <Link to={`${it.href}#enquire`} className="link-underline inline-flex min-h-11 items-center font-semibold">Enquire now</Link>}
          </div>
        </div>
      </article>
    </Reveal>
  )
}

/** The product portfolio of the Products page: search, the six categories and an availability filter over products, live websites and solutions together. */
export default function PortfolioCatalogue() {
  const items = usePortfolio()
  const { categories } = useSolutionIndex()
  const categoryLabel = (slug) => categories.find((c) => c.slug === slug)?.name || slug
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const [limit, setLimit] = useState(PAGE)
  const q = useDeferredValue(query.trim().toLowerCase())
  const shown = useMemo(() => items.filter((x) => (cat === 'all' || x.category === cat) && (!q || `${x.name} ${x.summary} ${x.tags.join(' ')} ${categoryLabel(x.category)}`.toLowerCase().includes(q))), [items, cat, q])
  const filtering = cat !== 'all' || q !== ''
  const reset = () => { setQuery(''); setCat('all'); setLimit(PAGE) }
  const pick = (c) => { setCat(c); setLimit(PAGE) }
  return (
    <div>
      <div role="group" aria-label="Filter by category" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {[{ slug: 'all', label: 'All Products' }, ...categories.filter((c) => items.some((x) => x.category === c.slug)).map((c) => ({ slug: c.slug, label: c.name }))].map((c) => {
          const n = c.slug === 'all' ? items.length : items.filter((x) => x.category === c.slug).length
          return (
            <button key={c.slug} type="button" onClick={() => pick(c.slug)} aria-pressed={cat === c.slug} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all ${cat === c.slug ? 'border-transparent bg-primary text-white shadow-lg' : 'border-edge-strong bg-glass hover:border-lav hover:text-lav'}`}>
              {c.label} <span className={`rounded-full px-2 py-0.5 text-xs ${cat === c.slug ? 'bg-white/20' : 'bg-primary/15 text-lav'}`}>{n}</span>
            </button>
          )
        })}
      </div>
      <form role="search" aria-label="Search and filter products" onSubmit={(e) => e.preventDefault()} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }} placeholder="Search products, websites and solutions" className={`${selectCls} pl-9`} />
        </label>
        {filtering && <button type="button" onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-edge-strong px-4 text-sm font-semibold hover:border-lav"><X className="size-4" aria-hidden="true" /> Clear</button>}
      </form>
      <p className="mt-5 text-sm text-soft" role="status" aria-live="polite">{shown.length} {shown.length === 1 ? 'item' : 'items'}{cat !== 'all' ? ` in ${categoryLabel(cat)}` : ''}</p>
      {shown.length > 0
        ? <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{shown.slice(0, limit).map((it, i) => <Card key={it.key} it={it} delay={(i % 3) * 0.05} categoryLabel={categoryLabel} />)}</ul>
        : <div className="glass mt-6 p-8 text-center"><p className="font-display text-xl font-semibold">Nothing matches your search.</p><button type="button" onClick={reset} className="link-underline mt-3 inline-flex min-h-11 items-center font-semibold text-lav">Show everything</button></div>}
      {shown.length > limit && <div className="mt-8 text-center"><button type="button" onClick={() => setLimit(limit + PAGE)} className="inline-flex min-h-11 items-center rounded-full border border-edge-strong px-6 font-semibold hover:border-lav hover:text-lav">Show more ({shown.length - limit} left)</button></div>}
      <p className="mt-6 text-xs text-soft">Pictures labelled Product Interface Preview, Website Design Preview, Solution Preview or Concept Preview are design previews with sample data, not screenshots of a client system. Live websites and products show their real pages.</p>
    </div>
  )
}
