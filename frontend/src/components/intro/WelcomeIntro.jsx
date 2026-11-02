import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m, useAnimationFrame } from 'framer-motion'
import { setIntroState } from '../../utils/welcomeIntro.js'
import { INTRO_ICONS } from './introIcons.js'

/**
 * LAX360 welcome intro (~10 s, skippable). It plays on every full page load of the homepage. It uses ONLY the site's existing brand files,
 * unmodified:  robot: /assets/mascot-welcome.webp   logo: /assets/logo-shield.png
 * Both are single static images, so the "acting" is whole-image transforms (walk bob, lean, squash, hop, shake) plus a drawn rope and light
 * effects. Nothing is redrawn or recoloured.
 *
 * Sequence: robot walks in and waves -> "WELCOME TO LAX360!" is revealed letter by letter (the robot hops with it) -> the robot hauls the
 * official logo to the centre on a rope -> the logo bounces and settles with a glow -> 26 service icons (software, AI, AI tools, marketing,
 * CAD) rain down, bounce and settle in front -> the logo flies into the header and the homepage is revealed.
 *
 * The animation is a pure function of time (`robotAt`, `logoAt`, `iconAt`): each frame the elapsed milliseconds become transforms written
 * straight to the DOM (no React renders per frame), so it is deterministic and easy to skip. Everything is laid out on a fixed "stage"
 * (1280x720 landscape / 600x1280 portrait) that is scaled to fit the screen.
 */
const ROBOT_SRC = '/assets/mascot-welcome.webp' // 480 x 722
const LOGO_SRC = '/assets/logo-shield.png' // 284 x 302
const ROBOT_RATIO = 480 / 722
const LOGO_RATIO = 284 / 302
const HAND = { x: 0.4, y: 0.72 } // where the rope-holding hand sits inside the mascot image (fractions of its width / height)
const TITLE = 'WELCOME TO LAX360!'

// Timeline (ms)
const WALK_END = 1100
const TEXT_IN = 1350
const GREET_END = 3000
const MOVE_END = 3500
const PULL_START = 3450
const PULL_END = 4550
const SETTLE_END = 5200
const SHOWER_START = 4950
const REVEAL_START = 8000
const FLY_END = 9000
const WAVE_END = 9800

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a, b, u) => a + (b - a) * u
const seg = (t, a, b) => clamp((t - a) / (b - a))
const easeOut = (u) => 1 - (1 - u) ** 3
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2)
const smooth = (u) => u * u * (3 - 2 * u)

function layoutFor(portrait) {
  const c = portrait
    ? { w: 600, h: 1280, ground: 1000, rh: 340, lh: 200, greetX: 300, pullX: 455, sideX: 480, logoCX: 220, capY: 250, cap: 46, rows: [1074, 1128, 1182], perRow: 9, tile: 46, step: 54 }
    : { w: 1280, h: 720, ground: 600, rh: 400, lh: 220, greetX: 640, pullX: 1010, sideX: 1150, logoCX: 640, capY: 40, cap: 72, rows: [646, 694], perRow: 13, tile: 44, step: 58 }
  return { ...c, portrait, rw: c.rh * ROBOT_RATIO, lw: c.lh * LOGO_RATIO, logoCY: c.ground - c.lh / 2 }
}

// ---- robot ---------------------------------------------------------------------------------------------------------------------------
// Pull in three tugs with pauses between them (the rope goes slack, the robot recoils, then heaves again).
const STAGES = [[0, 0.26, 0, 0.34], [0.26, 0.38, 0.34, 0.34], [0.38, 0.64, 0.34, 0.7], [0.64, 0.76, 0.7, 0.7], [0.76, 1, 0.7, 1]]
function pullProgress(u) {
  for (const [a, b, c, d] of STAGES) if (u <= b) return lerp(c, d, easeInOut(seg(u, a, b)))
  return 1
}
const pullEffort = (u) => clamp(((pullProgress(Math.min(1, u + 0.012)) - pullProgress(Math.max(0, u - 0.012))) / 0.024) * 0.75)

