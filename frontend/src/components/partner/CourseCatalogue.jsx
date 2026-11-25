import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronDown, Search, X } from 'lucide-react'
import { COURSE_COUNT, IT_COURSES, IT_GROUPS, NON_IT_COURSES, NON_IT_DESCRIPTION } from '../../data/educationCourses.js'

/** The complete LAX360 Education course list in an accessible dialog (Escape closes it, focus stays inside, the page behind does not scroll). */
export function CourseDialog({ open, onClose, accent = '#2563eb' }) {
  const titleId = useId()
  const ref = useRef(null)
  const [q, setQ] = useState('')
  useEffect(() => {
    if (!open) return undefined
    const prev = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setQ('')
    ref.current?.querySelector('input')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key !== 'Tab' || !ref.current) return
      const els = [...ref.current.querySelectorAll('a[href], button, input')].filter((x) => !x.disabled)
      if (!els.length) return
      const [first, last] = [els[0], els[els.length - 1]]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.() }
  }, [open, onClose])
  const term = q.trim().toLowerCase()
  const match = (c) => !term || c.name.toLowerCase().includes(term)
  const groups = useMemo(() => IT_GROUPS.map((g) => ({ ...g, courses: g.nos.map((n) => IT_COURSES.find((c) => c.no === n)).filter(match) })).filter((g) => g.courses.length), [term]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null
  const shown = groups.reduce((n, g) => n + g.courses.length, 0)
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-edge-strong bg-night text-fg shadow-menu sm:rounded-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4 sm:px-7">
          <div><p className="eyebrow flex items-center gap-2" style={{ color: accent }}><BookOpen className="size-4" aria-hidden="true" />LAX360 Education</p><h2 id={titleId} className="mt-1 font-display text-2xl font-semibold">All courses</h2>
            <p className="mt-1 text-sm text-soft">{COURSE_COUNT} courses listed: {IT_COURSES.length} IT course categories{NON_IT_COURSES.length ? ` and ${NON_IT_COURSES.length} Non-IT courses` : ''}. Courses offered at a centre depend on the approved franchise package, infrastructure and faculty.</p></div>
          <button type="button" onClick={onClose} aria-label="Close course list" className="grid size-11 shrink-0 place-items-center rounded-lg text-soft hover:bg-glass-strong hover:text-fg"><X className="size-5" aria-hidden="true" /></button>
        </header>
        <div className="border-b border-edge px-5 py-3 sm:px-7">
          <label className="relative block"><span className="sr-only">Search courses</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses" className="h-11 w-full rounded-lg border border-edge bg-glass pl-10 pr-3 text-sm text-fg placeholder:text-soft/70 focus:border-lav focus:outline-none" /></label>
          <p className="mt-2 text-xs text-soft" role="status" aria-live="polite">{term ? `${shown} of ${IT_COURSES.length} IT courses match` : `Showing all ${IT_COURSES.length} IT courses`}</p>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-7">
          <section aria-labelledby={`${titleId}-it`}>
            <h3 id={`${titleId}-it`} className="font-display text-xl font-semibold">IT courses <span className="text-base font-normal text-soft">· software, programming, AI and technology training</span></h3>
            {groups.length === 0 ? <p className="mt-4 text-soft">No course matches “{q}”.</p> : (
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                {groups.map((g) => (
                  <div key={g.title}>
                    <h4 className="mb-2 border-b border-edge pb-1.5 text-sm font-semibold uppercase tracking-wide" style={{ color: accent }}>{g.title}</h4>
                    <ol className="space-y-1.5">{g.courses.map((c) => <li key={c.no} value={c.no} className="flex gap-3 text-[0.9375rem]"><span className="w-7 shrink-0 text-right font-semibold tabular-nums text-soft">{c.no}.</span><span>{c.name}</span></li>)}</ol>
                  </div>
                ))}
              </div>
            )}
          </section>
          {!term && (
            <section aria-labelledby={`${titleId}-non`} className="mt-8 border-t border-edge pt-6">
              <h3 id={`${titleId}-non`} className="font-display text-xl font-semibold">Non-IT courses <span className="text-base font-normal text-soft">· {NON_IT_DESCRIPTION.replace(/\.$/, '').toLowerCase()}</span></h3>
              {NON_IT_COURSES.length ? <ol className="mt-3 grid gap-1.5 md:grid-cols-2">{NON_IT_COURSES.map((c, i) => <li key={c} className="flex gap-3"><span className="w-7 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span>{c}</li>)}</ol>
                : <p className="mt-3 text-soft">LAX360 Education also supports Non-IT training programmes. The individual Non-IT course list has not been published yet; ask our team for the current catalogue.</p>}
            </section>
          )}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-5 py-4 sm:px-7">
          <p className="text-xs text-soft">Course availability and certification follow the approved programme and the franchise agreement.</p>
          <div className="flex flex-wrap gap-2"><Link to="/partner-with-us/apply?type=franchise&division=education" onClick={onClose} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white">Apply for an Education Franchise</Link><button type="button" onClick={onClose} className="inline-flex min-h-11 items-center rounded-full border border-edge-strong px-5 text-sm font-semibold hover:bg-glass-strong">Close</button></div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

// ---- shared state: the sidebar course list and every "View All Courses" button use the same open / closed state ----
const PANEL_ID = 'course-panel'
const store = { open: false, mounted: 0, subs: new Set() }
const emit = () => store.subs.forEach((f) => f())
const subscribe = (f) => { store.subs.add(f); return () => { store.subs.delete(f) } }
const useOpen = () => useSyncExternalStore(subscribe, () => store.open, () => false)
const setOpenState = (v) => { if (store.open !== v) { store.open = v; emit() } }

/** The course list as an expandable section of the sidebar (no popup): the same list the buttons expand. Opens and closes with a height + fade animation. */
export function CourseAccordion({ accent = '#2563eb', applyTo = '/partner-with-us/apply?type=franchise&division=education', applyLabel = 'Apply for an Education Franchise' }) {
  const open = useOpen()
  const id = useId()
  const [q, setQ] = useState('')
  useEffect(() => { store.mounted += 1; return () => { store.mounted -= 1; if (!store.mounted) store.open = false } }, [])
  const term = q.trim().toLowerCase()
  const groups = useMemo(() => IT_GROUPS.map((g) => ({ ...g, courses: g.nos.map((n) => IT_COURSES.find((c) => c.no === n)).filter((c) => c && (!term || c.name.toLowerCase().includes(term))) })).filter((g) => g.courses.length), [term])
  const shown = groups.reduce((n, g) => n + g.courses.length, 0)
  return (
    <section id={PANEL_ID} aria-label="Education courses" className="mt-4 scroll-mt-44 rounded-2xl border border-edge bg-glass lg:scroll-mt-48">
      <button type="button" onClick={() => setOpenState(!open)} aria-expanded={open} aria-controls={`${id}-body`} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left text-sm font-semibold text-white shadow-menu transition-[filter] hover:brightness-110" style={{ background: accent }}>
        <span className="flex items-center gap-2"><BookOpen className="size-4" aria-hidden="true" />View All Courses</span>
        <ChevronDown className={`size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div id={`${id}-body`} role="region" aria-label="All Education courses" inert={!open} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="p-4">
            <p className="text-xs text-soft">{COURSE_COUNT} courses: {IT_COURSES.length} IT course categories{NON_IT_COURSES.length ? ` and ${NON_IT_COURSES.length} Non-IT courses` : ''}. Courses offered depend on the approved partnership and its agreement.</p>
            <label className="relative mt-3 block"><span className="sr-only">Search courses</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" aria-hidden="true" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses" className="h-11 w-full rounded-lg border border-edge bg-bg pl-9 pr-3 text-sm text-fg placeholder:text-soft/70 focus:border-lav focus:outline-none" /></label>
            <p className="mt-2 text-xs text-soft" role="status" aria-live="polite">{term ? `${shown} of ${IT_COURSES.length} IT courses match` : `Showing all ${IT_COURSES.length} IT courses`}</p>
            {groups.length === 0 ? <p className="mt-3 text-sm text-soft">No course matches “{q}”.</p> : (
              <div className="mt-3 space-y-5">
                {groups.map((g) => (
                  <div key={g.title}>
                    <h3 className="mb-1.5 border-b border-edge pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>{g.title}</h3>
                    <ol className="space-y-1">{g.courses.map((c) => <li key={c.no} value={c.no} className="flex gap-2 text-sm"><span className="w-6 shrink-0 text-right font-semibold tabular-nums text-soft">{c.no}.</span><span className="min-w-0">{c.name}</span></li>)}</ol>
                  </div>
                ))}
              </div>
            )}
            {!term && (
              <div className="mt-5 border-t border-edge pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>Non-IT courses</h3>
                {NON_IT_COURSES.length ? <ol className="mt-2 space-y-1">{NON_IT_COURSES.map((c, i) => <li key={c} className="flex gap-2 text-sm"><span className="w-6 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span>{c}</li>)}</ol>
                  : <p className="mt-2 text-sm text-soft">{NON_IT_DESCRIPTION} The individual Non-IT course list has not been published yet; ask our team for the current catalogue.</p>}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={applyTo} className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-white">{applyLabel}</Link>
              <button type="button" onClick={() => setOpenState(false)} className="inline-flex min-h-11 items-center rounded-full border border-edge-strong px-4 text-sm font-semibold hover:bg-glass-strong">Collapse list</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** A prominent "View All Courses" button. Where the sidebar course list is on the page it scrolls there smoothly and expands it; elsewhere (no sidebar) it opens the dialog. */
export function CoursesButton({ accent = '#2563eb', block = false, className = '' }) {
  const [dlg, setDlg] = useState(false)
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const go = () => {
    if (!store.mounted) { setDlg(true); return }
    setOpenState(true)
    requestAnimationFrame(() => {
      const el = document.getElementById(PANEL_ID)
      el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      setTimeout(() => el?.querySelector('button')?.focus({ preventScroll: true }), reduce ? 0 : 500)
    })
  }
  return (
    <>
      <button type="button" onClick={go} aria-controls={store.mounted ? PANEL_ID : undefined} aria-haspopup={store.mounted ? undefined : 'dialog'} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-menu transition-transform hover:-translate-y-0.5 ${block ? 'w-full' : ''} ${className}`} style={{ background: accent }}>
        <BookOpen className="size-4" aria-hidden="true" />View All Courses
      </button>
      <CourseDialog open={dlg} onClose={() => setDlg(false)} accent={accent} />
    </>
  )
}
