import { FALL_BELOW } from './config.js'

// The five worlds of LAXBOT Jump, one playable level each. A level is DATA: platforms (static, moving, disappearing, bounce pads), collectibles, hazards, checkpoints, low-gravity zones and a
// finish portal. The courses run toward -z. `build()` places each platform after the previous one (a gap along -z plus a sideways and height offset), so every jump distance is explicit and the
// automatic test (`npm run test:game`) can check that a bot with the real physics reaches the finish of every level.
//
// Step options: dx, dy (offset from the previous platform), gap (empty space before it), w, d (size), h (thickness), type: 'bounce', move: { axis, amp, speed, phase }, cycle: { on, off, offset }
// (disappearing), coins: n (a line of coins on top), arc: true (a coin arc across the gap before it), crystal: true, cp: true (checkpoint), spin: { r, speed, arms } (rotating bar),
// laser: { hw, move, cycle } (barrier), spikes: { hw, hd }, side: { dx, dy, dz, w, d, star, coins, crystal } (a hidden side platform, not on the main path).

function build(meta, steps) {
  const platforms = []; const coins = []; const crystals = []; const stars = []; const checkpoints = []; const spinners = []; const lasers = []; const spikes = []
  const path = []
  let n = 0; let prev = null; let finish = null
  const coinLine = (pl, count) => {
    const span = Math.min(pl.d - 0.8, (count - 1) * 1.3)
    for (let i = 0; i < count; i += 1) coins.push({ id: `${meta.id}-c${coins.length}`, x: pl.x, y: pl.y + 1.15, z: pl.z + (count === 1 ? 0 : span / 2 - (span * i) / (count - 1)) })
  }
  for (const s of steps) {
    const o = { dx: 0, dy: 0, gap: 3, w: 4, d: 4, h: 1, ...s }
    let x; let y; let z
    if (!prev) { x = o.x ?? 0; y = o.y ?? 0; z = o.z ?? 0 } else { x = prev.x + o.dx; y = prev.y + o.dy; z = prev.z - prev.d / 2 - o.gap - o.d / 2 }
    const pl = { id: `${meta.id}-p${n++}`, type: o.type || 'static', x, y, z, w: o.w, d: o.d, h: o.h, move: o.move, cycle: o.cycle, deco: o.deco }
    platforms.push(pl); path.push(pl.id)
    if (o.coins) coinLine(pl, o.coins)
    if (o.arc && prev) {
      const zf = prev.z - prev.d / 2; const hi = Math.max(prev.y, pl.y)
      ;[[0.25, 1.4], [0.5, 2.3], [0.75, 1.4]].forEach(([k, h]) => coins.push({ id: `${meta.id}-c${coins.length}`, x: prev.x + (pl.x - prev.x) * k, y: hi + h, z: zf - o.gap * k }))
    }
    if (o.crystal) crystals.push({ id: `${meta.id}-k${crystals.length}`, x: pl.x, y: pl.y + 1.6, z: pl.z })
    if (o.cp) checkpoints.push({ id: `${meta.id}-cp${checkpoints.length}`, pos: [pl.x, pl.y, pl.z] })
    if (o.spin) spinners.push({ x: pl.x, y: pl.y + 0.55, z: pl.z, r: o.spin.r, speed: o.spin.speed, arms: o.spin.arms || 2, phase: o.spin.phase || 0 })
    if (o.laser) lasers.push({ x: pl.x, y: pl.y, z: pl.z, hw: o.laser.hw ?? pl.w / 2, hh: 0.45, move: o.laser.move, cycle: o.laser.cycle })
    if (o.spikes) spikes.push({ x: pl.x, y: pl.y, z: pl.z, hw: o.spikes.hw, hd: o.spikes.hd, hh: 0.4 })
    if (o.side) {
      const sd = o.side
      const sp = { id: `${meta.id}-s${n++}`, type: 'static', x: pl.x + sd.dx, y: pl.y + (sd.dy || 0), z: pl.z + (sd.dz || 0), w: sd.w || 3, d: sd.d || 3, h: 1, deco: o.deco, side: true }
      platforms.push(sp)
      if (sd.star) stars.push({ id: `${meta.id}-star${stars.length}`, x: sp.x, y: sp.y + 1.5, z: sp.z })
      if (sd.crystal) crystals.push({ id: `${meta.id}-k${crystals.length}`, x: sp.x, y: sp.y + 1.6, z: sp.z })
      if (sd.coins) coinLine(sp, sd.coins)
    }
    if (o.finish) finish = [pl.x, pl.y, pl.z]
    prev = pl
  }
  let low = Infinity
  platforms.forEach((p) => { low = Math.min(low, p.y - (p.move?.axis === 'y' ? p.move.amp : 0)) })
  const zones = (meta.zones || []).map((z) => ({ ...z }))
  return { ...meta, platforms, coins, crystals, stars, checkpoints, spinners, lasers, spikes, zones, path, start: [platforms[0].x, platforms[0].y, platforms[0].z], finish, killY: low - FALL_BELOW }
}

