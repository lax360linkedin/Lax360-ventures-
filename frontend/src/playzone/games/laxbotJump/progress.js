import { useSyncExternalStore } from 'react'
import { LEVELS } from './levels.js'
import { recordResult } from '../../services/localScores.js'

// LAXBOT Jump progress: which levels are unlocked, which are completed, the best score, stars and time of each. It is kept in this browser only (localStorage), which is why the screens call it
// "saved on this device". The interface below (`getProgress`, `saveLevelResult`, `resetProgress`, `useProgress`) is the boundary a future backend service can replace: the game never reads
// localStorage directly, and server-validated progress would sit behind the same functions.

const KEY = 'lax360-playzone-laxbot-jump-v1'
const listeners = new Set()
let cache = null

const EMPTY = { levels: {} }
const empty = () => ({ levels: {} })
const read = () => {
  if (cache) return cache
  try { const raw = JSON.parse(localStorage.getItem(KEY) || '{}'); cache = { levels: raw && typeof raw.levels === 'object' && raw.levels ? raw.levels : {} } } catch { cache = empty() }
  return cache
}
const save = (next) => {
  cache = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage unavailable: progress lasts for this visit only */ }
  listeners.forEach((l) => l())
}

export const getProgress = () => read()

/** The first level is always open; every other level opens when the one before it has been completed. */
export const isUnlocked = (progress, index) => index === 0 || !!progress.levels[LEVELS[index - 1].id]?.completed

export function totalStars(progress) { return LEVELS.reduce((n, l) => n + (progress.levels[l.id]?.stars || 0), 0) }

/**
 * Save the result of one level attempt. Only a completed level changes progress. Returns { isNewBest, previousBest, unlockedNext, stars }.
 * The best score of the game is also written to the shared local record (services/localScores.js) so the Play Zone profile can show it.
 */
export function saveLevelResult(result) {
  if (!result.finished) return { isNewBest: false, previousBest: read().levels[result.levelId]?.best ?? 0, unlockedNext: null, stars: 0 }
  const data = read()
  const prev = data.levels[result.levelId] || { best: 0, stars: 0, bestTime: null, plays: 0 }
  const isNewBest = result.score > prev.best
  const next = { completed: true, best: Math.max(prev.best, result.score), stars: Math.max(prev.stars || 0, result.rating), bestTime: prev.bestTime == null ? result.time : Math.min(prev.bestTime, result.time), plays: (prev.plays || 0) + 1, at: new Date().toISOString() }
  const idx = LEVELS.findIndex((l) => l.id === result.levelId)
  const wasOpen = idx + 1 < LEVELS.length ? isUnlocked(data, idx + 1) : true
  save({ ...data, levels: { ...data.levels, [result.levelId]: next } })
  recordResult('laxbot-jump', { score: result.score })
  return { isNewBest, previousBest: prev.best, unlockedNext: !wasOpen && idx + 1 < LEVELS.length ? LEVELS[idx + 1].id : null, stars: next.stars }
}

export function resetProgress() { save(empty()) }

export const subscribeProgress = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }
export const useProgress = () => useSyncExternalStore(subscribeProgress, read, () => EMPTY)

/**
 * Cloud sync (signed-in players): fold the server's copy into this device, FORWARD ONLY: a level stays completed, stars and bests only go up. Nothing local is ever overwritten by
 * an older value, and the cloud copy is never trusted for more than progress (scores are verified by the server separately).
 */
export function mergeRemote(remoteLevels) {
  const data = read()
  const levels = { ...data.levels }
  let changed = false
  for (const [id, r] of Object.entries(remoteLevels || {})) {
    if (!r || typeof r !== 'object') continue
    const cur = levels[id] || { best: 0, stars: 0, plays: 0 }
    const next = { ...cur, completed: !!cur.completed || r.completed === true, stars: Math.max(cur.stars || 0, r.stars || 0), best: Math.max(cur.best || 0, r.local_best || 0, r.verified_best || 0) }
    if (next.completed !== !!cur.completed || next.stars !== (cur.stars || 0) || next.best !== (cur.best || 0)) { levels[id] = next; changed = true }
  }
  if (changed) save({ ...data, levels })
  return changed
}
