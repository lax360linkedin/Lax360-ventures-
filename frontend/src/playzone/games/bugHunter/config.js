// Bug Hunter: Cyber Rescue: the rules and tuning as data. Nothing here touches the screen, so the simulation (logic.js) is tested without a browser.
// World units: 1 unit is about one LAXBOT body width. y is up.

export const STEP = 1 / 60 // fixed simulation step: the game plays the same at any frame rate
export const MAX_FRAME = 0.1

// ---- LAXBOT ----
export const PLAYER = { radius: 0.4, height: 1.5, centerY: 0.8 }
export const WALK_SPEED = 6
export const SPRINT_SPEED = 9.4
export const ACCEL = 48
export const AIR_ACCEL = 24
export const GRAVITY = 28
export const JUMP_V = 9.6
export const MAX_HEALTH = 5
export const LIVES = 3
export const INVULNERABLE = 1.3 // after a hit
export const RESPAWN_DELAY = 1.1
export const RESPAWN_INVULNERABLE = 2.2

// ---- the energy net ----
export const MAX_ENERGY = 100
export const NET_COST = 20
export const NET_MISS_COST = 10 // throwing at nothing
export const NET_RANGE = 5.2
export const NET_RANGE_MAGNET = 8.5
export const NET_TRAVEL = 0.28 // seconds the net takes to reach the bug
export const NET_COOLDOWN_HIT = 0.35
export const NET_COOLDOWN_MISS = 0.75
export const ENERGY_REGEN = 6 // per second, after a short pause
export const ENERGY_REGEN_DELAY = 0.8
export const TARGET_CONE = 0.7 // radians either side of the camera direction (about 40 degrees)
export const TARGET_RANGE = 17

// ---- power-ups ----
export const POWERUPS = {
  magnet: { label: 'Magnetic Catcher', duration: 12, color: '#f472b6' },
  freeze: { label: 'Freeze Beam', duration: 7, color: '#7dd3fc' },
  shield: { label: 'Energy Shield', duration: 30, color: '#60a5fa' }, // absorbs ONE hit, or expires
  speed: { label: 'Speed Boost', duration: 10, color: '#fcd34d' },
  recharge: { label: 'Energy Recharge', duration: 0, color: '#4ade80' },
}
export const SPEED_BOOST = 1.5
export const FREEZE_RADIUS = 16

// ---- bugs ----
export const BUG_TYPES = {
  normal: { label: 'Normal Bug', points: 10, speed: 1.5, escapeSpeed: 2.3, detect: 8, radius: 0.55, capture: 1, color: '#4ade80' },
  speed: { label: 'Speed Bug', points: 20, speed: 3.4, escapeSpeed: 6.4, detect: 12, radius: 0.5, capture: 1, color: '#facc15', dodge: 0.3 },
  rare: { label: 'Rare Bug', points: 30, speed: 1.6, escapeSpeed: 2.5, detect: 10, radius: 0.55, capture: 1, color: '#e879f9', dodge: 0.4, blink: 2.6, captureRange: 3.4 },
  shield: { label: 'Shield Bug', points: 40, speed: 1.8, chaseSpeed: 3.5, detect: 9, radius: 0.65, capture: 1, color: '#60a5fa', shield: 1, attack: true },
}
export const BUG_ATTACK_COOLDOWN = 1.6
export const STUN_AFTER_SHIELD = 1.4
export const FREEZE_SLOW = 0.12

// ---- scoring (shown on the results screen and in PLAYZONE notes) ----
export const SCORE = {
  normal: 10, speed: 20, rare: 30, shield: 40, repair: 100, challenge: 200, boss: 500,
  orb: 5, // each energy orb collected
  healthLeft: 30, // per heart left at the exit
  timePerSecond: 2, // per second under the level's par time
}
// Stars: 1 = reach the exit, 2 = also complete the level's challenge, 3 = also capture every bug.
