import { ITEMS, MAX_LIVES, ROUND_SECONDS, stageForRemaining } from './config.js'
import { advance, createGame, multiplierLeft, summary } from './logic.js'
import { createAudio } from './audio.js'
import { getLocalBest, recordResult } from '../../services/localScores.js'
import { getPrefs, setPref } from '../../prefs.js'
import { gpuInfo } from '../../../utils/webgl.js'
import { begin as beginRun, finish as finishRun } from '../../services/officialRun.js'

// The game controller: the state machine (loading → ready → playing ⇄ paused → game over → results), the input, the audio and the bridge between the rules (logic.js) and the screen.
// The scene calls `tick(dt)` once per frame; the React screens subscribe to `getSnapshot()`, which changes only when a number the player SEES changes (score, a life, a second, a stage...),
// so React re-renders a few times per second at most, not on every frame.

const GAME = 'catch-the-stars'
const GAME_OVER_SECONDS = 1.9

export const PHASES = ['loading', 'ready', 'playing', 'paused', 'gameover', 'results']

export function detectQuality(pref) {
  if (pref === 'low' || pref === 'medium' || pref === 'high') return pref
  // Auto: conservative. Software rendering gets Low; integrated / mobile GPUs never get High; unknown hardware is treated as capable.
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 4
  const gpu = gpuInfo()
  if (gpu.software) return 'low'
  if (coarse && (cores <= 4 || mem <= 3 || gpu.weak)) return 'low'
  if (gpu.weak) return 'medium'
  return coarse ? 'medium' : cores >= 8 ? 'high' : 'medium'
}

export function createController() {
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const audio = createAudio(getPrefs)
  const listeners = new Set()
  const c = {
    phase: 'loading',
    sim: createGame(), // the idle bot and an empty field are shown behind the "Ready" screen
    input: { left: false, right: false, holdLeft: false, holdRight: false, target: null },
    fx: [],
    bot: { catchT: 0, hurtT: 0 },
    quality: detectQuality(getPrefs().graphics),
    reduceMotion,
    view: { halfWidth: 5.6 },
    overT: 0,
    results: null,
    pendingPopups: [],
    snapshot: null,
    lastSecond: -1,
  }

  const best = () => getLocalBest(GAME) ?? 0
  const hudOf = () => {
    const g = c.sim
    const prefs = getPrefs()
    const secondsLeft = Math.ceil(g.remaining - 1e-6)
    const stage = stageForRemaining(g.remaining)
    return {
      phase: c.phase, score: g.score, lives: g.lives, maxLives: MAX_LIVES, secondsLeft: Math.max(0, secondsLeft), stageId: stage.id, stageLabel: stage.label,
      rainbow: Math.ceil(multiplierLeft(g)), muted: !prefs.sound && !prefs.music, best: best(), results: c.results, reduceMotion: c.reduceMotion,
    }
  }
  const same = (a, b) => a && b && Object.keys(b).every((k) => a[k] === b[k])
  const publish = () => {
    const next = hudOf()
    if (same(c.snapshot, next)) return
    c.snapshot = next
    listeners.forEach((l) => l())
  }
  const setPhase = (p) => { c.phase = p; publish() }

  const api = {
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) },
    getSnapshot() { return c.snapshot || (c.snapshot = hudOf()) },
    get state() { return c },

    markReady() { if (c.phase === 'loading') setPhase('ready') },

    start() {
      audio.unlock()
      c.sim = createGame(); c.results = null; c.fx.length = 0; c.bot.catchT = 0; c.bot.hurtT = 0; c.overT = 0; c.lastSecond = ROUND_SECONDS; c.input.target = null
      beginRun(GAME) // official run for signed-in players (background request; never delays the round)
      audio.go()
      audio.startMusic()
      setPhase('playing')
    },
    pause() { if (c.phase !== 'playing') return; audio.stopMusic(); setPhase('paused') },
    resume() { if (c.phase !== 'paused') return; audio.unlock(); audio.startMusic(); setPhase('playing') },
    togglePause() { if (c.phase === 'playing') api.pause(); else if (c.phase === 'paused') api.resume() },
    restart() { api.start() },
    toggleMute() {
      const muted = !(getPrefs().sound || getPrefs().music)
      setPref('sound', muted); setPref('music', muted)
      if (muted && c.phase === 'playing') audio.startMusic(); else audio.stopMusic()
      publish()
    },

    // ---- input ----
    setKey(dir, on) { c.input[dir] = on; if (on) c.input.target = null },
    setHold(dir, on) { c.input[dir === 'left' ? 'holdLeft' : 'holdRight'] = on; if (on) c.input.target = null },
    setTarget(x) { c.input.target = x },
    clearInput() { c.input.left = c.input.right = c.input.holdLeft = c.input.holdRight = false; c.input.target = null },
    inputFrame() {
      const i = c.input
      const move = (i.right || i.holdRight ? 1 : 0) - (i.left || i.holdLeft ? 1 : 0)
      return { move, target: i.target }
    },

    // ---- one frame ----
    tick(dt) {
      const g = c.sim
      c.bot.catchT = Math.max(0, c.bot.catchT - dt); c.bot.hurtT = Math.max(0, c.bot.hurtT - dt)
      if (c.phase === 'playing') {
        const frame = api.inputFrame()
        const events = advance(g, dt, frame)
        if (c.input.target !== null && Math.abs(g.botX - c.input.target) < 0.04 && !frame.move) c.input.target = null // reached the finger's spot
        for (const e of events) {
          c.fx.push(e)
          if (e.type === 'collect') { c.bot.catchT = 0.28; if (e.kind === 'diamond') audio.diamond(); else if (e.kind === 'golden') audio.golden(); else audio.star() }
          else if (e.type === 'heart') { c.bot.catchT = 0.35; audio.heart() }
          else if (e.type === 'damage') { c.bot.hurtT = 0.7; audio.bomb() }
          else if (e.type === 'bombPass') audio.bomb()
          else if (e.type === 'powerup') { c.bot.catchT = 0.4; audio.powerup() }
          else if (e.type === 'end') api.finish(e.reason)
        }
        const sec = Math.ceil(g.remaining - 1e-6)
        if (sec !== c.lastSecond) { c.lastSecond = sec; if (sec > 0 && sec <= 5 && c.phase === 'playing') audio.tick() }
        publish()
      } else if (c.phase === 'gameover') {
        c.overT += dt
        if (c.overT >= GAME_OVER_SECONDS) api.showResults()
      }
    },

    finish(reason) {
      audio.stopMusic()
      if (reason === 'time') audio.win(); else audio.gameOver()
      c.overT = 0
      setPhase('gameover')
    },
    showResults() {
      if (c.phase !== 'gameover') return
      const s = summary(c.sim)
      const saved = recordResult(GAME, s) // local record only (this device)
      c.results = { ...s, ...saved }
      finishRun(GAME, s) // the server verifies and records the official score; the results screen shows the save status
      setPhase('results')
    },

    drainFx() { if (!c.fx.length) return c.fx; const out = c.fx.slice(); c.fx.length = 0; return out },
    itemRadius: (k) => ITEMS[k].radius,

    /** Called when the page is left or the game is torn down: stops every timer and the audio context. */
    dispose() { audio.dispose(); listeners.clear(); c.fx.length = 0 },
    autoPause() { if (c.phase === 'playing') api.pause() },
  }
  return api
}
