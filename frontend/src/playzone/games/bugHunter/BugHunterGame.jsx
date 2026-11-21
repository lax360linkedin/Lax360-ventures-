import SaveStatus from '../../components/SaveStatus.jsx'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import { ArrowUp, Bug, ChevronRight, Flag, Heart, Lock, LogOut, Pause, Play, RotateCcw, Shield, Star, Trophy, Volume2, VolumeX, Wrench, Zap, Magnet, Snowflake, Gauge } from 'lucide-react'
import Scene from './Scene.jsx'
import PuzzlePanel from './PuzzlePanel.jsx'
import { createController } from './controller.js'
import { detectQuality } from '../catchTheStars/controller.js'
import { LEVELS, WORLDS } from './levels.js'
import { SCORE } from './config.js'
import { isUnlocked, totalStars, useProgress } from './progress.js'
import { usePrefs } from '../../prefs.js'

// The playable Bug Hunter screen: the 3D canvas, the HUD, keyboard / mouse / touch controls, the repair panel and every overlay. Lazy-loaded by GameStage, so three.js and React Three
// Fiber are downloaded only when someone opens this game. Rules: logic.js / puzzles.js · levels: levels.js · state machine: controller.js · drawing: Scene.jsx.

const ORDER = ['high', 'medium', 'low']
const fmt = (n) => Number(n).toLocaleString('en-IN')
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const bg = (w) => ({ 1: 'linear-gradient(150deg,#0b2a3a,#1e6b6f)', 2: 'linear-gradient(150deg,#07061a,#2a1f6b)', 3: 'linear-gradient(150deg,#021b3a,#0b4f8a)', 4: 'linear-gradient(150deg,#0a0524,#7a3fd0)', 5: 'linear-gradient(150deg,#12031f,#c23a8a)' }[w])
const useHud = (controller) => useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
const POWER_ICONS = { magnet: [Magnet, '#f472b6', 'Magnet'], freeze: [Snowflake, '#7dd3fc', 'Freeze'], speed: [Gauge, '#fcd34d', 'Speed'] }

