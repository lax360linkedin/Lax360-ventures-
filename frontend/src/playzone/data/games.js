// LAX360 Play Zone: the catalogue of games (names, stories, controls, objectives, visual identity). This is content and design only: Milestone 1 has no gameplay,
// so every game is `status: 'coming-soon'`. Scoring lines describe the PLANNED design; the final values are set when each game is built.

export const GAME_STATUS = { 'coming-soon': 'Coming soon', preview: 'Development preview', live: 'Live' }

export const games = [
  {
    slug: 'catch-the-stars',
    title: 'Catch the Stars',
    world: 'Magical 3D Dream World',
    category: 'Arcade · Reflex',
    status: 'live',
    bot: 'star-collector',
    accent: '#fcd34d',
    tagline: 'Glide through a dreamy night sky and gather every falling star.',
    description: 'Steer LAXBOT through a glowing 3D dream world for 30 seconds. Catch stars, golden stars and diamonds, grab hearts and Rainbow Stars for double points, and dodge the bombs as the sky gets faster.',
    story: 'When the Dream World lost its stars, LAXBOT put on the Star Collector halo and floated up to bring them home. Every star you catch relights a little more of the sky.',
    controls: { keyboard: ['← → or A D: glide left and right', 'P or Esc: pause and resume'], touch: ['Drag anywhere to glide', 'Or hold the on-screen left and right arrows', 'Pause button, top right'] },
    objectives: ['Catch as many falling stars as you can in 30 seconds.', 'Keep your three hearts: every bomb you touch costs one.', 'Grab a Rainbow Star for double points for 5 seconds.'],
    scoring: ['Star +10, Golden Star +25, Diamond +50. Heart +1 life (max 3). Bomb −1 life.', 'Rainbow Star: all points ×2 for 5 seconds.', 'It gets faster at 20 and 10 seconds left (Easy, Medium, Hard).', 'Your best score is kept on this device only; the official leaderboard comes with a later milestone.'],
  },
  {
    slug: 'laxbot-jump',
    title: 'LAXBOT Jump',
    world: 'Floating Island Adventure',
    category: 'Platformer · Adventure',
    status: 'live',
    bot: 'adventure-explorer',
    accent: '#7dd3fc',
    tagline: 'Run, jump and double jump across five floating worlds to reach the portal.',
    description: 'A 3D platform adventure through five floating worlds: Cloud Kingdom, Candy Island, Crystal Valley, Neon City and Space Garden. Run, jump and double jump, ride moving platforms, dodge hazards, collect coins and crystals, find hidden stars and reach the portal.',
    story: 'The Explorer goggles are on and the islands are drifting. LAXBOT is mapping the sky, one jump at a time, and the only way is forward.',
    controls: { keyboard: ['W A S D or arrow keys: move', 'Space: jump, and again in the air to double jump', 'P or Esc: pause and resume'], touch: ['Virtual joystick (bottom left) to move', 'Jump button (bottom right); tap again in the air to double jump', 'Pause button, top right'] },
    objectives: ['Reach the glowing portal at the end of each world.', 'Collect coins and energy crystals, and look off the path for the hidden star.', 'Use checkpoints: a fall or a hit costs a life, and three lives are given per level.'],
    scoring: ['Coin +10, crystal +50, hidden star +200.', 'Level complete +500, +100 for each life left, +5 for every second under the par time.', 'Stars: finish = 1, 75% of the coins = 2, every crystal and the hidden star = 3.', 'Progress and best scores are saved on this device only; the official leaderboard needs the backend.'],
  },
  {
    slug: 'puzzle-pop',
    title: 'Puzzle Pop',
    world: 'Magical Crystal Kingdom',
    category: 'Puzzle · Match',
    status: 'live',
    bot: 'puzzle-wizard',
    accent: '#f9a8d4',
    tagline: 'Match glittering 3D crystals, build power-ups and chain cascades across 25 levels.',
    description: 'A premium 3D Match-3 in five magical worlds: Crystal Garden, Ocean Treasure, Frozen Palace, Golden Sky and Galaxy Gems. Swap neighbouring crystals, make Rocket, Bomb and Rainbow crystals, combine them, break ice and coral, bring chests to the surface and clear 25 levels.',
    story: 'The Puzzle Wizard hat is on and the Crystal Kingdom is out of balance. Match the crystals, break the spell and restore the glow.',
    controls: { keyboard: ['Arrow keys: move the cursor over the board', 'Enter or Space: select a crystal, then an adjacent one to swap', 'P or Esc: pause'], touch: ['Swipe or drag a crystal toward its neighbour', 'Or tap one crystal, then an adjacent one', 'Pause button, top right'] },
    objectives: ['Reach the goals of each level before the moves run out: score, collect colours, break ice, bring chests down, break blocks or set off power-ups.', 'Four in a line makes a Rocket, a T or L makes a Bomb, five makes a Rainbow.', 'Combine power-ups for bigger effects.'],
    scoring: ['Match of 3: +30, of 4: +60, of 5: +100. T or L shapes add +10 per extra crystal.', 'Power-up combination: +150; crystals cleared by a power-up +10 each; every cascade adds +30 per step after the first.', 'Level complete +200 and +20 for each move left.', 'Stars: finish = 1, a quarter of the moves left = 2, half left = 3. Progress and best scores are kept on this device only; the official leaderboard needs the backend.'],
  },
  {
    slug: 'bug-hunter',
    title: 'Bug Hunter',
    world: 'Futuristic Cyber Rescue',
    category: 'Action · Strategy',
    status: 'live',
    bot: 'cyber-defender',
    accent: '#22d3ee',
    tagline: 'Capture glitchy bugs, repair the city and beat the Core Corruptor.',
    description: 'A 3D cyber-adventure through five worlds: Code Garden, Circuit City, Data Ocean, Cyber Tower and Core Defender. Chase bugs with different behaviours, throw your energy net, solve repair puzzles, grab power-ups and defeat two bosses.',
    story: 'LAX360 Digital City has been invaded by mischievous bugs that scrambled its circuits. LAXBOT switches to Cyber Defender mode to capture them, repair the systems and restore the city.',
    controls: { keyboard: ['W A S D: move · Shift: sprint · Space: jump', 'Drag the mouse (or arrow keys) to turn the camera; left click or F throws the net', 'E: repair at a console · P or Esc: pause'], touch: ['Virtual joystick to move, drag the screen to look', 'NET, jump and interact buttons (bottom right)', 'Pause button, top right'] },
    objectives: ['Capture the bugs of each world with the energy net.', 'Repair the broken systems at the consoles (press E).', 'Reach the exit portal, and defeat the boss in worlds 3 and 5.'],
    scoring: ['Normal bug +10, Speed bug +20, Rare bug +30, Shield bug +40.', 'System repair +100, boss defeat +500, level challenge +200.', 'Bonuses for hearts left, time under par and energy orbs.', 'Stars: finish = 1, challenge = 2, every bug = 3. Progress and best scores stay on this device; the official leaderboard needs the backend.'],
  },
]

