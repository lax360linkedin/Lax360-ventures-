import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Briefcase, Building2, Car, Dumbbell, Factory, GraduationCap, Hotel, Landmark, Megaphone, Plane, Scale, ShieldCheck, ShoppingBag, Signal, Sprout, Stethoscope, Truck, Utensils, Zap, HardHat } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'

export const ICONS = {
  stethoscope: Stethoscope, shopping: ShoppingBag, graduation: GraduationCap, factory: Factory, bank: Landmark, building: Building2, truck: Truck, hotel: Hotel, megaphone: Megaphone,
  hardhat: HardHat, car: Car, briefcase: Briefcase, sprout: Sprout, shield: ShieldCheck, scale: Scale, utensils: Utensils, dumbbell: Dumbbell, plane: Plane, signal: Signal, zap: Zap,
}

export const IndustryIcon = ({ name, className = 'size-5' }) => {
  const Icon = ICONS[name] || Briefcase
  return <Icon className={className} aria-hidden="true" />
}

/** One industry card: photo, icon, name, summary, the first three solutions and a link to its page. */
export function IndustryCard({ ind, delay = 0 }) {
  return (
    <Reveal as="li" delay={delay} className="h-full">
      <article className="glass-flat lift group flex h-full flex-col overflow-hidden">
        <Link to={`/industries/${ind.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] overflow-hidden">
          <img src={ind.image} alt="" width="1000" height="625" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <span className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md"><IndustryIcon name={ind.icon} /></span>
        </Link>
        <div className="flex flex-1 flex-col gap-3 p-6">
          <h3 className="font-display text-xl font-semibold leading-tight"><Link to={`/industries/${ind.slug}`} className="transition-colors hover:text-lav">{ind.name}</Link></h3>
          <p className="text-soft">{ind.summary}</p>
          {ind.solutions.length > 0 && <ul className="flex flex-wrap gap-1.5" aria-label="Solutions">{ind.solutions.slice(0, 3).map((s) => <li key={s} className="rounded-full border border-edge bg-glass px-2.5 py-1 text-xs font-semibold text-lav">{s}</li>)}</ul>}
          <Link to={`/industries/${ind.slug}`} className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-lav">Explore industry <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>
        </div>
      </article>
    </Reveal>
  )
}

/** A problem on the left, the technology answer on the right: used on the listing and on every industry page. */
export function PairCard({ pair, delay = 0, to }) {
  const inner = (
    <div className="glass-flat lift group grid h-full items-stretch gap-0 overflow-hidden sm:grid-cols-[1fr_auto_1fr]">
      <div className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-soft">Today</p><p className="mt-1 font-display text-lg font-semibold leading-snug">{pair.problem}</p></div>
      <div className="flex items-center justify-center bg-gradient-to-br from-primary to-accent px-3 py-2 text-white sm:py-0"><ArrowRight className="size-5 rotate-90 sm:rotate-0" aria-hidden="true" /></div>
      <div className="bg-primary/10 p-5"><p className="text-xs font-bold uppercase tracking-wider text-lav">With technology</p><p className="mt-1 font-display text-lg font-semibold leading-snug">{pair.solution}</p>{to && <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-lav">{pair.industry}<ArrowUpRight className="size-4" aria-hidden="true" /></span>}</div>
    </div>
  )
  return <Reveal as="li" delay={delay}>{to ? <Link to={to} className="block h-full">{inner}</Link> : inner}</Reveal>
}
