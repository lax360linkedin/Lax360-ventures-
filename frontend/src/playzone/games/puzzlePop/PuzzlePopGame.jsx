import SaveStatus from '../../components/SaveStatus.jsx'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import { ChevronRight, Lightbulb, Lock, LogOut, Pause, Play, RotateCcw, Star, Trophy, Volume2, VolumeX, Bomb, Rocket, Sparkles } from 'lucide-react'
import Scene from './Scene.jsx'
import { createController } from './controller.js'
import { detectQuality } from '../catchTheStars/controller.js'
import { LEVELS, WORLDS, GEM_COLORS } from './levels.js'
import { completedCount, isUnlocked, totalStars, useProgress, worldStars } from './progress.js'
import { SCORE } from './engine.js'
import { usePrefs } from '../../prefs.js'

// The playable Puzzle Pop screen: the 3D canvas, the HUD, touch / mouse / keyboard input and every overlay. Lazy-loaded by GameStage, so three.js and React Three Fiber are downloaded only when
// someone opens this game. Rules: engine.js · levels: levels.js · state machine and animation: controller.js · drawing: Scene.jsx.

const ORDER = ['high', 'medium', 'low']
const fmt = (n) => Number(n).toLocaleString('en-IN')
const worldBg = (w) => { const t = { 1: ['#5b2a86', '#c05fb0'], 2: ['#032a4a', '#0a6f8f'], 3: ['#1d3a6e', '#6fa6e0'], 4: ['#a8531c', '#ffc86b'], 5: ['#0a0524', '#7a3fd0'] }[w]; return `linear-gradient(150deg, ${t[0]}, ${t[1]})` }
const useHud = (controller) => useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)

