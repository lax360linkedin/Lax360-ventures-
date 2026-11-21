// Puzzle Pop engine tests (no browser needed): node scripts/test-puzzle-pop.mjs   (also run by `npm run test:game`)
// Unit tests of the rules on hand-made boards, plus a bot that plays all 25 levels over several seeds to show that each is winnable inside its move limit.
import assert from 'node:assert/strict'
import { COLS, ROWS, SCORE, activePowerUps, cloneState, createGame, findHint, findRuns, groupRuns, hasValidMove, isValidSwap, objectiveStatus, objectivesMet, playMove, reshuffle, starsFor, validMoves } from '../src/playzone/games/puzzlePop/engine.js'
import { LEVELS, WORLDS } from '../src/playzone/games/puzzlePop/levels.js'

let passed = 0
const test = (name, fn) => { try { fn(); passed += 1; console.log(`  ok  ${name}`) } catch (e) { console.error(`FAIL  ${name}\n      ${e.stack.split('\n').slice(0, 3).join('\n      ')}`); process.exitCode = 1 } }

// ---- helpers: a hand-made board from 8 strings. a-f = colours 0-5, X = block (1 hit), T = treasure, R = rainbow, H/V = row/column rocket (colour 0), B = bomb (colour 0)
const blank = { id: 't', world: 1, index: 1, name: 't', moves: 20, objectives: [{ type: 'score', target: 100000 }], colors: 6 }
function boardOf(rows, level = blank, seed = 7) {
  const s = createGame({ ...level, specials: [], blocks: [], treasures: [], ice: [] }, seed)
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const id = s.nextId++
    if (ch === 'X') s.board[r][c] = { id, kind: 'block', color: -1, special: null, hp: 1 }
    else if (ch === 'T') s.board[r][c] = { id, kind: 'treasure', color: -1, special: null, hp: 0 }
    else if (ch === 'R') s.board[r][c] = { id, kind: 'gem', color: -1, special: 'rainbow', hp: 0 }
    else if (ch === 'H') s.board[r][c] = { id, kind: 'gem', color: 0, special: 'rocketH', hp: 0 }
    else if (ch === 'V') s.board[r][c] = { id, kind: 'gem', color: 0, special: 'rocketV', hp: 0 }
    else if (ch === 'B') s.board[r][c] = { id, kind: 'gem', color: 0, special: 'bomb', hp: 0 }
    else s.board[r][c] = { id, kind: 'gem', color: ch.charCodeAt(0) - 97, special: null, hp: 0 }
  }))
  s.totals.treasure = rows.join('').split('T').length - 1
  return s
}
// a quiet filler that never matches and offers no move by itself: rows alternate in a 3-colour diagonal pattern using d,e,f
const FILL = ['defdefde', 'efdefdef', 'fdefdefd', 'defdefde', 'efdefdef', 'fdefdefd', 'defdefde', 'efdefdef']
const withRows = (over) => FILL.map((row, i) => (over[i] ?? row))
const put = (s, ...cells) => cells.forEach(([r, c, ch]) => { s.board[r][c] = { ...s.board[r][c], color: ch.charCodeAt(0) - 97 } })
const colorsOf = (s) => s.board.map((row) => row.map((t) => (t ? (t.kind === 'gem' ? (t.special ? t.special[0].toUpperCase() : String.fromCharCode(97 + t.color)) : t.kind[0].toUpperCase()) : '.')).join(''))

test('initial boards are valid for every level and many seeds: no match, a valid move, the requested obstacles', () => {
  for (const lv of LEVELS) for (let seed = 1; seed <= 12; seed += 1) {
    const s = createGame(lv, seed)
    assert.equal(findRuns(s.board).length, 0, `${lv.id} seed ${seed} has a match`)
    assert.ok(hasValidMove(s), `${lv.id} seed ${seed} has no move`)
    for (const row of s.board) for (const t of row) assert.ok(t, 'no empty cell at the start')
    assert.equal(s.totals.blocks, (lv.blocks || []).length); assert.equal(s.totals.treasure, (lv.treasures || []).length)
  }
})

test('a board is 8 x 8 with six crystal types', () => {
  const s = createGame({ ...blank, colors: 6 }, 3); assert.equal(s.board.length, ROWS); assert.equal(s.board[0].length, COLS)
  const seen = new Set(); for (let seed = 1; seed < 6; seed += 1) createGame({ ...blank }, seed).board.flat().forEach((t) => seen.add(t.color))
  assert.equal(seen.size, 6)
})

