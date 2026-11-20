import { Compass, Eye, Handshake, Sparkles, Target, TrendingUp } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import { useAboutBlocks } from '../cms/AboutBlocks.jsx'

// The same statements as the About page (its "Mission & vision" panels); text published under Admin > About Us content replaces them here as well.
const VISION = 'To grow as a trusted technology and digital solutions company that brings software, AI, marketing and training together, helping businesses adapt, innovate and progress.'
const MISSION = 'To deliver practical, purpose-driven technology by understanding each business, applying the right expertise, and focusing on quality and continuous improvement.'

/** One statement card: icon, small label, a short headline, the statement, and the three ideas behind it. */
function Card({ icon: Icon, label, headline, text, points, delay }) {
  return (
    <Reveal delay={delay} className="h-full">
      <article className="glass-flat lift group relative flex h-full flex-col overflow-hidden p-5 md:p-7">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-accent" />
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-[0_10px_28px_-12px_rgb(var(--glow)/0.9)] transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3">
            <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <p className="eyebrow text-lav">{label}</p>
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold leading-tight md:text-2xl">{headline}</h3>
        <p className="mt-3 text-sm leading-relaxed text-soft md:text-base">{text}</p>
        <ul className="mt-4 flex flex-wrap gap-2 border-t border-edge pt-4" aria-label={`${label}: key ideas`}>
          {points.map(({ icon: P, text: t }) => (
            <li key={t} className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-glass px-3 py-1 text-xs font-medium sm:text-sm"><P className="size-3.5 text-lav" strokeWidth={1.75} aria-hidden="true" />{t}</li>
          ))}
        </ul>
      </article>
    </Reveal>
  )
}

/** Home "Our Vision" and "Our Mission": two short, side-by-side statements directly above Our Services (hide or move it under Website content > Home page sections). */
export default function VisionMission() {
  const blocks = useAboutBlocks()
  const vision = blocks.vision[0]?.data.text || VISION
  const mission = blocks.mission[0]?.data.text || MISSION
  return (
    <section aria-labelledby="purpose-title" className="wrap section">
      <SectionHeading id="purpose-title" eyebrow="Why we exist" title="Our Vision &" gradient="Our Mission" center />
      <div className="mt-8 grid gap-5 md:mt-10 md:grid-cols-2 md:gap-6">
        <Card icon={Eye} label="Our Vision" headline="One trusted team for every step of your technology journey." text={vision} delay={0}
          points={[{ icon: Compass, text: 'Trusted' }, { icon: Sparkles, text: 'Innovative' }, { icon: TrendingUp, text: 'Progress-focused' }]} />
        <Card icon={Target} label="Our Mission" headline="Practical solutions, built with purpose and care." text={mission} delay={0.1}
          points={[{ icon: Handshake, text: 'Understand first' }, { icon: Target, text: 'Right expertise' }, { icon: TrendingUp, text: 'Keep improving' }]} />
      </div>
    </section>
  )
}
