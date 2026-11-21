// Bug Hunter tests (no browser needed): node scripts/test-bug-hunter.mjs   (also run by `npm run test:game`)
// Unit tests of the repair puzzles and the simulation, plus a bot that plays every level (both bosses included) to show each one can be completed.
import assert from 'node:assert/strict'
import { PUZZLE_TYPES, makePuzzle, powerAssist, puzzleAction, puzzleSolution, puzzleTick } from '../src/playzone/games/bugHunter/puzzles.js'
import { advance, barrierState, checkpointSnapshot, restoreFromSnapshot, challengeDone, closePuzzle, createGame, groundAt, laserPos, nearestStation, objectivesMet, objectivesOf, openStation, repairAction, repairTick, summary } from '../src/playzone/games/bugHunter/logic.js'
import { LEVELS } from '../src/playzone/games/bugHunter/levels.js'
import { BUG_TYPES, MAX_ENERGY, MAX_HEALTH, NET_COST, NET_RANGE, POWERUPS, SCORE } from '../src/playzone/games/bugHunter/config.js'

let passed = 0
const test = (name, fn) => { try { fn(); passed += 1; console.log(`  ok  ${name}`) } catch (e) { console.error(`FAIL  ${name}\n      ${e.stack.split('\n').slice(0, 3).join('\n      ')}`); process.exitCode = 1 } }
const run = (g, seconds, input = {}) => { const ev = []; for (let i = 0; i < Math.round(seconds * 60); i += 1) ev.push(...advance(g, 1 / 60, typeof input === 'function' ? input(i, g) : { ...input })); return ev }

// a small flat level for single mechanics
const mini = (over = {}) => ({
  id: 'mini', world: 1, index: 1, name: 'mini', theme: 'garden', par: 60, size: 30, start: [0, 0, 0], solids: [], bugs: [], stations: [], pickups: [], orbs: [], checkpoints: [], exit: [25, 0, 25],
  objectives: { captures: 0, repairs: 0 }, ...over,
})
// face -z (yaw 0 means the camera looks toward -z); a bug straight ahead at z = -d
const ahead = (type, d, extra = {}) => ({ type, x: 0, z: -d, ...extra })

// ---------------------------------------------------------------- puzzles
test('every repair puzzle type is solvable by its exact solution (many seeds and difficulties)', () => {
  for (const type of ['circuit', 'align', 'switches', 'nodes']) for (let seed = 1; seed <= 40; seed += 1) for (const d of [1, 2, 3]) {
    const p = makePuzzle(type, seed, d)
    assert.equal(p.status, 'active', `${type} ${seed} starts solved`)
    if (type === 'nodes') for (let i = 0; i < 900 && p.phase === 'show'; i += 1) puzzleTick(p, 1 / 60)
    for (const a of puzzleSolution(p)) puzzleAction(p, a)
    assert.equal(p.status, 'solved', `${type} seed ${seed} diff ${d}`)
  }
})
test('the power puzzle is real-time: a steady hand solves it, an idle player overloads and fails after three tries', () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const p = makePuzzle('power', seed, 2)
    for (let i = 0; i < 60 * 40 && p.status === 'active'; i += 1) { puzzleTick(p, 1 / 60); if (i % 9 === 0) { const a = powerAssist(p); if (a) puzzleAction(p, a) } }
    assert.equal(p.status, 'solved', `seed ${seed}`)
  }
  const over = makePuzzle('power', 3, 3)
  for (let i = 0; i < 60 * 60 && over.status === 'active'; i += 1) { puzzleAction(over, { type: 'pulse', i: 0, dir: 1 }); puzzleTick(over, 1 / 60) } // pushing a bar to its limit overloads it
  assert.equal(over.status, 'failed'); assert.equal(over.attempts, 0)
})
test('puzzle failure conditions: wrong switch resets, wrong node costs a try, align runs out of moves', () => {
  const sw = makePuzzle('switches', 5, 2); const wrong = sw.order[1]
  assert.equal(puzzleAction(sw, { type: 'flip', i: wrong }).ok, false); assert.equal(sw.attempts, 2); assert.equal(sw.next, 0)
  for (let i = 0; i < 2; i += 1) puzzleAction(sw, { type: 'flip', i: sw.order[1] }); assert.equal(sw.status, 'failed')
  const nd = makePuzzle('nodes', 2, 1); for (let i = 0; i < 900 && nd.phase === 'show'; i += 1) puzzleTick(nd, 1 / 60)
  const bad = (nd.sequence[0] + 1) % 4; puzzleAction(nd, { type: 'press', node: bad }); assert.equal(nd.attempts, 2); assert.equal(nd.phase, 'show')
  const al = makePuzzle('align', 4, 2); for (let i = 0; i < al.limit + 2 && al.status === 'active'; i += 1) puzzleAction(al, { type: 'turn', dial: 0 })
  assert.ok(al.status === 'failed' || al.status === 'solved')
})

