import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { api } from '../../services/apiClient.js'
import { useIntroState } from '../../utils/welcomeIntro.js'

/**
 * Homepage hero background video. The SERVER decides what plays (a persistent schedule); this component only shows it, and makes sure it
 * actually plays:
 *
 * Schedule: asked for after the page has rendered (never blocks the hero text), again when the slot ends, when the tab becomes visible again
 *   and at least every 10 minutes. The request waits up to 45 s (a sleeping Render instance needs 30-50 s to wake) and, while there is nothing
 *   to show, retries with a growing delay instead of giving up for two minutes.
 * Playback: each video element is driven by explicit logic (see `Layer`): it asks to play on every event that can make that possible, handles the
 *   rejected play() promise, waits for a click / tap / key when the browser blocks autoplay, retries a bounded number of times with backoff,
 *   resumes after the welcome intro, a hidden tab or a power-saving pause, and reloads a source that errors or stalls (with a cache-busting
 *   parameter). It never loops forever, and every problem is logged to the console with the prefix "[hero-video]".
 * Display: the video fades in only once it is really playing; until then (or if it never does) the poster / built-in background stays visible.
 *   Only the active video is downloaded. Reduced motion and data saver show the poster only. Pointer events are off and the layer is
 *   aria-hidden, so it can never interfere with the text, links or buttons.
 */
const TAG = '[hero-video]'
const FADE_MS = 900
const SCHEDULE_TIMEOUT_MS = 45000
const SCHEDULE_RETRY_MS = [2000, 4000, 8000, 15000, 30000]
const PLAY_RETRY_MS = [400, 1200, 3000, 7000, 15000] // bounded: five tries, then wait for a gesture / visibility / intro event
const MAX_SOURCE_RETRIES = 3
const START_WATCHDOG_MS = 25000 // no data at all after this long: reload the source
const STALL_WATCHDOG_MS = 12000 // buffering for this long: reload the source

const warn = (...args) => console.warn(TAG, ...args) // eslint-disable-line no-console
const fail = (...args) => console.error(TAG, ...args) // eslint-disable-line no-console
const info = (...args) => console.info(TAG, ...args) // eslint-disable-line no-console
const introActive = () => ['pending', 'playing'].includes(document.documentElement.getAttribute('data-intro')) // page is hidden under the welcome intro
const withParam = (url, key, value) => `${url}${url.includes('?') ? '&' : '?'}${key}=${value}`