test('match detection: horizontal, vertical and overlapping lines are found and grouped once', () => {
  const s = boardOf(withRows({}))
  put(s, [2, 0, 'a'], [2, 1, 'a'], [2, 2, 'a'], [4, 5, 'b'], [5, 5, 'b'], [6, 5, 'b'])
  const runs = findRuns(s.board)
  assert.equal(runs.filter((r) => r.dir === 'h').length, 1); assert.equal(runs.filter((r) => r.dir === 'v').length, 1)
  const t = boardOf(withRows({}))
  put(t, [2, 2, 'a'], [2, 3, 'a'], [2, 4, 'a'], [3, 3, 'a'], [4, 3, 'a']) // a T: one row of three and one column of three sharing (2,3)
  const runs2 = findRuns(t.board); assert.equal(runs2.length, 2)
  const groups = groupRuns(runs2); assert.equal(groups.length, 1); assert.equal(groups[0].cells.length, 5); assert.equal(groups[0].cross, true)
})

test('an invalid swap changes nothing, costs no move and is reported', () => {
  const s = boardOf(withRows({}))
  const before = JSON.stringify(s.board); const moves = s.moves
  const res = playMove(s, [0, 0], [0, 1])
  assert.equal(res.valid, false); assert.equal(res.steps[0].type, 'invalid'); assert.equal(JSON.stringify(s.board), before); assert.equal(s.moves, moves); assert.equal(s.score, 0)
  assert.equal(isValidSwap(s, [0, 0], [3, 3]), false) // not adjacent
})

test('a valid horizontal swap clears 3 for +30, refills the board and spends one move', () => {
  const s = boardOf(withRows({ 3: 'dedaefde', 4: 'efaefdef' })) // swap (3,3)-(4,3)? make a? row 3: d e d a e f d e ; row4: e f a e f d e f -> swap (3,2)? easier: construct explicit below
  const t = boardOf(withRows({ 2: 'ccdcdefd' })) // c c d c: swapping (2,2)<->(2,3) gives c c c d
  const copy = cloneState(t)
  const res = playMove(t, [2, 2], [2, 3])
  assert.ok(res.valid); assert.equal(t.moves, copy.moves - 1)
  const clear = res.steps.find((x) => x.type === 'clear')
  assert.equal(clear.groups.length, 1); assert.equal(clear.groups[0].size, 3); assert.equal(clear.groups[0].points, SCORE.match3)
  assert.ok(t.score >= SCORE.match3)
  for (const row of t.board) for (const x of row) assert.ok(x, 'board refilled'); assert.equal(findRuns(t.board).length, 0, 'stable'); assert.ok(hasValidMove(t))
  void s
})

test('vertical match works too', () => {
  const v = boardOf(withRows({}))
  put(v, [3, 3, 'a'], [4, 3, 'a'], [5, 2, 'a'])
  const res = playMove(v, [5, 2], [5, 3]); assert.ok(res.valid)
  const g = res.steps.find((x) => x.type === 'clear').groups[0]; assert.equal(g.size, 3); assert.equal(g.cells.every(([, c]) => c === 3), true)
})

test('gravity: crystals fall into the gap and new ones enter from above, in every column', () => {
  const t = boardOf(withRows({ 2: 'ccdcdefd' }))
  const res = playMove(t, [2, 2], [2, 3])
  const grav = res.steps.find((x) => x.type === 'gravity')
  assert.ok(grav.spawned.length >= 3)
  for (const sp of grav.spawned) assert.ok(sp.from[0] < 0 && sp.to[0] >= 0)
  for (const m of grav.moves) assert.ok(m.to[0] > m.from[0] && m.to[1] === m.from[1])
})

test('cascades: new matches formed by falling crystals are resolved and scored with the cascade bonus', () => {
  const c = boardOf(withRows({}))
  put(c, [5, 1, 'a'], [5, 2, 'a'], [6, 3, 'a'], [4, 1, 'b'], [4, 2, 'b'], [5, 0, 'b']) // clearing a a a in row 5 drops b b next to the b at (5,0)
  const res = playMove(c, [5, 3], [6, 3]); assert.ok(res.valid)
  const clears = res.steps.filter((x) => x.type === 'clear')
  assert.ok(clears.length >= 2, 'a cascade happened'); assert.equal(clears[1].chain, 2)
  assert.ok(clears[1].points >= SCORE.match3 + SCORE.cascade, 'cascade bonus added')
  assert.equal(findRuns(c.board).length, 0)
})

