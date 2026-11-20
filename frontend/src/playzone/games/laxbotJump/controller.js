import { LEVELS } from './levels.js'
import { LIVES } from './config.js'
import { advance, createGame, summary } from './logic.js'
import { SCORING } from './config.js'
import { createAudio } from '../catchTheStars/audio.js'
import { detectQuality } from '../catchTheStars/controller.js'
import { getPrefs, setPref } from '../../prefs.js'
import { getProgress, saveLevelResult } from './progress.js'

// The LAXBOT Jump controller: the state machine (loading → menu → select → ready → playing ⇄ paused → level complete / game over), the input, the sound and the bridge between the rules
// (logic.js) and the screen. The scene calls `tick(dt)` every frame; React screens subscribe to `getSnapshot()`, which changes only when a number the player SEES changes, so React re-renders
// a few times per second at most. Pausing stops `tick` from advancing the simulation, so the timer, platforms and physics all stand still.

export const PHASES = ['loading', 'menu', 'select', 'ready', 'playing', 'respawn', 'paused', 'complete', 'gameover']
const COMPLETE_DELAY = 2.4 // seconds of victory dance before the results appear
const OVER_DELAY = 1.3

export function createController() {
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const audio = createAudio(getPrefs)
  const listeners = new Set()
  const c = {
    phase: 'loading', levelIndex: 0, sim: createGame(LEVELS[0]),
    input: { keys: { up: false, down: false, left: false, right: false }, stick: { x: 0, z: 0 }, jumpPressed: false, jumpHeld: false },
    fx: [], quality: detectQuality(getPrefs().graphics), reduceMotion, endT: 0, results: null, snapshot: null, lastEvent: null,
  }

  const liveScore = () => c.sim.coins * SCORING.coin + c.sim.crystals * SCORING.crystal + c.sim.stars * SCORING.star
  const hudOf = () => {
    const g = c.sim; const lv = g.level; const prefs = getPrefs()
    const phase = c.phase === 'playing' && g.respawnT > 0 && !g.over ? 'respawn' : c.phase
    return {
      phase, levelIndex: c.levelIndex, levelId: lv.id, world: lv.world, levelName: lv.name, tagline: lv.tagline, hint: lv.hint, theme: lv.theme, par: lv.par,
      score: liveScore(), coins: g.coins, coinsTotal: lv.coins.length, crystals: g.crystals, crystalsTotal: lv.crystals.length, stars: g.stars, starsTotal: lv.stars.length,
      lives: g.lives, maxLives: LIVES, checkpoint: g.cp + 1, checkpointsTotal: lv.checkpoints.length, seconds: Math.floor(g.t), muted: !prefs.sound && !prefs.music,
      results: c.results, hasNext: c.levelIndex + 1 < LEVELS.length, reduceMotion, hurt: g.hurtT > 0,
    }
  }
  const same = (a, b) => a && b && Object.keys(b).every((k) => a[k] === b[k])
  const publish = () => { const next = hudOf(); if (same(c.snapshot, next)) return; c.snapshot = next; listeners.forEach((l) => l()) }
  const setPhase = (p) => { c.phase = p; publish() }
  const resetInput = () => { const i = c.input; i.keys.up = i.keys.down = i.keys.left = i.keys.right = false; i.stick.x = 0; i.stick.z = 0; i.jumpPressed = false; i.jumpHeld = false }

  const load = (index) => { c.levelIndex = index; c.sim = createGame(LEVELS[index]); c.fx.length = 0; c.results = null; c.endT = 0; resetInput() }

  const api = {
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) },
    getSnapshot() { return c.snapshot || (c.snapshot = hudOf()) },
    get state() { return c },

    markReady() { if (c.phase === 'loading') setPhase('menu') },
    openMenu() { audio.stopMusic(); setPhase('menu') },
    openSelect() { audio.stopMusic(); setPhase('select') },

    /** Choose a level (only unlocked ones): the course is shown behind the Ready screen. */
    selectLevel(index) {
      if (index < 0 || index >= LEVELS.length) return false
      if (index > 0 && !getProgress().levels[LEVELS[index - 1].id]?.completed) return false
      load(index); setPhase('ready'); return true
    },
    start() { audio.unlock(); resetInput(); c.sim = createGame(LEVELS[c.levelIndex]); c.fx.length = 0; c.results = null; c.endT = 0; audio.go(); audio.startMusic(); setPhase('playing') },
    restart() { api.start() },
    next() { if (c.levelIndex + 1 < LEVELS.length) { load(c.levelIndex + 1); api.start() } },
    pause() { if (c.phase !== 'playing') return; resetInput(); audio.stopMusic(); setPhase('paused') },
    resume() { if (c.phase !== 'paused') return; audio.unlock(); audio.startMusic(); setPhase('playing') },
    togglePause() { if (c.phase === 'playing') api.pause(); else if (c.phase === 'paused') api.resume() },
    toggleMute() {
      const muted = !(getPrefs().sound || getPrefs().music)
      setPref('sound', muted); setPref('music', muted)
      if (muted && c.phase === 'playing') audio.startMusic(); else audio.stopMusic()
      publish()
    },

    // ---- input ----
    setKey(name, on) { c.input.keys[name] = on },
    setStick(x, z) { c.input.stick.x = x; c.input.stick.z = z },
    pressJump() { if (c.phase === 'playing') c.input.jumpPressed = true },
    setJumpHeld(on) { c.input.jumpHeld = on },
    clearInput: resetInput,
    inputFrame() {
      const i = c.input; const k = i.keys
      let x = (k.right ? 1 : 0) - (k.left ? 1 : 0); let z = (k.down ? 1 : 0) - (k.up ? 1 : 0)
      if (x && z) { x *= Math.SQRT1_2; z *= Math.SQRT1_2 }
      if (Math.hypot(i.stick.x, i.stick.z) > 0.08) { x = i.stick.x; z = i.stick.z }
      return { x, z, jumpPressed: i.jumpPressed, jumpHeld: i.jumpHeld }
    },

    // ---- one frame ----
    tick(dt) {
      const g = c.sim
      if (c.phase !== 'playing') return
      const frame = api.inputFrame()
      const events = advance(g, dt, frame)
      c.input.jumpPressed = frame.jumpPressed // advance() consumes it
      for (const e of events) {
        c.fx.push(e)
        switch (e.type) {
          case 'jump': audio.jump(); break
          case 'doubleJump': audio.doubleJump(); break
          case 'land': audio.land(); break
          case 'bounce': audio.bounce(); break
          case 'coin': audio.coin(); break
          case 'crystal': audio.diamond(); break
          case 'star': audio.powerup(); break
          case 'checkpoint': audio.checkpoint(); break
          case 'damage': case 'fall': audio.bomb(); break
          case 'complete': audio.stopMusic(); audio.win(); break
          case 'over': audio.stopMusic(); audio.gameOver(); break
          default: break
        }
      }
      if (g.done) { c.endT += dt; if (c.endT >= COMPLETE_DELAY) api.finish() }
      else if (g.over) { c.endT += dt; if (c.endT >= OVER_DELAY) setPhase('gameover') }
      publish()
    },
    finish() {
      if (c.phase !== 'playing' || !c.sim.done) return
      const s = summary(c.sim)
      const saved = saveLevelResult(s)
      c.results = { ...s, ...saved }
      setPhase('complete')
    },
    drainFx() { if (!c.fx.length) return c.fx; const out = c.fx.slice(); c.fx.length = 0; return out },

    dispose() { audio.dispose(); listeners.clear(); c.fx.length = 0 },
    autoPause() { if (c.phase === 'playing' && !c.keepRunning) api.pause() }, // keepRunning is set only by manual testing in the development console
  }
  return api
}
