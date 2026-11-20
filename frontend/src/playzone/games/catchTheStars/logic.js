import {
  BOT_ACCEL, BOT_MAX_SPEED, BOT_TOUCH_SPEED, CATCH, FIELD_HALF, INVULNERABLE_SECONDS, ITEMS, KILL_Y, MAX_FRAME, MAX_LIVES, POWERUP_SECONDS, ROUND_SECONDS, SPAWN_HALF, SPAWN_Y, STEP, stageForRemaining,
} from './config.js'

// Catch the Stars: the game rules (movement, spawning, collisions, scoring, lives, power-ups, difficulty, timer). Plain data and functions: no React, no Three.js, no DOM, so every rule can be
// tested on its own. The scene only DRAWS what this produces; the controller feeds it time and input and reacts to the events it returns.

/** A small seeded random generator (mulberry32). The game seeds it from the clock; tests seed it to be exact. */
export function makeRng(seed = Date.now()) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const POOL = 48 // items alive at once: the pool is allocated once and reused (no garbage while playing)

export function createGame(rng = makeRng()) {
  return {
    rng,
    time: 0, remaining: ROUND_SECONDS, acc: 0, over: false, reason: null,
    score: 0, lives: MAX_LIVES, stars: 0, golden: 0, diamonds: 0, hearts: 0, bombsHit: 0, rainbows: 0, combo: 0, bestCombo: 0,
    multiplierUntil: -1, invulnerableUntil: -1,
    botX: 0, botVx: 0,
    spawnTimer: 0.5, lastX: 0, lastBombAt: -9, lastHeartAt: -9, clusterTimer: 0,
    items: Array.from({ length: POOL }, () => ({ alive: false, kind: 'star', x: 0, y: 0, vy: 0, spin: 0, seed: 0 })),
  }
}

export const multiplierLeft = (g) => Math.max(0, g.multiplierUntil - g.time)
export const isInvulnerable = (g) => g.time < g.invulnerableUntil
export const aliveItems = (g) => g.items.filter((i) => i.alive)

function acquire(g) {
  return g.items.find((i) => !i.alive) || null
}

function put(g, kind, x, y, speed) {
  const it = acquire(g)
  if (!it) return null
  it.alive = true; it.kind = kind; it.x = x; it.y = y; it.vy = speed; it.spin = (g.rng() - 0.5) * 3; it.seed = g.rng() * 100
  return it
}

function pickKind(g, stage) {
  const w = { ...stage.weights }
  const bombs = g.items.reduce((n, i) => n + (i.alive && i.kind === 'bomb' ? 1 : 0), 0)
  if (bombs >= stage.maxBombs || g.time - g.lastBombAt < 1.0) w.bomb = 0 // never a wall of bombs
  if (g.time - g.lastHeartAt < 4) w.heart = 0
  else if (g.lives >= MAX_LIVES) w.heart *= 0.25 // hearts are rare when you do not need one
  if (g.time < 1.5) { w.bomb = 0; w.heart = 0 } // a gentle start
  let total = 0
  for (const k in w) total += w[k]
  let r = g.rng() * total
  for (const k in w) { r -= w[k]; if (r < 0) return k }
  return 'star'
}

function spawnOne(g, stage) {
  const kind = pickKind(g, stage)
  const dx = (g.rng() * 2 - 1) * stage.maxDx
  let x = Math.max(-SPAWN_HALF, Math.min(SPAWN_HALF, g.lastX + dx))
  if (kind === 'bomb' && Math.abs(x - g.lastX) < 1.6) x = Math.max(-SPAWN_HALF, Math.min(SPAWN_HALF, x + (x >= g.lastX ? 1.7 : -1.7))) // a bomb does not drop right behind another item
  const speed = stage.speed * (0.92 + g.rng() * 0.18) * (kind === 'bomb' ? 0.94 : kind === 'heart' || kind === 'rainbow' ? 0.9 : 1)
  put(g, kind, x, SPAWN_Y, speed)
  g.lastX = x
  if (kind === 'bomb') g.lastBombAt = g.time
  if (kind === 'heart') g.lastHeartAt = g.time
}

// Hard stage: now and then a row of three stars (sometimes with a diamond in the middle): a bonus for good players.
function spawnCluster(g, stage) {
  const cx = Math.max(-SPAWN_HALF + 1, Math.min(SPAWN_HALF - 1, g.lastX + (g.rng() * 2 - 1) * 2.4))
  const middle = g.rng() < 0.4 ? 'diamond' : 'golden'
  put(g, 'star', cx - 1, SPAWN_Y, stage.speed); put(g, middle, cx, SPAWN_Y, stage.speed); put(g, 'star', cx + 1, SPAWN_Y, stage.speed)
  g.lastX = cx
}