function robotAt(t, L) {
  const r = { cx: L.greetX, lift: 0, rot: 0, sx: 1, sy: 1, alpha: 1, effort: 0 }
  if (t < WALK_END) { // walks in from the left, slowing to a stop
    const u = t / WALK_END
    r.cx = lerp(-L.rw * 0.6, L.greetX, easeOut(u))
    const amp = 1 - smooth(seg(u, 0.8, 1))
    const p = u * Math.PI * 2 * 4
    r.lift = -Math.abs(Math.sin(p)) * 16 * amp
    r.rot = Math.sin(p) * 3.2 * amp
    r.sy = 1 - 0.03 * Math.abs(Math.cos(p)) * amp - 0.05 * Math.sin(Math.PI * seg(t, WALK_END - 120, WALK_END + 160))
  } else if (t < GREET_END) { // stops, looks at the visitor and waves; hops in time with the letters of the welcome text
    const g = t - WALK_END
    r.rot = Math.sin(g / 150) * 3.5 * smooth(seg(g, 100, 300))
    const look = smooth(seg(t, 1250, 1550)) * (1 - smooth(seg(t, 2800, 3000)))
    r.sx = r.sy = 1 + 0.05 * look
    const textBeat = seg(t, TEXT_IN, TEXT_IN + 1000) // letters arriving: a hop with each wave of letters
    r.lift = -Math.abs(Math.sin(g / 260)) * 4 - Math.abs(Math.sin((t - TEXT_IN) / 125)) * 12 * (t > TEXT_IN ? 1 - textBeat : 0)
    const flourish = t > TEXT_IN + 1050 ? Math.exp(-(t - TEXT_IN - 1050) / 180) : 0 // the finishing flourish when the text has landed
    r.lift -= 26 * flourish * Math.abs(Math.sin((t - TEXT_IN - 1050) / 90))
  } else if (t < MOVE_END) { // turns towards the left edge and shuffles to the pulling spot
    const u = seg(t, GREET_END, MOVE_END)
    r.cx = lerp(L.greetX, L.pullX, easeInOut(u))
    r.sx = 1 - 0.18 * Math.sin(Math.PI * seg(u, 0, 0.5))
    r.lift = -Math.abs(Math.sin(u * Math.PI * 3)) * 10
    r.rot = -4 * Math.sin(Math.PI * u)
  } else if (t < PULL_END) { // heaves the rope: leans back, strains, recoils between tugs
    const u = seg(t, PULL_START, PULL_END)
    const k = Math.max(0.12, pullEffort(u))
    r.cx = L.pullX - 7 * k + Math.sin(t / 31) * 2 * k
    r.rot = 8 * k + Math.sin(t / 38) * 1.3 * k
    r.sy = 1 - 0.025 * k
    r.effort = k
  } else if (t < REVEAL_START) { // pleased hop, then stays beside the logo presenting it while the icons rain down
    const s = t - PULL_END
    r.cx = L.pullX - 12 * smooth(seg(s, 0, 500))
    r.rot = lerp(8, -5, easeOut(seg(s, 0, 420))) + Math.sin(s / 120) * 1.5 * smooth(seg(s, 300, 500)) + Math.sin(s / 520) * 1.2 * smooth(seg(s, 600, 900))
    r.lift = -20 * Math.exp(-s / 170) * Math.abs(Math.sin(s / 75)) - Math.abs(Math.sin(s / 430)) * 3.5 * smooth(seg(s, 700, 1000))
  } else { // moves to the side and gives a last wave, then fades away
    const u = easeInOut(seg(t, REVEAL_START, FLY_END))
    r.cx = lerp(L.pullX - 12, L.sideX, u)
    r.sx = r.sy = lerp(1, 0.74, u)
    r.rot = lerp(-5, 0, u) + Math.sin((t - FLY_END) / 140) * 4 * smooth(seg(t, FLY_END - 200, FLY_END + 100))
    r.lift = -Math.abs(Math.sin((t - REVEAL_START) / 190)) * 5 * (1 - u)
    r.alpha = 1 - smooth(seg(t, WAVE_END - 380, WAVE_END))
  }
  return r
}

