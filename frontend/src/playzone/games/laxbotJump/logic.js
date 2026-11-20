import {
  AIR_ACCEL, AIR_DECEL, BOUNCE_V, COIN_SHARE_FOR_TWO_STARS, COYOTE, DOUBLE_JUMP_V, FALL_BELOW, GRAVITY, GROUND_ACCEL, GROUND_DECEL, INVULNERABLE, JUMP_BUFFER, JUMP_CUT, JUMP_V, LIVES,
  MAX_FRAME, PICKUP_RADIUS, PLAYER, RESPAWN_DELAY, RUN_SPEED, SCORING, STAR_RADIUS, STEP, TERMINAL_V, WALK_SPEED,
} from './config.js'

// LAXBOT Jump: the physics and rules. Pure code: no React, no Three.js, no DOM, so it runs the same in the browser and in `npm run test:game`.
// The loop is a fixed 1/60 s step (frame-rate independent). Collision is axis-separated AABB against the platform boxes: x, then z, then y, which keeps landings stable.
// Events returned from advance(): jump, doubleJump, land, bounce, coin, crystal, star, checkpoint, damage, fall, respawn, complete, over.

const HW = PLAYER.halfWidth
const H = PLAYER.height
const EPS = 0.08

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/** Where a moving or cycling platform is at time t (also used by the renderer through the same game object). */
function placePlatform(pl, t, first) {
  pl.px = first ? pl.bx : pl.cx; pl.py = first ? pl.by : pl.cy; pl.pz = first ? pl.bz : pl.cz
  let s = 0
  if (pl.move) s = pl.move.amp * Math.sin(pl.move.speed * t + (pl.move.phase || 0))
  pl.cx = pl.bx + (pl.move?.axis === 'x' ? s : 0)
  pl.cy = pl.by + (pl.move?.axis === 'y' ? s : 0)
  pl.cz = pl.bz + (pl.move?.axis === 'z' ? s : 0)
  if (first) { pl.px = pl.cx; pl.py = pl.cy; pl.pz = pl.cz }
  if (pl.cycle) {
    const total = pl.cycle.on + pl.cycle.off
    const u = (((t + (pl.cycle.offset || 0)) % total) + total) % total
    pl.solid = u < pl.cycle.on
    pl.warn = pl.solid && u > pl.cycle.on - 0.7 // flickers just before it vanishes
    pl.back = !pl.solid && u > total - 0.5 // flickers just before it returns
  } else { pl.solid = true; pl.warn = false; pl.back = false }
}

function placeLaser(l, t) {
  let s = 0
  if (l.move) s = l.move.amp * Math.sin(l.move.speed * t + (l.move.phase || 0))
  l.cx = l.x + (l.move?.axis === 'x' ? s : 0)
  l.cz = l.z + (l.move?.axis === 'z' ? s : 0)
  if (l.cycle) { const total = l.cycle.on + l.cycle.off; const u = (((t + (l.cycle.offset || 0)) % total) + total) % total; l.active = u < l.cycle.on; l.warn = !l.active && u > total - 0.5 } else { l.active = true; l.warn = false }
}

export function createGame(level, options = {}) {
  const g = {
    level,
    t: 0, acc: 0,
    lives: options.lives ?? LIVES,
    p: { x: level.start[0], y: level.start[1], z: level.start[2], vx: 0, vy: 0, vz: 0 },
    facing: Math.PI, // toward -z, the direction of the course
    grounded: true, ground: null, groundType: null, jumps: 0, coyote: 0, buffer: 0, jumpHeld: false, wasGrounded: true, airborneVy: 0,
    lastGround: null, cp: -1, respawnT: 0, invuln: 0, hurtT: 0, landT: 0, jumpT: 0, djT: 0, danceT: 0,
    taken: new Set(), coins: 0, crystals: 0, stars: 0, falls: 0, hits: 0,
    done: false, over: false, reason: null,
    plats: level.platforms.map((pl) => ({ ...pl, bx: pl.x, by: pl.y, bz: pl.z })),
    lasers: level.lasers.map((l) => ({ ...l })),
    speed: 0,
  }
  g.plats.forEach((pl) => placePlatform(pl, 0, true))
  g.lasers.forEach((l) => placeLaser(l, 0))
  const start = g.plats[0]
  g.ground = start.id; g.groundType = start.type || null
  return g
}