export const gameBySlug = (slug) => games.find((g) => g.slug === slug)

export const BOT_VARIANTS = [
  { id: 'star-collector', label: 'Star Collector', game: 'catch-the-stars' },
  { id: 'adventure-explorer', label: 'Adventure Explorer', game: 'laxbot-jump' },
  { id: 'puzzle-wizard', label: 'Puzzle Wizard', game: 'puzzle-pop' },
  { id: 'cyber-defender', label: 'Cyber Defender', game: 'bug-hunter' },
]

// Planned (not active) achievement and daily-challenge designs, shown as a preview of what is coming. They are design content, not data about players.
export const plannedAchievements = [
  { id: 'first-spark', title: 'First Spark', text: 'Play your first game in the Play Zone.', game: null },
  { id: 'star-catcher', title: 'Star Catcher', text: 'Catch a first golden star.', game: 'catch-the-stars' },
  { id: 'sky-climber', title: 'Sky Climber', text: 'Reach a new height on the islands.', game: 'laxbot-jump' },
  { id: 'crystal-chain', title: 'Crystal Chain', text: 'Trigger a chain reaction.', game: 'puzzle-pop' },
  { id: 'bug-squasher', title: 'Bug Squasher', text: 'Clear a wave without damage.', game: 'bug-hunter' },
  { id: 'all-rounder', title: 'All-Rounder', text: 'Play all four games.', game: null },
]

export const plannedChallenges = [
  { id: 'dc-stars', title: 'Star shower', text: 'Catch a set number of stars in one run.', game: 'catch-the-stars' },
  { id: 'dc-jump', title: 'Higher and higher', text: 'Climb past a target height.', game: 'laxbot-jump' },
  { id: 'dc-pop', title: 'Pop the chain', text: 'Clear a board using few moves.', game: 'puzzle-pop' },
]

export const faq = [
  { q: 'Can I play the games now?', a: 'Yes. All four games (Catch the Stars, LAXBOT Jump, Puzzle Pop and Bug Hunter) are playable in a modern browser on a phone, tablet or computer. If a game is switched off for maintenance, its page says so.' },
  { q: 'Do I need an account?', a: 'No. You can play every game as a guest and keep personal bests on your device. A free LAX360 account (the same one used on this website) lets you save official scores, appear on the leaderboards, earn achievements, complete daily challenges and keep your progress across devices.' },
  { q: 'How are the leaderboards decided?', a: 'Only scores that the LAX360 server has verified are ranked. Guests and local scores never appear. Browser games cannot be made completely tamper-proof, so suspicious results are held back for review and moderators can remove unfair ones.' },
  { q: 'Which devices will it work on?', a: 'The games need WebGL (3D graphics) and are designed for phones, tablets and computers, with touch and keyboard controls. Pick Auto, Low, Medium or High graphics in the Play Zone settings; reduced-motion and sound preferences are respected.' },
  { q: 'Does Play Zone use my data?', a: 'Only your nickname, avatar, scores, progress and achievements are stored, linked to your LAX360 account. Your e-mail and real name are never shown to other players. See the Privacy Policy for details.' },
]
