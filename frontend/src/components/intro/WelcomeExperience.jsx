import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown, ExternalLink } from 'lucide-react'
import PartnershipModal from '../network/PartnershipModal.jsx'
import { markWelcomeSeen, setIntroState, welcomePlan } from '../../utils/welcomeIntro.js'
import { WelcomeBackdrop, themeOf } from './welcomeArt.jsx'

/**
 * The Welcome Experience: a compact promotional card (in the style of a festival-offer pop-up) that floats in the centre of the site, over a softly blurred homepage,
 * right after the intro animation. There are no buttons to move between cards: the visitor simply SCROLLS.
 *
 *   scroll down (wheel, touchpad, swipe up, arrow / page keys)  -> the next card;   scroll up -> the previous card;   scroll down on the last card -> the homepage.
 *
 * Scrolling is turned into one deliberate step per gesture (not per wheel tick): a step needs a small amount of movement, and after a step the same gesture (touchpad
 * momentum, a spinning wheel) is ignored until it stops, so one swipe never skips several cards. Everything on the cards (text, order, buttons, links, images, schedule,
 * on/off) comes from the admin panel (Welcome cards); nothing is built into this file. The page underneath is inert while the cards are open.
 */
const EASE = [0.22, 1, 0.36, 1]
const STEP_DISTANCE = 60 // px of wheel movement (or touch drag: 48) that makes one step
const LOCK_MS = 750 // after a step, ignore input for at least this long ...
const QUIET_MS = 140 // ... and until the gesture (momentum scrolling) has been quiet for this long
const isInternal = (href) => href.startsWith('/') && !href.startsWith('//')
const dark = (rgbList, f) => rgbList.split(',').map((n) => Math.round(Number(n) * f)).join(',') // a deeper shade of an accent, so white button text stays readable

/** Can this element (or a parent inside the card) still scroll in the direction of the gesture? Then the card's own text scrolls instead of changing card. */
function innerScrollWants(target, dy) {
  for (let el = target instanceof Element ? target : null; el && el.dataset?.weRoot === undefined; el = el.parentElement) {
    if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) {
      if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true
      if (dy < 0 && el.scrollTop > 0) return true
    }
  }
  return false
}