// ---- logo ----------------------------------------------------------------------------------------------------------------------------
function logoAt(t, L, hdr) {
  const lg = { cx: -L.lw * 0.7, cy: L.logoCY, lift: 0, rot: 0, sx: 1, sy: 1, scale: 1, alpha: 1 }
  const endX = L.logoCX
  if (t < PULL_START) return lg
  if (t < PULL_END) { // dragged in from beyond the left edge to the centre, overshooting a little
    const u = seg(t, PULL_START, PULL_END)
    lg.cx = lerp(-L.lw * 0.7, endX + 22, pullProgress(u))
    lg.rot = Math.sin(t / 55) * 2.2 * (1 - u * 0.6)
    lg.lift = -Math.abs(Math.sin(t / 110)) * 3
  } else if (t < REVEAL_START) { // overshoot springs back, small realistic bounces, comes to rest and stays put (sharp, unrotated)
    const s = t - PULL_END
    lg.cx = endX + 22 * Math.exp(-s / 110) * Math.cos(s / 55)
    lg.lift = -46 * Math.exp(-s / 160) * Math.abs(Math.sin(s / 95))
    lg.rot = 3 * Math.exp(-s / 200) * Math.sin(s / 60)
    lg.sy = 1 - 0.05 * Math.exp(-s / 170) * (1 - Math.abs(Math.sin(s / 95)))
  } else { // flies to its place in the website header
    const u = easeInOut(seg(t, REVEAL_START + 80, FLY_END))
    lg.cx = lerp(endX, hdr.x, u)
    lg.cy = lerp(L.logoCY, hdr.y, u)
    lg.scale = lerp(1, hdr.scale, u)
    lg.alpha = 1 - smooth(seg(t, FLY_END - 60, FLY_END + 140))
  }
  return lg
}

// ---- falling icons ---------------------------------------------------------------------------------------------------------------------
const GRAVITY = 2300 // stage px / s^2
const RESTITUTION = 0.38 // each bounce keeps 38% of the impact speed (soft objects)

/** Closed-form drop and bounce: y(tau) from release, plus how long ago the last impact was and how hard it was. */
function dropAt(tau, startY, floorY, g) {
  const t1 = Math.sqrt((2 * (floorY - startY)) / g)
  if (tau < t1) return { y: startY + 0.5 * g * tau * tau, k: -1, vi: 0, fell: tau / t1 }
  let v = g * t1 * RESTITUTION
  let vi = g * t1
  let k = tau - t1
  for (let bounce = 0; bounce < 7 && v > 40; bounce += 1) {
    const dur = (2 * v) / g
    if (k < dur) return { y: floorY - (v * k - 0.5 * g * k * k), k, vi, fell: 1 }
    k -= dur
    vi = v
    v *= RESTITUTION
  }
  return { y: floorY, k, vi, fell: 1 } // at rest
}

