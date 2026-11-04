import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import { allDivisions } from '../../data/services.js'
import { divisionIcons } from '../../utils/divisionIcons.js'

// One photo per major service (free-licence Unsplash images, see public/assets/services/CREDITS.md).
const PHOTO = {
  software: '/assets/services/software.webp',
  ai: '/assets/services/ai.webp',
  growth: '/assets/services/marketing.webp',
  engineering: '/assets/services/mechanical.webp',
}

/** Home "Our Services": heading, short introduction and a card per major service (photo, icon, short description), then a button to the Services page. */
export default function OurServices() {
  return (
    <section aria-labelledby="our-services-title" className="wrap section">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeading
          id="our-services-title"
          eyebrow="What we do"
          title="Our"
          gradient="Services"
          bot
          lead="Software, AI, digital growth and CAD engineering from one accountable team — planned, built and supported around how your business works."
        />
        <Reveal delay={0.1} className="shrink-0"><Button to="/services" arrow>View All Services</Button></Reveal>
      </div>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {allDivisions.map((d, i) => {
          const Icon = divisionIcons[d.slug]
          return (
            <Reveal as="li" key={d.slug} delay={i * 0.07}>
              <Link to={d.to} className="glass-flat lift group flex h-full flex-col overflow-hidden">
                <span className="relative block">
                  <img src={PHOTO[d.slug]} alt="" width="1000" height="800" loading="lazy" decoding="async" className="aspect-[16/8] w-full object-cover sm:aspect-[16/10] transition-transform duration-500 group-hover:scale-[1.04]" />
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b0714]/70 to-transparent" />
                  <span className="absolute bottom-3 left-4 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                </span>
                <span className="flex flex-1 flex-col gap-2 p-5">
                  <span className="font-display text-xl font-semibold leading-tight transition-colors group-hover:text-lav">{d.name}</span>
                  <span className="flex-1 text-sm text-soft">{d.short}</span>
                  <span className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-lav">
                    Learn more <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </Reveal>
          )
        })}
      </ul>
    </section>
  )
}