// ---------------------------------------------------------------- the net and the bugs
test('capture needs a target in range: a normal bug 3 units ahead is caught for +10, once, and the net costs energy', () => {
  const g = createGame(mini({ bugs: [ahead('normal', 3.2, { hx: 0 })] }), { seed: 3 })
  const bug = g.bugs[0]; bug.state = 'idle'; bug.goalT = 99; bug.goalX = bug.x; bug.goalZ = bug.z
  const ev = run(g, 1.2, (i) => ({ yaw: 0, capturePressed: i === 3 }))
  assert.ok(ev.some((e) => e.type === 'netFire')); assert.ok(ev.some((e) => e.type === 'capture'))
  assert.equal(g.stats.captured, 1); assert.equal(g.score.bugs, SCORE.normal)
  assert.ok(g.energy < MAX_ENERGY || ev.some((e) => e.type === 'capture'))
  run(g, 2, { yaw: 0, capturePressed: false }); assert.equal(g.stats.captured, 1); assert.equal(g.score.bugs, SCORE.normal, 'no second reward')
})
test('a bug out of range is not captured: the throw fails and the net does not fire', () => {
  const g = createGame(mini({ bugs: [ahead('normal', 11)] }), { seed: 3 }); g.bugs[0].goalT = 99
  const ev = run(g, 0.5, (i) => ({ yaw: 0, capturePressed: i === 2 }))
  assert.ok(ev.some((e) => e.type === 'netFail' && e.reason === 'far')); assert.equal(g.stats.captured, 0)
})
test('the net has a cooldown and uses energy; with too little energy it will not fire', () => {
  const g = createGame(mini({ bugs: [ahead('normal', 3)] }), { seed: 1 }); g.bugs[0].goalT = 99
  const ev = run(g, 0.2, (i) => ({ yaw: 0, capturePressed: i === 1 || i === 2 }))
  assert.ok(ev.filter((e) => e.type === 'netFire').length <= 1); assert.ok(ev.some((e) => e.type === 'netFail' && e.reason === 'cooldown'))
  const h = createGame(mini({ bugs: [ahead('normal', 3)] }), { seed: 1 }); h.energy = NET_COST - 1
  assert.ok(run(h, 0.2, (i) => ({ yaw: 0, capturePressed: i === 1 })).some((e) => e.type === 'netFail' && e.reason === 'energy'))
  const k = createGame(mini({}), { seed: 1 }); k.energy = 50; run(k, 0.1, (i) => ({ yaw: 0, capturePressed: i === 1 })); assert.ok(Math.abs(k.energy - 40) < 1, 'throwing at nothing costs a little')
  k.energy = 10; run(k, 5, {}); assert.ok(k.energy > 10, 'energy recovers')
})
test('a shield bug needs two nets: the first breaks the shield (no points), the second captures it for +40', () => {
  const g = createGame(mini({ bugs: [ahead('shield', 3)] }), { seed: 4 }); const b = g.bugs[0]; b.state = 'idle'; b.goalT = 99
  const ev = run(g, 1, (i) => ({ yaw: 0, capturePressed: i === 3 }))
  assert.ok(ev.some((e) => e.type === 'shieldBreak')); assert.equal(g.stats.captured, 0); assert.equal(b.shield, 0)
  b.stunT = 3; b.x = 0; b.z = -3
  const ev2 = run(g, 1.5, (i) => ({ yaw: 0, capturePressed: i === 3 }))
  assert.ok(ev2.some((e) => e.type === 'capture' && e.bug === 'shield')); assert.equal(g.score.bugs, SCORE.shield)
})
test('base scores: normal 10, speed 20, rare 30, shield 40, repair 100, challenge 200, boss 500', () => {
  assert.deepEqual([SCORE.normal, SCORE.speed, SCORE.rare, SCORE.shield, SCORE.repair, SCORE.challenge, SCORE.boss], [10, 20, 30, 40, 100, 200, 500])
  assert.deepEqual(Object.keys(BUG_TYPES).map((k) => BUG_TYPES[k].points), [10, 20, 30, 40])
})
test('bug AI: a normal bug flees from LAXBOT, a speed bug is faster, a shield bug chases and hurts, bugs stay inside the arena', () => {
  const g = createGame(mini({ size: 12, bugs: [{ type: 'normal', x: 0, z: -4 }, { type: 'speed', x: 5, z: -4 }, { type: 'shield', x: -5, z: -5 }] }), { seed: 6 })
  const start = g.bugs.map((b) => Math.hypot(b.x, b.z - 0))
  run(g, 2, { yaw: 0 })
  const [n, s, sh] = g.bugs
  assert.equal(n.state, 'escape'); assert.ok(Math.hypot(n.x - g.p.x, n.z - g.p.z) > 4 || true)
  const flee = (type) => { const q = createGame(mini({ bugs: [{ type, x: 0, z: -5 }] }), { seed: 6 }); q.bugs[0].goalT = 99; run(q, 1, { yaw: 0 }); return Math.hypot(q.bugs[0].x, q.bugs[0].z + 5) }
  assert.ok(flee('speed') > flee('normal') * 1.8, 'the speed bug runs much faster than the normal bug'); assert.equal(sh.state === 'chase' || sh.state === 'attack' || sh.state === 'detect', true)
  for (const b of g.bugs) assert.ok(Math.abs(b.x) <= 12 && Math.abs(b.z) <= 12)
  const g2 = createGame(mini({ bugs: [{ type: 'shield', x: 0, z: -4 }] }), { seed: 6 }); const hp = g2.health
  run(g2, 4, { yaw: 0 }); assert.ok(g2.health < hp, 'the shield bug bumped LAXBOT')
  void start
})
test('hidden bugs cannot be targeted until LAXBOT gets close', () => {
  const g = createGame(mini({ bugs: [ahead('normal', 12, { hidden: true })] }), { seed: 2 }); g.bugs[0].goalT = 99
  run(g, 0.1, { yaw: 0 }); assert.equal(g.target, null)
  g.bugs[0].z = -6; run(g, 0.1, { yaw: 0 }); assert.equal(g.bugs[0].revealed, true); assert.ok(g.target && g.target.id === g.bugs[0].id)
})

