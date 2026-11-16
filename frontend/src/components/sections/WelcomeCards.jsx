import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown, ExternalLink } from 'lucide-react'
import PartnershipModal from '../network/PartnershipModal.jsx'
import { takeOpenRequest } from '../../utils/welcomeIntro.js'
import { createWheelGesture } from '../../utils/scrollGesture.js'
import { WelcomeBackdrop, themeOf } from '../intro/welcomeArt.jsx'

/**
 * The Welcome Pages: a sequence of FULL-SCREEN sections on the HOME PAGE, directly below the home header (hero), like pages of a website. Each page has its own immersive background,
 * headline, text and action buttons. Scrolling down from the header brings the first page to the top of the screen; from then on every scroll gesture (wheel, touchpad, swipe, arrow / page
 * keys) moves exactly ONE page: the next page slides in sideways over the current one while its background and content drift at different speeds. Scrolling on from the last page releases the
 * page and smoothly reveals the next home page section; scrolling back up from the first page (or from the sections below) returns the same way.
 *
 * The pages are the administrator's Welcome cards (Admin > Welcome cards): text, order, buttons, links, images, schedule and on/off all come from there; nothing is built into this file.
 * Nothing about them is remembered: they are always there, on every load and refresh. Scrolling is turned into one step per GESTURE by utils/scrollGesture.js. The scroll handlers are
 * attached only while the section is near the screen, so the rest of the page scrolls natively and at full speed.
 */
const EASE = [0.22, 1, 0.36, 1]
const MIN_STEP_GAP = 280 // ms between two card changes (shorter than the card animation, so the next gesture is never lost)
const TOUCH_TRIGGER = 36 // px of finger movement that changes the card
const isInternal = (href) => href.startsWith('/') && !href.startsWith('//')
const dark = (rgbList, f) => rgbList.split(',').map((n) => Math.round(Number(n) * f)).join(',') // a deeper shade of an accent, so white button text stays readable
const headerBottom = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-bottom')) || 0

/** Can this element (or a parent inside the card) still scroll in the direction of the gesture? Then the card's own text scrolls instead of changing card. */
function innerScrollWants(target, dy) {
  for (let el = target instanceof Element ? target : null; el && el.dataset?.weRoot === undefined; el = el.parentElement) {
    if (el.scrollHeight > el.clientHeight + 28 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) {
      if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true
      if (dy < 0 && el.scrollTop > 0) return true
    }
  }
  return false
}

