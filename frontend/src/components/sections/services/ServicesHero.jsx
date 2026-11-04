import { Bot, Check, Code2, DraftingCompass, Globe2, GraduationCap, MessagesSquare, Smartphone, TrendingUp } from 'lucide-react'
import Button from '../../ui/Button.jsx'
import BotHighlight from '../../ui/BotHighlight.jsx'
import { scrollToSection } from './CategoryNav.jsx'

const rings = [
  { size: 38, dur: 48, rev: false, items: [{ Icon: Bot, deg: 30 }, { Icon: Code2, deg: 210 }] },
  { size: 66, dur: 72, rev: true, items: [{ Icon: Globe2, deg: 50 }, { Icon: Smartphone, deg: 170 }, { Icon: TrendingUp, deg: 290 }] },
  { size: 94, dur: 100, rev: false, items: [{ Icon: DraftingCompass, deg: 10 }, { Icon: GraduationCap, deg: 130 }, { Icon: MessagesSquare, deg: 250 }] },
]

const points = [
  'Every project starts with discovery — we listen before we build.',
  'Work moves in small steps, with feedback along the way.',
  'Technology consulting is the first step of every engagement.',
]

/** Decorative orbit: the service icons circle a glass "360°" core on three rings. Icons stay upright. */
function Orbit() {
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-[34rem]">
      <div className="absolute inset-[8%] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.35), transparent)' }} />
      {rings.map((r) => (
        <div
          key={r.size}
          className={`anim-orbit absolute left-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-edge ${r.rev ? '[animation-direction:reverse]' : ''}`}
          style={{ width: `${r.size}%`, '--dur': `${r.dur}s` }}
        >
          {r.items.map(({ Icon, deg }) => {
            const rad = (deg * Math.PI) / 180
            return (
              <span
                key={deg}
                className={`anim-orbit-rev glass absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center !rounded-full text-lav md:size-14 ${r.rev ? '[animation-direction:reverse]' : ''}`}
                style={{ left: `${50 + 50 * Math.cos(rad)}%`, top: `${50 + 50 * Math.sin(rad)}%`, '--dur': `${r.dur}s` }}
              >
                <Icon className="size-5 md:size-6" />
              </span>
            )
          })}
        </div>
      ))}
      <div className="anim-float glass absolute left-1/2 top-1/2 flex aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center !rounded-full bg-gradient-to-br from-primary to-accent">
        <span className="font-display text-2xl font-semibold leading-none text-white md:text-4xl">360°</span>
        <span className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.2em] text-lav md:text-[0.65rem]">Execution</span>
      </div>
    </div>
  )
}

/** Services hero: headline, honest process points, CTAs and the orbit. Entrance is CSS-staggered. */
export default function ServicesHero() {
  return (
    <section className="relative overflow-hidden border-b border-edge" aria-labelledby="services-title">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-0 size-[36rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.3), transparent)' }} />
      <div className="wrap relative grid items-center gap-12 pb-10 pt-6 md:pb-16 md:pt-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <p className="a-rise glass-flat inline-flex items-center gap-2.5 !rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lav" style={{ '--d': '0.2s' }}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(168,85,247,0.8)]" />
            Services
          </p>
          <h1 id="services-title" className="h1 mt-6 !text-[clamp(2.6rem,5.4vw,5.5rem)]">
            <span className="a-rise block" style={{ '--d': '0.3s' }}>Practical technology,</span>
            <span className="a-rise block" style={{ '--d': '0.42s' }}><BotHighlight delay={1.6}><span className="text-gradient">built around how</span></BotHighlight></span>
            <span className="a-rise block" style={{ '--d': '0.54s' }}>you work.</span>
          </h1>
          <p className="a-rise lead mt-7 text-soft" style={{ '--d': '0.75s' }}>
            Software, AI automation, websites and mobile apps, digital marketing, CAD engineering and training — planned, built and supported by one team.
          </p>
          <ul className="mt-7 space-y-3">
            {points.map((p, i) => (
              <li key={p} className="a-rise flex items-start gap-3 text-base text-fg" style={{ '--d': `${0.9 + i * 0.1}s` }}>
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/30 text-lav"><Check className="size-3.5" aria-hidden="true" /></span>
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <div className="a-rise" style={{ '--d': '1.25s' }}><Button to="/contact?type=project" arrow className="w-full sm:w-auto">Discuss Your Project</Button></div>
            <div className="a-rise" style={{ '--d': '1.35s' }}><Button href="#software" variant="secondary" className="w-full sm:w-auto" onClick={(e) => { e.preventDefault(); scrollToSection('software') }}>Explore our services</Button></div>
          </div>
        </div>
        <div className="a-fade lg:col-span-5" style={{ '--d': '0.6s' }}>
          <Orbit />
        </div>
      </div>
    </section>
  )
}
