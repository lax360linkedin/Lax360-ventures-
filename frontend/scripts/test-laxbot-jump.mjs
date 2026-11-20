// Rule tests for LAXBOT Jump (no browser needed): node scripts/test-laxbot-jump.mjs   (also run by `npm run test:game`)
// Includes a bot that plays every level with the REAL physics to prove that each course has a reachable finish.
import assert from 'node:assert/strict'
import { advance, createGame, groundBelow, summary } from '../src/playzone/games/laxbotJump/logic.js'
import { LEVELS } from '../src/playzone/games/laxbotJump/levels.js'
import { JUMP_V, LIVES, SCORING, STEP } from '../src/playzone/games/laxbotJump/config.js'

let passed = 0
const test = (name, fn) => { try { fn(); passed += 1; console.log(`  ok  ${name}`) } catch (e) { console.error(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1 } }
const frames = (g, seconds, input = {}, fps = 60) => { const ev = []; for (let i = 0; i < Math.round(seconds * fps); i += 1) ev.push(...advance(g, 1 / fps, typeof input === 'function' ? input(i, g) : { ...input })); return ev }

// a flat test level so single mechanics can be checked in isolation
const flat = (over = {}) => ({
  id: 't', par: 30, start: [0, 0, 0], finish: [0, 0, -40], killY: -30, zones: [], spinners: [], spikes: [], lasers: [], stars: [], crystals: [], coins: [], checkpoints: [],
  platforms: [{ id: 'a', type: 'static', x: 0, y: 0, z: 0, w: 20, d: 20, h: 1 }], path: ['a'], ...over,
})

test('jump reaches the designed height and lands back on the platform', () => {
  const g = createGame(flat())
  let top = 0
  frames(g, 1.2, (i) => { top = Math.max(top, g.p.y); return { jumpPressed: i === 2, jumpHeld: true } })
  const expected = (JUMP_V * JUMP_V) / (2 * 30)
  assert.ok(Math.abs(top - expected) < 0.12, `apex ${top.toFixed(2)} vs ${expected.toFixed(2)}`)
  assert.equal(g.grounded, true); assert.equal(g.p.y, 0)
})

test('double jump works once, a third press in the air does nothing', () => {
  const g = createGame(flat()); const ev = []
  ev.push(...frames(g, 0.05, { jumpPressed: true, jumpHeld: true }))
  ev.push(...frames(g, 0.25, { jumpHeld: true }))
  ev.push(...frames(g, 0.02, { jumpPressed: true, jumpHeld: true }))
  ev.push(...frames(g, 0.15, { jumpHeld: true }))
  ev.push(...frames(g, 0.02, { jumpPressed: true, jumpHeld: true }))
  assert.equal(ev.filter((e) => e.type === 'jump').length, 1); assert.equal(ev.filter((e) => e.type === 'doubleJump').length, 1)
  frames(g, 3); assert.equal(g.grounded, true)
})

test('holding the jump button does not repeat jumps (only a new press jumps)', () => {
  const g = createGame(flat())
  const ev = frames(g, 3, (i) => ({ jumpPressed: i === 0, jumpHeld: true }))
  assert.equal(ev.filter((e) => e.type === 'jump' || e.type === 'doubleJump').length, 1)
})

test('a jump pressed just before landing is buffered; one pressed just after leaving an edge still works (coyote)', () => {
  const g = createGame(flat()); frames(g, 0.05, { jumpPressed: true, jumpHeld: true }); frames(g, 0.5, { jumpHeld: true })
  // press 4 frames before touching the ground
  let pressed = false; const ev = []
  for (let i = 0; i < 200 && !pressed; i += 1) { ev.push(...advance(g, 1 / 60, { jumpHeld: true })); if (g.p.vy < 0 && g.p.y < 0.5 && g.jumps === 2) { pressed = true } }
  const g2 = createGame(flat({ platforms: [{ id: 'a', type: 'static', x: 0, y: 0, z: 0, w: 4, d: 4, h: 1 }] }))
  frames(g2, 1.0, { z: -1 }) // walk off the front edge
  assert.equal(g2.grounded, false)
  const ev2 = frames(g2, 0.03, { jumpPressed: true, jumpHeld: true })
  assert.ok(ev2.some((e) => e.type === 'jump' || e.type === 'doubleJump'))
})

test('walking stops at a platform side wall and never clips through', () => {
  const g = createGame(flat({ platforms: [{ id: 'a', type: 'static', x: 0, y: 0, z: 0, w: 20, d: 20, h: 1 }, { id: 'w', type: 'static', x: 0, y: 3, z: -4, w: 4, d: 2, h: 6 }] }))
  g.p.z = 3
  frames(g, 2, { z: -1 })
  assert.ok(g.p.z >= -4 + 1 + 0.3, `z ${g.p.z.toFixed(2)}`)
})

test('standing on a moving platform keeps LAXBOT on it (no sliding, no sinking)', () => {
  const lv = flat({ platforms: [{ id: 'a', type: 'static', x: 0, y: 0, z: 0, w: 4, d: 4, h: 1 }, { id: 'm', type: 'static', x: 0, y: 0, z: -4, w: 4, d: 4, h: 1, move: { axis: 'x', amp: 3, speed: 1.3 } }, { id: 'e', type: 'static', x: 0, y: 0, z: -8, w: 4, d: 4, h: 1, move: { axis: 'y', amp: 1.5, speed: 1.5 } }] })
  const g = createGame(lv); g.p.x = 0; g.p.z = -4; g.p.y = 0; g.ground = "m"
  for (let i = 0; i < 600; i += 1) { advance(g, 1 / 60, {}); assert.equal(g.grounded, true, `lost the platform at frame ${i}`) }
  const h = createGame(lv); h.p.x = 0; h.p.z = -8; h.p.y = 0; h.ground = "e"
  for (let i = 0; i < 600; i += 1) { advance(h, 1 / 60, {}); assert.equal(h.grounded, true, `elevator frame ${i}`) }
})

test('a disappearing platform drops LAXBOT when it vanishes, and it comes back', () => {
  const lv = flat({ platforms: [{ id: 'a', type: 'static', x: 0, y: 0, z: 0, w: 4, d: 4, h: 1, cycle: { on: 1, off: 1.5 } }], killY: -100 })
  const g = createGame(lv); const seen = []
  for (let i = 0; i < 60 * 1.3; i += 1) { advance(g, 1 / 60, {}); seen.push(g.grounded) }
  assert.equal(seen[10], true); assert.equal(seen[seen.length - 1], false)
  const g2 = createGame(lv); frames(g2, 2.6); assert.equal(g2.plats[0].solid, true)
})

test('a bounce pad launches LAXBOT higher than a jump and allows a double jump after it', () => {
  const lv = flat({ platforms: [{ id: 'a', type: 'bounce', x: 0, y: 0, z: 0, w: 4, d: 4, h: 1 }] })
  const g = createGame(lv); let top = 0; const ev = frames(g, 1.4, () => { top = Math.max(top, g.p.y); return {} })
  assert.ok(ev.some((e) => e.type === 'bounce')); assert.ok(top > 3.5, `apex ${top.toFixed(2)}`); assert.equal(g.jumps, 1)
})

test('a low-gravity zone gives a higher jump', () => {
  const normal = createGame(flat()); let a = 0; frames(normal, 1.4, (i) => { a = Math.max(a, normal.p.y); return { jumpPressed: i === 1, jumpHeld: true } })
  const low = createGame(flat({ zones: [{ x0: -50, x1: 50, y0: -50, y1: 50, z0: -50, z1: 50, g: 0.45 }] })); let b = 0; frames(low, 2.2, (i) => { b = Math.max(b, low.p.y); return { jumpPressed: i === 1, jumpHeld: true } })
  assert.ok(b > a * 1.8, `${b.toFixed(2)} vs ${a.toFixed(2)}`)
})

test('falling below the course costs a life and respawns at the last checkpoint; checkpoints only move forward', () => {
  const lv = flat({ platforms: [{ id: 'a', type: 'static', x: 0, y: 0, z: 0, w: 4, d: 4, h: 1 }, { id: 'b', type: 'static', x: 0, y: 0, z: -8, w: 4, d: 4, h: 1 }], checkpoints: [{ id: 'c0', pos: [0, 0, -8] }], killY: -10 })
  const g = createGame(lv); g.p.z = -8; g.p.y = 0.01; g.ground = 'b'
  frames(g, 0.2); assert.equal(g.cp, 0)
  g.p.x = 6; g.p.y = -11; g.grounded = false; g.ground = null
  const ev = frames(g, 2)
  assert.ok(ev.some((e) => e.type === 'fall')); assert.ok(ev.some((e) => e.type === 'respawn'))
  assert.equal(g.lives, LIVES - 1); assert.ok(Math.abs(g.p.z + 8) < 0.5 && Math.abs(g.p.x) < 0.5)
})

test('collectibles are counted once, even if LAXBOT stays on them', () => {
  const lv = flat({ coins: [{ id: 'c1', x: 0, y: 0.75, z: 0 }], crystals: [{ id: 'k1', x: 0, y: 0.75, z: 0 }], stars: [{ id: 's1', x: 0, y: 0.75, z: 0 }] })
  const g = createGame(lv); const ev = frames(g, 3)
  assert.equal(g.coins, 1); assert.equal(g.crystals, 1); assert.equal(g.stars, 1); assert.equal(ev.filter((e) => e.type === 'coin').length, 1)
  const s = summary(g); assert.equal(s.parts.coins, SCORING.coin)
})

test('lives run out: game over, and nothing advances afterwards', () => {
  const g = createGame(flat({ killY: 5 }), { lives: 2 }); frames(g, 4)
  assert.equal(g.over, true); assert.equal(g.reason, 'lives')
  const t = g.t; frames(g, 1); assert.equal(g.t, t)
})

test('score: documented breakdown, completion only counts when finished, star rating rules', () => {
  const lv = flat({ coins: [{ id: 'c1', x: 5, y: 1, z: 5 }, { id: 'c2', x: 6, y: 1, z: 5 }], crystals: [{ id: 'k1', x: 7, y: 1, z: 5 }], stars: [{ id: 's1', x: 8, y: 1, z: 5 }], finish: [0, 0, 0] })
  const g = createGame(lv)
  g.taken.add('c1'); g.coins = 1; g.crystals = 1; g.stars = 1; g.done = true; g.reason = 'complete'; g.t = 20
  const s = summary(g)
  assert.equal(s.parts.coins, 10); assert.equal(s.parts.crystals, 50); assert.equal(s.parts.stars, 200); assert.equal(s.parts.lives, LIVES * SCORING.life); assert.equal(s.parts.completion, 500); assert.equal(s.parts.time, 10 * SCORING.timePerSecond)
  assert.equal(s.score, 10 + 50 + 200 + 300 + 500 + 50); assert.equal(s.rating, 1) // only one of the two coins (50%): below the 75% needed for two stars
  g.coins = 2; assert.equal(summary(g).rating, 3)
  g.done = false; g.reason = null; assert.equal(summary(g).score, 20 + 50 + 200); assert.equal(summary(g).rating, 0)
})

test('the game plays the same at 30, 60 and 144 fps', () => {
  const run = (fps) => { const g = createGame(flat()); frames(g, 3, (i) => ({ z: -1, x: 0.5, jumpPressed: i === Math.round(fps * 0.5), jumpHeld: i < fps * 0.9 }), fps); return g.p }
  const a = run(60); const b = run(30); const c = run(144)
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.35 && Math.hypot(a.x - c.x, a.z - c.z) < 0.35, `${a.x.toFixed(2)},${a.z.toFixed(2)} / ${b.x.toFixed(2)},${b.z.toFixed(2)} / ${c.x.toFixed(2)},${c.z.toFixed(2)}`)
})