export default function WelcomeCards({ plan }) {
  const cards = plan.cards
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [franchise, setFranchise] = useState(null)
  const sec = useRef(null)
  const live = useRef({ index: 0, locked: false, busy: false, gesture: createWheelGesture({ minStepGap: MIN_STEP_GAP }), touch: null, franchise: null })
  live.current.franchise = franchise
  const card = cards[index]
  const last = index === cards.length - 1
  const theme = themeOf(card?.theme)

  // The first card appearing IS the visitor viewing the cards: it is remembered from that moment, so a refresh half-way through, or any later visit, does not show them again.
  // The cards are PERMANENT: nothing is remembered about them (no storage, no "completed" state). Every load, refresh and return visit offers the whole sequence from the first card.

  /** Smooth scroll to a page position; the scroll handlers stand aside until it has arrived. */
  const scrollToY = useCallback((y) => {
    const s = live.current
    s.busy = true
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' })
    const t0 = performance.now()
    let prev = -1
    let still = 0
    const watch = () => {
      const now = window.scrollY
      still = Math.abs(now - prev) < 0.5 ? still + 1 : 0
      prev = now
      if (still >= 4 || performance.now() - t0 > 1400) s.busy = false
      else requestAnimationFrame(watch)
    }
    requestAnimationFrame(watch)
  }, [reduce])

  const dockY = () => (sec.current ? sec.current.getBoundingClientRect().top + window.scrollY - headerBottom() : 0)

  const lock = useCallback((at) => { // bring the section to the top of the screen and take over the scrolling
    const s = live.current
    s.locked = true
    s.gesture.noteStep(performance.now())
    if (at !== undefined && at !== s.index) { s.index = at; setIndex(at); setDir(at > 0 ? 1 : -1) }
    scrollToY(dockY())
  }, [scrollToY])

  const release = useCallback((d) => { // past the last card (down) or before the first (up): the page scrolls again, smoothly
    const s = live.current
    s.locked = false
    if (d > 0) {
      scrollToY(dockY() + (sec.current?.offsetHeight || window.innerHeight))
    } else scrollToY(dockY() - window.innerHeight * 0.55)
  }, [scrollToY])

  const step = useCallback((d) => {
    const s = live.current
    if (s.busy || !s.locked) return
    const to = s.index + d
    s.gesture.noteStep(performance.now())
    if (to < 0 || to >= cards.length) { release(d); return }
    s.index = to
    setDir(d)
    setIndex(to)
  }, [cards.length, release])

  // A request to (re)open the cards from the footer's replay button or the admin preview: back to the first card, at the top of the screen.
  useEffect(() => {
    const open = () => { if (!takeOpenRequest()) return; const s = live.current; s.index = 0; setIndex(0); setDir(1); lock(0) }
    open()
    window.addEventListener('lax360:welcome-open', open)
    return () => window.removeEventListener('lax360:welcome-open', open)
  }, [lock])

  // ---- scroll input, attached only while the section is within a screen of the viewport -----------------------------------------------------------
  useEffect(() => {
    const el = sec.current
    if (!el) return undefined
    const s = live.current
    /** Not locked yet: is this scroll heading INTO the section? Then bring it to the top and take over (first card from above, last card from below). */
    const capture = (dy) => {
      const r = el.getBoundingClientRect()
      const hb = headerBottom()
      const vh = window.innerHeight
      if (dy > 0 && r.top > hb + 2 && r.top < vh * 0.85) { lock(0); return true }
      if (dy < 0 && r.top < hb - 2 && r.bottom > hb + vh * 0.15) { lock(cards.length - 1); return true }
      return false
    }
    const blocked = () => document.documentElement.hasAttribute('data-contact-card') // the contact card is open: it owns the screen
    const onWheel = (e) => {
      if (blocked() || s.franchise || (e.target instanceof Element && e.target.closest('dialog'))) return
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
      if (Math.abs(dy) < 1) return
      if (s.busy) { e.preventDefault(); s.gesture.push(dy, performance.now()); return } // the page is gliding to or from the section: no fighting it; the gesture's momentum is absorbed, not turned into a step
      if (s.locked) {
        if (innerScrollWants(e.target, dy)) return // the card's own long text scrolls natively (it cannot chain to the page: overscroll-contain); the next gesture past its end changes the card
        e.preventDefault()
        const d = s.gesture.push(dy, performance.now()) // exactly one step per gesture, at its start (see utils/scrollGesture.js)
        if (d) step(d)
        return
      }
      if (capture(dy)) { e.preventDefault(); s.gesture.push(dy, performance.now()) }
    }
    const onTouchStart = (e) => { s.touch = e.touches.length === 1 ? { y0: e.touches[0].clientY, stepped: false } : null }
    const onTouchMove = (e) => {
      const tc = s.touch
      if (!tc || blocked() || s.franchise || (e.target instanceof Element && e.target.closest('dialog'))) return
      const dy = tc.y0 - e.touches[0].clientY
      if (s.busy) { if (e.cancelable) e.preventDefault(); return }
      if (s.locked) {
        if (innerScrollWants(e.target, dy)) return // the card's own long text scrolls under the finger; a swipe that starts past its end changes the card
        if (e.cancelable) e.preventDefault() // no page scroll / pull-to-refresh while the cards are in charge
        if (tc.stepped || Math.abs(dy) < TOUCH_TRIGGER || performance.now() - s.gesture.lastStep < MIN_STEP_GAP) return
        tc.stepped = true // one swipe = one card
        step(dy > 0 ? 1 : -1)
        return
      }
      if (Math.abs(dy) >= 8 && capture(dy)) { tc.stepped = true; if (e.cancelable) e.preventDefault() }
    }
    const onTouchEnd = () => { s.touch = null }
    const onKey = (e) => {
      if (!s.locked || blocked() || s.franchise || e.altKey || e.ctrlKey || e.metaKey || (e.target instanceof Element && e.target.closest('dialog'))) return
      const down = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)
      const up = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)
      if (!down && !up) return
      e.preventDefault()
      if (performance.now() - s.gesture.lastStep >= MIN_STEP_GAP) step(down ? 1 : -1)
    }
    let attached = false
    const attach = () => {
      if (attached) return
      attached = true
      window.addEventListener('wheel', onWheel, { passive: false })
      window.addEventListener('touchstart', onTouchStart, { passive: true })
      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', onTouchEnd, { passive: true })
      window.addEventListener('touchcancel', onTouchEnd, { passive: true })
      window.addEventListener('keydown', onKey)
    }
    const detach = () => {
      if (!attached) return
      attached = false
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([e]) => { if (e.isIntersecting) attach(); else { detach(); s.locked = false } }, { rootMargin: '100% 0px 100% 0px' })
    if (io) io.observe(el); else attach()
    return () => { io?.disconnect(); detach() }
  }, [cards.length, lock, step])

  const open = (href) => {
    if (!href) return
    if (isInternal(href)) { navigate(href) } else window.open(href, '_blank', 'noopener,noreferrer')
  }

  if (!card) return null
  // The next page slides in sideways over the current one (which drifts away more slowly); going back, the previous page returns from the other side. Background and content move
  // at different speeds inside the page, so the transition has depth.
  const slide = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1, transition: { duration: 0.25 } }, exit: { opacity: 0, pointerEvents: 'none', transition: { duration: 0.2 } } }
    : {
      enter: (d) => ({ x: d > 0 ? '100%' : '-100%' }),
      center: { x: 0, transition: { duration: 0.9, ease: EASE, staggerChildren: 0.08, delayChildren: 0.28 } },
      exit: (d) => ({ x: d > 0 ? '-32%' : '32%', opacity: 0.4, pointerEvents: 'none', transition: { duration: 0.8, ease: EASE } }),
    }
  const bg = reduce
    ? { enter: {}, center: {}, exit: {} }
    : { enter: (d) => ({ x: d > 0 ? '-22%' : '22%' }), center: { x: 0, transition: { duration: 1.1, ease: EASE } }, exit: {} }
  const item = reduce
    ? { enter: { opacity: 1 }, center: { opacity: 1 }, exit: { opacity: 1 } }
    : { enter: (d) => ({ opacity: 0, x: d * 70 }), center: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } }, exit: { opacity: 1 } }
  const light = `rgb(${theme.a})`
  const cta = { background: `linear-gradient(135deg, color-mix(in srgb, rgb(var(--glow)) 55%, #000), rgb(${dark(theme.a, 0.75)}) 55%, rgb(${dark(theme.b, 0.8)}))`, boxShadow: `0 16px 34px -14px rgba(${theme.a},0.95), inset 0 1px 0 rgba(255,255,255,0.28)` }
  const btn = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-center text-[0.95rem] font-bold transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
  const Emblem = theme.Icon
  const [line1, line2] = (() => { const i = card.headline.indexOf('. '); return i > 0 && i < card.headline.length - 3 ? [card.headline.slice(0, i + 1), card.headline.slice(i + 2)] : [card.headline, ''] })()
  const long = card.paragraphs.join('').length > 250
  const num = (n) => String(n).padStart(2, '0')

  return (
    <section ref={sec} id="welcome" aria-roledescription="carousel" aria-label="Welcome to LAX360 Pvt Ltd" data-we-root=""
      className="relative isolate select-none overflow-hidden bg-[#07090f] text-white"
      style={{ height: 'calc(100dvh - var(--header-bottom, 0px))', minHeight: '32rem', touchAction: 'pan-y', overscrollBehavior: 'contain' }}>
      <p className="sr-only" role="status" aria-live="polite">Page {index + 1} of {cards.length}: {card.name}. Scroll or use the arrow keys to move between pages{last ? '; scroll down again to continue to the rest of the page' : ''}.</p>
      <button type="button" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-30 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#0b0b0f]"
        onClick={() => { live.current.locked = true; live.current.busy = false; step(1) }}>{last ? 'Continue to the rest of the page' : 'Next page'}</button>
      {index > 0 && <button type="button" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-14 focus:z-30 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#0b0b0f]" onClick={() => { live.current.locked = true; live.current.busy = false; step(-1) }}>Previous page</button>}

      <AnimatePresence mode="popLayout" custom={dir} initial={false}>
        <m.article key={card.id} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" aria-roledescription="slide" aria-label={`${index + 1} of ${cards.length}`}
          className="absolute inset-0 overflow-hidden bg-[#07090f]">
          {/* the background: the page's own artwork (or the uploaded picture), a colour wash and a reading shade */}
          <m.div custom={dir} variants={bg} className="absolute -inset-x-[12%] inset-y-0">
            <WelcomeBackdrop theme={card.theme} soft />
            {card.image && <img src={card.image} alt={card.imageAlt} width="1440" height="800" decoding="async" draggable="false" className="absolute inset-0 size-full object-cover" />}
          </m.div>
          <div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(5,8,14,0.9) 0%, rgba(5,8,14,0.72) 38%, rgba(5,8,14,0.18) 72%, rgba(5,8,14,0.05) 100%), radial-gradient(60% 70% at 85% 50%, rgba(${theme.a},0.22), transparent 70%)` }} />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 right-4 font-display text-[11rem] font-bold leading-none tracking-tighter text-white/[0.05] sm:text-[20rem]">{num(index + 1)}</span>

          {/* the content: the message on the left, the actions on the right (below it on a phone). The sizes follow the screen's height as well as its width, so a page always fits whole;
              the container scrolls only as a last resort on a very small screen, and nothing is ever clipped. */}
          <div data-we-scroll="" className="relative z-10 mx-auto grid h-full max-w-[84rem] content-center gap-x-12 gap-y-5 overflow-y-auto overscroll-contain px-5 pb-28 pt-4 [scrollbar-width:none] sm:px-10 md:pb-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center lg:px-16 lg:pb-14">
            <div className="flex min-w-0 flex-col justify-center gap-[clamp(0.55rem,1.8vh,1.1rem)]">
              <m.div custom={dir} variants={item} className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.18em] backdrop-blur-md"><span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: light, boxShadow: `0 0 12px ${light}` }} />{card.name}</span>
                {card.status && <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-[#0b0b0f]" style={{ background: 'linear-gradient(90deg, #fcd34d, #fbbf24)' }}>{card.promo && <span aria-hidden="true">&#10024;</span>}{card.status}</span>}
              </m.div>
              <m.h2 custom={dir} variants={item} className="font-display text-[clamp(1.5rem,min(6vw,7.6vh),4.2rem)] font-bold leading-[1.04] tracking-tight [text-wrap:balance]">
                {line1}{line2 && <><br /><span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, rgb(${theme.a}), rgb(${theme.b}))` }}>{line2}</span></>}
              </m.h2>
              <div className={`max-w-[38rem] space-y-[clamp(0.4rem,1.2vh,0.7rem)] text-white/85 ${long ? 'text-[clamp(0.8rem,2.05vh,1rem)] leading-[1.55]' : 'text-[clamp(0.85rem,2.3vh,1.1rem)] leading-[1.6]'}`}>
                {card.paragraphs.map((p, i) => <m.p key={i} custom={dir} variants={item}>{p}</m.p>)}
              </div>
            </div>

            <div className="flex min-w-0 flex-col items-stretch gap-[clamp(0.75rem,3vh,1.75rem)] lg:items-center">
              {/* the emblem (large screens): a glass tile with rings; a picture fills the page instead when the card has one */}
              {!card.image && (
                <m.div custom={dir} variants={item} aria-hidden="true" className="relative hidden place-items-center lg:grid">
                  <span className="we-float relative grid place-items-center rounded-[3rem] border border-white/30 bg-gradient-to-br from-white/20 to-white/[0.04] backdrop-blur-xl" style={{ width: 'clamp(7.5rem,24vh,14rem)', height: 'clamp(7.5rem,24vh,14rem)', boxShadow: `0 36px 80px -28px rgba(${theme.a},0.95), inset 0 1px 0 rgba(255,255,255,0.4)` }}>
                    <span className="absolute -inset-3 rounded-[3.5rem] border" style={{ borderColor: `rgba(${theme.a},0.5)` }} />
                    <span className="absolute -inset-7 rounded-[4rem] border border-dashed" style={{ borderColor: `rgba(${theme.b},0.32)` }} />
                    {card.theme === 'welcome' && !card.promo
                      ? <img src="/assets/logo-shield.png" alt="" width="284" height="302" decoding="async" draggable="false" className="h-[62%] w-auto drop-shadow-[0_0_26px_rgba(139,92,246,0.85)]" />
                      : <Emblem className="size-[42%]" strokeWidth={1.2} style={{ color: light, filter: `drop-shadow(0 0 22px rgba(${theme.a},0.95))` }} />}
                  </span>
                </m.div>
              )}
              {((card.exploreLabel && card.exploreLink) || card.franchise) && (
                <m.div custom={dir} variants={item} className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-col lg:items-stretch">
                  {card.exploreLabel && card.exploreLink && (
                    <button type="button" onClick={() => open(card.exploreLink)} className={`${btn} flex-1 text-white`} style={cta}>
                      {card.exploreLabel}{isInternal(card.exploreLink) ? <ArrowRight className="size-4" aria-hidden="true" /> : <><ExternalLink className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></>}
                    </button>
                  )}
                  {card.franchise && <button type="button" onClick={() => setFranchise({ division: card.division })} className={`${btn} flex-1 border-2 border-white/70 bg-white/5 text-white backdrop-blur-md hover:bg-white/15`}>{card.franchiseLabel}</button>}
                </m.div>
              )}
            </div>
          </div>
        </m.article>
      </AnimatePresence>

      {/* where we are: a rail of pages on the right, the count and a scroll hint at the bottom (the visitor scrolls: there are no arrows) */}
      <div aria-hidden="true" className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2.5 sm:right-6">
        {cards.map((c, i) => <span key={c.id} className="block w-1.5 rounded-full transition-all duration-500" style={{ height: i === index ? '2rem' : '0.45rem', background: i === index ? light : 'rgba(255,255,255,0.4)', boxShadow: i === index ? `0 0 14px ${light}` : undefined }} />)}
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-16 z-20 flex items-center gap-3 px-5 pb-3 md:bottom-0 md:pb-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/70 sm:px-10 lg:px-16">
        <span className="whitespace-nowrap tabular-nums"><strong className="text-base text-white">{num(index + 1)}</strong> / {num(cards.length)}</span>
        <span className="h-px w-16 bg-white/25 sm:w-28"><span className="block h-full transition-[width] duration-700" style={{ width: `${((index + 1) / cards.length) * 100}%`, background: light }} /></span>
        <span className="ml-auto flex items-center gap-2 whitespace-nowrap"><span>{last ? 'Scroll to continue' : 'Scroll'}</span><span className="grid size-7 place-items-center rounded-full border border-white/30"><ChevronDown className="we-bob size-4" /></span></span>
      </div>

      {franchise && <PartnershipModal category="franchise" division={franchise.division} source="welcome-cards" onClose={() => setFranchise(null)} />}
    </section>
  )
}
