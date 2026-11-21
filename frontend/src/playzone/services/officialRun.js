// Official (server-verified) runs. A game calls `begin()` when a round starts and `finish()` when it ends. Both are non-blocking for gameplay: `begin` fires the session request in
// the background and `finish` reports a status the results screen shows (guest / saving / saved / needs-retry). Guests are never interrupted: their result simply stays a local record.
//
// What the browser sends is only the bounded result of the run; the SERVER computes and records the score (see backend app/play_zone/verify.py).
import { useSyncExternalStore } from 'react'
import { getAuthUser, subscribeAuth } from '../../hooks/useAuth.js'
import { completeSession, isUnavailable, startSession } from './playZoneApi.js'
import { syncGame } from './cloudSync.js'

const PENDING_KEY = 'lax360-playzone-pending-v1'
const runs = {} // game -> { ready: Promise, official, sessionId, seed, levelId }
let status = {} // game -> { state, outcome, error }
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const setStatus = (game, next) => { status = { ...status, [game]: next }; emit() }
export const subscribeRuns = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

const newKey = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `${Date.now()}${Math.random().toString(36).slice(2)}`).slice(0, 40)

/** Kept in a window event so the profile / challenge panels refresh after a verified run. */
export const RUN_EVENT = 'lax360-playzone-run-saved'

function readPending() { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') } catch { return [] } }
function writePending(list) { try { localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-10))) } catch { /* storage unavailable */ } }

/** Start an official run. Returns the run object; `run.ready` settles (never rejects) once the server has answered or the attempt was given up (the game then stays a local run). */
export function begin(game, levelId = null) {
  const user = getAuthUser()
  const run = { game, levelId, official: false, sessionId: null, seed: null, ready: Promise.resolve() }
  runs[game] = run
  if (!user) { setStatus(game, { state: 'guest' }); return run }
  setStatus(game, { state: 'idle' })
  run.ready = startSession({ game, level_id: levelId, request_key: newKey() })
    .then((s) => { if (runs[game] === run) { run.official = !!s.unlocked || game === 'catch-the-stars'; run.sessionId = s.session_id; run.seed = s.seed ?? null; if (!s.unlocked && game !== 'catch-the-stars') run.official = false } })
    .catch(() => { /* offline / backend down / rate limited: the round is played as a local run */ })
  return run
}

/** Forget the run of a game (e.g. a round resumed from a checkpoint cannot be an official run: its clock did not start at zero). */
export function clearRun(game) { delete runs[game]; setStatus(game, getAuthUser() ? { state: 'local' } : { state: 'guest' }) }

export const currentRun = (game) => runs[game] || null

/** Report a finished run. Resolves with the final status; never throws. */
export async function finish(game, result) {
  const run = runs[game]
  if (!getAuthUser()) { setStatus(game, { state: 'guest' }); return status[game] }
  if (!run) { setStatus(game, { state: 'local' }); return status[game] }
  setStatus(game, { state: 'saving' })
  await run.ready
  if (!run.official || !run.sessionId) { setStatus(game, { state: 'local', reason: run.levelId && run.sessionId ? 'locked' : 'no_session' }); return status[game] }
  return submit(game, run.sessionId, result, run.levelId)
}

async function submit(game, sessionId, result, levelId) {
  try {
    const out = await completeSession(sessionId, result)
    dropPending(sessionId)
    setStatus(game, { state: out.accepted ? (out.flagged ? 'flagged' : 'saved') : 'rejected', outcome: out })
    if (out.accepted) { window.dispatchEvent(new Event(RUN_EVENT)); syncGame(game).catch(() => {}) }
    return status[game]
  } catch (e) {
    if (e?.code === 'session_expired' || e?.status === 401) { setStatus(game, { state: 'signed_out' }); return status[game] }
    if (isUnavailable(e) || e?.code === 'rate_limited') {
      const list = readPending().filter((p) => p.sessionId !== sessionId); list.push({ game, sessionId, result, levelId, at: Date.now() }); writePending(list)
      setStatus(game, { state: 'retry', error: e.message })
    } else setStatus(game, { state: 'rejected', outcome: { accepted: false, reasons: [e?.code || 'error'] }, error: e?.message })
    return status[game]
  }
}
function dropPending(sessionId) { const l = readPending(); if (l.some((p) => p.sessionId === sessionId)) writePending(l.filter((p) => p.sessionId !== sessionId)) }

/** The "Try saving again" button: re-sends the stored result of the last unsaved run. */
export async function retry(game) {
  const p = readPending().filter((x) => x.game === game).pop()
  if (!p) { setStatus(game, { state: 'local' }); return status[game] }
  setStatus(game, { state: 'saving' })
  return submit(game, p.sessionId, p.result, p.levelId)
}

/** After sign-in / on page load: quietly send runs that could not be saved earlier (the server still enforces expiry and one result per session). */
export async function flushPending() {
  if (!getAuthUser()) return
  for (const p of readPending()) {
    try { await completeSession(p.sessionId, p.result); dropPending(p.sessionId); window.dispatchEvent(new Event(RUN_EVENT)) } catch (e) { if (!isUnavailable(e) && e?.code !== 'rate_limited') dropPending(p.sessionId) }
  }
}

export const useRunStatus = (game) => useSyncExternalStore(subscribeRuns, () => status[game] || null, () => null)
export { subscribeAuth }
