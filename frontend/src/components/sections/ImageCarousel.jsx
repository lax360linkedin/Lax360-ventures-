import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Pause, Play } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading.jsx'
import { useCarousel } from '../../hooks/useCarousel.js'

/**
 * Home "image carousel" (between Testimonials and Our Clients). A slow, endless strip of framed pictures at one height with mixed wide / narrow frames, in the manner of the
 * "media wheel" on url-factory.com: it drifts by itself, and the visitor can take over at any moment: swipe, drag with the mouse, scroll sideways on a touchpad, or use the
 * arrow keys. A flick keeps its momentum; the drift pauses while it is touched, hovered or focused and resumes by itself.
 *
 * One position (`x`) drives everything and is applied as a transform: that is what keeps it smooth (setting scrollLeft rounds to whole pixels, which makes a slow drift stutter).
 * The pictures are repeated so the strip never ends; only the first copy is read by screen readers. The animation loop runs only while the strip is on screen, the tab is
 * visible and the section is not paused. With reduced motion there is no drift (dragging still works), and there is always a Pause button.
 * Pictures, order, on/off, shape, caption and the heading come from the admin panel; none are built into this file.
 */
const FRICTION = 3.2 // momentum decay per second
const GAP = 20 // the gap between pictures (gap-5)
const RESUME_AFTER_MS = 1800 // drift resumes this long after the visitor lets go

