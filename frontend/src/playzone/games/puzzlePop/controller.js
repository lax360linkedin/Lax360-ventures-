import { LEVELS, WORLDS, GEM_NAMES } from './levels.js'
import { activePowerUps, createGame, findHint, objectiveStatus, playMove, starsFor } from './engine.js'
import { createAudio } from '../catchTheStars/audio.js'
import { detectQuality } from '../catchTheStars/controller.js'
import { getPrefs, setPref } from '../../prefs.js'
import { getProgress, saveLevelResult } from './progress.js'
import { begin as beginRun, finish as finishRun } from '../../services/officialRun.js'

// The Puzzle Pop controller: the state machine (loading → menu → worlds → levels → ready → playing ⇄ resolving / paused → level complete / failed), the input and the ANIMATION SEQUENCER.
// The engine (engine.js) resolves a whole move at once and returns steps; this controller replays the steps one after another as animations on the "visual tiles" and ignores every
// tap and swipe while that runs, so the board can never be touched while it is resolving. The scene reads `state.tiles` every frame and only draws. React screens subscribe to
// `getSnapshot()`, which changes only when something the player sees changes.

export const PHASES = ['loading', 'menu', 'worlds', 'levels', 'ready', 'playing', 'resolving', 'paused', 'complete', 'failed']
const ease = (t) => t * t * (3 - 2 * t)
const clamp01 = (t) => Math.max(0, Math.min(1, t))

export function objectiveLabel(o) {
  switch (o.type) {
    case 'score': return 'Reach the score'
    case 'collect': return `Collect ${GEM_NAMES[o.color]}`
    case 'ice': return 'Break the ice'
    case 'treasure': return 'Bring the chests down'
    case 'blocks': return 'Break the blocks'
    case 'special': return 'Set off power-ups'
    case 'combos': return 'Power-up combinations'
    case 'chain': return 'Cascade in one move'
    case 'rainbow': return 'Set off Rainbows'
    default: return o.type
  }
}

