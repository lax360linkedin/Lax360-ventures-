// Catch the Stars: the rules as data. Nothing here touches the screen, so the game logic (logic.js) can be tested without a browser.

export const ROUND_SECONDS = 30
export const MAX_LIVES = 3
export const POWERUP_SECONDS = 5 // Rainbow Star: double points for this long
export const INVULNERABLE_SECONDS = 1 // after a bomb hit, the next bomb touch within this time does no damage (no double hits)
export const STEP = 1 / 60 // fixed simulation step: the game plays the same at 30, 60 or 144 frames per second
export const MAX_FRAME = 0.1 // a long pause (slow device, switched tab) never advances the game by more than this

// World units. The bot walks along x between -FIELD_HALF and FIELD_HALF at y = 0. Items fall from SPAWN_Y to below the platform.
export const FIELD_HALF = 4.4
export const SPAWN_HALF = 4.1
export const SPAWN_Y = 9.5
export const KILL_Y = -1.5
export const CATCH = { bottom: 0.05, top: 1.75, halfWidth: 0.82 } // the part of LAXBOT that catches (the body and arms)
export const BOT_MAX_SPEED = 9.5 // units per second with the keyboard
export const BOT_ACCEL = 46
export const BOT_TOUCH_SPEED = 15 // top speed when following a finger

// kind: points (before the double), radius used for the collision, geometry/look is in the scene
export const ITEMS = {
  star: { points: 10, radius: 0.38, label: 'Star', hint: '+10', color: '#fde68a' },
  golden: { points: 25, radius: 0.44, label: 'Golden', hint: '+25', color: '#fbbf24' },
  diamond: { points: 50, radius: 0.4, label: 'Diamond', hint: '+50', color: '#7dd3fc' },
  heart: { points: 0, radius: 0.42, label: 'Heart', hint: '+1 life', color: '#fb7185' },
  bomb: { points: 0, radius: 0.42, label: 'Bomb', hint: '−1 life', color: '#fb923c' },
  rainbow: { points: 0, radius: 0.46, label: 'Rainbow', hint: '×2 for 5 s', color: '#f0abfc' },
}

// Difficulty is chosen from the whole seconds REMAINING (30 to 21 easy, 20 to 11 medium, 10 to 0 hard).
// speed: fall speed in units per second; every: seconds between spawns; maxDx: how far apart consecutive spawns may be (keeps every item reachable);
// weights: how often each kind is chosen; maxBombs: bombs on screen at once.
export const STAGES = [
  { id: 'easy', color: '#86efac', label: 'Easy', speed: 3.4, every: 0.85, maxDx: 4.8, maxBombs: 1, weights: { star: 64, golden: 14, diamond: 6, heart: 6, bomb: 6, rainbow: 4 }, cluster: 0 },
  { id: 'medium', color: '#fcd34d', label: 'Medium', speed: 4.8, every: 0.68, maxDx: 4.2, maxBombs: 2, weights: { star: 50, golden: 14, diamond: 8, heart: 5, bomb: 15, rainbow: 5 }, cluster: 0 },
  { id: 'hard', color: '#fb7185', label: 'Hard', speed: 6.4, every: 0.54, maxDx: 3.6, maxBombs: 3, weights: { star: 38, golden: 20, diamond: 12, heart: 4, bomb: 15, rainbow: 8 }, cluster: 3.4 },
]

export const stageForRemaining = (remaining) => {
  const whole = Math.ceil(Math.max(0, remaining))
  return whole >= 21 ? STAGES[0] : whole >= 11 ? STAGES[1] : STAGES[2]
}

export const INSTRUCTIONS = {
  goal: 'Slide LAXBOT left and right to catch falling stars for 30 seconds. Dodge the bombs and keep your hearts!',
  controls: 'Move: ← → or A D · drag with your finger · or use the on-screen arrows. Pause: P or Esc.',
}