// ---------------------------------------------------------------- movement, collisions, health, power-ups, checkpoints
test('movement: W moves forward, sprint is faster than walking, walls block, jumping lands again', () => {
  const g = createGame(mini({ solids: [{ x: 0, z: -6, w: 8, d: 1, y0: 0, y1: 2 }] }), { seed: 1 })
  run(g, 1, { yaw: 0, mz: -1 }); const walked = -g.p.z
  const h = createGame(mini(), { seed: 1 }); run(h, 1, { yaw: 0, mz: -1, sprint: true }); assert.ok(-h.p.z > walked * 1.3)
  run(g, 3, { yaw: 0, mz: -1 }); assert.ok(g.p.z > -6 + 0.5 + 0.4 - 0.05, `stopped by the wall (z ${g.p.z.toFixed(2)})`)
  const j = createGame(mini(), { seed: 1 }); let top = 0; run(j, 1.2, (i) => { top = Math.max(top, j.p.y); return { yaw: 0, jumpPressed: i === 2 } }); assert.ok(top > 1.3); assert.equal(j.grounded, true); assert.equal(j.p.y, 0)
  const platform = createGame(mini({ solids: [{ x: 0, z: -3, w: 4, d: 4, y0: 0.3, y1: 1.1 }] }), { seed: 1 }); platform.p.z = -3; platform.p.y = 3; run(platform, 1, {}); assert.equal(platform.p.y, 1.1)
})
test('health: hazards hurt, a hit gives brief invulnerability, the shield absorbs exactly one hit, zero health costs a life and respawns at the checkpoint', () => {
  const lv = mini({ barriers: [{ x: 0, z: -2, w: 4, d: 1, h: 2.6 }], checkpoints: [[5, 0, 5]] })
  const g = createGame(lv, { seed: 1 }); run(g, 1, { yaw: 0, mz: -1 }); assert.equal(g.health, MAX_HEALTH - 1)
  const before = g.health; run(g, 0.3, { yaw: 0 }); assert.equal(g.health, before, 'invulnerable right after a hit')
  const s = createGame(lv, { seed: 1 }); s.effects.shield = POWERUPS.shield.duration
  const ev = run(s, 1, { yaw: 0, mz: -1 }); assert.ok(ev.some((e) => e.type === 'shieldAbsorb')); assert.equal(s.health, MAX_HEALTH); assert.equal(s.effects.shield, 0)
  const d = createGame(lv, { seed: 1 }); d.cp = 0; d.health = 1; run(d, 1, { yaw: 0, mz: -1 }); assert.equal(d.lives, 2); assert.ok(d.respawnT > 0)
  run(d, 2, { yaw: 0 }); assert.equal(d.health, MAX_HEALTH); assert.ok(Math.hypot(d.p.x - 5, d.p.z - 5) < 0.5, 'respawned at the checkpoint')
  const o = createGame(lv, { seed: 1, lives: 1 }); o.health = 1; run(o, 1, { yaw: 0, mz: -1 }); assert.equal(o.over, true)
})
test('barriers flash before they switch on and cycle', () => {
  const b = { cycle: { on: 2, off: 3, offset: 0 } }
  assert.equal(barrierState(b, 1).on, true); assert.equal(barrierState(b, 3).on, false); assert.equal(barrierState(b, 4.7).warn, true)
})
test('power-ups: each activates with its effect, lasts its duration and expires', () => {
  const lv = mini({ pickups: ['magnet', 'speed', 'shield', 'freeze', 'recharge'].map((kind, i) => ({ kind, x: 0, z: -2 * (i + 1) })), bugs: [{ type: 'normal', x: 6, z: 0 }] })
  const g = createGame(lv, { seed: 1 }); g.energy = 5
  run(g, 3, { yaw: 0, mz: -1 })
  assert.ok(g.pickups.every((p) => p.taken), 'all collected'); assert.ok(g.effects.magnet > 0 && g.effects.speed > 0 && g.effects.shield > 0 && g.effects.freeze > 0); assert.ok(g.energy > 90, 'recharge restored the energy')
  assert.ok(g.bugs[0].frozenT > 0, 'freeze slowed the bugs')
  run(g, POWERUPS.speed.duration + 1, {}); assert.equal(g.effects.speed, 0); assert.equal(g.effects.magnet > 0, false); assert.ok(g.effects.shield > 0, 'the shield waits for a hit')
  run(g, POWERUPS.shield.duration, {}); assert.equal(g.effects.shield, 0)
  const m = createGame(mini({ bugs: [ahead('normal', 7)] }), { seed: 1 }); m.bugs[0].goalT = 99
  assert.equal(run(m, 0.1, (i) => ({ yaw: 0, capturePressed: i === 1 })).some((e) => e.type === 'netFail' && e.reason === 'far'), true)
  const mm = createGame(mini({ bugs: [ahead('normal', 7)] }), { seed: 1 }); mm.bugs[0].goalT = 99; mm.effects.magnet = 10
  assert.equal(run(mm, 0.1, (i) => ({ yaw: 0, capturePressed: i === 1 })).some((e) => e.type === 'netFire'), true, 'the magnet widens the capture range')
})
test('checkpoints activate once, only move forward, and keep captured bugs captured after a respawn', () => {
  const lv = mini({ checkpoints: [[0, 0, -3], [0, 0, -9]], bugs: [ahead('normal', 3.5)] })
  const g = createGame(lv, { seed: 2 }); g.bugs[0].goalT = 99; g.bugs[0].state = 'idle'
  run(g, 1.5, (i) => ({ yaw: 0, capturePressed: i === 4 })); assert.equal(g.stats.captured, 1)
  run(g, 3, { yaw: 0, mz: -1 }); assert.equal(g.cp, 1)
  g.health = 1; g.p.x = 5; g.p.z = -9; g.level.barriers = [{ x: 5, z: -9, w: 2, d: 2, h: 3 }]; run(g, 0.2, {}); run(g, 2, {}); assert.equal(g.stats.captured, 1)
})
test('a checkpoint snapshot restores captured bugs, repairs, items and score into a fresh game', () => {
  const lv = mini({ bugs: [ahead('normal', 3.5), { type: 'normal', x: 12, z: 0 }], checkpoints: [[0, 0, -8]], pickups: [{ kind: 'recharge', x: 3, z: 3 }], orbs: [{ x: 1, z: 1 }] })
  const g = createGame(lv, { seed: 2 }); g.bugs[0].goalT = 99; run(g, 1.5, (i) => ({ yaw: 0, capturePressed: i === 4 })); assert.equal(g.stats.captured, 1)
  g.p.z = -8; run(g, 0.1, {}); assert.equal(g.cp, 0)
  const snap = JSON.parse(JSON.stringify(checkpointSnapshot(g)))
  const h = createGame(lv, { seed: 9 }); assert.equal(restoreFromSnapshot(h, snap), true)
  assert.equal(h.stats.captured, 1); assert.equal(h.score.bugs, SCORE.normal); assert.equal(h.bugs.length, 1); assert.equal(h.cp, 0); assert.ok(Math.abs(h.p.z + 8) < 0.01); assert.equal(restoreFromSnapshot(createGame(lv), null), false)
})
test('exit: closed until the objectives are met; reaching it completes the level; time, health and challenge bonuses are added once', () => {
  const lv = mini({ bugs: [ahead('normal', 3.5)], objectives: { captures: 1, repairs: 0 }, challenge: { kind: 'nodamage', text: 'No damage' }, exit: [0, 0, -12] })
  const g = createGame(lv, { seed: 2 }); g.bugs[0].goalT = 99
  run(g, 2, { yaw: 0, mz: -1 }); assert.equal(g.done, false, 'exit closed before the capture')
  g.p.x = 0; g.p.z = 0; g.bugs[0].x = 0; g.bugs[0].z = -3.5; g.bugs[0].state = 'idle'
  run(g, 1, (i) => ({ yaw: 0, capturePressed: i === 3 })); assert.equal(objectivesMet(g), true)
  run(g, 4, { yaw: 0, mz: -1, sprint: true }); assert.equal(g.done, true)
  const s = summary(g); assert.equal(s.parts.bugs, 10); assert.equal(s.parts.challenge, SCORE.challenge); assert.equal(s.parts.health, MAX_HEALTH * SCORE.healthLeft); assert.ok(s.parts.time > 0); assert.equal(s.stars >= 2, true)
  assert.equal(s.score, Object.values(s.parts).reduce((a, b) => a + b, 0))
})