export default function BugHunterGame({ onExit }) {
  const [controller] = useState(createController)
  const prefs = usePrefs()
  const hud = useHud(controller)
  const progress = useProgress()
  const [quality, setQuality] = useState(() => controller.state.quality)
  const [glFailed, setGlFailed] = useState(false)
  const [touch, setTouch] = useState(() => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)
  const wrap = useRef(null); const popups = useRef(null)
  const phaseRef = useRef(hud.phase); phaseRef.current = hud.phase
  const { phase } = hud
  const live = phase === 'playing' || phase === 'boss'
  const inGame = live || phase === 'paused' || phase === 'repair'
  const level = LEVELS[hud.levelIndex]

  useEffect(() => { const q = detectQuality(prefs.graphics); controller.state.quality = q; setQuality(q) }, [prefs.graphics, controller])
  useEffect(() => {
    controller.onSlow = () => setQuality((q) => ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(q) + 1)])
    controller.popup = ([x, y], text, color, big) => {
      const host = popups.current; if (!host) return
      const el = document.createElement('div'); el.textContent = text
      Object.assign(el.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, transform: 'translate(-50%,-50%)', color, fontWeight: 900, fontSize: big ? '1.5rem' : '1.1rem', textShadow: '0 2px 8px rgba(0,0,0,.7)', pointerEvents: 'none', whiteSpace: 'nowrap' })
      host.appendChild(el)
      const anim = el.animate(controller.state.reduceMotion ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0, transform: 'translate(-50%,-20%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-90%) scale(1.15)', offset: 0.25 }, { opacity: 0, transform: 'translate(-50%,-180%) scale(1)' }], { duration: 950, easing: 'ease-out' })
      anim.onfinish = () => el.remove()
    }
    return () => { controller.onSlow = null; controller.popup = null }
  }, [controller])

  // keyboard: only while a level is being played, paused or repaired, so Tab, links and forms elsewhere keep working
  useEffect(() => {
    const map = { w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right' }
    const editable = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
    const active = () => ['playing', 'boss', 'paused', 'repair'].includes(phaseRef.current)
    const down = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || editable(e.target) || !active()) return
      const ph = phaseRef.current
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); if (ph === 'repair') controller.closePuzzle(); else controller.togglePause(); return }
      if (ph !== 'playing' && ph !== 'boss') return
      const dir = map[e.key]
      if (dir) { e.preventDefault(); controller.setKey(dir, true) }
      else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (!e.repeat) controller.pressJump() }
      else if (e.key === 'Shift') controller.setSprint(true)
      else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); if (!e.repeat) controller.pressInteract() }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); if (!e.repeat) controller.pressCapture() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); controller.addYaw(-0.12) } else if (e.key === 'ArrowRight') { e.preventDefault(); controller.addYaw(0.12) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); controller.addYaw(0, 0.05) } else if (e.key === 'ArrowDown') { e.preventDefault(); controller.addYaw(0, -0.05) }
    }
    const up = (e) => { const dir = map[e.key]; if (dir) controller.setKey(dir, false); if (e.key === 'Shift') controller.setSprint(false) }
    const lose = () => { controller.clearInput(); controller.autoPause() }
    const vis = () => { if (document.hidden) lose() }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', lose); document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', lose); document.removeEventListener('visibilitychange', vis) }
  }, [controller])

  useEffect(() => { if (import.meta.env.DEV) { window.__bh = controller; return () => { delete window.__bh } } return undefined }, [controller])
  useEffect(() => () => { controller.autoPause(); controller.dispose() }, [controller])
  useEffect(() => {
    if (!(touch && (phase === 'playing' || phase === 'boss'))) return undefined
    document.body.setAttribute('data-pz-playing', '1')
    return () => document.body.removeAttribute('data-pz-playing')
  }, [touch, phase])

  // ---- mouse: drag turns the camera, a click throws the net; touch: the right side of the screen turns the camera ----
  const look = useRef(null)
  const onDown = (e) => {
    if (!live || e.target.closest('button, [data-touch-ui]')) return
    if (e.pointerType === 'touch') setTouch(true)
    look.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, touch: e.pointerType === 'touch' }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    const l = look.current
    if (!l || l.id !== e.pointerId || !live) return
    const dx = e.clientX - l.x; const dy = e.clientY - l.y; l.x = e.clientX; l.y = e.clientY; l.moved += Math.abs(dx) + Math.abs(dy)
    controller.addYaw(dx * 0.0055, dy * 0.004)
  }
  const onUp = (e) => {
    const l = look.current; look.current = null
    if (l && !l.touch && l.moved < 6 && live && e.button === 0) controller.pressCapture() // a plain click throws the net
  }

  // ---- virtual joystick and buttons (touch) ----
  const stick = useRef(null); const knob = useRef(null); const stickId = useRef(null)
  const moveStick = useCallback((e) => {
    const r = stick.current.getBoundingClientRect(); const R = r.width / 2
    let dx = (e.clientX - (r.left + R)) / R; let dz = (e.clientY - (r.top + R)) / R
    const m = Math.hypot(dx, dz); if (m > 1) { dx /= m; dz /= m }
    knob.current.style.transform = `translate(${dx * R * 0.55}px, ${dz * R * 0.55}px)`
    controller.setStick(Math.abs(dx) < 0.12 ? 0 : dx, Math.abs(dz) < 0.12 ? 0 : dz)
  }, [controller])
  const endStick = useCallback(() => { stickId.current = null; if (knob.current) knob.current.style.transform = ''; controller.setStick(0, 0) }, [controller])
  const stickProps = { onPointerDown: (e) => { e.preventDefault(); e.stopPropagation(); setTouch(true); stickId.current = e.pointerId; e.currentTarget.setPointerCapture?.(e.pointerId); moveStick(e) }, onPointerMove: (e) => { if (stickId.current === e.pointerId) moveStick(e) }, onPointerUp: (e) => { if (stickId.current === e.pointerId) endStick() }, onPointerCancel: endStick, onLostPointerCapture: endStick }
  const tap = (fn) => ({ onPointerDown: (e) => { e.preventDefault(); e.stopPropagation(); setTouch(true); fn() } })

  const dpr = quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [1, 1]
  const hearts = Array.from({ length: hud.maxHealth }, (_, i) => i < hud.health)
  const [pm, pf, ps, psh] = hud.power.split('|')

  return (
    <div ref={wrap} className="absolute inset-0 select-none overflow-hidden outline-none" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { look.current = null }} onContextMenu={(e) => e.preventDefault()}>
      {!glFailed && (
        <Canvas camera={{ fov: 52, position: [0, 6, 12], near: 0.1, far: 220 }} dpr={dpr} shadows={quality !== 'low'} gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
          onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); controller.autoPause?.(); setGlFailed(true) }); controller.markReady() }} aria-label="Bug Hunter 3D game">
          <Scene key={hud.levelIndex} controller={controller} quality={quality} />
        </Canvas>
      )}
      {glFailed && <div role="alert" className="absolute inset-0 grid place-items-center p-4"><div className="pz-glass max-w-md p-6 text-center"><p className="font-display text-xl font-semibold">The 3D view stopped</p><p className="pz-soft mt-2">Your device could not keep the 3D graphics running. Reload the page, or set Graphics to Low in the Play Zone settings.</p><button type="button" className="pz-btn pz-btn-primary mt-4" onClick={() => setGlFailed(false)}>Restart the 3D view</button></div></div>}
      <div ref={popups} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" />
      <p className="sr-only" role="status" aria-live="polite">{hud.message}</p>

      {inGame && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-1.5 p-2 sm:p-3">
            <div className="pz-glass flex flex-col gap-1 px-3 py-1.5 sm:px-4 sm:py-2">
              <p className="text-[0.58rem] font-bold uppercase tracking-widest opacity-80">World {hud.world} · {WORLDS[hud.world - 1].name}</p>
              <div className="flex items-center gap-1" role="img" aria-label={`${hud.health} of ${hud.maxHealth} hearts, ${hud.lives} lives`}>{hearts.map((on, i) => <Heart key={i} className={`size-4 sm:size-5 ${on ? 'fill-rose-400 text-rose-300' : 'text-white/30'}`} aria-hidden="true" />)}<span className="ml-1 text-xs font-bold">×{hud.lives}</span>{psh === '1' && <Shield className="ml-1 size-4 text-sky-300" aria-label="Shield active" />}</div>
              <div className="flex items-center gap-1.5" role="meter" aria-label="Capture energy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hud.energy}><Zap className="size-3.5 text-cyan-300" aria-hidden="true" /><div className="h-2 w-24 overflow-hidden rounded-full bg-white/15 sm:w-32"><div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-300" style={{ width: `${hud.energy}%` }} /></div></div>
            </div>
            <div className="pz-glass flex items-center gap-3 px-3 py-1.5 sm:gap-4 sm:py-2" aria-live="off">
              <div className="text-center leading-tight"><p className="text-[0.58rem] font-bold uppercase tracking-widest opacity-80">Score</p><p className="font-display text-lg font-extrabold tabular-nums sm:text-2xl">{fmt(hud.score)}</p></div>
              <div className="text-center leading-tight"><p className="flex items-center justify-center gap-1 text-[0.58rem] font-bold uppercase tracking-widest opacity-80"><Bug className="size-3" aria-hidden="true" />Bugs</p><p className="font-display text-lg font-extrabold tabular-nums sm:text-2xl">{hud.captured}/{hud.totalBugs}</p></div>
              <div className={`text-center leading-tight ${hud.cp ? 'text-emerald-300' : 'opacity-70'}`}><p className="flex items-center justify-center gap-1 text-[0.58rem] font-bold uppercase tracking-widest"><Flag className="size-3" aria-hidden="true" />Check</p><p className="font-display text-lg font-extrabold tabular-nums sm:text-2xl">{hud.cp}/{hud.cpTotal}</p></div>
            </div>
            <div className="pointer-events-auto flex items-center gap-1.5">
              <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-3" onClick={controller.toggleMute} aria-label={hud.muted ? 'Turn sound on' : 'Mute sound'} aria-pressed={hud.muted}>{hud.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button>
              <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-3" onClick={controller.togglePause} aria-label={phase === 'paused' ? 'Resume' : 'Pause (P)'} disabled={phase === 'repair'}>{phase === 'paused' ? <Play className="size-5" /> : <Pause className="size-5" />}</button>
            </div>
          </div>
          {/* objectives and power-ups, under the top bar on the right */}
          <ul className="pointer-events-none absolute right-2 top-[5.6rem] flex flex-col items-end gap-1 sm:right-3 sm:top-[6.4rem]" aria-label="Objectives">
            {hud.objectives.map((o) => <li key={o.id} className={`pz-glass flex items-center gap-1.5 px-2.5 py-1 text-[0.68rem] font-bold sm:text-xs ${o.done ? 'ring-1 ring-emerald-300' : ''}`}>{o.id === 'repairs' ? <Wrench className="size-3" aria-hidden="true" /> : o.id === 'boss' ? <Trophy className="size-3" aria-hidden="true" /> : <Bug className="size-3" aria-hidden="true" />}{o.done && <span className="text-emerald-300" aria-hidden="true">✓</span>}{o.label}<span className="tabular-nums">{o.have}/{o.need}</span></li>)}
            {phase === 'boss' && hud.bossName && (
              <li className="pz-glass w-44 px-2.5 py-1.5 sm:w-56" role="meter" aria-label={`${hud.bossName} health`} aria-valuemin={0} aria-valuemax={hud.bossMax} aria-valuenow={hud.bossHp}>
                <p className="text-center text-[0.62rem] font-extrabold uppercase tracking-widest text-rose-200">{hud.bossName}{hud.bossState === 'exposed' ? ' · WEAK POINT!' : ''}</p>
                <div className="mt-1 flex gap-1">{Array.from({ length: hud.bossMax }, (_, i) => <div key={i} className={`h-2 flex-1 rounded-full ${i < hud.bossHp ? 'bg-rose-400' : 'bg-white/15'}`} />)}</div>
              </li>
            )}
            {hud.exitOpen && <li className="pz-glass px-2.5 py-1 text-[0.68rem] font-bold text-emerald-300 sm:text-xs" role="status">Exit portal open!</li>}
            {[['magnet', pm], ['freeze', pf], ['speed', ps]].filter(([, v]) => +v > 0).map(([k, v]) => { const [Icon, col, label] = POWER_ICONS[k]; return <li key={k} className="pz-glass flex items-center gap-1.5 px-2.5 py-1 text-[0.68rem] font-bold sm:text-xs" aria-label={`${label} ${v} seconds left`}><Icon className="size-3.5" style={{ color: col }} aria-hidden="true" />{label} {v}s</li> })}
          </ul>
          {live && <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-[60%]"><span className={`absolute inset-0 rounded-full border-2 ${hud.targetKind === 'in' ? 'border-emerald-300' : hud.targetKind === 'out' ? 'border-orange-300' : 'border-white/50'}`} /><span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" /></div>}
          {hud.message && <div className="pointer-events-none absolute inset-x-0 top-[30%] grid place-items-center"><p className="pz-glass px-5 py-2 text-center font-display text-base font-extrabold sm:text-xl">{hud.message}</p></div>}
        </>
      )}

      {/* touch controls: joystick bottom-left, buttons bottom-right, nothing near the top HUD */}
      {live && touch && (
        <>
          <div ref={stick} data-touch-ui {...stickProps} role="presentation" className="absolute bottom-3 left-3 grid size-28 place-items-center rounded-full border-2 border-white/40 bg-white/15 backdrop-blur-sm sm:bottom-5 sm:left-6 sm:size-32" style={{ touchAction: 'none' }}>
            <div ref={knob} className="size-12 rounded-full border border-white/60 bg-white/50 shadow-lg transition-transform duration-75 sm:size-14" />
          </div>
          <div data-touch-ui className="absolute bottom-3 right-3 flex items-end gap-2.5 sm:bottom-5 sm:right-6">
            <div className="flex flex-col gap-2.5">
              <button type="button" {...tap(controller.pressInteract)} aria-label="Interact with a console" className="grid size-16 place-items-center rounded-full border-2 border-white/50 bg-cyan-400/80 font-black text-cyan-950 shadow-xl active:scale-95" style={{ touchAction: 'none' }}><span className="flex flex-col items-center text-[0.65rem] leading-none"><Wrench className="size-5" aria-hidden="true" />E</span></button>
              <button type="button" {...tap(controller.pressJump)} aria-label="Jump" className="grid size-16 place-items-center rounded-full border-2 border-white/50 bg-amber-300/85 font-black text-amber-950 shadow-xl active:scale-95" style={{ touchAction: 'none' }}><ArrowUp className="size-7" aria-hidden="true" /></button>
            </div>
            <button type="button" {...tap(controller.pressCapture)} aria-label="Throw the energy net" className="grid size-24 place-items-center rounded-full border-2 border-white/60 bg-emerald-400/90 font-black text-emerald-950 shadow-xl active:scale-95 sm:size-28" style={{ touchAction: 'none' }}><span className="flex flex-col items-center text-xs leading-none"><Zap className="size-8" aria-hidden="true" />NET</span></button>
          </div>
        </>
      )}

      {phase === 'repair' && <PuzzlePanel controller={controller} hud={hud} />}
      {phase === 'loading' && !glFailed && <Overlay><p className="font-display text-xl font-semibold">Booting the Digital City…</p></Overlay>}

      {phase === 'menu' && (
        <Overlay bg={bg(2)}>
          <p className="pz-eyebrow">LAX360 Play Zone</p>
          <h3 className="font-display text-3xl font-extrabold sm:text-5xl">Bug Hunter</h3>
          <p className="text-sm font-bold text-cyan-200">Cyber Rescue</p>
          <p className="pz-soft mx-auto mt-2 max-w-md text-sm sm:text-base">The LAX360 Digital City has been invaded by mischievous bugs. Explore five cyber worlds, capture the bugs with your energy net, repair the systems and restore the city.</p>
          <p className="mt-2 text-sm font-bold text-amber-200">★ {totalStars(progress)} / {LEVELS.length * 3} stars · saved on this device</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={controller.openWorlds} autoFocus><Play className="size-5" aria-hidden="true" />Play</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Back to Play Zone</button>
          </div>
          <Controls />
        </Overlay>
      )}

      {phase === 'worlds' && (
        <Overlay wide>
          <h3 className="font-display text-2xl font-extrabold sm:text-3xl">Choose a world</h3>
          <p className="pz-soft text-xs sm:text-sm">Restore a world to unlock the next one.</p>
          <ul className="mt-3 grid gap-2.5 text-left sm:grid-cols-2">
            {LEVELS.map((l, i) => { const open = isUnlocked(progress, i); const rec = progress.levels[l.id]; const cp = progress.checkpoints[l.id]; return (
              <li key={l.id}>
                <button type="button" disabled={!open} onClick={() => controller.selectLevel(i)} aria-label={`${WORLDS[l.world - 1].name}: ${l.name}${open ? '' : ', locked'}`} className="flex w-full items-center gap-3 rounded-2xl border border-white/20 p-3 text-left transition disabled:opacity-55 enabled:hover:-translate-y-0.5 enabled:hover:border-white/50" style={{ background: bg(l.world) }}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-black/30 font-display text-xl font-extrabold">{open ? l.world : <Lock className="size-5" aria-hidden="true" />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-display text-base font-bold">{WORLDS[l.world - 1].name}</span><span className="block truncate text-xs opacity-90">{l.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs">{[1, 2, 3].map((n) => <Star key={n} className={`size-3.5 ${(rec?.stars || 0) >= n ? 'fill-amber-300 text-amber-300' : 'text-white/40'}`} aria-hidden="true" />)}{rec ? <span className="ml-1 opacity-90">Best {fmt(rec.best)}</span> : <span className="ml-1 opacity-80">{!open ? 'Locked' : cp ? 'Checkpoint saved' : 'Not completed'}</span>}</span></span>
                  {open && <ChevronRight className="size-5 shrink-0 opacity-70" aria-hidden="true" />}
                </button>
              </li>
            ) })}
          </ul>
          <button type="button" className="mx-auto mt-3 block text-xs underline opacity-80" onClick={controller.openMenu}>Back</button>
        </Overlay>
      )}

      {phase === 'ready' && (
        <Overlay bg={bg(hud.world)}>
          <p className="pz-eyebrow" style={{ color: WORLDS[hud.world - 1].accent }}>World {hud.world} · {WORLDS[hud.world - 1].name}</p>
          <h3 className="font-display text-2xl font-extrabold sm:text-4xl">{hud.levelName}</h3>
          <p className="pz-soft mx-auto mt-2 max-w-md text-sm">{hud.story}</p>
          <ul className="mx-auto mt-2 max-w-sm space-y-1 text-sm">{hud.objectives.map((o) => <li key={o.id} className="rounded-lg bg-black/25 px-3 py-1.5">{o.label}: <strong className="tabular-nums">{o.need}</strong></li>)}</ul>
          <p className="mx-auto mt-3 max-w-md rounded-xl bg-black/25 px-3 py-2 text-xs sm:text-sm">💡 {hud.tip}</p>
          <p className="pz-soft mt-2 text-xs">Challenge (+{SCORE.challenge}): {hud.challenge}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={() => controller.start(false)} autoFocus><Play className="size-5" aria-hidden="true" />{hud.canContinue ? 'Start over' : 'Start'}</button>
            {hud.canContinue && <button type="button" className="pz-btn pz-btn-ghost" onClick={() => controller.start(true)}><Flag className="size-5" aria-hidden="true" />Continue from checkpoint</button>}
            <button type="button" className="pz-btn pz-btn-ghost" onClick={controller.openWorlds}>Worlds</button>
          </div>
          <Controls />
        </Overlay>
      )}

      {phase === 'paused' && (
        <Overlay>
          <h3 className="font-display text-3xl font-extrabold">Paused</h3>
          <p className="pz-soft text-sm">Enemies, hazards and timers are stopped.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={controller.resume} autoFocus><Play className="size-5" aria-hidden="true" />Resume</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={controller.restart}><RotateCcw className="size-5" aria-hidden="true" />Restart level</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={controller.openWorlds}>Worlds</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Exit</button>
          </div>
        </Overlay>
      )}

      {phase === 'gameover' && (
        <Overlay>
          <h3 className="font-display text-3xl font-extrabold">Out of lives</h3>
          <p className="pz-soft text-sm">The bugs won this round. Nothing is lost: try again.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={controller.restart} autoFocus><RotateCcw className="size-5" aria-hidden="true" />Try again</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={controller.openWorlds}>Worlds</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Back to Play Zone</button>
          </div>
        </Overlay>
      )}

      {phase === 'complete' && hud.results && <Complete r={hud.results} hud={hud} controller={controller} onExit={onExit} level={level} />}
    </div>
  )
}

