import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import MiniBot from '../art/MiniBot.jsx'

// How the bot reacts when it reaches each nav item (poses are defined in MiniBot.jsx).
const POSE_FOR = { '/about': 'point', '/services': 'hold', '/products': 'point', '/industries': 'wave', '/insights': 'point', '/our-network': 'hold', '/our-team': 'cheer', '/career': 'reach', '/contact': 'cheer' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * The header's mini-bot. It normally stands on the letter "A" of "LAX360" ("rest").
 *
 *  - intro:   on page load it drops in with a bounce, lands on the "A" and waves hello.
 *  - rest:    wherever it wanders it always settles above the ACTIVE page's link (the "A" on Home / pages outside the nav).
 *             Hovering never changes that; navigating to another page makes it hop to the new active link.
 *  - click:   clicking a nav link makes it take off and hop/walk along the navbar to that link, land with a
 *             bounce and react. Navigation itself is never delayed or blocked.
 *  - hover:   after a short debounce it hops to the hovered link and points at it; it returns when the pointer leaves.
 *  - idle:    every ~30-45s, if nothing else is going on, it does a tiny bounce + wave (or a short walk to the first
 *             link and back). Paused while the page is scrolling, hidden, or the pointer is on the nav; no travel on touch.
 *
 * Positions are measured from the DOM (`measureRest`, `measureLink`), never hard-coded, and re-measured on resize,
 * font load and theme/size changes. Motion uses the Web Animations API with transforms only (GPU friendly).
 * The bot is decorative: aria-hidden, pointer-events: none. Under reduced motion it just stands on the "A".
 *
 * Imperative API (via ref): click(path), hover(path), leave().
 */
const HeaderBot = forwardRef(function HeaderBot({ active, measureRest, measureLink, size }, ref) {
  const reduce = useReducedMotion()
  const elRef = useRef(null)
  const [pose, setPose] = useState('idle')
  const props = useRef({})
  props.current = { active, measureRest, measureLink, size, reduce }
  const ctl = useRef(null)

  useImperativeHandle(ref, () => ({
    click: (path) => ctl.current?.click(path),
    hover: (path) => ctl.current?.hover(path),
    leave: () => ctl.current?.leave(),
    refresh: () => ctl.current?.refresh(),
  }), [])

  useEffect(() => {
    const el = elRef.current
    if (!el) return undefined
    const st = { x: 0, y: 0, token: 0, at: 'rest', hoverPath: null, clicking: false, lastScroll: 0, alive: true, hoverTimer: 0, leaveTimer: 0, idleTimer: 0, placed: false }
    const dims = () => ({ w: props.current.size, h: props.current.size * 1.25 })
    const tf = (x, y, r = 0, sx = 1, sy = 1) => {
      const { w, h } = dims()
      return `translate3d(${x - w / 2}px, ${y - h}px, 0) rotate(${r}deg) scale(${sx}, ${sy})`
    }
    const place = (x, y) => {
      st.x = x
      st.y = y
      el.style.transform = tf(x, y)
      el.style.visibility = 'visible'
      st.placed = true
    }
    const restPt = () => props.current.measureRest()
    const linkPt = (p) => props.current.measureLink(p)
    const say = (p) => st.alive && setPose(p)

    // Run keyframes, then commit the final position so animations never accumulate.
    const animate = (frames, duration, final) =>
      new Promise((resolve) => {
        const a = el.animate(frames, { duration, fill: 'forwards' })
        a.onfinish = () => { place(final.x, final.y); a.cancel(); resolve(true) }
        a.oncancel = () => resolve(false)
      })

    // One hop from a to b: crouch, leap with a lean, land with a squash.
    const hop = (a, b, { apex = 10, duration = 270, crouch = false } = {}) => {
      const lean = Math.sign(b.x - a.x) * 8
      return animate([
        { transform: tf(a.x, a.y, 0, crouch ? 1.16 : 1.06, crouch ? 0.82 : 0.94), offset: 0, easing: 'cubic-bezier(.2,.7,.4,1)' },
        { transform: tf((a.x + b.x) / 2, Math.min(a.y, b.y) - apex, lean, 0.94, 1.08), offset: 0.5, easing: 'cubic-bezier(.6,0,.9,.5)' },
        { transform: tf(b.x, b.y, lean / 2, 1.12, 0.88), offset: 0.88, easing: 'ease-out' },
        { transform: tf(b.x, b.y, 0, 1, 1), offset: 1 },
      ], duration, b)
    }

    // Small landing bounce in place.
    const bounce = (h = 6) => {
      const { x, y } = st
      return animate([
        { transform: tf(x, y, 0, 1.12, 0.88), offset: 0, easing: 'ease-out' },
        { transform: tf(x, y - h, 0, 0.94, 1.08), offset: 0.45, easing: 'ease-in' },
        { transform: tf(x, y, 0, 1.08, 0.92), offset: 0.8, easing: 'ease-out' },
        { transform: tf(x, y, 0, 1, 1), offset: 1 },
      ], 380, { x, y })
    }

    // Walk/hop in short steps from the current spot to `to`. Returns false if superseded.
    const travel = async (to, my) => {
      const start = { x: st.x, y: st.y }
      const dist = Math.abs(to.x - start.x)
      if (dist < 6 && Math.abs(to.y - start.y) < 6) return st.token === my
      const n = Math.max(1, Math.round(dist / 90))
      let from = start
      for (let i = 1; i <= n; i += 1) {
        if (st.token !== my) return false
        const pt = { x: start.x + ((to.x - start.x) * i) / n, y: start.y + ((to.y - start.y) * i) / n }
        // eslint-disable-next-line no-await-in-loop
        const ok = await hop(from, pt, { apex: i === 1 ? 14 : 10, crouch: i === 1, duration: 250 + Math.min(40, dist / 20) })
        if (!ok) return false
        from = pt
        if (i < n) await sleep(30) // tiny "step" pause between hops
      }
      return st.token === my
    }

    const goRest = async (my) => {
      const r = restPt()
      if (!r) return
      if (Math.abs(r.x - st.x) < 6 && Math.abs(r.y - st.y) < 6) { st.at = 'rest'; say('idle'); return } // already home
      say('jump')
      if (!(await travel(r, my))) return
      st.at = 'rest'
      await bounce(5)
      if (st.token === my) say('idle')
    }

    const reachLink = async (path, my) => {
      const t = linkPt(path)
      if (!t) return false
      say('jump')
      if (!(await travel(t, my))) return false
      st.at = path
      await bounce(6)
      if (st.token !== my) return false
      say(POSE_FOR[path] || 'point')
      return true
    }

    const api = {
      // Click: start travelling right away; navigation continues in parallel (handled by the router).
      async click(path) {
        if (props.current.reduce) return
        clearTimeout(st.hoverTimer)
        clearTimeout(st.leaveTimer)
        const my = ++st.token
        st.clicking = true
        if (!(await reachLink(path, my))) { if (st.token === my) st.clicking = false; return }
        await sleep(1500)
        if (st.token !== my) return
        st.clicking = false
        // The clicked page is now the active one, so its link is the new resting place; otherwise head back home.
        if (path === props.current.active) { st.at = 'rest'; say('idle'); return }
        if (st.hoverPath) return // pointer is still over the nav: stay until it leaves
        await goRest(my)
      },
      hover(path) {
        if (props.current.reduce || st.clicking) return
        clearTimeout(st.leaveTimer)
        clearTimeout(st.hoverTimer)
        st.hoverPath = path
        st.hoverTimer = setTimeout(async () => {
          if (st.clicking) return
          if (st.at === path || (st.at === 'rest' && props.current.active === path)) { say(POSE_FOR[path] || 'point'); return }
          const my = ++st.token
          await reachLink(path, my)
        }, 220) // debounce: fast mouse sweeps don't make it jump around
      },
      // The active page changed (link click, logo, footer, back button…): settle above the new active page.
      sync() {
        if (!st.placed || st.clicking) return
        if (props.current.reduce) { const r = restPt(); if (r) place(r.x, r.y); st.at = 'rest'; return }
        if (st.hoverPath) return // pointer on the nav: leave() sends it to the (new) active page afterwards
        goRest(++st.token)
      },
      refresh() {
        if (!st.placed || el.getAnimations().length) return
        const target = st.at === 'rest' ? restPt() : linkPt(st.at) || restPt()
        if (target) place(target.x, target.y)
      },
      leave() {
        st.hoverPath = null
        clearTimeout(st.hoverTimer)
        clearTimeout(st.leaveTimer)
        st.leaveTimer = setTimeout(() => {
          if (st.at !== 'rest' && !st.clicking) goRest(++st.token)
          else if (st.at === 'rest') say('idle')
        }, 700)
      },
    }
    ctl.current = api

    // Greeting: drop in above the "A", bounce twice, then wave.
    const intro = async () => {
      const r = restPt()
      if (!r) return
      const my = ++st.token
      st.x = r.x
      st.y = r.y
      el.style.visibility = 'visible'
      say('jump')
      await animate([
        { transform: tf(r.x, -60, -14, 1, 1), offset: 0, easing: 'cubic-bezier(.4,0,.9,.6)' },
        { transform: tf(r.x, r.y + 1, 0, 1.18, 0.82), offset: 0.52, easing: 'ease-out' },
        { transform: tf(r.x, r.y - 13, 0, 0.94, 1.1), offset: 0.7, easing: 'ease-in' },
        { transform: tf(r.x, r.y, 0, 1.1, 0.9), offset: 0.84, easing: 'ease-out' },
        { transform: tf(r.x, r.y - 4, 0, 0.98, 1.03), offset: 0.93, easing: 'ease-in' },
        { transform: tf(r.x, r.y, 0, 1, 1), offset: 1 },
      ], 1150, r)
      if (st.token !== my) return
      st.at = 'rest'
      say('wave')
      await sleep(2600)
      if (st.token === my && st.at === 'rest') say('idle')
    }

    // Occasional, quiet activity. Skipped whenever anything else is happening.
    const scheduleIdle = () => {
      clearTimeout(st.idleTimer)
      st.idleTimer = setTimeout(async () => {
        const calm = !document.hidden && Date.now() - st.lastScroll > 3500 && !st.hoverPath && !st.clicking && st.at === 'rest'
        const canTravel = window.matchMedia('(hover: hover)').matches && !props.current.active && Boolean(linkPt('/about'))
        if (calm && !props.current.reduce) {
          const my = ++st.token
          if (canTravel && Math.random() < 0.35) {
            if (await reachLink('/about', my)) { await sleep(1300); if (st.token === my) await goRest(my) }
          } else {
            await bounce(6)
            if (st.token === my) { say('wave'); await sleep(2200); if (st.token === my) say('idle') }
          }
        }
        scheduleIdle()
      }, 30000 + Math.random() * 15000)
    }

    const refresh = () => api.refresh()
    const onScroll = () => { st.lastScroll = Date.now() }

    let cancelled = false
    const start = async () => {
      if (document.fonts?.ready) await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      if (cancelled) return
      const r = restPt()
      if (!r) return
      if (props.current.reduce) {
        place(r.x, r.y) // static: just stands on the "A"
        return
      }
      await sleep(900) // let the header's own drop-in finish first
      if (cancelled) return
      await intro()
      scheduleIdle()
    }
    start()

    window.addEventListener('resize', refresh)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelled = true
      st.alive = false
      clearTimeout(st.hoverTimer)
      clearTimeout(st.leaveTimer)
      clearTimeout(st.idleTimer)
      el.getAnimations().forEach((a) => a.cancel())
      window.removeEventListener('resize', refresh)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Navigated to another page: animate to the new active page.
  useEffect(() => { ctl.current?.sync() }, [active])

  // Re-place after a size change (breakpoint) while resting.
  useEffect(() => {
    const el = elRef.current
    const r = props.current.measureRest()
    if (el && r && el.style.visibility === 'visible' && !el.getAnimations().length) {
      const { w, h } = { w: size, h: size * 1.25 }
      el.style.transform = `translate3d(${r.x - w / 2}px, ${r.y - h}px, 0)`
    }
  }, [size])

  return (
    <div ref={elRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 will-change-transform" style={{ visibility: 'hidden', transformOrigin: '50% 100%' }}>
      <MiniBot pose={pose} size={size} />
    </div>
  )
})

export default HeaderBot
