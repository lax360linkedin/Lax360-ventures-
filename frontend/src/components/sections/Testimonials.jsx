import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, Play, Quote } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'
import { useContent } from '../../hooks/useSite.js'

const INTERVAL = 7000 // ms each testimonial stays
const SWIPE_MIN = 48

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

/**
 * Home "What Our Clients & Students Say": the existing LAX360 mascot (the same image the welcome screen and social section use) stands beside a
 * speech-bubble card and presents one testimonial at a time. Every change of testimonial replays the mascot's "present" gesture and a soft ring
 * while the card slides in, so the two stay in step. Testimonials come from the admin panel (Website content > Testimonials); with none
 * published the section is hidden. Auto-advances every 7 s; pauses on hover / focus / the pause button and never auto-plays under reduced motion.
 */
export default function Testimonials() {
  // Every published entry appears here, whichever service it was assigned to; an administrator can hide one ("Hide from the home page").
  const homeItems = useContent('testimonial')?.filter((x) => x.data.hide_on_home !== true)
  const items = homeItems?.length ? homeItems : null
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [dir, setDir] = useState('next')
  const [userPaused, setUserPaused] = useState(false)
  const [hold, setHold] = useState(false)
  const touch = useRef(null)
  const n = items?.length || 0

  const go = useCallback((k, d) => {
    setDir(d || (k >= i ? 'next' : 'prev'))
    setI(((k % n) + n) % n)
  }, [i, n])

  useEffect(() => { if (n && i >= n) setI(0) }, [n, i])

  const playing = n > 1 && !reduce && !userPaused && !hold
  useEffect(() => {
    if (!playing) return undefined
    const t = setInterval(() => { if (!document.hidden) { setDir('next'); setI((k) => (k + 1) % n) } }, INTERVAL)
    return () => clearInterval(t)
  }, [playing, n, i])

  if (!n) return null
  const t = items[i]
  const d = t.data
  const down = (e) => { touch.current = e.clientX }
  const up = (e) => {
    if (touch.current == null) return
    const dx = e.clientX - touch.current
    touch.current = null
    if (Math.abs(dx) >= SWIPE_MIN) go(i + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev')
  }
  const key = (e) => { if (e.key === 'ArrowRight') go(i + 1, 'next'); else if (e.key === 'ArrowLeft') go(i - 1, 'prev') }
  const btn = 'grid size-11 place-items-center rounded-full border border-edge-strong bg-glass text-fg transition-[border-color,opacity] hover:border-lav disabled:opacity-40'

  return (
    <section aria-labelledby="testimonials-title" className="border-t border-edge bg-base2/50">
      <div className="wrap section">
        <SectionHeading id="testimonials-title" eyebrow="Testimonials" title="What Our Clients &" gradient="Students Say" center className="!max-w-5xl" />

        <Reveal className="mt-8">
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Client and student testimonials"
            tabIndex={0}
            onKeyDown={key}
            onMouseEnter={() => setHold(true)}
            onMouseLeave={() => setHold(false)}
            onFocus={(e) => { if (e.target.matches(':focus-visible')) setHold(true) }}
            onBlur={() => setHold(false)}
            className="grid items-center gap-4 rounded-3xl focus-visible:outline-2 focus-visible:outline-lav lg:grid-cols-12 lg:gap-6"
          >
            {/* the presenter: the existing mascot, replaying its gesture for every testimonial */}
            <div className="relative mx-auto flex h-32 w-full max-w-[16rem] items-end justify-center sm:h-52 lg:col-span-3 lg:h-72" aria-hidden="true">
              <span className="absolute bottom-3 h-6 w-3/4 rounded-[50%] bg-primary/30 blur-md" />
              <span key={`ring-${i}`} className="anim-present-ring absolute bottom-4 size-28 rounded-full sm:bottom-6 sm:size-40 border border-lav/60 lg:size-52" />
              <div key={`m-${i}`} className="anim-present origin-bottom">
                <div className="anim-bot-bob">
                  <img src="/assets/mascot-welcome.webp" alt="" width="480" height="722" decoding="async" draggable="false" className="h-28 w-auto drop-shadow-[0_12px_24px_rgb(var(--glow)/0.55)] sm:h-44 lg:h-64" />
                </div>
              </div>
            </div>

            {/* the speech bubble: tail points at the mascot (left on desktop, up on small screens) */}
            <figure
              key={t.id}
              aria-live={playing ? 'off' : 'polite'}
              className={`relative m-0 lg:col-span-9 ${dir === 'next' ? 'anim-testi-next' : 'anim-testi-prev'}`}
              style={{ touchAction: 'pan-y' }}
              onPointerDown={down}
              onPointerUp={up}
              onPointerCancel={() => { touch.current = null }}
            >
              <span aria-hidden="true" className="absolute -top-2 left-1/2 size-5 -translate-x-1/2 rotate-45 border-l border-t border-edge-strong bg-base2 lg:left-[-0.6rem] lg:top-1/2 lg:-translate-x-0 lg:-translate-y-1/2 lg:-rotate-45" />
              <div className="glass-flat select-none p-6 md:p-8">
                <Quote className="size-8 text-lav/70" aria-hidden="true" />
                <blockquote className="mt-3 font-display text-lg leading-relaxed md:text-xl">&ldquo;{d.quote}&rdquo;</blockquote>
                <figcaption className="mt-6 flex items-center gap-4">
                  {d.photo
                    ? <img src={d.photo} alt={d.photo_alt || t.title} width="56" height="56" loading="lazy" decoding="async" className="size-14 shrink-0 rounded-full border border-edge-strong object-cover" />
                    : <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-lg font-bold text-white">{initials(t.title)}</span>}
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-semibold leading-tight">{t.title}</span>
                    <span className="block text-sm text-soft">{d.role}{d.organization ? ` · ${d.organization}` : ''}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="tag !py-0.5 !text-xs">{d.person_type === 'student' ? 'Student' : 'Client'}</span>
                      {d.is_sample && <span className="rounded-full border border-dashed border-edge-strong px-2.5 py-0.5 text-xs font-semibold text-soft">Sample testimonial — fictional placeholder</span>}
                    </span>
                  </span>
                </figcaption>
              </div>
            </figure>
          </div>
        </Reveal>

        {n > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button type="button" className={btn} onClick={() => go(i - 1, 'prev')} aria-label="Previous testimonial"><ChevronLeft className="size-5" aria-hidden="true" /></button>
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose a testimonial">
              {items.map((x, k) => (
                <button key={x.id} type="button" role="tab" aria-selected={k === i} aria-label={`${k + 1} of ${n}: ${x.title}`} onClick={() => go(k)}
                  className={`relative h-2 rounded-full transition-all duration-300 after:absolute after:-inset-2 after:content-[''] ${k === i ? 'w-8 bg-lav' : 'w-2 bg-fg/30 hover:bg-fg/60'}`} />
              ))}
            </div>
            <button type="button" className={btn} onClick={() => go(i + 1, 'next')} aria-label="Next testimonial"><ChevronRight className="size-5" aria-hidden="true" /></button>
            {!reduce && (
              <button type="button" className={btn} onClick={() => setUserPaused((p) => !p)} aria-pressed={userPaused} aria-label={userPaused ? 'Play automatic sliding' : 'Pause automatic sliding'}>
                {userPaused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
