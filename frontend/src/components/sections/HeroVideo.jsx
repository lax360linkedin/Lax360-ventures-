import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { api } from '../../services/apiClient.js'

/**
 * Homepage hero background video. The SERVER decides what plays (a persistent 3-day schedule); this component only shows it:
 * - asks /api/public/hero-video after the page has rendered (never blocks the hero text) and again when the slot ends,
 *   when the tab becomes visible again and at least every 10 minutes, so admin changes and slot changes are picked up;
 * - one timer, one in-flight request, everything cleaned up on unmount;
 * - a new video is loaded in a layer beneath/above the old one and cross-faded in once it can play, so the hero never goes blank;
 * - only the active video is downloaded. Reduced motion / data saver / failed autoplay fall back to the poster or the built-in art;
 * - pointer-events are off and the whole layer is aria-hidden, so it can never interfere with the text, links or buttons.
 */
const FADE_MS = 900

function Layer({ layer, paused, onReady, onFail }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    el.muted = true // React does not reliably set the muted attribute, and autoplay needs it
    return () => {
      el.pause()
      // Release the decoder and the network connection, but only once the element is really gone (React StrictMode runs this cleanup
      // right after mount in development while the element is still on the page).
      window.setTimeout(() => {
        if (el.isConnected) return
        el.removeAttribute('src')
        el.load()
      }, 0)
    }
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!el || !layer.ready) return
    if (paused) el.pause()
    else el.play?.().catch(() => {})
  }, [paused, layer.ready])
  return (
    <video
      ref={ref}
      src={layer.url}
      poster={layer.poster || undefined}
      autoPlay muted loop playsInline preload="auto" disablePictureInPicture tabIndex={-1} aria-hidden="true"
      onCanPlay={() => { ref.current?.play?.().catch(() => {}); onReady(layer.id) }}
      onError={() => onFail(layer.id)}
      className="absolute inset-0 h-full w-full object-cover object-center transition-opacity ease-in-out motion-reduce:transition-none"
      style={{ opacity: layer.ready ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
    />
  )
}

export default function HeroVideo() {
  const reduce = useReducedMotion()
  const box = useRef(null)
  const [layers, setLayers] = useState([]) // oldest first; the last one is the scheduled video
  const [poster, setPoster] = useState(null)
  const [offscreen, setOffscreen] = useState(false)
  const [still, setStill] = useState(false) // poster only: reduced motion or data saver

  useEffect(() => {
    setStill(Boolean(reduce || navigator.connection?.saveData))
  }, [reduce])

  useEffect(() => {
    let timer = 0
    let cancelled = false
    let controller = null
    let lastLoad = 0
    const load = async () => {
      if (controller) return // one request at a time
      controller = new AbortController()
      lastLoad = Date.now()
      let wait = 120
      try {
        const body = await api('/api/public/hero-video', { signal: controller.signal })
        if (cancelled) return
        wait = Math.max(5, Math.min(body.check_again_in_seconds || 600, 600))
        const a = body.active
        setPoster(a?.poster_url || null)
        setLayers((cur) => {
          if (!a) return []
          if (cur.length && cur[cur.length - 1].id === a.id) return cur // unchanged: no reload, no flicker
          return [...cur, { id: a.id, url: a.url, poster: a.poster_url, ready: false, failed: false }].slice(-2)
        })
      } catch {
        // offline or API down: keep whatever is showing and try again later
      } finally {
        controller = null
        if (!cancelled) timer = window.setTimeout(load, wait * 1000 + Math.random() * 2000)
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad > 30000) {
        window.clearTimeout(timer)
        load()
      }
    }
    load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Pause the decoder while the hero is scrolled out of view.
  useEffect(() => {
    const el = box.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const ready = (id) => {
    setLayers((cur) => cur.map((l) => (l.id === id ? { ...l, ready: true } : l)))
    window.setTimeout(() => setLayers((cur) => (cur.length > 1 && cur[cur.length - 1].ready ? cur.slice(-1) : cur)), FADE_MS + 100) // drop the old layer after the fade
  }
  const fail = (id) => setLayers((cur) => cur.filter((l) => l.id !== id))

  const shown = !still && layers.some((l) => l.ready)
  return (
    <div ref={box} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {(still || !shown) && poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover object-center" decoding="async" />}
      {!still && layers.map((l) => <Layer key={l.id} layer={l} paused={offscreen} onReady={ready} onFail={fail} />)}
      {/* readability: a soft dark veil plus a gradient that is strongest behind the text and fades into the page below */}
      {(shown || (still && poster)) && <div className="absolute inset-0 bg-night/45" />}
      {(shown || (still && poster)) && <div className="absolute inset-0 bg-gradient-to-b from-night/70 via-night/20 to-night" />}
    </div>
  )
}
