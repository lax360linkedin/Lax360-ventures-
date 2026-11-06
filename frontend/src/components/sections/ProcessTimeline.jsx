import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'
import { processSteps } from '../../data/services.js'

/** Four stages as oversized outlined numerals on a drawn rail: horizontal on desktop, stacked on mobile. */
export default function ProcessTimeline({ eyebrow = 'Process', title = 'How a project runs.', lead, className = '' }) {
  return (
    <section aria-labelledby="process-title" className={`wrap section ${className}`}>
      <SectionHeading id="process-title" eyebrow={eyebrow} title={title} lead={lead} />
      <ol className="relative mt-14 grid gap-12 md:grid-cols-4 md:gap-0">
        {processSteps.map((s, i) => (
          <Reveal as="li" key={s.n} delay={i * 0.1} className="relative md:border-l md:border-edge md:px-6 md:first:border-l-0 md:first:pl-0">
            <p
              aria-hidden="true"
              className="font-display text-[clamp(4.5rem,9vw,8rem)] font-semibold leading-[0.85] tracking-tighter text-transparent"
              style={{ WebkitTextStroke: '1.5px var(--color-lav)' }}
            >
              {s.n}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span aria-hidden="true" className={`size-2.5 rounded-full ${i === processSteps.length - 1 ? 'bg-accent shadow-[0_0_10px_2px_rgb(var(--glow2)/0.8)]' : 'bg-lav'}`} />
              <h3 className="font-display text-2xl font-semibold">
                <span className="sr-only">{s.n} — </span>{s.title}
              </h3>
            </div>
            <p className="mt-3 max-w-xs text-soft">{s.text}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}