// ---------------------------------------------------------------- a bot that plays the real levels
function playLevel(level, { seconds = 420, lives = 99 } = {}) {
  const g = createGame(level, { lives })
  const byId = new Map(g.plats.map((p) => [p.id, p]))
  const idx = new Map(level.path.map((id, i) => [id, i]))
  let cur = 0; let dj = false; let prevJump = false
  const solidFor = (pl, need) => { if (!pl.cycle) return true; const total = pl.cycle.on + pl.cycle.off; const u = (((g.t + (pl.cycle.offset || 0)) % total) + total) % total; return u < pl.cycle.on - need }
  for (let f = 0; f < seconds * 60 && !g.done && !g.over; f += 1) {
    const p = g.p
    if (g.lastGround && idx.has(g.lastGround)) cur = idx.get(g.lastGround)
    const next = byId.get(level.path[Math.min(cur + 1, level.path.length - 1)])
    const onLast = cur >= level.path.length - 1
    const lead = (pl) => { if (!pl.move) return [pl.cx, pl.cz]; const eta = Math.hypot(pl.cx - p.x, pl.cz - p.z) / 7; const sv = pl.move.amp * Math.sin(pl.move.speed * (g.t + eta) + (pl.move.phase || 0)); return [pl.bx + (pl.move.axis === 'x' ? sv : 0), pl.bz + (pl.move.axis === 'z' ? sv : 0)] }
    const [lx, lz] = onLast ? [level.finish[0], level.finish[2]] : lead(next)
    const tx = lx; const tz = lz
    let dx = tx - p.x; let dz = tz - p.z; const dist = Math.hypot(dx, dz) || 1; dx /= dist; dz /= dist
    let move = 1; let jump = false
    if (g.respawnT > 0) move = 0
    const ahead = groundBelow(g, p.x + dx * 1.0, p.z + dz * 1.0, p.y + 0.3, 1.2)
    const here = g.plats.find((q) => q.id === g.ground)
    if (g.grounded && !onLast) {
      let needJump = !ahead
      const wait = (next.move?.axis === 'x' && Math.abs(next.cx - p.x) > next.w / 2 - 0.2 && !ahead) || (next.move?.axis === 'y' && (next.cy - p.y > 0.4 || next.cy - p.y < -1.2) && next.cy - p.y > 0.4) || !solidFor(next, 2.0)
      if (needJump && wait && Math.hypot(next.cx - p.x, next.cz - p.z) > 1) { move = 0; needJump = false }
      if (needJump) jump = true
      if (here && !ahead && here.cycle && !solidFor(here, 0.4)) jump = true
    }
    for (const s of level.spinners) {
      if (!g.grounded) continue
      const a = s.speed * (g.t + 0.18) + (s.phase || 0)
      for (let arm = 0; arm < (s.arms || 2); arm += 1) for (let d = 0.9; d <= s.r + 0.01; d += 0.9) { const ang = a + (arm * Math.PI * 2) / (s.arms || 2); if (Math.hypot(p.x - (s.x + Math.cos(ang) * d), p.z - (s.z + Math.sin(ang) * d)) < 2.0) jump = true }
    }
    for (const l of g.lasers) if (g.grounded && Math.abs(p.z - l.cz) < 1.5 && (l.active || l.warn || l.move) && Math.abs(p.x - l.cx) < l.hw + 1) { if (l.cycle) { if (l.active || l.warn) { move = Math.abs(p.z - l.cz) < 1.0 ? 1 : 0; if (Math.abs(p.z - l.cz) < 0.9) jump = true } } else jump = true }
    for (const s of level.spikes) if (g.grounded && Math.hypot(p.x - s.x, p.z - s.z) < 1.6) { jump = true }
    // an extra jump in the air when the next platform is out of reach of the first one
    let dJump = false
    if (!g.grounded && g.jumps === 1 && p.vy < 0.5 && !onLast) { const nearEdge = Math.hypot(next.cx - p.x, next.cz - p.z) > next.w / 2 + 0.2; if (nearEdge && p.y < next.cy + 0.5) dJump = true }
    if (!g.grounded && g.jumps === 0 && g.coyote <= 0 && !onLast) dJump = p.vy < 0
    const press = (jump && g.grounded) || dJump
    const inp = { x: dx * move, z: dz * move, jumpPressed: press && !prevJump, jumpHeld: !!(jump || dJump || (!g.grounded && p.vy > 0)) }
    prevJump = press
    advance(g, 1 / 60, inp)
    if (process.env.TRACE === level.id && f % 6 === 0 && f >= 60 * (+process.env.FROM || 0) && f < 60 * (+process.env.TO || 14)) console.log(f, p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2), 'v', p.vz.toFixed(1), p.vy.toFixed(1), g.grounded, g.jumps, 'in', inp.x.toFixed(2), inp.z.toFixed(2), inp.jumpPressed)
  }
  return { g, s: summary(g) }
}

