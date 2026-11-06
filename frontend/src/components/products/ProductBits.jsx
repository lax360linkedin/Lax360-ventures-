import { Link } from 'react-router-dom'
import { ArrowRight, Boxes, Calendar, Check, GraduationCap, IdCard, Kanban, Map, Package, Receipt, Server, Stethoscope, Users, Workflow } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'
import { productCategories, productStatuses } from '../../data/products.js'

const STATUS_CLS = {
  live: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  beta: 'border-sky/50 bg-sky/10 text-sky-700 dark:text-sky',
  in_development: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  soon: 'border-edge-strong bg-glass text-soft',
}

// Each product's own mark (used when it has no uploaded logo).
const ICONS = { users: Users, stethoscope: Stethoscope, graduation: GraduationCap, receipt: Receipt, server: Server, map: Map, calendar: Calendar, boxes: Boxes, idcard: IdCard, kanban: Kanban, workflow: Workflow, package: Package }

export const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${STATUS_CLS[status] || STATUS_CLS.soon}`}>
    <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{productStatuses[status] || productStatuses.soon}
  </span>
)

export const CategoryBadge = ({ category }) => (
  <span className="inline-flex items-center rounded-full border border-edge bg-glass px-3 py-1 text-xs font-semibold text-lav">{productCategories[category] || productCategories.other}</span>
)

/** Product mark: the uploaded logo, or a monogram tile with the initials. */
export function ProductMark({ product, className = 'size-14' }) {
  if (product.logo) return <img src={product.logo} alt="" width="112" height="112" loading="lazy" decoding="async" className={`${className} shrink-0 rounded-2xl border border-edge bg-white object-contain p-1.5`} />
  const Icon = ICONS[product.icon] || Package
  return <span aria-hidden="true" className={`${className} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg`}><Icon className="size-1/2" /></span>
}

/** The product's visual: its cover image, else its first screenshot, else a branded gradient tile. */
export function ProductVisual({ product, className = '', eager = false }) {
  const src = product.image || product.screenshots[0]
  if (src) return <img src={src} alt="" width="1000" height="750" loading={eager ? 'eager' : 'lazy'} decoding="async" className={`h-full w-full object-cover ${className}`} />
  return (
    <span aria-hidden="true" className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary to-accent ${className}`}>
      <span className="absolute -right-8 -top-8 size-40 rounded-full bg-white/20 blur-2xl" />
      <Package className="size-16 text-white/90" />
    </span>
  )
}

/** One product card: visual, badges, name, short description, three key features and the Explore Product button. */
export function ProductCard({ product, delay = 0 }) {
  return (
    <Reveal as="li" delay={delay} className="h-full">
      <article className="glass-flat lift group flex h-full flex-col overflow-hidden">
        <Link to={`/products/${product.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] overflow-hidden">
          <ProductVisual product={product} className="transition-transform duration-700 group-hover:scale-[1.06]" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        </Link>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-2"><CategoryBadge category={product.category} /><StatusBadge status={product.status} /></div>
          <div className="flex items-center gap-3">
            <ProductMark product={product} className="size-12" />
            <h3 className="font-display text-2xl font-semibold leading-tight"><Link to={`/products/${product.slug}`} className="transition-colors hover:text-lav">{product.name}</Link></h3>
          </div>
          <p className="text-soft">{product.summary}</p>
          {product.features.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {product.features.slice(0, 3).map((f) => <li key={f.title} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-lav" aria-hidden="true" /><span>{f.title}</span></li>)}
            </ul>
          )}
          <Link to={`/products/${product.slug}`} className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start rounded-full bg-primary px-5 font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--btn-hover)]">
            Explore Product <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </Reveal>
  )
}
