// Cold-start handling for a backend on a plan that puts it to sleep (for example Render's free instances, which stop after about 15 minutes without traffic and need roughly
// 30 to 60 seconds to start again). This file cannot make the server start faster: it only (1) wakes it early with a cheap request and (2) lets the screens WAIT for it honestly, with
// progress, instead of failing after a fixed 20 seconds. `/api/health` does no database work, so it answers as soon as the process is up.
import { apiUrl } from './apiConfig.js'

const HEALTH = '/api/health'
let lastWarm = 0

async function ping(timeoutMs, signal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })
  try {
    const res = await fetch(apiUrl(HEALTH), { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal })
    if (!res.ok) return false
    const data = await res.json().catch(() => null)
    return data?.status === 'ok'
  } catch { return false } finally { clearTimeout(timer) }
}

/** Fire-and-forget wake-up call (at most once every 4 minutes per tab). Safe to call from anywhere; it never throws and sends no data. */
export function warmBackend() {
  const now = Date.now()
  if (now - lastWarm < 4 * 60 * 1000) return
  lastWarm = now
  ping(60000).catch(() => {})
}

/**
 * Wait until the backend answers its health check. `onProgress({ seconds })` is called about once a second. Resolves true when it is up, false when `maxMs` passed or the signal aborted.
 */
export async function waitForBackend({ maxMs = 120000, onProgress, signal } = {}) {
  const started = Date.now()
  while (!signal?.aborted && Date.now() - started < maxMs) {
    const tick = setInterval(() => onProgress?.({ seconds: Math.round((Date.now() - started) / 1000) }), 1000)
    onProgress?.({ seconds: Math.round((Date.now() - started) / 1000) })
    const ok = await ping(10000, signal)
    clearInterval(tick)
    if (ok) return true
    await new Promise((r) => setTimeout(r, 2000))
  }
  return false
}