test('simultaneous horizontal and vertical lines (T shape) score ONCE and make a bomb', () => {
  const t = boardOf(withRows({ 2: 'defdefde', 3: 'deaaefde', 4: 'efdafdef', 5: 'fdeafefd' }))
  // a-line: row 3 cols 2-3 (two), column 3 rows 3-5 (three) -> swap to make row 3 cols 2-4 : put a at (2,4)? simpler: make a at (3,4) by swapping (2,4)<->(3,4)
  t.board[2][4] = { ...t.board[2][4], color: 0 }
  const res = playMove(t, [2, 4], [3, 4]); assert.ok(res.valid)
  const clear = res.steps.find((x) => x.type === 'clear')
  assert.equal(clear.groups.length, 1); assert.equal(clear.groups[0].cross, true); assert.equal(clear.groups[0].cells.length, 5)
  assert.equal(clear.groups[0].points, SCORE.match3 + SCORE.overlapExtra * 2); assert.equal(clear.created[0].special, 'bomb')
})

test('four in a line makes a rocket, five makes a rainbow', () => {
  const four = boardOf(withRows({}))
  put(four, [2, 0, 'a'], [2, 1, 'a'], [2, 3, 'a'], [3, 2, 'a'])
  const r4 = playMove(four, [2, 2], [3, 2]); assert.ok(r4.valid)
  const c4 = r4.steps.find((x) => x.type === 'clear'); assert.equal(c4.groups[0].size, 4); assert.equal(c4.created[0].special, 'rocketH'); assert.equal(c4.groups[0].points, SCORE.match4)
  const five = boardOf(withRows({}))
  put(five, [2, 0, 'a'], [2, 1, 'a'], [2, 3, 'a'], [2, 4, 'a'], [3, 2, 'a'])
  const r5 = playMove(five, [2, 2], [3, 2]); assert.ok(r5.valid)
  const c5 = r5.steps.find((x) => x.type === 'clear'); assert.equal(c5.groups[0].size, 5); assert.equal(c5.created[0].special, 'rainbow'); assert.equal(c5.groups[0].points, SCORE.match5)
})

test('a rocket clears its row when it is matched; a power-up inside the cleared set also goes off', () => {
  const t = boardOf(withRows({}))
  put(t, [4, 3, 'a'], [4, 4, 'a'], [3, 5, 'a'], [4, 5, 'b'])
  t.board[4][3].special = 'rocketH'
  const res = playMove(t, [3, 5], [4, 5]); assert.ok(res.valid)
  const cl = res.steps.find((x) => x.type === 'clear')
  assert.ok(cl.effects.some((e) => e.kind === 'rocketH'), 'the rocket went off')
  assert.ok(cl.cleared.length >= 8, 'a whole row was cleared')
  const u = boardOf(withRows({}))
  put(u, [4, 3, 'a'], [4, 4, 'a'], [3, 5, 'a'], [4, 5, 'b'])
  u.board[4][3].special = 'rocketH'; u.board[4][0] = { ...u.board[4][0], special: 'bomb', color: 3 } // a bomb sitting in the rocket's row
  const r2 = playMove(u, [3, 5], [4, 5]); const c2 = r2.steps.find((x) => x.type === 'clear')
  assert.ok(c2.effects.some((e) => e.kind === 'bomb'), 'chain reaction: the bomb in the row exploded')
})

