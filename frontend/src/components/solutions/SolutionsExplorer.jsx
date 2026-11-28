import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Search, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { solutionHref } from '../../data/solutions.js'
import { useSolutionIndex } from '../../hooks/useSolutions.js'
import { CustomStatement, SolutionCard, platformTags } from './SolutionBits.jsx'

const FIRST = 6 // cards shown per category before "Show all": the page never loads every picture at once (pictures are lazy loaded as well)
const selectCls = 'min-h-11 w-full rounded-xl border border-edge-strong bg-glass px-3 text-sm font-medium text-fg focus-visible:outline-2 focus-visible:outline-lav'

/**
 * The solutions portfolio: category navigation, search, and filters for category, industry, platform and availability. Cards are grouped by category (each group has its introduction,
 * a short custom-development note and a link to the matching service page). Used on the Products page, the /solutions page and the Software & IT Services page.
 */
export default function SolutionsExplorer({ idPrefix = 'sol', showStatement = true }) {
  const { categories, solutions } = useSolutionIndex()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const [industry, setIndustry] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [open, setOpen] = useState({})
  const q = useDeferredValue(query.trim().toLowerCase())

  const industries = useMemo(() => [...new Set(solutions.flatMap((s) => s.industries || []))].sort(), [solutions])
  const platforms = useMemo(() => [...new Set(solutions.flatMap(platformTags))].sort(), [solutions])
  const shown = useMemo(() => solutions.filter((s) => (cat === 'all' || s.category === cat) && (industry === 'all' || (s.industries || []).includes(industry))
    && (platform === 'all' || platformTags(s).includes(platform))
    && (!q || `${s.name} ${s.pitch} ${(s.industries || []).join(' ')}`.toLowerCase().includes(q))), [solutions, cat, industry, platform, q])
  const filtering = cat !== 'all' || industry !== 'all' || platform !== 'all' || q !== ''
  const reset = () => { setQuery(''); setCat('all'); setIndustry('all'); setPlatform('all') }
  const goto = (slug) => { setCat('all'); document.getElementById(`${idPrefix}-${slug}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }) }

  return (
    <div>
      <nav aria-label="Solution categories" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {categories.map((c) => (
          <button key={c.slug} type="button" onClick={() => goto(c.slug)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-edge-strong bg-glass px-4 text-sm font-semibold transition-colors hover:border-lav hover:text-lav focus-visible:border-lav">
            {c.name} <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-lav">{c.count ?? solutions.filter((s) => s.category === c.slug).length}</span>
          </button>
        ))}
      </nav>

      <form role="search" aria-label="Search and filter solutions" onSubmit={(e) => e.preventDefault()} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search solutions</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search solutions" className={`${selectCls} pl-9`} />
        </label>
        <label><span className="sr-only">Category</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={selectCls}><option value="all">All categories</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
        <label><span className="sr-only">Industry</span>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectCls}><option value="all">All industries</option>{industries.map((i) => <option key={i} value={i}>{i}</option>)}</select></label>
        <label><span className="sr-only">Platform</span>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={selectCls}><option value="all">All platforms</option>{platforms.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-soft" role="status" aria-live="polite">
        <span>{shown.length} of {solutions.length} solutions</span>
        {filtering && <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-1 font-semibold text-lav hover:underline"><X className="size-4" aria-hidden="true" />Clear filters</button>}
      </div>

      {filtering ? (
        shown.length ? (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{shown.map((s, i) => <SolutionCard key={s.slug} s={s} categoryName={categories.find((c) => c.slug === s.category)?.name} delay={(i % 3) * 0.05} />)}</ul>
        ) : <div className="glass mt-6 p-8 text-center"><p className="font-display text-xl font-semibold">No solutions match these filters.</p><p className="mt-2 text-soft">We build custom solutions too: tell us what you need.</p><Button to="/contact?type=product&intent=custom" className="mt-4">Request a Custom Solution</Button></div>
      ) : categories.map((c) => {
        const list = solutions.filter((s) => s.category === c.slug)
        if (!list.length) return null
        const all = open[c.slug]
        return (
          <section key={c.slug} id={`${idPrefix}-${c.slug}`} aria-labelledby={`${idPrefix}-${c.slug}-title`} className="mt-14 scroll-mt-[calc(var(--header-bottom,92px)+1rem)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="eyebrow text-lav">{list.length} {c.slug === 'websites' ? 'industry categories' : 'solutions'}</p>
                <h3 id={`${idPrefix}-${c.slug}-title`} className="h2 mt-1 !text-[clamp(1.5rem,3vw,2.25rem)]">{c.name}</h3>
                <p className="mt-3 text-soft">{c.intro}</p>
              </div>
              {c.service_link && <Link to={c.service_link} className="link-underline inline-flex min-h-11 shrink-0 items-center gap-1.5 font-semibold text-lav">About this service <ArrowUpRight className="size-4" aria-hidden="true" /></Link>}
            </div>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(all ? list : list.slice(0, FIRST)).map((s, i) => <SolutionCard key={s.slug} s={s} delay={(i % 3) * 0.05} />)}
            </ul>
            {list.length > FIRST && !all && (
              <div className="mt-5 text-center"><Button variant="secondary" onClick={() => setOpen((o) => ({ ...o, [c.slug]: true }))}>Show all {list.length} in {c.name}</Button></div>
            )}
            {c.types?.length > 0 && (
              <div className="glass-flat mt-8 p-6">
                <h4 className="font-display text-lg font-semibold">Types of websites we develop</h4>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {c.types.map((t) => <li key={t.name} className="rounded-xl border border-edge p-4"><p className="font-semibold">{t.name}</p><p className="mt-1 text-sm text-soft">{t.text}</p></li>)}
                </ul>
              </div>
            )}
            {c.custom_name && (
              <div className="glass-flat mt-8 flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-3xl"><h4 className="font-display text-xl font-semibold">{c.custom_name}</h4><p className="mt-2 text-soft">{c.custom_text}</p></div>
                <Button to={`/contact?type=product&intent=custom&category=${c.slug}`} arrow className="shrink-0">Discuss Your Requirements</Button>
              </div>
            )}
          </section>
        )
      })}
      {showStatement && <div className="mt-6 -mx-4 sm:-mx-6"><CustomStatement id={`${idPrefix}-custom`} /></div>}
    </div>
  )
}

export { solutionHref }
