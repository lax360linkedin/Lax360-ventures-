// Which external links of a product or solution may be shown as buttons: only real https addresses (no placeholders), in a fixed order, with the label chosen in the admin panel.
const BAD = new Set(['example', 'localhost', 'test', 'placeholder', 'yourcompany', 'yourdomain', 'domain', 'lorem', 'invalid'])
export function validLink(v) {
  const m = /^https?:\/\/([A-Za-z0-9.-]+)(:\d+)?(\/\S*)?$/.exec((v || '').trim())
  if (!m) return false
  const host = m[1].toLowerCase()
  return host.includes('.') && !host.startsWith('.') && !host.endsWith('.') && !host.split('.').some((l) => BAD.has(l))
}
export const LINKS = [['live_website_url', 'View Live Website'], ['live_app_url', 'Launch Application'], ['landing_url', 'Explore Product'], ['play_store_url', 'Get it on Google Play'], ['app_store_url', 'Download on the App Store'],
  ['desktop_download_url', 'Download Application'], ['docs_url', 'View Documentation'], ['video_link', 'Watch Demo'], ['custom_link_url', 'Learn more']]
export const linkButtons = (d) => LINKS.filter(([k]) => validLink(d[k])).map(([k, label]) => ({ type: k, label: (d[`${k}_label`] || '').trim() || label, url: d[k].trim() }))
