// Puzzle Pop: the Match-3 engine. Pure code (no React, no Three.js, no DOM): the same file runs in the browser and in `npm run test:game`.
//
// The player's move is resolved COMPLETELY by `playMove()`, which changes the game state to the final, stable board and returns an ordered list of STEPS (swap, clear, gravity, collect,
// reshuffle, end). The screen replays those steps as animations and ignores input meanwhile, so the rules never depend on timing. Everything is deterministic: the same level, seed and moves
// always give the same result (a small seeded random generator provides the new crystals).
//
// Board: 8 x 8, row 0 is the TOP. Tiles: gems (colour 0-5, optionally special), treasures (they fall and are collected at the bottom row) and blocks (they fall, cannot be moved or matched, and
// break when matches happen next to them). Ice lies UNDER cells: clearing a crystal in an iced cell removes one layer.
//
// SCORING (one place: SCORE below), documented on the results screen:
//   match of 3: +30 · of 4: +60 · of 5 or more: +100 (by the longest straight line of a matched group)
//   overlapping line shapes (T / L): +10 for every crystal beyond the longest line
//   every crystal cleared by a power-up effect: +10
//   special combination (two specials swapped, or a rainbow swapped): +150 each
//   cascade (the board refills and matches again): +30 x (cascade number - 1), added once per cascade step
//   level completion: +200, and +20 for every move left

export const COLS = 8
export const ROWS = 8
export const GEM_TYPES = 6
export const SCORE = { match3: 30, match4: 60, match5: 100, combo: 150, complete: 200, perMoveLeft: 20, perEffectCrystal: 10, overlapExtra: 10, cascade: 30 }
export const SPECIALS = ['rocketH', 'rocketV', 'bomb', 'rainbow']

// ------------------------------------------------------------------ random
export function rand(state) { // mulberry32 over state.seed (kept in the state so a game can be saved, copied and replayed)
  state.seed = (state.seed + 0x6d2b79f5) | 0
  let t = Math.imul(state.seed ^ (state.seed >>> 15), 1 | state.seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const randInt = (state, n) => Math.floor(rand(state) * n)

// ------------------------------------------------------------------ small helpers
const key = (r, c) => r * COLS + c
const inside = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS
const newTile = (state, props) => ({ id: state.nextId++, kind: 'gem', color: 0, special: null, hp: 0, ...props })
const isGem = (t) => !!t && t.kind === 'gem'
const colorOf = (t) => (isGem(t) && t.special !== 'rainbow' ? t.color : -1) // what a tile counts as in a line of three

export function cloneState(state) { return typeof structuredClone === 'function' ? structuredClone(state) : JSON.parse(JSON.stringify(state)) }

// ------------------------------------------------------------------ creating a game
/** A new game for a level definition (see levels.js). `seed` makes the board reproducible. */
export function createGame(level, seed = 1) {
  const state = {
    levelId: level.id, level, seed: seed | 0, nextId: 1, rows: ROWS, cols: COLS,
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    ice: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    moves: level.moves, score: 0, status: 'playing', colors: level.colors || GEM_TYPES,
    progress: { collect: Array(GEM_TYPES).fill(0), ice: 0, treasure: 0, blocks: 0, special: 0, combos: 0, bestChain: 0, rainbow: 0 },
    totals: { ice: 0, blocks: 0, treasure: 0 }, moveCount: 0, lastBonus: null,
  }
  for (const [r, c, layers = 1] of level.ice || []) { state.ice[r][c] = layers; state.totals.ice += layers }
  generateBoard(state)
  return state
}

function fillColors(state, avoid = true) {
  const B = state.board
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (B[r][c]) continue
      let color
      let guard = 0
      do {
        color = randInt(state, state.colors)
        guard += 1
      } while (avoid && guard < 30 && ((c >= 2 && colorOf(B[r][c - 1]) === color && colorOf(B[r][c - 2]) === color) || (r >= 2 && colorOf(B[r - 1][c]) === color && colorOf(B[r - 2][c]) === color)))
      B[r][c] = newTile(state, { color })
    }
  }
}

