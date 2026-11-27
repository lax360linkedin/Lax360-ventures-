import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Mic, PhoneOff, Volume2 } from 'lucide-react'
import MiniBot from '../art/MiniBot.jsx'

/**
 * A VISUAL ONLY illustration of the LAX360 AI assistant on a voice call: the bot dials (rings spread from its avatar, "Calling…"), the call connects (a timer starts), the bot speaks
 * (its sound wave moves), then it listens (the caller's wave moves), and so on, in a loop. Nothing here is a real call: no microphone, no audio, no network, nothing clickable
 * (the whole card is aria-hidden; a visually hidden sentence describes it). It only animates transform and opacity, pauses when it is off screen or the tab is hidden, and under
 * "prefers-reduced-motion" shows one still frame (the call connected, the bot speaking) with no movement.
 */
const PHASES = [
  { id: 'calling', label: 'Calling…', ms: 2800, wave: null, line: null },
  { id: 'connected', label: 'Connected', ms: 1500, wave: null, line: null },
  { id: 'speaking', label: 'Speaking', ms: 3700, wave: 'bot', line: { who: 'bot', text: 'Hi! This is the LAX360 AI assistant. How can I help you today?' } },
  { id: 'listening', label: 'Listening…', ms: 3500, wave: 'user', line: { who: 'user', text: 'I would like a quote for a mobile app.' } },
  { id: 'speaking', label: 'Speaking', ms: 3500, wave: 'bot', line: { who: 'bot', text: 'Of course. Let me note a few details and connect you with the team.' } },
  { id: 'ended', label: 'Call ended', ms: 1700, wave: null, line: null },
]
const TONE = { calling: '#fbbf24', connected: '#34d399', speaking: 'rgb(var(--glow2))', listening: '#a78bfa', ended: '#94a3b8' }
const BARS = Array.from({ length: 26 }, (_, i) => {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453
  const r = x - Math.floor(x)
  const env = Math.sin((i / 25) * Math.PI) // taller in the middle, like a voice
  return { h: (0.35 + 0.65 * r) * (0.45 + 0.55 * env), d: -(r * 1.4), s: 0.55 + r * 0.6 }
})
const clock = (s) => `00:${String(s).padStart(2, '0')}`

function Wave({ who, on, color }) {
  return (
    <div className="vc-wave flex h-9 items-center justify-center gap-[3px]" data-on={on || undefined} aria-hidden="true">
      {BARS.map((b, i) => <span key={i} className="vc-bar block h-full w-[3px] rounded-full" style={{ '--h': b.h.toFixed(2), '--d': `${b.d.toFixed(2)}s`, '--s': `${b.s.toFixed(2)}s`, background: color, opacity: on ? 1 : 0.35 }} />)}
    </div>
  )
}

