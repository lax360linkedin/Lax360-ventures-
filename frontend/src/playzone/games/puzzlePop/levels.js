import { GEM_TYPES } from './engine.js'

// The 25 levels of Puzzle Pop: five worlds of five. A level is DATA read by the engine: the move limit, the objectives (ALL must be met before the moves run out), the number of crystal
// colours, and the obstacles placed on the starting board. Boards are random (seeded) so every play differs; `npm run test:game` plays every level with a bot over many seeds to prove each
// one can be won inside its move limit.
//
// objectives: { type: 'score', target } · { type: 'collect', color, count } · { type: 'ice' } (clear every layer of ice) · { type: 'treasure' } (bring every chest to the bottom) ·
//             { type: 'blocks' } (break every block) · { type: 'special', count } (set off power-ups) · { type: 'combos', count } (special combinations) ·
//             { type: 'chain', size } (a cascade of this length in one move) · { type: 'rainbow', count } (set off rainbow crystals)
// obstacles:  ice: [[row, col, layers]] · blocks: [[row, col, hits]] · treasures: [[row, col]] · specials: [[row, col, 'rocketH' | 'rocketV' | 'bomb' | 'rainbow']] (placed at the start)

export const GEM_NAMES = ['Ruby', 'Sapphire', 'Emerald', 'Topaz', 'Amethyst', 'Rose quartz']
export const GEM_COLORS = ['#ff3b5c', '#3b82ff', '#22d36b', '#ffc933', '#a855f7', '#ff8fd0']

const rect = (r0, r1, c0, c1, layers = 1) => { const out = []; for (let r = r0; r <= r1; r += 1) for (let c = c0; c <= c1; c += 1) out.push([r, c, layers]); return out }
const checker = (r0, r1, layers = 1) => { const out = []; for (let r = r0; r <= r1; r += 1) for (let c = 0; c < 8; c += 1) if ((r + c) % 2 === 0) out.push([r, c, layers]); return out }

const L = (world, index, name, moves, objectives, extra = {}) => ({ id: `w${world}-l${index}`, world, index, name, moves, objectives, colors: 6, ...extra })

export const WORLDS = [
  { id: 1, key: 'garden', name: 'Crystal Garden', blurb: 'Learn the basics: match, collect and make your first power-ups.', accent: '#f9a8d4' },
  { id: 2, key: 'ocean', name: 'Ocean Treasure', blurb: 'Bring sunken chests to the surface and break the coral.', accent: '#5eead4' },
  { id: 3, key: 'frozen', name: 'Frozen Palace', blurb: 'Break the ice, layer by layer.', accent: '#bae6fd' },
  { id: 4, key: 'sky', name: 'Golden Sky', blurb: 'Few moves, big combos and power-up challenges.', accent: '#fcd34d' },
  { id: 5, key: 'galaxy', name: 'Galaxy Gems', blurb: 'Rainbow crystals and the final challenges.', accent: '#c4b5fd' },
]

