// Google Maps embed handling. The admin pastes either the <iframe ...> code from Google Maps (Share > Embed a map) or its address; only the address is ever kept, and only an https
// Google Maps EMBED address is ever put in a frame (the server checks the same rules; this is the same check in the browser, so a bad value is also refused at render time).
const HOSTS = new Set(['www.google.com', 'google.com', 'maps.google.com'])

/** The embed address in a pasted iframe or address, or null when it is not an acceptable Google Maps embed. */
export function parseMapEmbed(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const m = raw.match(/<iframe\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
  const url = (m ? (m[1] || m[2] || '') : raw).trim().replace(/&amp;/g, '&')
  if (!url || url.length > 1500 || /[<>\s"']/.test(url)) return null
  try {
    const u = new URL(url)
    const embed = u.pathname.startsWith('/maps/embed') || (u.pathname.replace(/\/$/, '') === '/maps' && u.searchParams.get('output') === 'embed')
    return u.protocol === 'https:' && HOSTS.has(u.hostname) && !u.username && (u.port === '' || u.port === '443') && embed ? url : null
  } catch { return null }
}
