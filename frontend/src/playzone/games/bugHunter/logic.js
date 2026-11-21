import {
  ACCEL, AIR_ACCEL, BUG_ATTACK_COOLDOWN, BUG_TYPES, ENERGY_REGEN, ENERGY_REGEN_DELAY, FREEZE_RADIUS, FREEZE_SLOW, GRAVITY, INVULNERABLE, JUMP_V, LIVES, MAX_ENERGY, MAX_FRAME, MAX_HEALTH, NET_COOLDOWN_HIT,
  NET_COOLDOWN_MISS, NET_COST, NET_MISS_COST, NET_RANGE, NET_RANGE_MAGNET, NET_TRAVEL, PLAYER, POWERUPS, RESPAWN_DELAY, RESPAWN_INVULNERABLE, SCORE, SPEED_BOOST, SPRINT_SPEED, STEP, STUN_AFTER_SHIELD,
  TARGET_CONE, TARGET_RANGE, WALK_SPEED,
} from './config.js'
import { makePuzzle, puzzleAction, puzzleTick } from './puzzles.js'

// Bug Hunter: the simulation. Pure code (no React, no Three.js, no DOM) running on a fixed 1/60 s step, so it behaves the same at any frame rate and is tested without a browser.
// Contents: LAXBOT's movement and collisions, the energy net (target, range, travel, cooldown, energy), the bugs' state machines, hazards, power-ups, checkpoints, repair stations (the puzzle
// itself lives in puzzles.js), the bosses and the scoring. Events returned by advance(): netFire, netHit, netMiss, netFail, shieldBreak, capture, dodge, damage, shieldAbsorb, pickup, orb,
// checkpoint, openPuzzle, repair, repairFailed, boss*, wave, die, respawn, complete, over.

const R = PLAYER.radius
const H = PLAYER.height
const EPS = 0.08
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz)
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d }
const lerpAngle = (a, b, k) => a + angDiff(b, a) * k

