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
    status: 'coming-soon',
    bot: 'puzzle-wizard',
    accent: '#f9a8d4',
    tagline: 'Match glittering crystals and pop them in clever chains.',
    description: 'Swap and match crystals in a magical kingdom. Plan your moves, trigger chain reactions and clear each board with as few moves as you can.',
    story: 'The Puzzle Wizard hat is on and the Crystal Kingdom is out of balance. Match the crystals, break the spell and restore the glow.',
    controls: { keyboard: ['Arrow keys: move the cursor', 'Enter or Space: select and swap', 'P: pause'], touch: ['Tap a crystal, then an adjacent one to swap', 'Or drag a crystal toward its neighbour', 'Pause button, top right'] },
    objectives: ['Match three or more crystals of the same colour.', 'Clear every goal crystal on the board within the move limit.', 'Chain reactions pop extra crystals.'],
    scoring: ['Each popped crystal scores points.', 'Longer matches and chains score more.', 'Leftover moves add a bonus (planned).'],
  },
  {
    slug: 'bug-hunter',
    title: 'Bug Hunter',
    world: 'Futuristic Cyber Rescue',
    category: 'Action · Strategy',
    status: 'coming-soon',
    bot: 'cyber-defender',
    accent: '#22d3ee',
    tagline: 'Hunt down glitchy bugs before they take over the network.',
    description: 'Bugs are invading the neon network. Aim, tap and zap them before they reach the core, and learn which ones need a second hit.',
    story: 'LAXBOT has switched to Cyber Defender mode. The network is flooded with glitchy bugs, and the Core needs a hero.',
    controls: { keyboard: ['Mouse or arrow keys: aim', 'Click or Space: zap', 'P: pause'], touch: ['Tap a bug to zap it', 'Tap the shield button for a power-up', 'Pause button, top right'] },
    objectives: ['Zap bugs before they reach the Core.', 'Protect the Core: it has limited health.', 'Survive each wave to reach the next.'],
    scoring: ['Each bug zapped scores points; tougher bugs score more.', 'Waves cleared without damage give a bonus.', 'Your best run goes to the leaderboard (planned).'],
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
  { q: 'Can I play the games now?', a: 'Not yet. The Play Zone is being built in stages. Right now you can explore the games, their worlds and controls; each game opens when it is ready.' },
  { q: 'Do I need an account?', a: 'You will be able to try games without one. A free LAX360 account (the same one used on this website) will be needed to save scores and appear on leaderboards.' },
  { q: 'Are the leaderboards live?', a: 'Not yet. They open together with gameplay. Until then you will only see empty states, or clearly marked sample data in the development preview.' },
  { q: 'Which devices will it work on?', a: 'The games are designed for phones, tablets and computers, with touch and keyboard controls. Reduced-motion and sound preferences are respected.' },
  { q: 'Does Play Zone use my data?', a: 'Only what your LAX360 account already has, and only to save your progress and scores once gameplay is live. See the Privacy Policy for details.' },
]