const gravityAt = (g, p) => {
  for (const z of g.level.zones) if (p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1 && p.z >= z.z0 && p.z <= z.z1) return z.g
  return 1
}

/** Highest solid platform surface under (x, z) within `maxDrop` below `fromY`; used by the renderer's shadow and by the test bot. */
export function groundBelow(g, x, z, fromY, maxDrop = 200, margin = HW * 0.5) {
  let best = null
  for (const pl of g.plats) {
    if (!pl.solid) continue
    if (Math.abs(x - pl.cx) <= pl.w / 2 + margin && Math.abs(z - pl.cz) <= pl.d / 2 + margin && pl.cy <= fromY + 0.3 && fromY - pl.cy <= maxDrop && (best === null || pl.cy > best.cy)) best = pl
  }
  return best
}

function damage(g, kind, events) {
  if (g.respawnT > 0 || g.done || g.over) return
  g.lives -= 1
  if (kind === 'fall') { g.falls += 1; events.push({ type: 'fall', x: g.p.x, y: g.p.y, z: g.p.z }) } else { g.hits += 1; g.hurtT = 0.9; events.push({ type: 'damage', kind, x: g.p.x, y: g.p.y, z: g.p.z }) }
  if (g.lives <= 0) { g.over = true; g.reason = 'lives'; events.push({ type: 'over', reason: 'lives' }); return }
  g.respawnT = RESPAWN_DELAY
}

function respawn(g, events) {
  const cp = g.cp >= 0 ? g.level.checkpoints[g.cp] : null
  const [x, y, z] = cp ? cp.pos : g.level.start
  const p = g.p
  p.x = x; p.y = y; p.z = z; p.vx = p.vy = p.vz = 0
  g.grounded = true; g.jumps = 0; g.coyote = 0; g.buffer = 0; g.invuln = INVULNERABLE; g.hurtT = 0
  const pl = groundBelow(g, x, z, y + 0.2, 3)
  g.ground = pl ? pl.id : null; g.lastGround = g.ground; g.groundType = pl?.type || null
  events.push({ type: 'respawn', x, y, z, checkpoint: g.cp })
}

function overlapsXZ(p, pl, pad = 1e-4) { return Math.abs(p.x - pl.cx) < pl.w / 2 + HW - pad && Math.abs(p.z - pl.cz) < pl.d / 2 + HW - pad }

