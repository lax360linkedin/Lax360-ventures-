// LAXBOT Jump: the rules and tuning as data. Nothing here touches the screen, so the physics and scoring (logic.js) are tested without a browser.
// World units: 1 unit is about one LAXBOT body width. y is up and the courses run toward -z (away from the camera).

export const STEP = 1 / 60 // fixed simulation step: the game plays the same at 30, 60 or 144 fps
export const MAX_FRAME = 0.1 // a long pause never advances the game by more than this

// ---- the character controller ----
export const PLAYER = { halfWidth: 0.34, height: 1.5, centerY: 0.75 }
export const RUN_SPEED = 7.2 // top speed with the stick fully pushed
export const WALK_SPEED = 3.6 // a light push on the stick walks
export const GROUND_ACCEL = 60
export const GROUND_DECEL = 70
export const AIR_ACCEL = 34
export const AIR_DECEL = 6
export const GRAVITY = 30
export const JUMP_V = 11
export const DOUBLE_JUMP_V = 9.5
export const BOUNCE_V = 17
export const TERMINAL_V = -32
export const COYOTE = 0.1 // seconds after walking off an edge in which the first jump still works
export const JUMP_BUFFER = 0.12 // a jump pressed this long before landing still counts
export const JUMP_CUT = 0.55 // releasing jump early shortens the jump
export const FALL_BELOW = 14 // a fall this far below the lowest platform loses a life

export const LIVES = 3
export const RESPAWN_DELAY = 0.9
export const INVULNERABLE = 1.6 // after a respawn
export const PICKUP_RADIUS = 1.0
export const STAR_RADIUS = 1.15

// ---- scoring (shown on the results screen) ----
export const SCORING = {
  coin: 10,
  crystal: 50,
  star: 200, // hidden bonus star
  life: 100, // per life left at the finish
  complete: 500, // level completion bonus
  timePerSecond: 5, // for every second under the level's par time
}
// Star rating (1 to 3), documented on the results screen and in PLAYZONE_ASSETS.md:
//  ★ finish the level   ★★ also collect at least 75% of the coins   ★★★ also collect every crystal and the hidden star
export const COIN_SHARE_FOR_TWO_STARS = 0.75
