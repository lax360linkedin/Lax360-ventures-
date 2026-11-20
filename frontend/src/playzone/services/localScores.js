import { useSyncExternalStore } from 'react'

// LOCAL scores and achievements: kept in this browser only (localStorage). They are personal records for fun and are NEVER sent to the leaderboard: a score typed into browser storage can be
// edited by anyone, so only server-validated scores (a later milestone) will ever be ranked. The screens always label these "Local · this device".
//
// The interface is deliberately small (`recordResult`, `getLocal`, `useLocal`) so a future `officialScores` service can sit beside it without changing the game.

const KEY = 'lax360-playzone-local-v1'
const listeners = new Set()
let cache = null

const empty = () => ({ games: {}, achievements: {} })
const read = () => {
  if (cache) return cache
  try { cache = { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { cache = empty() }
  return cache
}
const save = (next) => {
  cache = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage unavailable: the records last for this visit only */ }
  listeners.forEach((l) => l())
}

export const getLocal = () => read()
export const getLocalBest = (slug) => read().games[slug]?.best ?? null

/**
 * Store one finished round. Returns { best, previousBest, isNewBest, plays, unlocked: [achievement ids newly unlocked] }.
 * Achievements are local too (this device) and use the ids of the planned achievements.
 */
export function recordResult(slug, result) {
  const data = read()
  const g = data.games[slug] || { best: 0, plays: 0, golden: 0, diamonds: 0, lastScore: 0 }
  const previousBest = g.best || 0
  const isNewBest = result.score > previousBest
  const next = { ...g, best: Math.max(previousBest, result.score), bestAt: isNewBest ? new Date().toISOString() : g.bestAt, plays: g.plays + 1, golden: g.golden + (result.golden || 0), diamonds: g.diamonds + (result.diamonds || 0), lastScore: result.score }
  const unlocked = []
  const ach = { ...data.achievements }
  const unlock = (id) => { if (!ach[id]) { ach[id] = new Date().toISOString(); unlocked.push(id) } }
  if (slug === 'catch-the-stars') {
    unlock('first-spark') // a first round
    if (next.golden > 0) unlock('star-catcher') // a first golden star
  }
  save({ ...data, games: { ...data.games, [slug]: next }, achievements: ach })
  return { best: next.best, previousBest, isNewBest, plays: next.plays, unlocked }
}

export const subscribeLocal = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }
export const useLocal = () => useSyncExternalStore(subscribeLocal, read, () => empty())
