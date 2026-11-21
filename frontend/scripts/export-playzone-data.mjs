// Exports the Play Zone level data and scoring fixtures to the backend, so the server verifies results against the SAME definitions the games use.
//   node scripts/export-playzone-data.mjs     (writes backend/app/play_zone/data/*.json and backend/tests/fixtures/play_zone_fixtures.json)
// Run it again whenever a level, a score formula or the Puzzle Pop engine changes, then run the backend tests: they replay these fixtures through the Python code.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as puzzle from '../src/playzone/games/puzzlePop/engine.js'
import { LEVELS as PUZZLE_LEVELS } from '../src/playzone/games/puzzlePop/levels.js'
import { LEVELS as JUMP_LEVELS } from '../src/playzone/games/laxbotJump/levels.js'
import * as jump from '../src/playzone/games/laxbotJump/logic.js'
import { SCORING as JUMP_SCORING, LIVES as JUMP_LIVES } from '../src/playzone/games/laxbotJump/config.js'
import { LEVELS as BUG_LEVELS } from '../src/playzone/games/bugHunter/levels.js'
import * as bug from '../src/playzone/games/bugHunter/logic.js'
import { SCORE as BUG_SCORE, MAX_HEALTH, LIVES as BUG_LIVES, WALK_SPEED, SPRINT_SPEED } from '../src/playzone/games/bugHunter/config.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend')
const data = resolve(root, 'app/play_zone/data')
const fixtures = resolve(root, 'tests/fixtures')
mkdirSync(data, { recursive: true }); mkdirSync(fixtures, { recursive: true })
const write = (p, obj) => writeFileSync(p, `${JSON.stringify(obj, null, 1)}\n`)

// ---- Puzzle Pop: the level definitions as the engine reads them, plus replay fixtures ----
write(resolve(data, 'puzzle_levels.json'), PUZZLE_LEVELS)
const puzzleFix = []
for (const [i, lv] of PUZZLE_LEVELS.entries()) {
  if (i % 2 && i > 3) continue // a spread of levels is enough for the cross-check
  for (const seed of [11, 4242]) {
    const s = puzzle.createGame(lv, seed)
    const moves = []
    while (s.status === 'playing' && moves.length < 60) {
      const h = i % 3 === 0 ? puzzle.findHint(s) : puzzle.validMoves(s)[(moves.length * 7) % Math.max(1, puzzle.validMoves(s).length)]
      if (!h) break
      puzzle.playMove(s, h[0], h[1]); moves.push(h)
    }
    puzzleFix.push({ level: lv.id, seed, moves, score: s.score, status: s.status, movesLeft: s.moves, stars: puzzle.starsFor(s), progress: s.progress })
  }
}

// ---- LAXBOT Jump ----
const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2])
const jumpLevels = JUMP_LEVELS.map((l) => ({ id: l.id, index: l.index, par: l.par, coins: l.coins.length, crystals: l.crystals.length, stars: l.stars.length, checkpoints: l.checkpoints.length, distance: dist(l.start, l.finish), world: l.world }))
write(resolve(data, 'jump_levels.json'), { levels: jumpLevels, scoring: JUMP_SCORING, lives: JUMP_LIVES })
const jumpFix = []
for (const l of JUMP_LEVELS) for (const [coins, crystals, stars, lives, t] of [[0, 0, 0, 3, l.par + 10], [Math.floor(l.coins.length / 2), 1, 0, 2, l.par - 20.5], [l.coins.length, l.crystals.length, l.stars.length, 3, l.par / 2]]) {
  const g = jump.createGame(l); g.coins = coins; g.crystals = crystals; g.stars = stars; g.lives = lives; g.t = t; g.done = true; g.reason = 'complete'
  const s = jump.summary(g)
  jumpFix.push({ level: l.id, coins, crystals, stars, lives, time: t, score: s.score, rating: s.rating, parts: s.parts })
}

// ---- Bug Hunter ----
const bugLevels = BUG_LEVELS.map((l) => {
  const g = bug.createGame(l)
  const byType = { normal: 0, speed: 0, rare: 0, shield: 0 }
  for (const d of l.bugs || []) byType[d.type] += 1
  for (const w of l.waves || []) for (const d of w) byType[d.type] += 1
  const need = l.objectives.captures === 'all' ? g.totalBugs : l.objectives.captures
  const rep = l.objectives.repairs === 'all' ? l.stations.length : l.objectives.repairs
  return { id: l.id, world: l.world, par: l.par, byType, totalBugs: g.totalBugs, needCaptures: need, stations: l.stations.length, needRepairs: rep, boss: l.boss ? l.boss.kind : null, orbs: (l.orbs || []).length, challenge: l.challenge, distance: dist(l.start, l.exit) }
})
write(resolve(data, 'bug_levels.json'), { levels: bugLevels, score: BUG_SCORE, maxHealth: MAX_HEALTH, lives: BUG_LIVES, walk: WALK_SPEED, sprint: SPRINT_SPEED })
const bugFix = []
for (const l of BUG_LEVELS) {
  const info = bugLevels.find((x) => x.id === l.id)
  for (const [capAll, healthLeft, t, challenge] of [[true, 5, l.par - 30, true], [false, 2, l.par + 40, false], [true, 3, l.par + 5, false]]) {
    const g = bug.createGame(l)
    const byType = capAll ? { ...info.byType } : { normal: Math.max(0, info.byType.normal - 1), speed: 0, rare: 0, shield: 0 }
    const captured = Object.values(byType).reduce((a, b) => a + b, 0)
    g.stats.captured = captured; g.stats.byType = { ...byType }; g.stats.repairs = info.stations; g.stats.orbs = info.orbs; g.stats.deaths = 0; g.stats.damage = challenge ? 0 : 2; g.stats.bossDefeated = !!l.boss
    g.score.bugs = Object.entries(byType).reduce((a, [k, n]) => a + n * BUG_SCORE[k], 0); g.score.repairs = info.stations * BUG_SCORE.repair; g.score.boss = l.boss ? BUG_SCORE.boss : 0; g.score.orbs = info.orbs * BUG_SCORE.orb
    g.health = healthLeft; g.t = challenge && l.challenge.kind === 'time' ? Math.min(t, l.challenge.seconds - 1) : t; g.done = true; g.reason = 'complete'
    const s = bug.summary(g)
    bugFix.push({ level: l.id, byType, repairs: info.stations, orbs: info.orbs, boss: !!l.boss, health: healthLeft, lives: g.lives, deaths: 0, damage: g.stats.damage, time: g.t, score: s.score, stars: s.stars, challengeMet: s.challengeMet, parts: s.parts })
  }
}

write(resolve(fixtures, 'play_zone_fixtures.json'), { puzzle: puzzleFix, jump: jumpFix, bug: bugFix })
console.log(`exported ${PUZZLE_LEVELS.length} puzzle levels, ${JUMP_LEVELS.length} jump levels, ${BUG_LEVELS.length} bug levels; fixtures: ${puzzleFix.length} puzzle, ${jumpFix.length} jump, ${bugFix.length} bug`)
void WALK_SPEED; void SPRINT_SPEED