/** A valid starting board: no match on it, at least one valid move, and every special object of the level in place. */
export function generateBoard(state) {
  const level = state.level
  for (let attempt = 0; attempt < 200; attempt += 1) {
    state.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
    state.totals.blocks = 0; state.totals.treasure = 0
    for (const [r, c, hp = 1] of level.blocks || []) { state.board[r][c] = newTile(state, { kind: 'block', color: -1, hp }); state.totals.blocks += 1 }
    for (const [r, c] of level.treasures || []) { state.board[r][c] = newTile(state, { kind: 'treasure', color: -1 }); state.totals.treasure += 1 }
    fillColors(state)
    for (const [r, c, special] of level.specials || []) state.board[r][c] = newTile(state, { color: special === 'rainbow' ? -1 : state.board[r][c].color, special })
    if (findRuns(state.board).length === 0 && hasValidMove(state)) return
  }
  throw new Error(`Could not generate a valid board for level ${level.id}`)
}

// ------------------------------------------------------------------ finding matches
/** Every straight run of three or more matching gems, in row-major order of its first cell. */
export function findRuns(board) {
  const runs = []
  for (let r = 0; r < ROWS; r += 1) {
    let c = 0
    while (c < COLS) {
      const col = colorOf(board[r][c])
      let e = c + 1
      while (col >= 0 && e < COLS && colorOf(board[r][e]) === col) e += 1
      if (col >= 0 && e - c >= 3) runs.push({ dir: 'h', color: col, cells: Array.from({ length: e - c }, (_, i) => [r, c + i]) })
      c = Math.max(e, c + 1)
    }
  }
  for (let c = 0; c < COLS; c += 1) {
    let r = 0
    while (r < ROWS) {
      const col = colorOf(board[r][c])
      let e = r + 1
      while (col >= 0 && e < ROWS && colorOf(board[e][c]) === col) e += 1
      if (col >= 0 && e - r >= 3) runs.push({ dir: 'v', color: col, cells: Array.from({ length: e - r }, (_, i) => [r + i, c]) })
      r = Math.max(e, r + 1)
    }
  }
  return runs
}

/** Join runs that share a crystal (a T, L or cross) into one group, so overlapping lines are scored and rewarded ONCE. */
export function groupRuns(runs) {
  const parent = runs.map((_, i) => i)
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const owner = new Map()
  runs.forEach((run, i) => run.cells.forEach(([r, c]) => {
    const k = key(r, c)
    if (owner.has(k)) parent[find(i)] = find(owner.get(k))
    else owner.set(k, i)
  }))
  const groups = new Map()
  runs.forEach((run, i) => { const g = find(i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(run) })
  return [...groups.values()].map((rs) => {
    const cells = new Map()
    rs.forEach((run) => run.cells.forEach(([r, c]) => cells.set(key(r, c), [r, c])))
    const list = [...cells.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const maxRun = Math.max(...rs.map((x) => x.cells.length))
    const hasH = rs.some((x) => x.dir === 'h'); const hasV = rs.some((x) => x.dir === 'v')
    return { runs: rs, color: rs[0].color, cells: list, maxRun, cross: hasH && hasV }
  }).sort((a, b) => a.cells[0][0] - b.cells[0][0] || a.cells[0][1] - b.cells[0][1])
}

const baseScore = (n) => (n >= 5 ? SCORE.match5 : n === 4 ? SCORE.match4 : SCORE.match3)

/** What a matched group turns into: 5 in a line = rainbow; T or L = bomb; 4 in a line = rocket (a horizontal line makes a row rocket). Placed on a cell the player moved, else the middle. */
function specialFor(group, focus) {
  let special = null
  if (group.maxRun >= 5) special = 'rainbow'
  else if (group.cross) special = 'bomb'
  else if (group.maxRun === 4) special = group.runs.find((x) => x.cells.length === 4).dir === 'h' ? 'rocketH' : 'rocketV'
  if (!special) return null
  let at = null
  for (const f of focus || []) if (group.cells.some(([r, c]) => r === f[0] && c === f[1])) { at = f; break }
  if (!at) {
    if (group.cross) { // the crossing cell
      const hs = new Set(group.runs.filter((x) => x.dir === 'h').flatMap((x) => x.cells.map(([r, c]) => key(r, c))))
      at = group.runs.filter((x) => x.dir === 'v').flatMap((x) => x.cells).find(([r, c]) => hs.has(key(r, c)))
    } else {
      const longest = group.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a))
      at = longest.cells[Math.floor(longest.cells.length / 2)]
    }
  }
  return { special, at }
}

