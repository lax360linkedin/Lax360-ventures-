import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Code2, Compass, LifeBuoy, MessagesSquare, Rocket, ShieldCheck } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading.jsx'

const steps = [
  { icon: MessagesSquare, title: 'Understanding Requirements', text: "Understand the client's needs, business goals and expectations." },
  { icon: Compass, title: 'Research & Planning', text: 'Analyse requirements and prepare the right strategy and project roadmap.' },
  { icon: Code2, title: 'Design & Development', text: 'Create and develop solutions based on the approved requirements.' },
  { icon: ShieldCheck, title: 'Testing & Quality Assurance', text: 'Test functionality, identify issues and ensure quality.' },
  { icon: Rocket, title: 'Deployment & Delivery', text: 'Deploy the solution and deliver the completed project.' },
  { icon: LifeBuoy, title: 'Support & Improvement', text: 'Provide ongoing support, maintenance and improvements when required.' },
]

/**
 * Home "How we work": the six-step workflow as a connected timeline. A rail fills as the visitor scrolls, the step nearest the middle of the
 * screen is highlighted (glowing node, raised card) and a sticky panel on desktop shows which step they are on. Hover lifts a card.
 * Everything is visible without scripting; under reduced motion the highlighting still follows the scroll but nothing animates.
 */
export default function ProcessWorkflow() {
  const reduce = useReducedMotion()
  const list = useRef(null)
  const [active, setActive] = useState(0)
  const rail = useRef(null) // the filled part of the rail is written straight to the element so scrolling does not re-render the section

  useEffect(() => {
    const ol = list.current
    if (!ol) return undefined
    let raf = 0
    const measure = () => {
      raf = 0
      const items = [...ol.children]
      const mid = window.innerHeight * 0.5
      let best = 0
      let bestDist = Infinity
      items.forEach((li, k) => {
        const r = li.getBoundingClientRect()
        const d = Math.abs(r.top + r.height / 2 - mid)
        if (d < bestDist) { bestDist = d; best = k }
      })
      setActive(best)
      const first = items[0].getBoundingClientRect()
      const last = items[items.length - 1].getBoundingClientRect()
      const from = first.top + 28
      const to = last.top + 28
      if (rail.current) rail.current.style.height = `calc((100% - 3.5rem) * ${Math.min(1, Math.max(0, (mid - from) / (to - from)))})`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure) }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    document.body.addEventListener('scroll', onScroll, { passive: true }) // in case the page body is the scroller
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.body.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const goTo = (k) => list.current?.children[k]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
  const ease = reduce ? '' : 'transition-all duration-500 ease-signal'

  return (
    <section aria-labelledby="process-title" className="relative overflow-hidden border-t border-edge">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-1/3 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="wrap section relative grid gap-10 lg:grid-cols-12 lg:gap-14">
        {/* left: heading + live progress (sticky on desktop) */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <SectionHeading id="process-title" eyebrow="Our Process" title="How we" gradient="work." lead="Six clear steps from first conversation to ongoing support, so you always know what happens next." />
            <div className="mt-8 hidden lg:block" aria-hidden="true">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-lav">Step {active + 1} of {steps.length}</p>
              <p key={active} className={`mt-2 font-display text-2xl font-semibold ${reduce ? '' : 'anim-testi-next'}`}>{steps[active].title}</p>
              <div className="mt-5 flex gap-2">
                {steps.map((s, k) => (
                  <button key={s.title} type="button" tabIndex={-1} onClick={() => goTo(k)} className={`h-2 rounded-full ${ease} ${k === active ? 'w-10 bg-lav' : k < active ? 'w-4 bg-lav/60' : 'w-4 bg-fg/25 hover:bg-fg/50'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* right: the connected timeline */}
        <div className="relative lg:col-span-8">
          <span aria-hidden="true" className="absolute bottom-7 left-[1.65rem] top-7 w-px bg-edge" />
          <span ref={rail} aria-hidden="true" className="absolute left-[1.65rem] top-7 w-px bg-gradient-to-b from-lav via-accent to-primary shadow-[0_0_12px_rgb(var(--glow2)/0.7)]" style={{ height: 0 }} />
          <ol ref={list} className="relative space-y-4">
            {steps.map((s, k) => {
              const Icon = s.icon
              const on = k === active
              const done = k <= active
              return (
                <li key={s.title} aria-current={on ? 'step' : undefined} className="relative pl-[4.5rem]">
                  <span className={`absolute left-0 top-0 flex size-14 items-center justify-center rounded-2xl border text-white ${ease} ${done ? 'border-transparent bg-gradient-to-br from-primary to-accent' : 'border-edge-strong bg-base2 text-lav'} ${on ? 'scale-110 shadow-[0_0_28px_-4px_rgb(var(--glow2)/0.9)]' : ''}`}>
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <div className={`group glass-flat p-5 hover:-translate-y-0.5 hover:border-lav md:p-6 ${ease} ${on ? 'border-edge-strong shadow-[0_18px_40px_-24px_rgb(var(--glow)/0.8)]' : 'opacity-90'}`}>
                    <p className={`text-xs font-bold uppercase tracking-[0.14em] ${on ? 'text-gradient' : 'text-lav'}`}>Step {String(k + 1).padStart(2, '0')}</p>
                    <h3 className="mt-1 font-display text-xl font-semibold leading-tight md:text-2xl">{s.title}</h3>
                    <p className="mt-2 text-soft">{s.text}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