export function createController() {
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const audio = createAudio(getPrefs)
  const listeners = new Set()
  const c = {
    phase: 'loading', world: 1, levelIndex: 0, game: null, tiles: new Map(), ice: [], selected: null, hint: null, mood: { name: 'idle', t: 0 },
    queue: [], anim: null, fx: [], hud: null, objectives: [], quality: detectQuality(getPrefs().graphics), reduceMotion, results: null, snapshot: null, message: '', messageT: 0,
    shake: 0, flash: 0, celebrate: 0, endT: 0, pendingEnd: null, moveLog: [], run: null,
  }
  const level = () => LEVELS[c.levelIndex]

  const hudOf = () => {
    const lv = level(); const g = c.game; const prefs = getPrefs()
    const power = g ? activePowerUps(g) : { rocket: 0, bomb: 0, rainbow: 0 }
    return {
      phase: c.phase, world: lv.world, worldName: WORLDS[lv.world - 1].name, levelIndex: c.levelIndex, levelNumber: lv.index, levelName: lv.name, tip: lv.tip || '', hintAvailable: !!lv.hint,
      score: c.hud ? c.hud.score : 0, moves: c.hud ? c.hud.moves : lv.moves, maxMoves: lv.moves, objectives: c.objectives, power, muted: !prefs.sound && !prefs.music,
      results: c.results, message: c.message, reduceMotion, hasNext: c.levelIndex + 1 < LEVELS.length, hasHint: !!c.hint, selected: c.selected ? `${c.selected[0]},${c.selected[1]}` : '',
    }
  }
  const same = (a, b) => a && b && Object.keys(b).every((k) => a[k] === b[k] || (k === 'power' && a.power.rocket === b.power.rocket && a.power.bomb === b.power.bomb && a.power.rainbow === b.power.rainbow))
  const publish = () => { const next = hudOf(); if (same(c.snapshot, next)) return; c.snapshot = next; listeners.forEach((l) => l()) }
  const setPhase = (p) => { c.phase = p; publish() }
  const say = (text, secs = 1.4) => { c.message = text; c.messageT = secs; publish() }
  const mood = (name, secs = 1.6) => { c.mood = { name, t: secs } }
  const applyAfter = (after) => {
    if (!after) return
    c.hud = { score: after.score, moves: after.moves }
    c.objectives = after.objectives.map((o) => ({ ...o, label: objectiveLabel(o) }))
    publish()
  }

  // ---- visual tiles ----
  const addTile = (t, r, col, extra = {}) => { const vt = { id: t.id, kind: t.kind || 'gem', color: t.color, special: t.special || null, hp: t.hp || 0, x: col, y: r, scale: 1, alpha: 1, glow: 0, ...extra }; c.tiles.set(t.id, vt); return vt }
  const buildTiles = () => {
    c.tiles.clear()
    c.game.board.forEach((row, r) => row.forEach((t, col) => addTile(t, r, col)))
    c.ice = c.game.ice.map((row) => row.slice())
  }
  const initObjectives = () => { c.objectives = objectiveStatus(c.game).map((o) => ({ ...o, label: objectiveLabel(o) })); c.hud = { score: 0, moves: c.game.moves } }

  const load = (index) => {
    c.levelIndex = index; c.world = LEVELS[index].world
    c.game = createGame(level(), (Math.random() * 2 ** 31) | 0)
    c.queue = []; c.anim = null; c.selected = null; c.hint = null; c.results = null; c.fx.length = 0; c.message = ''; c.celebrate = 0; c.pendingEnd = null
    buildTiles(); initObjectives(); mood('idle', 0)
  }

  // ---- the sequencer: one step at a time ----
  const startStep = (step) => {
    const T = c.tiles
    switch (step.type) {
      case 'swap': {
        const [a, b] = [step.a, step.b]; const [ida, idb] = step.ids
        const va = T.get(ida); const vb = T.get(idb)
        c.anim = { kind: 'move', duration: 0.17, t: 0, list: [{ vt: va, x0: va.x, y0: va.y, x1: b[1], y1: b[0] }, { vt: vb, x0: vb.x, y0: vb.y, x1: a[1], y1: a[0] }] }
        if (c.hud) { c.hud = { ...c.hud, moves: c.hud.moves - 1 }; publish() }
        audio.select()
        break
      }
      case 'invalid': {
        const ta = c.game.board[step.a[0]][step.a[1]]; const tb = c.game.board[step.b[0]][step.b[1]]
        const va = ta && T.get(ta.id); const vb = tb && T.get(tb.id)
        const list = []
        if (va && vb) list.push({ vt: va, x0: va.x, y0: va.y, x1: vb.x, y1: vb.y, bounce: true }, { vt: vb, x0: vb.x, y0: vb.y, x1: va.x, y1: va.y, bounce: true })
        c.anim = { kind: 'bounce', duration: 0.26, t: 0, list }
        audio.bad(); c.shake = 0.12; mood('encourage'); say('Try another swap', 1.1)
        break
      }
      case 'clear': {
        const list = []
        for (const x of step.cleared) { const vt = T.get(x.id); if (vt) list.push(vt) }
        const big = step.combo || step.effects.length > 0
        c.anim = { kind: 'clear', duration: big ? 0.52 : 0.3, t: 0, tiles: list, step }
        const n = c.reduceMotion ? 0.4 : c.quality === 'low' ? 0.6 : 1
        for (const x of step.cleared) c.fx.push({ type: 'burst', r: x.r, c: x.c, color: x.color, count: Math.max(2, Math.round((big ? 7 : 5) * n)) })
        for (const g of step.groups) {
          const mid = g.cells[Math.floor(g.cells.length / 2)]
          c.fx.push({ type: 'popup', r: mid[0], c: mid[1], text: `+${g.points}`, color: '#fde68a', big: g.size >= 4 })
        }
        for (const e of step.effects) {
          c.fx.push({ type: e.kind === 'rocketH' || e.kind === 'rocketV' ? 'beam' : e.kind === 'bomb' ? 'ring' : 'rainbow', ...e })
        }
        for (const cr of step.created) { const vt = addTile({ id: cr.id, kind: 'gem', color: cr.color, special: cr.special }, cr.r, cr.c, { scale: 0 }); vt.appear = 0 }
        for (const h of step.blockHits) { const vt = T.get(h.id); if (vt) { vt.hp = h.hp; vt.glow = 1 } }
        for (const b of step.brokenBlocks) { const vt = T.get(b.id); if (vt) { c.fx.push({ type: 'burst', r: b.r, c: b.c, color: -2, count: 6 }); list.push(vt) } }
        for (const h of step.iceHits) { c.ice[h.r][h.c] = h.layers; c.fx.push({ type: 'burst', r: h.r, c: h.c, color: -3, count: 4 }) }
        if (step.label) { say(step.label, 1.6); c.flash = 1 }
        else if (step.chain > 1) say(`Cascade ×${step.chain}!`, 1.2)
        if (step.effects.some((e) => e.kind === 'rocketH' || e.kind === 'rocketV')) audio.rocket()
        if (step.effects.some((e) => e.kind === 'bomb')) audio.boom()
        if (step.effects.some((e) => e.kind === 'rainbow')) audio.rainbowFx()
        if (step.combo) audio.powerup(); else audio.pop(step.chain)
        if (step.created.length) audio.powerup()
        mood(step.combo || step.chain >= 2 || step.created.length ? 'excited' : 'happy')
        c.shake = Math.max(c.shake, big ? 0.3 : 0.05)
        applyAfter(step.after)
        break
      }
      case 'gravity': {
        const list = []
        let maxDrop = 0
        for (const m of step.moves) { const vt = T.get(m.id); if (vt) { list.push({ vt, x0: vt.x, y0: vt.y, x1: m.to[1], y1: m.to[0], fall: true }); maxDrop = Math.max(maxDrop, m.to[0] - m.from[0]) } }
        for (const s of step.spawned) { const vt = addTile({ id: s.id, kind: 'gem', color: s.color, special: null }, s.from[0], s.to[1]); list.push({ vt, x0: vt.x, y0: s.from[0], x1: s.to[1], y1: s.to[0], fall: true }); maxDrop = Math.max(maxDrop, s.to[0] - s.from[0]) }
        c.anim = { kind: 'move', duration: list.length ? 0.14 + 0.055 * maxDrop : 0, t: 0, list }
        break
      }
      case 'collect': {
        const list = step.items.map((i) => T.get(i.id)).filter(Boolean)
        c.anim = { kind: 'collect', duration: 0.4, t: 0, tiles: list }
        for (const i of step.items) c.fx.push({ type: 'popup', r: i.r, c: i.c, text: 'Treasure!', color: '#fcd34d', big: true })
        audio.heart(); mood('excited'); applyAfter(step.after)
        break
      }
      case 'reshuffle': {
        const list = []
        for (const m of step.moves) { const vt = T.get(m.id); if (vt) list.push({ vt, x0: vt.x, y0: vt.y, x1: m.to[1], y1: m.to[0] }) }
        c.anim = { kind: 'move', duration: 0.55, t: 0, list }
        say('No moves left: shuffling!', 1.6); audio.rainbowFx()
        break
      }
      case 'end': {
        c.pendingEnd = step.status
        applyAfter(step.after)
        if (step.status === 'won') { c.celebrate = 1.8; mood('victory', 99); say('Level complete!', 2); audio.win() } else { mood('fail', 99); say('Out of moves', 2); audio.gameOver() }
        c.anim = { kind: 'wait', duration: step.status === 'won' ? 1.8 : 1.1, t: 0 }
        break
      }
      default: c.anim = null
    }
  }

  const finishStep = () => {
    const a = c.anim
    if (!a) return
    if (a.kind === 'clear') { for (const vt of a.tiles) c.tiles.delete(vt.id) }
    else if (a.kind === 'collect') { for (const vt of a.tiles) c.tiles.delete(vt.id) }
    else if (a.kind === 'bounce') { for (const m of a.list) { m.vt.x = m.x0; m.vt.y = m.y0; m.vt.scale = 1 } } // a refused swap returns to where it was
    else if (a.list) for (const m of a.list) { m.vt.x = m.x1; m.vt.y = m.y1; m.vt.scale = 1 }
    c.anim = null
  }

  const endLevel = () => {
    const status = c.pendingEnd
    c.pendingEnd = null
    const won = status === 'won'
    const stars = won ? starsFor(c.game) : 0
    const saved = saveLevelResult({ levelId: level().id, won, score: c.game.score, stars })
    if (won && c.run) finishRun('puzzle-pop', { levelId: level().id, moves: c.moveLog }) // the server replays these swaps and records its own score
    c.results = { won, score: c.game.score, stars, bonus: c.game.lastBonus, movesLeft: c.game.moves, ...saved, objectives: c.objectives }
    setPhase(won ? 'complete' : 'failed')
  }

  // Official runs: the SERVER picks the board seed and replays the accepted swaps with the same deterministic engine, so the browser only reports its move log.
  const reseed = (run) => run.ready.then(() => {
    if (c.run !== run) return
    if (c.moveLog.length) { run.official = false; return } // the player was faster than the server: this round stays a local run
    if (!run.official || run.seed == null) return
    c.game = createGame(level(), run.seed); c.queue = []; c.anim = null; c.selected = null
    buildTiles(); initObjectives(); publish()
  })

  const attempt = (a, b) => {
    if (c.phase !== 'playing') return false
    c.selected = null; c.hint = null
    const res = playMove(c.game, a, b)
    if (res.valid) c.moveLog.push([[a[0], a[1]], [b[0], b[1]]])
    c.queue = res.steps.slice()
    c.anim = null
    setPhase('resolving')
    return res.valid
  }

  const api = {
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) },
    getSnapshot() { return c.snapshot || (c.snapshot = hudOf()) },
    get state() { return c },
    get busy() { return c.phase !== 'playing' },

    markReady() { if (c.phase === 'loading') setPhase('menu') },
    openMenu() { audio.stopMusic(); setPhase('menu') },
    openWorlds() { audio.stopMusic(); setPhase('worlds') },
    openLevels(world) { c.world = world; audio.stopMusic(); setPhase('levels'); publish() },
    selectLevel(index) {
      if (index < 0 || index >= LEVELS.length) return false
      if (index > 0 && !getProgress().levels[LEVELS[index - 1].id]?.completed) return false
      load(index); setPhase('ready'); return true
    },
    start() { audio.unlock(); load(c.levelIndex); c.moveLog = []; c.run = beginRun('puzzle-pop', level().id); reseed(c.run); audio.go(); audio.startMusic(); mood('happy', 1.2); setPhase('playing') },
    restart() { api.start() },
    next() { if (c.levelIndex + 1 < LEVELS.length) { load(c.levelIndex + 1); api.start() } },
    pause() { if (c.phase !== 'playing' && c.phase !== 'resolving') return; c.prePause = c.phase; audio.stopMusic(); setPhase('paused') },
    resume() { if (c.phase !== 'paused') return; audio.unlock(); audio.startMusic(); setPhase(c.prePause || 'playing') },
    togglePause() { if (c.phase === 'playing' || c.phase === 'resolving') api.pause(); else if (c.phase === 'paused') api.resume() },
    toggleMute() {
      const muted = !(getPrefs().sound || getPrefs().music)
      setPref('sound', muted); setPref('music', muted)
      if (muted && (c.phase === 'playing' || c.phase === 'resolving')) audio.startMusic(); else audio.stopMusic()
      publish()
    },

    // ---- input: ignored unless the board is calm and the game is running ----
    tap(r, col) {
      if (c.phase !== 'playing') return
      const t = c.game.board[r]?.[col]
      if (!t) return
      const s = c.selected
      if (!s) { c.selected = [r, col]; audio.select(); publish(); return }
      if (s[0] === r && s[1] === col) { c.selected = null; publish(); return }
      if (Math.abs(s[0] - r) + Math.abs(s[1] - col) === 1) { attempt(s, [r, col]); return }
      c.selected = [r, col]; audio.select(); publish()
    },
    swipe(r, col, dr, dc) {
      if (c.phase !== 'playing') return
      const nr = r + dr; const nc = col + dc
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return
      attempt([r, col], [nr, nc])
    },
    hint() {
      if (c.phase !== 'playing' || !level().hint) return
      const h = findHint(c.game)
      if (h) { c.hint = { a: h[0], b: h[1], t: 6 }; say('Try swapping the glowing crystals', 2); publish() }
    },
    clearSelection() { if (c.selected) { c.selected = null; publish() } },

    // ---- one frame ----
    tick(dt) {
      if (c.messageT > 0) { c.messageT -= dt; if (c.messageT <= 0 && c.message) { c.message = ''; publish() } }
      if (c.phase === 'paused' || c.phase === 'loading') return
      if (c.mood.t > 0 && c.mood.name !== 'victory' && c.mood.name !== 'fail') { c.mood.t -= dt; if (c.mood.t <= 0) c.mood.name = 'idle' }
      c.shake = Math.max(0, c.shake - dt); c.flash = Math.max(0, c.flash - dt * 2); c.celebrate = Math.max(0, c.celebrate - dt)
      if (c.hint) { c.hint.t -= dt; if (c.hint.t <= 0) { c.hint = null; publish() } }
      for (const vt of c.tiles.values()) { vt.glow = Math.max(0, vt.glow - dt * 2.5) }
      if (c.phase !== 'resolving') return
      if (!c.anim) {
        const step = c.queue.shift()
        if (!step) { // everything replayed: the board is stable and accepts input again
          if (c.pendingEnd) endLevel(); else setPhase('playing')
          return
        }
        startStep(step)
        if (!c.anim) return
      }
      const a = c.anim
      const speed = c.reduceMotion ? 1.6 : 1
      a.t += (dt * speed) / Math.max(0.0001, a.duration)
      const p = clamp01(a.t)
      if (a.kind === 'move' || a.kind === 'bounce') {
        for (const m of a.list) {
          const e = a.kind === 'bounce' ? Math.sin(p * Math.PI) : m.fall ? p * p * (1.6 - 0.6 * p) : ease(p)
          if (a.kind === 'bounce') { m.vt.x = m.x0 + (m.x1 - m.x0) * e * 0.4; m.vt.y = m.y0 + (m.y1 - m.y0) * e * 0.4 } else { m.vt.x = m.x0 + (m.x1 - m.x0) * e; m.vt.y = m.y0 + (m.y1 - m.y0) * e }
          if (m.fall && p > 0.85) m.vt.scale = 1 + Math.sin((p - 0.85) / 0.15 * Math.PI) * 0.08 // a little squash when it lands
        }
      } else if (a.kind === 'clear') {
        for (const vt of a.tiles) { vt.scale = p < 0.35 ? 1 + 0.25 * (p / 0.35) : 1.25 * (1 - (p - 0.35) / 0.65); vt.alpha = 1 - Math.max(0, (p - 0.5) * 2) }
        for (const vt of c.tiles.values()) if (vt.appear !== undefined) { vt.appear = Math.min(1, vt.appear + dt * 4); vt.scale = ease(vt.appear) * (1 + (1 - vt.appear) * 0.3); if (vt.appear >= 1) delete vt.appear }
      } else if (a.kind === 'collect') {
        for (const vt of a.tiles) { vt.y -= dt * 4; vt.scale = 1 - p; vt.alpha = 1 - p }
      }
      if (p >= 1) finishStep()
    },
    drainFx() { if (!c.fx.length) return c.fx; const out = c.fx.slice(); c.fx.length = 0; return out },

    dispose() { audio.dispose(); listeners.clear(); c.fx.length = 0 },
    autoPause() { if ((c.phase === 'playing' || c.phase === 'resolving') && !c.keepRunning) api.pause() },
  }
  load(0) // a board exists from the start, so the scene can draw the first level behind the menu
  return api
}