function substep(g, input, events) {
  const dt = STEP
  const p = g.p
  g.t += dt
  g.plats.forEach((pl) => placePlatform(pl, g.t, false))
  g.lasers.forEach((l) => placeLaser(l, g.t))
  g.invuln = Math.max(0, g.invuln - dt); g.hurtT = Math.max(0, g.hurtT - dt); g.landT = Math.max(0, g.landT - dt); g.jumpT = Math.max(0, g.jumpT - dt); g.djT = Math.max(0, g.djT - dt)

  if (g.respawnT > 0) { g.respawnT -= dt; if (g.respawnT <= 0) respawn(g, events); return }

  // ride the platform LAXBOT stands on
  if (g.ground) {
    const pl = g.plats.find((q) => q.id === g.ground)
    if (pl && pl.solid) { p.x += pl.cx - pl.px; p.y += pl.cy - pl.py; p.z += pl.cz - pl.pz } else { g.ground = null; g.grounded = false }
  }

  // horizontal velocity: accelerate toward the stick, brake when it is released
  let ix = clamp(input.x || 0, -1, 1); let iz = clamp(input.z || 0, -1, 1)
  const mag = Math.hypot(ix, iz)
  if (mag > 1) { ix /= mag; iz /= mag }
  const sp = mag < 0.6 ? WALK_SPEED * Math.max(0.5, mag / 0.6) : WALK_SPEED + (RUN_SPEED - WALK_SPEED) * Math.min(1, (mag - 0.6) / 0.4) // a light push walks, a full push runs
  const tx = mag > 0.08 ? (ix / mag) * sp : 0
  const tz = mag > 0.08 ? (iz / mag) * sp : 0
  const rate = (mag > 0.08 ? (g.grounded ? GROUND_ACCEL : AIR_ACCEL) : (g.grounded ? GROUND_DECEL : AIR_DECEL)) * dt
  const approach = (v, target) => (v < target ? Math.min(target, v + rate) : Math.max(target, v - rate))
  p.vx = approach(p.vx, tx); p.vz = approach(p.vz, tz)
  g.speed = Math.hypot(p.vx, p.vz)
  if (g.speed > 0.6) g.facing = Math.atan2(p.vx, p.vz)

  // jumping: buffered press, coyote time, one extra jump in the air
  if (input.jumpPressed) { g.buffer = JUMP_BUFFER; input.jumpPressed = false }
  g.buffer = Math.max(0, g.buffer - dt)
  g.coyote = g.grounded ? COYOTE : Math.max(0, g.coyote - dt)
  g.jumpHeld = !!input.jumpHeld
  if (g.buffer > 0) {
    if (g.grounded || g.coyote > 0) { p.vy = JUMP_V; g.jumps = 1; g.grounded = false; g.ground = null; g.coyote = 0; g.buffer = 0; g.jumpT = 0.35; g.cutOk = true; events.push({ type: 'jump', x: p.x, y: p.y, z: p.z }) }
    else if (g.jumps < 2) { p.vy = DOUBLE_JUMP_V; g.jumps = 2; g.buffer = 0; g.djT = 0.45; g.cutOk = true; events.push({ type: 'doubleJump', x: p.x, y: p.y + 0.4, z: p.z }) }
  }

  // gravity (lighter inside low-gravity zones); a short tap makes a short hop
  const gm = gravityAt(g, p)
  p.vy -= GRAVITY * gm * dt
  if (!g.jumpHeld && p.vy > 0 && g.cutOk) p.vy -= GRAVITY * gm * dt * JUMP_CUT
  p.vy = Math.max(TERMINAL_V, p.vy)

  // ---- collision: x, then z, then y ----
  const solids = g.plats.filter((pl) => pl.solid)
  const overlapY = (pl) => p.y < pl.cy - EPS && p.y + H > pl.cy - pl.h
  p.x += p.vx * dt
  for (const pl of solids) if (overlapY(pl) && overlapsXZ(p, pl)) { p.x = p.x >= pl.cx ? pl.cx + pl.w / 2 + HW : pl.cx - pl.w / 2 - HW; p.vx = 0 }
  p.z += p.vz * dt
  for (const pl of solids) if (overlapY(pl) && overlapsXZ(p, pl)) { p.z = p.z >= pl.cz ? pl.cz + pl.d / 2 + HW : pl.cz - pl.d / 2 - HW; p.vz = 0 }

  const prevBottom = p.y
  p.y += p.vy * dt
  let landed = null
  if (p.vy <= 0) {
    for (const pl of solids) {
      if (!overlapsXZ(p, pl)) continue
      if (prevBottom >= pl.cy - 0.25 && p.y <= pl.cy + 0.001 && (landed === null || pl.cy > landed.cy)) landed = pl
    }
  } else {
    for (const pl of solids) {
      if (!overlapsXZ(p, pl)) continue
      const under = pl.cy - pl.h
      if (p.y + H > under && prevBottom + H <= under + 0.15) { p.y = under - H; p.vy = 0 }
    }
  }
  g.wasGrounded = g.grounded
  if (landed) {
    const impact = p.vy
    p.y = landed.cy; p.vy = 0; g.grounded = true; g.ground = landed.id; g.lastGround = landed.id; g.groundType = landed.type || null; g.jumps = 0
    if (!g.wasGrounded && impact < -7) { g.landT = 0.22; events.push({ type: 'land', x: p.x, y: p.y, z: p.z, hard: impact < -16 }) }
    if (landed.type === 'bounce') { p.vy = BOUNCE_V; g.grounded = false; g.ground = null; g.jumps = 1; g.jumpT = 0.4; g.cutOk = false; events.push({ type: 'bounce', x: p.x, y: p.y, z: p.z }) }
  } else { g.grounded = false; g.ground = null }

  // ---- hazards ----
  const cy = p.y + PLAYER.centerY
  if (g.invuln <= 0) {
    for (const s of g.level.spinners) {
      const a = s.speed * g.t + (s.phase || 0)
      for (let arm = 0; arm < (s.arms || 2) && g.respawnT <= 0 && !g.over; arm += 1) {
        const ang = a + (arm * Math.PI * 2) / (s.arms || 2)
        for (let d = 0.9; d <= s.r + 0.01; d += 0.9) {
          const sx = s.x + Math.cos(ang) * d; const sz = s.z + Math.sin(ang) * d
          if ((p.x - sx) ** 2 + (p.z - sz) ** 2 + (cy - s.y) ** 2 < 0.8 ** 2) { damage(g, 'spinner', events); break }
        }
      }
    }
    for (const l of g.lasers) if (l.active && g.respawnT <= 0 && !g.over) {
      if (Math.abs(p.x - l.cx) < l.hw + HW && Math.abs(p.z - l.cz) < 0.15 + HW && p.y < l.y + l.hh * 2 && p.y + H > l.y) damage(g, 'laser', events)
    }
    for (const s of g.level.spikes) if (g.respawnT <= 0 && !g.over && Math.abs(p.x - s.x) < s.hw + HW * 0.6 && Math.abs(p.z - s.z) < s.hd + HW * 0.6 && p.y < s.y + s.hh * 2 && p.y + H > s.y) damage(g, 'spikes', events)
  }
  if (g.respawnT <= 0 && !g.over && p.y < g.level.killY) damage(g, 'fall', events)
  if (g.respawnT > 0 || g.over) return

  // ---- collectibles (each can be taken once) ----
  const take = (list, kind, r) => {
    for (const it of list) {
      if (g.taken.has(it.id)) continue
      if ((p.x - it.x) ** 2 + (cy - it.y) ** 2 + (p.z - it.z) ** 2 <= r * r) { g.taken.add(it.id); g[kind === 'coin' ? 'coins' : kind === 'crystal' ? 'crystals' : 'stars'] += 1; events.push({ type: kind, id: it.id, x: it.x, y: it.y, z: it.z }) }
    }
  }
  take(g.level.coins, 'coin', PICKUP_RADIUS); take(g.level.crystals, 'crystal', PICKUP_RADIUS); take(g.level.stars, 'star', STAR_RADIUS)

  // ---- checkpoints: only a later one replaces the current one ----
  g.level.checkpoints.forEach((c, i) => {
    if (i > g.cp && Math.hypot(p.x - c.pos[0], p.z - c.pos[2]) < 1.8 && Math.abs(p.y - c.pos[1]) < 2.2) { g.cp = i; events.push({ type: 'checkpoint', index: i, x: c.pos[0], y: c.pos[1], z: c.pos[2] }) }
  })

  // ---- the finish portal ----
  const f = g.level.finish
  if (Math.hypot(p.x - f[0], p.z - f[2]) < 1.7 && Math.abs(p.y - f[1]) < 2.4) { g.done = true; g.reason = 'complete'; g.danceT = 0.001; events.push({ type: 'complete', x: f[0], y: f[1], z: f[2] }) }
}