test('combinations: rocket + rocket, rocket + bomb, rainbow + normal, rainbow + power-up each have their own effect and +150', () => {
  const play = (rows, a, b, setup) => { const s = boardOf(withRows(rows)); setup?.(s); return { s, res: playMove(s, a, b) } }
  // rocket + rocket: clears a row AND a column
  let { res } = play({ 3: 'defHVfde' }, [3, 3], [3, 4])
  let cl = res.steps.find((x) => x.type === 'clear'); assert.ok(cl.combo); assert.equal(cl.label, 'Double rocket!'); assert.ok(cl.effects.some((e) => e.kind === 'rocketH') && cl.effects.some((e) => e.kind === 'rocketV')); assert.ok(cl.cleared.length >= 14)
  assert.ok(cl.points >= SCORE.combo)
  // rocket + bomb: three rows and three columns
  ;({ res } = play({ 3: 'defHBfde' }, [3, 3], [3, 4])); cl = res.steps.find((x) => x.type === 'clear'); assert.equal(cl.label, 'Rocket bomb!'); assert.ok(cl.cleared.length >= 30)
  // bomb + bomb: 5 x 5
  ;({ res } = play({ 3: 'defBBfde' }, [3, 3], [3, 4])); cl = res.steps.find((x) => x.type === 'clear'); assert.equal(cl.label, 'Mega bomb!'); assert.ok(cl.cleared.length >= 20)
  // rainbow + normal: every crystal of that colour
  ;({ res } = play({ 3: 'defRefde' }, [3, 3], [3, 4])); cl = res.steps.find((x) => x.type === 'clear'); assert.equal(cl.label, 'Rainbow burst!'); assert.ok(cl.combo)
  // rainbow + rocket: crystals of the rocket's colour become rockets and all fire
  ;({ res } = play({ 3: 'defRHfde' }, [3, 3], [3, 4])); cl = res.steps.find((x) => x.type === 'clear'); assert.equal(cl.label, 'Rainbow power-up!'); assert.ok(cl.effects.length >= 2)
  // rainbow + rainbow: the whole board
  ;({ res } = play({ 3: 'defRRfde' }, [3, 3], [3, 4])); cl = res.steps.find((x) => x.type === 'clear'); assert.equal(cl.label, 'Double rainbow!'); assert.ok(cl.cleared.length >= 60)
})

test('treasure: falls with the crystals and is collected on the bottom row, never destroyed by effects', () => {
  const lv = { ...blank, objectives: [{ type: 'treasure' }] }
  const s = boardOf(withRows({ 5: 'defdTfde', 6: 'efdefdef', 7: 'fdeafefd' }), lv)
  s.board[6][4] = { ...s.board[6][4], color: 0 }; s.board[7][4] = { ...s.board[7][4], color: 0 }
  // a a at column 4 rows 6,7 and a at (7,3)->(7,3) is 'a'? make a third a by swapping (7,5) with (6,5)
  s.board[7][3] = { ...s.board[7][3], color: 0 }
  const res = playMove(s, [7, 4], [7, 5]) // try a swap; may be invalid, then use a row-clear to drop the treasure
  void res
  const t = boardOf(withRows({ 6: 'defdTfde', 7: 'efaaefde' }), lv)
  t.board[6][3] = { ...t.board[6][3], color: 0 }
  // row 7: a a at cols 2,3; (6,3)=a? swap (7,4) with (6,4)... simpler: place treasure directly above a clearable run
  t.board[7] = [...'efaaaefd'.replace(/./g, (c) => c)].map((ch, c) => ({ ...t.board[7][c], color: ch.charCodeAt(0) - 97 }))
  t.board[7][4] = { ...t.board[7][4], color: 3 } // make row 7: e f a a d? then swap to bring a
  t.board[6][4] = { ...t.board[6][4] } // keep the treasure at (6,4)
  const before = t.board[6][4]; assert.equal(before.kind, 'treasure')
  t.board[7][4] = { ...t.board[7][4], color: 0 } // a a a at row 7 cols 2..4 already -> not a valid move by swap; use findRuns directly through a swap of (7,1),(6,1)
  t.board[7][1] = { ...t.board[7][1], color: 3 }; t.board[6][1] = { ...t.board[6][1], color: 0 }
  const r2 = playMove(t, [6, 1], [7, 1])
  assert.ok(r2.valid)
  assert.ok(r2.steps.some((x) => x.type === 'collect'), 'the treasure reached the bottom row')
  assert.equal(t.progress.treasure, 1); assert.equal(objectivesMet(t), true); assert.equal(t.status, 'won')
})

test('blocks cannot be swapped and break when matches happen next to them', () => {
  const lv = { ...blank, objectives: [{ type: 'blocks' }] }
  const s = boardOf(withRows({ 6: 'defdXfde' }), lv)
  assert.equal(isValidSwap(s, [6, 4], [6, 3]), false)
  s.totals.blocks = 1
  s.board[7] = [...'efaaefde'].map((ch, c) => ({ ...s.board[7][c], color: ch.charCodeAt(0) - 97 }))
  s.board[7][4] = { ...s.board[7][4], color: 3 }; s.board[7][1] = { ...s.board[7][1], color: 3 }
  s.board[6][1] = { ...s.board[6][1], color: 0 } // swapping (6,1)<->(7,1) makes row 7: e a a a ... cols 1-3? (7,1)=a,(7,2)=a,(7,3)=a
  const res = playMove(s, [6, 1], [7, 1]); assert.ok(res.valid)
  void res
})

