import SaveStatus from '../../components/SaveStatus.jsx'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import { ArrowUp, ChevronRight, Flag, Gem, Heart, Lock, LogOut, Pause, Play, RotateCcw, Star, Timer, Trophy, Volume2, VolumeX, Coins } from 'lucide-react'
import Scene from './Scene.jsx'
import { createController } from './controller.js'
import { detectQuality } from '../catchTheStars/controller.js'
import { LEVELS, THEMES } from './levels.js'
import { SCORING } from './config.js'
import { isUnlocked, totalStars, useProgress } from './progress.js'
import { usePrefs } from '../../prefs.js'

// The playable LAXBOT Jump screen: the 3D canvas, the arcade HUD, the touch controls and every overlay (menu, level select, ready, paused, respawn, level complete, game over). It is lazy-loaded
// by GameStage, so three.js and React Three Fiber are downloaded only when a visitor opens this game. Rules: logic.js · state machine: controller.js · drawing: Scene.jsx.

const ORDER = ['high', 'medium', 'low']
const fmt = (n) => Number(n).toLocaleString('en-IN')
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const mmssd = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`
const themeBg = (id) => { const t = THEMES[id]; return `linear-gradient(160deg, ${t.sky[0]}, ${t.sky[1]} 60%, ${t.sky[2]})` }

function useHud(controller) { return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot) }

export default function LaxbotJumpGame({ onExit }) {
  const [controller] = useState(createController)
  const prefs = usePrefs()
  const hud = useHud(controller)
  const progress = useProgress()
  const [quality, setQuality] = useState(() => controller.state.quality)
  const [glFailed, setGlFailed] = useState(false)
  const [touch, setTouch] = useState(() => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)
  const wrap = useRef(null)
  const phaseRef = useRef(hud.phase)
  phaseRef.current = hud.phase
  const { phase } = hud
  const inGame = phase === 'playing' || phase === 'respawn' || phase === 'paused'

  useEffect(() => { const q = detectQuality(prefs.graphics); controller.state.quality = q; setQuality(q) }, [prefs.graphics, controller])
  useEffect(() => { controller.onSlow = () => setQuality((q) => ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(q) + 1)]); return () => { controller.onSlow = null } }, [controller])

  // keyboard: the game only takes the keys while a level is being played or paused, so the rest of the website (Tab, links, forms) keeps working
  useEffect(() => {
    const keyMap = { w: 'up', W: 'up', ArrowUp: 'up', s: 'down', S: 'down', ArrowDown: 'down', a: 'left', A: 'left', ArrowLeft: 'left', d: 'right', D: 'right', ArrowRight: 'right' }
    const editable = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
    const active = () => ['playing', 'respawn', 'paused'].includes(phaseRef.current)
    const down = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || editable(e.target) || !active()) return
      const dir = keyMap[e.key]
      if (dir) { e.preventDefault(); if (phaseRef.current !== 'paused') controller.setKey(dir, true) }
      else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (!e.repeat && phaseRef.current !== 'paused') { controller.pressJump(); controller.setJumpHeld(true) } }
      else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); controller.togglePause() }
    }
    const up = (e) => { const dir = keyMap[e.key]; if (dir) controller.setKey(dir, false); if (e.key === ' ' || e.code === 'Space') controller.setJumpHeld(false) }
    const lose = () => { controller.clearInput(); controller.autoPause() }
    const vis = () => { if (document.hidden) lose() }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', lose); document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', lose); document.removeEventListener('visibilitychange', vis) }
  }, [controller])

  useEffect(() => {
    if (!(touch && (phase === 'playing' || phase === 'respawn'))) return undefined
    document.body.setAttribute('data-pz-playing', '1')
    return () => document.body.removeAttribute('data-pz-playing')
  }, [touch, phase])
  useEffect(() => { if (import.meta.env.DEV) { window.__lj = controller; return () => { delete window.__lj } } return undefined }, [controller])
  useEffect(() => () => { controller.autoPause(); controller.dispose() }, [controller])

  // after a screen change, keep keyboard focus inside the game so keys never go to a hidden control behind it
  useEffect(() => { if (phase === 'playing') wrap.current?.focus({ preventScroll: true }) }, [phase])

  // ---- virtual joystick and jump button (touch) ----
  const stick = useRef(null); const knob = useRef(null); const stickId = useRef(null)
  const moveStick = useCallback((e) => {
    const r = stick.current.getBoundingClientRect(); const R = r.width / 2
    let dx = (e.clientX - (r.left + R)) / R; let dz = (e.clientY - (r.top + R)) / R
    const m = Math.hypot(dx, dz); if (m > 1) { dx /= m; dz /= m }
    knob.current.style.transform = `translate(${dx * R * 0.55}px, ${dz * R * 0.55}px)`
    controller.setStick(Math.abs(dx) < 0.12 ? 0 : dx, Math.abs(dz) < 0.12 ? 0 : dz)
  }, [controller])
  const endStick = useCallback(() => { stickId.current = null; if (knob.current) knob.current.style.transform = ''; controller.setStick(0, 0) }, [controller])
  const stickProps = {
    onPointerDown: (e) => { e.preventDefault(); setTouch(true); stickId.current = e.pointerId; e.currentTarget.setPointerCapture?.(e.pointerId); moveStick(e) },
    onPointerMove: (e) => { if (stickId.current === e.pointerId) moveStick(e) },
    onPointerUp: (e) => { if (stickId.current === e.pointerId) endStick() }, onPointerCancel: endStick, onLostPointerCapture: endStick,
  }
  const jumpProps = {
    onPointerDown: (e) => { e.preventDefault(); setTouch(true); e.currentTarget.setPointerCapture?.(e.pointerId); controller.pressJump(); controller.setJumpHeld(true) },
    onPointerUp: () => controller.setJumpHeld(false), onPointerCancel: () => controller.setJumpHeld(false), onLostPointerCapture: () => controller.setJumpHeld(false),
  }

  const dpr = quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [1, 1]
  const th = THEMES[hud.theme]

  return (
    <div ref={wrap} tabIndex={0} aria-label="LAXBOT Jump 3D platform game" className="absolute inset-0 select-none overflow-hidden outline-none" style={{ touchAction: 'none' }}>
      {!glFailed && (
        <Canvas camera={{ fov: 46, position: [0, 6, 10], near: 0.1, far: 260 }} dpr={dpr} shadows={quality !== 'low'} gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
          onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); controller.autoPause?.(); setGlFailed(true) }); controller.markReady() }}>
          <Scene key={hud.levelId} controller={controller} quality={quality} shadows={quality !== 'low'} />
        </Canvas>
      )}
      {glFailed && <div role="alert" className="absolute inset-0 grid place-items-center p-4"><div className="pz-glass max-w-md p-6 text-center"><p className="font-display text-xl font-semibold">The 3D view stopped</p><p className="pz-soft mt-2">Your device could not keep the 3D graphics running. Reload the page, or set Graphics to Low in the Play Zone settings.</p><button type="button" className="pz-btn pz-btn-primary mt-4" onClick={() => setGlFailed(false)}>Restart the 3D view</button></div></div>}

      {/* HUD */}
      {(inGame || phase === 'gameover') && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-1.5 p-2 sm:p-3">
          <div className="pz-glass flex items-center gap-2.5 px-3 py-1.5 sm:gap-4 sm:px-4 sm:py-2" aria-live="off">
            <div className="leading-tight"><p className="text-[0.58rem] font-bold uppercase tracking-widest opacity-80">World {hud.levelIndex + 1} · {hud.world}</p><p className="text-xs font-bold sm:text-sm">Level {hud.levelIndex + 1}: {hud.levelName}</p></div>
            <div className="leading-tight"><p className="text-[0.58rem] font-bold uppercase tracking-widest opacity-80">Score</p><p className="font-display text-lg font-extrabold tabular-nums sm:text-2xl">{fmt(hud.score)}</p></div>
          </div>
          <div className="pz-glass flex items-center gap-2 px-3 py-1.5 text-sm font-bold sm:gap-3 sm:py-2">
            <span className="flex items-center gap-1" aria-label={`${hud.coins} of ${hud.coinsTotal} coins`}><Coins className="size-4 text-amber-300" aria-hidden="true" />{hud.coins}/{hud.coinsTotal}</span>
            <span className="flex items-center gap-1" aria-label={`${hud.crystals} of ${hud.crystalsTotal} crystals`}><Gem className="size-4 text-sky-300" aria-hidden="true" />{hud.crystals}/{hud.crystalsTotal}</span>
            <span className="flex items-center gap-1" role="timer" aria-label={`Time ${mmss(hud.seconds)}`}><Timer className="size-4" aria-hidden="true" />{mmss(hud.seconds)}</span>
            <span className={`flex items-center gap-1 ${hud.checkpoint ? 'text-emerald-300' : 'opacity-70'}`} aria-label={hud.checkpoint ? `Checkpoint ${hud.checkpoint} of ${hud.checkpointsTotal} reached` : 'No checkpoint reached yet'}><Flag className="size-4" aria-hidden="true" />{hud.checkpoint}/{hud.checkpointsTotal}</span>
          </div>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <div className="pz-glass flex items-center gap-0.5 px-2 py-1.5" role="img" aria-label={`${hud.lives} of ${hud.maxLives} lives`}>{Array.from({ length: hud.maxLives }, (_, i) => <Heart key={i} className={`size-5 ${i < hud.lives ? 'fill-rose-400 text-rose-300' : 'text-white/30'}`} aria-hidden="true" />)}</div>
            <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-3" onClick={controller.toggleMute} aria-label={hud.muted ? 'Turn sound on' : 'Mute sound'} aria-pressed={hud.muted}>{hud.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button>
            <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-3" onClick={controller.togglePause} aria-label={phase === 'paused' ? 'Resume' : 'Pause (P)'} disabled={phase === 'gameover'}>{phase === 'paused' ? <Play className="size-5" /> : <Pause className="size-5" />}</button>
          </div>
        </div>
      )}
      {phase === 'respawn' && <div className="pointer-events-none absolute inset-x-0 top-1/3 grid place-items-center"><p className="pz-glass px-5 py-2 font-display text-lg font-extrabold" role="status">{hud.checkpoint ? 'Back to your checkpoint' : 'Back to the start'}</p></div>}

      {/* touch controls: bottom corners, outside the HUD */}
      {(phase === 'playing' || phase === 'respawn') && touch && (
        <>
          <div ref={stick} {...stickProps} role="presentation" className="absolute bottom-3 left-3 grid size-28 place-items-center rounded-full border-2 border-white/40 bg-white/15 backdrop-blur-sm sm:bottom-5 sm:left-6 sm:size-32" style={{ touchAction: 'none' }}>
            <div ref={knob} className="size-12 rounded-full border border-white/60 bg-white/50 shadow-lg transition-transform duration-75 sm:size-14" />
          </div>
          <button type="button" {...jumpProps} aria-label="Jump" className="absolute bottom-4 right-4 grid size-24 place-items-center rounded-full border-2 border-white/50 bg-amber-300/80 font-black text-amber-950 shadow-xl active:scale-95 sm:bottom-6 sm:right-7 sm:size-28" style={{ touchAction: 'none' }}><span className="flex flex-col items-center text-xs leading-none"><ArrowUp className="size-7" aria-hidden="true" />JUMP</span></button>
        </>
      )}

      {phase === 'loading' && !glFailed && <Overlay><p className="font-display text-xl font-semibold">Building the floating worlds…</p></Overlay>}

      {phase === 'menu' && (
        <Overlay bg={themeBg('cloud')}>
          <p className="pz-eyebrow">LAX360 Play Zone</p>
          <h3 className="font-display text-3xl font-extrabold sm:text-5xl">LAXBOT Jump</h3>
          <p className="pz-soft mx-auto mt-2 max-w-md text-sm sm:text-base">Run, jump and double jump through five floating worlds. Collect coins and crystals, find the hidden stars and reach the portal.</p>
          <p className="mt-2 text-sm font-bold text-amber-200">★ {totalStars(progress)} / {LEVELS.length * 3} stars · saved on this device</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={() => controller.openSelect()} autoFocus><Play className="size-5" aria-hidden="true" />Play</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Back to Play Zone</button>
          </div>
          <Controls />
        </Overlay>
      )}

      {phase === 'select' && (
        <Overlay wide>
          <h3 className="font-display text-2xl font-extrabold sm:text-3xl">Choose a world</h3>
          <p className="pz-soft text-xs sm:text-sm">Finish a world to unlock the next one.</p>
          <ul className="mt-3 grid gap-2.5 text-left sm:grid-cols-2">
            {LEVELS.map((l, i) => { const open = isUnlocked(progress, i); const rec = progress.levels[l.id]; return (
              <li key={l.id}>
                <button type="button" disabled={!open} onClick={() => controller.selectLevel(i)} aria-label={`${l.world}, level ${i + 1}: ${l.name}${open ? '' : ', locked'}`} className="group flex w-full items-center gap-3 rounded-2xl border border-white/20 p-3 text-left transition disabled:opacity-55 enabled:hover:-translate-y-0.5 enabled:hover:border-white/50" style={{ background: themeBg(l.theme) }}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-black/30 font-display text-xl font-extrabold">{open ? i + 1 : <Lock className="size-5" aria-hidden="true" />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-display text-base font-bold">{l.world}</span><span className="block truncate text-xs opacity-90">{l.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs">{[1, 2, 3].map((n) => <Star key={n} className={`size-3.5 ${(rec?.stars || 0) >= n ? 'fill-amber-300 text-amber-300' : 'text-white/40'}`} aria-hidden="true" />)}{rec ? <span className="ml-1 opacity-90">Best {fmt(rec.best)} · {mmssd(rec.bestTime)}</span> : <span className="ml-1 opacity-80">{open ? 'Not completed' : 'Locked'}</span>}</span></span>
                  {open && <ChevronRight className="size-5 shrink-0 opacity-70" aria-hidden="true" />}
                </button>
              </li>
            ) })}
          </ul>
          <button type="button" className="mx-auto mt-3 block text-xs underline opacity-80" onClick={() => controller.openMenu()}>Back</button>
        </Overlay>
      )}

      {phase === 'ready' && (
        <Overlay bg={themeBg(hud.theme)}>
          <p className="pz-eyebrow" style={{ color: th.accent }}>World {hud.levelIndex + 1} · Level {hud.levelIndex + 1}</p>
          <h3 className="font-display text-2xl font-extrabold sm:text-4xl">{hud.world}</h3>
          <p className="text-sm font-bold sm:text-base">{hud.levelName}</p>
          <p className="pz-soft mx-auto mt-1 max-w-md text-xs sm:text-sm">{hud.tagline}</p>
          <p className="mx-auto mt-3 max-w-md rounded-xl bg-black/25 px-3 py-2 text-xs sm:text-sm">💡 {hud.hint}</p>
          <p className="pz-soft mt-2 text-xs">Par time {mmss(hud.par)} · {hud.coinsTotal} coins · {hud.crystalsTotal} crystals · 1 hidden star</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={controller.start} autoFocus><Play className="size-5" aria-hidden="true" />Start</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={() => controller.openSelect()}>Worlds</button>
          </div>
          <Controls />
        </Overlay>
      )}

      {phase === 'paused' && (
        <Overlay>
          <h3 className="font-display text-3xl font-extrabold">Paused</h3>
          <p className="pz-soft text-sm">The clock and the platforms are stopped.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={controller.resume} autoFocus><Play className="size-5" aria-hidden="true" />Resume</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={controller.restart}><RotateCcw className="size-5" aria-hidden="true" />Restart level</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={() => controller.openSelect()}>Worlds</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Exit</button>
          </div>
        </Overlay>
      )}

      {phase === 'gameover' && (
        <Overlay>
          <h3 className="font-display text-3xl font-extrabold">Out of lives</h3>
          <p className="pz-soft text-sm">You reached {hud.checkpoint ? `checkpoint ${hud.checkpoint}` : 'the first stretch'} of {hud.world}. Try again, nothing is lost.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="pz-btn pz-btn-primary" onClick={controller.restart} autoFocus><RotateCcw className="size-5" aria-hidden="true" />Try again</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={() => controller.openSelect()}>Worlds</button>
            <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Back to Play Zone</button>
          </div>
        </Overlay>
      )}

      {phase === 'complete' && hud.results && <Complete r={hud.results} hud={hud} controller={controller} onExit={onExit} />}
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

function Controls() {
  return (
    <dl className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-x-3 gap-y-1 text-left text-xs opacity-90">
      <dt className="font-bold">Move</dt><dd>W A S D / arrow keys · joystick</dd>
      <dt className="font-bold">Jump / double jump</dt><dd>Space · Jump button</dd>
      <dt className="font-bold">Pause</dt><dd>P or Esc · pause button</dd>
    </dl>
  )
}

function Complete({ r, hud, controller, onExit }) {
  const rows = [['Coins', `${r.coins}/${r.coinsTotal}`, r.parts.coins], ['Crystals', `${r.crystals}/${r.crystalsTotal}`, r.parts.crystals], ['Hidden stars', `${r.stars}/${r.starsTotal}`, r.parts.stars], [`Lives left (×${SCORING.life})`, `${r.lives}`, r.parts.lives], [`Time ${mmssd(r.time)} (par ${mmss(r.par)})`, '', r.parts.time], ['Level complete', '', r.parts.completion]]
  return (
    <Overlay bg={themeBg(hud.theme)}>
      <h3 className="font-display text-2xl font-extrabold sm:text-3xl">{hud.world} complete!</h3>
      <div className="mt-1 flex justify-center gap-1" role="img" aria-label={`${r.rating} of 3 stars`}>{[1, 2, 3].map((n) => <Star key={n} className={`size-8 sm:size-10 ${r.rating >= n ? 'fill-amber-300 text-amber-300' : 'text-white/35'}`} aria-hidden="true" />)}</div>
      {r.isNewBest && <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-300/20 px-3 py-1 text-xs font-extrabold text-amber-200" role="status"><Trophy className="size-4" aria-hidden="true" />New personal best</p>}
      <table className="mx-auto mt-2 w-full max-w-sm text-sm"><tbody>
        {rows.map(([k, v, pts]) => <tr key={k} className="border-b border-white/10"><td className="py-1 text-left">{k}</td><td className="py-1 text-right opacity-80">{v}</td><td className="w-16 py-1 text-right font-bold tabular-nums">{fmt(pts)}</td></tr>)}
        <tr><td className="pt-2 text-left font-display text-base font-extrabold" colSpan={2}>Total score</td><td className="pt-2 text-right font-display text-xl font-extrabold tabular-nums text-amber-200">{fmt(r.score)}</td></tr>
      </tbody></table>
      {r.unlockedNext && <p className="mt-2 text-sm font-bold text-emerald-200" role="status">🔓 Unlocked: {LEVELS.find((l) => l.id === r.unlockedNext)?.world}</p>}
      <p className="pz-soft mt-2 text-[0.7rem]">★★ 75% of the coins · ★★★ also every crystal and the hidden star.</p>
      <SaveStatus game="laxbot-jump" localHint="Progress is saved on this device." />
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {hud.hasNext && <button type="button" className="pz-btn pz-btn-primary" onClick={controller.next} autoFocus>Next level<ChevronRight className="size-5" aria-hidden="true" /></button>}
        <button type="button" className={`pz-btn ${hud.hasNext ? 'pz-btn-ghost' : 'pz-btn-primary'}`} onClick={controller.restart} autoFocus={!hud.hasNext}><RotateCcw className="size-5" aria-hidden="true" />Replay</button>
        <button type="button" className="pz-btn pz-btn-ghost" onClick={() => controller.openSelect()}>Worlds</button>
        <button type="button" className="pz-btn pz-btn-ghost" onClick={onExit}><LogOut className="size-5" aria-hidden="true" />Play Zone</button>
      </div>
    </Overlay>
  )
}