function rngOf(g) { g.seed = (g.seed + 0x6d2b79f5) | 0; let t = Math.imul(g.seed ^ (g.seed >>> 15), 1 | g.seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }

// ------------------------------------------------------------------ creating a game
let nextId = 1
function makeBug(def, wave = 0) {
  const t = BUG_TYPES[def.type]
  return {
    id: `b${nextId++}`, key: `${def.type}:${def.x}:${def.z}`, type: def.type, x: def.x, z: def.z, y: def.y || 0, hx: def.x, hz: def.z, state: 'idle', stateT: 0, heading: 0, speed: 0, wave, hidden: !!def.hidden, revealed: !def.hidden,
    shield: t.shield || 0, stunT: 0, frozenT: 0, attackCd: 0, blinkCd: 1, juke: 0, patrol: def.patrol || null, patrolIdx: 0, goalX: def.x, goalZ: def.z, goalT: 0, captured: false, rewarded: false, anim: 0,
  }
}

export function createGame(level, options = {}) {
  nextId = 1
  const g = {
    level, t: 0, acc: 0, seed: (options.seed ?? 1) | 0,
    p: { x: level.start[0], y: level.start[1], z: level.start[2], vx: 0, vy: 0, vz: 0 }, yaw: Math.PI, grounded: true, ground: null,
    health: MAX_HEALTH, lives: options.lives ?? LIVES, energy: MAX_ENERGY, regenT: 0, netCd: 0, net: null, invuln: 0, hurtT: 0, captureT: 0, repairT: 0, danceT: 0, landT: 0, jumpT: 0, sprinting: false,
    cp: -1, respawnT: 0, over: false, done: false, reason: null,
    bugs: [], boss: null, stations: level.stations.map((s) => ({ ...s, solved: false, fails: 0, attempts: 0 })), pickups: level.pickups.map((p, i) => ({ ...p, id: `p${i}`, taken: false })),
    orbs: (level.orbs || []).map((o, i) => ({ ...o, id: `o${i}`, taken: false })), projectiles: [], beams: [],
    effects: { magnet: 0, freeze: 0, speed: 0, shield: 0 }, stats: { captured: 0, byType: { normal: 0, speed: 0, rare: 0, shield: 0 }, repairs: 0, orbs: 0, damage: 0, deaths: 0, bossDefeated: false, netThrown: 0, netHits: 0 },
    score: { bugs: 0, repairs: 0, boss: 0, orbs: 0 }, capturedKeys: [], waveIndex: 0, puzzle: null, target: null, exitOpen: false, speedMul: 1, bossAnnounced: false, totalBugs: 0,
  }
  for (const d of level.bugs || []) g.bugs.push(makeBug(d, -1))
  g.totalBugs = (level.bugs || []).length + (level.waves || []).reduce((n, w) => n + w.length, 0)
  if (level.waves && level.waves.length) for (const d of level.waves[0]) g.bugs.push(makeBug(d, 0))
  if (level.boss) g.boss = makeBoss(level.boss)
  return g
}

// ------------------------------------------------------------------ the world: boxes, lifts, ground
export function liftTop(l, t) { return l.base + l.amp * Math.sin(l.speed * t + (l.phase || 0)) }
function boxes(g) {
  const out = g.level.solids.slice()
  for (const l of g.level.lifts || []) { const y1 = liftTop(l, g.t); out.push({ x: l.x, z: l.z, w: l.w, d: l.d, y0: y1 - 0.8, y1, lift: l }) }
  return out
}
function groundAt(g, x, z, fromY, list = boxes(g)) {
  let best = 0
  for (const b of list) if (Math.abs(x - b.x) <= b.w / 2 + 0.2 && Math.abs(z - b.z) <= b.d / 2 + 0.2 && b.y1 <= fromY + 0.45 && b.y1 > best) best = b.y1
  return best
}
const barrierOn = (b, t) => { if (!b.cycle) return true; const tot = b.cycle.on + b.cycle.off; const u = (((t + (b.cycle.offset || 0)) % tot) + tot) % tot; return u < b.cycle.on }
const barrierWarn = (b, t) => { if (!b.cycle) return false; const tot = b.cycle.on + b.cycle.off; const u = (((t + (b.cycle.offset || 0)) % tot) + tot) % tot; return u >= tot - 0.6 }
export const barrierState = (b, t) => ({ on: barrierOn(b, t), warn: barrierWarn(b, t) })
export function laserPos(l, t) { const s = l.move ? l.move.amp * Math.sin(l.move.speed * t + (l.move.phase || 0)) : 0; return { x: l.x + (l.move?.axis === 'x' ? s : 0), z: l.z + (l.move?.axis === 'z' ? s : 0) } }

// ------------------------------------------------------------------ damage, death, respawn
function hurtPlayer(g, amount, fromX, fromZ, events, kind) {
  if (g.respawnT > 0 || g.done || g.over || g.invuln > 0) return false
  if (g.effects.shield > 0) { g.effects.shield = 0; g.invuln = 0.8; events.push({ type: 'shieldAbsorb', x: g.p.x, z: g.p.z }); return false }
  g.health -= amount; g.stats.damage += amount; g.invuln = INVULNERABLE; g.hurtT = 0.7
  const dx = g.p.x - fromX; const dz = g.p.z - fromZ; const d = Math.hypot(dx, dz) || 1
  g.p.vx = (dx / d) * 9; g.p.vz = (dz / d) * 9; if (g.grounded) { g.p.vy = 5; g.grounded = false }
  events.push({ type: 'damage', kind, x: g.p.x, y: g.p.y, z: g.p.z, health: g.health })
  if (g.health <= 0) {
    g.stats.deaths += 1; g.lives -= 1; events.push({ type: 'die', lives: g.lives })
    if (g.lives <= 0) { g.over = true; g.reason = 'lives'; events.push({ type: 'over', reason: 'lives' }) } else g.respawnT = RESPAWN_DELAY
  }
  return true
}
function respawn(g, events) {
  const cp = g.cp >= 0 ? g.level.checkpoints[g.cp] : g.level.start
  Object.assign(g.p, { x: cp[0], y: cp[1], z: cp[2], vx: 0, vy: 0, vz: 0 })
  g.health = MAX_HEALTH; g.invuln = RESPAWN_INVULNERABLE; g.net = null; g.energy = Math.max(g.energy, 60); g.grounded = true
  events.push({ type: 'respawn', checkpoint: g.cp })
}

// ------------------------------------------------------------------ targeting and the net
function targetFor(g, yaw) {
  const fx = -Math.sin(yaw); const fz = -Math.cos(yaw)
  const range = g.effects.magnet > 0 ? NET_RANGE_MAGNET : NET_RANGE
  let best = null; let bestScore = Infinity
  const consider = (obj, id, x, z, rad, cap, y = 0) => {
    const dx = x - g.p.x; const dz = z - g.p.z; const d = Math.hypot(dx, dz)
    if (d > TARGET_RANGE || Math.abs(y - g.p.y) > 2.3) return // a bug on another floor cannot be netted
    const ang = Math.abs(angDiff(Math.atan2(-dx, -dz), yaw))
    const score = ang < TARGET_CONE ? ang * 4 + d * 0.25 : d < 5 ? 3 + d : Infinity // inside the cone by angle; right next to LAXBOT counts from any side
    if (score < bestScore) { bestScore = score; best = { id, x, z, d, range: cap ?? range, kind: obj } }
  }
  for (const b of g.bugs) if (!b.captured && b.revealed && b.state !== 'defeated') consider('bug', b.id, b.x, b.z, b.radius, (BUG_TYPES[b.type].captureRange || range) + (g.effects.magnet > 0 ? 3 : 0), b.y)
  if (g.boss && g.boss.active && g.boss.state !== 'defeated') consider('boss', 'boss', g.boss.x, g.boss.z, 1.6, range + 1.6)
  void fx; void fz
  return best ? { ...best, inRange: best.d <= best.range } : null
}

function fireNet(g, events) {
  if (g.netCd > 0 || g.net) { events.push({ type: 'netFail', reason: 'cooldown' }); return }
  if (g.energy < NET_COST) { events.push({ type: 'netFail', reason: 'energy' }); return }
  const tg = g.target
  g.stats.netThrown += 1
  g.regenT = ENERGY_REGEN_DELAY
  if (!tg) { g.energy -= NET_MISS_COST; g.netCd = NET_COOLDOWN_MISS; events.push({ type: 'netMiss', x: g.p.x, z: g.p.z, yaw: g.yaw }); return }
  if (!tg.inRange) { g.energy -= NET_MISS_COST; g.netCd = NET_COOLDOWN_MISS; events.push({ type: 'netFail', reason: 'far' }); return }
  g.energy -= NET_COST
  g.net = { t: 0, id: tg.id, sx: g.p.x, sz: g.p.z, tx: tg.x, tz: tg.z }
  g.yaw = Math.atan2(-(tg.x - g.p.x), -(tg.z - g.p.z)); g.captureT = 0.45
  events.push({ type: 'netFire', id: tg.id })
}

function resolveNet(g, events) {
  const n = g.net; g.net = null
  if (n.id === 'boss') {
    const b = g.boss
    if (b && b.active && b.state === 'exposed' && dist2(g.p.x, g.p.z, b.x, b.z) <= (g.effects.magnet > 0 ? NET_RANGE_MAGNET : NET_RANGE) + 1.9) { hitBoss(g, events); g.netCd = NET_COOLDOWN_HIT; g.stats.netHits += 1 } else { events.push({ type: 'netMiss', deflected: true, x: b ? b.x : 0, z: b ? b.z : 0 }); g.netCd = NET_COOLDOWN_MISS }
    return
  }
  const bug = g.bugs.find((x) => x.id === n.id)
  if (!bug || bug.captured) { g.netCd = NET_COOLDOWN_MISS; events.push({ type: 'netMiss' }); return }
  const t = BUG_TYPES[bug.type]
  const range = (t.captureRange || (g.effects.magnet > 0 ? NET_RANGE_MAGNET : NET_RANGE)) + (g.effects.magnet > 0 ? 3 : 0)
  if (dist2(g.p.x, g.p.z, bug.x, bug.z) > range + 1) { g.netCd = NET_COOLDOWN_MISS; events.push({ type: 'netMiss', x: bug.x, z: bug.z }); return }
  if (bug.frozenT <= 0 && bug.stunT <= 0 && t.dodge && rngOf(g) < t.dodge) { // a quick bug can slip the net
    bug.state = 'escape'; bug.stateT = 0; if (bug.type === 'rare') bug.blinkCd = 0
    g.netCd = NET_COOLDOWN_MISS; events.push({ type: 'dodge', id: bug.id, x: bug.x, z: bug.z }); return
  }
  if (bug.shield > 0) { // the shield has to come off first
    bug.shield -= 1; bug.stunT = STUN_AFTER_SHIELD; bug.state = 'stunned'; bug.stateT = 0; g.netCd = NET_COOLDOWN_HIT
    events.push({ type: 'shieldBreak', id: bug.id, x: bug.x, z: bug.z }); return
  }
  bug.captured = true; bug.state = 'captured'; bug.stateT = 0
  if (!bug.rewarded) { // each bug pays out exactly once
    bug.rewarded = true; g.capturedKeys.push(bug.key); g.stats.captured += 1; g.stats.byType[bug.type] += 1; g.score.bugs += SCORE[bug.type]
    events.push({ type: 'capture', id: bug.id, bug: bug.type, points: SCORE[bug.type], x: bug.x, y: bug.y, z: bug.z })
  }
  g.netCd = NET_COOLDOWN_HIT; g.stats.netHits += 1
  if (g.energy < MAX_ENERGY) g.energy = Math.min(MAX_ENERGY, g.energy + 4) // a catch gives a little back
}

// ------------------------------------------------------------------ bugs: a small state machine each
function moveBug(g, bug, vx, vz, dt, list) {
  const ox = bug.x; const oz = bug.z
  bug.x += vx * dt; bug.z += vz * dt
  // a bug standing on a raised platform stays on it (the edge is a wall for bugs)
  if (bug.y > 0.5 && groundAt(g, bug.x, bug.z, bug.y + 0.6, list) < bug.y - 0.6) {
    if (groundAt(g, bug.x, oz, bug.y + 0.6, list) >= bug.y - 0.6) bug.z = oz
    else if (groundAt(g, ox, bug.z, bug.y + 0.6, list) >= bug.y - 0.6) bug.x = ox
    else { bug.x = ox; bug.z = oz }
  }
  const lim = g.level.size - 1
  bug.x = clamp(bug.x, -lim, lim); bug.z = clamp(bug.z, -lim, lim)
  for (const b of list) {
    if (b.y1 < bug.y + 0.4 || b.y0 > bug.y + 1.2) continue
    const nx = clamp(bug.x, b.x - b.w / 2, b.x + b.w / 2); const nz = clamp(bug.z, b.z - b.d / 2, b.z + b.d / 2)
    const dx = bug.x - nx; const dz = bug.z - nz; const d = Math.hypot(dx, dz); const rad = 0.5
    if (d < rad) { if (d > 0.0001) { bug.x = nx + (dx / d) * rad; bug.z = nz + (dz / d) * rad } else bug.x += rad }
  }
}

function updateBug(g, bug, dt, list) {
  const t = BUG_TYPES[bug.type]
  bug.anim += dt; bug.stateT += dt
  if (bug.captured) { if (bug.stateT > 0.6) bug.state = 'defeated'; return }
  const d = dist2(g.p.x, g.p.z, bug.x, bug.z)
  if (bug.hidden && !bug.revealed && d < 8) bug.revealed = true
  bug.y = groundAt(g, bug.x, bug.z, bug.y + 0.6, list)
  bug.attackCd = Math.max(0, bug.attackCd - dt); bug.blinkCd = Math.max(0, bug.blinkCd - dt); bug.juke = Math.max(0, bug.juke - dt)
  if (bug.stunT > 0) { bug.stunT -= dt; if (bug.stunT <= 0) { bug.state = 'idle'; bug.stateT = 0 } return }
  if (bug.frozenT > 0) { bug.frozenT -= dt; bug.state = 'frozen'; if (bug.frozenT <= 0) { bug.state = 'idle'; bug.stateT = 0 } return }
  if (bug.hidden && !bug.revealed) return
  const slow = g.effects.freeze > 0 ? FREEZE_SLOW : 1
  const away = Math.atan2(bug.x - g.p.x, bug.z - g.p.z)
  const toward = Math.atan2(g.p.x - bug.x, g.p.z - bug.z)
  let vx = 0; let vz = 0
  const run = (heading, speed) => { bug.heading = heading; vx = Math.sin(heading) * speed * slow; vz = Math.cos(heading) * speed * slow }

  if (t.attack) { // shield bug: patrol, notice the player, chase, bump
    if (d < t.detect && g.respawnT <= 0) {
      if (bug.state !== 'chase' && bug.state !== 'attack' && bug.state !== 'detect') { bug.state = 'detect'; bug.stateT = 0 } // a short "I see you" pause first
      if (bug.state === 'detect' && bug.stateT > 0.4) { bug.state = 'chase'; bug.stateT = 0 }
      if (bug.state === 'chase') run(toward, t.chaseSpeed)
      if (d < 1.15 && bug.attackCd <= 0) { bug.state = 'attack'; bug.stateT = 0; bug.attackCd = BUG_ATTACK_COOLDOWN; hurtPlayer(g, 1, bug.x, bug.z, g.events, 'bug') }
      if (bug.state === 'attack' && bug.stateT > 0.4) bug.state = 'chase'
    } else {
      if (bug.state === 'chase' || bug.state === 'detect' || bug.state === 'attack') { bug.state = bug.patrol ? 'patrol' : 'wander'; bug.stateT = 0 }
      if (bug.patrol) { const pt = bug.patrol[bug.patrolIdx % bug.patrol.length]; if (dist2(bug.x, bug.z, pt[0], pt[1]) < 0.6) bug.patrolIdx += 1; else { bug.state = 'patrol'; run(Math.atan2(pt[0] - bug.x, pt[1] - bug.z), t.speed) } }
      else wander(g, bug, t, run)
    }
  } else if (d < t.detect && g.respawnT <= 0) {
    if (bug.type === 'rare') { // blinks away instead of running
      if (bug.blinkCd <= 0 && d < 5.5) { blink(g, bug, list); bug.blinkCd = t.blink; bug.state = 'escape'; bug.stateT = 0 } else if (bug.state !== 'escape') { bug.state = 'detect' } else run(away, t.escapeSpeed)
    } else {
      bug.state = 'escape'
      let h = away
      if (bug.type === 'speed') { if (bug.juke <= 0) { bug.juke = 0.6 + rngOf(g) * 0.6; bug.jukeDir = rngOf(g) < 0.5 ? -1 : 1 } h += (bug.jukeDir || 1) * 0.9 }
      // do not run into a wall: steer along it
      const px = bug.x + Math.sin(h) * 1.2; const pz = bug.z + Math.cos(h) * 1.2
      if (Math.abs(px) > g.level.size - 1.5 || Math.abs(pz) > g.level.size - 1.5 || list.some((b) => b.y1 > bug.y + 0.5 && Math.abs(px - b.x) < b.w / 2 + 0.5 && Math.abs(pz - b.z) < b.d / 2 + 0.5)) h += (angDiff(away + Math.PI / 2, h) > 0 ? 1 : -1) * 1.4
      run(h, bug.state === 'escape' ? t.escapeSpeed : t.speed)
    }
  } else {
    if (bug.state === 'escape' || bug.state === 'detect') { bug.state = 'wander'; bug.stateT = 0 }
    if (bug.patrol) { const pt = bug.patrol[bug.patrolIdx % bug.patrol.length]; if (dist2(bug.x, bug.z, pt[0], pt[1]) < 0.6) bug.patrolIdx += 1; else { bug.state = 'patrol'; run(Math.atan2(pt[0] - bug.x, pt[1] - bug.z), t.speed) } }
    else wander(g, bug, t, run)
  }
  moveBug(g, bug, vx, vz, dt, list)
}
function wander(g, bug, t, run) {
  bug.goalT -= STEP
  if (bug.goalT <= 0 || dist2(bug.x, bug.z, bug.goalX, bug.goalZ) < 0.5) {
    const a = rngOf(g) * Math.PI * 2; const r = 1 + rngOf(g) * 4.5
    bug.goalX = bug.hx + Math.sin(a) * r; bug.goalZ = bug.hz + Math.cos(a) * r; bug.goalT = 2 + rngOf(g) * 2.5
    if (rngOf(g) < 0.3) { bug.state = 'idle'; bug.goalT = 0.8 + rngOf(g) }
  }
  if (bug.state === 'idle' && bug.goalT > 0) return
  bug.state = 'wander'; run(Math.atan2(bug.goalX - bug.x, bug.goalZ - bug.z), t.speed)
}
function blink(g, bug, list) {
  for (let i = 0; i < 12; i += 1) {
    const a = rngOf(g) * Math.PI * 2; const r = 5 + rngOf(g) * 2.5
    const nx = clamp(g.p.x + Math.sin(a) * r, -g.level.size + 1.5, g.level.size - 1.5); const nz = clamp(g.p.z + Math.cos(a) * r, -g.level.size + 1.5, g.level.size - 1.5)
    if (list.some((b) => b.y1 > 0.5 && Math.abs(nx - b.x) < b.w / 2 + 0.7 && Math.abs(nz - b.z) < b.d / 2 + 0.7)) continue
    const gy = groundAt(g, nx, nz, bug.y + 0.6, list); if (Math.abs(gy - bug.y) > 0.6) continue // a bug on a raised platform blinks only along its own platform
    g.events.push({ type: 'blink', x: bug.x, z: bug.z, nx, nz }); bug.x = nx; bug.z = nz; return
  }
}

// ------------------------------------------------------------------ bosses
function makeBoss(def) {
  const cfg = BOSSES[def.kind]
  return { kind: def.kind, x: def.x, z: def.z, hx: def.x, hz: def.z, hp: cfg.hp, maxHp: cfg.hp, phase: 1, state: 'sleep', stateT: 0, active: false, attack: null, dir: [0, 1], exposed: 0, hurtT: 0, orbAngle: 0, beamAngle: 0, cycle: 0, defeatT: 0, id: 'boss' }
}
export const BOSSES = {
  crab: { name: 'Glitch Crab', hp: 4, phaseAt: [2], patterns: [['charge'], ['charge', 'orbs']], tele: { charge: 1.3, orbs: 1.1, beam: 1.4 }, exposed: 3.2, color: '#fb7185' },
  core: { name: 'Core Corruptor', hp: 6, phaseAt: [4, 2], patterns: [['charge'], ['orbs', 'charge'], ['beam', 'orbs', 'charge']], tele: { charge: 1.3, orbs: 1.0, beam: 1.5 }, exposed: 3.0, color: '#c084fc' },
}

function hitBoss(g, events) {
  const b = g.boss; const cfg = BOSSES[b.kind]
  b.hp -= 1; b.state = 'hurt'; b.stateT = 0; b.hurtT = 1; b.exposed = 0
  events.push({ type: 'bossHit', hp: b.hp, x: b.x, z: b.z })
  if (b.hp <= 0) { b.state = 'defeated'; b.defeatT = 0; g.projectiles.length = 0; g.beams.length = 0; g.stats.bossDefeated = true; g.score.boss += SCORE.boss; events.push({ type: 'bossDefeated', points: SCORE.boss, x: b.x, z: b.z }); return }
  const newPhase = 1 + cfg.phaseAt.filter((h) => b.hp <= h).length
  if (newPhase > b.phase) { b.phase = newPhase; b.state = 'phase'; b.stateT = 0; g.projectiles.length = 0; events.push({ type: 'bossPhase', phase: b.phase }) }
}

function updateBoss(g, dt, events) {
  const b = g.boss; if (!b) return
  const cfg = BOSSES[b.kind]
  b.stateT += dt
  if (!b.active) return
  const d = dist2(g.p.x, g.p.z, b.x, b.z)
  const toP = Math.atan2(g.p.x - b.x, g.p.z - b.z)
  const lim = g.level.size - 2.5
  switch (b.state) {
    case 'intro': if (b.stateT > 1.6) { b.state = 'idle'; b.stateT = 0 } break
    case 'idle': {
      const a = b.stateT * 0.5
      b.x += (b.hx + Math.sin(a) * 4 - b.x) * Math.min(1, dt * 1.5); b.z += (b.hz + Math.cos(a) * 3 - b.z) * Math.min(1, dt * 1.5)
      if (b.stateT > (b.phase === 1 ? 1.1 : 0.8)) {
        const list = cfg.patterns[b.phase - 1]; b.attack = list[b.cycle % list.length]; b.cycle += 1
        b.state = 'telegraph'; b.stateT = 0; b.dir = [Math.sin(toP), Math.cos(toP)]; b.orbAngle = rngOf(g) * 6
        events.push({ type: 'bossTelegraph', attack: b.attack })
      }
      break
    }
    case 'telegraph': {
      if (b.attack === 'charge' && b.stateT < cfg.tele.charge - 0.45) b.dir = [Math.sin(toP), Math.cos(toP)] // aims, then the line is locked for the last stretch
      if (b.attack === 'beam') b.beamAngle = toP - 0.9
      if (b.stateT >= cfg.tele[b.attack]) { b.state = 'attack'; b.stateT = 0; if (b.attack === 'orbs') fireOrbs(g, b, events); if (b.attack === 'beam') b.beamAngle = toP - 0.9 }
      break
    }
    case 'attack': {
      if (b.attack === 'charge') {
        b.x += b.dir[0] * 13 * dt; b.z += b.dir[1] * 13 * dt
        b.x = clamp(b.x, -lim, lim); b.z = clamp(b.z, -lim, lim)
        if (d < 2.0) hurtPlayer(g, 1, b.x, b.z, events, 'boss')
        if (b.stateT > 0.75) { b.state = 'exposed'; b.stateT = 0; b.exposed = cfg.exposed; events.push({ type: 'bossExposed' }) }
      } else if (b.attack === 'orbs') {
        if (b.stateT > 0.5) { b.state = 'exposed'; b.stateT = 0; b.exposed = cfg.exposed; events.push({ type: 'bossExposed' }) }
      } else if (b.attack === 'beam') {
        b.beamAngle += 0.85 * dt
        const bx = Math.sin(b.beamAngle); const bz = Math.cos(b.beamAngle)
        const rx = g.p.x - b.x; const rz = g.p.z - b.z
        const along = rx * bx + rz * bz; const across = Math.abs(rx * bz - rz * bx)
        if (along > 0 && along < 17 && across < 0.7 && g.p.y < 0.85) hurtPlayer(g, 1, b.x, b.z, events, 'boss')
        if (b.stateT > 2.7) { b.state = 'exposed'; b.stateT = 0; b.exposed = cfg.exposed; events.push({ type: 'bossExposed' }) }
      }
      break
    }
    case 'exposed': b.exposed -= dt; if (b.exposed <= 0) { b.state = 'idle'; b.stateT = 0 } break
    case 'hurt': if (b.stateT > 1) { b.state = 'idle'; b.stateT = 0 } break
    case 'phase': if (b.stateT > 1.4) { b.state = 'idle'; b.stateT = 0 } break
    case 'defeated': b.defeatT += dt; break
    default: break
  }
  // orbs fired by the boss
  for (const o of g.projectiles) {
    o.life -= dt; o.x += o.vx * dt; o.z += o.vz * dt
    if (dist2(o.x, o.z, g.p.x, g.p.z) < 0.75 && g.p.y < 1.2) { hurtPlayer(g, 1, o.x, o.z, events, 'orb'); o.life = 0 }
    if (Math.abs(o.x) > g.level.size || Math.abs(o.z) > g.level.size) o.life = 0
  }
  g.projectiles = g.projectiles.filter((o) => o.life > 0)
}
function fireOrbs(g, b, events) {
  const n = b.phase >= 3 ? 10 : b.phase === 2 ? 8 : 6
  const speed = b.phase >= 3 ? 4.6 : 3.8
  for (let i = 0; i < n; i += 1) { const a = b.orbAngle + (i / n) * Math.PI * 2; g.projectiles.push({ x: b.x, z: b.z, vx: Math.sin(a) * speed, vz: Math.cos(a) * speed, life: 6 }) }
  events.push({ type: 'bossOrbs', x: b.x, z: b.z })
}

// ------------------------------------------------------------------ stations and objectives
const stationAvailable = (g, s) => !s.solved && (s.requires || []).every((id) => g.stations.find((x) => x.id === id)?.solved)
export function nearestStation(g) {
  let best = null; let bd = 2.6
  for (const s of g.stations) { if (s.solved) continue; const d = dist2(g.p.x, g.p.z, s.x, s.z); if (d < bd && Math.abs(g.p.y - (s.y || 0)) < 2.2) { bd = d; best = s } }
  return best
}
export function objectivesOf(g) {
  const lv = g.level
  const need = lv.objectives.captures === 'all' ? g.totalBugs : lv.objectives.captures
  const out = []
  if (need > 0) out.push({ id: 'captures', label: 'Capture bugs', have: Math.min(g.stats.captured, need), need })
  const rep = lv.objectives.repairs === 'all' ? g.stations.length : lv.objectives.repairs
  if (rep > 0) out.push({ id: 'repairs', label: 'Repair systems', have: Math.min(g.stats.repairs, rep), need: rep })
  if (lv.boss) out.push({ id: 'boss', label: BOSSES[lv.boss.kind].name, have: g.stats.bossDefeated ? 1 : 0, need: 1 })
  return out.map((o) => ({ ...o, done: o.have >= o.need }))
}
export const objectivesMet = (g) => objectivesOf(g).every((o) => o.done)

export function challengeDone(g) {
  const c = g.level.challenge
  if (!c) return false
  switch (c.kind) {
    case 'nodamage': return g.stats.damage === 0
    case 'nodeath': return g.stats.deaths === 0
    case 'allbugs': return g.stats.captured >= g.totalBugs
    case 'time': return g.t <= c.seconds
    case 'orbs': return g.stats.orbs >= g.orbs.length
    default: return false
  }
}

// ---- the repair puzzle on screen: opened with interact, solved or failed through these functions (the world is paused meanwhile) ----
export function openStation(g, id, events = []) {
  const s = g.stations.find((x) => x.id === id)
  if (!s || !stationAvailable(g, s) || g.puzzle) return false
  s.attempts += 1
  g.puzzle = { stationId: s.id, type: s.puzzle, p: makePuzzle(s.puzzle, s.attempts * 31 + (g.level.seedBase || 1) + s.id.length, s.diff || 1) }
  events.push({ type: 'openPuzzle', id: s.id, puzzle: s.puzzle })
  return true
}
export function closePuzzle(g) { g.puzzle = null }
function afterPuzzle(g, res, events) {
  const pz = g.puzzle; if (!pz) return res
  const s = g.stations.find((x) => x.id === pz.stationId)
  if (pz.p.status === 'solved' && !s.solved) { s.solved = true; g.stats.repairs += 1; g.score.repairs += SCORE.repair; g.repairT = 1.2; events.push({ type: 'repair', id: s.id, points: SCORE.repair }); g.puzzle = null }
  else if (pz.p.status === 'failed') { s.fails += 1; events.push({ type: 'repairFailed', id: s.id }); g.puzzle = null }
  return res
}
export function repairAction(g, action) { const events = []; if (!g.puzzle) return { res: null, events }; const res = puzzleAction(g.puzzle.p, action); afterPuzzle(g, res, events); return { res, events } }
export function repairTick(g, dt) { const events = []; if (!g.puzzle) return { res: null, events }; const res = puzzleTick(g.puzzle.p, dt); afterPuzzle(g, res, events); return { res, events } }

// ------------------------------------------------------------------ one fixed step
function substep(g, input, events) {
  const dt = STEP
  g.events = events
  g.t += dt
  const p = g.p
  g.invuln = Math.max(0, g.invuln - dt); g.hurtT = Math.max(0, g.hurtT - dt); g.netCd = Math.max(0, g.netCd - dt); g.captureT = Math.max(0, g.captureT - dt); g.repairT = Math.max(0, g.repairT - dt)
  g.landT = Math.max(0, g.landT - dt); g.jumpT = Math.max(0, g.jumpT - dt)
  for (const k of Object.keys(g.effects)) if (g.effects[k] > 0) g.effects[k] = Math.max(0, g.effects[k] - dt)
  g.regenT = Math.max(0, g.regenT - dt)
  if (g.regenT <= 0 && g.energy < MAX_ENERGY) g.energy = Math.min(MAX_ENERGY, g.energy + ENERGY_REGEN * dt)
  const list = boxes(g)
  const prevLifts = g.ground

  if (g.respawnT > 0) { g.respawnT -= dt; if (g.respawnT <= 0) respawn(g, events) }

  // bugs and boss keep moving (not while LAXBOT is down)
  for (const b of g.bugs) updateBug(g, b, dt, list)
  g.bugs = g.bugs.filter((b) => b.state !== 'defeated')
  if (g.boss) { if (g.respawnT <= 0) updateBoss(g, dt, events); else if (g.boss.state === 'defeated') g.boss.defeatT += dt }
  if (g.respawnT > 0) return

  // waves: the next group arrives when the current one is cleared
  const waves = g.level.waves
  if (waves && g.waveIndex < waves.length && g.bugs.filter((b) => b.wave === g.waveIndex && !b.captured).length === 0) {
    g.waveIndex += 1
    if (g.waveIndex < waves.length) { for (const d of waves[g.waveIndex]) g.bugs.push(makeBug(d, g.waveIndex)); events.push({ type: 'wave', index: g.waveIndex + 1, of: waves.length }) }
  }
  // the boss wakes when every bug is caught, every repair is done and LAXBOT walks into its arena
  if (g.boss && !g.boss.active && g.stats.captured >= g.totalBugs && g.stations.every((s) => s.solved) && (!waves || g.waveIndex >= waves.length) && dist2(p.x, p.z, g.boss.hx, g.boss.hz) < 17) {
    g.boss.active = true; g.boss.state = 'intro'; g.boss.stateT = 0; events.push({ type: 'bossStart', kind: g.boss.kind })
  }

  // ---- LAXBOT ----
  g.target = targetFor(g, input.yaw ?? g.yaw)
  let mx = clamp(input.mx || 0, -1, 1); let mz = clamp(input.mz || 0, -1, 1)
  const mag = Math.hypot(mx, mz); if (mag > 1) { mx /= mag; mz /= mag }
  const yaw = input.yaw ?? 0
  const fx = -Math.sin(yaw); const fz = -Math.cos(yaw); const rx = Math.cos(yaw); const rz = -Math.sin(yaw)
  const wx = rx * mx + fx * -mz; const wz = rz * mx + fz * -mz
  const speedMul = (g.effects.speed > 0 ? SPEED_BOOST : 1)
  const top = (input.sprint ? SPRINT_SPEED : WALK_SPEED) * speedMul
  g.sprinting = !!input.sprint && mag > 0.1
  const accel = (g.grounded ? ACCEL : AIR_ACCEL) * dt
  const tvx = wx * top; const tvz = wz * top
  const approach = (v, t) => (v < t ? Math.min(t, v + accel) : Math.max(t, v - accel))
  if (g.hurtT < 0.35) { p.vx = approach(p.vx, tvx); p.vz = approach(p.vz, tvz) }
  g.speed = Math.hypot(p.vx, p.vz)
  if (mag > 0.1 && g.captureT <= 0) g.yaw = lerpAngle(g.yaw, Math.atan2(-wx, -wz), 0.25)
  if (input.jumpPressed && g.grounded) { p.vy = JUMP_V; g.grounded = false; g.ground = null; g.jumpT = 0.4; events.push({ type: 'jump', x: p.x, z: p.z }) }
  input.jumpPressed = false
  p.vy -= GRAVITY * dt; p.vy = Math.max(-30, p.vy)

  // currents push LAXBOT
  for (const c of g.level.currents || []) if (p.x > c.x0 && p.x < c.x1 && p.z > c.z0 && p.z < c.z1) { p.vx += c.fx * dt; p.vz += c.fz * dt }

  // collisions: x, z, then y (like LAXBOT Jump)
  const overlapY = (b) => p.y < b.y1 - EPS && p.y + H > b.y0
  const overlapXZ = (b) => Math.abs(p.x - b.x) < b.w / 2 + R - 1e-4 && Math.abs(p.z - b.z) < b.d / 2 + R - 1e-4
  if (g.ground && g.ground !== 'floor') { const lb = list.find((b) => b.lift && b.lift === g.ground); if (lb) p.y = lb.y1 }
  p.x += p.vx * dt
  for (const b of list) if (overlapY(b) && overlapXZ(b)) { p.x = p.x >= b.x ? b.x + b.w / 2 + R : b.x - b.w / 2 - R; p.vx = 0 }
  p.z += p.vz * dt
  for (const b of list) if (overlapY(b) && overlapXZ(b)) { p.z = p.z >= b.z ? b.z + b.d / 2 + R : b.z - b.d / 2 - R; p.vz = 0 }
  const lim = g.level.size - R
  p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim)
  const prevBottom = p.y
  p.y += p.vy * dt
  let landedOn = null; let landY = 0
  if (p.vy <= 0) {
    for (const b of list) if (overlapXZ(b) && prevBottom >= b.y1 - 0.3 && p.y <= b.y1 + 0.001 && b.y1 >= landY) { landedOn = b; landY = b.y1 }
    if (p.y <= 0 && landY <= 0) { landY = 0; landedOn = { floor: true } }
  } else {
    for (const b of list) if (overlapXZ(b) && p.y + H > b.y0 && prevBottom + H <= b.y0 + 0.15) { p.y = b.y0 - H; p.vy = 0 }
  }
  const was = g.grounded
  if (landedOn) { const impact = p.vy; p.y = landY; p.vy = 0; g.grounded = true; g.ground = landedOn.lift || 'floor'; if (!was && impact < -9) { g.landT = 0.2; events.push({ type: 'land', x: p.x, z: p.z }) } } else { g.grounded = false; g.ground = null }
  void prevLifts

  // ---- the net ----
  if (g.net) { g.net.t += dt; if (g.net.t >= NET_TRAVEL) resolveNet(g, events) }
  if (input.capturePressed) fireNet(g, events)
  input.capturePressed = false

  // ---- hazards ----
  const cy0 = p.y; const cy1 = p.y + H
  for (const b of g.level.barriers || []) if (barrierOn(b, g.t) && Math.abs(p.x - b.x) < b.w / 2 + R && Math.abs(p.z - b.z) < b.d / 2 + R && cy0 < (b.y || 0) + (b.h || 2.4)) hurtPlayer(g, 1, b.x, b.z, events, 'barrier')
  for (const l of g.level.lasers || []) { const q = laserPos(l, g.t); if (Math.abs(p.x - q.x) < l.w / 2 + R && Math.abs(p.z - q.z) < l.d / 2 + R && cy0 < l.y + l.h && cy1 > l.y) hurtPlayer(g, 1, q.x, q.z, events, 'laser') }

  // ---- pickups, orbs, checkpoints, stations ----
  for (const pk of g.pickups) {
    if (pk.taken || dist2(p.x, p.z, pk.x, pk.z) > 1.3 || Math.abs(p.y - (pk.y || 0)) > 2) continue
    pk.taken = true
    if (pk.kind === 'recharge') g.energy = MAX_ENERGY
    else if (pk.kind === 'freeze') { for (const b of g.bugs) if (!b.captured && dist2(b.x, b.z, p.x, p.z) < FREEZE_RADIUS) b.frozenT = POWERUPS.freeze.duration; g.effects.freeze = POWERUPS.freeze.duration }
    else g.effects[pk.kind] = POWERUPS[pk.kind].duration
    events.push({ type: 'pickup', kind: pk.kind, x: pk.x, z: pk.z })
  }
  for (const o of g.orbs) if (!o.taken && dist2(p.x, p.z, o.x, o.z) < 1.1 && Math.abs(p.y - (o.y || 0)) < 2) { o.taken = true; g.stats.orbs += 1; g.score.orbs += SCORE.orb; g.energy = Math.min(MAX_ENERGY, g.energy + 8); events.push({ type: 'orb', x: o.x, z: o.z }) }
  g.level.checkpoints.forEach((c, i) => { if (i > g.cp && dist2(p.x, p.z, c[0], c[2]) < 2.4 && Math.abs(p.y - c[1]) < 2.4) { g.cp = i; events.push({ type: 'checkpoint', index: i, x: c[0], z: c[2] }) } })
  if (input.interactPressed) { const s = nearestStation(g); if (s && stationAvailable(g, s)) openStation(g, s.id, events); else if (s) events.push({ type: 'stationLocked', id: s.id }) }
  input.interactPressed = false

  // ---- the exit ----
  g.exitOpen = objectivesMet(g)
  const ex = g.level.exit
  if (g.exitOpen && !g.done && dist2(p.x, p.z, ex[0], ex[2]) < 2 && Math.abs(p.y - ex[1]) < 2.4) { g.done = true; g.reason = 'complete'; g.danceT = 0.001; events.push({ type: 'complete' }) }
}

