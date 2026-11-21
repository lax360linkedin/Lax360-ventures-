// Cloud progress sync for signed-in players. Two-way and FORWARD-ONLY: this device's progress is sent (the server merges it so older data never overwrites newer), and the cloud copy
// is folded into this device. Guest progress that existed before sign-in is sent as `imported`, which the server keeps UNVERIFIED (never ranked). Every call is bounded, queued per game
// (no overlapping requests) and failures are silent: progress simply stays on the device until the next attempt.
import { getAuthUser } from '../../hooks/useAuth.js'
import { fetchProgress, pushProgress } from './playZoneApi.js'
import { getLocal, mergeRemoteBest } from './localScores.js'
import * as puzzle from '../games/puzzlePop/progress.js'
import * as jump from '../games/laxbotJump/progress.js'
import * as bug from '../games/bugHunter/progress.js'

const MODULES = { 'puzzle-pop': puzzle, 'laxbot-jump': jump, 'bug-hunter': bug }
const versions = {} // game -> last cloud version seen
const inflight = {}
const SEEN_KEY = 'lax360-playzone-imported-v1'

const imported = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') } catch { return {} } }
const markImported = (uid, game) => { try { const m = imported(); m[`${uid}:${game}`] = 1; localStorage.setItem(SEEN_KEY, JSON.stringify(m)) } catch { /* ignore */ } }

function localPayload(game) {
  if (game === 'catch-the-stars') return { levels: {}, unlocked: [], best: getLocal().games['catch-the-stars']?.best || 0 }
  const levels = {}
  for (const [id, r] of Object.entries(MODULES[game].getProgress().levels || {})) levels[id] = { completed: !!r.completed, stars: r.stars || 0, best: r.best || 0 }
  return { levels, unlocked: [] }
}

/** Whether this browser holds progress made before sign-in that has not been offered to this account yet. */
export function hasGuestProgress(game) {
  const user = getAuthUser(); if (!user || imported()[`${user.id}:${game}`]) return false
  const p = localPayload(game)
  return Object.keys(p.levels).length > 0 || (p.best || 0) > 0
}

/** Sync one game. `asImport` marks the data as guest progress (kept unverified). Resolves with { ok, changed } and never throws. */
export function syncGame(game, { asImport = false } = {}) {
  const user = getAuthUser()
  if (!user) return Promise.resolve({ ok: false, reason: 'guest' })
  if (inflight[game]) return inflight[game]
  const first = !imported()[`${user.id}:${game}`]
  const run = (async () => {
    try {
      const body = { ...localPayload(game), imported: asImport || first, base_version: versions[game] ?? null }
      const out = await pushProgress(game, body)
      versions[game] = out.version
      markImported(user.id, game)
      let changed = false
      if (game === 'catch-the-stars') changed = mergeRemoteBest(game, out.data?.best || 0)
      else changed = MODULES[game].mergeRemote(out.data?.levels)
      return { ok: true, changed }
    } catch (e) { return { ok: false, reason: e?.code || 'error' } } finally { delete inflight[game] }
  })()
  inflight[game] = run
  return run
}

export const syncAll = () => Promise.all(['catch-the-stars', 'laxbot-jump', 'puzzle-pop', 'bug-hunter'].map((g) => syncGame(g)))

/** Pull only (used when a game opens, so an unlocked world on another device shows up here). */
export async function pullGame(game) {
  if (!getAuthUser()) return false
  try {
    const out = await fetchProgress(game); versions[game] = out.version
    if (game === 'catch-the-stars') return mergeRemoteBest(game, out.data?.best || 0)
    return MODULES[game].mergeRemote(out.data?.levels)
  } catch { return false }
}
