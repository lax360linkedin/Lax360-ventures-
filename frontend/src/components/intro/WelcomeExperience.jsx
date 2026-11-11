import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import PartnershipModal from '../network/PartnershipModal.jsx'
import { markWelcomeSeen, setIntroState, welcomePlan } from '../../utils/welcomeIntro.js'
import { WelcomeBackdrop, themeOf } from './welcomeArt.jsx'

/**
 * The Welcome Experience: a small, centred card that floats over the (softly blurred) website right after the intro animation. Seven cards, one at a time, swiped
 * with Next / Previous (or a swipe / the arrow keys). There is deliberately NO skip and no automatic exit: the homepage is revealed only when the visitor clicks Next
 * on the last card. Everything on the cards (text, order, buttons, links, images, on/off) comes from the admin panel (Welcome Experience); nothing is built into this file.
 *
 *   - "Franchise Opportunities" opens the website's existing franchise enquiry form (the Our Network one) with the card's division attached;
 *   - "Explore ..." buttons go to the existing pages (the cards are then dismissed for this session);
 *   - the page underneath is inert while the card is open; reduced-motion visitors get plain fades.
 */
const EASE = [0.22, 1, 0.36, 1]
const isInternal = (href) => href.startsWith('/') && !href.startsWith('//')

export default function WelcomeExperience() {
  const plan = useMemo(() => welcomePlan(), [])
  const cards = plan?.cards || []
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [leaving, setLeaving] = useState(false)
  const [franchise, setFranchise] = useState(null)
  const nextRef = useRef(null)
  const live = useRef({ leaving: false, touch: null })
  const card = cards[index]
  const last = index === cards.length - 1
  const theme = themeOf(card?.theme)

  // while the card is open: no scrolling, and the page underneath cannot be reached with the keyboard or a screen reader
  useLayoutEffect(() => {
    const page = document.getElementById('root')
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    if (page) page.inert = true
    return () => { html.style.overflow = prev; if (page) page.inert = false }
  }, [])

  useEffect(() => { nextRef.current?.focus({ preventScroll: true }) }, [])

  const finish = useCallback(() => { // after Next on the last card: the card floats away and the homepage is revealed
    const s = live.current
    if (s.leaving) return
    s.leaving = true
    markWelcomeSeen()
    setLeaving(true)
    const page = document.getElementById('root')
    if (page) page.inert = false
    window.setTimeout(() => setIntroState('done'), reduce ? 60 : 550)
  }, [reduce])

  const go = useCallback((to) => {
    if (to < 0 || to >= cards.length || to === index) return
    setDir(to > index ? 1 : -1)
    setIndex(to)
  }, [cards.length, index])
  const next = useCallback(() => (last ? finish() : go(index + 1)), [finish, go, index, last])
  const prev = useCallback(() => go(index - 1), [go, index])

  useEffect(() => { if (!plan) setIntroState('done') }, [plan]) // nothing to show (should not happen): carry on to the homepage

  useEffect(() => {
    const onKey = (e) => {
      if (franchise || live.current.leaving || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowRight') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [franchise, next, prev])

  // Swipe: a mostly horizontal drag of at least 40 px changes the card; vertical movement is left alone (long text can still be scrolled)
  const onPointerDown = (e) => { if (!e.target.closest('a,button')) live.current.touch = { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e) => {
    const t = live.current.touch
    live.current.touch = null
    if (!t) return
    const dx = e.clientX - t.x
    const dy = e.clientY - t.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? next : prev)()
  }

  const open = (href) => {
    if (!href) return
    if (isInternal(href)) { markWelcomeSeen(); live.current.leaving = true; setIntroState('done'); navigate(href) } else window.open(href, '_blank', 'noopener,noreferrer')
  }

  if (!plan || typeof document === 'undefined' || !card) return null
  const slide = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1, transition: { duration: 0.2 } }, exit: { opacity: 0, transition: { duration: 0.15 } } }
    : {
      enter: (d) => ({ opacity: 0, x: d * 120, rotate: d * 7, scale: 0.9 }),
      center: { opacity: 1, x: 0, rotate: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
      exit: (d) => ({ opacity: 0, x: d * -120, rotate: d * -7, scale: 0.9, transition: { duration: 0.35, ease: EASE } }),
    }
  const accent = { backgroundImage: `linear-gradient(90deg, rgb(${theme.a}), rgb(${theme.b}))` }
  const btn = 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
  const Emblem = theme.Icon
  const [line1, line2] = (() => { const i = card.headline.indexOf('. '); return i > 0 && i < card.headline.length - 3 ? [card.headline.slice(0, i + 1), card.headline.slice(i + 2)] : [card.headline, ''] })()

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Welcome to LAX360 Pvt Ltd" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { live.current.touch = null }}
      className="fixed inset-0 z-[1000] flex select-none items-center justify-center overflow-hidden p-4 text-white"
      style={{ background: 'rgba(8,8,14,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', opacity: leaving ? 0 : 1, transition: `opacity ${reduce ? 0.05 : 0.55}s ease`, pointerEvents: leaving ? 'none' : 'auto' }}>
      <p className="sr-only" role="status" aria-live="polite">Card {index + 1} of {cards.length}: {card.name}</p>

      <div className="relative h-[min(33rem,calc(100dvh-2rem))] w-[min(24.5rem,calc(100vw-2rem))] transition-transform duration-500 ease-out" style={{ perspective: 1200, transform: leaving && !reduce ? 'scale(0.9) translateY(14px)' : undefined }}>
        <AnimatePresence mode="popLayout" custom={dir} initial>
          <m.article key={card.id} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" aria-roledescription="slide" aria-label={`${index + 1} of ${cards.length}`}
            className="absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] border border-white/20 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)]" style={{ touchAction: 'pan-y' }}>
            <WelcomeBackdrop theme={card.theme} />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 pb-3 pt-5 [scrollbar-width:thin]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] backdrop-blur">
                    <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: `rgb(${theme.a})`, boxShadow: `0 0 8px rgb(${theme.a})` }} />{card.name}
                  </span>
                  {card.status && <span className="inline-flex items-center rounded-full border border-amber-300/60 bg-amber-300/15 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-amber-200">{card.status}</span>}
                </div>
              </div>

              <div className="mt-3 flex justify-center" aria-hidden={card.image ? undefined : 'true'}>
                {card.image ? (
                  <img src={card.image} alt={card.imageAlt} width="480" height="270" decoding="async" draggable="false" className="h-28 w-full rounded-2xl border border-white/25 object-cover shadow-lg" />
                ) : index === 0 ? (
                  <img src="/assets/logo-shield.png" alt="" width="284" height="302" decoding="async" draggable="false" className="we-float h-20 w-auto drop-shadow-[0_0_24px_rgba(139,92,246,0.8)]" />
                ) : (
                  <span className="we-float grid size-16 place-items-center rounded-3xl border border-white/25 bg-white/[0.08] shadow-xl backdrop-blur" style={{ boxShadow: `0 16px 40px -14px rgba(${theme.a},0.85)` }}>
                    <Emblem className="size-8" strokeWidth={1.5} style={{ color: `rgb(${theme.a})`, filter: `drop-shadow(0 0 12px rgba(${theme.a},0.8))` }} />
                  </span>
                )}
              </div>

              <h2 className="mt-4 font-display text-[1.7rem] font-bold leading-[1.1] tracking-tight [text-wrap:balance]">
                {line1}{line2 && <><br /><span className="bg-clip-text text-transparent" style={accent}>{line2}</span></>}
              </h2>
              <div className="mt-3 space-y-2 text-[0.88rem] leading-relaxed text-white/85">
                {card.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              {((card.exploreLabel && card.exploreLink) || card.franchise) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {card.franchise && <button type="button" onClick={() => setFranchise({ division: card.division })} className={`${btn} border-white/30 bg-white/10`}>{card.franchiseLabel}</button>}
                  {card.exploreLabel && card.exploreLink && (
                    <button type="button" onClick={() => open(card.exploreLink)} className={btn} style={{ borderColor: `rgb(${theme.a})`, background: `rgba(${theme.a},0.25)` }}>
                      {card.exploreLabel}{isInternal(card.exploreLink) ? <ArrowRight className="size-3.5" aria-hidden="true" /> : <><ExternalLink className="size-3.5" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></>}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* progress and navigation: the same place on every card */}
            <div className="relative border-t border-white/15 bg-black/35 px-4 py-3 backdrop-blur">
              <div className="mb-2.5 flex items-center gap-3">
                <p className="shrink-0 font-display text-xs font-semibold tabular-nums tracking-wide" aria-hidden="true">{index + 1}/{cards.length}</p>
                <ol className="flex min-w-0 flex-1 gap-1" aria-label="Cards">
                  {cards.map((c, i) => (
                    <li key={c.id} className="min-w-0 flex-1">
                      <span aria-hidden="true" className="relative block h-1 overflow-hidden rounded-full bg-white/20">
                        <span className="absolute inset-0 origin-left rounded-full" style={{ ...accent, transform: `scaleX(${i <= index ? 1 : 0})`, transition: reduce ? 'none' : 'transform 0.55s cubic-bezier(0.22,1,0.36,1)' }} />
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={prev} disabled={index === 0} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-white/30 bg-white/10 pl-2.5 pr-4 text-sm font-semibold transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronLeft className="size-4" aria-hidden="true" />Previous
                </button>
                <button ref={nextRef} type="button" onClick={next} className="inline-flex min-h-10 min-w-24 items-center justify-center gap-1 rounded-full bg-white pl-5 pr-3.5 text-sm font-bold text-[#0b0b0f] shadow-[0_8px_24px_-8px_rgba(255,255,255,0.5)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  {last ? plan.finalLabel : 'Next'}<ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </m.article>
        </AnimatePresence>
      </div>

      {franchise && <PartnershipModal category="franchise" division={franchise.division} source="welcome-experience" onClose={() => { setFranchise(null); document.documentElement.style.overflow = 'hidden' }} />}
    </div>,
    document.body,
  )
}
