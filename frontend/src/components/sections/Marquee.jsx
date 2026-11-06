import { Bot, Code2, GraduationCap, Smartphone, TrendingUp, Workflow, Boxes, Globe2, PenTool, Cpu, BookOpen } from 'lucide-react'

// Capability labels only — no partner or customer logos, no partnership claims.
const rowA = [
  { icon: Bot, label: 'AI Assistants' },
  { icon: Workflow, label: 'Business Automation' },
  { icon: Code2, label: 'Custom Software' },
  { icon: Boxes, label: 'CRM & ERP' },
  { icon: Globe2, label: 'Web Development' },
  { icon: Smartphone, label: 'Mobile Applications' },
]
const rowB = [
  { icon: TrendingUp, label: 'Digital Marketing' },
  { icon: PenTool, label: '2D & 3D Modelling' },
  { icon: Cpu, label: 'Prompt Engineering' },
  { icon: GraduationCap, label: 'College Workshops' },
  { icon: BookOpen, label: 'Python with AI' },
]

function Row({ items, reverse, label }) {
  const list = (dup) => (
    <ul className={`flex shrink-0 items-center gap-3 pr-3 ${dup ? 'marquee-dup' : ''}`} aria-hidden={dup || undefined} aria-label={dup ? undefined : label}>
      {items.map(({ icon: Icon, label: l }) => (
        <li key={l} className="glass-flat inline-flex items-center gap-2.5 !rounded-full px-5 py-2.5 text-base font-medium whitespace-nowrap">
          <Icon className="size-4 text-lav" aria-hidden="true" /> {l}
        </li>
      ))}
    </ul>
  )
  return (
    <div className="marquee overflow-hidden" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' }}>
      <div className={`marquee-track ${reverse ? 'reverse' : ''}`}>
        {list(false)}
        {list(true)}
      </div>
    </div>
  )
}

/** Two opposing capability marquees. Seamless loop (50% translate), pauses on hover/focus, static under reduced motion. */
export default function Marquee() {
  return (
    <section aria-label="Capabilities" className="space-y-3 border-y border-edge bg-base2/60 py-6 md:py-8">
      <Row items={rowA} label="Software and AI capabilities" />
      <Row items={rowB} reverse label="Growth and training capabilities" />
    </section>
  )
}