export default function PuzzlePopGame({ onExit }) {
  const [controller] = useState(createController)
  const prefs = usePrefs()
  const hud = useHud(controller)
  const progress = useProgress()
  const [quality, setQuality] = useState(() => controller.state.quality)
  const [glFailed, setGlFailed] = useState(false)
  const wrap = useRef(null); const popups = useRef(null)
  const phaseRef = useRef(hud.phase); phaseRef.current = hud.phase
  const drag = useRef(null)
  const { phase } = hud
  const inGame = ['playing', 'resolving', 'paused'].includes(phase)

  useEffect(() => { const q = detectQuality(prefs.graphics); controller.state.quality = q; setQuality(q) }, [prefs.graphics, controller])
  useEffect(() => {
    controller.onSlow = () => setQuality((q) => ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(q) + 1)])
    controller.popup = ([x, y], text, color, big) => { // score pop-ups are written straight into the page (no React render per match)
      const host = popups.current; if (!host) return
      const el = document.createElement('div'); el.textContent = text
      Object.assign(el.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, transform: 'translate(-50%,-50%)', color, fontWeight: 900, fontSize: big ? '1.5rem' : '1.15rem', textShadow: '0 2px 8px rgba(0,0,0,.6)', pointerEvents: 'none', whiteSpace: 'nowrap' })
      host.appendChild(el)
      const anim = el.animate(controller.state.reduceMotion ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0, transform: 'translate(-50%,-20%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-80%) scale(1.15)', offset: 0.25 }, { opacity: 0, transform: 'translate(-50%,-170%) scale(1)' }], { duration: 900, easing: 'ease-out' })
      anim.onfinish = () => el.remove()
    }
    return () => { controller.onSlow = null; controller.popup = null }
  }, [controller])

  // keyboard: P / Esc pause; arrow keys move a cursor over the board, Enter or Space select and swap (an alternative to the pointer)
  useEffect(() => {
    const down = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !['playing', 'resolving', 'paused'].includes(phaseRef.current)) return
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || (e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' '))) return
      const st = controller.state
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); controller.togglePause(); return }
      if (phaseRef.current !== 'playing') return
      const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key]
      if (d) { e.preventDefault(); st.cursorOn = true; const cur = st.cursor || [3, 3]; st.cursor = [Math.max(0, Math.min(7, cur[0] + d[0])), Math.max(0, Math.min(7, cur[1] + d[1]))]; return }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); st.cursorOn = true; st.cursor = st.cursor || [3, 3]; controller.tap(st.cursor[0], st.cursor[1]) }
    }
    const lose = () => controller.autoPause()
    const vis = () => { if (document.hidden) lose() }
    window.addEventListener('keydown', down); window.addEventListener('blur', lose); document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('blur', lose); document.removeEventListener('visibilitychange', vis) }
  }, [controller])

  useEffect(() => { if (import.meta.env.DEV) { window.__pp = controller; return () => { delete window.__pp } } return undefined }, [controller])
  useEffect(() => () => { controller.autoPause(); controller.dispose() }, [controller])
  useEffect(() => { // on a touch screen the floating assistant would sit on the board while playing
    if (!['playing', 'resolving'].includes(phase)) return undefined
    document.body.setAttribute('data-pz-playing', '1')
    return () => document.body.removeAttribute('data-pz-playing')
  }, [phase])

  // ---- pointer input: tap two neighbours, or drag / swipe a crystal toward its neighbour ----
  const onDown = (e) => {
    if (phaseRef.current !== 'playing' || e.target.closest('button')) return
    const cell = controller.pick?.(e.clientX, e.clientY)
    if (!cell) return
    controller.state.cursorOn = false
    drag.current = { r: cell[0], c: cell[1], x: e.clientX, y: e.clientY, id: e.pointerId, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d || d.moved || phaseRef.current !== 'playing') return
    const dx = e.clientX - d.x; const dy = e.clientY - d.y
    const cellPx = wrap.current ? Math.min(wrap.current.clientWidth, wrap.current.clientHeight) / 10 : 36
    if (Math.hypot(dx, dy) < cellPx * 0.45) return
    d.moved = true
    if (Math.abs(dx) > Math.abs(dy)) controller.swipe(d.r, d.c, 0, dx > 0 ? 1 : -1); else controller.swipe(d.r, d.c, dy > 0 ? 1 : -1, 0)
  }
  const onUp = () => { const d = drag.current; drag.current = null; if (d && !d.moved && phaseRef.current === 'playing') controller.tap(d.r, d.c) }

  const dpr = quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [1, 1]
  const world = WORLDS[hud.world - 1]
  const levelsOfWorld = LEVELS.filter((l) => l.world === controller.state.world)

  return (
    <div ref={wrap} className="absolute inset-0 select-none overflow-hidden" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null }}>
      {!glFailed && (
        <Canvas key="pp" camera={{ fov: 40, position: [0, 1.7, 16], near: 0.1, far: 120 }} dpr={dpr} gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
          onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); controller.autoPause?.(); setGlFailed(true) }); controller.markReady() }} aria-label="Puzzle Pop 3D board">
          <Scene key={hud.levelIndex + hud.worldName} controller={controller} quality={quality} />
        </Canvas>
      )}
      {glFailed && <div role="alert" className="absolute inset-0 grid place-items-center p-4"><div className="pz-glass max-w-md p-6 text-center"><p className="font-display text-xl font-semibold">The 3D view stopped</p><p className="pz-soft mt-2">Your device could not keep the 3D graphics running. Reload the page, or set Graphics to Low in the Play Zone settings.</p><button type="button" className="pz-btn pz-btn-primary mt-4" onClick={() => setGlFailed(false)}>Restart the 3D view</button></div></div>}
      <div ref={popups} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" />
      <p className="sr-only" role="status" aria-live="polite">{hud.message}</p>

      {inGame && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-1.5 p-2 sm:p-3">
            <div className="pz-glass px-3 py-1.5 leading-tight sm:px-4 sm:py-2">
              <p className="text-[0.58rem] font-bold uppercase tracking-widest opacity-80">World {hud.world} · {hud.worldName}</p>
              <p className="text-xs font-bold sm:text-sm">Level {hud.levelNumber}: {hud.levelName}</p>
            </div>
            <div className="pz-glass flex items-center gap-3 px-3 py-1.5 sm:gap-5 sm:py-2" aria-live="off">
              <div className="text-center leading-tight"><p className="text-[0.58rem] font-bold uppercase tracking-widest opacity-80">Score</p><p className="font-display text-lg font-extrabold tabular-nums sm:text-2xl">{fmt(hud.score)}</p></div>
              <div className="text-center leading-tight"><p className="text-[0.58rem] font-bold uppercase tracking-widest opacity-80">Moves</p><p className={`font-display text-lg font-extrabold tabular-nums sm:text-2xl ${hud.moves <= 3 ? 'text-rose-300' : ''}`} role="timer" aria-label={`${hud.moves} moves left`}>{hud.moves}</p></div>
            </div>
            <div className="pointer-events-auto flex items-center gap-1.5">
              {hud.hintAvailable && <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-3" onClick={controller.hint} aria-label="Show a hint" disabled={phase !== 'playing'}><Lightbulb className="size-5" /></button>}
              <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-3" onClick={controller.restart} aria-label="Restart level"><RotateCcw className="size-5" /></button>
              <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-3" onClick={controller.toggleMute} aria-label={hud.muted ? 'Turn sound on' : 'Mute sound'} aria-pressed={hud.muted}>{hud.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button>
              <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-3" onClick={controller.togglePause} aria-label={phase === 'paused' ? 'Resume' : 'Pause (P)'}>{phase === 'paused' ? <Play className="size-5" /> : <Pause className="size-5" />}</button>
            </div>
          </div>
          {/* objectives and active power-ups */}
          <ul className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1.5 p-2 sm:gap-2 sm:p-3" aria-label="Goals">
            {hud.objectives.map((o, i) => (
              <li key={i} className={`pz-glass flex items-center gap-1.5 px-2.5 py-1 text-[0.7rem] font-bold sm:text-xs ${o.done ? 'ring-1 ring-emerald-300' : ''}`}>
                {o.type === 'collect' && <span className="size-3 rounded-full" style={{ background: GEM_COLORS[o.color] }} aria-hidden="true" />}
                {o.done ? <span className="text-emerald-300" aria-hidden="true">✓</span> : null}
                <span>{o.label}</span><span className="tabular-nums opacity-90">{fmt(o.current)}/{fmt(o.target)}</span>
              </li>
            ))}
            {(hud.power.rocket > 0 || hud.power.bomb > 0 || hud.power.rainbow > 0) && (
              <li className="pz-glass flex items-center gap-2 px-2.5 py-1 text-[0.7rem] font-bold sm:text-xs" aria-label="Power-ups on the board">
                {hud.power.rocket > 0 && <span className="flex items-center gap-1"><Rocket className="size-3.5 text-amber-300" aria-hidden="true" />{hud.power.rocket}</span>}
                {hud.power.bomb > 0 && <span className="flex items-center gap-1"><Bomb className="size-3.5 text-orange-300" aria-hidden="true" />{hud.power.bomb}</span>}
                {hud.power.rainbow > 0 && <span className="flex items-center gap-1"><Sparkles className="size-3.5 text-fuchsia-300" aria-hidden="true" />{hud.power.rainbow}</span>}
              </li>
            )}
          </ul>
          {hud.message && <div className="pointer-events-none absolute inset-x-0 top-[24%] grid place-items-center"><p className="pz-glass px-5 py-2 font-display text-lg font-extrabold sm:text-2xl">{hud.message}</p></div>}
        </>
      )}

      {phase === 'loading' && !glFailed && <Overlay><p className="font-display text-xl font-semibold">Polishing the crystals…</p></Overlay>}

      {phase === 'menu' && (
        <Overlay bg={worldBg(1)}>
          <p className="pz-eyebrow">LAX360 Play Zone</p>
          <h3 className="font-display text-3xl font-extrabold sm:text-5xl">Puzzle Pop</h3>
          <p className="pz-soft mx-auto mt-2 max-w-md text-sm sm:text-base">Swap neighbouring crystals to match three or more. Build Rocket, Bomb and Rainbow crystals, chain cascades and clear 25 levels in five magical worlds.</p>
          <p className="mt-2 text-sm font-bold text-amber-200">★ {totalStars(progress)} / {LEVELS.length * 3} stars · {completedCount(progress)} / {LEVELS.length} levels · saved on this device</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={controller.openWorlds} autoFocus><Play className="size-5" aria-hidden="true" />Play</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Back to Play Zone</button>
          </div>
          <dl className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-x-3 gap-y-1 text-left text-xs opacity-90">
            <dt className="font-bold">Swap</dt><dd>Drag or swipe a crystal · or tap two neighbours</dd>
            <dt className="font-bold">Keyboard</dt><dd>Arrows move, Enter or Space selects and swaps</dd>
            <dt className="font-bold">Pause</dt><dd>P or Esc · pause button</dd>
          </dl>
        </Overlay>
      )}

      {phase === 'worlds' && (
        <Overlay wide>
          <h3 className="font-display text-2xl font-extrabold sm:text-3xl">Choose a world</h3>
          <ul className="mt-3 grid gap-2.5 text-left sm:grid-cols-2">
            {WORLDS.map((w) => {
              const first = LEVELS.findIndex((l) => l.world === w.id); const open = isUnlocked(progress, first)
              return (
                <li key={w.id}>
                  <button type="button" disabled={!open} onClick={() => controller.openLevels(w.id)} aria-label={`${w.name}${open ? '' : ', locked'}`} className="flex w-full items-center gap-3 rounded-2xl border border-white/20 p-3 text-left transition disabled:opacity-55 enabled:hover:-translate-y-0.5 enabled:hover:border-white/50" style={{ background: worldBg(w.id) }}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-black/30 font-display text-xl font-extrabold">{open ? w.id : <Lock className="size-5" aria-hidden="true" />}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-display text-base font-bold">{w.name}</span><span className="block text-xs opacity-90">{w.blurb}</span><span className="mt-0.5 block text-xs font-bold">★ {worldStars(progress, w.id)} / 15</span></span>
                    {open && <ChevronRight className="size-5 shrink-0 opacity-70" aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
          <button type="button" className="mx-auto mt-3 block text-xs underline opacity-80" onClick={controller.openMenu}>Back</button>
        </Overlay>
      )}

      {phase === 'levels' && (
        <Overlay bg={worldBg(controller.state.world)}>
          <h3 className="font-display text-2xl font-extrabold sm:text-3xl">{WORLDS[controller.state.world - 1].name}</h3>
          <ul className="mt-3 grid gap-2 text-left">
            {levelsOfWorld.map((l) => {
              const idx = LEVELS.indexOf(l); const open = isUnlocked(progress, idx); const rec = progress.levels[l.id]
              return (
                <li key={l.id}>
                  <button type="button" disabled={!open} onClick={() => controller.selectLevel(idx)} aria-label={`Level ${l.index}: ${l.name}${open ? '' : ', locked'}`} className="flex w-full items-center gap-3 rounded-xl border border-white/20 bg-black/25 p-2.5 text-left transition disabled:opacity-55 enabled:hover:border-white/60">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15 font-display text-lg font-extrabold">{open ? l.index : <Lock className="size-4" aria-hidden="true" />}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{l.name}</span><span className="block text-[0.7rem] opacity-85">{l.moves} moves{rec?.best ? ` · best ${fmt(rec.best)}` : ''}{rec?.completed ? '' : open ? ' · new' : ''}</span></span>
                    <span className="flex gap-0.5" aria-label={`${rec?.stars || 0} of 3 stars`}>{[1, 2, 3].map((n) => <Star key={n} className={`size-4 ${(rec?.stars || 0) >= n ? 'fill-amber-300 text-amber-300' : 'text-white/35'}`} aria-hidden="true" />)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <button type="button" className="mx-auto mt-3 block text-xs underline opacity-90" onClick={controller.openWorlds}>All worlds</button>
        </Overlay>
      )}

      {phase === 'ready' && (
        <Overlay bg={worldBg(hud.world)}>
          <p className="pz-eyebrow" style={{ color: world.accent }}>{hud.worldName} · Level {hud.levelNumber}</p>
          <h3 className="font-display text-2xl font-extrabold sm:text-4xl">{hud.levelName}</h3>
          <p className="mt-2 text-sm font-bold">Goals ({hud.maxMoves} moves)</p>
          <ul className="mx-auto mt-1 max-w-sm space-y-1 text-sm">
            {hud.objectives.map((o, i) => <li key={i} className="rounded-lg bg-black/25 px-3 py-1.5">{o.label} <strong className="tabular-nums">{fmt(o.target)}</strong></li>)}
          </ul>
          {hud.tip && <p className="mx-auto mt-3 max-w-md rounded-xl bg-black/25 px-3 py-2 text-xs sm:text-sm">💡 {hud.tip}{hud.hintAvailable ? ' The light bulb button shows a hint.' : ''}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={controller.start} autoFocus><Play className="size-5" aria-hidden="true" />Start</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={() => controller.openLevels(hud.world)}>Levels</button>
          </div>
        </Overlay>
      )}

      {phase === 'paused' && (
        <Overlay>
          <h3 className="font-display text-3xl font-extrabold">Paused</h3>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={controller.resume} autoFocus><Play className="size-5" aria-hidden="true" />Resume</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={controller.restart}><RotateCcw className="size-5" aria-hidden="true" />Restart level</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={() => controller.openLevels(hud.world)}>Levels</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Exit</button>
          </div>
        </Overlay>
      )}

      {phase === 'complete' && hud.results && (
        <Overlay bg={worldBg(hud.world)}>
          <h3 className="font-display text-2xl font-extrabold sm:text-3xl">Level complete!</h3>
          <div className="mt-1 flex justify-center gap-1" role="img" aria-label={`${hud.results.stars} of 3 stars`}>{[1, 2, 3].map((n) => <Star key={n} className={`size-9 sm:size-11 ${hud.results.stars >= n ? 'fill-amber-300 text-amber-300' : 'text-white/35'}`} aria-hidden="true" />)}</div>
          {hud.results.isNewBest && <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-300/20 px-3 py-1 text-xs font-extrabold text-amber-200" role="status"><Trophy className="size-4" aria-hidden="true" />New personal best</p>}
          <table className="mx-auto mt-2 w-full max-w-xs text-sm"><tbody>
            <tr className="border-b border-white/10"><td className="py-1 text-left">Level complete</td><td className="py-1 text-right font-bold tabular-nums">{fmt(SCORE.complete)}</td></tr>
            <tr className="border-b border-white/10"><td className="py-1 text-left">Moves left ({hud.results.movesLeft} × {SCORE.perMoveLeft})</td><td className="py-1 text-right font-bold tabular-nums">{fmt(hud.results.movesLeft * SCORE.perMoveLeft)}</td></tr>
            <tr><td className="pt-2 text-left font-display text-base font-extrabold">Total score</td><td className="pt-2 text-right font-display text-xl font-extrabold tabular-nums text-amber-200">{fmt(hud.results.score)}</td></tr>
          </tbody></table>
          {hud.results.unlockedNext && <p className="mt-2 text-sm font-bold text-emerald-200" role="status">🔓 Next level unlocked</p>}
          <p className="pz-soft mt-2 text-[0.7rem]">★★ with a quarter of the moves left · ★★★ with half left.</p>
          <SaveStatus game="puzzle-pop" localHint="Progress is saved on this device." />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {hud.hasNext && <button type="button" className="pz-btn pz-btn-primary" onClick={controller.next} autoFocus>Next level<ChevronRight className="size-5" aria-hidden="true" /></button>}
            <button type="button" className={`pz-btn ${hud.hasNext ? 'pz-btn-ghost' : 'pz-btn-primary'}`} onClick={controller.restart} autoFocus={!hud.hasNext}><RotateCcw className="size-5" aria-hidden="true" />Replay</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={() => controller.openLevels(hud.world)}>Levels</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Play Zone</button>
          </div>
        </Overlay>
      )}

      {phase === 'failed' && (
        <Overlay>
          <h3 className="font-display text-3xl font-extrabold">Out of moves</h3>
          <p className="pz-soft text-sm">Not quite this time. These goals were still open:</p>
          <ul className="mx-auto mt-2 max-w-sm space-y-1 text-sm">{(hud.results?.objectives || hud.objectives).filter((o) => !o.done).map((o, i) => <li key={i} className="rounded-lg bg-black/25 px-3 py-1.5">{o.label} <strong className="tabular-nums">{fmt(o.current)}/{fmt(o.target)}</strong></li>)}</ul>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={controller.restart} autoFocus><RotateCcw className="size-5" aria-hidden="true" />Try again</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={() => controller.openLevels(hud.world)}>Levels</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Back to Play Zone</button>
          </div>
        </Overlay>
      )}
    </div>
  )
}

function Overlay({ children, wide, bg }) {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-[#0b0724]/70 p-2.5 backdrop-blur-[2px] sm:p-4">
      <div className={`pz-glass my-auto w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} p-4 text-center sm:p-6`} style={bg ? { backgroundImage: `linear-gradient(rgba(10,8,30,.55), rgba(10,8,30,.55)), ${bg}` } : undefined}>{children}</div>
    </div>
  )
}
void useCallback