function makeIcons(L, startY) {
  const n = INTRO_ICONS.length
  // seats in rows near the bottom; icons are seated so the categories (colours) are mixed, and the lowest row lands first
  const seats = []
  L.rows.forEach((y, row) => {
    const count = Math.min(L.perRow, n - row * L.perRow)
    for (let c = 0; c < count; c += 1) seats.push({ row, x: L.w / 2 + (c - (count - 1) / 2) * L.step + (row % 2 ? L.step * 0.18 : -L.step * 0.18), y })
  })
  const used = new Set()
  const seatFor = INTRO_ICONS.map((_, i) => { // deterministic pseudo-shuffle with no repeats
    let s = (i * 11) % n
    while (used.has(s)) s = (s + 1) % n
    used.add(s)
    return s
  })
  const rank = [...seats.keys()].sort((a, b) => seats[b].row - seats[a].row || ((a * 5) % 7) - ((b * 5) % 7))
  return INTRO_ICONS.map((icon, i) => {
    const seat = seats[seatFor[i]]
    const rnd = (k) => { const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) }
    return {
      ...icon, x: seat.x, floorY: seat.y, startY,
      delay: rank.indexOf(seatFor[i]) * 32 + rnd(1) * 60, g: GRAVITY * (0.88 + rnd(2) * 0.28), dx0: (rnd(3) - 0.5) * 220,
      tilt: (rnd(4) - 0.5) * 10, spin: (rnd(5) < 0.5 ? -1 : 1) * (40 + rnd(6) * 70), w: 6 + rnd(7) * 5, exitDelay: rnd(8) * 260,
    }
  })
}

function iconAt(t, p) {
  const tau = (t - SHOWER_START - p.delay) / 1000
  if (tau < 0) return { alpha: 0, x: p.x, y: p.startY, rot: 0, sq: 0 }
  const d = dropAt(tau, p.startY, p.floorY, p.g)
  const x = p.x + p.dx0 * (1 - smooth(clamp(d.fell)))
  const rot = p.tilt + p.spin * Math.exp(-tau / 0.7) * Math.cos(tau * p.w) * 1.4 // tumbles while falling, settles to a slight tilt
  const sq = d.k >= 0 ? clamp(d.vi / 1000) * 0.3 * Math.exp(-d.k * 20) : 0 // squashes on every impact, harder for the first
  const exit = seg(t, REVEAL_START + p.exitDelay, REVEAL_START + p.exitDelay + 420) // after the show the icons drop away
  return { alpha: 1 - smooth(exit), x, y: d.y + exit * exit * 180, rot, sq }
}

const PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.2
  return { dx: Math.cos(a) * (120 + (i % 4) * 34), dy: Math.sin(a) * (92 + (i % 3) * 30) - 20, size: 5 + (i % 3) * 2, blue: i % 3 === 0, delay: (i % 5) * 0.02 }
})

// letter colours run from white through lavender to sky blue across the title
const LETTER_STOPS = [[255, 255, 255], [221, 214, 254], [167, 139, 250], [125, 190, 255]]
function letterColor(i, n) {
  const u = (i / Math.max(1, n - 1)) * (LETTER_STOPS.length - 1)
  const a = LETTER_STOPS[Math.floor(u)]
  const b = LETTER_STOPS[Math.min(LETTER_STOPS.length - 1, Math.floor(u) + 1)]
  const f = u - Math.floor(u)
  return `rgb(${a.map((v, k) => Math.round(lerp(v, b[k], f))).join(',')})`
}

function preload(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => (img.decode ? img.decode().then(resolve, resolve) : resolve())
    img.onerror = () => reject(new Error(`could not load ${src}`))
    img.src = src
  })
}

// Development only (removed from production builds): /?introT=4100 freezes the intro at that millisecond so a frame can be inspected.
const FREEZE_AT = import.meta.env.DEV ? (Number(new URLSearchParams(window.location.search).get('introT')) || null) : null

/** "WELCOME TO LAX360!": every letter springs up out of a blur with a bright flash as it lands, one after another. */
function WelcomeText({ size }) {
  const letters = [...TITLE]
  return (
    <m.p className="whitespace-nowrap font-display font-bold tracking-tight" style={{ fontSize: size, lineHeight: 1.05, perspective: 600 }} exit={{ opacity: 0, y: -22, filter: 'blur(6px)' }} transition={{ duration: 0.4 }}>
      {letters.map((ch, i) => (
        <m.span
          key={i}
          className="inline-block"
          style={{ color: letterColor(i, letters.length), textShadow: '0 0 28px rgba(124,58,237,0.75), 0 0 60px rgba(59,130,246,0.35)', transformOrigin: '50% 100%' }}
          initial={{ opacity: 0, y: 46, scale: 0.7, rotateX: -80, filter: 'blur(10px) brightness(1)' }}
          animate={{ opacity: 1, y: [46, -10, 0], scale: [0.7, 1.1, 1], rotateX: [-80, 8, 0], filter: ['blur(10px) brightness(1)', 'blur(0px) brightness(2)', 'blur(0px) brightness(1)'] }}
          transition={{ duration: 0.85, times: [0, 0.55, 1], ease: 'easeOut', delay: i * 0.045 }}
        >
          {ch === ' ' ? ' ' : ch}
        </m.span>
      ))}
    </m.p>
  )
}

