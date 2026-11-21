// Bug Hunter: the five system-repair puzzles. Pure code (no React, no DOM), so the rules are unit-tested and the screen only draws the state.
// Every puzzle has: a type, instructions, `status` ('active' | 'solved' | 'failed'), `attempts` where failure exists, and the same three functions:
//   makePuzzle(type, seed, difficulty)  →  a new puzzle (always solvable: it is built from its solution)
//   puzzleAction(p, action)             →  apply a player action (rotate a tile, press a node...), returns { ok, message }
//   puzzleTick(p, dt)                   →  advance anything that runs in real time (the node pattern, the drifting power bars)
// `puzzleSolution(p)` gives the exact actions that solve it (used by the tests and the test bot, never shown to the player).

export const PUZZLE_TYPES = ['circuit', 'align', 'nodes', 'switches', 'power']
export const PUZZLE_INFO = {
  circuit: { title: 'Reconnect the circuit', how: 'Tap a tile to rotate it. Connect the power source on the left to the glowing socket on the right.' },
  align: { title: 'Align the energy pathways', how: 'Each dial you turn also turns the next dial twice as far. Bring every pointer to the top before the moves run out.' },
  nodes: { title: 'Restore the server nodes', how: 'Watch the nodes light up, then tap them in the same order. Three mistakes and the server reboots.' },
  switches: { title: 'Activate the switches in order', how: 'Switch on the breakers from the LOWEST voltage to the HIGHEST. A wrong switch resets the panel.' },
  power: { title: 'Stabilise the power connections', how: 'The three power levels drift. Use + and − to keep every bar inside the green band for 3 seconds in a row.' },
}

function rng(seed) { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const pick = (r, n) => Math.floor(r() * n)

// ---------------------------------------------------------------- circuit: connect source to socket by rotating pipe tiles
// directions 0 = up, 1 = right, 2 = down, 3 = left. A straight tile connects [1, 3] at rotation 0, a corner connects [0, 1]; rotating adds 1 to every direction.
const BASE = { straight: [1, 3], corner: [0, 1] }
export const tileConnections = (tile) => BASE[tile.type].map((d) => (d + tile.rot) % 4).sort()
const conns = (tile) => BASE[tile.type].map((d) => (d + tile.rot) % 4).sort()
const DELTA = [[-1, 0], [0, 1], [1, 0], [0, -1]]

function makeCircuit(r, diff) {
  const n = diff >= 3 ? 5 : diff === 2 ? 4 : 3
  const startRow = pick(r, n); let endRow = pick(r, n)
  // a random monotone path from the left edge to the right edge (right, plus vertical detours)
  const path = [[startRow, 0]]
  const seen = new Set([`${startRow},0`])
  let [row, col] = path[0]
  while (col < n - 1 || row !== endRow) {
    const options = []
    if (col < n - 1) options.push([row, col + 1])
    if (row > 0 && col < n - 1 + 1) options.push([row - 1, col])
    if (row < n - 1) options.push([row + 1, col])
    const ok = options.filter(([y, x]) => !seen.has(`${y},${x}`) && (col < n - 1 || y === row + Math.sign(endRow - row)))
    if (!ok.length) { path.length = 1; seen.clear(); seen.add(`${startRow},0`); [row, col] = path[0]; continue }
    // prefer moving right, sometimes detour vertically toward the exit row
    const right = ok.find(([, x]) => x === col + 1)
    const next = right && r() < 0.65 ? right : ok[pick(r, ok.length)]
    path.push(next); seen.add(`${next[0]},${next[1]}`); [row, col] = next
    if (path.length > n * n) { path.length = 1; seen.clear(); seen.add(`${startRow},0`); [row, col] = path[0] }
  }
  endRow = path[path.length - 1][0]
  const tiles = Array.from({ length: n }, () => Array(n).fill(null))
  path.forEach(([y, x], i) => {
    const need = new Set()
    need.add(i === 0 ? 3 : DELTA.findIndex(([dy, dx]) => path[i - 1][0] === y + dy && path[i - 1][1] === x + dx))
    need.add(i === path.length - 1 ? 1 : DELTA.findIndex(([dy, dx]) => path[i + 1][0] === y + dy && path[i + 1][1] === x + dx))
    const want = [...need].sort()
    const type = Math.abs(want[0] - want[1]) === 2 ? 'straight' : 'corner'
    let target = 0
    for (let rot = 0; rot < 4; rot += 1) { const c = conns({ type, rot }); if (c[0] === want[0] && c[1] === want[1]) { target = rot; break } }
    const equivalent = type === 'straight' ? [target, (target + 2) % 4] : [target]
    let rot = pick(r, 4)
    while (equivalent.includes(rot)) rot = pick(r, 4)
    tiles[y][x] = { type, rot, onPath: true }
  })
  for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) if (!tiles[y][x]) tiles[y][x] = { type: r() < 0.5 ? 'straight' : 'corner', rot: pick(r, 4), onPath: false }
  return { type: 'circuit', n, startRow, endRow, tiles, status: 'active', moves: 0, solution: [] }
}
function circuitSolved(p) {
  let y = p.startRow; let x = 0; let from = 3 // entering the first tile from its left side
  for (let steps = 0; steps < p.n * p.n + 2; steps += 1) {
    const t = p.tiles[y][x]
    const c = conns(t)
    if (!c.includes(from)) return false
    const out = c[0] === from ? c[1] : c[0]
    if (x === p.n - 1 && y === p.endRow && out === 1) return true
    const [dy, dx] = DELTA[out]
    y += dy; x += dx
    if (y < 0 || y >= p.n || x < 0 || x >= p.n) return false
    from = (out + 2) % 4
  }
  return false
}

