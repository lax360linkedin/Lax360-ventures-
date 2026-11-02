import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { adminLogin, adminLogout, fetchAdminSession } from '../services/adminAuthService.js'
import { onSessionExpired, setCsrfToken } from '../services/apiClient.js'

// Company-admin session store. Completely separate from the public website's useAuth: signing in or out of one never touches the other.
// The state comes from the backend (`GET /api/admin/auth/session`), never from browser storage, so editing localStorage grants nothing.
// It only loads while the admin app is on screen, so public visitors never call admin endpoints.
const INITIAL = { identity: null, status: 'loading', notice: null }
let state = INITIAL
const listeners = new Set()
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }
const split = ({ csrf_token: csrf, ...identity }) => { setCsrfToken(csrf, 'admin'); return identity }

let started = false
function load() {
  if (started) return
  started = true
  fetchAdminSession()
    .then((s) => set({ identity: split(s), status: 'ready' }))
    .catch(() => set({ identity: null, status: 'ready' }))
}

onSessionExpired(() => { setCsrfToken(null, 'admin'); set({ identity: null, status: 'ready', notice: 'expired' }) }, 'admin')

async function signIn({ email, password }) {
  try {
    set({ identity: split(await adminLogin(email, password)), status: 'ready', notice: null })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message, fields: e.fields || null, code: e.code }
  }
}

async function signOut() {
  try { await adminLogout() } catch { /* already signed out or the server is unreachable: sign out locally either way */ }
  setCsrfToken(null, 'admin')
  set({ identity: null, notice: null })
}

export function useAdminAuth() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => INITIAL)
  useEffect(() => { load() }, [])
  return {
    identity: snapshot.identity,
    user: snapshot.identity?.user || null,
    loading: snapshot.status === 'loading',
    notice: snapshot.notice,
    signIn: useCallback(signIn, []),
    signOut: useCallback(signOut, []),
  }
}