export default function WelcomeExperience() {
  const plan = useMemo(() => welcomePlan(), [])
  const cards = plan?.cards || []
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [leaving, setLeaving] = useState(false)
  const [franchise, setFranchise] = useState(null)
  const live = useRef({ leaving: false, index: 0, lockUntil: 0, lastInput: 0, acc: 0, touchY: null })
  const card = cards[index]
  const last = index === cards.length - 1
  const theme = themeOf(card?.theme)

  // while the cards are open: no page scrolling, and the page underneath cannot be reached with the keyboard or a screen reader
  useLayoutEffect(() => {
    const page = document.getElementById('root')
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    if (page) page.inert = true
    return () => { html.style.overflow = prev; if (page) page.inert = false }
  }, [])

  const finish = useCallback(() => { // scrolling past the last card: the card floats away and the homepage is there
    const s = live.current
    if (s.leaving) return
    s.leaving = true
    markWelcomeSeen(plan?.sig)
    setLeaving(true)
    const page = document.getElementById('root')
    if (page) page.inert = false
    window.setTimeout(() => setIntroState('done'), reduce ? 60 : 650)
  }, [reduce, plan])

  const step = useCallback((d) => {
    const s = live.current
    if (s.leaving) return
    const to = s.index + d
    if (to < 0) return // already on the first card
    s.lockUntil = performance.now() + LOCK_MS
    if (to >= cards.length) { finish(); return }
    s.index = to
    setDir(d)
    setIndex(to)
  }, [cards.length, finish])

  useEffect(() => { if (!plan) setIntroState('done') }, [plan]) // nothing to show (should not happen): carry on to the homepage

  // ---- scroll input: wheel / touchpad, touch swipes and keys -------------------------------------------------------------------------------------
  useEffect(() => {
    const s = live.current
    const onWheel = (e) => {
      if (franchise || s.leaving) return
      if (e.target instanceof Element && e.target.closest('dialog')) return
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
      if (Math.abs(dy) < 1) return
      e.preventDefault() // the page behind must never scroll
      if (innerScrollWants(e.target, dy)) return
      const now = performance.now()
      if (now < s.lockUntil) { s.lastInput = now; s.acc = 0; s.lockUntil = Math.max(s.lockUntil, now + QUIET_MS); return } // the previous step (or its momentum) is still going: swallow, and keep waiting until it stops
      if (now - s.lastInput > 220) s.acc = 0 // a new gesture
      s.lastInput = now
      s.acc += dy
      if (Math.abs(s.acc) >= STEP_DISTANCE) { const d = s.acc > 0 ? 1 : -1; s.acc = 0; step(d) }
    }
    const onTouchStart = (e) => { s.touchY = e.touches.length === 1 && !(e.target instanceof Element && e.target.closest('dialog')) ? e.touches[0].clientY : null }
    const onTouchMove = (e) => { if (!(e.target instanceof Element && e.target.closest('dialog'))) { if (e.cancelable) e.preventDefault() } } // no page scroll / pull-to-refresh behind the card
    const onTouchEnd = (e) => {
      if (s.touchY === null || franchise || s.leaving) return
      const dy = s.touchY - (e.changedTouches[0]?.clientY ?? s.touchY)
      const target = e.target
      s.touchY = null
      if (Math.abs(dy) < 48 || performance.now() < s.lockUntil || innerScrollWants(target, dy)) return
      step(dy > 0 ? 1 : -1)
    }
    const onKey = (e) => {
      if (franchise || s.leaving || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.target instanceof Element && e.target.closest('dialog')) return
      const down = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)
      const up = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)
      if (!down && !up) return
      e.preventDefault()
      if (performance.now() >= s.lockUntil) step(down ? 1 : -1)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [franchise, step])

  const open = (href) => {
    if (!href) return
    if (isInternal(href)) { markWelcomeSeen(plan.sig); live.current.leaving = true; setIntroState('done'); navigate(href) } else window.open(href, '_blank', 'noopener,noreferrer')
  }

  if (!plan || typeof document === 'undefined' || !card) return null
  const slide = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1, transition: { duration: 0.2 } }, exit: { opacity: 0, pointerEvents: 'none', transition: { duration: 0.15 } } }
    : {
      enter: (d) => ({ opacity: 0, y: d * 110, scale: 0.94 }),
      center: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: EASE, staggerChildren: 0.06, delayChildren: 0.14 } },
      exit: (d) => ({ opacity: 0, y: d * -110, scale: 0.94, pointerEvents: 'none', transition: { duration: 0.45, ease: EASE } }), // a leaving card must not take clicks
    }
  const item = reduce
    ? { enter: { opacity: 1 }, center: { opacity: 1 }, exit: { opacity: 1 } }
    : { enter: { opacity: 0, y: 14 }, center: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } }, exit: { opacity: 1 } }
  const accentText = { color: `rgb(${dark(theme.a, 0.72)})` }
  const cta = { background: `linear-gradient(135deg, rgb(${dark(theme.a, 0.7)}), rgb(${dark(theme.b, 0.7)}))`, boxShadow: `0 10px 24px -10px rgba(${theme.a},0.9)` }
  const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-bold transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0b0f]'
  const Emblem = theme.Icon
  const [line1, line2] = (() => { const i = card.headline.indexOf('. '); return i > 0 && i < card.headline.length - 3 ? [card.headline.slice(0, i + 1), card.headline.slice(i + 2)] : [card.headline, ''] })()
  const long = card.paragraphs.join('').length > 250

  return createPortal(
    <div data-we-root="" role="dialog" aria-modal="true" aria-label="Welcome to LAX360 Pvt Ltd"
      className="fixed inset-0 z-[1000] flex select-none items-center justify-center overflow-hidden p-4 pb-12"
      style={{ background: 'rgba(8,8,14,0.4)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', opacity: leaving ? 0 : 1, transition: `opacity ${reduce ? 0.05 : 0.65}s ease`, pointerEvents: leaving ? 'none' : 'auto', touchAction: 'none', overscrollBehavior: 'contain' }}>
      <p className="sr-only" role="status" aria-live="polite">Card {index + 1} of {cards.length}: {card.name}. Scroll or use the arrow keys to move between cards{last ? '; scroll down again to enter the website' : ''}.</p>
      <button type="button" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#0b0b0f]" onClick={() => step(1)}>{last ? 'Enter the website' : 'Next card'}</button>
      {index > 0 && <button type="button" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-14 focus:z-10 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#0b0b0f]" onClick={() => step(-1)}>Previous card</button>}

      <div className="relative h-[min(38rem,calc(100dvh-5.5rem))] w-[min(29rem,calc(100vw-2rem))] transition-transform duration-500 ease-out" style={{ transform: leaving && !reduce ? 'translateY(-36px) scale(0.96)' : undefined }}>
        <AnimatePresence mode="popLayout" custom={dir} initial>
          <m.article key={card.id} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" aria-roledescription="slide" aria-label={`${index + 1} of ${cards.length}`}
            className="absolute inset-0 flex flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_40px_90px_-24px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.18)]">
            {/* the picture: an uploaded image, or the animated artwork with the card's emblem / the logo */}
            <div className="relative h-[38%] min-h-[8rem] shrink-0 overflow-hidden">
              <WelcomeBackdrop theme={card.theme} soft />
              {card.image && <img src={card.image} alt={card.imageAlt} width="720" height="400" decoding="async" draggable="false" className="absolute inset-0 size-full object-cover" />}
              {!card.image && (
                <m.div variants={item} className="absolute inset-0 grid place-items-center">
                  {index === 0 && !card.promo
                    ? <img src="/assets/logo-shield.png" alt="" width="284" height="302" decoding="async" draggable="false" className="we-float h-[62%] w-auto drop-shadow-[0_0_26px_rgba(139,92,246,0.85)]" />
                    : (
                      <span aria-hidden="true" className="we-float relative grid size-[5.2rem] place-items-center rounded-[1.6rem] border border-white/35 bg-white/[0.12] backdrop-blur sm:size-[6rem]" style={{ boxShadow: `0 18px 44px -14px rgba(${theme.a},0.95), inset 0 1px 0 rgba(255,255,255,0.3)` }}>
                        <span className="absolute -inset-2 rounded-[2rem] border" style={{ borderColor: `rgba(${theme.a},0.4)` }} />
                        <Emblem className="size-10 sm:size-11" strokeWidth={1.5} style={{ color: `rgb(${theme.a})`, filter: `drop-shadow(0 0 14px rgba(${theme.a},0.9))` }} />
                      </span>
                    )}
                </m.div>
              )}
              {card.status && <m.span variants={item} className="absolute left-0 top-4 inline-flex items-center gap-1.5 rounded-r-full px-3.5 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-[#0b0b0f] shadow-lg" style={{ background: 'linear-gradient(90deg, #fcd34d, #fbbf24)' }}>{card.promo && <span aria-hidden="true">&#10024;</span>}{card.status}</m.span>}
              {/* progress: where this card is in the sequence */}
              <div aria-hidden="true" className="absolute right-3 top-4 flex flex-col items-center gap-1.5 rounded-full bg-black/35 px-2 py-2.5 backdrop-blur">
                {cards.map((c, i) => <span key={c.id} className="block w-1.5 rounded-full transition-all duration-500" style={{ height: i === index ? '1.15rem' : '0.4rem', background: i === index ? `rgb(${theme.a})` : 'rgba(255,255,255,0.55)' }} />)}
              </div>
            </div>

            {/* the message */}
            <div className="relative -mt-5 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-t-[1.5rem] bg-white px-6 pb-5 pt-5 text-[#0b0b0f] [scrollbar-width:thin]">
              <m.p variants={item} className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em]" style={accentText}>{card.name}</m.p>
              <m.h2 variants={item} className="mt-1.5 font-display text-[1.7rem] font-bold leading-[1.08] tracking-tight [text-wrap:balance] sm:text-[1.85rem]">
                {line1}{line2 && <><br /><span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, rgb(${dark(theme.a, 0.8)}), rgb(${dark(theme.b, 0.85)}))` }}>{line2}</span></>}
              </m.h2>
              <div className={`mt-2.5 space-y-2 text-slate-600 ${long ? 'text-[0.82rem] leading-[1.55] sm:text-[0.88rem]' : 'text-[0.9rem] leading-[1.6]'}`}>
                {card.paragraphs.map((p, i) => <m.p key={i} variants={item}>{p}</m.p>)}
              </div>
              {((card.exploreLabel && card.exploreLink) || card.franchise) && (
                <m.div variants={item} className="mt-auto flex flex-wrap gap-2.5 pt-4">
                  {card.exploreLabel && card.exploreLink && (
                    <button type="button" onClick={() => open(card.exploreLink)} className={`${btn} text-white`} style={cta}>
                      {card.exploreLabel}{isInternal(card.exploreLink) ? <ArrowRight className="size-4" aria-hidden="true" /> : <><ExternalLink className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></>}
                    </button>
                  )}
                  {card.franchise && <button type="button" onClick={() => setFranchise({ division: card.division })} className={`${btn} border-2 border-[#0b0b0f]/80 bg-white text-[#0b0b0f] hover:bg-[#0b0b0f]/5`}>{card.franchiseLabel}</button>}
                </m.div>
              )}
            </div>
          </m.article>
        </AnimatePresence>
        {/* the scroll hint, under the card */}
        <p aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-9 flex flex-col items-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/85 drop-shadow">
          <span>{last ? 'Scroll to enter the website' : index === 0 ? 'Scroll down' : `${index + 1} / ${cards.length}`}</span>
          <ChevronDown className="we-bob -mt-0.5 size-4" />
        </p>
      </div>

      {franchise && <PartnershipModal category="franchise" division={franchise.division} source="welcome-experience" onClose={() => { setFranchise(null); document.documentElement.style.overflow = 'hidden' }} />}
    </div>,
    document.body,
  )
}
