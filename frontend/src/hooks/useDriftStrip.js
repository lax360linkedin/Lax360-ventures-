import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const FRICTION = 3.2 // momentum decay per second
const RESUME_AFTER_MS = 1800 // the drift resumes this long after the visitor lets go

/**
 * An endless horizontal strip that drifts right-to-left by itself and that the visitor can take over at any moment: swipe, drag with the mouse, scroll sideways on a touchpad or use the arrow keys
 * (a flick keeps its momentum). The drift pauses while the strip is touched, hovered or focused and resumes by itself.
 *
 * One position (`x`) drives everything and is applied as a transform, which is what keeps a slow drift smooth (scrollLeft rounds to whole pixels). The items are rendered `sets` times so the strip never
 * ends; when one copy fits on screen it is shown once, centred and still. The animation loop runs only while the strip is on screen and the tab is visible, and never when the visitor prefers reduced motion
 * (dragging still works). Returns what the component spreads onto its elements.
 */
export default function useDriftStrip({ count, speed, scroll = true, pauseOnHover = true, gap = 20 }) {
  const reduce = useReducedMotion()
  const [paused, setPaused] = useState(false) // the visitor pressed Pause
  const [sets, setSets] = useState(2)
  const box = useRef(null)
  const track = useRef(null)
  const s = useRef({ x: 0, v: 0, loop: 0, dragging: false, hover: false, focus: false, visible: false, until: 0, raf: 0, last: 0, moved: 0, samples: [], pointer: null })
  const looping = sets > 1
  const auto = scroll && !reduce && !paused && count > 0 && looping

  const apply = useCallback(() => {
    const st = s.current
    if (st.loop > 0) st.x = ((st.x % st.loop) + st.loop) % st.loop
    if (track.current) track.current.style.transform = `translate3d(${-st.x}px,0,0)`
  }, [])

  const measure = useCallback(() => {
    const el = track.current
    const wrap = box.current
    if (!el || !wrap || !count) return
    const view = wrap.clientWidth
    if (sets === 1) {
      if (el.scrollWidth > view + 1) setSets(2)
      else { s.current.loop = 0; s.current.x = 0 }
    } else if (el.children.length >= count * 2) {
      const one = el.children[count].offsetLeft - el.children[0].offsetLeft // width of one copy, gaps included
      if (one > 0 && one - gap <= view) setSets(1)
      else if (one > 0) s.current.loop = one
    }
    apply()
  }, [apply, count, sets, gap])

  useEffect(() => {
    measure()
    const wrap = box.current
    if (!wrap || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [measure, sets, count])

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
          const holding = (pauseOnHover && (st.hover || st.focus)) || now < st.until
          if (auto && !holding) st.x += speed * dt
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
  }, [auto, apply, speed, pauseOnHover, count])

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
  }, [apply, count])

  const down = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const st = s.current
    st.dragging = true
    st.v = 0
    st.moved = 0
    st.samples = [[performance.now(), e.clientX]]
    st.pointer = e.pointerId
  }
  const move = (e) => {
    const st = s.current
    if (!st.dragging || e.pointerId !== st.pointer) return
    const prev = st.samples[st.samples.length - 1]
    st.x -= e.clientX - prev[1]
    st.moved += Math.abs(e.clientX - prev[1])
    if (st.moved > 6 && !e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.setPointerCapture?.(e.pointerId) // capture only once it is a real drag, so a plain tap still reaches the card's link
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
    st.v = dt > 0.01 && performance.now() - b[0] < 80 ? Math.max(-3200, Math.min(3200, -(b[1] - a[1]) / dt)) : 0
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
  const swallowDragClick = (e) => { if (s.current.moved > 6) { e.preventDefault(); e.stopPropagation(); s.current.moved = 0 } } // a drag that ends on a link must not follow it

  return {
    box, track, sets, looping, reduce, paused, setPaused, measure,
    boxProps: {
      onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onKeyDown: key, onClickCapture: swallowDragClick,
      onMouseEnter: () => { s.current.hover = true }, onMouseLeave: () => { s.current.hover = false }, onFocus: () => { s.current.focus = true }, onBlur: () => { s.current.focus = false },
    },
  }
}
