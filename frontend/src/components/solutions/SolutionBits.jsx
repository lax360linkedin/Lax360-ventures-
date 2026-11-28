import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Reveal from '../ui/Reveal.jsx'
import { CUSTOM_STATEMENT, imgSet, solutionHref, statusOf } from '../../data/solutions.js'

const TONE = {
  green: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', // availability colours carry meaning, so they stay fixed
  sky: 'border-sky/50 bg-sky/10 text-sky',
  violet: 'border-violet/50 bg-violet/10 text-violet',
  amber: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

export function StatusBadge({ status, className = '' }) {
  if (!['under_development', 'coming_soon', 'temporarily_unavailable'].includes(status)) return null // nothing is labelled Custom / Available / Live: only a solution that is not offered yet says so
  const s = statusOf(status)
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide ${TONE[s.tone]} ${className}`}>{s.label}</span>
}

/** Platform filter groups, derived from a solution's platform lines. */
export function platformTags(s) {
  const text = (s.platforms || []).join(' ').toLowerCase()
  const out = []
  if (/windows|desktop/.test(text)) out.push('Desktop')
  if (/browser|web|responsive/.test(text)) out.push('Web')
  if (/android|ios/.test(text)) out.push('Mobile (Android / iOS)')
  if (/rest|api/.test(text)) out.push('API')
  if (/whatsapp|channel|email|chat/.test(text)) out.push('Messaging channels')
  return out
}

/** One solution as a card: illustration (lazy loaded), availability, short text, industries, and the links to its page and its enquiry form. */
export function SolutionCard({ s, categoryName, delay = 0 }) {
  return (
    <Reveal as="li" delay={delay} className="h-full">
      <article className="glass-flat lift group flex h-full flex-col overflow-hidden">
        <Link to={solutionHref(s)} className="relative block overflow-hidden" tabIndex={-1} aria-hidden="true">
          <img {...imgSet(s.image)} sizes="(min-width:1024px) 360px, (min-width:640px) 45vw, 92vw" alt="" width="1600" height="1067" loading="lazy" decoding="async" className="aspect-[3/2] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        </Link>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} />
            {categoryName && <span className="text-xs font-semibold text-soft">{categoryName}</span>}
          </div>
          <h3 className="font-display text-lg font-semibold leading-snug"><Link to={solutionHref(s)} className="transition-colors hover:text-lav focus-visible:text-lav">{s.name}</Link></h3>
          <p className="line-clamp-3 text-soft">{s.pitch}</p>
          {s.industries?.length > 0 && <ul className="flex flex-wrap gap-1.5" aria-label="Industries">{s.industries.slice(0, 3).map((i) => <li key={i} className="rounded-full border border-edge px-2.5 py-0.5 text-xs font-medium text-soft">{i}</li>)}</ul>}
          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 pt-2">
            <Link to={solutionHref(s)} className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold text-lav">View details <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            <Link to={`${solutionHref(s)}#enquire`} className="link-underline inline-flex min-h-11 items-center font-semibold">Enquire now</Link>
          </div>
        </div>
      </article>
    </Reveal>
  )
}

/** "Your Business. Your Requirements. Our Technology." with the four custom-solution buttons. Used on the Software & IT Services page, the Products page and the category pages. */
export function CustomStatement({ id = 'custom-solution', heading, text, className = '' }) {
  const c = CUSTOM_STATEMENT
  return (
    <section aria-labelledby={`${id}-title`} className={`wrap py-12 md:py-16 ${className}`}>
      <Reveal>
        <div className="glass relative overflow-hidden p-8 md:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-0 size-72 rounded-full bg-primary/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 bottom-0 size-72 rounded-full bg-sky/15 blur-3xl" />
          <p className="eyebrow relative text-lav">{heading || 'Tailored to your business'}</p>
          <h2 id={`${id}-title`} className="h2 relative mt-2">{text ? heading : c.title}</h2>
          {text ? <p className="lead relative mt-4 max-w-3xl text-soft">{text}</p> : c.text.map((p) => <p key={p} className="lead relative mt-4 max-w-3xl text-soft">{p}</p>)}
          <p className="relative mt-6 font-display text-xl font-semibold">{c.lead}</p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            {c.buttons.map((b, i) => <Button key={b.label} to={b.to} variant={i === 0 ? 'primary' : 'secondary'} arrow={i === 0}>{b.label}</Button>)}
          </div>
        </div>
      </Reveal>
    </section>
  )
}
