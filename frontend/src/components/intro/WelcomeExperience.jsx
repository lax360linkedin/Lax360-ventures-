import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import PartnershipModal from '../network/PartnershipModal.jsx'
import { markWelcomeSeen, setIntroState, welcomePlan } from '../../utils/welcomeIntro.js'
import { WelcomeBackdrop, themeOf } from './welcomeArt.jsx'

/**
 * The Welcome Experience: a full-screen, interactive card presentation shown after the intro animation and before the homepage.
 * Everything on the cards (text, order, buttons, links, images, on/off) comes from the admin panel (Welcome Experience); nothing is built into this file.
 *
 *   - one card at a time, horizontal slide with depth (3D tilt, scale, fade), per-card animated backgrounds with a light pointer parallax;
 *   - Next / Previous, clickable progress bar, "n of N", swipe on touch screens, arrow keys, Esc = skip, a "Skip Intro" button, and a final button that enters the homepage;
 *   - "Franchise Opportunities" opens the website's existing franchise enquiry form (the Our Network one) with the card's division attached;
 *   - the page underneath is inert while the cards are open; reduced-motion visitors get plain fades and no parallax.
 */
const EASE = [0.22, 1, 0.36, 1]
const isInternal = (href) => href.startsWith('/') && !href.startsWith('//')