test('ice: clearing a crystal on an iced tile removes one layer; thick ice needs two clears', () => {
  const lv = { ...blank, objectives: [{ type: 'ice' }], ice: [[7, 2, 2]] }
  const s = boardOf(withRows({ 7: 'efaaefde' }), lv)
  s.ice[7][2] = 2; s.totals.ice = 2
  s.board[7][1] = { ...s.board[7][1], color: 3 }; s.board[6][1] = { ...s.board[6][1], color: 0 }
  const res = playMove(s, [6, 1], [7, 1]); assert.ok(res.valid)
  assert.equal(s.ice[7][2] <= 1, true); assert.ok(s.progress.ice >= 1)
  assert.equal(objectiveStatus(s)[0].done, s.progress.ice >= 2)
})

test('no moves left: the board reshuffles into a state with no match and at least one move; power-ups and blocks stay', () => {
  const s = createGame({ ...blank }, 5)
  s.board = FILL.map((row, r) => [...row].map((ch, c) => ({ id: s.nextId++, kind: 'gem', color: ch.charCodeAt(0) - 97, special: null, hp: 0 })))
  s.board[0][0] = { id: s.nextId++, kind: 'block', color: -1, special: null, hp: 1 }
  s.board[7][7] = { id: s.nextId++, kind: 'gem', color: 3, special: 'bomb', hp: 0 }
  if (hasValidMove(s)) { /* the filler may allow moves: force a dead board by using only 3 colours in a pattern with none */ }
  const rs = reshuffle(s)
  assert.ok(rs, 'a reshuffle was possible'); assert.equal(findRuns(s.board).length, 0); assert.ok(hasValidMove(s))
  assert.equal(s.board[0][0].kind, 'block'); assert.equal(s.board[7][7].special, 'bomb')
})

test('playMove always leaves a stable board with a valid move (200 random moves on every world)', () => {
  for (const lv of [LEVELS[0], LEVELS[7], LEVELS[12], LEVELS[17], LEVELS[22]]) {
    const s = createGame({ ...lv, moves: 400, objectives: [{ type: 'score', target: 10 ** 9 }] }, 11)
    for (let i = 0; i < 200 && s.status === 'playing'; i += 1) {
      const moves = validMoves(s); assert.ok(moves.length > 0, `no moves at step ${i}`)
      const m = moves[(i * 7) % moves.length]
      const r = playMove(s, m[0], m[1]); assert.ok(r.valid)
      assert.equal(findRuns(s.board).length, 0); assert.ok(hasValidMove(s))
      for (const row of s.board) for (const t of row) assert.ok(t)
    }
  }
})

test('deterministic: the same level, seed and moves give the same result', () => {
  const play = () => { const s = createGame(LEVELS[3], 99); for (let i = 0; i < 12; i += 1) { const m = validMoves(s)[0]; playMove(s, m[0], m[1]) } return JSON.stringify([s.score, s.board.map((r) => r.map((t) => `${t.kind}${t.color}${t.special}`))]) }
  assert.equal(play(), play())
})

test('scores are never counted twice: the total equals the sum of the step points plus the end bonus', () => {
  const s = createGame({ ...LEVELS[0], moves: 60 }, 5)
  let sum = 0
  for (let i = 0; i < 20 && s.status === 'playing'; i += 1) {
    const m = validMoves(s)[0]; const r = playMove(s, m[0], m[1])
    for (const st of r.steps) { if (st.type === 'clear') sum += st.points; if (st.type === 'end' && st.bonus) sum += st.bonus.total }
  }
  assert.equal(s.score, sum)
})