// ------------------------------------------------------------------ valid moves
const swappable = (t) => !!t && t.kind !== 'block'
const isRocket = (t) => t && (t.special === 'rocketH' || t.special === 'rocketV')

/** A swap is valid when it makes a match, or when a rainbow is involved, or when two power-ups are swapped together. */
export function isValidSwap(state, a, b) {
  const [r1, c1] = a; const [r2, c2] = b
  if (!inside(r1, c1) || !inside(r2, c2) || Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return false
  const B = state.board
  const t1 = B[r1][c1]; const t2 = B[r2][c2]
  if (!swappable(t1) || !swappable(t2)) return false
  if (isGem(t1) && isGem(t2) && (t1.special === 'rainbow' || t2.special === 'rainbow')) return true
  if (isGem(t1) && isGem(t2) && t1.special && t2.special) return true
  B[r1][c1] = t2; B[r2][c2] = t1
  const ok = findRuns(B).length > 0
  B[r1][c1] = t1; B[r2][c2] = t2
  return ok
}

export function validMoves(state) {
  const out = []
  for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) {
    if (c + 1 < COLS && isValidSwap(state, [r, c], [r, c + 1])) out.push([[r, c], [r, c + 1]])
    if (r + 1 < ROWS && isValidSwap(state, [r, c], [r + 1, c])) out.push([[r, c], [r + 1, c]])
  }
  return out
}
export const hasValidMove = (state) => {
  for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) {
    if (c + 1 < COLS && isValidSwap(state, [r, c], [r, c + 1])) return true
    if (r + 1 < ROWS && isValidSwap(state, [r, c], [r + 1, c])) return true
  }
  return false
}

/** A hint: the valid swap that scores most right now (the first one when equal). It only SHOWS a move; it never plays it. */
export function findHint(state) {
  let best = null; let bestScore = -1
  for (const m of validMoves(state)) {
    const copy = cloneState(state)
    const res = playMove(copy, m[0], m[1])
    const s = copy.score - state.score + (res.steps.some((x) => x.type === 'clear' && x.combo) ? 500 : 0)
    if (s > bestScore) { best = m; bestScore = s }
  }
  return best
}

// ------------------------------------------------------------------ effects of power-ups
const addRow = (set, r) => { for (let c = 0; c < COLS; c += 1) set.add(key(r, c)) }
const addCol = (set, c) => { for (let r = 0; r < ROWS; r += 1) set.add(key(r, c)) }
const addArea = (set, r, c, radius) => { for (let y = r - radius; y <= r + radius; y += 1) for (let x = c - radius; x <= c + radius; x += 1) if (inside(y, x)) set.add(key(y, x)) }

function mostCommonColor(board) {
  const n = Array(GEM_TYPES).fill(0)
  for (const row of board) for (const t of row) if (isGem(t) && t.color >= 0) n[t.color] += 1
  let best = 0
  for (let i = 1; i < GEM_TYPES; i += 1) if (n[i] > n[best]) best = i
  return best
}

/**
 * Expand a set of cells with the effects of every power-up inside it (rockets, bombs, rainbows set off by another power-up), in a fixed order, until nothing new is added.
 * Returns the effect list for the animation. Treasures are never destroyed by an effect.
 */
