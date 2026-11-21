// The five cyber worlds of Bug Hunter: Cyber Rescue, one level each. A level is DATA read by the simulation: the arena, walls and platforms, hazards, bugs, repair stations, pickups,
// checkpoints, the exit and the objectives. `npm run test:game` plays every level with a bot (including both bosses) to show that each can be completed.
//
// solids: { x, z, w, d, y0, y1 } (a wall or platform; y1 is its top) · lifts: moving platforms { x, z, w, d, base, amp, speed } (top = base + amp sin) · barriers: electric walls that switch on and off
// lasers: bars that sweep { x, z, w, d, y, h, move } · currents: zones that push LAXBOT · bugs: { type, x, z, y?, patrol?, hidden? } · waves: groups of bugs that arrive one after another
// stations: { id, x, z, y?, puzzle, diff, requires? } · pickups: { kind, x, z, y? } · orbs: small energy orbs · checkpoints: [x, y, z] · objectives: { captures, repairs } (a number or 'all')

const wall = (x, z, w, d, h = 2.4) => ({ x, z, w, d, y0: 0, y1: h })
const plat = (x, z, top, w = 4.6, d = 4.6) => ({ x, z, w, d, y0: top - 0.8, y1: top })
const ring = (cx, cz, r, n, y = 0) => Array.from({ length: n }, (_, i) => ({ x: cx + Math.sin((i / n) * Math.PI * 2) * r, z: cz + Math.cos((i / n) * Math.PI * 2) * r, y }))

export const WORLDS = [
  { id: 1, key: 'garden', name: 'Code Garden', accent: '#4ade80' },
  { id: 2, key: 'circuit', name: 'Circuit City', accent: '#22d3ee' },
  { id: 3, key: 'ocean', name: 'Data Ocean', accent: '#38bdf8' },
  { id: 4, key: 'tower', name: 'Cyber Tower', accent: '#a78bfa' },
  { id: 5, key: 'core', name: 'Core Defender', accent: '#f472b6' },
]

const tower = [[0, 9, 1.1], [-6, 5, 2.2], [-6, -1, 3.3], [-1, -5, 4.4], [5, -3, 5.5], [8, 3, 6.6]]

