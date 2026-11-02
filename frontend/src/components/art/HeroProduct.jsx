import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

const bar = 'rounded-full bg-tint/15'

function Card({ tag, w = 'w-3/4' }) {
  return (
    <div className="rounded-lg border border-edge bg-tint/8 p-2">
      <div className={`h-1.5 ${bar} ${w}`} />
      <div className={`mt-1.5 h-1.5 ${bar} w-1/2`} />
      {tag && <div className="mt-2 h-2 w-8 rounded-full" style={{ background: tag }} />}
    </div>
  )
}

/**
 * Layered glass "product" composition for the hero: a CRM pipeline, an AI approval step and a mobile screen.
 * Everything is generic and labelled illustrative — no client, product or result is implied.
 * Slow float on each layer plus a light pointer parallax (fine pointers only, off under reduced motion).
 */
export default function HeroProduct() {
  const reduce = useReducedMotion()
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || reduce || !window.matchMedia('(pointer: fine)').matches) return undefined
    let frame
    const onMove = (e) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--px', ((e.clientX - (r.left + r.width / 2)) / r.width).toFixed(3))
        el.style.setProperty('--py', ((e.clientY - (r.top + r.height / 2)) / r.height).toFixed(3))
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [reduce])

  const depth = (n) => ({ transform: `translate(calc(var(--px, 0) * ${n}px), calc(var(--py, 0) * ${n}px))` })

  return (
    <figure ref={ref} className="a-rise relative mx-auto w-full max-w-[34rem] select-none lg:max-w-none" style={{ '--px': 0, '--py': 0, '--d': '0.5s' }}>
      <p className="sr-only">Illustration of a CRM pipeline, an AI assistant approval step and a mobile app screen.</p>
      <div aria-hidden="true" className="relative aspect-[1/0.95]">
        {/* orbit rings behind the interfaces */}
        <div className="absolute -right-4 -top-4 size-44 rounded-full border border-edge md:size-60" style={depth(-10)} />
        <div className="absolute bottom-0 right-2 size-32 rounded-full border border-edge-strong md:size-44" style={depth(-14)} />

        {/* main window: CRM pipeline */}
        <div className="absolute left-0 top-[4%] w-[80%]" style={depth(6)}>
          <div className="anim-float glass overflow-hidden !rounded-2xl">
            <div className="flex items-center gap-1.5 border-b border-edge px-3 py-2.5">
              <span className="size-2 rounded-full bg-accent" /><span className="size-2 rounded-full bg-lav" /><span className="size-2 rounded-full bg-sky" />
              <span className="ml-3 rounded-full border border-edge bg-tint/8 px-3 py-0.5 text-[10px] font-semibold text-soft">Pipeline</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {[['Lead', 'var(--art-sky)', 2], ['Proposal', 'var(--art-vio)', 3], ['Won', 'var(--art-line)', 1]].map(([label, tag, n]) => (
                <div key={label}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-soft">{label}</p>
                  <div className="space-y-1.5">
                    {Array.from({ length: n }, (_, i) => <Card key={i} tag={i === 0 ? tag : null} w={i % 2 ? 'w-2/3' : 'w-5/6'} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI approval step */}
        <div className="absolute bottom-[6%] right-0 w-[58%]" style={depth(14)}>
          <div className="anim-float glass !rounded-2xl p-3.5" style={{ animationDelay: '-2.5s' }}>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-[9px] font-bold text-white">AI</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-soft">Draft reply</span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              <div className={`h-1.5 ${bar} w-full`} /><div className={`h-1.5 ${bar} w-11/12`} /><div className={`h-1.5 ${bar} w-2/3`} />
            </div>
            <div className="mt-3 flex gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white">Approve</span>
              <span className="rounded-full border border-edge-strong px-3 py-1 text-[10px] font-bold text-fg">Edit</span>
            </div>
          </div>
        </div>

        {/* mobile screen */}
        <div className="absolute bottom-0 left-[8%] w-[27%]" style={depth(22)}>
          <div className="anim-float glass !rounded-[1.4rem] p-2" style={{ animationDelay: '-5s' }}>
            <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-tint/20" />
            <div className="mb-2 h-10 rounded-lg bg-gradient-to-br from-primary to-accent" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="mb-1.5 flex items-center gap-1.5">
                <span className={`size-4 shrink-0 rounded ${i === 1 ? 'bg-sky/70' : 'bg-tint/15'}`} />
                <span className={`h-1.5 ${bar} flex-1`} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <figcaption aria-hidden="true" className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-soft">
        Illustrative interfaces — not client work
      </figcaption>
    </figure>
  )
}
