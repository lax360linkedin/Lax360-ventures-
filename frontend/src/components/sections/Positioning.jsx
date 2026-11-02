import { useRef } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import Button from '../ui/Button.jsx'
import BotHighlight from '../ui/BotHighlight.jsx'

const lead = 'Most businesses don’t need more software.'.split(' ')
const emphasis = 'They need software that fits'.split(' ')
const accent = 'how they already work.'

function Word({ children, i }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' })
  // The colour settles from the soft tone to full text colour. It is driven by theme tokens (not hard-coded
  // values), so it follows light/dark mode and keeps AA contrast before it reveals.
  return (
    <span
      ref={ref}
      className={`mr-[0.22em] inline-block transition-colors duration-500 ${inView || reduce ? 'text-fg' : 'text-soft'}`}
      style={{ transitionDelay: `${i * 0.04}s` }}
    >
      {children}
    </span>
  )
}

/** Type-led statement: words settle in once; the key phrase carries the accent gradient and the mini-bot points at it. */
export default function Positioning() {
  return (
    <section aria-label="Our belief" className="border-b border-edge">
      <div className="wrap section grid gap-10 lg:grid-cols-12">
        <p className="eyebrow text-lav lg:col-span-2 lg:pt-5">
          <span className="mr-2 text-accent">●</span>Our belief
        </p>
        <div className="lg:col-span-10">
          <p className="font-display text-[clamp(2.25rem,5.6vw,5.25rem)] font-semibold leading-[1.02] tracking-[-0.025em]">
            {lead.map((w, i) => <Word key={`l${i}`} i={i}>{w}</Word>)}
            <br className="hidden md:block" />
            {emphasis.map((w, i) => <Word key={`e${i}`} i={lead.length + i}>{w}</Word>)}
            <BotHighlight delay={0.6}><span className="text-gradient">{accent}</span></BotHighlight>
          </p>
          <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-xl text-lg text-soft">
              We build, automate and support as one team — so the pieces fit together instead of competing for your attention.
            </p>
            <div className="shrink-0"><Button to="/about" variant="secondary" arrow>About LAX360</Button></div>
          </div>
        </div>
      </div>
    </section>
  )
}
