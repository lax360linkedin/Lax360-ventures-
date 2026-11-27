import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { UpcomingSidebar } from '../upcoming/UpcomingPartner.jsx'
import { ArrowRight, BadgeCheck, Building2, Check, ChevronRight, Code2, Download, GraduationCap, Handshake, Layers, LogIn, Megaphone, Share2 } from 'lucide-react'
import Accordion from '../ui/Accordion.jsx'
import Button from '../ui/Button.jsx'
import Reveal from '../ui/Reveal.jsx'
import { useH1Override } from '../../hooks/useSite.js'
import SectionHeading from '../ui/SectionHeading.jsx'
import { CourseAccordion } from './CourseCatalogue.jsx'
import { ProductAccordion } from './ProductCatalogue.jsx'
import { ITA_PRODUCTS } from '../../data/itAuthorized.js'
import { ITR_PRODUCTS } from '../../data/itReferral.js'
import { CATEGORIES, COMPARISON, DIVISIONS, commercialFallback, commercialLabel, opportunityPath } from '../../data/partnership.js'
import { useDivisionItems } from '../../services/partnershipService.js'

/** Visible breadcrumb trail (its structured-data twin is generated from the page path). */
export function Crumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="wrap pt-6 text-sm text-soft">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 opacity-60" aria-hidden="true" />}
            {it.to && i < items.length - 1 ? <Link to={it.to} className="link-underline hover:text-fg">{it.label}</Link> : <span aria-current={i === items.length - 1 ? 'page' : undefined} className="text-fg">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Full-width editorial hero. The background is a typographic gradient; an administrator can add a real photograph (it is then shown beneath a readable overlay). */
export function PartnerHero({ eyebrow, title, lead, accent = 'var(--color-primary)', imageUrl, imageAlt, children }) {
  const h1 = useH1Override()
  return (
    <section className="relative isolate overflow-hidden border-b border-edge" style={{ '--pa': accent }}>
      {imageUrl && <img src={imageUrl} alt={imageAlt || ''} loading="eager" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover" />}
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: `radial-gradient(60rem 28rem at 85% -10%, color-mix(in srgb, ${accent} 32%, transparent), transparent 70%), linear-gradient(180deg, color-mix(in srgb, ${accent} 10%, transparent), transparent 75%)` }} />
      <svg aria-hidden="true" className="absolute right-0 top-0 -z-10 hidden h-full w-1/2 opacity-[0.12] md:block" viewBox="0 0 400 400" preserveAspectRatio="xMaxYMid slice"><g fill="none" style={{ stroke: accent }} strokeWidth="1.2">{Array.from({ length: 12 }, (_, i) => <circle key={i} cx="400" cy="0" r={40 + i * 34} />)}</g></svg>
      <div className="wrap py-14 md:py-24">
        <Reveal y={12} className="max-w-4xl">
          <p className="eyebrow mb-5 flex items-center gap-3" style={{ color: accent }}><span aria-hidden="true" className="h-px w-10 bg-current" />{eyebrow}</p>
          <h1 className="h1 !text-[clamp(2.3rem,5vw,4.75rem)]">{h1 || title}</h1>
          {lead && <p className="lead mt-6 max-w-3xl text-soft">{lead}</p>}
          {children && <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{children}</div>}
        </Reveal>
      </div>
    </section>
  )
}

const CAT_ICON = { franchise: Building2, 'authorized-partner': BadgeCheck, 'referral-partner': Share2 }
const DIV_ICON = { education: GraduationCap, 'digital-marketing': Megaphone, it: Code2 }