export const LEVELS = [
  {
    id: 'code-garden', world: 1, index: 1, name: 'Seeds of Trouble', theme: 'garden', par: 120, size: 22, start: [0, 0, 16], seedBase: 3,
    story: 'Mischievous bugs are munching on the Code Garden. Catch them with your energy net and fix the broken sprinkler circuit.',
    tip: 'Move with W A S D, aim with the mouse (drag), click to throw the net when the ring around a bug turns green, and press E at the glowing console.',
    solids: [wall(-8, 4, 8, 1.2, 1.6), wall(8, -2, 1.2, 8, 1.6), wall(-9, -10, 6, 1.2, 1.6), wall(10, 9, 5, 1.2, 1.6)],
    bugs: [{ type: 'normal', x: -11, z: 7 }, { type: 'normal', x: 11, z: 10 }, { type: 'normal', x: -5, z: -7 }, { type: 'normal', x: 5, z: -11 }, { type: 'speed', x: 0, z: -14 }],
    stations: [{ id: 's1', x: 0, z: -4, puzzle: 'circuit', diff: 1, label: 'Sprinkler circuit' }],
    pickups: [{ kind: 'recharge', x: -3, z: 10 }, { kind: 'magnet', x: 12, z: 2 }],
    orbs: ring(0, 2, 6, 6), checkpoints: [[0, 0, 2]], exit: [0, 0, -19],
    objectives: { captures: 4, repairs: 'all' }, challenge: { kind: 'nodamage', text: 'Finish without taking damage' },
  },
  {
    id: 'circuit-city', world: 2, index: 2, name: 'Short Circuit', theme: 'circuit', par: 170, size: 26, start: [0, 0, 22], seedBase: 5,
    story: 'The streets of Circuit City are crackling. Electric barriers block the road and the bugs are on the move.',
    tip: 'Electric barriers flash before they switch on. Wait for them to go dark, or take the other doorway. Shield Bugs need two nets: the first breaks the shield.',
    solids: [wall(-17, 0, 18, 1.6, 3), wall(0, 0, 4, 1.6, 3), wall(17, 0, 18, 1.6, 3), wall(-16, 12, 1.2, 8), wall(16, 14, 1.2, 8), wall(-10, -12, 8, 1.2), wall(12, -14, 8, 1.2)],
    barriers: [{ x: -5, z: 0, w: 6, d: 1.6, h: 2.6, cycle: { on: 2.2, off: 2.8, offset: 0 } }, { x: 0, z: -9, w: 7, d: 1, h: 2.6, cycle: { on: 1.8, off: 3.2, offset: 1.2 } }],
    bugs: [{ type: 'normal', x: -12, z: 16 }, { type: 'normal', x: 12, z: 18 }, { type: 'speed', x: 0, z: 10 }, { type: 'speed', x: 8, z: 5 }, { type: 'normal', x: -8, z: -6 }, { type: 'rare', x: 14, z: -8 }, { type: 'shield', x: 10, z: 0, patrol: [[10, 8], [18, 8], [18, -4], [10, -4]] }, { type: 'normal', x: -16, z: -16 }],
    stations: [{ id: 's1', x: 0, z: 12, puzzle: 'circuit', diff: 2, label: 'Street-light circuit' }, { id: 's2', x: -4, z: -16, puzzle: 'switches', diff: 2, label: 'Power breakers' }],
    pickups: [{ kind: 'freeze', x: -4, z: 18 }, { kind: 'shield', x: 4, z: 6 }, { kind: 'speed', x: 6, z: -18 }, { kind: 'recharge', x: 0, z: -3 }],
    orbs: [...ring(0, 14, 5, 5), ...ring(0, -14, 5, 5)], checkpoints: [[0, 0, 16], [0, 0, -4]], exit: [0, 0, -23],
    objectives: { captures: 7, repairs: 'all' }, challenge: { kind: 'allbugs', text: 'Capture every bug' },
  },
  {
    id: 'data-ocean', world: 3, index: 3, name: 'Deep Data', theme: 'ocean', par: 260, size: 26, start: [0, 0, 22], seedBase: 7,
    story: 'Bugs are hiding in the Data Ocean tunnels, and the Glitch Crab has curled up around the core stream.',
    tip: 'Hidden bugs appear when you get close. Energy currents push you sideways. The Glitch Crab can only be netted while its weak point glows after an attack.',
    solids: [wall(-15, 14, 22, 1.4, 3), wall(15, 14, 22, 1.4, 3), wall(-11, 6, 12, 1.4, 3), wall(11, 6, 12, 1.4, 3), wall(-14, 0.5, 24, 1.6, 3), wall(14, 0.5, 24, 1.6, 3), wall(-20, -12, 1.2, 12, 3), wall(20, -12, 1.2, 12, 3)],
    currents: [{ x0: -26, x1: 26, z0: 8, z1: 13, fx: 9, fz: 0 }, { x0: -26, x1: 26, z0: 2, z1: 5, fx: -9, fz: 0 }],
    bugs: [{ type: 'normal', x: -14, z: 18, hidden: true }, { type: 'rare', x: 15, z: 19, hidden: true }, { type: 'speed', x: 0, z: 10 }, { type: 'normal', x: 12, z: 9, hidden: true }, { type: 'speed', x: -14, z: 3.5 }, { type: 'rare', x: 0, z: 3.5, hidden: true }],
    stations: [{ id: 's1', x: -6, z: 17, puzzle: 'align', diff: 2, label: 'Tunnel pathways' }, { id: 's2', x: 6, z: 17, puzzle: 'nodes', diff: 2, label: 'Server node' }],
    pickups: [{ kind: 'recharge', x: 0, z: 17 }, { kind: 'freeze', x: -2, z: 7.5 }, { kind: 'shield', x: 0, z: -5 }, { kind: 'recharge', x: 14, z: -6 }, { kind: 'magnet', x: -14, z: -4 }],
    orbs: [...ring(0, 17, 4, 4), ...ring(0, -8, 8, 6)], checkpoints: [[0, 0, 15], [0, 0, 0]], exit: [0, 0, -23],
    boss: { kind: 'crab', x: 0, z: -12 }, objectives: { captures: 'all', repairs: 'all' }, challenge: { kind: 'time', seconds: 250, text: 'Finish in under 4 minutes 10' },
  },
  {
    id: 'cyber-tower', world: 4, index: 4, name: 'Up the Tower', theme: 'tower', par: 220, size: 20, start: [0, 0, 16], seedBase: 9,
    story: 'The Cyber Tower is full of security lasers and clever bugs. Climb floor by floor and repair every stage.',
    tip: 'Press Space to jump between platforms. Jump over the sweeping security lasers. The repairs must be done in order, from the bottom up.',
    solids: tower.map(([x, z, top]) => plat(x, z, top)),
    lifts: [{ x: -13, z: 9, w: 3.2, d: 3.2, base: 1.7, amp: 1.2, speed: 1.2 }, { x: 12, z: 8, w: 3.2, d: 3.2, base: 4.2, amp: 1.5, speed: 1.0, phase: 1.5 }],
    lasers: [{ x: -6, z: -1, w: 4.4, d: 0.3, y: 3.4, h: 0.6, move: { axis: 'z', amp: 1.6, speed: 0.9 } }, { x: 5, z: -3, w: 0.3, d: 4.4, y: 5.6, h: 0.6, move: { axis: 'x', amp: 1.6, speed: 0.8, phase: 1 } }],
    bugs: [{ type: 'normal', x: 0, z: 9, y: 1.1 }, { type: 'speed', x: -6, z: 5, y: 2.2 }, { type: 'shield', x: -6, z: -1.5, y: 3.3 }, { type: 'rare', x: -1, z: -5, y: 4.4 }, { type: 'speed', x: 5, z: -3, y: 5.5 }, { type: 'shield', x: 8, z: 3, y: 6.6 }],
    stations: [{ id: 's1', x: 0, z: 10, y: 1.1, puzzle: 'power', diff: 1, label: 'Ground-floor power' }, { id: 's2', x: -6, z: 4, y: 2.2, puzzle: 'switches', diff: 2, label: 'Security breakers', requires: ['s1'] }, { id: 's3', x: 8, z: 4, y: 6.6, puzzle: 'nodes', diff: 2, label: 'Summit server', requires: ['s2'] }],
    pickups: [{ kind: 'recharge', x: 0, z: 8, y: 1.1 }, { kind: 'shield', x: -6, z: 6, y: 2.2 }, { kind: 'recharge', x: -1, z: -6, y: 4.4 }, { kind: 'freeze', x: 5, z: -2, y: 5.5 }],
    orbs: tower.map(([x, z, top]) => ({ x: x + 1.5, z: z + 1.2, y: top })), checkpoints: [[-6, 2.2, 5], [-1, 4.4, -5]], exit: [8, 6.6, 1.5],
    route: tower.map(([x, z, top]) => [x, top, z]),
    objectives: { captures: 'all', repairs: 'all' }, challenge: { kind: 'nodeath', text: 'Climb without losing a life' },
  },
  {
    id: 'core-defender', world: 5, index: 5, name: 'The Digital Core', theme: 'core', par: 320, size: 24, start: [0, 0, 20], seedBase: 11,
    story: 'The Core Corruptor has taken over the digital heart of LAX360 Digital City. Defeat the bug waves, repair the core and beat the Corruptor to restore the city.',
    tip: 'Watch the red warning before every attack. After an attack the Corruptor is dazed and its weak point glows: that is your moment to throw the net. Jump the sweeping beam.',
    solids: [wall(-9, 8, 2.4, 2.4, 3), wall(9, 8, 2.4, 2.4, 3), wall(-9, -2, 2.4, 2.4, 3), wall(9, -2, 2.4, 2.4, 3), wall(0, 14, 6, 1, 1.4)],
    bugs: [],
    waves: [
      [{ type: 'normal', x: -10, z: 12 }, { type: 'normal', x: 10, z: 12 }, { type: 'speed', x: 0, z: 6 }],
      [{ type: 'speed', x: -12, z: 4 }, { type: 'rare', x: 12, z: 4 }, { type: 'shield', x: 0, z: 2, patrol: [[-8, 2], [8, 2]] }],
      [{ type: 'shield', x: -10, z: -4, patrol: [[-10, -4], [-10, 6]] }, { type: 'rare', x: 10, z: -4 }, { type: 'speed', x: 0, z: -6 }, { type: 'normal', x: 0, z: 10 }],
    ],
    stations: [{ id: 's1', x: -5, z: 17, puzzle: 'circuit', diff: 3, label: 'Core circuit' }, { id: 's2', x: 5, z: 17, puzzle: 'power', diff: 2, label: 'Core power', requires: ['s1'] }],
    pickups: [{ kind: 'recharge', x: 0, z: 18 }, { kind: 'shield', x: -14, z: 8 }, { kind: 'freeze', x: 14, z: 8 }, { kind: 'magnet', x: -14, z: -2 }, { kind: 'recharge', x: 14, z: -2 }, { kind: 'recharge', x: 0, z: -16 }, { kind: 'shield', x: -16, z: -12 }, { kind: 'shield', x: 16, z: -12 }],
    orbs: ring(0, 4, 8, 8), checkpoints: [[0, 0, 12], [0, 0, 0]], exit: [0, 0, -21],
    boss: { kind: 'core', x: 0, z: -12 }, objectives: { captures: 'all', repairs: 'all' }, challenge: { kind: 'nodeath', text: 'Defeat the Corruptor without losing a life' },
  },
]

export const levelById = (id) => LEVELS.find((l) => l.id === id)
export const THEMES = {
  garden: { sky: ['#0b2a3a', '#1e6b6f', '#9ae6b4'], floor: '#0e3b3a', grid: '#4ade80', accent: '#4ade80', fog: '#134e4a' },
  circuit: { sky: ['#07061a', '#14123f', '#2a1f6b'], floor: '#0d0b2a', grid: '#22d3ee', accent: '#22d3ee', fog: '#14123f' },
  ocean: { sky: ['#021b3a', '#0b4f8a', '#38bdf8'], floor: '#06284a', grid: '#38bdf8', accent: '#38bdf8', fog: '#0b4f8a' },
  tower: { sky: ['#0a0524', '#2a1068', '#7a3fd0'], floor: '#160b3a', grid: '#a78bfa', accent: '#a78bfa', fog: '#2a1068' },
  core: { sky: ['#12031f', '#4a0f5e', '#f472b6'], floor: '#1e0830', grid: '#f472b6', accent: '#f472b6', fog: '#4a0f5e' },
}
