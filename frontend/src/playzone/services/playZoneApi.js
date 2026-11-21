// LAX360 Play Zone: the real /api/play-zone endpoints. Identity is ALWAYS the website login session (HttpOnly cookie + CSRF header, handled by services/apiClient.js);
// nothing here ever sends a player id. Every call has a bounded timeout so a slow backend can never freeze a game or a page.
import { api } from '../../services/apiClient.js'

const BASE = '/api/play-zone'
const SHORT = 8000

export const fetchProfile = () => api(`${BASE}/profile`, { timeoutMs: SHORT })
export const patchProfile = (body) => api(`${BASE}/profile`, { method: 'PATCH', body, timeoutMs: SHORT })
export const startSession = (body) => api(`${BASE}/sessions`, { method: 'POST', body, timeoutMs: SHORT })
export const completeSession = (id, result) => api(`${BASE}/sessions/${encodeURIComponent(id)}/complete`, { method: 'POST', body: { result }, timeoutMs: 15000 })
export const fetchLeaderboardPage = ({ game = 'overall', period = 'weekly', page = 1, pageSize = 25 }) =>
  api(`${BASE}/leaderboards?game=${encodeURIComponent(game)}&period=${encodeURIComponent(period)}&page=${page}&page_size=${pageSize}`, { timeoutMs: SHORT })
export const fetchProgress = (game) => api(`${BASE}/games/${encodeURIComponent(game)}/progress`, { timeoutMs: SHORT })
export const pushProgress = (game, body) => api(`${BASE}/games/${encodeURIComponent(game)}/progress`, { method: 'POST', body, timeoutMs: SHORT })
export const fetchAchievements = () => api(`${BASE}/achievements`, { timeoutMs: SHORT })
export const fetchChallenges = () => api(`${BASE}/challenges`, { timeoutMs: SHORT })
export const claimChallenge = (id) => api(`${BASE}/challenges/${encodeURIComponent(id)}/claim`, { method: 'POST', timeoutMs: SHORT })

/** True for "the Play Zone backend isn't there yet" (migration not applied, server asleep, offline): the screens show a calm unavailable state, never a crash. */
export const isUnavailable = (e) => !!e && (['network', 'timeout', 'backend_unavailable', 'database_not_ready'].includes(e.code) || e.status === 503)