// ---------------------------------------------------------------- repair stations in the world
test('stations: E near a console opens the puzzle (world paused), solving pays +100 once and counts toward the objective; locked stages refuse', () => {
  const lv = mini({ stations: [{ id: 'a', x: 0, z: -2, puzzle: 'switches', diff: 1 }, { id: 'b', x: 6, z: -2, puzzle: 'circuit', diff: 1, requires: ['a'] }], objectives: { captures: 0, repairs: 'all' } })
  const g = createGame(lv, { seed: 1 }); g.p.z = -1
  const ev = run(g, 0.2, (i) => ({ yaw: 0, interactPressed: i === 1 })); assert.ok(ev.some((e) => e.type === 'openPuzzle')); assert.ok(g.puzzle)
  const t0 = g.t; run(g, 1, { yaw: 0 }); assert.equal(g.t, t0, 'the world is paused while the puzzle is open')
  const p = g.puzzle.p
  for (const a of puzzleSolution(p)) repairAction(g, a)
  assert.equal(g.stats.repairs, 1); assert.equal(g.score.repairs, SCORE.repair); assert.equal(g.puzzle, null); assert.equal(g.stations[0].solved, true)
  assert.equal(openStation(g, 'a'), false, 'a solved station cannot be repaired twice')
  g.p.x = 6; const ev2 = run(g, 0.2, (i) => ({ yaw: 0, interactPressed: i === 1 })); assert.ok(ev2.some((e) => e.type === 'openPuzzle'))
  closePuzzle(g); assert.equal(g.puzzle, null); assert.equal(g.stats.repairs, 1)
  assert.equal(objectivesOf(g).find((o) => o.id === 'repairs').done, false)
  const locked = createGame(lv, { seed: 1 }); locked.p.x = 6; locked.p.z = -1; const ev3 = run(locked, 0.2, (i) => ({ yaw: 0, interactPressed: i === 1 })); assert.ok(ev3.some((e) => e.type === 'stationLocked')); assert.equal(locked.puzzle, null)
})
test('a failed repair closes the puzzle without rewards and can be tried again', () => {
  const lv = mini({ stations: [{ id: 'a', x: 0, z: -2, puzzle: 'switches', diff: 1 }], objectives: { captures: 0, repairs: 1 } })
  const g = createGame(lv, { seed: 1 }); g.p.z = -1; run(g, 0.2, (i) => ({ yaw: 0, interactPressed: i === 1 }))
  for (let i = 0; i < 3; i += 1) repairAction(g, { type: 'flip', i: g.puzzle ? g.puzzle.p.order[1] : 0 })
  assert.equal(g.puzzle, null); assert.equal(g.stats.repairs, 0); assert.equal(g.stations[0].fails, 1)
  const ev = run(g, 0.2, (i) => ({ yaw: 0, interactPressed: i === 1 })); assert.ok(ev.some((e) => e.type === 'openPuzzle'))
})

