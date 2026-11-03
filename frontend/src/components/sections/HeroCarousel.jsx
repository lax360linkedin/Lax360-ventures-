import { useCallback, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { primaryNav } from '../../data/navigation.js'
import { heroPages } from '../../data/heroPages.js'
import { useNav } from '../../hooks/useSite.js'

const SWIPE_MIN = 56 // px of horizontal travel that counts as a swipe

/**
 * The home hero as a swipeable set of header views: view 1 is the existing home hero (passed in as `home`), then one view per main
 * navigation page (About → Contact, taken from the live menu) with a short explanation and a link. Swipe / drag, arrow keys, side
 * arrows, a "Next" button and the page pills all move between views; views cross-fade and slide. Views that are not showing are `inert`.
 */
export default function HeroCarousel({ home }) {
  const menu = useNav('header', primaryNav)
  const pages = menu.filter((n) => !n.external && n.to !== '/') // the first view is always Home
  const views = [{ id: 'home', label: 'Home' }, ...pages.map((n) => ({ id: n.to, to: n.to, label: n.label, info: heroPages[n.to] }))]
  const [i, setI] = useState(0)
  const start = useRef(null)
  const last = views.length - 1

  const go = useCallback((n) => setI(Math.max(0, Math.min(last, n))), [last])
  const down = (e) => { if (!e.target.closest('input,textarea,select')) start.current = { x: e.clientX, y: e.clientY } }
  const up = (e) => {
    const s = start.current
    start.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(i + (dx < 0 ? 1 : -1))
  }
  const key = (e) => {
    if (e.target.closest('input,textarea,select')) return
    if (e.key === 'ArrowRight') go(i + 1)
    else if (e.key === 'ArrowLeft') go(i - 1)
  }

  const arrow = 'absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-edge-strong bg-glass text-fg backdrop-blur-md transition-[opacity,border-color,transform] hover:border-lav disabled:pointer-events-none disabled:opacity-0 md:grid'
  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label="LAX360 Ventures — main pages" onKeyDown={key}>
      <div
        className="wrap relative grid min-h-[min(100svh,58rem)] items-center overflow-x-clip pb-16 pt-[116px] md:pt-[140px] lg:pb-24"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={() => { start.current = null }}
      >
        {views.map((v, n) => (
          <div
            key={v.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${n + 1} of ${views.length}: ${v.label}`}
            aria-hidden={n !== i}
            inert={n !== i}
            className={`col-start-1 row-start-1 flex justify-center transition-[opacity,transform,filter] duration-500 ease-signal motion-reduce:transition-none ${n === i ? 'translate-x-0 opacity-100' : `pointer-events-none opacity-0 blur-[2px] ${n < i ? '-translate-x-10' : 'translate-x-10'}`}`}
          >
            {n === 0 ? home : (
              <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center [text-shadow:0_2px_24px_rgba(11,7,20,0.55)]">
                <p className="glass-flat inline-flex items-center gap-2.5 !rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lav">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(168,85,247,0.8)]" />
                  {v.label}
                </p>
                <h2 className="h1 mt-6 !text-[clamp(2.1rem,5vw,4.25rem)]">{v.info?.title || v.label}</h2>
                {v.info?.text && <p className="lead mx-auto mt-6 text-fg/85">{v.info.text}</p>}
                {v.info?.points && (
                  <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label={`${v.label} highlights`}>
                    {v.info.points.map((p) => <li key={p} className="tag">{p}</li>)}
                  </ul>
                )}
                <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
                  <Button to={v.to} arrow className="w-full sm:w-auto">{v.info?.cta || `Open ${v.label}`}</Button>
                  {n < last && <Button variant="secondary" className="w-full sm:w-auto" onClick={() => go(n + 1)}>Next: {views[n + 1].label}</Button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" className={`${arrow} left-3 lg:left-6`} onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous view"><ChevronLeft className="size-5" aria-hidden="true" /></button>
      <button type="button" className={`${arrow} right-3 lg:right-6`} onClick={() => go(i + 1)} disabled={i === last} aria-label="Next view"><ChevronRight className="size-5" aria-hidden="true" /></button>
    </div>
  )
}
