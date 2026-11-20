// Rules tests for Catch the Stars (no browser needed):  node scripts/test-catch-the-stars.mjs   (npm run test:game)
import assert from 'node:assert/strict'
import { advance, createGame, makeRng, multiplierLeft, summary, isInvulnerable } from '../src/playzone/games/catchTheStars/logic.js'
import { FIELD_HALF, MAX_LIVES, POWERUP_SECONDS, ROUND_SECONDS, STAGES, stageForRemaining } from '../src/playzone/games/catchTheStars/config.js'

let passed = 0
const test = (name, fn) => { fn(); passed += 1; console.log(`  ok  ${name}`) }
const idle = { move: 0, target: null }
const drop = (g, kind, x = g.botX, y = 1) => { const it = g.items.find((i) => !i.alive); Object.assign(it, { alive: true, kind, x, y, vy: 1, spin: 0, seed: 0 }); return it }
// advance(g, dt) caps one frame at 0.1 s, so longer spans are played as 60 fps frames
const run = (g, seconds, input = idle) => { for (let t = 0; t < seconds - 1e-9; t += 1 / 60) advance(g, 1 / 60, input) }
const quiet = (g) => { g.spawnTimer = 999; g.clusterTimer = 999 } // no random spawns: only the items the test places

test('difficulty stages follow the whole seconds remaining (30-21 easy, 20-11 medium, 10-0 hard)', () => {
  for (const [rem, id] of [[30, 'easy'], [25.5, 'easy'], [20.5, 'easy'], [20, 'medium'], [15, 'medium'], [10.5, 'medium'], [10, 'hard'], [3, 'hard'], [0, 'hard']]) assert.equal(stageForRemaining(rem).id, id, `remaining ${rem}`)
  assert.ok(STAGES[0].speed < STAGES[1].speed && STAGES[1].speed < STAGES[2].speed, 'falling speed rises with every stage')
  assert.ok(STAGES[0].weights.bomb < STAGES[1].weights.bomb, 'more bombs in medium')
  assert.ok(STAGES[2].weights.diamond + STAGES[2].weights.rainbow > STAGES[0].weights.diamond + STAGES[0].weights.rainbow, 'more bonus items in hard')
})

test('scoring: star +10, golden +25, diamond +50; the heart and bomb score nothing', () => {
  const g = createGame(makeRng(1)); quiet(g)
  drop(g, 'star'); drop(g, 'golden'); drop(g, 'diamond'); drop(g, 'heart'); drop(g, 'bomb')
  const ev = advance(g, 0.05, idle)
  assert.equal(g.score, 85)
  assert.equal(g.stars, 2); assert.equal(g.golden, 1); assert.equal(g.diamonds, 1)
  assert.equal(ev.filter((e) => e.type === 'collect').length, 3)
})

test('an item is rewarded once: it disappears the moment it is caught', () => {
  const g = createGame(makeRng(2)); quiet(g)
  const it = drop(g, 'star')
  run(g, 0.5)
  assert.equal(g.score, 10); assert.equal(it.alive, false)
  run(g, 0.5)
  assert.equal(g.score, 10)
})

test('heart restores a life up to 3; a bomb costs one life and gives a second of protection', () => {
  const g = createGame(makeRng(3)); quiet(g)
  drop(g, 'bomb'); advance(g, 0.05, idle)
  assert.equal(g.lives, 2); assert.ok(isInvulnerable(g))
  drop(g, 'bomb'); advance(g, 0.05, idle)
  assert.equal(g.lives, 2, 'no double damage while protected')
  drop(g, 'heart'); advance(g, 0.05, idle)
  assert.equal(g.lives, 3)
  drop(g, 'heart'); advance(g, 0.05, idle)
  assert.equal(g.lives, MAX_LIVES, 'never above 3')
  run(g, 1.2)
  drop(g, 'bomb'); advance(g, 0.05, idle)
  assert.equal(g.lives, 2, 'protection ended')
})

test('Rainbow Star doubles the points for 5 seconds, then it expires', () => {
  const g = createGame(makeRng(4)); quiet(g)
  drop(g, 'rainbow'); advance(g, 0.05, idle)
  assert.ok(multiplierLeft(g) > POWERUP_SECONDS - 0.2)
  drop(g, 'star'); drop(g, 'diamond'); advance(g, 0.05, idle)
  assert.equal(g.score, 120, '(10 + 50) x 2')
  run(g, POWERUP_SECONDS + 0.1)
  assert.equal(multiplierLeft(g), 0)
  const before = g.score
  drop(g, 'star'); advance(g, 0.05, idle)
  assert.equal(g.score, before + 10, 'back to normal points')
})

test('losing all three lives ends the game at once', () => {
  const g = createGame(makeRng(5)); quiet(g)
  for (let i = 0; i < 3; i += 1) { drop(g, 'bomb'); run(g, 1.1); quiet(g) }
  assert.equal(g.lives, 0); assert.equal(g.over, true); assert.equal(g.reason, 'lives')
})