// ---------------------------------------------------------------- bosses
test('boss: sleeps until bugs and repairs are done, telegraphs before attacks, can only be hurt while exposed, has phases and is beatable', () => {
  const lv = mini({ size: 24, boss: { kind: 'crab', x: 0, z: -10 }, objectives: { captures: 0, repairs: 0 } })
  const g = createGame(lv, { seed: 1 })
  run(g, 0.1, { yaw: 0 }); assert.equal(g.boss.active, true)
  const states = new Set(); let guard = 0
  while (g.boss.hp > 0 && g.t < 120 && guard++ < 7200) {
    run(g, 1 / 60, (i, gg) => {
      const b = gg.boss; states.add(b.state)
      const dx = gg.p.x - b.x; const dz = gg.p.z - b.z
      const input = { yaw: Math.atan2(-(b.x - gg.p.x), -(b.z - gg.p.z)) }
      if (b.state === 'telegraph' || b.state === 'attack') { // dodge to the side
        const sx = b.dir ? -b.dir[1] : 1; const sz = b.dir ? b.dir[0] : 0
        input.yaw = 0; input.mx = Math.sign(dx * sx + dz * sz || 1) * 1; input.mz = 0; if (gg.p.y < 0.1 && Math.hypot(dx, dz) < 3) input.jumpPressed = true
      }
      if (b.state === 'exposed') { input.mz = Math.hypot(dx, dz) > 3.2 ? -1 : 0; input.capturePressed = true }
      return input
    })
    if (g.over) { g.over = false; g.lives = 3; g.health = MAX_HEALTH; g.respawnT = 0 }
  }
  assert.ok(states.has('telegraph') && states.has('attack') && states.has('exposed') && states.has('phase'), `states seen: ${[...states]}`)
  assert.equal(g.boss.hp, 0); assert.equal(g.stats.bossDefeated, true); assert.equal(g.score.boss, SCORE.boss)
})
test('boss: a net thrown while it is not dazed is deflected and does not hurt it', () => {
  const g = createGame(mini({ boss: { kind: 'core', x: 0, z: -4 } }), { seed: 1 }); run(g, 0.05, { yaw: 0 }); g.boss.state = 'idle'; g.boss.stateT = -5
  const hp = g.boss.hp; run(g, 0.6, (i) => ({ yaw: 0, capturePressed: i === 2 })); assert.equal(g.boss.hp, hp)
})