/** Partnership type tabs (real links): a segmented control with the active program highlighted. */
export function PartnerTabs({ category, division }) {
  return (
    <nav aria-label="Partnership types" className="border-b border-edge bg-glass/40">
      <ul className="wrap no-scrollbar flex gap-1.5 overflow-x-auto py-3">
        {CATEGORIES.map((c) => {
          const to = division ? opportunityPath(c.slug, division) : c.path
          const on = c.slug === category
          const Icon = CAT_ICON[c.slug] || Handshake
          return (
            <li key={c.slug} className="shrink-0">
              <NavLink to={to} aria-current={on ? 'page' : undefined} className={`group inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-200 ${on ? 'border-transparent bg-gradient-to-r from-primary to-accent text-white shadow-menu' : 'border-edge bg-glass text-soft hover:-translate-y-px hover:border-edge-strong hover:text-fg'}`}>
                <Icon className="size-4" aria-hidden="true" />{c.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** The business-division sidebar: chips on small screens, a vertical rail with an active marker from large laptops up. The course and product lists expand beneath it. */
export function DivisionSwitcher({ category, division }) {
  const items = useDivisionItems(category) // follows the admin-managed menu (built-in divisions plus anything added there)
  const cat = CATEGORIES.find((c) => c.slug === category)
  return (
    <nav aria-label="Business divisions" className="lg:sticky lg:top-40 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto lg:overscroll-contain">
      <p className="eyebrow mb-3 hidden items-center gap-2 text-soft lg:flex"><span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />Business division</p>
      <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:border-l lg:border-edge lg:pb-0">
        {items.map((d) => {
          const on = d.slug === division
          const accent = DIVISIONS.find((x) => x.slug === d.slug)?.accent || cat?.accent || 'var(--color-primary)'
          const Icon = DIV_ICON[d.slug] || Layers
          return (
            <li key={d.slug} className="shrink-0 lg:shrink">
              <Link to={opportunityPath(category, d.slug)} aria-current={on ? 'page' : undefined}
                className={`group relative flex min-h-11 items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 lg:-ml-px lg:rounded-none lg:rounded-r-xl lg:border-0 lg:border-l-[3px] lg:py-3 ${on ? 'border-transparent bg-gradient-to-r from-primary/20 to-transparent text-fg' : 'border-edge text-soft hover:text-fg lg:border-transparent lg:hover:translate-x-1 lg:hover:bg-glass'}`}
                style={on ? { borderLeftColor: accent } : undefined}>
                <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${on ? 'bg-primary text-white' : 'bg-glass-strong text-soft group-hover:text-fg'}`}><Icon className="size-4" /></span>
                <span className="flex-1">{d.label}</span>
                <ChevronRight className={`hidden size-4 transition-all lg:block ${on ? 'opacity-100' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60'}`} aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
      {division === 'it' && category === 'franchise' && <ProductAccordion accent={DIVISIONS.find((x) => x.slug === 'it')?.accent} />}
      {division === 'it' && category === 'authorized-partner' && <ProductAccordion accent={DIVISIONS.find((x) => x.slug === 'it')?.accent} catalogue={ITA_PRODUCTS} program="authorized-partner" />}
      {division === 'it' && category === 'referral-partner' && <ProductAccordion accent={DIVISIONS.find((x) => x.slug === 'it')?.accent} catalogue={ITR_PRODUCTS} program="referral-partner" />}
      {division === 'education' && <CourseAccordion accent="var(--color-primary)" applyTo={`/partner-with-us/apply?type=${category}&division=education`} applyLabel={{ franchise: 'Apply for an Education Franchise', 'authorized-partner': 'Apply as an Authorized Partner', 'referral-partner': 'Apply as a Referral Partner' }[category] || 'Apply now'} />}
      <UpcomingSidebar category={category} />
    </nav>
  )
}

/** In-page section links for a long opportunity page. The section being read is highlighted. */
export function SectionNav({ items }) {
  const [active, setActive] = useState(null)
  useEffect(() => {
    const els = items.map((s) => document.getElementById(s.id)).filter(Boolean)
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-35% 0px -55% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [items])
  useEffect(() => { document.querySelector('[data-sec-link][aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' }) }, [active])
  return (
    <nav aria-label="On this page" className="sticky top-[72px] z-20 border-b border-edge bg-night/85 backdrop-blur-xl lg:top-[92px]">
      <ul className="wrap no-scrollbar flex gap-1 overflow-x-auto py-2">
        {items.map((s) => {
          const on = active === s.id
          return <li key={s.id} className="shrink-0"><a href={`#${s.id}`} data-sec-link aria-current={on ? 'true' : undefined} className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors duration-200 ${on ? 'bg-primary text-white' : 'text-soft hover:bg-glass-strong hover:text-fg'}`}>{s.label}</a></li>
        })}
      </ul>
    </nav>
  )
}

/** One content section: an anchored H2 with an accent rail, optional alternating tint. */
export function Block({ id, eyebrow, title, lead, tint = false, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className={`scroll-mt-40 border-b border-edge ${tint ? 'bg-glass/40' : ''}`}>
      <div className="wrap py-14 md:py-20">
        <div className="relative pl-5 md:pl-6">
          <span aria-hidden="true" className="absolute inset-y-1 left-0 w-1 rounded-full bg-gradient-to-b from-primary to-accent" />
          <SectionHeading id={`${id}-t`} eyebrow={eyebrow} title={title} lead={lead} />
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  )
}

export function Checklist({ items, accent = 'var(--color-primary)', cols = false }) {
  return (
    <ul className={`grid gap-x-10 gap-y-3.5 ${cols ? 'md:grid-cols-2' : ''}`}>
      {items.map((t) => (
        <li key={t} className="flex gap-3 leading-relaxed">
          <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}><Check className="size-3" strokeWidth={3} /></span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

/** Process steps as a vertical timeline: numbered milestones joined by a rail. Items are text, or [title, description] pairs. */
export function Steps({ items, accent = 'var(--color-primary)' }) {
  return (
    <ol className="lg:columns-2 lg:gap-x-14">
      {items.map((it, i) => {
        const [t, d] = Array.isArray(it) ? it : [it, '']
        return (
          <li key={t} className="relative break-inside-avoid pb-8 pl-14">
            <span aria-hidden="true" className="absolute left-0 top-0 grid size-10 place-items-center rounded-full border-2 bg-night font-display text-sm font-bold tabular-nums" style={{ borderColor: accent, color: accent }}>{String(i + 1).padStart(2, '0')}</span>
            <span aria-hidden="true" className="absolute bottom-0 left-5 top-11 w-px bg-gradient-to-b from-edge-strong to-transparent" />
            <p className="pt-1.5 font-display text-lg font-semibold leading-snug">{t}</p>
            {d && <p className="mt-1 text-soft">{d}</p>}
          </li>
        )
      })}
    </ol>
  )
}

/** A two-column specification table (label, value) for commercial terms, models and resources. Stacks on phones. */
export function Facts({ rows }) {
  return (
    <dl className="overflow-hidden rounded-2xl border border-edge-strong bg-glass/50">
      {rows.map(([k, v], i) => (
        <div key={k} className={`grid gap-1 px-5 py-4 transition-colors hover:bg-glass sm:grid-cols-[minmax(11rem,16rem)_1fr] sm:gap-8 ${i % 2 ? 'bg-glass/40' : ''} ${i ? 'border-t border-edge' : ''}`}>
          <dt className="flex items-start gap-2.5 text-sm font-bold uppercase tracking-wide text-soft"><span aria-hidden="true" className="mt-1 h-3.5 w-1 shrink-0 rounded-full bg-primary" />{k}</dt>
          <dd className="leading-relaxed">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Faqs({ items }) {
  if (!items?.length) return null
  return <Accordion items={items.map((f) => ({ q: f.q, question: f.q, a: f.a, answer: f.a, title: f.q, content: f.a }))} />
}

/** Commercial terms. A value shows only when management has published it; everything else reads "on consultation" (never an invented number). */
export function Commercial({ category, keys, published = {} }) {
  return (
    <>
      <Facts rows={keys.map((k) => [commercialLabel(k), published[k] || commercialFallback(category, k)])} />
      <p className="mt-4 text-sm text-soft">{category === 'franchise' ? 'Commercial terms are not finalised. They are discussed during the franchise evaluation and are subject to the approved franchise agreement.' : 'Final terms are set out in the partner agreement.'}</p>
    </>
  )
}

/** The comparison of the three programs. A real table from tablets up (sticky first column); on phones each row becomes a labelled list, so nothing scrolls sideways. */
export function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-edge-strong">
      <div className="md:overflow-x-auto" tabIndex={0} role="region" aria-label="Partnership comparison table">
        <table className="w-full border-collapse text-left text-sm md:min-w-[46rem]">
          <caption className="sr-only">Comparison of the franchise, authorized partner and referral partner programs</caption>
          <thead className="max-md:hidden">
            <tr className="bg-gradient-to-r from-primary to-accent text-white">
              <th scope="col" className="sticky left-0 z-10 bg-primary px-5 py-4 text-xs font-bold uppercase tracking-wider">Compare</th>
              {COMPARISON.heads.map((h) => <th key={h} scope="col" className="px-5 py-4 font-display text-base font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody className="max-md:block">
            {COMPARISON.rows.map(([label, ...cells], r) => (
              <tr key={label} className={`transition-colors hover:bg-glass-strong max-md:block max-md:border-t max-md:border-edge max-md:p-4 ${r % 2 ? 'bg-glass/50' : 'bg-glass/20'} ${r ? 'md:border-t md:border-edge' : ''}`}>
                <th scope="row" className="px-5 py-4 text-left font-semibold md:sticky md:left-0 md:min-w-40 md:bg-night max-md:block max-md:px-0 max-md:pb-2 max-md:text-base"><span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-4 w-1 rounded-full bg-primary" />{label}</span></th>
                {cells.map((c, i) => (
                  <td key={i} data-label={COMPARISON.heads[i]} className="px-5 py-4 align-top text-soft max-md:grid max-md:grid-cols-[6.5rem_1fr] max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:font-semibold max-md:before:text-fg max-md:before:content-[attr(data-label)]">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** The calls to action that only appear when they can really work (a brochure that exists, a portal that is configured). */
export function Cta({ applyTo = '/partner-with-us/apply', brochureUrl, portalUrl, consultTo = '/contact?type=partnership', className = '' }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${className}`}>
      <Button to={applyTo} arrow>Become a Partner</Button>
      <Button to={consultTo} variant="secondary">Request a Consultation</Button>
      {brochureUrl && <Button href={brochureUrl} variant="secondary" target="_blank" rel="noopener noreferrer" data-download="pdf"><Download className="size-4" aria-hidden="true" />Download Partnership Brochure</Button>}
      {portalUrl && <Button href={portalUrl} variant="secondary" target="_blank" rel="noopener noreferrer"><LogIn className="size-4" aria-hidden="true" />Partner Login</Button>}
    </div>
  )
}

/** Sticky "Apply now" bar: bottom on phones (it never covers content: the page keeps matching bottom padding), a floating pill on desktop. */
export function StickyApply({ to, label = 'Apply now' }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 flex justify-end px-4 lg:bottom-6 lg:px-8">
      <Link to={to} className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-menu transition-transform hover:-translate-y-0.5">{label}<ArrowRight className="size-4" aria-hidden="true" /></Link>
    </div>
  )
}
