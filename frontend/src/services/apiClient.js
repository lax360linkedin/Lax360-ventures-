// The one place that talks to the backend. No fake success is ever returned: a failure is thrown as an ApiError
// with a message that is safe to show to visitors.
//
// - Session cookie: HttpOnly, set by the server (never readable from JS). `credentials: 'include'` sends it.
// - CSRF: the token is kept in memory only (never localStorage) and sent as X-CSRF-Token on state-changing calls.
import { apiUrl } from './apiConfig.js'

export class ApiError extends Error {
  constructor({ status = 0, code = 'error', message, fields = null, details = null }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.details = details // structured extras, e.g. where a media file is used
  }
}

const NETWORK = "We couldn't reach the server. Please check your connection and try again — the rest of the site still works."
const TIMEOUT = 'The server took too long to respond. Please try again.'

// Two separate sign-in systems share this client: the public website (customers) and the company admin (/api/admin/*).
// Each has its own session cookie on the server, so each has its own CSRF token and its own "session expired" signal here.
const realmOf = (path) => (/^\/api\/admin(?:[/?]|$)/.test(path) ? 'admin' : 'public')
const csrfTokens = { public: null, admin: null }
// Company admin only: when the browser refuses the cross-site session cookie, the server's session token is sent as `Authorization: Bearer`
// instead (see hooks/useAdminAuth.js). Normally null: the HttpOnly cookie does the work and JavaScript never sees a token.
let adminBearer = null
export const setAdminBearer = (token) => { adminBearer = token || null }
export const setCsrfToken = (token, realm = 'public') => { csrfTokens[realm] = token || null }

const expiredListeners = { public: new Set(), admin: new Set() }
/** Called when the server says the login session expired / is missing (the listener receives the error code). Returns an unsubscribe function. */
export const onSessionExpired = (fn, realm = 'public') => { expiredListeners[realm].add(fn); return () => expiredListeners[realm].delete(fn) }

export async function api(path, { method = 'GET', body, rawBody, contentType, as = 'json', signal, timeoutMs = 20000 } = {}) {
  const realm = realmOf(path)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), timeoutMs)
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason)
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (rawBody !== undefined) headers['Content-Type'] = contentType || 'application/octet-stream' // file uploads: the bytes themselves
  if (method !== 'GET' && csrfTokens[realm]) headers['X-CSRF-Token'] = csrfTokens[realm]
  if (realm === 'admin' && adminBearer) headers.Authorization = `Bearer ${adminBearer}`

  let res
  try {
    res = await fetch(apiUrl(path), { method, headers, body: rawBody !== undefined ? rawBody : body === undefined ? undefined : JSON.stringify(body), credentials: 'include', signal: controller.signal })
  } catch (err) {
    if (signal?.aborted) throw err // the caller cancelled (AbortError)
    if (controller.signal.reason?.name === 'TimeoutError') throw new ApiError({ code: 'timeout', message: TIMEOUT })
    throw new ApiError({ code: 'network', message: NETWORK })
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 204) return null
  if (as === 'blob' && res.ok) return { blob: await res.blob(), total: Number(res.headers.get('X-Total-Count') || 0) }
  let data = null
  try { data = await res.json() } catch { /* non-JSON body: handled below */ }
  if (!res.ok) {
    const e = data?.error
    const error = new ApiError({
      status: res.status,
      code: e?.code || 'http_error',
      message: e?.message || (res.status >= 500 ? 'Something went wrong on our side. Please try again.' : 'That request could not be completed.'),
      fields: e?.fields || null,
      details: e?.details || null,
    })
    // Public site: only a clearly expired session is announced (a plain 401 just means "not signed in", which is normal there).
    // Company admin: ANY 401 on a protected call (the sign-in request itself excepted) means this browser no longer has a valid admin session.
    const lost = realm === 'admin' ? res.status === 401 && !path.startsWith('/api/admin/auth/login') : error.code === 'session_expired'
    if (lost) expiredListeners[realm].forEach((fn) => fn(error.code))
    throw error
  }
  const total = res.headers.get('X-Total-Count')
  if (total !== null && Array.isArray(data)) Object.defineProperty(data, 'total', { value: Number(total) }) // list endpoints that paginate via a header
  return data
}

/**
 * Upload a file as the raw request body with REAL progress (fetch cannot report upload progress). Same session, CSRF and Bearer handling as
 * `api()`. Resolves with the parsed JSON response; rejects with an ApiError.
 */
export function upload(path, file, { method = 'POST', contentType, onProgress, timeoutMs = 10 * 60 * 1000 } = {}) {
  const realm = realmOf(path)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, apiUrl(path))
    xhr.withCredentials = true
    xhr.timeout = timeoutMs
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('Content-Type', contentType || file.type || 'application/octet-stream')
    if (csrfTokens[realm]) xhr.setRequestHeader('X-CSRF-Token', csrfTokens[realm])
    if (realm === 'admin' && adminBearer) xhr.setRequestHeader('Authorization', `Bearer ${adminBearer}`)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total) }
    xhr.onload = () => {
      let data = null
      try { data = JSON.parse(xhr.responseText) } catch { /* non-JSON body */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data)
      const e = data?.error
      const error = new ApiError({ status: xhr.status, code: e?.code || 'http_error', message: e?.message || (xhr.status >= 500 ? 'Something went wrong on our side. Please try again.' : 'That upload could not be completed.'), fields: e?.fields || null, details: e?.details || null })
      if (realm === 'admin' && xhr.status === 401) expiredListeners.admin.forEach((fn) => fn(error.code))
      return reject(error)
    }
    xhr.onerror = () => reject(new ApiError({ code: 'network', message: NETWORK }))
    xhr.ontimeout = () => reject(new ApiError({ code: 'timeout', message: TIMEOUT }))
    xhr.send(file)
  })
}