// ---------------------------------------------------------------- align: linked dials
function makeAlign(r, diff) {
  const k = diff >= 3 ? 4 : 3
  const presses = Array.from({ length: k }, () => 1 + pick(r, 5)) // how many presses each dial needs
  const values = Array(k).fill(0)
  presses.forEach((times, i) => { for (let t = 0; t < 6 - times; t += 1) { values[i] = (values[i] + 1) % 6; values[(i + 1) % k] = (values[(i + 1) % k] + 2) % 6 } })
  // solve by brute force over press counts (0-5 each) so the move limit is honest
  let best = null
  const total = 6 ** k
  for (let code = 0; code < total; code += 1) {
    const counts = []; let c = code; for (let i = 0; i < k; i += 1) { counts.push(c % 6); c = Math.floor(c / 6) }
    const v = values.slice()
    counts.forEach((times, i) => { for (let t = 0; t < times; t += 1) { v[i] = (v[i] + 1) % 6; v[(i + 1) % k] = (v[(i + 1) % k] + 2) % 6 } })
    if (v.every((x) => x === 0)) { const sum = counts.reduce((a, b) => a + b, 0); if (!best || sum < best.sum) best = { counts, sum } }
  }
  if (!best || values.every((x) => x === 0)) return makeAlign(r, diff) // already solved, or no solution: draw again
  return { type: 'align', k, values, moves: 0, limit: best.sum + 5, solution: best.counts.flatMap((times, i) => Array.from({ length: times }, () => ({ type: 'turn', dial: i }))), status: 'active' }
}

// ---------------------------------------------------------------- nodes: repeat the pattern
function makeNodes(r, diff) {
  const length = 3 + diff
  const sequence = Array.from({ length }, () => pick(r, 4))
  return { type: 'nodes', sequence, input: [], attempts: 3, phase: 'show', showT: 0, lit: -1, status: 'active', solution: sequence.map((node) => ({ type: 'press', node })) }
}

// ---------------------------------------------------------------- switches: lowest to highest voltage
function makeSwitches(r, diff) {
  const n = 3 + Math.min(diff, 3)
  const volts = []
  while (volts.length < n) { const v = 5 * (1 + pick(r, 40)); if (!volts.includes(v)) volts.push(v) }
  const order = volts.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1])
  return { type: 'switches', volts, on: Array(n).fill(false), next: 0, order, attempts: 3, status: 'active', solution: order.map((i) => ({ type: 'flip', i })) }
}

// ---------------------------------------------------------------- power: keep three drifting bars in the green band
function makePower(r, diff) {
  const bars = [0, 1, 2].map(() => ({ v: 30 + pick(r, 40), drift: (r() < 0.5 ? -1 : 1) * (4 + r() * 3 * diff * 0.6) }))
  return { type: 'power', bars, stableT: 0, goalT: 3, time: 0, attempts: 3, seed: Math.floor(r() * 1e9), status: 'active', lastPulse: 0, solution: [] }
}
export const POWER_BAND = [40, 60]

export function makePuzzle(type, seed = 1, difficulty = 1) {
  const r = rng(seed * 7919 + difficulty)
  switch (type) {
    case 'circuit': { let p = makeCircuit(r, difficulty); let guard = 0; while (circuitSolved(p) && guard++ < 20) p = makeCircuit(r, difficulty); return p }
    case 'align': return makeAlign(r, difficulty)
    case 'nodes': return makeNodes(r, difficulty)
    case 'switches': return makeSwitches(r, difficulty)
    case 'power': return makePower(r, difficulty)
    default: throw new Error(`Unknown puzzle ${type}`)
  }
}

function failOrRetry(p, message) {
  p.attempts -= 1
  if (p.attempts <= 0) { p.status = 'failed'; return { ok: false, message: 'The system rebooted. Try again.' } }
  return { ok: false, message }
}

