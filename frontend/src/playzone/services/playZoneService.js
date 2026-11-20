// LAX360 Play Zone: the service boundary between the interface and the future FastAPI backend.
//
// Milestone 1 has NO backend: every call here rejects with `NotIntegratedError`, and the interface shows an honest "not live yet" state. When the endpoints exist (Milestone 2+), set
// PLAYZONE_API_READY to true: the requests below already describe the contract the screens expect. Nothing else in the interface needs to change.
import { api } from '../../services/apiClient.js'

export const PLAYZONE_API_READY = false

export class NotIntegratedError extends Error {
  constructor(what) {
    super(`${what} is not live yet.`)
    this.name = 'NotIntegratedError'
    this.code = 'not_integrated'
  }
}

/**
 * @typedef {'catch-the-stars'|'laxbot-jump'|'puzzle-pop'|'bug-hunter'} GameSlug
 * @typedef {'daily'|'weekly'|'all-time'} Period
 * @typedef {{ rank: number, playerId: string, nickname: string, avatar: string, score: number, sample?: boolean }} LeaderboardEntry
 * @typedef {{ entries: LeaderboardEntry[], me: (LeaderboardEntry|null) }} LeaderboardResult   `me`: the signed-in player's own best, when they have one
 * @typedef {{ nickname: string|null, avatar: string|null, gamesPlayed: number, bests: Record<GameSlug, number|null>, achievements: { id: string, unlockedAt: string|null }[],
 *            progress: Record<GameSlug, { level: number, levelsUnlocked: number }>, challenges: { id: string, progress: number, target: number, done: boolean }[] }} PlayerProfile
 */

const need = (what) => { if (!PLAYZONE_API_READY) throw new NotIntegratedError(what) }

/** GET /api/play-zone/leaderboard?game=&period= → LeaderboardResult */
export async function fetchLeaderboard({ game, period }) {
  need('The leaderboard')
  return api(`/api/play-zone/leaderboard?game=${encodeURIComponent(game)}&period=${encodeURIComponent(period)}`)
}

/** GET /api/play-zone/me → PlayerProfile (signed-in players only) */
export async function fetchPlayerProfile() {
  need('Your Play Zone profile')
  return api('/api/play-zone/me')
}

/** GET /api/play-zone/games → the games with their on/off state and display order (what the admin panel manages) */
export async function fetchGameConfig() {
  need('Game settings')
  return api('/api/play-zone/games')
}