/** Advance by `dt` seconds of real time. The world stands still while a repair puzzle is open (the caller steps the puzzle). */
export function advance(g, dt, input = {}) {
  const events = []
  if (g.over) return events
  g.acc += Math.min(Math.max(dt, 0), MAX_FRAME)
  while (g.acc >= STEP - 1e-9 && !g.over && !g.puzzle) {
    g.acc -= STEP
    if (g.done) { g.danceT += STEP; continue }
    substep(g, input, events)
  }
  return events
}

// ------------------------------------------------------------------ results
export function summary(g) {
  const finished = g.done && g.reason === 'complete'
  const lv = g.level
  const parts = {
    bugs: g.score.bugs, repairs: g.score.repairs, boss: g.score.boss, orbs: g.score.orbs,
    challenge: finished && challengeDone(g) ? SCORE.challenge : 0,
    health: finished ? Math.max(0, g.health) * SCORE.healthLeft : 0,
    time: finished ? Math.max(0, Math.floor(lv.par - g.t)) * SCORE.timePerSecond : 0,
  }
  const score = Object.values(parts).reduce((a, b) => a + b, 0)
  let stars = 0
  if (finished) { stars = 1; if (parts.challenge) stars = 2; if (stars === 2 && g.stats.captured >= g.totalBugs) stars = 3 }
  return { levelId: lv.id, finished, score, parts, stars, time: g.t, par: lv.par, captured: g.stats.captured, totalBugs: g.totalBugs, byType: g.stats.byType, repairs: g.stats.repairs, orbs: g.stats.orbs, orbsTotal: g.orbs.length, health: g.health, lives: g.lives, deaths: g.stats.deaths, damage: g.stats.damage, challenge: lv.challenge ? lv.challenge.text : null, challengeMet: challengeDone(g), boss: !!g.stats.bossDefeated }
}