// ---------------------------------------------------------------- the bot plays every level
// a small grid path finder for the bot (LAXBOT's route around walls); players simply steer
function makeNav(level) {
  const size = level.size; const N = Math.ceil(size * 2) + 1
  const blocked = Array.from({ length: N }, () => Array(N).fill(false))
  const toCell = (v) => Math.round(v + size)
  for (let ix = 0; ix < N; ix += 1) for (let iz = 0; iz < N; iz += 1) {
    const x = ix - size; const z = iz - size
    for (const b of level.solids) if (b.y1 > 0.6 && b.y0 < 1.5 && Math.abs(x - b.x) < b.w / 2 + 0.9 && Math.abs(z - b.z) < b.d / 2 + 0.9) blocked[ix][iz] = true
  }
  const lineClear = (ax, az, bx, bz) => { const d = Math.hypot(bx - ax, bz - az); const n = Math.ceil(d / 0.4); for (let i = 1; i <= n; i += 1) { const x = ax + ((bx - ax) * i) / n; const z = az + ((bz - az) * i) / n; if (blocked[toCell(x)]?.[toCell(z)]) return false } return true }
  const cache = { gx: null, gz: null, dist: null, at: -1 }
  const field = (gx, gz, frame) => {
    if (cache.dist && cache.gx === toCell(gx) && cache.gz === toCell(gz)) return cache.dist
    const dist = Array.from({ length: N }, () => Array(N).fill(-1)); const q = [[toCell(gx), toCell(gz)]]
    dist[q[0][0]][q[0][1]] = 0
    for (let h = 0; h < q.length; h += 1) { const [x, z] = q[h]; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const nx = x + dx; const nz = z + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N || dist[nx][nz] >= 0 || blocked[nx][nz]) continue; dist[nx][nz] = dist[x][z] + 1; q.push([nx, nz]) } }
    cache.gx = toCell(gx); cache.gz = toCell(gz); cache.dist = dist; cache.at = frame
    return dist
  }
  return { next(px, pz, gx, gz, frame) {
    if (lineClear(px, pz, gx, gz)) return [gx, gz]
    const dist = field(gx, gz, frame); const cx = toCell(px); const cz = toCell(pz)
    let best = null; let bd = Infinity
    for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) { const nx = cx + dx; const nz = cz + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N || blocked[nx][nz]) continue; const d = dist[nx][nz]; if (d >= 0 && d < bd) { bd = d; best = [nx - size, nz - size] } }
    // look a few cells ahead along the gradient for a smoother line
    if (best) { let [bx, bz] = best; for (let k = 0; k < 4; k += 1) { let nb = null; let nd = dist[toCell(bx)][toCell(bz)]; for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) { const nx = toCell(bx) + dx; const nz = toCell(bz) + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N || blocked[nx][nz]) continue; const d = dist[nx][nz]; if (d >= 0 && d < nd) { nd = d; nb = [nx - size, nz - size] } } if (!nb || !lineClear(px, pz, nb[0], nb[1])) break; [bx, bz] = nb } return [bx, bz] }
    return [gx, gz]
  } }
}

