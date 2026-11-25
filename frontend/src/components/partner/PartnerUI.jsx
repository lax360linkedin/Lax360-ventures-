import { Link, NavLink } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, Download, LogIn } from 'lucide-react'
import Accordion from '../ui/Accordion.jsx'
import Button from '../ui/Button.jsx'
import Reveal from '../ui/Reveal.jsx'
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
  return (
    <section className="relative isolate overflow-hidden border-b border-edge" style={{ '--pa': accent }}>
      {imageUrl && <img src={imageUrl} alt={imageAlt || ''} loading="eager" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover" />}
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: `radial-gradient(60rem 28rem at 85% -10%, color-mix(in srgb, ${accent} 32%, transparent), transparent 70%), linear-gradient(180deg, color-mix(in srgb, ${accent} 10%, transparent), transparent 75%)` }} />
      <svg aria-hidden="true" className="absolute right-0 top-0 -z-10 hidden h-full w-1/2 opacity-[0.12] md:block" viewBox="0 0 400 400" preserveAspectRatio="xMaxYMid slice"><g fill="none" style={{ stroke: accent }} strokeWidth="1.2">{Array.from({ length: 12 }, (_, i) => <circle key={i} cx="400" cy="0" r={40 + i * 34} />)}</g></svg>
      <div className="wrap py-14 md:py-24">
        <Reveal y={12} className="max-w-4xl">
          <p className="eyebrow mb-5 flex items-center gap-3" style={{ color: accent }}><span aria-hidden="true" className="h-px w-10 bg-current" />{eyebrow}</p>
          <h1 className="h1 !text-[clamp(2.3rem,5vw,4.75rem)]">{title}</h1>
          {lead && <p className="lead mt-6 max-w-3xl text-soft">{lead}</p>}
          {children && <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{children}</div>}
        </Reveal>
      </div>
    </section>
  )
}