/** What a checkpoint remembers (saved in the browser): the checkpoint, captured bugs, solved stations, collected items and the score so far. */
export function checkpointSnapshot(g) {
  return {
    cp: g.cp, t: g.t, waveIndex: g.waveIndex, capturedKeys: g.capturedKeys.slice(), solved: g.stations.filter((s) => s.solved).map((s) => s.id),
    pickups: g.pickups.filter((x) => x.taken).map((x) => x.id), orbs: g.orbs.filter((x) => x.taken).map((x) => x.id),
    stats: { ...g.stats, byType: { ...g.stats.byType } }, score: { ...g.score }, lives: g.lives,
  }
}
/** Put a fresh game back to a saved checkpoint: bugs and repairs already done stay done, LAXBOT starts at the checkpoint. */
export function restoreFromSnapshot(g, snap) {
  if (!snap || snap.cp < 0 || snap.cp >= g.level.checkpoints.length) return false
  g.cp = snap.cp; g.t = snap.t || 0; g.lives = snap.lives ?? g.lives
  const waves = g.level.waves
  if (waves) for (let i = 1; i <= Math.min(snap.waveIndex, waves.length - 1); i += 1) for (const d of waves[i]) g.bugs.push(makeBug(d, i))
  g.waveIndex = Math.min(snap.waveIndex || 0, waves ? waves.length : 0)
  g.capturedKeys = snap.capturedKeys.slice()
  g.bugs = g.bugs.filter((b) => !g.capturedKeys.includes(b.key))
  for (const s of g.stations) if (snap.solved.includes(s.id)) s.solved = true
  for (const x of g.pickups) if (snap.pickups.includes(x.id)) x.taken = true
  for (const x of g.orbs) if (snap.orbs.includes(x.id)) x.taken = true
  g.stats = { ...g.stats, ...snap.stats, byType: { ...snap.stats.byType } }; g.score = { ...snap.score }
  const c = g.level.checkpoints[g.cp]
  Object.assign(g.p, { x: c[0], y: c[1], z: c[2], vx: 0, vy: 0, vz: 0 }); g.invuln = RESPAWN_INVULNERABLE
  return true
}

export { groundAt, stationAvailable }
