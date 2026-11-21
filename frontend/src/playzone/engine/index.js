// LAX360 Play Zone: the future game-engine integration point (Milestone 2+).
//
// Each game will ship as its own lazily loaded module, so the heavy 3D library (for example three.js) is downloaded ONLY when a visitor opens a game, never on the corporate website:
//
//   const engines = {
//     'catch-the-stars': () => import('./games/catchTheStars.js'),
//     'laxbot-jump':     () => import('./games/laxbotJump.js'),
//     ...
//   }
//
// A game module must export `mount(container, { prefs, onScore, onExit, signal })` and return `{ pause(), resume(), destroy() }`. `GameStage` calls `mount` with the stage element, passes
// the visitor's sound / graphics preferences and an AbortSignal, and calls `destroy()` when the page is left. Scores are reported through `onScore`; the stage (not the game) talks to the API
// through services/playZoneApi.js.
//
// Milestone 2: Catch the Stars is the first live game and is registered below as a React component module. Games without an entry report "not available".

export const engines = {
  // A live game is a lazily loaded module whose default export is a React component ({ game, onExit }). three.js and React Three Fiber live inside it, in a separate chunk.
  'catch-the-stars': () => import('../games/catchTheStars/CatchTheStarsGame.jsx'),
  'laxbot-jump': () => import('../games/laxbotJump/LaxbotJumpGame.jsx'),
  'puzzle-pop': () => import('../games/puzzlePop/PuzzlePopGame.jsx'),
  'bug-hunter': () => import('../games/bugHunter/BugHunterGame.jsx'),
}

export class EngineUnavailableError extends Error {
  constructor(slug) {
    super(`The ${slug} game engine is not available yet.`)
    this.name = 'EngineUnavailableError'
    this.code = 'engine_unavailable'
  }
}

/** @returns {Promise<{ mount: (container: HTMLElement, options: object) => { pause(): void, resume(): void, destroy(): void } }>} */
export async function loadGameEngine(slug) {
  const loader = engines[slug]
  if (!loader) throw new EngineUnavailableError(slug)
  return loader()
}
