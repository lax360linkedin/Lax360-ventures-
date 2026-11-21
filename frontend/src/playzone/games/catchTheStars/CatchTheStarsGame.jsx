import SaveStatus from '../../components/SaveStatus.jsx'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import { ArrowLeft, ArrowRight, Heart, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX, LogOut, Sparkles } from 'lucide-react'
import Scene from './Scene.jsx'
import { createController, detectQuality } from './controller.js'
import { INSTRUCTIONS, ITEMS, STAGES } from './config.js'
import { plannedAchievements } from '../../data/games.js'
import { usePrefs } from '../../prefs.js'

// The playable Catch the Stars screen: the 3D canvas, the arcade HUD and the overlays (ready, paused, game over, results). It is lazy-loaded by GameStage, so three.js and
// React Three Fiber are downloaded only when a visitor opens this game. Rules live in logic.js, the state machine in controller.js, drawing in Scene.jsx.

const fmt = (n) => Number(n).toLocaleString('en-IN')
const achTitle = (id) => plannedAchievements.find((a) => a.id === id)?.title || id
const ORDER = ['high', 'medium', 'low']

function useHud(controller) {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
}

export default function CatchTheStarsGame({ game, onExit }) {
  const [controller] = useState(createController)
  const prefs = usePrefs()
  const hud = useHud(controller)
  const [quality, setQuality] = useState(() => controller.state.quality)
  const [glFailed, setGlFailed] = useState(false)
  const wrap = useRef(null)
  const popups = useRef(null)
  const phaseRef = useRef(hud.phase)
  phaseRef.current = hud.phase

  // graphics preference changes apply immediately
  useEffect(() => { const q = detectQuality(prefs.graphics); controller.state.quality = q; setQuality(q) }, [prefs.graphics, controller])

  // score pop-ups are drawn straight into the DOM (no React re-render per catch)
  useEffect(() => {
    controller.popup = ([x, y], text, color, doubled) => {
      const host = popups.current; if (!host) return
      const el = document.createElement('div')
      el.textContent = text
      Object.assign(el.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, transform: 'translate(-50%,-50%)', color, fontWeight: 900, fontSize: doubled ? '1.6rem' : '1.3rem', textShadow: '0 2px 8px rgba(0,0,0,.55)', pointerEvents: 'none', whiteSpace: 'nowrap' })
      host.appendChild(el)
      const anim = el.animate(controller.state.reduceMotion ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0, transform: 'translate(-50%,-30%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-90%) scale(1.15)', offset: 0.25 }, { opacity: 0, transform: 'translate(-50%,-190%) scale(1)' }], { duration: 850, easing: 'ease-out' })
      anim.onfinish = () => el.remove()
    }
    controller.onSlow = () => setQuality((q) => ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(q) + 1)])
    return () => { controller.popup = null; controller.onSlow = null }
  }, [controller])

  // keyboard
  useEffect(() => {
    const map = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' }
    const down = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const dir = map[e.key]
      if (dir && phaseRef.current === 'playing') { e.preventDefault(); controller.setKey(dir, true) }
      else if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && (phaseRef.current === 'playing' || phaseRef.current === 'paused')) { e.preventDefault(); controller.togglePause() }
    }
    const up = (e) => { const dir = map[e.key]; if (dir) controller.setKey(dir, false) }
    const lose = () => { controller.clearInput(); controller.autoPause() }
    const vis = () => { if (document.hidden) lose() }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', lose); document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', lose); document.removeEventListener('visibilitychange', vis) }
  }, [controller])

  // on a touch screen the floating assistant would sit on the controls while playing
  useEffect(() => {
    if (hud.phase !== 'playing') return undefined
    document.body.setAttribute('data-pz-playing', '1')
    return () => document.body.removeAttribute('data-pz-playing')
  }, [hud.phase])

  // development only: a handle for manual testing in the console (never present in the production build)
  useEffect(() => { if (!import.meta.env.DEV) return undefined; window.__cts = controller; return () => { delete window.__cts } }, [controller])

  // leaving the page: stop timers and audio
  useEffect(() => () => { controller.autoPause(); controller.dispose() }, [controller])

  // touch / mouse drag: LAXBOT glides toward the finger
  const drag = useRef(false)
  const toWorld = useCallback((e) => {
    const r = wrap.current.getBoundingClientRect()
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1
    return nx * controller.state.view.halfWidth
  }, [controller])
  const onDown = (e) => { if (phaseRef.current !== 'playing' || e.target.closest('button')) return; drag.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); controller.setTarget(toWorld(e)) }
  const onMove = (e) => { if (drag.current && phaseRef.current === 'playing') controller.setTarget(toWorld(e)) }
  const onUp = () => { drag.current = false; controller.state.input.target = null }

  const hold = (dir) => ({
    onPointerDown: (e) => { e.preventDefault(); e.stopPropagation(); controller.setHold(dir, true) },
    onPointerUp: () => controller.setHold(dir, false), onPointerLeave: () => controller.setHold(dir, false), onPointerCancel: () => controller.setHold(dir, false),
  })

  const { phase } = hud
  const playing = phase === 'playing'
  const dpr = quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [1, 1]

  return (
    <div ref={wrap} className="absolute inset-0 select-none overflow-hidden" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      {!glFailed && (
        <Canvas
          camera={{ fov: 42, position: [0, 4.5, 14], near: 0.1, far: 120 }} dpr={dpr} shadows={quality !== 'low'} frameloop="always"
          gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
          onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); controller.autoPause?.(); setGlFailed(true) }); controller.markReady() }}
          aria-label="Catch the Stars 3D game"
        >
          <Scene controller={controller} quality={quality} shadows={quality !== 'low'} />
        </Canvas>
      )}
      {glFailed && (
        <div role="alert" className="absolute inset-0 grid place-items-center p-4"><div className="pz-glass max-w-md p-6 text-center"><p className="font-display text-xl font-semibold">The 3D view stopped</p><p className="pz-soft mt-2">Your device could not keep the 3D graphics running. Reload the page to try again, or set Graphics to Low in the Play Zone settings.</p><button type="button" className="pz-btn pz-btn-primary mt-4" onClick={() => setGlFailed(false)}>Restart the 3D view</button></div></div>
      )}

      <div ref={popups} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" />

      {/* HUD */}
      {(playing || phase === 'paused' || phase === 'gameover') && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 sm:p-4">
          <div className="pz-glass px-3 py-1.5 sm:px-4 sm:py-2" aria-live="off">
            <p className="text-[0.62rem] font-bold uppercase tracking-widest opacity-80">Score</p>
            <p className="font-display text-xl font-extrabold leading-none tabular-nums sm:text-3xl">{fmt(hud.score)}</p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`pz-glass px-4 py-1.5 text-center sm:px-6 sm:py-2 ${hud.secondsLeft <= 5 && playing ? 'ring-2 ring-rose-400' : ''}`}>
              <p className="text-[0.62rem] font-bold uppercase tracking-widest opacity-80">Time</p>
              <p className="font-display text-2xl font-extrabold leading-none tabular-nums sm:text-4xl" role="timer" aria-label={`${hud.secondsLeft} seconds left`}>{hud.secondsLeft}</p>
            </div>
            <span className="pz-chip" style={{ borderColor: STAGES.find((s) => s.id === hud.stageId)?.color }}>{hud.stageLabel}</span>
            {hud.rainbow > 0 && <span className="pz-chip pz-chip-gold" role="status"><Sparkles className="size-3.5" aria-hidden="true" />×2 · {hud.rainbow}s</span>}
          </div>
          <div className="pointer-events-auto flex flex-col items-end gap-1.5">
            <div className="pz-glass flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2" role="img" aria-label={`${hud.lives} of ${hud.maxLives} lives`}>
              {Array.from({ length: hud.maxLives }, (_, i) => <Heart key={i} className={`size-5 sm:size-6 ${i < hud.lives ? 'fill-rose-400 text-rose-300' : 'text-white/30'}`} aria-hidden="true" />)}
            </div>
            <div className="flex gap-1.5">
              <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-3" onClick={controller.toggleMute} aria-label={hud.muted ? 'Turn sound on' : 'Mute sound'} aria-pressed={hud.muted}>{hud.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button>
              <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-3" onClick={controller.togglePause} aria-label={phase === 'paused' ? 'Resume' : 'Pause (P)'} disabled={phase === 'gameover'}>{phase === 'paused' ? <Play className="size-5" /> : <Pause className="size-5" />}</button>
            </div>
          </div>
        </div>
      )}

      {/* on-screen controls (touch devices show them large; keyboard players can ignore them) */}
      {playing && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between p-3 [@media(pointer:fine)]:opacity-40">
          <button type="button" aria-label="Move left" className="pz-btn pz-btn-ghost pointer-events-auto !min-h-14 !px-6" {...hold('left')}><ArrowLeft className="size-6" /></button>
          <button type="button" aria-label="Move right" className="pz-btn pz-btn-ghost pointer-events-auto !min-h-14 !px-6" {...hold('right')}><ArrowRight className="size-6" /></button>
        </div>
      )}

      {phase === 'loading' && !glFailed && <Overlay><p className="font-display text-xl font-semibold">Loading the dream world…</p></Overlay>}

      {phase === 'ready' && (
        <Overlay>
          <h3 className="font-display text-2xl font-extrabold sm:text-4xl">Catch the Stars</h3>
          <p className="pz-soft mt-1 max-w-md text-sm sm:text-base">{INSTRUCTIONS.goal}</p>
          <ul className="mt-3 grid max-w-md grid-cols-2 gap-x-4 gap-y-1 text-left text-xs sm:text-sm">
            {Object.entries(ITEMS).map(([k, v]) => <li key={k}><strong style={{ color: v.color }}>{v.label}</strong> <span className="opacity-80">{v.hint}</span></li>)}
          </ul>
          <p className="pz-soft mt-3 text-xs sm:text-sm">{INSTRUCTIONS.controls}</p>
          {hud.best > 0 && <p className="mt-2 text-sm font-bold text-amber-200">Your best on this device: {fmt(hud.best)}</p>}
          <button type="button" className="pz-btn pz-btn-primary mt-4" onClick={controller.start} autoFocus><Play className="size-5" aria-hidden="true" />Start</button>
          <button type="button" className="mx-auto mt-3 block text-xs underline opacity-80" onClick={onExit}>Back to Play Zone</button>
        </Overlay>
      )}

      {phase === 'paused' && (
        <Overlay>
          <h3 className="font-display text-3xl font-extrabold">Paused</h3>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={controller.resume} autoFocus><Play className="size-5" aria-hidden="true" />Resume</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={controller.restart}><RotateCcw className="size-5" aria-hidden="true" />Restart</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Exit</button>
          </div>
        </Overlay>
      )}

      {phase === 'gameover' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="font-display text-4xl font-extrabold drop-shadow-[0_4px_16px_rgba(0,0,0,.6)] sm:text-6xl" role="status">{hud.lives <= 0 ? 'Out of hearts!' : "Time's up!"}</p>
        </div>
      )}

      {phase === 'results' && hud.results && <Results r={hud.results} controller={controller} onExit={onExit} />}
    </div>
  )
}