export const LEVELS = [
  build({ id: 'cloud-kingdom', index: 0, world: 'Cloud Kingdom', name: 'First Steps', tagline: 'A gentle tutorial across soft floating clouds.', theme: 'cloud', par: 80, hint: 'Walk with WASD or the arrows. Press Space to jump, and press it again in the air to double jump.' }, [
    { x: 0, y: 0, z: 0, w: 7, d: 7, deco: 'start' },
    { gap: 2.5, w: 4, d: 4, coins: 3 },
    { dx: 1.5, gap: 3, w: 4, d: 4, coins: 2, arc: true },
    { dx: -3, dy: 0.6, gap: 3, w: 4, d: 4, cp: true, coins: 3 },
    { dx: 1.5, dy: 0.6, gap: 3.2, w: 3.6, d: 3.6, arc: true, crystal: true },
    { dy: 0.8, gap: 3, w: 3.6, d: 3.6, coins: 2 },
    { dx: 2, dy: 0.4, gap: 3.4, w: 3.8, d: 3.8, cp: true, coins: 2, side: { dx: 6.5, dy: 0.5, dz: 0, w: 3, d: 3, star: true, coins: 1 } },
    { dx: -2, gap: 3.4, w: 3.4, d: 3.4, coins: 3 },
    { dy: 0.8, gap: 3.2, w: 3.4, d: 3.4, crystal: true },
    { dx: 2, gap: 3.4, w: 3.4, d: 3.4, arc: true },
    { dy: 0.5, gap: 3.2, w: 3.4, d: 3.4, coins: 2, crystal: true },
    { gap: 3, w: 8, d: 8, finish: true, deco: 'finish' },
  ]),

  build({ id: 'candy-island', index: 1, world: 'Candy Island', name: 'Sugar Rush', tagline: 'Sliding platforms, bounce pads and rotating candy canes.', theme: 'candy', par: 110, hint: 'Hop on the pink bounce pads for a big jump. Jump over the spinning bars.' }, [
    { x: 0, y: 0, z: 0, w: 7, d: 7, deco: 'start' },
    { gap: 2.5, w: 4.5, d: 4, coins: 3 },
    { gap: 3, w: 2.8, d: 2.8, type: 'bounce' },
    { dy: 3, gap: 3.2, w: 5, d: 5, cp: true, coins: 3 },
    { gap: 3, w: 9, d: 9, spin: { r: 3.2, speed: 1.6 }, coins: 2, crystal: true },
    { gap: 3, w: 4, d: 4, move: { axis: 'x', amp: 2.4, speed: 1.1 }, arc: true },
    { gap: 3, w: 3.6, d: 3.6, move: { axis: 'x', amp: 3, speed: 0.9, phase: 2 }, coins: 2 },
    { gap: 3, w: 5, d: 5, cp: true, coins: 3, side: { dx: -7, dy: 1, dz: 0, w: 3, d: 3, star: true, coins: 1 } },
    { gap: 2.8, w: 2.8, d: 2.8, type: 'bounce' },
    { dy: 3.5, gap: 3.4, w: 5, d: 5, crystal: true, coins: 2 },
    { gap: 3, w: 9, d: 9, spin: { r: 2.8, speed: -1.7 }, coins: 2 },
    { dy: 0.5, gap: 3, w: 4, d: 4, move: { axis: 'y', amp: 1.3, speed: 1.2 }, crystal: true },
    { dy: 1, gap: 3, w: 4, d: 4, move: { axis: 'x', amp: 2.5, speed: 1.0, phase: 1 }, coins: 2 },
    { dy: 0.5, gap: 3, w: 8, d: 8, finish: true, deco: 'finish' },
  ]),

  build({ id: 'crystal-valley', index: 2, world: 'Crystal Valley', name: 'Glow Path', tagline: 'Narrow paths, vanishing crystal bridges and hidden treasure.', theme: 'crystal', par: 120, hint: 'Crystal platforms flicker before they vanish. Keep moving, and look off the path for a hidden star.' }, [
    { x: 0, y: 0, z: 0, w: 7, d: 7, deco: 'start' },
    { gap: 2.5, w: 1.9, d: 7, coins: 4 },
    { gap: 3, w: 3.2, d: 3.2, cycle: { on: 3.2, off: 1.2, offset: 0 }, coins: 1 },
    { gap: 3, w: 3.2, d: 3.2, cycle: { on: 3.2, off: 1.2, offset: 1.6 } },
    { gap: 3, w: 4.5, d: 4.5, cp: true, coins: 3, side: { dx: -6.5, dy: 0.5, dz: -1, w: 3, d: 3, star: true } },
    { gap: 3, w: 1.8, d: 9, spikes: { hw: 0.55, hd: 0.45 }, coins: 5, crystal: true },
    { dx: 2, dy: 0.8, gap: 3.2, w: 3.4, d: 3.4, arc: true },
    { gap: 3.2, w: 3.2, d: 3.2, cycle: { on: 3.2, off: 1.3, offset: 0.4 } },
    { gap: 3.2, w: 3.2, d: 3.2, cycle: { on: 3.2, off: 1.3, offset: 2.2 }, coins: 1 },
    { dy: 0.6, gap: 3.2, w: 4.5, d: 4.5, cp: true, coins: 3, crystal: true },
    { dx: -2, gap: 3, w: 1.8, d: 8, spikes: { hw: 0.55, hd: 0.45 }, coins: 4 },
    { dy: 0.6, gap: 3.2, w: 3, d: 3 , cycle: { on: 3.2, off: 1.2, offset: 0 } },
    { dx: 1.5, gap: 3.2, w: 3, d: 3, cycle: { on: 3.2, off: 1.2, offset: 1.6 }, coins: 1, crystal: true },
    { dx: 1, gap: 3.2, w: 3.4, d: 3.4, coins: 2 },
    { gap: 3, w: 8, d: 8, finish: true, deco: 'finish' },
  ]),

  build({ id: 'neon-city', index: 3, world: 'Neon City', name: 'Laser Run', tagline: 'Precision jumps and laser barriers that sweep and pulse.', theme: 'neon', par: 120, hint: 'Red barriers hurt. Wait for the pulsing ones to switch off, and hop over the sweeping ones.' }, [
    { x: 0, y: 0, z: 0, w: 7, d: 7, deco: 'start' },
    { gap: 3, w: 3.2, d: 3.2, coins: 1 },
    { dy: 0.5, gap: 3.6, w: 2.4, d: 2.4, arc: true },
    { dx: 1, gap: 3.8, w: 2.4, d: 2.4 },
    { dx: -1, gap: 3.4, w: 7, d: 9, laser: { hw: 3.4, move: { axis: 'z', amp: 2.8, speed: 1.5 } }, cp: true, coins: 2 },
    { gap: 3.2, w: 3, d: 3, crystal: true },
    { dy: 0.5, gap: 3.6, w: 2.4, d: 2.4, arc: true },
    { gap: 3.2, w: 7, d: 9, laser: { hw: 3.4, cycle: { on: 1.3, off: 1.9 } }, coins: 3, side: { dx: -7, dy: 0.5, dz: 0, w: 3, d: 3, star: true } },
    { dx: 1, gap: 3.2, w: 3, d: 3, cp: true, coins: 2 },
    { dx: 1.5, dy: 0.5, gap: 3.6, w: 2.4, d: 2.4 },
    { dx: -1.5, gap: 3.8, w: 2.4, d: 2.4, crystal: true },
    { gap: 3.2, w: 7, d: 10, laser: { hw: 3.4, move: { axis: 'z', amp: 3.2, speed: 1.9, phase: 1 } }, coins: 2 },
    { gap: 3.2, w: 7, d: 8, laser: { hw: 3.4, cycle: { on: 1.2, off: 2, offset: 1 } }, coins: 2, crystal: true },
    { dy: 0.5, gap: 3.4, w: 2.6, d: 2.6, arc: true },
    { gap: 3.2, w: 8, d: 8, finish: true, deco: 'finish' },
  ]),

  build({ id: 'space-garden', index: 4, world: 'Space Garden', name: 'Zero-G Bloom', tagline: 'Low gravity, drifting islands and the final portal.', theme: 'space', par: 140, hint: 'Gravity is light here: jumps go much higher and farther. Double jump to cross the long gaps.',
    zones: [{ x0: -60, x1: 60, y0: -60, y1: 80, z0: -400, z1: -22, g: 0.45 }] }, [
    { x: 0, y: 0, z: 0, w: 7, d: 7, deco: 'start' },
    { gap: 3, w: 4, d: 4, coins: 3 },
    { dx: 1.5, dy: 0.6, gap: 3.4, w: 3.6, d: 3.6, cp: true, arc: true },
    { dx: -2, gap: 3.4, w: 3.4, d: 3.4, move: { axis: 'x', amp: 2, speed: 1, phase: 0 }, coins: 2 },
    { dy: 0.5, gap: 3.4, w: 4.5, d: 4.5, cp: true, coins: 2, crystal: true },
    { dy: 2, gap: 6, w: 3.6, d: 3.6, arc: true, coins: 1 }, // low gravity starts here: longer, higher jumps
    { dx: 3, dy: 2, gap: 6, w: 3.4, d: 3.4, coins: 2 },
    { dx: -3, dy: 1, gap: 6.5, w: 3.4, d: 3.4, move: { axis: 'x', amp: 2.5, speed: 1.1 }, crystal: true },
    { dy: 3, gap: 5, w: 4, d: 4, cp: true, coins: 2, side: { dx: 7, dy: 2, dz: 0, w: 3, d: 3, star: true } },
    { dy: 1, gap: 6.5, w: 3.4, d: 3.4, move: { axis: 'y', amp: 2, speed: 1.1 }, coins: 2 },
    { dx: 3, dy: 1.5, gap: 6.5, w: 3.2, d: 3.2, arc: true },
    { dx: -3, dy: 2, gap: 6.5, w: 3.2, d: 3.2, move: { axis: 'x', amp: 2.5, speed: 1.2, phase: 1 }, crystal: true },
    { dy: 1, gap: 7, w: 3.6, d: 3.6, coins: 2 },
    { dy: 3, gap: 6, w: 8, d: 8, finish: true, deco: 'finish' },
  ]),
]

