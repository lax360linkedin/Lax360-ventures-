import { LEVELS } from './levels.js'
import { LIVES, MAX_ENERGY, MAX_HEALTH, POWERUPS } from './config.js'
import { advance, checkpointSnapshot, createGame, objectivesOf, repairAction, repairTick, restoreFromSnapshot, summary, closePuzzle } from './logic.js'
import { createAudio } from '../catchTheStars/audio.js'
import { detectQuality } from '../catchTheStars/controller.js'
import { getPrefs, setPref } from '../../prefs.js'
import { begin as beginRun, clearRun, finish as finishRun } from '../../services/officialRun.js'
import { clearCheckpoint, getCheckpoint, getProgress, saveCheckpoint, saveLevelResult } from './progress.js'

// The Bug Hunter controller: the state machine (loading → menu → worlds → ready → playing ⇄ paused / repair → level complete / game over), the input, the sound and the bridge between the
// simulation (logic.js) and the screen. The scene calls `tick(dt)` every frame; React screens subscribe to `getSnapshot()`, which changes only when a number the player SEES changes.
// Pausing (or opening a repair puzzle) stops `advance`, so enemies, hazards, timers and the boss all stand still.

export const PHASES = ['loading', 'menu', 'worlds', 'ready', 'playing', 'paused', 'repair', 'complete', 'gameover']
const COMPLETE_DELAY = 2.6
const OVER_DELAY = 1.4

