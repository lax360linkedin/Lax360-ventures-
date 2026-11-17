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

/**
 * The address that OPENS a branch's location in Google Maps (not the embedded frame), worked out from its saved embed address: the place id (`!1s0x..:0x..`) opens that exact place, otherwise the
 * coordinates (`!2d<lng>!3d<lat>`) open that point; `fallback` (a plain search link) is used when the embed holds neither. Nothing about any branch is hard-coded here.
 */
export function mapOpenUrl(embed, fallback = '') {
  const url = parseMapEmbed(embed)
  if (!url) return fallback
  const place = decodeURIComponent(url).match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i)
  if (place) return `https://www.google.com/maps?ftid=${place[1]}`
  const lng = url.match(/!2d(-?\d+(?:\.\d+)?)/)
  const lat = url.match(/!3d(-?\d+(?:\.\d+)?)/)
  return lng && lat ? `https://www.google.com/maps/search/?api=1&query=${lat[1]},${lng[1]}` : fallback
}