export const levelById = (id) => LEVELS.find((l) => l.id === id)
export const THEMES = {
  cloud: { sky: ['#4fa8ff', '#9ad0ff', '#f7e9ff'], fog: '#bfe0ff', top: '#ffffff', side: '#cfe3ff', trim: '#7cc4ff', glow: '#fff3b0', sun: '#fff4d6', accent: '#7dd3fc' },
  candy: { sky: ['#ff8fc7', '#ffc4e1', '#fff0f6'], fog: '#ffd2e8', top: '#ff9ccf', side: '#fff0a8', trim: '#ffffff', glow: '#ffe066', sun: '#fff1e0', accent: '#f9a8d4' },
  crystal: { sky: ['#1a1245', '#4a2a9a', '#9b6cf0'], fog: '#6a45c8', top: '#7a6cff', side: '#3b2a85', trim: '#8af0ff', glow: '#8af0ff', sun: '#c9b8ff', accent: '#a78bfa' },
  neon: { sky: ['#07061a', '#170a3d', '#3a0f6b'], fog: '#1a0b45', top: '#1d1b3a', side: '#0e0d24', trim: '#22e6ff', glow: '#ff3df2', sun: '#a0a0ff', accent: '#22e6ff' },
  space: { sky: ['#030617', '#0d1740', '#2a1a63'], fog: '#13174a', top: '#62d68b', side: '#4a3a8a', trim: '#b5ffd8', glow: '#ffd36e', sun: '#e8e0ff', accent: '#86efac' },
}
