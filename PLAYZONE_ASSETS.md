# LAX360 Play Zone: production assets and Milestone 2 hand-over

Milestone 1 delivers the Play Zone **interface only** (no gameplay, no backend). The artwork you see is temporary vector presentation drawn in code; LAXBOT is the website's existing 2D vector character wearing four outfits. **None of it is an interactive 3D character.** The assets below are needed to reach the final premium look.

## Assets needed from design

| Asset | For | Notes |
|---|---|---|
| LAXBOT 3D model, rigged (idle, run, jump, celebrate, hurt) | all games, lobby hero | glTF/GLB, under 1.5 MB per outfit, 4 outfits |
| 4 outfits: Star Collector, Adventure Explorer, Puzzle Wizard, Cyber Defender | games, avatars | halo and star net; goggles, scarf and backpack; wizard hat and wand; visor and shield |
| Lobby hero render (poster + optional short loop) | `/play-zone` hero | WebP/AVIF, 2400 px wide, plus a 1200 px mobile crop |
| Game key art, one per game (16:10) and thumbnail (4:3) | showcase cards, intro pages | WebP/AVIF, themed per world |
| World backgrounds and parallax layers | each game stage | 3 to 5 layers per world, transparent PNG/WebP |
| Game sprites / 3D props | gameplay | stars, islands, gems, crystals, bugs, power-ups |
| Sound effects and music (per game) | gameplay | short OGG/MP3, loopable music, under 500 KB per game |
| Achievement badge icons (6+) | profile, lobby | SVG |
| Fonts | UI | the site's existing fonts are used |

## Where things live

```
frontend/src/playzone/
  data/games.js            game catalogue (titles, stories, controls, scoring text)
  data/devPreview.js       SAMPLE leaderboard data (development preview only, always labelled)
  services/playZoneService.js   the boundary to the future FastAPI endpoints (PLAYZONE_API_READY = false)
  engine/index.js          lazy loader contract for the future game engines
  components/GameStage.jsx the gameplay container (mount point data-game-mount)
  components/LaxBotPlayer.jsx, GameArt.jsx, GameShowcase.jsx, LeaderboardView.jsx, PrefsPanel.jsx
  pages/                   PlayZoneHome, PlayZoneGame, PlayZoneLeaderboard, PlayZoneProfile
frontend/src/admin/pages/PlayZoneAdmin.jsx   admin interface (nothing is saved)
```

## Backend contract expected by the interface (Milestone 2+)

- `GET /api/play-zone/leaderboard?game=&period=daily|weekly|all-time` returns `{ entries: [{ rank, playerId, nickname, avatar, score }], me: {...}|null }`
- `GET /api/play-zone/me` returns the signed-in player's nickname, avatar, bests, achievements, progress and daily challenges
- `GET /api/play-zone/games` returns each game's enabled state and display order
- Sign-in reuses the website's existing session; there is no separate Play Zone login.

## Not done in Milestone 1 (by design)

Gameplay, score recording, accounts data, leaderboards, achievements and challenges logic, analytics, saving admin changes, Tamil/Hindi translations of the Play Zone text, search indexing (the pages are marked noindex until the games are live), and sitemap entries.

## Milestone 2: Catch the Stars (playable) — hand-over notes

**Files** (`frontend/src/playzone/games/catchTheStars/`): `config.js` (all rules as data), `logic.js` (pure rules: no React, no Three), `controller.js` (state machine, input, audio bridge, HUD snapshot), `Scene.jsx` (React Three Fiber scene), `LaxBot3D.jsx` (the 3D LAXBOT), `audio.js` (synthesised sound), `CatchTheStarsGame.jsx` (canvas + HUD + overlays). Local records: `services/localScores.js`. Tests: `npm run test:game` (13 rule tests, no browser needed).

**Dependencies added:** `three`, `@react-three/fiber`. They live only in the lazy game chunk (`engine/index.js` → `CatchTheStarsGame.jsx`), so the corporate website never downloads them.

**LAXBOT is a PLACEHOLDER.** It is built from primitives (`LaxBot3D.jsx`) with idle / run / catch / damage / victory animations. It is not production-quality character art. To replace it with a real model:
1. Export a glTF/GLB (≤ 1.5 MB, one skinned mesh, ≤ 20k triangles, clips named `idle`, `run`, `catch`, `damage`, `victory`) and put it in `frontend/public/playzone/laxbot.glb`.
2. In `LaxBot3D.jsx` load it with `useGLTF` + `useAnimations` and drive the clips from the same `controller.state` fields already read there (`sim.botVx`, `bot.catchT`, `bot.hurtT`, `phase`, `sim.reason`).
3. Keep the catch zone (`CATCH` in `config.js`) the same size so the rules do not change. Collision uses the rules, not the model.

