import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search, X } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { WebsiteCard } from '../components/websites/WebsiteBits.jsx'
import { useWebsites, websiteKinds, websiteTypes } from '../hooks/useWebsites.js'
import { useContentReady } from '../hooks/useSite.js'

const chip = (on) => `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${on ? 'border-transparent bg-primary text-white shadow-lg' : 'border-edge-strong bg-glass hover:border-lav'}`

/**
 * /websites — "Our Websites & Live Demos": LAX360 company websites, client websites and demonstration projects. Everything comes from the admin panel
 * (Website content > Websites). Filter by industry, kind and type, or search; each card opens the live website in a new tab or its details page.
 */
export default function Websites() {
  const sites = useWebsites()
  const ready = useContentReady()
  const [cat, setCat] = useState('all')
  const [kind, setKind] = useState('all')
  const [type, setType] = useState('all')
  const [query, setQuery] = useState('')
  const cats = useMemo(() => [...new Set(sites.map((s) => s.category))], [sites])
  const types = useMemo(() => [...new Set(sites.map((s) => s.type).filter(Boolean))], [sites])
  const q = query.trim().toLowerCase()
  const shown = sites.filter((s) => (cat === 'all' || s.category === cat) && (kind === 'all' || s.kind === kind) && (type === 'all' || s.type === type) && (!q || `${s.name} ${s.category} ${s.summary}`.toLowerCase().includes(q)))
  const clear = () => { setCat('all'); setKind('all'); setType('all'); setQuery('') }
  const filtering = cat !== 'all' || kind !== 'all' || type !== 'all' || q

  return (
    <PageContainer path="/websites" title="Our Websites & Live Demos" description="Explore websites built by LAX360 Pvt Ltd: company websites, client websites and industry demonstration projects. Open the live website and see its features and modules.">
      <section aria-labelledby="websites-title" className="relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night">
        <div aria-hidden="true" className="absolute -left-28 top-8 -z-10 size-[26rem] rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-24 top-0 -z-10 size-[28rem] rounded-full bg-sky/15 blur-3xl" />
        <div className="wrap pb-14 pt-8 md:pb-20 md:pt-10">
          <nav aria-label="Breadcrumb" className="text-sm text-soft"><ol className="flex items-center gap-2"><li><Link to="/" className="hover:text-lav">Home</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" /><li><Link to="/products" className="hover:text-lav">Products</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" /><li aria-current="page" className="font-semibold text-fg">Websites</li></ol></nav>
          <Reveal y={12} className="mt-8 max-w-3xl">
            <p className="eyebrow text-lav">Explore our websites</p>
            <h1 id="websites-title" className="h1 mt-4 !text-[clamp(2.3rem,4.8vw,4.3rem)]">Our Websites <span className="text-gradient">&amp; Live Demos.</span></h1>
            <p className="lead mt-6 text-soft">Open real websites and industry demos built by LAX360, and see what each one is, how it is built and what it can do.</p>
            <ul className="mt-6 flex flex-wrap gap-2 text-sm text-soft" aria-label="Kinds of website">{Object.values(websiteKinds).map((k) => <li key={k.label} className="rounded-full border border-edge bg-glass px-3 py-1"><span className="font-semibold text-fg">{k.label}:</span> {k.note}</li>)}</ul>
          </Reveal>
        </div>
      </section>

      <section id="portfolio" className="wrap section" aria-labelledby="portfolio-title">
        <SectionHeading id="portfolio-title" eyebrow="Portfolio" title="Browse by" gradient="industry." lead={sites.length ? `${sites.length} websites and demos.` : undefined} />
        {sites.length > 0 && (
          <div className="mt-10 flex flex-col gap-4">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-soft" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search websites by name, industry or description" aria-label="Search websites" className="h-12 w-full rounded-full border border-edge-strong bg-glass pl-12 pr-12 text-base text-fg outline-none transition-colors placeholder:text-soft focus:border-lav" />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-soft hover:text-lav"><X className="size-4" aria-hidden="true" /></button>}
            </div>
            <div role="group" aria-label="Filter by industry" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {['all', ...cats].map((c) => <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={chip(cat === c)}>{c === 'all' ? `All (${sites.length})` : c}</button>)}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <div role="group" aria-label="Filter by kind" className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setKind('all')} aria-pressed={kind === 'all'} className={chip(kind === 'all')}>All kinds</button>
                {Object.entries(websiteKinds).filter(([k]) => sites.some((s) => s.kind === k)).map(([k, v]) => <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={chip(kind === k)}>{v.label}</button>)}
              </div>
              {types.length > 0 && (
                <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setType('all')} aria-pressed={type === 'all'} className={chip(type === 'all')}>All types</button>
                  {types.map((t) => <button key={t} type="button" onClick={() => setType(t)} aria-pressed={type === t} className={chip(type === t)}>{websiteTypes[t].label}</button>)}
                </div>
              )}
            </div>
          </div>
        )}
        {sites.length > 0 && <p className="mt-6 text-sm text-soft" role="status" aria-live="polite">{shown.length} {shown.length === 1 ? 'website' : 'websites'}{cat !== 'all' ? ` in ${cat}` : ''}{q ? ` matching “${query.trim()}”` : ''}</p>}
        {shown.length > 0 && <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{shown.map((s, i) => <WebsiteCard key={s.slug} site={s} delay={(i % 3) * 0.06} />)}</ul>}
        {sites.length > 0 && shown.length === 0 && (
          <div className="glass mt-6 p-8 text-center"><p className="font-display text-xl font-semibold">No websites match.</p><button type="button" onClick={clear} className="link-underline mt-3 inline-flex min-h-11 items-center font-semibold text-lav">Show all websites</button></div>
        )}
        {sites.length === 0 && (
          <div className="glass mt-10 p-8 text-center md:p-10" role="status">
            <p className="font-display text-2xl font-semibold">{ready ? 'Websites will appear here soon.' : 'Loading…'}</p>
            {ready && <p className="mx-auto mt-2 max-w-xl text-soft">Our portfolio of company websites, client websites and industry demos is being prepared.</p>}
          </div>
        )}
        {filtering && shown.length > 0 && <div className="mt-6"><button type="button" onClick={clear} className="link-underline inline-flex min-h-11 items-center font-semibold text-lav">Clear filters</button></div>}
      </section>

      <section className="wrap pb-16 md:pb-24" aria-labelledby="websites-cta-title">
        <Reveal><div className="glass p-8 text-center md:p-12">
          <h2 id="websites-cta-title" className="h2">Want a website <span className="text-gradient">like these?</span></h2>
          <p className="lead mx-auto mt-4 max-w-2xl text-soft">Tell us about your business and we will plan the right website for it.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button to="/contact?type=website-app" arrow>Start a website project</Button><Button to="/services/software/website-development" variant="secondary">Website development service</Button></div>
        </div></Reveal>
      </section>
    </PageContainer>
  )
}
