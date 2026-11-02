import { useId, useState } from 'react'
import { Plus } from 'lucide-react'
import Reveal from './Reveal.jsx'

/**
 * FAQ accordion: questions reveal with a light stagger, the answer opens with a smooth height transition
 * (grid-rows 0fr → 1fr, no JS measuring), and the plus rotates into a cross. Native buttons, aria-expanded,
 * keyboard operable. Only one panel moves at a time.
 */
export default function Accordion({ items }) {
  const [open, setOpen] = useState(null)
  const uid = useId()
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <Reveal key={item.q} delay={i * 0.06} y={10}>
            <div className={`rounded-2xl border transition-colors duration-300 ${isOpen ? 'border-edge-strong bg-glass-strong' : 'border-edge bg-glass hover:border-edge-strong'}`}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`${uid}-${i}`}
                  id={`${uid}-btn-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex min-h-16 w-full items-center justify-between gap-6 rounded-2xl px-5 py-4 text-left font-display text-lg font-medium md:px-6 md:text-xl"
                >
                  <span className={`transition-colors duration-200 ${isOpen ? 'text-lav' : ''}`}>{item.q}</span>
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${isOpen ? 'rotate-45 border-lav bg-primary/30 text-lav' : 'border-edge-strong text-soft'}`}>
                    <Plus className="size-4" aria-hidden="true" />
                  </span>
                </button>
              </h3>
              <div
                id={`${uid}-${i}`}
                role="region"
                aria-labelledby={`${uid}-btn-${i}`}
                className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden" inert={!isOpen || undefined}>
                  <p className="max-w-2xl px-5 pb-5 text-soft md:px-6">{item.a}</p>
                </div>
              </div>
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}