test('the round lasts exactly 30 seconds and then ends', () => {
  const g = createGame(makeRng(6))
  const h = createGame(makeRng(6))
  for (let i = 0; i < 60 * 10; i += 1) advance(h, 1 / 60, idle)
  assert.ok(Math.abs(h.remaining - 20) < 0.02, `remaining ${h.remaining}`)
  for (let i = 0; i < 60 * 25; i += 1) advance(h, 1 / 60, idle)
  assert.equal(h.over, true); assert.ok(h.reason === 'time' || h.reason === 'lives')
  const s = createGame(makeRng(7)); s.lives = 99
  for (let i = 0; i < 60 * 31; i += 1) advance(s, 1 / 60, idle)
  assert.equal(s.reason, 'time'); assert.ok(Math.abs(s.time - ROUND_SECONDS) < 0.03)
})

test('the game plays the same at any frame rate', () => {
  const run = (fps) => { const g = createGame(makeRng(42)); g.lives = 99; const dt = 1 / fps; for (let i = 0; i < (ROUND_SECONDS + 1) * fps && !g.over; i += 1) advance(g, dt, { move: Math.floor((i / fps) * 2) % 2 ? 1 : -1, target: null }); return summary(g) } // the same input at the same moments, only the frame rate differs
  const a = run(30), b = run(60), c = run(144)
  assert.equal(a.score, b.score); assert.equal(b.score, c.score)
  assert.equal(a.stars, c.stars)
})

test('the bot is held inside the playable area', () => {
  const g = createGame(makeRng(8)); quiet(g)
  for (let i = 0; i < 300; i += 1) advance(g, 1 / 60, { move: 1, target: null })
  assert.ok(g.botX <= FIELD_HALF + 1e-9 && g.botX > FIELD_HALF - 0.01)
  for (let i = 0; i < 600; i += 1) advance(g, 1 / 60, { move: -1, target: null })
  assert.ok(g.botX >= -FIELD_HALF - 1e-9)
  for (let i = 0; i < 200; i += 1) advance(g, 1 / 60, { move: 0, target: 99 }) // a finger far off screen
  assert.ok(g.botX <= FIELD_HALF + 1e-9)
})

test('a fast item cannot tunnel through the catch zone', () => {
  const g = createGame(makeRng(9)); quiet(g)
  const it = drop(g, 'diamond', 0, 2.1); it.vy = 90
  advance(g, 0.05, idle)
  assert.equal(g.diamonds, 1)
})

test('missed items fall away and the pool is reused (no unbounded growth)', () => {
  const g = createGame(makeRng(10)); g.lives = 99
  for (let i = 0; i < 60 * 40; i += 1) { advance(g, 1 / 60, { move: 0, target: 4.4 }); if (g.over) break }
  assert.ok(g.items.length === 48)
  assert.ok(g.items.filter((i) => i.alive).length <= 48)
})

test('fairness: a careful player (steps toward the nearest safe item and keeps clear of bombs about to arrive) survives most rounds', () => {
  const careful = (g) => {
    const live = g.items.filter((i) => i.alive && i.y > 0.2)
    const arrive = (i) => (i.y - 1.4) / i.vy // seconds until the item reaches the catch zone
    const safe = live.filter((i) => i.kind !== 'bomb').sort((a, b) => arrive(a) - arrive(b))
    const bombs = live.filter((i) => i.kind === 'bomb' && arrive(i) < 1.1)
    // the next item that can still be reached in time
    const goal = safe.find((i) => Math.abs(i.x - g.botX) / 9 < arrive(i) + 0.05)
    const wanted = goal ? goal.x : g.botX
    const candidates = [wanted, g.botX, ...bombs.flatMap((b) => [b.x - 1.5, b.x + 1.5])].map((x) => Math.max(-FIELD_HALF, Math.min(FIELD_HALF, x)))
    const risk = (x) => bombs.reduce((r, b) => r + (Math.abs(b.x - x) < 1.25 ? 1 : 0), 0)
    return candidates.sort((a, b) => risk(a) - risk(b) || Math.abs(a - wanted) - Math.abs(b - wanted))[0]
  }
  let survived = 0, caught = 0, seen = 0
  for (let seed = 1; seed <= 60; seed += 1) {
    const g = createGame(makeRng(seed * 977))
    while (!g.over) advance(g, 1 / 60, { move: 0, target: careful(g) })
    const s = summary(g); if (s.finishedRound) survived += 1; caught += s.stars + s.diamonds; seen += 1
  }
  assert.ok(survived / seen >= 0.85, `survived ${survived}/${seen}`)
  assert.ok(caught / seen >= 12, `average catches ${(caught / seen).toFixed(1)}`)
})

test('hard stage adds bonus clusters (three items side by side)', () => {
  const g = createGame(makeRng(11)); g.lives = 99; g.time = 21; g.remaining = 9; g.clusterTimer = 0; g.spawnTimer = 999
  advance(g, 1 / 60, idle)
  assert.ok(g.items.filter((i) => i.alive).length >= 3)
})

console.log(`\n${passed} tests passed`)