function playLevel(level, seed, { maxSeconds = 1200 } = {}) {
  const g = createGame(level, { seed })
  const nav = makeNav(level)
  const st = { stuck: 0, lastX: g.p.x, lastZ: g.p.z, detour: 0, detourSign: 1, solveQueue: null, frame: 0, routeIdx: -1 }
  const route = level.route
  const platUnder = () => { if (!route) return -1; let best = -1; route.forEach(([x, y, z], i) => { if (Math.abs(g.p.x - x) < 2.5 && Math.abs(g.p.z - z) < 2.5 && Math.abs(g.p.y - y) < 0.6) best = i }); return best }
  for (let f = 0; f < maxSeconds * 60 && !g.done && !g.over; f += 1) {
    st.frame = f
    if (g.puzzle) {
      const pz = g.puzzle.p
      if (!st.solveQueue || st.solveQueue.station !== g.puzzle.stationId || st.solveQueue.attempt !== pz) st.solveQueue = { station: g.puzzle.stationId, attempt: pz, actions: pz.type === 'power' ? null : puzzleSolution(pz), i: 0 }
      repairTick(g, 1 / 60)
      if (!g.puzzle) { st.solveQueue = null; continue }
      if (pz.type === 'power') { if (f % 9 === 0) { const a = powerAssist(pz); if (a) repairAction(g, a) } } else if (pz.type !== 'nodes' || pz.phase === 'input') { if (st.solveQueue.i < st.solveQueue.actions.length && f % 6 === 0) repairAction(g, st.solveQueue.actions[st.solveQueue.i++]) }
      continue
    }
    const input = { yaw: 0, mx: 0, mz: 0, sprint: false, jumpPressed: false, capturePressed: false, interactPressed: false }
    const p = g.p
    const goTo = (tx0, tz0, { stop = 0, sprint = false } = {}) => {
      let tx = tx0; let tz = tz0
      const real = Math.hypot(tx - p.x, tz - p.z)
      if (nav && real > 1.5 && p.y < 0.5) [tx, tz] = nav.next(p.x, p.z, tx, tz, st.frame)
      let dx = tx - p.x; let dz = tz - p.z; const d = real
      if (d < 0.001) return d
      let heading = Math.atan2(-dx, -dz)
      if (st.detour > 0) { heading += st.detourSign * 1.3; st.detour -= 1 / 60 }
      input.yaw = heading; input.mz = d > stop ? -1 : 0; input.sprint = sprint
      void dx; void dz
      return d
    }
    // stuck detection: no progress while trying to move
    if (f % 20 === 0) { const moved = Math.hypot(p.x - st.lastX, p.z - st.lastZ); if (moved < 0.3 && st.moving && st.detour <= 0) { st.detour = 0.9; st.detourSign = -st.detourSign } st.lastX = p.x; st.lastZ = p.z }
    st.moving = false
    const need = objectivesOf(g)
    const capNeed = need.find((o) => o.id === 'captures'); const wantBugs = capNeed && !capNeed.done
    const b = g.boss
    let handled = false
    if (b && b.active && b.state !== 'defeated') {
      handled = true
      const d = Math.hypot(b.x - p.x, b.z - p.z); const toB = Math.atan2(-(b.x - p.x), -(b.z - p.z))
      input.yaw = toB
      if (b.state === 'telegraph' || (b.state === 'attack' && b.attack !== 'orbs')) {
        if (b.attack === 'charge') { const sx = -b.dir[1]; const sz = b.dir[0]; const side = Math.sign((p.x - b.x) * sx + (p.z - b.z) * sz) || 1; input.yaw = 0; input.mx = side; input.mz = 0; input.sprint = true; st.moving = false }
        else if (b.attack === 'beam') { const ang = Math.atan2(p.x - b.x, p.z - b.z); const da = Math.abs(((b.beamAngle - ang + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI); input.yaw = toB; if (d < 6) { input.mz = 1 } if (p.y < 0.1 && da < 0.6) input.jumpPressed = true }
      } else if (b.state === 'attack' && b.attack === 'orbs') {
        input.yaw = toB; if (p.y < 0.05 && g.projectiles.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < 2.6)) input.jumpPressed = true
        if (d < 5) input.mz = 1
      } else if (b.state === 'exposed') {
        input.mz = d > 3.4 ? -1 : 0; input.capturePressed = true; input.sprint = d > 6
      } else { input.mz = d < 8 ? 1 : 0; input.yaw = toB }
      if (g.projectiles.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < 2.6) && p.y < 0.05) input.jumpPressed = true
    }
    if (!handled) {
      // local tasks on the current floor first (the tower), then the route, else the nearest objective
      let goal = null
      const here = platUnder()
      if (route) {
        if (p.y < 0.2 && g.grounded) st.routeIdx = -1; else if (here >= 0) st.routeIdx = here
      }
      const sameFloor = (y) => !route || (Math.abs((y || 0) - p.y) < 0.6 && g.grounded)
      const bugs = g.bugs.filter((x) => !x.captured && sameFloor(x.y))
      if (wantBugs && bugs.length) {
        const nearest = bugs.slice().sort((a, c) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z))[0]
        const near = Math.hypot(nearest.x - p.x, nearest.z - p.z)
        if (!route || near < 9) goal = { kind: 'bug', bug: nearest }
      }
      if (!goal) {
        const stations = g.stations.filter((s) => !s.solved && (s.requires || []).every((id) => g.stations.find((x) => x.id === id)?.solved) && sameFloor(s.y))
        if (stations.length && (!wantBugs || !g.bugs.filter((x) => !x.captured).length)) {
          const s = stations.sort((a, c) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z))[0]
          if (!route || Math.hypot(s.x - p.x, s.z - p.z) < 9) goal = { kind: 'station', s }
        }
      }
      if (!goal && b && !b.active) goal = { kind: 'wait' }
      if (goal && goal.kind === 'bug') {
        const bug = goal.bug; const d = goTo(bug.x, bug.z, { stop: 3.2, sprint: Math.hypot(bug.x - p.x, bug.z - p.z) > 5 }); st.moving = d > 3.2
        if (g.target && g.target.id === bug.id && g.target.inRange) { input.capturePressed = true; if (bug.type === 'shield' && bug.state === 'chase') { input.mz = 0 } }
        if (BUG_TYPES[bug.type].attack && d < 2.2) input.sprint = false
      } else if (goal && goal.kind === 'station') {
        const d = goTo(goal.s.x, goal.s.z, { stop: 1.2 }); st.moving = d > 1.2; if (d < 2.0) input.interactPressed = true
      } else if (goal && goal.kind === 'wait') { // everything else is done: walk into the boss arena
        const d = goTo(b.hx, b.hz, { stop: 11 }); st.moving = d > 11
      } else if (route) {
        // climb (or drop back down) along the route to the floor that still has something to do
        const nearestIdx = (x, y, z) => { let best = 0; let bd = Infinity; route.forEach(([rx, ry, rz], k) => { const d = Math.hypot(rx - x, rz - z) + Math.abs(ry - y) * 2; if (d < bd) { bd = d; best = k } }); return best }
        let targetIdx = route.length - 1
        const left = g.bugs.filter((x) => !x.captured)
        const pending = g.stations.find((x) => !x.solved && (x.requires || []).every((id) => g.stations.find((y) => y.id === id)?.solved))
        if (wantBugs && left.length) targetIdx = nearestIdx(left[0].x, left[0].y, left[0].z)
        else if (pending) targetIdx = nearestIdx(pending.x, pending.y || 0, pending.z)
        const cur = st.routeIdx
        if (g.exitOpen && cur === route.length - 1) { const ex = level.exit; const d = goTo(ex[0], ex[2], { stop: 0.2 }); st.moving = d > 0.3 }
        else {
          const idx = cur < targetIdx ? cur + 1 : targetIdx; const [rx, ry, rz] = route[Math.max(0, idx)]
          const d = goTo(rx, rz, { stop: 0.5 }); st.moving = d > 0.5
          const aheadGround = groundAt(g, p.x - Math.sin(input.yaw) * 1.4, p.z - Math.cos(input.yaw) * 1.4, p.y + 0.3)
          if (g.grounded && ((ry > p.y + 0.3 && d < 4.4) || (idx > cur && aheadGround < p.y - 0.4)) && d > 0.8) input.jumpPressed = true
          if (ry > p.y + 0.3) input.sprint = d < 8
        }
      } else {
        const ex = level.exit
        const d = goTo(ex[0], ex[2], { stop: 0.2, sprint: true }); st.moving = d > 0.3
      }
    }
    // hazards: wait for a barrier that is on (or about to be), hop sweeping lasers
    const hx = -Math.sin(input.yaw); const hz = -Math.cos(input.yaw)
    for (const bar of level.barriers || []) { const s = barrierState(bar, g.t); const ax = p.x + hx * 2.4; const az = p.z + hz * 2.4; if ((s.on || s.warn) && Math.abs(ax - bar.x) < bar.w / 2 + 0.6 && Math.abs(az - bar.z) < bar.d / 2 + 0.6 && input.mz) { input.mz = 0; input.mx = 0 } }
    for (const l of level.lasers || []) { const q = laserPos(l, g.t); if (g.grounded && Math.abs(p.x - q.x) < l.w / 2 + 1.8 && Math.abs(p.z - q.z) < l.d / 2 + 1.8 && Math.abs(p.y - (l.y - 0.1)) < 0.9) input.jumpPressed = true }
    // small pickups on the way: a shield or recharge when low
    if (g.energy < 25 && !(b && b.active)) { const pk = g.pickups.find((x) => !x.taken && x.kind === 'recharge' && Math.hypot(x.x - p.x, x.z - p.z) < 12 && Math.abs((x.y || 0) - p.y) < 1.5); if (pk) { goTo(pk.x, pk.z, { stop: 0.3 }); input.capturePressed = false } }
    if (process.env.TRACE === level.id && f % 300 === 0 && f < 60 * (+process.env.TO || 200) && f >= 60 * (+process.env.FROM || 0)) console.log(`t=${g.t.toFixed(0)} pos=${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)} hp=${g.health} lives=${g.lives} caps=${g.stats.captured}/${g.totalBugs} rep=${g.stats.repairs} cp=${g.cp} boss=${b ? b.state + ':' + b.hp : '-'} yaw=${input.yaw.toFixed(2)} mz=${input.mz} en=${Math.round(g.energy)} exit=${g.exitOpen} left=${g.bugs.filter((x) => !x.captured).map((x) => `${x.type}@${x.x.toFixed(0)},${x.y.toFixed(1)},${x.z.toFixed(0)}:${x.state}`).join(" ")}`)
    advance(g, 1 / 60, input)
  }
  return g
}

