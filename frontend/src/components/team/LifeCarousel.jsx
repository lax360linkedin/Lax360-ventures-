import OptimizedImage from '../ui/OptimizedImage.jsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'
import { cultureCategories } from '../../data/team.js'
import { useLang } from '../../i18n/store.js'

const LOCALE = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' }
const labelOf = (g) => g.custom || cultureCategories.find((c) => c.value === g.category)?.label || ''

/**
 * "Life at LAX360": one common carousel of the company's games, functions, celebrations, outings, events, workshops and achievements (not part of any profile). Each slide has a photograph, an
 * optional title, description and date, and a category label. It moves by itself, can be moved with the arrows, swiped or scrolled sideways, pauses while hovered, focused or touched (and has a
 * Pause button), and does not move on its own for visitors who prefer reduced motion. Categories (including the ones administrators type) filter it.
 */
export default function LifeCarousel({ items, chip }) {
  const lang = useLang()
  const reduce = useReducedMotion()
  const track = useRef(null)
  const [cat, setCat] = useState('all')
  const [hold, setHold] = useState(false) // hovered, focused or touched
  const [off, setOff] = useState(false) // paused with the button

  const cats = useMemo(() => [...new Set(items.map(labelOf).filter(Boolean))], [items])
  const list = useMemo(() => items.filter((g) => cat === 'all' || labelOf(g) === cat), [items, cat])
  const fmt = useMemo(() => new Intl.DateTimeFormat(LOCALE[lang] || 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), [lang])
  const when = (d) => { const t = /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? new Date(`${d}T00:00:00`) : null; return t && !Number.isNaN(t.getTime()) ? fmt.format(t) : '' }

  const go = useCallback((dir) => {
    const el = track.current
    if (!el) return
    const card = el.querySelector('li')
    const step = (card?.getBoundingClientRect().width || 320) + 16
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
    const atStart = el.scrollLeft <= 4
    const behavior = reduce ? 'auto' : 'smooth'
    if (dir > 0 && atEnd) el.scrollTo({ left: 0, behavior })
    else if (dir < 0 && atStart) el.scrollTo({ left: el.scrollWidth, behavior })
    else el.scrollBy({ left: dir * step, behavior })
  }, [reduce])

  useEffect(() => {
    if (reduce || hold || off || list.length < 2) return undefined
    const t = setInterval(() => go(1), 4200)
    return () => clearInterval(t)
  }, [reduce, hold, off, list.length, go])
  useEffect(() => { track.current?.scrollTo({ left: 0 }) }, [cat])

  const round = 'grid size-11 place-items-center rounded-full border border-edge-strong bg-glass text-fg transition-colors hover:border-lav hover:bg-glass-strong'
  return (
    <div className="pb-14 md:pb-20">
      {cats.length > 1 && (
        <div className="wrap">
          <div role="group" aria-label="Filter photographs" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={cat === 'all'} onClick={() => setCat('all')} className={chip(cat === 'all')}>All</button>
            {cats.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}
          </div>
        </div>
      )}
      <div className="wrap mt-8" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)} onTouchStart={() => setHold(true)} onTouchEnd={() => setTimeout(() => setHold(false), 4000)}>
        <ul ref={track} role="region" aria-roledescription="carousel" aria-label="Life at LAX360" tabIndex={0} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 outline-none focus-visible:ring-2 focus-visible:ring-lav" style={{ touchAction: 'pan-x pan-y' }}>
          {list.map((g, i) => {
            const date = when(g.date)
            return (
              <Reveal as="li" key={g.slug} delay={(i % 4) * 0.04} className="w-[80vw] shrink-0 snap-start sm:w-[22rem] lg:w-[24rem]">
                <figure className="group relative m-0 aspect-[4/3] overflow-hidden rounded-3xl border border-edge shadow-[0_22px_44px_-30px_rgba(0,0,0,0.6)] transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-1 hover:border-lav hover:shadow-[0_30px_54px_-28px_rgb(var(--glow)/0.7)]">
                  <OptimizedImage src={g.image} alt={g.alt} width="800" height="600" sizes="(min-width: 1024px) 30rem, 85vw" draggable="false" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                  <figcaption className="media-dark absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/95 via-night/70 to-transparent p-4 pt-14 text-white">
                    <span className="inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[0.64rem] font-bold uppercase tracking-wider text-white backdrop-blur">{labelOf(g)}</span>
                    {g.caption && <p className="mt-1.5 font-display text-lg font-semibold leading-tight">{g.caption}</p>}
                    {date && <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white/80"><CalendarDays className="size-3.5" aria-hidden="true" />{date}</p>}
                    {g.text && <p className="mt-1.5 line-clamp-2 text-sm text-white/85">{g.text}</p>}
                  </figcaption>
                </figure>
              </Reveal>
            )
          })}
        </ul>
        {list.length > 1 && (
          <div className="mt-5 flex items-center justify-end gap-2">
            {!reduce && <button type="button" onClick={() => setOff((v) => !v)} aria-pressed={off} aria-label={off ? 'Resume the automatic scrolling of the photographs' : 'Pause the automatic scrolling of the photographs'} className={round}>{off ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}</button>}
            <button type="button" onClick={() => go(-1)} aria-label="Previous photographs" className={round}><ChevronLeft className="size-5" aria-hidden="true" /></button>
            <button type="button" onClick={() => go(1)} aria-label="Next photographs" className={round}><ChevronRight className="size-5" aria-hidden="true" /></button>
          </div>
        )}
      </div>
    </div>
  )
}
