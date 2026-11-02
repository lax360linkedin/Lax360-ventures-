import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'
import DivisionArt from '../art/DivisionArt.jsx'
import { allDivisions } from '../../data/services.js'
import { divisionIcons } from '../../utils/divisionIcons.js'

// Five divisions as a varied bento (not identical cards). Each card is one link to its page.
const layout = {
  software: { span: 'md:col-span-4 md:row-span-2', art: true, icon: 'from-primary to-accent', glow: 'hover:shadow-[0_24px_50px_-20px_rgba(124,58,237,0.7)]' },
  ai: { span: 'md:col-span-2', icon: 'from-accent to-[#e879f9]', glow: 'hover:shadow-[0_24px_50px_-20px_rgba(168,85,247,0.7)]' },
  growth: { span: 'md:col-span-2', icon: 'from-sky to-primary', glow: 'hover:shadow-[0_24px_50px_-20px_rgba(96,165,250,0.55)]' },
  engineering: { span: 'md:col-span-3', icon: 'from-sky to-[#818cf8]', glow: 'hover:shadow-[0_24px_50px_-20px_rgba(96,165,250,0.55)]' },
  training: { span: 'md:col-span-3', icon: 'from-lav to-accent', glow: 'hover:shadow-[0_24px_50px_-20px_rgba(196,181,253,0.45)]' },
}

export default function ServicesBento() {
  return (
    <section aria-labelledby="divisions-title" className="wrap section">
      <SectionHeading id="divisions-title" eyebrow="Divisions" title="Five ways we" gradient="help." bot lead="Pick what you need now — we'll connect the rest." />
      <ul className="mt-12 grid gap-4 md:grid-cols-6">
        {allDivisions.map((d, i) => {
          const cfg = layout[d.slug]
          const Icon = divisionIcons[d.slug]
          return (
            <Reveal as="li" key={d.slug} delay={i * 0.09} className={cfg.span}>
              <Link to={d.to} className={`glass-flat lift shine group flex h-full flex-col p-6 md:p-8 ${cfg.glow}`}>
                <div className="flex items-start justify-between gap-4">
                  <span className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cfg.icon} text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`}>
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <span className="font-display text-sm font-semibold text-lav">{d.number}</span>
                </div>
                <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight transition-colors duration-200 group-hover:text-lav md:text-3xl">{d.name}</h3>
                <p className="mt-2 text-soft">{d.outcome}</p>
                {cfg.art && <DivisionArt id={d.slug} className="mt-6 hidden h-auto w-full max-w-md self-center transition-transform duration-500 group-hover:scale-[1.03] md:block" />}
                <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${d.name} services`}>
                  {d.tags.map((t) => <li key={t} className="tag">{t}</li>)}
                </ul>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-6 font-semibold text-lav">
                  Explore <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          )
        })}
      </ul>
    </section>
  )
}