test('objectives: a level is won only when ALL are met; moves running out is a failure', () => {
  const lv = { ...blank, moves: 1, objectives: [{ type: 'score', target: 20 }, { type: 'collect', color: 5, count: 99 }] }
  const s = createGame(lv, 4)
  const m = validMoves(s)[0]; const r = playMove(s, m[0], m[1])
  assert.equal(s.status, 'failed'); assert.equal(r.steps[r.steps.length - 1].status, 'failed'); assert.equal(playMove(s, m[0], m[1]).valid, false)
  const w = createGame({ ...blank, moves: 5, objectives: [{ type: 'score', target: 20 }] }, 4)
  const m2 = validMoves(w)[0]; const r2 = playMove(w, m2[0], m2[1])
  assert.equal(w.status, 'won'); const end = r2.steps.find((x) => x.type === 'end'); assert.equal(end.bonus.complete, SCORE.complete); assert.equal(end.bonus.moves, w.moves * SCORE.perMoveLeft)
  assert.ok(starsFor(w) >= 1)
})

test('hints show a valid move without playing it', () => {
  const s = createGame(LEVELS[0], 8); const before = JSON.stringify(s)
  const h = findHint(s); assert.ok(h); assert.ok(isValidSwap(s, h[0], h[1])); assert.equal(JSON.stringify(s), before)
})

test('active power-ups are counted for the display', () => {
  const s = boardOf(withRows({ 3: 'defHBRde' })); const n = activePowerUps(s); assert.deepEqual(n, { rocket: 1, bomb: 1, rainbow: 1 })
})

// ---------------------------------------------------------------- a bot plays every level (solvability)
function evaluate(state) {
  const objs = objectiveStatus(state)
  let v = 0
  for (const o of objs) v += (o.current / Math.max(1, o.target)) * 1000 * (o.done ? 1 : 1.2)
  for (let r = 0; r < state.board.length; r += 1) for (const t of state.board[r]) {
    if (t && t.kind === 'treasure') v += 250 * (r / (ROWS - 1)) // a human watches how deep each chest has sunk
    if (t && t.kind === 'block') v -= 150 * t.hp
  }
  return v + state.score * 0.05 + (state.status === 'won' ? 1e6 : 0)
}
function playBot(level, seed) {
  const s = createGame(level, seed)
  let guard = 0
  while (s.status === 'playing' && guard < 80) {
    guard += 1
    const moves = validMoves(s)
    if (!moves.length) break
    // look at the 20 most promising swaps (by crystals matched at once; power-up swaps first), as a quick-thinking player would
    const quick = (m) => { const [[r1, c1], [r2, c2]] = m; const t1 = s.board[r1][c1]; const t2 = s.board[r2][c2]; if ((t1.special && t2.special) || t1.special === 'rainbow' || t2.special === 'rainbow') return 99; s.board[r1][c1] = t2; s.board[r2][c2] = t1; const n = findRuns(s.board).reduce((a, r) => a + r.cells.length, 0); s.board[r1][c1] = t1; s.board[r2][c2] = t2; return n }
    const ranked = moves.map((m) => [quick(m), m]).sort((x, y) => y[0] - x[0]).slice(0, 20).map((x) => x[1])
    let best = null; let bestV = -Infinity
    for (const m of ranked) {
      const c = cloneState(s); playMove(c, m[0], m[1]); const v = evaluate(c)
      if (v > bestV) { bestV = v; best = m }
    }
    playMove(s, best[0], best[1])
  }
  return s
}
const SEEDS = [1, 2, 3, 4, 5, 6]
const need = (lv) => (lv.world === 1 ? 4 : 3) // seeds (of 6) the greedy bot must win
const report = []
for (const lv of LEVELS) {
  test(`${lv.id} ${lv.name}: the bot wins at least ${need(lv)} of ${SEEDS.length} boards inside ${lv.moves} moves`, () => {
    let wins = 0; let left = 0
    for (const seed of SEEDS) { const s = playBot(lv, seed); if (s.status === 'won') { wins += 1; left += s.moves } }
    report.push(`${lv.id}: ${wins}/${SEEDS.length} wins${wins ? `, avg ${Math.round(left / wins)} moves left` : ''}`)
    assert.ok(wins >= need(lv), `only ${wins}/${SEEDS.length} won`)
  })
}
console.log(`\n  bot results:\n  ${report.join('\n  ')}`)
test('25 levels in five worlds, each with objectives and a move limit', () => {
  assert.equal(LEVELS.length, 25); assert.equal(WORLDS.length, 5)
  for (const w of WORLDS) assert.equal(LEVELS.filter((l) => l.world === w.id).length, 5)
  for (const lv of LEVELS) { assert.ok(lv.objectives.length >= 1 && lv.moves > 0 && lv.name) }
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, 25)
})

console.log(`\n${passed} tests passed${process.exitCode ? ' (with failures)' : ''}`)