function Overlay({ children, wide, bg: back }) {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-[#050516]/72 p-2.5 backdrop-blur-[2px] sm:p-4">
      <div className={`pz-glass my-auto w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} p-4 text-center sm:p-6`} style={back ? { backgroundImage: `linear-gradient(rgba(5,5,22,.55), rgba(5,5,22,.55)), ${back}` } : undefined}>{children}</div>
    </div>
  )
}

function Controls() {
  return (
    <dl className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-x-3 gap-y-1 text-left text-xs opacity-90">
      <dt className="font-bold">Move · sprint</dt><dd>W A S D · Shift · joystick</dd>
      <dt className="font-bold">Camera and aim</dt><dd>Drag the mouse or screen · arrow keys</dd>
      <dt className="font-bold">Throw the net</dt><dd>Left click · F · NET button</dd>
      <dt className="font-bold">Repair / jump</dt><dd>E at a console · Space</dd>
      <dt className="font-bold">Pause</dt><dd>P or Esc · pause button</dd>
    </dl>
  )
}

function Complete({ r, hud, controller, onExit, level }) {
  const rows = [['Bugs captured', `${r.captured}/${r.totalBugs}`, r.parts.bugs], ['System repairs', `${r.repairs}`, r.parts.repairs], ...(r.boss ? [['Boss defeated', '', r.parts.boss]] : []), ['Energy orbs', `${r.orbs}/${r.orbsTotal}`, r.parts.orbs], [`Challenge: ${r.challenge}`, r.challengeMet ? '✓' : '✗', r.parts.challenge], [`Hearts left (×${SCORE.healthLeft})`, `${r.health}`, r.parts.health], [`Time ${mmss(r.time)} (par ${mmss(r.par)})`, '', r.parts.time]]
  return (
    <Overlay bg={bg(hud.world)}>
      <h3 className="font-display text-2xl font-extrabold sm:text-3xl">{WORLDS[hud.world - 1].name} restored!</h3>
      <div className="mt-1 flex justify-center gap-1" role="img" aria-label={`${r.stars} of 3 stars`}>{[1, 2, 3].map((n) => <Star key={n} className={`size-8 sm:size-10 ${r.stars >= n ? 'fill-amber-300 text-amber-300' : 'text-white/35'}`} aria-hidden="true" />)}</div>
      {r.isNewBest && <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-300/20 px-3 py-1 text-xs font-extrabold text-amber-200" role="status"><Trophy className="size-4" aria-hidden="true" />New personal best</p>}
      <table className="mx-auto mt-2 w-full max-w-sm text-sm"><tbody>
        {rows.map(([k, v, pts]) => <tr key={k} className="border-b border-white/10"><td className="py-1 text-left">{k}</td><td className="py-1 text-right opacity-80">{v}</td><td className="w-16 py-1 text-right font-bold tabular-nums">{fmt(pts)}</td></tr>)}
        <tr><td className="pt-2 text-left font-display text-base font-extrabold" colSpan={2}>Total score</td><td className="pt-2 text-right font-display text-xl font-extrabold tabular-nums text-amber-200">{fmt(r.score)}</td></tr>
      </tbody></table>
      {r.unlockedNext && <p className="mt-2 text-sm font-bold text-emerald-200" role="status">🔓 Unlocked: {WORLDS[LEVELS.find((l) => l.id === r.unlockedNext).world - 1].name}</p>}
      {level.world === 5 && <p className="mt-2 text-sm font-bold text-fuchsia-200">The Digital City is saved. Thank you, LAXBOT!</p>}
      <p className="pz-soft mt-2 text-[0.7rem]">★★ also complete the challenge · ★★★ also capture every bug.</p>
      <SaveStatus game="bug-hunter" localHint="Progress is saved on this device." />
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {hud.hasNext && <button type="button" className="pz-btn pz-btn-primary" onClick={controller.next} autoFocus>Next world<ChevronRight className="size-5" aria-hidden="true" /></button>}
        <button type="button" className={`pz-btn ${hud.hasNext ? 'pz-btn-ghost' : 'pz-btn-primary'}`} onClick={controller.restart} autoFocus={!hud.hasNext}><RotateCcw className="size-5" aria-hidden="true" />Replay</button>
        <button type="button" className="pz-btn pz-btn-ghost" onClick={controller.openWorlds}>Worlds</button>
        <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Play Zone</button>
      </div>
    </Overlay>
  )
}
