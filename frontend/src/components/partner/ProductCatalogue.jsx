import { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, ChevronDown, Search } from 'lucide-react'
import { ITF_PRODUCTS } from '../../data/itFranchise.js'
import { useProductCatalogue } from '../../hooks/usePartnerProducts.js'
import { useSolutionIndex } from '../../hooks/useSolutions.js'
import { statusOf } from '../../data/solutions.js'

// Same pattern as the Education course list: one shared open / closed state for the sidebar list and every "Our Products" button on the page.
const PANEL_ID = 'product-panel'
const store = { open: false, mounted: 0, subs: new Set() }
const emit = () => store.subs.forEach((f) => f())
const subscribe = (f) => { store.subs.add(f); return () => { store.subs.delete(f) } }
const useOpen = () => useSyncExternalStore(subscribe, () => store.open, () => false)
const setOpenState = (v) => { if (store.open !== v) { store.open = v; emit() } }

/** "Our Products": the IT & Software product, platform and service list as an expandable section of the sidebar. */
export function ProductAccordion({ accent = 'var(--color-primary)', catalogue: base = ITF_PRODUCTS, program = 'franchise' }) {
  const catalogue = useProductCatalogue(base, program) // the built-in list plus the administrator's changes
  const COUNT = catalogue.groups.reduce((n, g) => n + g.items.length, 0)
  const sol = useSolutionIndex() // the Software & IT solutions portfolio, by category and by the partnership programs each solution is listed under
  const flag = { franchise: 'partner_franchise', authorized: 'partner_authorized', 'authorized-partner': 'partner_authorized', referral: 'partner_referral', 'referral-partner': 'partner_referral' }[program] || 'partner_franchise'
  const solutionGroups = useMemo(() => sol.categories.map((c) => ({ ...c, items: sol.solutions.filter((x) => x.category === c.slug && x[flag] !== false) })).filter((c) => c.items.length), [sol, flag])
  const open = useOpen()
  const id = useId()
  const [q, setQ] = useState('')
  useEffect(() => { store.mounted += 1; return () => { store.mounted -= 1; if (!store.mounted) store.open = false } }, [])
  const term = q.trim().toLowerCase()
  const groups = useMemo(() => catalogue.groups.map((g) => ({ ...g, items: g.items.filter((i) => !term || `${i.name} ${i.desc || ''}`.toLowerCase().includes(term)) })).filter((g) => g.items.length), [term, catalogue])
  const shown = groups.reduce((n, g) => n + g.items.length, 0)
  return (
    <section id={PANEL_ID} aria-label="Our products" className="mt-4 scroll-mt-44 rounded-2xl border border-edge bg-glass lg:scroll-mt-48">
      <button type="button" onClick={() => setOpenState(!open)} aria-expanded={open} aria-controls={`${id}-body`} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left text-sm font-semibold bg-primary text-white shadow-menu transition-[filter] hover:brightness-110">
        <span className="flex items-center gap-2"><Boxes className="size-4" aria-hidden="true" />Our Products</span>
        <ChevronDown className={`size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div id={`${id}-body`} role="region" aria-label="Our products, platforms and services" inert={!open} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="p-4">
            <p className="text-xs text-soft">{COUNT} entries: LAX360 products, technology platforms, services and partnership options.</p>
            <label className="relative mt-3 block"><span className="sr-only">Search products and services</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" aria-hidden="true" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="h-11 w-full rounded-lg border border-edge bg-night pl-9 pr-3 text-sm text-fg placeholder:text-soft/70 focus:border-lav focus:outline-none" /></label>
            <p className="mt-2 text-xs text-soft" role="status" aria-live="polite">{term ? `${shown} of ${COUNT} entries match` : `Showing all ${COUNT} entries`}</p>
            {groups.length === 0 ? <p className="mt-3 text-sm text-soft">Nothing matches “{q}”.</p> : (
              <div className="mt-3 space-y-5">
                {groups.map((g) => (
                  <div key={g.title}>
                    <h2 className="mb-1.5 border-b border-edge pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>{g.title}</h2>
                    <ul className="space-y-2">
                      {g.items.map((i) => (
                        <li key={i.name} className="text-sm">
                          {i.to ? <Link to={i.to} className="font-semibold text-fg underline-offset-2 hover:underline">{i.name}</Link> : <span className="font-semibold">{i.name}</span>}
                          {i.tag && <span className="ml-2 rounded-full border border-edge px-2 py-0.5 text-[0.6875rem] font-semibold text-soft">{i.tag}</span>}
                          {i.desc && <span className="block text-soft">{i.desc}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {solutionGroups.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-2 border-b border-edge pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>Software & IT solutions ({solutionGroups.reduce((n, c) => n + c.items.length, 0)})</h2>
                <div className="space-y-2">
                  {solutionGroups.map((c) => (
                    <details key={c.slug} className="rounded-lg border border-edge px-3 py-1 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">{c.name}<span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-lav">{c.items.length}</span></summary>
                      <ul className="space-y-2 pb-3 pt-1">
                        {c.items.filter((i) => !term || `${i.name} ${i.pitch}`.toLowerCase().includes(term)).map((i) => (
                          <li key={i.slug} className="text-sm"><Link to={`/solutions/${i.slug}`} className="font-semibold text-fg underline-offset-2 hover:underline">{i.name}</Link><span className="ml-2 rounded-full border border-edge px-2 py-0.5 text-[0.6875rem] font-semibold text-soft">{statusOf(i.status).label}</span></li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-5 rounded-lg border border-edge p-3 text-xs text-soft">{catalogue.note}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/products" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-white">Browse all LAX360 products</Link>
              <button type="button" onClick={() => setOpenState(false)} className="inline-flex min-h-11 items-center rounded-full border border-edge-strong px-4 text-sm font-semibold hover:bg-glass-strong">Collapse list</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** An "Our Products" button for the page: scrolls to the sidebar list and expands it. */
export function ProductsButton({ accent = 'var(--color-primary)', className = '', label = 'Our Products' }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const go = () => {
    setOpenState(true)
    requestAnimationFrame(() => {
      const el = document.getElementById(PANEL_ID)
      el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      setTimeout(() => el?.querySelector('button')?.focus({ preventScroll: true }), reduce ? 0 : 500)
    })
  }
  return (
    <button type="button" onClick={go} aria-controls={PANEL_ID} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold bg-primary text-white shadow-menu transition-transform hover:-translate-y-0.5 ${className}`}>
      <Boxes className="size-4" aria-hidden="true" />{label}
    </button>
  )
}