function expand(state, set, effects, triggered) {
  const B = state.board
  const queue = [...set].sort((a, b) => a - b)
  const seen = new Set()
  while (queue.length) {
    const k = queue.shift()
    if (seen.has(k)) continue
    seen.add(k)
    const r = Math.floor(k / COLS); const c = k % COLS
    const t = B[r][c]
    if (!isGem(t) || !t.special || triggered.has(t.id)) continue
    triggered.add(t.id)
    const add = new Set()
    if (t.special === 'rocketH') { addRow(add, r); effects.push({ kind: 'rocketH', r, c }) }
    else if (t.special === 'rocketV') { addCol(add, c); effects.push({ kind: 'rocketV', r, c }) }
    else if (t.special === 'bomb') { addArea(add, r, c, 1); effects.push({ kind: 'bomb', r, c, radius: 1 }) }
    else if (t.special === 'rainbow') {
      const color = mostCommonColor(B)
      for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) if (isGem(B[y][x]) && B[y][x].color === color) add.add(key(y, x))
      effects.push({ kind: 'rainbow', r, c, color, targets: [...add].map((q) => [Math.floor(q / COLS), q % COLS]) })
    }
    add.forEach((q) => { if (!set.has(q)) { set.add(q); queue.push(q) } })
    queue.sort((a, b) => a - b)
  }
}

/** The effect of swapping two power-ups (or a rainbow with anything). Returns { set, effects, label } or null when the swap is not a combination. */
function comboFor(state, a, b) {
  const B = state.board
  const t1 = B[a[0]][a[1]]; const t2 = B[b[0]][b[1]]
  if (!isGem(t1) || !isGem(t2)) return null
  const set = new Set(); const effects = []
  const [r, c] = b // the effect is centred where the dragged crystal lands (b is the cell it was dragged to)
  if (t1.special === 'rainbow' && t2.special === 'rainbow') {
    for (let y = 0; y < ROWS; y += 1) addRow(set, y)
    effects.push({ kind: 'rainbow', r, c, color: -1, targets: [...set].map((q) => [Math.floor(q / COLS), q % COLS]), all: true })
    return { set, effects, label: 'Double rainbow!' }
  }
  const rain = t1.special === 'rainbow' ? t1 : t2.special === 'rainbow' ? t2 : null
  if (rain) {
    const other = rain === t1 ? t2 : t1
    const [rr, rc] = rain === t1 ? a : b
    if (other.special) { // rainbow + power-up: every crystal of that colour becomes that power-up, and all of them go off
      const targets = []
      let n = 0
      for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) {
        const t = B[y][x]
        if (isGem(t) && !t.special && t.color === other.color) {
          t.special = other.special === 'bomb' ? 'bomb' : (n % 2 ? 'rocketV' : 'rocketH'); n += 1
          targets.push([y, x]); set.add(key(y, x))
        }
      }
      set.add(key(rr, rc)); set.add(key(...(other === t1 ? a : b)))
      effects.push({ kind: 'rainbow', r: rr, c: rc, color: other.color, targets, convert: other.special })
      return { set, effects, label: 'Rainbow power-up!' }
    }
    for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) if (isGem(B[y][x]) && B[y][x].color === other.color) set.add(key(y, x))
    set.add(key(rr, rc))
    effects.push({ kind: 'rainbow', r: rr, c: rc, color: other.color, targets: [...set].map((q) => [Math.floor(q / COLS), q % COLS]) })
    return { set, effects, label: 'Rainbow burst!' }
  }
  if (t1.special && t2.special) {
    if (isRocket(t1) && isRocket(t2)) { addRow(set, r); addCol(set, c); effects.push({ kind: 'rocketH', r, c }, { kind: 'rocketV', r, c }); return { set, effects, label: 'Double rocket!' } }
    if (t1.special === 'bomb' && t2.special === 'bomb') { addArea(set, r, c, 2); effects.push({ kind: 'bomb', r, c, radius: 2 }); return { set, effects, label: 'Mega bomb!' } }
    for (let d = -1; d <= 1; d += 1) { if (r + d >= 0 && r + d < ROWS) addRow(set, r + d); if (c + d >= 0 && c + d < COLS) addCol(set, c + d) } // rocket + bomb
    effects.push({ kind: 'rocketH', r, c, wide: true }, { kind: 'rocketV', r, c, wide: true })
    return { set, effects, label: 'Rocket bomb!' }
  }
  return null
}

