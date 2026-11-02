// The one place that talks to the backend. No fake success is ever returned: a failure is thrown as an ApiError
// with a message that is safe to show to visitors.
//
// - Session cookie: HttpOnly, set by the server (never readable from JS). `credentials: 'include'` sends it.
// - CSRF: the token is kept in memory only (never localStorage) and sent as X-CSRF-Token on state-changing calls.
import { apiUrl } from './apiConfig.js'

export class ApiError extends Error {
  constructor({ status = 0, code = 'error', message, fields = null }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

const NETWORK = "We couldn't reach the server. Please check your connection and try again — the rest of the site still works."
const TIMEOUT = 'The server took too long to respond. Please try again.'

// Two separate sign-in systems share this client: the public website (customers) and the company admin (/api/admin/*).
// Each has its own session cookie on the server, so each has its own CSRF token and its own "session expired" signal here.
const realmOf = (path) => (/^\/api\/admin(?:[/?]|$)/.test(path) ? 'admin' : 'public')
const csrfTokens = { public: null, admin: null }
export const setCsrfToken = (token, realm = 'public') => { csrfTokens[realm] = token || null }

const expiredListeners = { public: new Set(), admin: new Set() }
/** Called when the server says the login session expired. Returns an unsubscribe function. */
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
    })
    if (error.code === 'session_expired') expiredListeners[realm].forEach((fn) => fn())
    throw error
  }
  const total = res.headers.get('X-Total-Count')
  if (total !== null && Array.isArray(data)) Object.defineProperty(data, 'total', { value: Number(total) }) // list endpoints that paginate via a header
  return data
}