function Overlay({ children }) {
  return <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-[#0b0724]/60 p-3 backdrop-blur-[2px]"><div className="pz-glass my-auto w-full max-w-lg p-4 text-center sm:p-7">{children}</div></div>
}

function Results({ r, controller, onExit }) {
  return (
    <Overlay>
      <h3 className="font-display text-2xl font-extrabold sm:text-3xl">{r.finishedRound ? 'Round complete!' : 'Game over'}</h3>
      {r.isNewBest && <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-300/20 px-3 py-1 text-sm font-extrabold text-amber-200" role="status"><Trophy className="size-4" aria-hidden="true" />New personal best!</p>}
      <p className="font-display mt-2 text-5xl font-extrabold tabular-nums text-amber-200 sm:text-6xl">{fmt(r.score)}</p>
      <dl className="mx-auto mt-3 grid max-w-sm grid-cols-2 gap-2 text-sm">
        {[['Stars caught', r.stars + r.golden], ['Diamonds', r.diamonds], ['Survival time', `${r.survived.toFixed(1)} s`], ['Personal best', fmt(r.best)]].map(([k, v]) => <div key={k} className="rounded-xl bg-white/10 px-3 py-2"><dt className="text-[0.65rem] font-bold uppercase tracking-wider opacity-75">{k}</dt><dd className="text-lg font-extrabold tabular-nums">{v}</dd></div>)}
      </dl>
      {r.unlocked?.length > 0 && <ul className="mt-3 space-y-1" role="status">{r.unlocked.map((id) => <li key={id} className="text-sm font-bold text-emerald-200">🏅 Achievement unlocked: {achTitle(id)}</li>)}</ul>}
      <SaveStatus game="catch-the-stars" localHint="Personal best kept on this device." />
      <div className="mt-4 flex flex-wrap justify-center gap-2.5">
        <button type="button" className="pz-btn pz-btn-primary" onClick={controller.restart} autoFocus><RotateCcw className="size-5" aria-hidden="true" />Play again</button>
        <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Back to Play Zone</button>
      </div>
    </Overlay>
  )
}