export const LEVELS = [
  // ---- World 1: Crystal Garden (tutorial levels; hints are available) ----
  L(1, 1, 'First Sparkles', 14, [{ type: 'score', target: 1000 }], { colors: 5, hint: true, tip: 'Swap two neighbouring crystals so that three or more of the same colour line up.' }),
  L(1, 2, 'Ruby Rush', 14, [{ type: 'collect', color: 0, count: 14 }], { colors: 5, hint: true, tip: 'Collect ruby crystals: match them to clear them from the board.' }),
  L(1, 3, 'Twin Gems', 16, [{ type: 'collect', color: 1, count: 12 }, { type: 'collect', color: 2, count: 12 }], { colors: 6, hint: true, tip: 'Four in a line makes a Rocket crystal that clears a whole row or column.' }),
  L(1, 4, 'Garden Party', 16, [{ type: 'score', target: 2000 }, { type: 'collect', color: 3, count: 16 }], { hint: true, tip: 'Five in a line makes a Rainbow crystal. A T or L shape makes a Bomb.' }),
  L(1, 5, 'Bloom Master', 16, [{ type: 'score', target: 3000 }, { type: 'special', count: 3 }], { hint: true, tip: 'Match a power-up with other crystals, or swap it, to set it off.' }),

  // ---- World 2: Ocean Treasure ----
  L(2, 1, 'Pearl Dive', 26, [{ type: 'treasure' }], { treasures: [[4, 2], [4, 5]], tip: 'Clear the crystals under each chest so it sinks to the bottom row.' }),
  L(2, 2, 'Chest Hunt', 32, [{ type: 'treasure' }, { type: 'score', target: 1000 }], { treasures: [[3, 1], [4, 4], [3, 6]] }),
  L(2, 3, 'Coral Crunch', 20, [{ type: 'blocks' }], { blocks: [[5, 1, 1], [5, 3, 1], [5, 4, 1], [5, 6, 1]], tip: 'Matches next to a coral block chip it. A power-up can hit it too.' }),
  L(2, 4, 'Deep Reef', 28, [{ type: 'blocks' }, { type: 'treasure' }], { blocks: [[5, 1, 2], [5, 3, 2], [5, 5, 2], [4, 6, 2]], treasures: [[3, 2], [3, 5]] }),
  L(2, 5, 'Sunken Vault', 32, [{ type: 'treasure' }, { type: 'blocks' }, { type: 'score', target: 2200 }], { blocks: [[4, 1, 2], [4, 3, 1], [4, 4, 1], [4, 6, 2], [6, 2, 1]], treasures: [[2, 1], [2, 4], [3, 6]] }),

  // ---- World 3: Frozen Palace ----
  L(3, 1, 'Thin Ice', 20, [{ type: 'ice' }], { ice: rect(6, 7, 2, 5), tip: 'Clear a crystal that sits on ice to crack it. Clear every iced tile.' }),
  L(3, 2, 'Frost Field', 24, [{ type: 'ice' }], { ice: rect(5, 7, 1, 6) }),
  L(3, 3, 'Double Glaze', 30, [{ type: 'ice' }], { ice: rect(5, 6, 1, 6, 2), tip: 'Thick ice has two layers: it takes two clears.' }),
  L(3, 4, 'Ice Checkers', 28, [{ type: 'ice' }, { type: 'collect', color: 4, count: 12 }], { ice: checker(4, 7, 1) }),
  L(3, 5, 'Palace Vault', 36, [{ type: 'ice' }, { type: 'score', target: 2600 }], { ice: [...rect(4, 5, 0, 7, 1), ...rect(6, 7, 1, 6, 2)] }),

  // ---- World 4: Golden Sky (limited moves, combos, power-ups) ----
  L(4, 1, 'Spark Plug', 14, [{ type: 'special', count: 3 }], { specials: [[7, 3, 'rocketH']] }),
  L(4, 2, 'Chain Reaction', 15, [{ type: 'chain', size: 3 }, { type: 'score', target: 1500 }]),
  L(4, 3, 'Double Trouble', 16, [{ type: 'combos', count: 1 }, { type: 'score', target: 2000 }], { specials: [[7, 2, 'rocketH'], [7, 3, 'bomb']] }),
  L(4, 4, 'Power Hour', 18, [{ type: 'special', count: 6 }, { type: 'collect', color: 2, count: 14 }], { specials: [[7, 1, 'bomb'], [6, 5, 'rocketV']] }),
  L(4, 5, 'Sky High', 20, [{ type: 'combos', count: 2 }, { type: 'chain', size: 3 }, { type: 'score', target: 3000 }], { specials: [[7, 1, 'rocketH'], [7, 2, 'bomb'], [7, 5, 'rocketV'], [7, 6, 'bomb']] }),

  // ---- World 5: Galaxy Gems ----
  L(5, 1, 'Star Dust', 18, [{ type: 'score', target: 2800 }, { type: 'special', count: 4 }], { specials: [[7, 0, 'bomb'], [7, 7, 'rocketV']] }),
  L(5, 2, 'Rainbow Road', 20, [{ type: 'rainbow', count: 2 }, { type: 'collect', color: 5, count: 18 }], { specials: [[7, 1, 'rainbow'], [7, 6, 'rainbow']], tip: 'Swap a Rainbow crystal with any neighbour to clear that colour, or with a power-up for a bigger blast.' }),
  L(5, 3, 'Nebula Vault', 30, [{ type: 'ice' }, { type: 'blocks' }, { type: 'treasure' }], { ice: rect(5, 7, 2, 5, 1), blocks: [[4, 1, 1], [4, 6, 1]], treasures: [[3, 3], [3, 4]], specials: [[7, 3, 'rainbow']] }),
  L(5, 4, 'Comet Crash', 38, [{ type: 'combos', count: 2 }, { type: 'ice' }], { ice: rect(5, 7, 0, 7, 1), specials: [[7, 1, 'rainbow'], [7, 2, 'bomb'], [7, 5, 'rocketH'], [7, 6, 'rocketV']] }),
  L(5, 5, 'Galaxy Heart', 34, [{ type: 'score', target: 4500 }, { type: 'treasure' }, { type: 'ice' }, { type: 'blocks' }, { type: 'combos', count: 1 }], { ice: rect(5, 7, 1, 6, 1), blocks: [[4, 2, 1], [4, 5, 1], [6, 0, 1]], treasures: [[3, 1], [3, 6], [2, 3]], specials: [[7, 3, 'rainbow'], [7, 4, 'bomb']] }),
]

export const levelsOf = (world) => LEVELS.filter((l) => l.world === world)
export const levelById = (id) => LEVELS.find((l) => l.id === id)
void GEM_TYPES