// ------------------------------------------------------------------ clearing, gravity, collecting
function clearCells(state, set, { createdAt = [] }) {
  const B = state.board
  const cleared = []; const blockHits = []; const iceHits = []
  const brokenBlocks = []
  const keys = [...set].sort((a, b) => a - b)
  const neighbours = new Set()
  for (const k of keys) {
    const r = Math.floor(k / COLS); const c = k % COLS
    const t = B[r][c]
    if (!t) continue
    if (t.kind === 'treasure') continue // a treasure is never destroyed: it must reach the bottom
    if (t.kind === 'block') { // hit by an effect that reaches it
      t.hp -= 1; blockHits.push({ id: t.id, r, c, hp: t.hp })
      if (t.hp <= 0) { B[r][c] = null; brokenBlocks.push({ id: t.id, r, c }); state.progress.blocks += 1 }
      continue
    }
    state.progress.collect[t.color] = (state.progress.collect[t.color] || 0) + (t.color >= 0 ? 1 : 0)
    if (t.special) { state.progress.special += 1; if (t.special === 'rainbow') state.progress.rainbow += 1 }
    cleared.push({ id: t.id, r, c, color: t.color, special: t.special })
    B[r][c] = null
    if (state.ice[r][c] > 0) { state.ice[r][c] -= 1; state.progress.ice += 1; iceHits.push({ r, c, layers: state.ice[r][c] }) }
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inside(r + dr, c + dc)) neighbours.add(key(r + dr, c + dc))
  }
  // blocks next to cleared crystals take one hit each (once per clear step)
  for (const k of [...neighbours].sort((a, b) => a - b)) {
    const r = Math.floor(k / COLS); const c = k % COLS
    const t = B[r][c]
    if (!t || t.kind !== 'block') continue
    t.hp -= 1; blockHits.push({ id: t.id, r, c, hp: t.hp })
    if (t.hp <= 0) { B[r][c] = null; brokenBlocks.push({ id: t.id, r, c }); state.progress.blocks += 1 }
  }
  const created = []
  for (const cr of createdAt) {
    const t = newTile(state, { color: cr.special === 'rainbow' ? -1 : cr.color, special: cr.special })
    B[cr.r][cr.c] = t
    created.push({ id: t.id, r: cr.r, c: cr.c, color: t.color, special: t.special })
  }
  return { cleared, created, blockHits, brokenBlocks, iceHits }
}

/** Gravity and refill: crystals fall straight down, new ones drop in from above the board. */
function gravity(state) {
  const B = state.board
  const moves = []; const spawned = []
  for (let c = 0; c < COLS; c += 1) {
    let write = ROWS - 1
    for (let r = ROWS - 1; r >= 0; r -= 1) {
      const t = B[r][c]
      if (!t) continue
      if (r !== write) { B[write][c] = t; B[r][c] = null; moves.push({ id: t.id, from: [r, c], to: [write, c] }) }
      write -= 1
    }
    const empty = write + 1
    for (let r = empty - 1; r >= 0; r -= 1) {
      const t = newTile(state, { color: randInt(state, state.colors) })
      B[r][c] = t
      spawned.push({ id: t.id, color: t.color, kind: 'gem', special: null, from: [r - empty, c], to: [r, c] })
    }
  }
  return { type: 'gravity', moves, spawned }
}

function collectTreasure(state) {
  const items = []
  for (let c = 0; c < COLS; c += 1) {
    const t = state.board[ROWS - 1][c]
    if (t && t.kind === 'treasure') { items.push({ id: t.id, r: ROWS - 1, c }); state.board[ROWS - 1][c] = null; state.progress.treasure += 1 }
  }
  return items
}