export default function ImageCarousel() {
  const { items, config } = useCarousel()
  const reduce = useReducedMotion()
  const [paused, setPaused] = useState(false) // the visitor pressed Pause
  const [sets, setSets] = useState(2) // 2 copies while measuring or looping; 1 when the whole list fits on screen (then it is static)
  const box = useRef(null)
  const track = useRef(null)
  const s = useRef({ x: 0, v: 0, loop: 0, dragging: false, hover: false, focus: false, visible: false, until: 0, raf: 0, last: 0, moved: 0, samples: [], pointer: null })
  const looping = sets > 1
  const auto = !reduce && !paused && items.length > 0 && looping

  const apply = useCallback(() => {
    const st = s.current
    if (st.loop > 0) st.x = ((st.x % st.loop) + st.loop) % st.loop
    if (track.current) track.current.style.transform = `translate3d(${-st.x}px,0,0)`
  }, [])

  // One copy of the list is the whole strip when it fits on screen: it is shown once, centred, and does not move (so no picture is ever repeated). A longer list loops, and the
  // loop is always wider than the screen, so the same picture is never visible twice at the same time (the second copy only exists to make the wrap-around seamless).
  const measure = useCallback(() => {
    const el = track.current
    const wrap = box.current
    if (!el || !wrap || !items.length) return
    const view = wrap.clientWidth
    if (sets === 1) {
      if (el.scrollWidth > view + 1) setSets(2) // grew past the screen (resize, a picture finished loading): loop from now on
      else { s.current.loop = 0; s.current.x = 0 }
    } else if (el.children.length >= items.length * 2) {
      const one = el.children[items.length].offsetLeft - el.children[0].offsetLeft // width of one copy of the list, gaps included
      if (one > 0 && one - GAP <= view) setSets(1) // everything fits: show it once
      else if (one > 0) s.current.loop = one
    }
    apply()
  }, [apply, items.length, sets])

  useEffect(() => {
    measure()
    const wrap = box.current
    if (!wrap || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [measure, sets, items])

  // the animation loop: drift + momentum, only while on screen
  useEffect(() => {
    const st = s.current
    const frame = (now) => {
      const dt = Math.min(0.05, (now - (st.last || now)) / 1000)
      st.last = now
      if (!st.dragging) {
        if (Math.abs(st.v) > 18) {
          st.x += st.v * dt
          st.v *= Math.exp(-FRICTION * dt)
        } else {
          st.v = 0
          const holding = (config.pauseOnHover && (st.hover || st.focus)) || now < st.until
          if (auto && !holding) st.x += config.speed * dt
        }
      }
      apply()
      st.raf = requestAnimationFrame(frame)
    }
    const start = () => { if (!st.raf && st.visible && !document.hidden) { st.last = 0; st.raf = requestAnimationFrame(frame) } }
    const stop = () => { cancelAnimationFrame(st.raf); st.raf = 0 }
    const io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; if (st.visible) start(); else stop() }, { rootMargin: '120px' })
    if (box.current) io.observe(box.current)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis); stop() }
  }, [auto, apply, config.speed, config.pauseOnHover, items.length])

  // sideways touchpad / wheel gestures move the strip; ordinary (vertical) scrolling still scrolls the page
  useEffect(() => {
    const wrap = box.current
    if (!wrap) return undefined
    const onWheel = (e) => {
      const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX
      if (Math.abs(dx) <= Math.abs(e.deltaY) || Math.abs(dx) < 1) return
      e.preventDefault()
      s.current.x += dx
      s.current.v = 0
      s.current.until = performance.now() + RESUME_AFTER_MS
      apply()
    }
    wrap.addEventListener('wheel', onWheel, { passive: false })
    return () => wrap.removeEventListener('wheel', onWheel)
  }, [apply, items.length])

  const down = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const st = s.current
    st.dragging = true
    st.v = 0
    st.moved = 0
    st.samples = [[performance.now(), e.clientX]]
    st.pointer = e.pointerId
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e) => {
    const st = s.current
    if (!st.dragging || e.pointerId !== st.pointer) return
    const prev = st.samples[st.samples.length - 1]
    st.x -= e.clientX - prev[1]
    st.moved += Math.abs(e.clientX - prev[1])
    st.samples.push([performance.now(), e.clientX])
    if (st.samples.length > 6) st.samples.shift()
    apply()
  }
  const up = (e) => {
    const st = s.current
    if (!st.dragging || e.pointerId !== st.pointer) return
    st.dragging = false
    st.pointer = null
    const a = st.samples[0]
    const b = st.samples[st.samples.length - 1]
    const dt = (b[0] - a[0]) / 1000
    st.v = dt > 0.01 && performance.now() - b[0] < 80 ? Math.max(-3200, Math.min(3200, -(b[1] - a[1]) / dt)) : 0 // a flick keeps its momentum; a held drag does not
    st.until = performance.now() + RESUME_AFTER_MS
    if (reduce) apply()
  }
  const key = (e) => {
    const st = s.current
    if (e.key === 'ArrowRight') st.v = 900
    else if (e.key === 'ArrowLeft') st.v = -900
    else return
    e.preventDefault()
    st.until = performance.now() + RESUME_AFTER_MS
  }

  if (!items.length || !config.enabled) return null
  const copies = Array.from({ length: sets }, (_, i) => i)
  return (
    <section id="gallery" aria-labelledby="gallery-title" className="gal relative overflow-hidden border-t border-edge py-12 md:py-20">
      <div className="wrap">
        <SectionHeading id="gallery-title" eyebrow={config.eyebrow || undefined} title={config.title || 'Gallery'} gradient={config.accent || undefined} lead={config.lead || undefined} center />
      </div>
      <div
        ref={box} role="region" aria-roledescription="carousel" aria-label={`${config.title ? `${config.title} ${config.accent}`.trim() : 'Gallery'}: use the left and right arrow keys, or swipe or drag`} tabIndex={0}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
        onMouseEnter={() => { s.current.hover = true }} onMouseLeave={() => { s.current.hover = false }} onFocus={() => { s.current.focus = true }} onBlur={() => { s.current.focus = false }}
        className="mt-10 cursor-grab select-none overflow-hidden active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lav md:mt-14" style={{ touchAction: 'pan-y' }}>
        <ul ref={track} className={`gal-track flex w-max items-stretch gap-5 will-change-transform ${looping ? '' : 'mx-auto'}`}>
          {copies.flatMap((c) => items.map((p, i) => (
            <li key={`${c}-${p.id}`} aria-hidden={c > 0 || undefined} className="group relative shrink-0">
              <figure className="relative m-0 rounded-[1.1rem] border-2 border-edge-strong bg-glass p-2.5 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.7)]">
                {/* Never cropped: every picture keeps its own proportions at the shared height (width follows from it); only a very wide panorama is capped in width and then letterboxed (contain) */}
                <div className="gal-pic relative flex items-center justify-center overflow-hidden rounded-xl bg-glass-strong" style={{ height: 'var(--gal-h)' }}>
                  <img src={p.src} alt={c > 0 ? '' : p.alt} loading="eager" decoding="async" draggable="false" onLoad={measure}
                    className="block h-full w-auto object-contain" style={{ aspectRatio: 'auto 1.953', maxWidth: 'min(calc(var(--gal-h) * 3), 86vw)' }} />
                  {p.sample && <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">Sample image</span>}
                  {p.caption && <figcaption className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 text-sm font-semibold text-white transition-transform duration-300 group-hover:translate-y-0">{p.caption}</figcaption>}
                </div>
              </figure>
            </li>
          )))}
        </ul>
      </div>
      {!reduce && looping && (
        <div className="wrap mt-5 flex justify-end">
          <button type="button" onClick={() => setPaused((v) => !v)} aria-pressed={paused} aria-label={paused ? 'Resume the automatic movement of the pictures' : 'Pause the automatic movement of the pictures'}
            className="inline-flex size-10 items-center justify-center rounded-full border border-edge-strong bg-glass text-fg transition-colors hover:border-lav hover:bg-glass-strong">
            {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
          </button>
        </div>
      )}
    </section>
  )
}