function splitHeadline(text) { // "Line one. Line two." -> two lines, the second one in the card's accent gradient
  const i = text.indexOf('. ')
  return i > 0 && i < text.length - 3 ? [text.slice(0, i + 1), text.slice(i + 2)] : [text, '']
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
  const rootRef = useRef(null)
  const nextRef = useRef(null)
  const live = useRef({ leaving: false, touch: null, raf: 0 })
  const card = cards[index]
  const last = index === cards.length - 1
  const theme = themeOf(card?.theme)

  // while the cards are open: no scrolling, and the page underneath cannot be reached with the keyboard or a screen reader
  useLayoutEffect(() => {
    const page = document.getElementById('root')
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    if (page) page.inert = true
    return () => { html.style.overflow = prev; if (page) page.inert = false }
  }, [])

  useEffect(() => { nextRef.current?.focus({ preventScroll: true }) }, [])

  const finish = useCallback(() => { // enter the homepage: fade the cards away, then let the homepage animate in
    const s = live.current
    if (s.leaving) return
    s.leaving = true
    markWelcomeSeen()
    setLeaving(true)
    const page = document.getElementById('root')
    if (page) page.inert = false
    // 'done' (not 'revealing': Home would mount the intro animation again for that state): the held-back homepage animations start now that the cards are gone
    window.setTimeout(() => setIntroState('done'), reduce ? 60 : 450)
  }, [reduce])

  const go = useCallback((to) => {
    if (to < 0 || to >= cards.length || to === index) return
    setDir(to > index ? 1 : -1)
    setIndex(to)
  }, [cards.length, index])
  const next = useCallback(() => (last ? finish() : go(index + 1)), [finish, go, index, last])
  const prev = useCallback(() => go(index - 1), [go, index])

  // nothing to show (should not happen: the cards state is only entered with a plan): continue to the homepage
  useEffect(() => { if (!plan) setIntroState('done') }, [plan])

  useEffect(() => {
    const onKey = (e) => {
      if (franchise || live.current.leaving || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowRight') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
      else if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [franchise, next, prev, finish])

  // Swipe: a mostly horizontal drag of at least 50 px changes the card. Vertical movement is left alone, so long text can still be scrolled.
  const onPointerDown = (e) => { if (e.pointerType !== 'mouse' && !e.target.closest('a,button')) live.current.touch = { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e) => {
    const t = live.current.touch
    live.current.touch = null
    if (!t) return
    const dx = e.clientX - t.x
    const dy = e.clientY - t.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)()
  }
  // light parallax (mouse only; the layers read --px / --py)
  const onPointerMove = (e) => {
    if (reduce || e.pointerType !== 'mouse') return
    const s = live.current
    cancelAnimationFrame(s.raf)
    s.raf = requestAnimationFrame(() => {
      const el = rootRef.current
      if (!el) return
      el.style.setProperty('--px', ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3))
      el.style.setProperty('--py', ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3))
    })
  }

  const open = (href) => {
    if (!href) return
    if (isInternal(href)) { markWelcomeSeen(); live.current.leaving = true; setIntroState('done'); navigate(href) } else window.open(href, '_blank', 'noopener,noreferrer')
  }

  if (!plan || typeof document === 'undefined' || !card) return null
  const [line1, line2] = splitHeadline(card.headline)
  const slide = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1, transition: { duration: 0.2 } }, exit: { opacity: 0, transition: { duration: 0.15 } } }
    : {
      enter: (d) => ({ opacity: 0, x: d * 110, scale: 0.93, rotateY: d * -16 }),
      center: { opacity: 1, x: 0, scale: 1, rotateY: 0, transition: { duration: 0.7, ease: EASE, staggerChildren: 0.08, delayChildren: 0.12 } },
      exit: (d) => ({ opacity: 0, x: d * -110, scale: 0.93, rotateY: d * 16, transition: { duration: 0.45, ease: EASE } }),
    }
  const item = reduce
    ? { enter: { opacity: 1 }, center: { opacity: 1 }, exit: { opacity: 1 } }
    : { enter: { opacity: 0, y: 22 }, center: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }, exit: { opacity: 1 } }
  const accent = { backgroundImage: `linear-gradient(90deg, rgb(${theme.a}), rgb(${theme.b}))` }
  const glass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
  const Emblem = theme.Icon

  return createPortal(
    <div ref={rootRef} role="dialog" aria-modal="true" aria-label="Welcome to LAX360 Pvt Ltd" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { live.current.touch = null }} onPointerMove={onPointerMove}
      className="fixed inset-0 z-[1000] select-none overflow-hidden bg-[#0b0b0f] text-white" style={{ opacity: leaving ? 0 : 1, transition: `opacity ${reduce ? 0.05 : 0.45}s ease`, pointerEvents: leaving ? 'none' : 'auto' }}>
      <p className="sr-only" role="status" aria-live="polite">Card {index + 1} of {cards.length}: {card.name}</p>

      <AnimatePresence initial={false}>
        <m.div key={card.theme + index} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0.1 : 0.7 }}>
          <WelcomeBackdrop theme={card.theme} />
        </m.div>
      </AnimatePresence>

      <div className="relative z-10 grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
        {/* top bar: brand and Skip */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4 md:px-10 md:pt-6">
          <div className="flex items-center gap-3">
            <img src="/assets/logo-shield.png" alt="" width="284" height="302" className="h-9 w-auto md:h-11" draggable="false" />
            <span className="font-display text-base font-semibold tracking-tight md:text-lg">LAX360 <span className="text-white/60">Pvt Ltd</span></span>
          </div>
          <button type="button" onClick={finish} className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            {plan.skipLabel}
          </button>
        </div>

        {/* the card */}
        <div className="relative min-h-0 overflow-y-auto overscroll-contain px-5 md:px-10" style={{ perspective: 1600, touchAction: 'pan-y' }}>
          <div className="relative mx-auto flex min-h-full max-w-[1240px] items-center py-5">
            <AnimatePresence mode="popLayout" custom={dir} initial>
              <m.article key={card.id} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" aria-roledescription="slide" aria-label={`${index + 1} of ${cards.length}`}
                className="grid w-full items-center gap-8 lg:grid-cols-12 lg:gap-12" style={{ transformStyle: 'preserve-3d' }}>
                <div className="lg:col-span-7">
                  <m.div variants={item} className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] backdrop-blur">
                      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: `rgb(${theme.a})`, boxShadow: `0 0 10px rgb(${theme.a})` }} />{card.name}
                    </span>
                    {card.status && <span className="inline-flex items-center rounded-full border border-amber-300/60 bg-amber-300/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-amber-200">{card.status}</span>}
                  </m.div>
                  <m.h2 variants={item} className="mt-5 font-display text-[clamp(2rem,5.4vw,4.4rem)] font-bold leading-[1.04] tracking-tight [text-wrap:balance]">
                    {line1}{line2 && <><br /><span className="bg-clip-text text-transparent" style={accent}>{line2}</span></>}
                  </m.h2>
                  <div className="mt-5 max-w-2xl space-y-3 text-[clamp(1rem,1.5vw,1.2rem)] leading-relaxed text-white/85">
                    {card.paragraphs.map((p, i) => <m.p key={i} variants={item}>{p}</m.p>)}
                  </div>
                  {(card.exploreLabel && card.exploreLink) || card.franchise ? (
                    <m.div variants={item} className="mt-7 flex flex-wrap gap-3">
                      {card.franchise && <button type="button" onClick={() => setFranchise({ division: card.division })} className={glass}>{card.franchiseLabel}</button>}
                      {card.exploreLabel && card.exploreLink && (
                        <button type="button" onClick={() => open(card.exploreLink)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-6 font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{ borderColor: `rgb(${theme.a})`, background: `rgba(${theme.a},0.22)` }}>
                          {card.exploreLabel}{isInternal(card.exploreLink) ? <ArrowRight className="size-4" aria-hidden="true" /> : <><ExternalLink className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></>}
                        </button>
                      )}
                    </m.div>
                  ) : null}
                </div>

                {/* the visual: an uploaded image when the administrator set one, otherwise the emblem of the card's background style */}
                <m.div variants={item} className="hidden lg:col-span-5 lg:flex lg:justify-center" style={{ transform: 'translateZ(60px)' }}>
                  {card.image ? (
                    <img src={card.image} alt={card.imageAlt} width="640" height="480" decoding="async" draggable="false" className="max-h-[50vh] w-full rounded-3xl border border-white/25 object-cover shadow-2xl" />
                  ) : index === 0 ? (
                    <div className="relative grid place-items-center">
                      <span aria-hidden="true" className="absolute size-[110%] rounded-full blur-2xl" style={{ background: `radial-gradient(closest-side, rgba(${theme.a},0.55), rgba(${theme.b},0.25) 60%, transparent)` }} />
                      <img src="/assets/logo-shield.png" alt="LAX360 Pvt Ltd logo" width="284" height="302" decoding="async" draggable="false" className="we-float relative h-[min(38vh,22rem)] w-auto drop-shadow-[0_0_30px_rgba(139,92,246,0.7)]" />
                    </div>
                  ) : (
                    <div aria-hidden="true" className="we-float relative grid size-[min(34vh,20rem)] place-items-center rounded-[2.2rem] border border-white/25 bg-white/[0.07] shadow-2xl backdrop-blur" style={{ boxShadow: `0 30px 80px -30px rgba(${theme.a},0.8)` }}>
                      <Emblem className="size-1/2" strokeWidth={1.4} style={{ color: `rgb(${theme.a})`, filter: `drop-shadow(0 0 18px rgba(${theme.a},0.8))` }} />
                    </div>
                  )}
                </m.div>
              </m.article>
            </AnimatePresence>
          </div>
        </div>

        {/* bottom bar: progress and navigation */}
        <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:px-10 md:pb-7">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-3">
            <div className="order-1 flex min-w-0 flex-1 basis-full items-center gap-4 md:order-2 md:basis-auto">
              <p className="shrink-0 font-display text-sm font-semibold tabular-nums tracking-wide" aria-hidden="true"><span className="text-lg">{index + 1}</span> <span className="text-white/60">of {cards.length}</span></p>
              <ol className="flex min-w-0 flex-1 gap-1.5" aria-label="Cards">
                {cards.map((c, i) => (
                  <li key={c.id} className="min-w-0 flex-1">
                    <button type="button" onClick={() => go(i)} aria-label={`Go to card ${i + 1}: ${c.name}`} aria-current={i === index ? 'step' : undefined} className="group flex h-6 w-full items-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white">
                      <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-white/20 transition-[height] group-hover:h-2">
                        <span className="absolute inset-0 origin-left rounded-full" style={{ ...accent, transform: `scaleX(${i <= index ? 1 : 0})`, transition: reduce ? 'none' : 'transform 0.7s cubic-bezier(0.22,1,0.36,1)', opacity: i === index ? 1 : 0.55 }} />
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <button type="button" onClick={prev} disabled={index === 0} className="order-2 inline-flex min-h-12 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 pl-3 pr-5 font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-35 md:order-1">
              <ChevronLeft className="size-5" aria-hidden="true" />Previous
            </button>
            <button ref={nextRef} type="button" onClick={next} className="order-3 ml-auto inline-flex min-h-12 min-w-36 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-bold text-[#0b0b0f] shadow-[0_10px_30px_-8px_rgba(255,255,255,0.45)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              {last ? plan.finalLabel : 'Next'}{last ? <ArrowRight className="size-5" aria-hidden="true" /> : <ChevronRight className="size-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {franchise && <PartnershipModal category="franchise" division={franchise.division} source="welcome-experience" onClose={() => { setFranchise(null); document.documentElement.style.overflow = 'hidden' }} />}
    </div>,
    document.body,
  )
}