// ------------------------------------------------------------------ reshuffling
/** When no valid move is left: the ordinary crystals are shuffled (power-ups, treasures and blocks stay) until the board has no match and at least one valid move. */
export function reshuffle(state) {
  const B = state.board
  const cells = []
  for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) { const t = B[r][c]; if (isGem(t) && !t.special) cells.push([r, c]) }
  const before = new Map(cells.map(([r, c]) => [B[r][c].id, [r, c]]))
  const tiles = cells.map(([r, c]) => B[r][c])
  for (let attempt = 0; attempt < 80; attempt += 1) {
    for (let i = tiles.length - 1; i > 0; i -= 1) { const j = randInt(state, i + 1); [tiles[i], tiles[j]] = [tiles[j], tiles[i]] }
    cells.forEach(([r, c], i) => { B[r][c] = tiles[i] })
    if (findRuns(B).length === 0 && hasValidMove(state)) return finishReshuffle(B, cells, before)
  }
  // fallback: recolour with a generator that never makes a match, then plant one guaranteed move
  for (let attempt = 0; attempt < 200; attempt += 1) {
    cells.forEach(([r, c]) => { B[r][c] = null })
    cells.forEach(([r, c], i) => {
      let color; let g = 0
      do { color = randInt(state, state.colors); g += 1 } while (g < 30 && ((c >= 2 && colorOf(B[r][c - 1]) === color && colorOf(B[r][c - 2]) === color) || (r >= 2 && colorOf(B[r - 1][c]) === color && colorOf(B[r - 2][c]) === color)))
      B[r][c] = tiles[i]; tiles[i].color = color
    })
    if (findRuns(B).length === 0 && hasValidMove(state)) return finishReshuffle(B, cells, before)
  }
  return null
}
function finishReshuffle(B, cells, before) {
  const moves = []
  cells.forEach(([r, c]) => { const t = B[r][c]; const from = before.get(t.id); if (from[0] !== r || from[1] !== c) moves.push({ id: t.id, from, to: [r, c], color: t.color }) })
  return { type: 'reshuffle', moves, colors: cells.map(([r, c]) => ({ id: B[r][c].id, color: B[r][c].color })) }
}

// ------------------------------------------------------------------ objectives
export function objectiveStatus(state) {
  const p = state.progress
  return (state.level.objectives || []).map((o) => {
    let current = 0; let target = 1
    switch (o.type) {
      case 'score': current = state.score - (state.lastBonus ? state.lastBonus.total : 0); target = o.target; break
      case 'collect': current = p.collect[o.color] || 0; target = o.count; break
      case 'ice': current = p.ice; target = state.totals.ice; break
      case 'treasure': current = p.treasure; target = o.count ?? state.totals.treasure; break
      case 'blocks': current = p.blocks; target = o.count ?? state.totals.blocks; break
      case 'special': current = p.special; target = o.count; break
      case 'combos': current = p.combos; target = o.count; break
      case 'chain': current = p.bestChain; target = o.size; break
      case 'rainbow': current = p.rainbow; target = o.count; break
      default: break
    }
    return { ...o, current: Math.min(current, target), target, done: current >= target }
  })
}
export const objectivesMet = (state) => objectiveStatus(state).every((o) => o.done)

// ------------------------------------------------------------------ playing a move
function snapshot(state) {
  return { score: state.score, moves: state.moves, progress: JSON.parse(JSON.stringify(state.progress)), objectives: objectiveStatus(state) }
}

/**
 * Play one move: swap two adjacent crystals and resolve everything that follows. Returns { valid, steps }. An invalid swap changes nothing (one 'invalid' step) and costs no move.
 * The state is left STABLE: no match on the board, a valid move available, status updated (won / failed / playing).
 */
