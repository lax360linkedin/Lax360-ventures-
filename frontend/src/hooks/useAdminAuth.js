import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { adminLogin, adminLogout, fetchAdminSession } from '../services/adminAuthService.js'
import { onSessionExpired, setAdminBearer, setCsrfToken } from '../services/apiClient.js'

// Company-admin session store. Completely separate from the public website's useAuth: signing in or out of one never touches the other.
// The state comes from the backend (`GET /api/admin/auth/session`), never from browser storage, so editing localStorage grants nothing.
// It only loads while the admin app is on screen, so public visitors never call admin endpoints.
const INITIAL = { identity: null, status: 'loading', notice: null }
let state = INITIAL
const listeners = new Set()
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }
const BEARER_KEY = 'lax360-admin-bearer' // sessionStorage (cleared when the tab closes); only ever written when the cookie is blocked
const readBearer = () => { try { return sessionStorage.getItem(BEARER_KEY) } catch { return null } }
const keepBearer = (token) => { setAdminBearer(token); try { token ? sessionStorage.setItem(BEARER_KEY, token) : sessionStorage.removeItem(BEARER_KEY) } catch { /* private mode: it just lasts until reload */ } }
const split = ({ csrf_token: csrf, session_token: _token, ...identity }) => { setCsrfToken(csrf, 'admin'); return identity }

let started = false
function load() {
  if (started) return
  started = true
  setAdminBearer(readBearer()) // a fallback session from earlier in this tab, if any (otherwise the cookie is used)
  fetchAdminSession()
    .then((s) => set({ identity: split(s), status: 'ready' }))
    .catch(() => set({ identity: null, status: 'ready' }))
}

onSessionExpired((code) => { setCsrfToken(null, 'admin'); keepBearer(null); set({ identity: null, status: 'ready', notice: code === 'session_expired' ? 'expired' : 'lost' }) }, 'admin')

const COOKIE_NOT_KEPT = 'You were signed in, but this browser did not keep the session, so the admin panel cannot load your data. '
  + 'Allow cookies for this site and sign in again, or ask whoever deploys it to serve the API through the website\'s own domain.'

async function signIn({ email, password }) {
  try {
    const login = await adminLogin(email, password)
    const sessionToken = login.session_token
    const identity = split(login)
    // Prove the session really works before showing the panel. First choice: the HttpOnly cookie (JavaScript never sees a token).
    let working = true
    try {
      await fetchAdminSession()
    } catch (e) {
      if (e.status !== 401) working = true // network / 5xx: let the panel load and report that itself
      else {
        // The browser did not keep the cookie (cross-site deployment with third-party cookies blocked). Fall back to the Bearer token for this tab.
        keepBearer(sessionToken)
        try { await fetchAdminSession() } catch (e2) { working = e2.status !== 401 }
        if (!working) keepBearer(null)
      }
    }
    if (!working) {
      setCsrfToken(null, 'admin')
      return { ok: false, error: COOKIE_NOT_KEPT, code: 'cookie_not_kept' }
    }
    set({ identity, status: 'ready', notice: null })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message, fields: e.fields || null, code: e.code }
  }
}

async function signOut() {
  try { await adminLogout() } catch { /* already signed out or the server is unreachable: sign out locally either way */ }
  setCsrfToken(null, 'admin')
  keepBearer(null)
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
