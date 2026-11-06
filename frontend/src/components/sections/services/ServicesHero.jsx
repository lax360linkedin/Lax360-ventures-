import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import BotHighlight from '../../ui/BotHighlight.jsx'
import Button from '../../ui/Button.jsx'
import { allDivisions } from '../../../data/services.js'
import { divisionIcons } from '../../../utils/divisionIcons.js'
import { scrollToSection } from './CategoryNav.jsx'

const EASE = [0.2, 0.8, 0.2, 1]
const photo = (src, className, alt = '') => (
  <img src={src} alt={alt} width="1000" height="800" decoding="async" fetchPriority="high" className={`h-full w-full object-cover ${className}`} />
)

/**
 * Services hero: headline, lead and two buttons on the left; a mosaic of three real photographs on the right that drift at different speeds as the
 * page scrolls, with a glass card listing the six categories (each links to its section). Uses the page theme (light or graphite).
 */
export default function ServicesHero() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const up = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -50])
  const down = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40])
  const rise = (delay) => (reduce ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } })
  return (
    <section ref={ref} aria-labelledby="services-title" className="relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night">
      <div aria-hidden="true" className="absolute -left-32 top-8 -z-10 size-[26rem] rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-24 top-0 -z-10 size-[28rem] rounded-full bg-sky/15 blur-3xl" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(rgb(var(--glow)/0.28)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_75%_35%,#000,transparent_62%)]" />

      <div className="wrap grid items-center gap-12 pb-16 pt-10 md:pt-14 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-16">
        <div className="lg:col-span-6">
          <m.nav {...rise(0.05)} aria-label="Breadcrumb" className="text-sm text-soft">
            <ol className="flex items-center gap-2">
              <li><Link to="/" className="transition-colors hover:text-lav">Home</Link></li>
              <li aria-hidden="true" className="text-lav">›</li>
              <li aria-current="page" className="font-semibold text-fg">Services</li>
            </ol>
          </m.nav>
          <m.p {...rise(0.12)} className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-edge-strong bg-glass px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lav backdrop-blur-md">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgb(var(--glow2)/0.6)]" />Our services
          </m.p>
          <m.h1 {...rise(0.2)} id="services-title" className="h1 mt-5 !text-[clamp(2.4rem,5vw,4.5rem)]">
            Technology and Digital Capabilities, <BotHighlight delay={0.9}><span className="text-gradient">Under One Roof.</span></BotHighlight>
          </m.h1>
          <m.p {...rise(0.3)} className="lead mt-7 max-w-xl text-soft">
            From custom software and AI to digital marketing, backend APIs, workflow automation and mobile apps, LAX360 brings six areas of expertise together to turn your requirements into practical solutions.
          </m.p>
          <m.div {...rise(0.4)} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/contact?type=project" arrow>Start a Project</Button>
            <Button href="#software" variant="secondary" onClick={(e) => { e.preventDefault(); scrollToSection('software') }}>
              Explore Services <ArrowDown className="size-4" aria-hidden="true" />
            </Button>
          </m.div>
        </div>

        <m.div {...rise(0.3)} className="lg:col-span-6">
          <div className="relative mx-auto grid max-w-md grid-cols-5 gap-3 sm:max-w-xl sm:gap-4">
            <m.div style={{ y: up }} className="col-span-3 row-span-2 overflow-hidden rounded-[2rem] border border-edge-strong shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]">{photo('/assets/services/hero-dev.webp', 'aspect-[4/5]')}</m.div>
            <m.div style={{ y: down }} className="col-span-2 overflow-hidden rounded-3xl border border-edge-strong">{photo('/assets/services/mobile.webp', 'aspect-square')}</m.div>
            <m.div style={{ y: down }} className="col-span-2 overflow-hidden rounded-3xl border border-edge-strong">{photo('/assets/services/automation.webp', 'aspect-square')}</m.div>
            <ul aria-label="Six service categories" className="glass absolute -bottom-6 left-0 right-0 z-10 mx-2 grid grid-cols-6 gap-1 p-2 sm:mx-6">
              {allDivisions.map((d) => {
                const Icon = divisionIcons[d.slug]
                return (
                  <li key={d.slug}>
                    <a href={`#${d.slug}`} onClick={(e) => { e.preventDefault(); scrollToSection(d.slug) }} title={d.name} aria-label={d.name}
                      className="flex aspect-square items-center justify-center rounded-xl text-lav transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary hover:text-white focus-visible:bg-primary focus-visible:text-white">
                      <Icon className="size-5" aria-hidden="true" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </m.div>
      </div>
    </section>
  )
}