export function playMove(state, a, b) {
  const steps = []
  if (state.status !== 'playing' || state.moves <= 0 || !isValidSwap(state, a, b)) {
    return { valid: false, steps: [{ type: 'invalid', a, b }] }
  }
  const B = state.board
  const t1 = B[a[0]][a[1]]; const t2 = B[b[0]][b[1]]
  B[a[0]][a[1]] = t2; B[b[0]][b[1]] = t1
  state.moves -= 1; state.moveCount += 1
  steps.push({ type: 'swap', a, b, ids: [t1.id, t2.id] })

  let chain = 0
  let first = true
  const triggered = new Set()
  while (true) {
    let set = null; let effects = []; let created = []; let points = 0; let label = null; let combo = false; let groupsOut = []
    if (first) {
      first = false
      const cb = comboFor(state, a, b)
      if (cb) { // the swap itself is a combination: it replaces the first match round
        set = cb.set; effects = cb.effects; label = cb.label; combo = true
        points += SCORE.combo
        state.progress.combos += 1
        expand(state, set, effects, triggered)
      }
    }
    if (!set) {
      const runs = findRuns(B)
      if (!runs.length) break
      const groups = groupRuns(runs)
      set = new Set()
      for (const g of groups) {
        g.cells.forEach(([r, c]) => set.add(key(r, c)))
        const pts = baseScore(g.maxRun) + SCORE.overlapExtra * (g.cells.length - g.maxRun)
        points += pts
        const sp = specialFor(g, chain === 0 ? [b, a] : [])
        if (sp) { created.push({ r: sp.at[0], c: sp.at[1], color: g.color, special: sp.special }); }
        groupsOut.push({ cells: g.cells, size: g.maxRun, cross: g.cross, color: g.color, points: pts, special: sp ? sp.special : null })
      }
      expand(state, set, effects, triggered)
    }
    chain += 1
    if (chain > 1) points += SCORE.cascade * (chain - 1)
    const crystalsHit = [...set].filter((k) => { const t = B[Math.floor(k / COLS)][k % COLS]; return isGem(t) }).length
    const matchedCount = groupsOut.reduce((n, g) => n + g.cells.length, 0)
    if (effects.length) points += SCORE.perEffectCrystal * Math.max(0, crystalsHit - matchedCount)
    state.progress.bestChain = Math.max(state.progress.bestChain, chain)
    const res = clearCells(state, set, { createdAt: created })
    state.score += points
    steps.push({ type: 'clear', chain, combo, label, points, groups: groupsOut, effects, created: res.created, cleared: res.cleared, blockHits: res.blockHits, brokenBlocks: res.brokenBlocks, iceHits: res.iceHits, after: snapshot(state) })
    // fall, refill, collect treasures; repeat until nothing more is collected
    for (let guard = 0; guard < 8; guard += 1) {
      const g = gravity(state)
      steps.push(g)
      const items = collectTreasure(state)
      if (!items.length) break
      steps.push({ type: 'collect', items, after: snapshot(state) })
    }
  }

  // stable board: make sure a move exists
  if (!hasValidMove(state)) {
    const rs = reshuffle(state)
    if (rs) steps.push(rs)
  }
  // outcome
  const met = objectivesMet(state)
  if (met) {
    const bonus = { complete: SCORE.complete, moves: state.moves * SCORE.perMoveLeft, movesLeft: state.moves }
    bonus.total = bonus.complete + bonus.moves
    state.lastBonus = bonus
    state.score += bonus.total
    state.status = 'won'
    steps.push({ type: 'end', status: 'won', bonus, after: snapshot(state) })
  } else if (state.moves <= 0) {
    state.status = 'failed'
    steps.push({ type: 'end', status: 'failed', after: snapshot(state) })
  }
  return { valid: true, steps }
}

/** Stars for a won level: 1 for finishing, 2 with at least a quarter of the moves left, 3 with at least half left. */
export function starsFor(state) {
  if (state.status !== 'won') return 0
  const left = state.moves / state.level.moves
  return left >= 0.5 ? 3 : left >= 0.25 ? 2 : 1
}

/** How many of each power-up are on the board right now (for the "active power-ups" display). */
export function activePowerUps(state) {
  const n = { rocket: 0, bomb: 0, rainbow: 0 }
  for (const row of state.board) for (const t of row) if (t && t.special) n[t.special === 'bomb' ? 'bomb' : t.special === 'rainbow' ? 'rainbow' : 'rocket'] += 1
  return n
}