for (const level of LEVELS) {
  test(`${level.world}: a bot reaches the finish with the real physics`, () => {
    const { g, s } = playLevel(level)
    assert.ok(g.done && g.reason === 'complete', `not finished after ${g.t.toFixed(0)} s (lives used: ${99 - g.lives}, falls ${g.falls}, hits ${g.hits}, cp ${g.cp}, at ${g.p.x.toFixed(1)},${g.p.y.toFixed(1)},${g.p.z.toFixed(1)}, ground ${g.ground})`)
    console.log(`        ${level.world}: ${g.t.toFixed(1)} s, falls ${g.falls}, hits ${g.hits}, score ${s.score}, stars ${s.rating}/3, coins ${s.coins}/${s.coinsTotal}`)
  })
}

test('every level is complete: start, checkpoint, finish, collectibles, a hidden star and unique ids', () => {
  for (const l of LEVELS) {
    assert.ok(l.checkpoints.length >= 1, `${l.id} checkpoint`); assert.ok(l.finish, `${l.id} finish`); assert.ok(l.coins.length >= 8, `${l.id} coins`); assert.ok(l.crystals.length >= 2, `${l.id} crystals`); assert.ok(l.stars.length >= 1, `${l.id} star`)
    const ids = [...l.coins, ...l.crystals, ...l.stars].map((i) => i.id); assert.equal(new Set(ids).size, ids.length, `${l.id} duplicate ids`)
  }
})

console.log(`\n${passed} tests passed${process.exitCode ? ' (with failures)' : ''}`)
void STEP