export default function BotCall({ className = '' }) {
  const reduce = useReducedMotion()
  const root = useRef(null)
  const [visible, setVisible] = useState(true)
  const [i, setI] = useState(reduce ? 2 : 0)
  const [secs, setSecs] = useState(0)
  const phase = PHASES[reduce ? 2 : i]

  useEffect(() => {
    const el = root.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    const onVis = () => setVisible(!document.hidden && el.getBoundingClientRect().top < window.innerHeight)
    document.addEventListener('visibilitychange', onVis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  // the call moves from one stage to the next; only while it is on screen
  useEffect(() => {
    if (reduce || !visible) return undefined
    const t = window.setTimeout(() => { setI((n) => { const next = (n + 1) % PHASES.length; if (next === 0) setSecs(0); return next }) }, phase.ms)
    return () => window.clearTimeout(t)
  }, [i, visible, reduce, phase.ms])
  // the call timer runs while the call is connected
  const live = phase.id !== 'calling' && phase.id !== 'ended'
  useEffect(() => {
    if (reduce || !visible || !live) return undefined
    const t = window.setInterval(() => setSecs((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [live, visible, reduce])

  const tone = TONE[phase.id]
  const shownSecs = reduce ? 12 : secs
  return (
    <div ref={root} aria-hidden="true" data-phase={phase.id} data-paused={!visible || reduce || undefined}
      className={`vc relative isolate mx-auto w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-white/10 p-5 text-white shadow-[0_40px_90px_-34px_rgb(var(--glow)/0.7),0_18px_40px_-26px_rgba(0,0,0,0.6)] sm:p-6 ${className}`}
      style={{ background: 'linear-gradient(160deg, color-mix(in srgb, rgb(var(--glow)) 22%, #070d1a) 0%, #0a1020 55%, color-mix(in srgb, rgb(var(--glow2)) 12%, #070b14) 100%)' }}>
      <span className="sr-only">Illustration: the LAX360 AI assistant on a voice call, speaking and listening.</span>
      <div className="pointer-events-none absolute -right-16 -top-16 -z-10 size-56 rounded-full opacity-60" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow) / 0.45), transparent 72%)' }} />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '34px 34px', maskImage: 'radial-gradient(70% 60% at 50% 30%, #000, transparent)', WebkitMaskImage: 'radial-gradient(70% 60% at 50% 30%, #000, transparent)' }} />

      {/* the call header: who, and the live status */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.95rem] font-bold leading-tight">LAX360 AI Assistant</p>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/55">Voice call</p>
        </div>
        <span key={phase.id + i} className="vc-pill inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[0.72rem] font-bold backdrop-blur-md">
          <span className="vc-dot relative inline-block size-2 rounded-full" style={{ background: tone, boxShadow: `0 0 10px ${tone}` }} />{phase.label}
        </span>
      </div>

      {/* the bot, in its avatar: rings spread while it calls, a steady glow once connected */}
      <div className="relative mx-auto mt-5 grid size-36 place-items-center">
        {phase.id === 'calling' && [0, 1, 2].map((n) => <span key={n} className="vc-ring absolute inset-3 rounded-full border-2" style={{ borderColor: tone, animationDelay: `${n * 0.8}s` }} />)}
        {live && <span className="vc-halo absolute inset-1 rounded-full" style={{ background: `radial-gradient(closest-side, color-mix(in srgb, ${tone} 38%, transparent), transparent 72%)` }} />}
        <span className="vc-avatar relative grid size-28 place-items-center overflow-hidden rounded-full border border-white/25 bg-gradient-to-br from-white/20 to-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl">
          <span className="vc-bot translate-y-1"><MiniBot pose="hold" size={64} /></span>
        </span>
        {phase.id === 'speaking' && <span className="vc-pulse absolute inset-0 rounded-full border" style={{ borderColor: 'rgb(var(--glow2) / 0.5)' }} />}
      </div>
      <p className="mt-2 text-center text-sm font-semibold tabular-nums text-white/80">{phase.id === 'calling' ? 'Dialling…' : phase.id === 'ended' ? `Call ended · ${clock(shownSecs)}` : clock(shownSecs)}</p>

      {/* sound: the assistant's voice and the caller's voice move only when each is talking */}
      <div className="mt-4 space-y-2.5 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
        <div className="flex items-center gap-3"><span className="w-14 shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/60">Assistant</span><div className="flex-1"><Wave who="bot" on={phase.wave === 'bot' && !reduce} color="rgb(var(--glow2))" /></div></div>
        <div className="flex items-center gap-3"><span className="w-14 shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/60">You</span><div className="flex-1"><Wave who="user" on={phase.wave === 'user' && !reduce} color="#a78bfa" /></div></div>
      </div>

      {/* what is being said (illustrative) */}
      <div className="mt-3 min-h-[3.6rem]">
        {phase.line && (
          <p key={`${i}-${phase.line.who}`} className={`vc-line max-w-[90%] rounded-2xl px-3.5 py-2 text-[0.8rem] leading-snug ${phase.line.who === 'bot' ? 'rounded-bl-sm bg-white/10' : 'ml-auto rounded-br-sm text-white'}`}
            style={phase.line.who === 'user' ? { background: 'linear-gradient(135deg, color-mix(in srgb, rgb(var(--glow)) 70%, #000), rgb(var(--glow2)))' } : undefined}>{phase.line.text}</p>
        )}
      </div>

      {/* the call buttons: decorative */}
      <div className="mt-3 flex items-center justify-center gap-5">
        <span className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/[0.07]"><Mic className="size-5 text-white/80" /></span>
        <span className="grid size-12 place-items-center rounded-full bg-red-500 shadow-[0_10px_24px_-8px_rgba(239,68,68,0.9)]"><PhoneOff className="size-5" /></span>
        <span className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/[0.07]"><Volume2 className="size-5 text-white/80" /></span>
      </div>
    </div>
  )
}