/** Partnership type tabs (real links) and, when a division is known, the division switcher beside the content. */
export function PartnerTabs({ category, division }) {
  return (
    <nav aria-label="Partnership types" className="border-b border-edge bg-glass/40">
      <ul className="wrap flex gap-1 overflow-x-auto py-2">
        {CATEGORIES.map((c) => {
          const to = division ? opportunityPath(c.slug, division) : c.path
          const on = c.slug === category
          return <li key={c.slug} className="shrink-0"><NavLink to={to} aria-current={on ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors ${on ? 'bg-primary text-white' : 'text-soft hover:bg-glass-strong hover:text-fg'}`}>{c.label}</NavLink></li>
        })}
      </ul>
    </nav>
  )
}

export function DivisionSwitcher({ category, division }) {
  const items = useDivisionItems(category) // follows the admin-managed menu (built-in divisions plus anything added there)
  const cat = CATEGORIES.find((c) => c.slug === category)
  return (
    <nav aria-label="Business divisions" className="lg:sticky lg:top-40 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto lg:overscroll-contain">
      <p className="eyebrow mb-3 hidden text-soft lg:block">Business division</p>
      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((d) => {
          const on = d.slug === division
          const accent = DIVISIONS.find((x) => x.slug === d.slug)?.accent || cat?.accent || 'var(--color-primary)'
          return (
            <li key={d.slug} className="shrink-0 lg:shrink">
              <Link to={opportunityPath(category, d.slug)} aria-current={on ? 'page' : undefined} className={`flex min-h-11 items-center gap-3 border-l-4 px-4 py-2.5 text-sm font-semibold transition-colors lg:py-3 ${on ? 'bg-glass-strong text-fg' : 'border-transparent text-soft hover:bg-glass hover:text-fg'}`} style={on ? { borderColor: accent } : undefined}>
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: accent }} />{d.label}
              </Link>
            </li>
          )
        })}
      </ul>
      {division === 'it' && category === 'franchise' && <ProductAccordion accent={DIVISIONS.find((x) => x.slug === 'it')?.accent} />}
      {division === 'it' && category === 'authorized-partner' && <ProductAccordion accent={DIVISIONS.find((x) => x.slug === 'it')?.accent} catalogue={ITA_PRODUCTS} />}
      {division === 'it' && category === 'referral-partner' && <ProductAccordion accent={DIVISIONS.find((x) => x.slug === 'it')?.accent} catalogue={ITR_PRODUCTS} />}
      {division === 'education' && <CourseAccordion accent="var(--color-primary)" applyTo={`/partner-with-us/apply?type=${category}&division=education`} applyLabel={{ franchise: 'Apply for an Education Franchise', 'authorized-partner': 'Apply as an Authorized Partner', 'referral-partner': 'Apply as a Referral Partner' }[category] || 'Apply now'} />}
    </nav>
  )
}

/** In-page section links for a long opportunity page. */
export function SectionNav({ items }) {
  return (
    <nav aria-label="On this page" className="sticky top-[72px] z-20 border-b border-edge bg-night/85 backdrop-blur lg:top-[92px]">
      <ul className="wrap flex gap-1 overflow-x-auto py-1.5">
        {items.map((s) => <li key={s.id} className="shrink-0"><a href={`#${s.id}`} className="inline-flex min-h-10 items-center rounded-full px-3 text-[0.8125rem] font-semibold text-soft hover:bg-glass-strong hover:text-fg">{s.label}</a></li>)}
      </ul>
    </nav>
  )
}

/** One content section: alternating tint, an anchored H2, and an optional side column. */
export function Block({ id, eyebrow, title, lead, tint = false, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className={`scroll-mt-40 border-b border-edge ${tint ? 'bg-glass/40' : ''}`}>
      <div className="wrap py-12 md:py-16">
        <SectionHeading id={`${id}-t`} eyebrow={eyebrow} title={title} lead={lead} />
        <div className="mt-8">{children}</div>
      </div>
    </section>
  )
}

export function Checklist({ items, accent = 'var(--color-primary)', cols = false }) {
  return (
    <ul className={`grid gap-x-10 gap-y-3 ${cols ? 'md:grid-cols-2' : ''}`}>
      {items.map((t) => <li key={t} className="flex gap-3 leading-relaxed"><Check className="mt-1 size-4 shrink-0" style={{ color: accent }} aria-hidden="true" /><span>{t}</span></li>)}
    </ul>
  )
}

export function Steps({ items, accent = 'var(--color-primary)' }) {
  return (
    <ol className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
      {items.map((t, i) => (
        <li key={t} className="bg-night p-5">
          <span className="font-display text-3xl font-semibold tabular-nums" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
          <p className="mt-2 font-semibold leading-snug">{t}</p>
        </li>
      ))}
    </ol>
  )
}

export function Facts({ rows }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2">
      {rows.map(([k, v]) => <div key={k} className="bg-night p-5"><dt className="text-sm font-semibold uppercase tracking-wide text-soft">{k}</dt><dd className="mt-1.5 leading-relaxed">{v}</dd></div>)}
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
      <dl className="divide-y divide-edge rounded-xl border border-edge">
        {keys.map((k) => (
          <div key={k} className="grid gap-1 p-4 sm:grid-cols-3 sm:gap-6">
            <dt className="font-semibold">{commercialLabel(k)}</dt>
            <dd className="text-soft sm:col-span-2">{published[k] || commercialFallback(category, k)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-soft">{category === 'franchise' ? 'Commercial terms are not finalised. They are discussed during the franchise evaluation and are subject to the approved franchise agreement.' : 'Final terms are set out in the partner agreement.'}</p>
    </>
  )
}

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-edge" tabIndex={0} role="region" aria-label="Partnership comparison table, scrolls sideways on small screens">
      <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
        <caption className="sr-only">Comparison of the franchise, authorized partner and referral partner programs</caption>
        <thead><tr className="bg-glass-strong"><th scope="col" className="sticky left-0 z-10 bg-glass-strong px-4 py-3 font-semibold">&nbsp;</th>{COMPARISON.heads.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-edge">
          {COMPARISON.rows.map(([label, ...cells]) => <tr key={label}><th scope="row" className="sticky left-0 bg-night px-4 py-3 font-semibold">{label}</th>{cells.map((c, i) => <td key={i} className="px-4 py-3 align-top text-soft">{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}

/** The calls to action that only appear when they can really work (a brochure that exists, a portal that is configured). */
export function Cta({ applyTo = '/partner-with-us/apply', brochureUrl, portalUrl, consultTo = '/contact?type=partnership', className = '' }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${className}`}>
      <Button to={applyTo} arrow>Become a Partner</Button>
      <Button to={consultTo} variant="secondary">Request a Consultation</Button>
      {brochureUrl && <Button href={brochureUrl} variant="secondary" target="_blank" rel="noopener noreferrer"><Download className="size-4" aria-hidden="true" />Download Partnership Brochure</Button>}
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
