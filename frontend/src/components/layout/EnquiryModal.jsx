import { useEffect, useRef } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import EnquiryForm from '../sections/EnquiryForm.jsx'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Project-enquiry dialog. Opened only by the user (header CTA or the `lax360:open-enquiry` event) — it never
 * opens automatically. Dark translucent backdrop + blur, glass panel, scale/fade, focus trap, Esc to close,
 * "Maybe later". The form is the same backend-connected enquiry form used on /contact.
 */
export default function EnquiryModal({ open, onClose }) {
  const reduce = useReducedMotion()
  const panelRef = useRef(null)
  const returnRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    returnRef.current = document.activeElement
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // focus the first field once the form has mounted
    const t = setTimeout(() => panelRef.current?.querySelector('input[type="text"]:not([tabindex="-1"]), input:not([type="radio"]):not([tabindex="-1"])')?.focus(), 60)
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
      returnRef.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-md sm:items-center sm:p-6"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="enquiry-title"
            className="glass relative my-auto w-full max-w-xl bg-base2/80 p-6 shadow-menu md:p-9"
            initial={reduce ? false : { opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-lav to-transparent" />
            <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full border border-edge text-soft transition-colors hover:border-lav hover:text-fg">
              <X className="size-5" aria-hidden="true" />
            </button>
            <p className="eyebrow text-lav">Project enquiry</p>
            <h2 id="enquiry-title" className="mt-2 pr-12 font-display text-3xl font-semibold leading-tight">Got a project in mind?</h2>
            <p className="mt-2 text-soft">Tell us briefly what you need and the team will follow up.</p>
            <div className="mt-6">
              <EnquiryForm tone="dark" compact idPrefix="modal" source="modal" />
            </div>
            <button type="button" onClick={onClose} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full text-base font-semibold text-soft transition-colors hover:text-fg">
              Maybe later
            </button>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