export function puzzleAction(p, a) {
  if (p.status !== 'active') return { ok: false, message: '' }
  switch (p.type) {
    case 'circuit': {
      if (a.type !== 'rotate') return { ok: false, message: '' }
      const t = p.tiles[a.r]?.[a.c]; if (!t) return { ok: false, message: '' }
      t.rot = (t.rot + 1) % 4; p.moves += 1
      if (circuitSolved(p)) { p.status = 'solved'; return { ok: true, message: 'Circuit connected!' } }
      return { ok: true, message: '' }
    }
    case 'align': {
      if (a.type !== 'turn') return { ok: false, message: '' }
      const k = p.k
      p.values[a.dial] = (p.values[a.dial] + 1) % 6; p.values[(a.dial + 1) % k] = (p.values[(a.dial + 1) % k] + 2) % 6; p.moves += 1
      if (p.values.every((v) => v === 0)) { p.status = 'solved'; return { ok: true, message: 'Pathways aligned!' } }
      if (p.moves >= p.limit) { p.status = 'failed'; return { ok: false, message: 'Out of moves. The panel reset.' } }
      return { ok: true, message: '' }
    }
    case 'nodes': {
      if (a.type !== 'press' || p.phase !== 'input') return { ok: false, message: '' }
      if (a.node === p.sequence[p.input.length]) {
        p.input.push(a.node)
        if (p.input.length === p.sequence.length) { p.status = 'solved'; return { ok: true, message: 'Server restored!' } }
        return { ok: true, message: '' }
      }
      p.input = []; p.phase = 'show'; p.showT = 0; p.lit = -1
      return failOrRetry(p, `Wrong node. ${p.attempts} ${p.attempts === 1 ? 'try' : 'tries'} left.`)
    }
    case 'switches': {
      if (a.type !== 'flip' || p.on[a.i]) return { ok: false, message: '' }
      if (a.i === p.order[p.next]) {
        p.on[a.i] = true; p.next += 1
        if (p.next === p.order.length) { p.status = 'solved'; return { ok: true, message: 'Breakers online!' } }
        return { ok: true, message: '' }
      }
      p.on = p.on.map(() => false); p.next = 0
      return failOrRetry(p, `Wrong breaker: the panel reset. ${p.attempts} ${p.attempts === 1 ? 'try' : 'tries'} left.`)
    }
    case 'power': {
      if (a.type !== 'pulse') return { ok: false, message: '' }
      const bar = p.bars[a.i]; if (!bar) return { ok: false, message: '' }
      bar.v = Math.max(0, Math.min(100, bar.v + (a.dir > 0 ? 9 : -9)))
      return { ok: true, message: '' }
    }
    default: return { ok: false, message: '' }
  }
}

export function puzzleTick(p, dt) {
  if (p.status !== 'active') return null
  if (p.type === 'nodes' && p.phase === 'show') {
    p.showT += dt
    const slot = Math.floor(p.showT / 0.7)
    if (slot >= p.sequence.length + 1) { p.phase = 'input'; p.lit = -1 } else p.lit = p.showT % 0.7 < 0.45 && slot < p.sequence.length ? p.sequence[slot] : -1
  } else if (p.type === 'power') {
    p.time += dt
    p.bars.forEach((b, i) => {
      if (Math.floor(p.time / 2.2 + i) !== Math.floor((p.time - dt) / 2.2 + i)) b.drift = -Math.sign(b.drift || 1) * (3 + ((p.seed >> (i * 3)) % 4)) // the drift changes direction every couple of seconds
      b.v += b.drift * dt
    })
    if (p.bars.some((b) => b.v <= 0 || b.v >= 100)) { p.bars.forEach((b) => { b.v = 50 }); p.stableT = 0; return failOrRetry(p, `A bar overloaded. ${p.attempts} ${p.attempts === 1 ? 'try' : 'tries'} left.`) }
    if (p.bars.every((b) => b.v >= POWER_BAND[0] && b.v <= POWER_BAND[1])) p.stableT += dt; else p.stableT = 0
    if (p.stableT >= p.goalT) { p.status = 'solved'; return { ok: true, message: 'Power stable!' } }
  }
  return null
}

/** The exact moves that solve a puzzle (circuit, align, nodes, switches). The power puzzle is real-time: see `powerAssist`. */
export function puzzleSolution(p) {
  if (p.type === 'circuit') return circuitMoves(p)
  return p.solution.slice()
}
function circuitMoves(p) {
  // generic solver: brute force the rotations of on-path tiles (4 states each, at most 5x5 tiles on the path is small)
  const cells = []
  p.tiles.forEach((row, y) => row.forEach((t, x) => { if (t.onPath) cells.push([y, x]) }))
  const rots = Array(cells.length).fill(0)
  const base = JSON.parse(JSON.stringify(p))
  const search = (i) => {
    if (i === cells.length) return circuitSolved(base)
    const [y, x] = cells[i]
    const start = base.tiles[y][x].rot
    for (let k = 0; k < 4; k += 1) {
      base.tiles[y][x].rot = (start + k) % 4
      rots[i] = k
      if (search(i + 1)) return true
    }
    base.tiles[y][x].rot = start
    return false
  }
  if (!search(0)) return []
  const out = []
  cells.forEach(([y, x], i) => { for (let k = 0; k < rots[i]; k += 1) out.push({ type: 'rotate', r: y, c: x }) })
  return out
}
/** A helper action for the real-time power puzzle: nudge a bar that is leaving the band (used by the test bot). */
export function powerAssist(p) {
  for (let i = 0; i < p.bars.length; i += 1) {
    const b = p.bars[i]; const next = b.v + b.drift * 0.2
    if (next < 47) return { type: 'pulse', i, dir: 1 }
    if (next > 53) return { type: 'pulse', i, dir: -1 }
  }
  return null
}
