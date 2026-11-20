// DEVELOPMENT PREVIEW DATA ONLY. These are invented sample scores used to show the layout of the leaderboard. They are NOT real players, scores or rankings and must never be
// shown as such: every component that uses this file shows a "Development preview: sample data" banner and a "Sample" label on each entry.
// Remove this file (and the toggle that uses it) when the real leaderboard API is connected.

export const DEV_PREVIEW_NOTICE = 'Development preview: these are sample entries to show the layout. They are not real players or scores.'

const names = ['Sample Nova', 'Sample Comet', 'Sample Pixel', 'Sample Orbit', 'Sample Echo', 'Sample Zephyr', 'Sample Lumen', 'Sample Quartz']
const bots = ['star-collector', 'adventure-explorer', 'puzzle-wizard', 'cyber-defender']

/** @returns {import('../services/playZoneService.js').LeaderboardEntry[]} sample rows, clearly flagged `sample: true` */
export function devPreviewLeaderboard(game, period) {
  const base = { 'catch-the-stars': 4200, 'laxbot-jump': 3100, 'puzzle-pop': 5600, 'bug-hunter': 2800 }[game] || 3000
  const scale = { daily: 0.4, weekly: 0.7, 'all-time': 1 }[period] || 1
  return names.map((nickname, i) => ({ rank: i + 1, playerId: `sample-${i}`, nickname, avatar: bots[i % 4], score: Math.round(base * scale * (1 - i * 0.09)), sample: true }))
}