export function createController() {
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const audio = createAudio(getPrefs)
  const listeners = new Set()
  const c = {
    phase: 'loading', levelIndex: 0, game: null, quality: detectQuality(getPrefs().graphics), reduceMotion, fx: [], endT: 0, results: null, snapshot: null, message: '', messageT: 0, repairMsg: '', bossMusic: false,
    input: { keys: { up: false, down: false, left: false, right: false }, stick: { x: 0, z: 0 }, sprint: false, jumpPressed: false, capturePressed: false, interactPressed: false },
    yaw: 0, pitch: 0.4, resumeFrom: null,
  }
  const level = () => LEVELS[c.levelIndex]

  const hudOf = () => {
    const g = c.game; const lv = level(); const prefs = getPrefs()
    const bossOn = !!(g && g.boss && g.boss.active && g.boss.state !== 'defeated')
    const phase = c.phase === 'playing' && bossOn ? 'boss' : c.phase
    const objectives = g ? objectivesOf(g) : []
    const eff = g ? g.effects : { magnet: 0, freeze: 0, speed: 0, shield: 0 }
    return {
      phase, world: lv.world, levelIndex: c.levelIndex, levelName: lv.name, story: lv.story, tip: lv.tip, challenge: lv.challenge.text,
      health: g ? Math.max(0, g.health) : MAX_HEALTH, maxHealth: MAX_HEALTH, lives: g ? g.lives : LIVES, energy: g ? Math.round(g.energy) : MAX_ENERGY,
      score: g ? g.score.bugs + g.score.repairs + g.score.boss + g.score.orbs : 0, captured: g ? g.stats.captured : 0, totalBugs: g ? g.totalBugs : 0,
      objKey: objectives.map((o) => `${o.have}/${o.need}`).join(','), objectives, power: `${Math.ceil(eff.magnet)}|${Math.ceil(eff.freeze)}|${Math.ceil(eff.speed)}|${eff.shield > 0 ? 1 : 0}`,
      cp: g ? g.cp + 1 : 0, cpTotal: lv.checkpoints.length, muted: !prefs.sound && !prefs.music, results: c.results, message: c.message, hasNext: c.levelIndex + 1 < LEVELS.length, reduceMotion,
      puzzleType: g && g.puzzle ? g.puzzle.type : null, puzzleLabel: g && g.puzzle ? g.stations.find((s) => s.id === g.puzzle.stationId)?.label : '', repairMsg: c.repairMsg,
      bossName: bossOn ? (g.boss.kind === 'crab' ? 'Glitch Crab' : 'Core Corruptor') : '', bossHp: bossOn ? g.boss.hp : 0, bossMax: bossOn ? g.boss.maxHp : 0, bossState: bossOn ? g.boss.state : '',
      targetKind: g && g.target ? (g.target.inRange ? 'in' : 'out') : 'none', exitOpen: g ? g.exitOpen : false, canContinue: !!getCheckpoint(lv.id), shield: g ? g.effects.shield > 0 : false,
    }
  }
  const same = (a, b) => a && b && Object.keys(b).every((k) => a[k] === b[k] || (k === 'objectives' && a.objKey === b.objKey))
  const publish = () => { const next = hudOf(); if (same(c.snapshot, next)) return; c.snapshot = next; listeners.forEach((l) => l()) }
  const setPhase = (p) => { c.phase = p; publish() }
  const say = (text, secs = 1.6) => { c.message = text; c.messageT = secs; publish() }
  const resetInput = () => { const i = c.input; i.keys.up = i.keys.down = i.keys.left = i.keys.right = false; i.stick.x = 0; i.stick.z = 0; i.sprint = false; i.jumpPressed = false; i.capturePressed = false; i.interactPressed = false }

  const load = (index, resume = null) => {
    c.levelIndex = index
    c.game = createGame(level(), { seed: (Math.random() * 2 ** 31) | 0 })
    if (resume) restoreFromSnapshot(c.game, resume)
    c.results = null; c.endT = 0; c.fx.length = 0; c.message = ''; c.repairMsg = ''; c.yaw = 0; resetInput(); c.bossMusic = false; audio.setBoss(false)
    publish()
  }

  const onEvents = (events) => {
    for (const e of events) {
      c.fx.push(e)
      switch (e.type) {
        case 'jump': audio.jump(); break
        case 'land': audio.land(); break
        case 'netFire': audio.netThrow(); break
        case 'netMiss': audio.bad(); break
        case 'netFail': audio.bad(); say(e.reason === 'energy' ? 'Not enough energy' : e.reason === 'far' ? 'Too far: get closer' : 'Net recharging…', 0.9); break
        case 'dodge': audio.bad(); say('It dodged!', 0.9); break
        case 'shieldBreak': audio.shieldPop(); say('Shield down: net it again!', 1.4); break
        case 'capture': audio.capture(); say(`Bug captured +${e.points}`, 1.1); break
        case 'damage': audio.zap(); break
        case 'shieldAbsorb': audio.shieldPop(); say('Shield absorbed the hit', 1.2); break
        case 'pickup': audio.powerup(); say(e.kind === 'recharge' ? 'Energy recharged' : `${POWERUPS[e.kind].label}!`, 1.4); break
        case 'orb': audio.coin(); break
        case 'checkpoint': audio.checkpoint(); say('Checkpoint saved', 1.4); saveCheckpoint(level().id, checkpointSnapshot(c.game)); break
        case 'openPuzzle': c.repairMsg = ''; audio.unlock(); setPhase('repair'); break
        case 'repair': audio.win(); say('System repaired +100', 1.8); break
        case 'repairFailed': audio.bad(); say('The system rebooted: try again', 1.8); break
        case 'stationLocked': say('Repair the earlier system first', 1.6); break
        case 'wave': say(`Wave ${e.index} of ${e.of}!`, 1.8); audio.alarm(); break
        case 'bossStart': c.bossMusic = true; audio.setBoss(true); audio.alarm(); say('Boss battle!', 2); break
        case 'bossTelegraph': audio.alarm(); break
        case 'bossOrbs': audio.zap(); break
        case 'bossExposed': say('Weak point exposed: net it!', 1.6); break
        case 'bossHit': audio.capture(); say('Direct hit!', 1); break
        case 'bossPhase': audio.rainbowFx(); say('The boss is changing form!', 2); break
        case 'bossDefeated': audio.win(); audio.setBoss(false); say('Boss defeated +500', 2.4); break
        case 'die': audio.gameOver(); say('Back to the checkpoint…', 1.6); break
        case 'respawn': audio.checkpoint(); break
        case 'complete': audio.stopMusic(); audio.win(); say('System restored!', 2.4); break
        case 'over': audio.stopMusic(); break
        default: break
      }
    }
  }

  const api = {
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) },
    getSnapshot() { return c.snapshot || (c.snapshot = hudOf()) },
    get state() { return c },
    markReady() { if (c.phase === 'loading') setPhase('menu') },
    openMenu() { audio.stopMusic(); setPhase('menu') },
    openWorlds() { audio.stopMusic(); setPhase('worlds') },
    selectLevel(index) {
      if (index < 0 || index >= LEVELS.length) return false
      if (index > 0 && !getProgress().levels[LEVELS[index - 1].id]?.completed) return false
      load(index); setPhase('ready'); return true
    },
    start(fromCheckpoint = false) {
      audio.unlock(); const snap = fromCheckpoint ? getCheckpoint(level().id) : null
      if (!fromCheckpoint) clearCheckpoint(level().id)
      load(c.levelIndex, snap)
      if (fromCheckpoint) clearRun('bug-hunter'); else beginRun('bug-hunter', level().id) // a checkpoint resume is a local run: its clock does not start at zero
      audio.go(); audio.startMusic(); setPhase('playing')
    },
    restart() { api.start(false) },
    next() { if (c.levelIndex + 1 < LEVELS.length) { load(c.levelIndex + 1); api.start(false) } },
    pause() { if (c.phase !== 'playing') return; resetInput(); audio.stopMusic(); setPhase('paused') },
    resume() { if (c.phase !== 'paused') return; audio.unlock(); audio.startMusic(); setPhase('playing') },
    togglePause() { if (c.phase === 'playing') api.pause(); else if (c.phase === 'paused') api.resume() },
    toggleMute() {
      const muted = !(getPrefs().sound || getPrefs().music)
      setPref('sound', muted); setPref('music', muted)
      if (muted && (c.phase === 'playing' || c.phase === 'repair')) audio.startMusic(); else audio.stopMusic()
      publish()
    },

    // ---- input ----
    setKey(name, on) { c.input.keys[name] = on },
    setStick(x, z) { c.input.stick.x = x; c.input.stick.z = z },
    setSprint(on) { c.input.sprint = on },
    addYaw(dx, dy = 0) { c.yaw -= dx; c.pitch = Math.max(0.05, Math.min(0.85, c.pitch + dy)) },
    pressJump() { if (c.phase === 'playing') c.input.jumpPressed = true },
    pressCapture() { if (c.phase === 'playing') c.input.capturePressed = true },
    pressInteract() { if (c.phase === 'playing') c.input.interactPressed = true },
    clearInput: resetInput,
    inputFrame() {
      const i = c.input; const k = i.keys
      let mx = (k.right ? 1 : 0) - (k.left ? 1 : 0); let mz = (k.down ? 1 : 0) - (k.up ? 1 : 0)
      if (mx && mz) { mx *= Math.SQRT1_2; mz *= Math.SQRT1_2 }
      if (Math.hypot(i.stick.x, i.stick.z) > 0.1) { mx = i.stick.x; mz = i.stick.z }
      return { mx, mz, yaw: c.yaw, sprint: i.sprint || Math.hypot(i.stick.x, i.stick.z) > 0.92, jumpPressed: i.jumpPressed, capturePressed: i.capturePressed, interactPressed: i.interactPressed }
    },

    // ---- repair puzzle (the world is paused while it is open) ----
    puzzleAction(action) {
      if (c.phase !== 'repair') return
      const { res, events } = repairAction(c.game, action)
      if (res && res.message) c.repairMsg = res.message
      if (res && res.ok === false && res.message) audio.bad(); else if (res && res.ok) audio.select()
      onEvents(events)
      if (!c.game.puzzle) { c.repairMsg = ''; setPhase('playing') } else publish()
    },
    closePuzzle() { if (c.phase !== 'repair') return; closePuzzle(c.game); c.repairMsg = ''; setPhase('playing') },

    // ---- one frame ----
    tick(dt) {
      if (c.messageT > 0) { c.messageT -= dt; if (c.messageT <= 0 && c.message) { c.message = ''; publish() } }
      const g = c.game
      if (!g) return
      if (c.phase === 'repair') {
        const { res, events } = repairTick(g, dt)
        if (res && res.message) { c.repairMsg = res.message; if (res.ok === false) audio.bad() }
        onEvents(events)
        if (!g.puzzle) { c.repairMsg = ''; setPhase('playing') } else publish()
        return
      }
      if (c.phase !== 'playing') return
      const frame = api.inputFrame()
      const events = advance(g, dt, frame)
      c.input.jumpPressed = frame.jumpPressed; c.input.capturePressed = frame.capturePressed; c.input.interactPressed = frame.interactPressed // advance() consumes them
      onEvents(events)
      if (c.phase !== 'playing') return
      if (g.done) { c.endT += dt; if (c.endT >= COMPLETE_DELAY) api.finish() }
      else if (g.over) { c.endT += dt; if (c.endT >= OVER_DELAY) { clearCheckpoint(level().id); setPhase('gameover') } }
      publish()
    },
    finish() {
      if (c.phase !== 'playing' || !c.game.done) return
      const s = summary(c.game); const saved = saveLevelResult(s)
      c.results = { ...s, ...saved }; audio.setBoss(false)
      finishRun('bug-hunter', s) // server verification + official score
      setPhase('complete')
    },
    drainFx() { if (!c.fx.length) return c.fx; const out = c.fx.slice(); c.fx.length = 0; return out },
    dispose() { audio.dispose(); listeners.clear(); c.fx.length = 0 },
    autoPause() { if (c.phase === 'playing' && !c.keepRunning) api.pause() },
  }
  load(0)
  return api
}