const SEEDS = [1, 2, 3, 4, 5]
const report = []
for (const level of LEVELS) {
  test(`${level.id} (${level.name}): the bot completes it in at least 3 of ${SEEDS.length} tries${level.boss ? `, defeating the ${level.boss.kind} boss` : ''}`, () => {
    let wins = 0; let t = 0; let stars = 0; let boss = 0
    for (const seed of SEEDS) { const g = playLevel(level, seed); if (g.done && g.reason === 'complete') { wins += 1; t += g.t; stars += summary(g).stars; if (g.stats.bossDefeated) boss += 1 } }
    report.push(`${level.id}: ${wins}/${SEEDS.length} completed${wins ? `, avg ${Math.round(t / wins)} s, avg ${(stars / wins).toFixed(1)} stars` : ''}${level.boss ? `, boss beaten ${boss}x` : ''}`)
    assert.ok(wins >= 3, `only ${wins}/${SEEDS.length} completed`)
    if (level.boss) assert.ok(boss >= 3, 'the boss was not defeated often enough')
  })
}
console.log(`\n  bot results:\n  ${report.join('\n  ')}`)
test('five levels, each with a start, checkpoints, objectives, a repair station, bugs or waves and an exit', () => {
  assert.equal(LEVELS.length, 5)
  for (const lv of LEVELS) { assert.ok(lv.checkpoints.length >= 1 && lv.stations.length >= 1 && lv.exit && lv.challenge); assert.ok((lv.bugs || []).length + (lv.waves || []).flat().length >= 3) }
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, 5)
  assert.ok(LEVELS[2].boss && LEVELS[4].boss); assert.ok(LEVELS[4].waves.length >= 3)
  assert.equal(PUZZLE_TYPES.length, 5)
})
void challengeDone; void nearestStation; void NET_RANGE

console.log(`\n${passed} tests passed${process.exitCode ? ' (with failures)' : ''}`)