/** Advance by `dt` seconds of real time (fixed sub-steps). `input` is { x, z, jumpPressed, jumpHeld }; jumpPressed is consumed. */
export function advance(g, dt, input = {}) {
  const events = []
  if (g.over) return events
  g.acc += Math.min(Math.max(dt, 0), MAX_FRAME)
  while (g.acc >= STEP - 1e-9 && !g.over) {
    g.acc -= STEP
    if (g.done) { g.danceT += STEP; continue }
    substep(g, input, events)
  }
  return events
}

/** The score breakdown and star rating of a finished (or abandoned) level. Each reward is counted once, because collectibles are stored in a Set. */
export function summary(g) {
  const lv = g.level
  const finished = g.done && g.reason === 'complete'
  const coinsTotal = lv.coins.length; const crystalsTotal = lv.crystals.length; const starsTotal = lv.stars.length
  const timeBonus = finished ? Math.max(0, Math.floor(lv.par - g.t)) * SCORING.timePerSecond : 0
  const parts = {
    coins: g.coins * SCORING.coin, crystals: g.crystals * SCORING.crystal, stars: g.stars * SCORING.star,
    lives: finished ? g.lives * SCORING.life : 0, completion: finished ? SCORING.complete : 0, time: timeBonus,
  }
  const score = Object.values(parts).reduce((a, b) => a + b, 0)
  let rating = 0
  if (finished) {
    rating = 1
    if (g.coins >= Math.ceil(coinsTotal * COIN_SHARE_FOR_TWO_STARS)) rating = 2
    if (rating === 2 && g.crystals >= crystalsTotal && g.stars >= starsTotal) rating = 3
  }
  return { levelId: lv.id, finished, score, parts, rating, time: g.t, par: lv.par, coins: g.coins, coinsTotal, crystals: g.crystals, crystalsTotal, stars: g.stars, starsTotal, lives: g.lives, falls: g.falls, hits: g.hits, reason: g.reason }
}
