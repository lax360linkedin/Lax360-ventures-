import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { fetchSession, login, logout, register, updateProfile } from '../services/authService.js'
import { onSessionExpired, setCsrfToken } from '../services/apiClient.js'

// Session store (same pattern as useTheme). The signed-in state comes from the backend (`GET /api/auth/me`), never from
// browser storage. `status` is "loading" until that first check finishes, so guarded pages and the header avoid a flash.
// The server / prerender snapshot is always "loading", so hydration matches.
const INITIAL = { user: null, status: 'loading', notice: null }
let state = INITIAL
const listeners = new Set()

const set = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

let started = false
function load() {
  if (started) return
  started = true
  fetchSession()
    .then((s) => { setCsrfToken(s.csrf_token); set({ user: s.user, status: 'ready' }) })
    .catch(() => set({ user: null, status: 'ready' })) // 401 = signed out; a network error just leaves the site usable
}

onSessionExpired(() => { setCsrfToken(null); set({ user: null, status: 'ready', notice: 'expired' }) })

async function signIn({ email, password }) {
  try {
    const s = await login(email, password)
    setCsrfToken(s.csrf_token)
    set({ user: s.user, status: 'ready', notice: null })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message, fields: e.fields || null, code: e.code }
  }
}

async function signUp({ fullName, email, password }) {
  try {
    const s = await register({ fullName, email, password })
    setCsrfToken(s.csrf_token)
    set({ user: s.user, status: 'ready', notice: null })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message, fields: e.fields || null, code: e.code }
  }
}

async function signOut() {
  try { await logout() } catch { /* the server may be unreachable or the session already gone; sign out locally either way */ }
  setCsrfToken(null)
  set({ user: null, notice: null })
}

async function updateName(fullName) {
  const user = await updateProfile(fullName)
  set({ user })
  return user
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => INITIAL)
  useEffect(() => { load() }, [])
  return {
    user: snapshot.user,
    loading: snapshot.status === 'loading',
    notice: snapshot.notice,
    signIn: useCallback(signIn, []),
    signUp: useCallback(signUp, []),
    signOut: useCallback(signOut, []),
    updateName: useCallback(updateName, []),
  }
}