**Sound:** every effect and the music are generated with the Web Audio API (`audio.js`); no audio files, nothing to license. Audio starts only after the Start button (browser autoplay rules). A real music track can replace `startMusic()` later.

**Scores:** only a LOCAL personal best (this device, `localStorage` key `lax360-playzone-local-v1`) is stored, labelled "Local · this device" everywhere. Nothing is sent to the leaderboard: a browser score can be edited by the player, so ranked scores must be validated by the server (the planned `officialScores` service).

**Still awaiting the backend:** official/global leaderboard, accounts-linked scores and profile, server-validated runs, achievements and challenges across devices, anti-cheat.

**Performance:** quality tiers (low/medium/high) from device hints, one automatic downgrade if the frame rate stays below ~38 fps, instanced meshes and a fixed particle pool, reduced-motion support, auto-pause when the tab is hidden. `canvas[data-fps]` shows the measured fps in the page (sampled every 90 frames).

## Milestone 3: LAXBOT Jump (playable) — hand-over notes

**Files** (`frontend/src/playzone/games/laxbotJump/`): `config.js` (physics and scoring constants), `levels.js` (the five worlds as data + themes), `logic.js` (pure physics/rules), `progress.js` (local progress, the service boundary), `controller.js` (state machine, input, sound bridge), `Scene.jsx` (R3F scene), `JumpBot.jsx` (procedural LAXBOT), `LaxbotJumpGame.jsx` (canvas, HUD, touch controls, overlays). Tests: `frontend/scripts/test-laxbot-jump.mjs` (run by `npm run test:game`).

**Worlds:** Cloud Kingdom (tutorial), Candy Island (moving platforms, bounce pads, rotating bars), Crystal Valley (disappearing platforms, narrow paths with spikes, hidden star), Neon City (precision jumps, sweeping and pulsing laser barriers), Space Garden (low-gravity zone, vertical and sideways movers, final portal). Each has a start, a checkpoint (two or three), collectibles, a hidden star and a finish portal. `npm run test:game` plays every level with a bot using the real physics to prove the finish is reachable (this proves reachability, not that it is easy for people).

**Controls:** W A S D / arrow keys, Space (jump; again in the air to double jump), P or Esc (pause). Touch: joystick (bottom left), Jump button (bottom right), pause button in the HUD. The game takes keys only while a level is playing or paused. On touch screens the floating assistant is hidden while playing (it would sit on the jump button): `ChatLauncher.jsx` got a `data-chat-launcher` attribute for this, nothing else changed.

**Scoring (one place: `config.js` SCORING):** coin 10, crystal 50, hidden star 200, 100 per life left, 500 for finishing, 5 per second under the level's par time. Stars: 1 = finish, 2 = also 75% of the coins, 3 = also every crystal and the hidden star. Every collectible is stored in a Set, so a reward can never count twice.

**Progress:** saved in `localStorage` (`lax360-playzone-laxbot-jump-v1`) through `progress.js` only (`getProgress`, `saveLevelResult`, `isUnlocked`, `useProgress`, `resetProgress`). A world unlocks when the one before it is completed. The best score also goes to the shared local record. To add backend persistence later, replace the bodies of those functions; the game does not change. Nothing is sent to a leaderboard.

**LAXBOT is a PLACEHOLDER** (primitive shapes in `JumpBot.jsx`, nine animation states: idle, walk, run, jump, double jump flip, fall, landing squash, damage, victory dance). It is not production character art. To replace it with a glTF model: export a rigged GLB with clips named `idle`, `walk`, `run`, `jump`, `doubleJump`, `fall`, `land`, `damage`, `victory` (≤ 1.5 MB, ≤ 20k triangles), put it in `frontend/public/playzone/`, load it with `useGLTF` + `useAnimations` in `JumpBot.jsx` and choose the clip from the same `controller.state.sim` fields the placeholder reads (`grounded`, `p.vy`, `speed`, `landT`, `djT`, `hurtT`, `done`). Collision uses the capsule in `config.js` (`PLAYER`), not the model.

**Sound:** synthesised with the Web Audio API (`catchTheStars/audio.js`, extended with jump, double jump, land, coin, checkpoint and bounce); no audio files, nothing to license. Music and effects have their own preferences and a mute button in the HUD.

**Awaiting the backend:** server-side progress and cloud save, official leaderboards and validated runs, achievements across devices.