function moveBot(g, input, dt) {
  const target = input.target
  if (target !== null && target !== undefined) {
    const want = Math.max(-BOT_TOUCH_SPEED, Math.min(BOT_TOUCH_SPEED, (target - g.botX) * 12))
    g.botVx += (want - g.botVx) * Math.min(1, dt * 18)
  } else {
    const want = (input.move || 0) * BOT_MAX_SPEED
    const d = want - g.botVx
    const a = BOT_ACCEL * dt
    g.botVx += Math.abs(d) <= a ? d : Math.sign(d) * a
  }
  g.botX += g.botVx * dt
  if (g.botX > FIELD_HALF) { g.botX = FIELD_HALF; if (g.botVx > 0) g.botVx = 0 }
  if (g.botX < -FIELD_HALF) { g.botX = -FIELD_HALF; if (g.botVx < 0) g.botVx = 0 }
}

function collect(g, it, events) {
  const def = ITEMS[it.kind]
  it.alive = false // a collected item is gone at once: it can never be rewarded twice
  const double = g.time < g.multiplierUntil
  switch (it.kind) {
    case 'star': case 'golden': case 'diamond': {
      const pts = def.points * (double ? 2 : 1)
      g.score += pts; g.combo += 1; g.bestCombo = Math.max(g.bestCombo, g.combo)
      if (it.kind === 'star') g.stars += 1
      else if (it.kind === 'golden') { g.stars += 1; g.golden += 1 }
      else g.diamonds += 1
      events.push({ type: 'collect', kind: it.kind, x: it.x, y: it.y, points: pts, doubled: double })
      break
    }
    case 'heart': {
      const gained = g.lives < MAX_LIVES
      if (gained) g.lives += 1
      g.hearts += gained ? 1 : 0
      events.push({ type: 'heart', x: it.x, y: it.y, gained })
      break
    }
    case 'bomb': {
      if (g.time < g.invulnerableUntil) { events.push({ type: 'bombPass', x: it.x, y: it.y }); break }
      g.lives -= 1; g.bombsHit += 1; g.combo = 0; g.invulnerableUntil = g.time + INVULNERABLE_SECONDS
      events.push({ type: 'damage', x: it.x, y: it.y, lives: g.lives })
      break
    }
    case 'rainbow': {
      g.multiplierUntil = g.time + POWERUP_SECONDS // collecting another one simply restarts the 5 seconds (it never stacks past double)
      g.rainbows += 1
      events.push({ type: 'powerup', kind: 'rainbow', x: it.x, y: it.y })
      break
    }
    default: break
  }
}

function end(g, reason, events) {
  if (g.over) return
  g.over = true; g.reason = reason
  events.push({ type: 'end', reason })
}

function substep(g, input, dt, events) {
  g.time += dt
  g.remaining = Math.max(0, ROUND_SECONDS - g.time)
  moveBot(g, input, dt)
  const stage = stageForRemaining(g.remaining)

  g.spawnTimer -= dt
  while (g.spawnTimer <= 0) { spawnOne(g, stage); g.spawnTimer += stage.every }
  if (stage.cluster) { g.clusterTimer -= dt; if (g.clusterTimer <= 0) { spawnCluster(g, stage); g.clusterTimer = stage.cluster } }

  const zoneBottom = CATCH.bottom, zoneTop = CATCH.top
  for (const it of g.items) {
    if (!it.alive) continue
    const prevY = it.y
    it.y -= it.vy * dt
    if (it.y < KILL_Y) { it.alive = false; if (it.kind !== 'bomb' && it.kind !== 'heart' && it.kind !== 'rainbow') g.combo = 0; continue } // a missed item just falls away
    const r = ITEMS[it.kind].radius
    // swept test: the item counts if its path during this step crossed the catch zone (it cannot "tunnel" through at high speed)
    if (it.y - r <= zoneTop && prevY + r >= zoneBottom && Math.abs(it.x - g.botX) <= CATCH.halfWidth + r * 0.6) {
      collect(g, it, events)
      if (g.lives <= 0) { end(g, 'lives', events); return }
    }
  }
  if (g.remaining <= 0) end(g, 'time', events)
}

/**
 * Advance the game by `dt` seconds of real time (any frame rate). It runs whole fixed steps of 1/60 s, so the result does not depend on the frame rate. `input` is
 * { move: -1 | 0 | 1, target: number | null }. Returns the events that happened (collect, heart, damage, powerup, bombPass, end).
 */
export function advance(g, dt, input = { move: 0, target: null }) {
  const events = []
  if (g.over) return events
  g.acc += Math.min(MAX_FRAME, Math.max(0, dt))
  while (g.acc >= STEP - 1e-9 && !g.over) { g.acc -= STEP; substep(g, input, STEP, events) } // 1e-9: floating-point dust must not delay a step to the next frame
  return events
}

export const summary = (g) => ({ score: g.score, stars: g.stars, golden: g.golden, diamonds: g.diamonds, hearts: g.hearts, bombsHit: g.bombsHit, bestCombo: g.bestCombo, survived: Math.min(ROUND_SECONDS, g.time), reason: g.reason, finishedRound: g.reason === 'time', lives: g.lives })