const describe = (el) => ({
  src: (el.currentSrc || el.getAttribute('src') || '').replace(/[?#].*$/, '').slice(-80),
  readyState: el.readyState, networkState: el.networkState, paused: el.paused, currentTime: Number(el.currentTime.toFixed(2)),
  mediaError: el.error ? { code: el.error.code, message: el.error.message } : null,
})

/** One <video>. All playback logic lives in the effect below; React only renders the element. */
function Layer({ layer, hold, resumeSignal, onPlaying, onFail, onFaded }) {
  const ref = useRef(null)
  const ctl = useRef({ tryPlay: () => {}, hold: false, dead: false })
  const [src, setSrc] = useState(layer.url) // changes only for a cache-busting reload after an error or stall
  ctl.current.hold = hold

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const s = ctl.current
    const st = { attempts: 0, srcRetries: 0, playing: false, parked: false, gesture: false, loggedBlocked: false, problem: false }
    const timers = { retry: 0, start: 0, stall: 0, source: 0 }
    s.dead = false
    el.muted = true // React does not reliably set the muted attribute, and autoplay needs it
    el.defaultMuted = true
    el.playsInline = true
    el.loop = true

    const state = (name) => { el.dataset.state = name }
    state('loading')

    const reloadSource = (why) => {
      if (s.dead) return
      if (st.srcRetries >= MAX_SOURCE_RETRIES) {
        fail(`giving up on this video after ${MAX_SOURCE_RETRIES} reloads (${why})`, describe(el))
        state('failed')
        onFail(layer.key, why)
        return
      }
      st.srcRetries += 1
      const delay = 1000 * 2 ** (st.srcRetries - 1)
      warn(`reloading the video in ${delay} ms (${why}); attempt ${st.srcRetries}/${MAX_SOURCE_RETRIES}`, describe(el))
      state('reloading')
      clearTimeout(timers.source)
      timers.source = window.setTimeout(() => {
        st.attempts = 0
        setSrc(withParam(layer.url, 'r', st.srcRetries)) // a new address bypasses any cached bad response
      }, delay)
    }

    const armGesture = () => { // autoplay is blocked: wait for the visitor's first interaction rather than looping
      if (st.gesture) return
      st.gesture = true
      state('blocked')
      const events = ['pointerdown', 'keydown', 'touchstart', 'scroll']
      const go = () => {
        events.forEach((e) => window.removeEventListener(e, go))
        st.gesture = false
        st.attempts = 0
        tryPlay('user-gesture')
      }
      events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }))
      s.dropGesture = () => events.forEach((e) => window.removeEventListener(e, go))
    }

    const scheduleRetry = (reason) => {
      if (st.attempts >= PLAY_RETRY_MS.length) {
        if (!st.loggedBlocked) { st.loggedBlocked = true; warn('playback did not start after several tries; waiting for a click, tap, key press, tab focus or the intro to finish', describe(el)) }
        armGesture()
        return
      }
      const delay = PLAY_RETRY_MS[st.attempts]
      st.attempts += 1
      clearTimeout(timers.retry)
      timers.retry = window.setTimeout(() => tryPlay(`retry (${reason})`), delay)
    }

    function tryPlay(reason) {
      if (s.dead || s.hold || document.hidden || introActive() || !navigator.onLine) return // nothing to do now; a later event asks again
      if (st.playing && !el.paused) return
      st.parked = false
      let promise
      try { promise = el.play() } catch (err) { warn('play() threw', err); scheduleRetry(reason); return }
      if (promise && promise.then) {
        promise.then(() => {}, (err) => {
          if (s.dead || err?.name === 'AbortError') return // a reload or pause interrupted it: the next event asks again
          if (err?.name === 'NotAllowedError') {
            if (!st.warnedBlocked) { st.warnedBlocked = true; warn('autoplay was blocked by the browser; waiting for a click, tap or key press', { reason, ...describe(el) }) } // once per video
            armGesture()
            return
          }
          warn('play() was rejected', { reason, error: `${err?.name}: ${err?.message}`, ...describe(el) })
          st.problem = true
          scheduleRetry(reason)
        })
      }
    }
    s.tryPlay = tryPlay

    const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); return () => target.removeEventListener(type, fn, opts) }
    const offs = [
      on(el, 'loadedmetadata', () => tryPlay('loadedmetadata')),
      on(el, 'loadeddata', () => { clearTimeout(timers.start); tryPlay('loadeddata') }),
      on(el, 'canplay', () => tryPlay('canplay')),
      on(el, 'canplaythrough', () => tryPlay('canplaythrough')),
      on(el, 'playing', () => {
        if (introActive()) { // the welcome intro is still covering the page: keep the video parked on its first frame and start it at the reveal
          st.parked = true
          el.pause()
          el.currentTime = 0
          return
        }
        if (st.parked) { st.parked = false; el.currentTime = 0 } // started by the browser a moment before the reveal: begin from the start
        clearTimeout(timers.start)
        clearTimeout(timers.stall)
        st.playing = true
        st.attempts = 0
        state('playing')
        if (st.problem || st.srcRetries) { info('recovered: the video is playing', describe(el)); st.problem = false }
        onPlaying(layer.key)
      }),
      on(el, 'waiting', () => {
        state('buffering')
        clearTimeout(timers.stall)
        timers.stall = window.setTimeout(() => { if (!s.dead && el.readyState < 3 && !s.hold) { warn('the video has been buffering too long', describe(el)); reloadSource('stalled') } }, STALL_WATCHDOG_MS)
      }),
      on(el, 'stalled', () => warn('the network stalled while loading the video', describe(el))),
      on(el, 'pause', () => { // a pause we did not ask for (power saving, an overlay, the browser): ask again
        st.playing = false
        if (!s.dead && !st.parked) state('paused')
        if (!s.hold && !document.hidden && !el.ended && !s.dead && !st.parked) scheduleRetry('unexpected pause')
      }),
      on(el, 'ended', () => { el.currentTime = 0; tryPlay('ended') }),
      on(el, 'error', () => {
        const code = el.error?.code
        if (code === 1) return // MEDIA_ERR_ABORTED: we cancelled it ourselves
        fail('the video element reported an error', describe(el))
        st.problem = true
        state('error')
        reloadSource(code === 4 ? 'unsupported or unreachable source' : 'media error')
      }),
      on(document, 'visibilitychange', () => { if (!document.hidden) { st.attempts = 0; tryPlay('tab visible') } }),
      on(window, 'pageshow', (e) => { if (e.persisted) { st.attempts = 0; tryPlay('pageshow') } }), // back/forward cache
      on(window, 'online', () => { st.attempts = 0; if (el.error || el.networkState === 3) reloadSource('network is back'); else tryPlay('online') }),
    ]

    // never silently stuck: if nothing has loaded after a long time, reload the source (bounded)
    timers.start = window.setTimeout(() => { if (!s.dead && el.readyState === 0) { warn('no video data after a long wait (slow or failing network)', describe(el)); reloadSource('no data') } }, START_WATCHDOG_MS)
    if (el.readyState >= 2) tryPlay('already loaded')

    return () => {
      s.dead = true
      Object.values(timers).forEach(clearTimeout)
      s.dropGesture?.()
      offs.forEach((off) => off())
      el.pause()
      // Release the decoder and the network connection, but only once the element is really gone (React StrictMode runs this cleanup
      // right after mount in development while the element is still on the page).
      window.setTimeout(() => {
        if (el.isConnected) return
        el.removeAttribute('src')
        el.load()
      }, 0)
    }
  }, [layer.key, layer.url]) // eslint-disable-line react-hooks/exhaustive-deps -- the callbacks are stable enough; re-running would reload the video

  // scrolled out of view: pause the decoder; back in view, the intro finished, or anything else that may have blocked it: ask again
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (hold) el.pause()
    else ctl.current.tryPlay('resume')
  }, [hold, resumeSignal])

  return (
    <video
      ref={ref}
      src={src}
      poster={layer.poster || undefined}
      autoPlay muted loop playsInline preload="auto" disablePictureInPicture disableRemotePlayback tabIndex={-1} aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover object-center transition-opacity ease-in-out motion-reduce:transition-none"
      style={{ opacity: layer.ready ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
      onTransitionEnd={(e) => { if (e.propertyName === 'opacity' && layer.ready) onFaded(layer.key) }}
    />
  )
}

export default function HeroVideo() {
  const reduce = useReducedMotion()
  const intro = useIntroState()
  const box = useRef(null)
  const loadRef = useRef(() => {})
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
    let failures = 0
    let empty = 0
    const load = async () => {
      if (controller) return // one request at a time
      window.clearTimeout(timer)
      controller = new AbortController()
      lastLoad = Date.now()
      let wait = SCHEDULE_RETRY_MS[0]
      try {
        const body = await api('/api/public/hero-video', { signal: controller.signal, timeoutMs: SCHEDULE_TIMEOUT_MS })
        if (cancelled) return
        if (failures) info(`the schedule request succeeded again after ${failures} failure(s)`)
        failures = 0
        wait = Math.max(5, Math.min(body.check_again_in_seconds || 600, 600)) * 1000
        const a = body.active
        if (!a && empty < 2) { // an empty answer while a video is playing is far more likely a hiccup than a real change: keep playing and ask again shortly
          empty += 1
          wait = 15000
        } else if (a) empty = 0
        if (!a && empty < 2) return
        setPoster(a?.poster_url || null)
        setLayers((cur) => {
          if (!a) return []
          const key = `${a.id}|${a.url}`
          if (cur.length && cur[cur.length - 1].key === key) return cur // unchanged: no reload, no flicker (a replaced file has a new URL, so it does reload)
          return [...cur, { key, id: a.id, url: a.url, poster: a.poster_url, ready: false }].slice(-2)
        })
      } catch (err) {
        if (cancelled || err?.name === 'AbortError') return
        failures += 1
        wait = SCHEDULE_RETRY_MS[Math.min(failures - 1, SCHEDULE_RETRY_MS.length - 1)] // keep trying soon while nothing is showing
        warn('could not load the homepage video schedule', { status: err?.status, code: err?.code, message: err?.message, attempt: failures, retryInMs: wait })
      } finally {
        controller = null
        if (!cancelled) timer = window.setTimeout(load, wait + Math.random() * 1500)
      }
    }
    loadRef.current = load
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad > 30000) load()
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

  // Once the newest video has finished fading in, drop the older one (on the real transitionend; the timer is only a safety net for a hidden tab)
  const dropOlder = (key) => setLayers((cur) => (cur.length > 1 && cur[cur.length - 1].key === key && cur[cur.length - 1].ready ? cur.slice(-1) : cur))
  const reported = useRef(new Set())
  const report = (key, ok, code) => { // tell the server whether this video played (diagnostics only; failures make it re-check the stored file)
    const tag = `${key}|${ok}`
    if (reported.current.has(tag)) return
    reported.current.add(tag)
    api('/api/public/hero-video/report', { method: 'POST', body: { video_id: key.split('|')[0], ok, code: code ? String(code).slice(0, 60) : null }, timeoutMs: 8000 }).catch(() => {})
  }
  const ready = (key) => {
    report(key, true)
    setLayers((cur) => cur.map((l) => (l.key === key ? { ...l, ready: true } : l)))
    window.setTimeout(() => dropOlder(key), FADE_MS * 4)
  }
  const failed = (key, why) => {
    report(key, false, why)
    setLayers((cur) => cur.filter((l) => l.key !== key))
    window.setTimeout(() => loadRef.current(), 3000) // the schedule may have moved on (or the address changed): ask again soon
    warn(`removed a video that could not be played (${why}); showing the poster / built-in background`)
  }

  const shown = !still && layers.some((l) => l.ready)
  return (
    <div ref={box} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" data-hero-video={still ? 'poster' : shown ? 'playing' : layers.length ? 'loading' : 'fallback'}>
      {(still || !shown) && poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover object-center" decoding="async" />}
      {!still && layers.map((l) => <Layer key={l.key} layer={l} hold={offscreen} resumeSignal={intro} onPlaying={ready} onFail={failed} onFaded={dropOlder} />)}
      {/* readability: a soft dark veil plus a gradient that is strongest behind the text and fades into the page below */}
      {(shown || (still && poster)) && <div className="absolute inset-0 bg-night/45" />}
      {(shown || (still && poster)) && <div className="absolute inset-0 bg-gradient-to-b from-night/70 via-night/20 to-night" />}
    </div>
  )
}