export default function WelcomeIntro() {
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [caption, setCaption] = useState(false)
  const [burst, setBurst] = useState(false)
  const [view, setView] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const L = layoutFor(view.w < view.h)
  const scale = Math.min(view.w / L.w, view.h / L.h)
  const icons = useMemo(() => makeIcons(L, -((view.h - L.h * scale) / 2) / scale - 90), [L.portrait, view.w, view.h]) // eslint-disable-line react-hooks/exhaustive-deps

  const refs = useRef({})
  const iconEls = useRef([])
  const t0 = useRef(null)
  const live = useRef({ L, scale, view, icons, hdr: null, caption: false, burst: false, revealing: false, finished: false })
  live.current.L = L
  live.current.scale = scale
  live.current.view = view
  live.current.icons = icons

  const finish = useCallback(() => {
    const s = live.current
    if (s.finished) return
    s.finished = true
    setIntroState('done')
    setDone(true)
  }, [])

  // keep the stage fitted to the screen
  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // preload only the two brand images; if either fails (or is slow) skip the intro and show the homepage
  useEffect(() => {
    let cancelled = false
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    Promise.race([Promise.all([preload(ROBOT_SRC), preload(LOGO_SRC)]), timeout])
      .then(() => { if (!cancelled) setReady(true) })
      .catch(() => { if (!cancelled) { setIntroState('off'); setDone(true) } })
    return () => { cancelled = true }
  }, [])

  // run: lock scrolling and the page underneath while the intro plays
  useLayoutEffect(() => {
    if (!ready) return undefined
    const page = document.getElementById('root')
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    if (page) page.inert = true
    setIntroState('playing')
    return () => {
      html.style.overflow = prevOverflow
      if (page) page.inert = false
      if (!live.current.finished) { // unmounted early (navigated away): leave the site in a clean state
        live.current.finished = true
        setIntroState('off')
      }
    }
  }, [ready])

  // the page is usable again as soon as the reveal starts
  const startReveal = useCallback(() => {
    const s = live.current
    if (s.revealing) return
    s.revealing = true
    const page = document.getElementById('root')
    if (page) page.inert = false
    setIntroState('revealing')
  }, [])

  // Skip: reveal the homepage at once (the hero's entrance animations snap to their end state instead of replaying their delays)
  const skip = useCallback(() => {
    const html = document.documentElement
    html.setAttribute('data-intro-skip', '')
    window.setTimeout(() => html.removeAttribute('data-intro-skip'), 400)
    startReveal()
    finish()
  }, [finish, startReveal])

  // keyboard: Esc skips; focus the Skip button so it is the first Tab stop
  useEffect(() => {
    if (!ready) return undefined
    refs.current.skip?.focus({ preventScroll: true })
    const onKey = (e) => { if (e.key === 'Escape') skip() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, skip])

  // where the real header logo is, so the intro logo can land exactly on it
  const measureHeaderLogo = useCallback(() => {
    const s = live.current
    const img = document.querySelector('header img[src$="logo-shield.png"]')
    const rect = img?.getBoundingClientRect()
    const { w, h } = s.view
    const ox = (w - s.L.w * s.scale) / 2
    const oy = (h - s.L.h * s.scale) / 2
    if (!rect || !rect.width) return { x: s.L.w * 0.08, y: s.L.h * 0.07, scale: 0.18 }
    return { x: (rect.left + rect.width / 2 - ox) / s.scale, y: (rect.top + rect.height / 2 - oy) / s.scale, scale: rect.height / s.scale / s.L.lh }
  }, [])

  useAnimationFrame((time) => {
    const s = live.current
    if (!ready || s.finished) return
    if (t0.current === null) t0.current = time
    const t = FREEZE_AT ?? time - t0.current
    const { L: lay } = s
    const r = refs.current
    if (t >= REVEAL_START - 400 && !s.hdr) s.hdr = measureHeaderLogo()
    if (t >= REVEAL_START + 100) startReveal()

    const robot = robotAt(t, lay)
    const logo = logoAt(t, lay, s.hdr || { x: lay.w * 0.1, y: 60, scale: 0.2 })

    if (r.robot) {
      r.robot.style.transform = `translate3d(${robot.cx - lay.rw / 2}px, ${lay.ground - lay.rh + robot.lift}px, 0) rotate(${robot.rot}deg) scale(${robot.sx}, ${robot.sy})`
      r.robot.style.opacity = robot.alpha
    }
    if (r.robotShadow) {
      const lifted = clamp(-robot.lift / 30)
      r.robotShadow.style.transform = `translate3d(${robot.cx - lay.rw * 0.4}px, ${lay.ground - 14}px, 0) scale(${(1 - lifted * 0.2) * robot.sx}, 1)`
      r.robotShadow.style.opacity = robot.alpha * 0.6 * (t < REVEAL_START ? 1 : 1 - seg(t, REVEAL_START, FLY_END))
    }
    if (r.logo) {
      r.logo.style.transform = `translate3d(${logo.cx - lay.lw / 2}px, ${logo.cy - lay.lh / 2 + logo.lift}px, 0) rotate(${logo.rot}deg) scale(${logo.scale * logo.sx}, ${logo.scale * logo.sy})`
      r.logo.style.opacity = logo.alpha
    }
    if (r.logoShadow) {
      const air = clamp(-logo.lift / 50)
      r.logoShadow.style.transform = `translate3d(${logo.cx - lay.lw * 0.5}px, ${lay.ground - 12}px, 0) scale(${1 - air * 0.3}, 1)`
      r.logoShadow.style.opacity = (t >= PULL_START - 200 ? 0.7 - air * 0.3 : 0) * (t < REVEAL_START ? 1 : 1 - seg(t, REVEAL_START, REVEAL_START + 300))
    }
    if (r.glow) { // bright at the moment of arrival, then a calm purple / electric-blue halo that stays behind the logo
      const arrive = smooth(seg(t, PULL_END - 100, PULL_END + 300))
      const calm = lerp(1, 0.55, smooth(seg(t, PULL_END + 300, PULL_END + 1100)))
      r.glow.style.opacity = arrive * calm * (1 - smooth(seg(t, REVEAL_START, REVEAL_START + 450))) * (0.9 + 0.1 * Math.sin(t / 220))
      r.glow.style.transform = `translate3d(${logo.cx - 260}px, ${logo.cy - 260}px, 0)`
    }
    if (r.rope) { // taut during a tug, sagging between tugs, dropped after the logo arrives
      const hand = handPoint(robot, lay)
      const end = { x: logo.cx + (lay.lw / 2) * logo.scale - 6, y: logo.cy + logo.lift }
      const sag = t < PULL_END ? 6 + 34 * (1 - robot.effort) : 6 + 34 * smooth(seg(t, PULL_END, PULL_END + 250))
      r.rope.setAttribute('d', `M ${end.x} ${end.y} Q ${(end.x + hand.x) / 2} ${(end.y + hand.y) / 2 + sag} ${hand.x} ${hand.y}`)
      r.ropeKnot?.setAttribute('cx', end.x)
      r.ropeKnot?.setAttribute('cy', end.y)
      r.ropeGroup.style.opacity = t > PULL_START - 500 && t < SETTLE_END ? (t < PULL_END + 100 ? 1 : 1 - seg(t, PULL_END + 100, PULL_END + 650)) : 0
    }
    if (r.sweat) {
      r.sweat.style.opacity = robot.effort > 0.35 && t < PULL_END ? 1 : 0
      r.sweat.style.transform = `translate3d(${robot.cx - lay.rw * 0.18}px, ${lay.ground - lay.rh * 0.78 + robot.lift + (t % 600) / 30}px, 0)`
    }
    if (t >= SHOWER_START - 100) { // the icon shower
      for (let i = 0; i < s.icons.length; i += 1) {
        const el = iconEls.current[i]
        if (!el) continue
        const ic = iconAt(t, s.icons[i])
        el.style.opacity = ic.alpha
        if (ic.alpha > 0) el.style.transform = `translate3d(${ic.x - lay.tile / 2}px, ${ic.y - lay.tile}px, 0) rotate(${ic.rot}deg) scale(${1 + ic.sq * 0.55}, ${1 - ic.sq})`
      }
    }
    if (r.bg) r.bg.style.opacity = 1 - smooth(seg(t, REVEAL_START + 100, FLY_END - 100))
    if (r.root) r.root.style.pointerEvents = t > REVEAL_START + 100 ? 'none' : 'auto'
    if (r.skip) r.skip.style.opacity = 1 - seg(t, REVEAL_START, REVEAL_START + 300)

    const showText = t >= TEXT_IN && t < GREET_END
    if (showText !== s.caption) { s.caption = showText; setCaption(showText) }
    if (t >= PULL_END && !s.burst) { s.burst = true; setBurst(true) }
    if (t >= WAVE_END && FREEZE_AT === null) finish()
  })

  if (done || typeof document === 'undefined') return null
  const stageStyle = { width: L.w, height: L.h, transform: `translate(-50%, -50%) scale(${scale})` }
  const set = (name) => (el) => { refs.current[name] = el }

  return createPortal(
    <div ref={set('root')} role="dialog" aria-label="Welcome to LAX360" className="fixed inset-0 z-[1000] select-none overflow-hidden" style={{ visibility: ready ? 'visible' : 'hidden', touchAction: 'none' }}>
      <p className="sr-only" role="status">Welcome to LAX360!</p>
      {/* dark graphite backdrop with violet / electric-blue light; it fades out to reveal the homepage */}
      <div ref={set('bg')} aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 22% 18%, rgba(124,58,237,0.30), transparent 70%), radial-gradient(60% 50% at 82% 80%, rgba(59,130,246,0.22), transparent 70%), linear-gradient(180deg, #121217 0%, #0b0b0f 100%)' }} />

      <div aria-hidden="true" className="absolute left-1/2 top-1/2 origin-center" style={stageStyle}>
        <div className="absolute inset-x-0" style={{ top: L.ground - 2, height: 2, background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.55), rgba(96,165,250,0.45), transparent)', opacity: 0.55 }} />
        <div ref={set('glow')} className="absolute left-0 top-0 rounded-full opacity-0" style={{ width: 520, height: 520, background: 'radial-gradient(closest-side, rgba(124,58,237,0.55), rgba(59,130,246,0.28) 55%, transparent)' }} />
        <div ref={set('logoShadow')} className="absolute left-0 top-0 rounded-[50%] opacity-0" style={{ width: L.lw, height: 22, background: 'radial-gradient(closest-side, rgba(0,0,0,0.75), transparent)' }} />
        <div ref={set('robotShadow')} className="absolute left-0 top-0 rounded-[50%]" style={{ width: L.rw * 0.8, height: 26, background: 'radial-gradient(closest-side, rgba(0,0,0,0.7), transparent)' }} />

        <svg ref={set('ropeGroup')} className="absolute left-0 top-0 overflow-visible" width={L.w} height={L.h} style={{ opacity: 0 }}>
          <path ref={set('rope')} d="M0 0" fill="none" stroke="#e9e5ff" strokeWidth="5" strokeLinecap="round" />
          <circle ref={set('ropeKnot')} r="8" fill="#a78bfa" stroke="#e9e5ff" strokeWidth="3" />
        </svg>

        {/* the exact logo file, original proportions */}
        <img ref={set('logo')} src={LOGO_SRC} alt="" width="284" height="302" draggable="false" className="absolute left-0 top-0" style={{ width: L.lw, height: L.lh, transformOrigin: '50% 50%', filter: 'drop-shadow(0 0 22px rgba(124,58,237,0.65)) drop-shadow(0 0 40px rgba(59,130,246,0.35))' }} />

        {/* the exact mascot file, unmodified; only transformed */}
        <img ref={set('robot')} src={ROBOT_SRC} alt="" width="480" height="722" draggable="false" className="absolute left-0 top-0" style={{ width: L.rw, height: L.rh, transformOrigin: '50% 100%', willChange: 'transform' }} />

        <svg ref={set('sweat')} className="absolute left-0 top-0 opacity-0" width="26" height="34" viewBox="0 0 26 34">
          <path d="M13 2C13 2 3 15 3 22a10 10 0 0020 0C23 15 13 2 13 2z" fill="#93c5fd" stroke="#e0f2fe" strokeWidth="2" />
        </svg>

        {burst && PARTICLES.map((p, i) => (
          <m.span key={i} className="absolute rounded-full" style={{ left: L.logoCX, top: L.logoCY, width: p.size, height: p.size, background: p.blue ? '#60a5fa' : '#a78bfa', boxShadow: `0 0 12px ${p.blue ? '#60a5fa' : '#a78bfa'}` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: p.dx * (L.portrait ? 0.7 : 1), y: p.dy * (L.portrait ? 0.7 : 1), opacity: 0, scale: 0.2 }} transition={{ duration: 1.05, delay: p.delay, ease: 'easeOut' }} />
        ))}

        {/* service icons: one tile each, positioned every frame; they fall in front of the logo and robot and settle in rows at the bottom */}
        {icons.map((ic, i) => (
          <div key={i} ref={(el) => { iconEls.current[i] = el }} className="absolute left-0 top-0 grid place-items-center rounded-[28%] opacity-0"
            style={{ width: L.tile, height: L.tile, transformOrigin: '50% 100%', background: 'linear-gradient(160deg, #ffffff, #ece9fb)', boxShadow: '0 6px 16px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.7) inset', willChange: 'transform' }}>
            {ic.path
              ? <svg viewBox="0 0 24 24" width={L.tile * 0.56} height={L.tile * 0.56}><path d={ic.path} fill={ic.color} /></svg>
              : <ic.Icon size={L.tile * 0.56} color={ic.color} strokeWidth={2.1} />}
          </div>
        ))}

        <div className="absolute inset-x-0 text-center" style={{ top: L.capY, height: 0 }}>
          <AnimatePresence>{caption && <WelcomeText key="welcome" size={L.cap} />}</AnimatePresence>
        </div>
      </div>

      <button ref={set('skip')} type="button" onClick={skip} className="absolute right-4 top-4 inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:right-8 md:top-6">
        Skip intro
      </button>
    </div>,
    document.body,
  )
}

// where the rope-holding hand is on screen (stage coordinates), following the robot's lean / squash around its feet
function handPoint(robot, L) {
  const dx = (HAND.x - 0.5) * L.rw * robot.sx
  const dy = (HAND.y - 1) * L.rh * robot.sy
  const a = (robot.rot * Math.PI) / 180
  return { x: robot.cx + dx * Math.cos(a) - dy * Math.sin(a), y: L.ground + robot.lift + dx * Math.sin(a) + dy * Math.cos(a) }
}
