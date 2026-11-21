import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { api } from '../services/apiClient.js'
import { RUN_EVENT } from './services/officialRun.js'
import { claimChallenge, fetchAchievements, fetchChallenges, fetchProfile, isUnavailable, patchProfile } from './services/playZoneApi.js'

/** Runs a loader that re-runs on sign-in/out and after every saved official run. Reports { status: 'loading'|'ready'|'guest'|'error'|'unavailable', data, error, reload }. */
function useLive(loader, { needsUser = false } = {}) {
  const { user } = useAuth()
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener(RUN_EVENT, bump)
    return () => window.removeEventListener(RUN_EVENT, bump)
  }, [])
  useEffect(() => {
    let alive = true
    if (needsUser && !user) { setState({ status: 'guest', data: null, error: null }); return undefined }
    setState((s) => ({ status: s.data ? 'ready' : 'loading', data: s.data, error: null }))
    loader().then((data) => alive && setState({ status: 'ready', data, error: null }))
      .catch((error) => alive && setState({ status: isUnavailable(error) ? 'unavailable' : 'error', data: null, error }))
    return () => { alive = false }
  }, [user?.id, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: () => setTick((n) => n + 1) }
}

export const usePlayerProfile = () => useLive(fetchProfile, { needsUser: true })
export const useAchievements = () => useLive(fetchAchievements)
export const useChallenges = () => useLive(fetchChallenges)

/** Profile edits and challenge claims with a small busy/error state. */
export function usePlayerActions(reload) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = useCallback(async (fn) => {
    setBusy(true); setError('')
    try { const out = await fn(); reload?.(); return out } catch (e) { setError(e.fields ? Object.values(e.fields)[0] : e.message); return null } finally { setBusy(false) }
  }, [reload])
  return { busy, error, saveProfile: (body) => run(() => patchProfile(body)), claim: (id) => run(() => claimChallenge(id)) }
}

// ---- public configuration (what the admin panel controls) ------------------------------------------
// Fetched once and kept for a minute. If the backend cannot answer, `null` is returned and everything stays available exactly as before: a backend outage never hides the games.
let cached = null
let cachedAt = 0
let inflight = null
export function loadPlayZoneConfig() {
  if (cached && Date.now() - cachedAt < 60000) return Promise.resolve(cached)
  if (!inflight) inflight = api('/api/play-zone/config', { timeoutMs: 6000 }).then((c) => { cached = c; cachedAt = Date.now(); return c }).catch(() => cached).finally(() => { inflight = null })
  return inflight
}
export function usePlayZoneConfig() {
  const [cfg, setCfg] = useState(cached)
  useEffect(() => { let alive = true; loadPlayZoneConfig().then((c) => alive && setCfg(c)); return () => { alive = false } }, [])
  return cfg
}

export { applyConfig, unavailableReason } from './configRules.js'
