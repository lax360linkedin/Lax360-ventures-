// Theme engine: turns a small theme definition (a handful of HEX colours) into the website's CSS variables, for the Light and the Dark appearance.
// Every component already reads colours through these variables (styles/index.css), so a theme built here re-colours the whole site without touching a component.
// The same colour maths as scripts/generate-themes.mjs (WCAG contrast: text and buttons are darkened/lightened, within the same hue, until they are readable).
//
// A definition: { id, name, mode: 'light' | 'dark' | 'both', gradient?, colors: {...}, darkColors?: {...} }
//   colors keys: primary (buttons, links), secondary (second brand colour), accent (highlights), bg, surface (sections), text, heading, button, buttonText,
//   header, footer, nav, card, border, icon, hover, active, gradA, gradB, gradC. Only `primary` (or `accent`) and `bg` are required; the rest is derived.
//   darkColors: optional overrides for the dark appearance; otherwise the dark colours are derived from the light ones.
// The CSS is applied under <html data-palette="custom"> so it never clashes with the built-in themes.

const hex = (c) => String(c).replace('#', '')
const toRgb = (c) => [0, 2, 4].map((i) => parseInt(hex(c).slice(i, i + 2), 16))
const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`
export const isHex = (c) => /^#[0-9a-fA-F]{6}$/.test(c || '')
const mix = (a, b, t) => { const x = toRgb(a), y = toRgb(b); return toHex(x.map((v, i) => v * (1 - t) + y[i] * t)) } // t = share of b
const lum = (c) => { const [r, g, b] = toRgb(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const rgba = (c, a) => `rgba(${toRgb(c).join(', ')}, ${a})`
const triple = (c) => toRgb(c).join(' ')
/** Moves `color` toward `toward` (black to darken, white to lighten) in small steps until it reaches `min` contrast on every colour in `on`. */
const reach = (color, on, min, toward) => { for (let k = 0; k <= 1.0001; k += 0.02) { const c = mix(color, toward, Math.min(k, 1)); if (on.every((o) => contrast(c, o) >= min)) return c } return toward }
const darker = (color, on, min) => reach(color, on, min, '#000000')
const lighter = (color, on, min) => reach(color, on, min, '#ffffff')

/** The colours used for one appearance, with everything not given derived. `dark` selects the derivation. */
function resolve(c, dark) {
  const primary = (c.primary || c.accent || '#2563eb').toLowerCase()
  const bg = (c.bg || (dark ? '#0b0e14' : '#ffffff')).toLowerCase()
  const surface = (c.surface || (dark ? mix(bg, '#ffffff', 0.05) : mix(bg, primary, 0.05))).toLowerCase()
  const deep = mix(surface, dark ? '#ffffff' : primary, dark ? 0.05 : 0.1)
  const text = (c.text || (dark ? '#f1f5f9' : darker(mix(primary, '#000000', 0.8), [bg, deep], 11))).toLowerCase()
  const soft = dark ? lighter(mix(text, bg, 0.3), [bg, surface, deep], 4.8) : darker(mix(text, bg, 0.3), [bg, surface, deep], 4.8)
  const ink = dark ? lighter(primary, [bg, surface, deep], 4.5) : darker(primary, [bg, surface, deep], 4.5) // primary as text / links
  const btn = (c.button || darker(primary, ['#ffffff'], 4.5)).toLowerCase() // behind white button text
  const btnText = (c.buttonText || '#ffffff').toLowerCase()
  const hover = (c.hover || mix(btn, '#000000', 0.14)).toLowerCase()
  const secondary = (c.secondary || '').toLowerCase()
  const accent = (c.accent || '').toLowerCase()
  const ink2 = secondary ? (dark ? lighter(secondary, [bg, surface, deep], 4.5) : darker(secondary, [bg, surface, deep], 4.5)) : ink
  return { primary, bg, surface, deep, text, soft, ink, btn, btnText, hover, secondary, accent, ink2, c }
}

function tokens(r, dark) {
  const { primary, bg, surface, text, soft, ink, ink2, btn, hover, secondary, accent, c } = r
  const decoration = accent || primary
  const gradEnd = secondary ? (contrast(secondary, bg) >= 3 ? secondary : ink2) : (contrast(mix(primary, ink, 0.5), bg) >= 3 ? mix(primary, ink, 0.5) : ink)
  const gradA = c.gradA || (dark ? mix(ink, '#ffffff', 0.5) : mix(ink, '#000000', 0.25))
  const gradB = c.gradB || ink
  const gradC = c.gradC || gradEnd
  const border = c.border
  const out = {
    '--color-night': bg, '--color-base2': surface, '--color-deep': r.deep, '--color-fg': text, '--color-soft': soft,
    '--color-primary': btn, '--color-primary-hover': hover, '--color-accent': ink2, '--color-lav': ink, '--color-sky': accent ? (dark ? lighter(accent, [bg, surface], 3) : darker(accent, [bg, surface], 3)) : ink,
    '--color-glass': dark ? 'rgba(255, 255, 255, 0.05)' : rgba(primary, 0.06), '--color-glass-strong': dark ? 'rgba(255, 255, 255, 0.09)' : rgba(primary, 0.11),
    '--color-edge': border ? rgba(border, 0.55) : rgba(dark ? ink : primary, dark ? 0.2 : 0.24), '--color-edge-strong': border || rgba(dark ? ink : primary, dark ? 0.4 : 0.46),
    '--color-violet': ink2, '--color-tint': dark ? '#ffffff' : ink,
    '--shadow-menu': `0 24px 60px -24px ${dark ? 'rgba(0, 0, 0, 0.75)' : rgba(mix(ink, '#000000', 0.5), 0.26)}, 0 0 0 1px ${rgba(primary, 0.14)}`,
    '--shadow-lift': `0 24px 50px -22px ${rgba(btn, dark ? 0.45 : 0.4)}`,
    '--glass-shadow': dark ? 'rgba(0, 0, 0, 0.8)' : rgba(mix(ink, '#000000', 0.5), 0.26), '--shine': rgba(primary, dark ? 0.16 : 0.13),
    '--grad-a': gradA, '--grad-b': gradB, '--grad-c': gradC,
    '--amb-1': rgba(primary, dark ? 0.2 : 0.15), '--amb-2': rgba(secondary || mix(primary, '#ffffff', 0.5), secondary ? 0.1 : 0.13), '--amb-3': rgba(primary, dark ? 0.12 : 0.08),
    '--wordmark-a': rgba(primary, dark ? 0.3 : 0.22), '--wordmark-b': rgba(primary, 0.05),
    '--art-line': c.icon || ink, '--art-glass': rgba(primary, dark ? 0.06 : 0.08), '--art-faint': rgba(primary, 0.26), '--art-grid': rgba(primary, dark ? 0.12 : 0.1),
    '--art-solid': dark ? rgba(bg, 0.92) : bg, '--art-vio': secondary || decoration, '--art-sky': c.icon || ink,
    '--glow': triple(primary), '--glow2': triple(secondary || accent || mix(primary, '#ffffff', 0.3)), '--glow3': triple(mix(primary, '#ffffff', 0.55)), '--btn-hover': hover,
    '--bot-violet': btn, '--bot-heart': primary, '--bot-line': rgba(ink, 0.7), '--bot-glow': rgba(primary, 0.42), '--bot-hl': rgba(primary, 0.14),
    '--page-bg': bg,
  }
  if (dark) { out['--img-shade'] = bg; out['--ring-label'] = mix(ink, '#ffffff', 0.6) }
  else { out['--glass-a'] = 'rgba(255, 255, 255, 0.93)'; out['--glass-b'] = rgba(surface, 0.78); out['--glass-flat-a'] = 'rgba(255, 255, 255, 0.91)'; out['--glass-flat-b'] = rgba(surface, 0.75); out['--glass-inset'] = 'rgba(255, 255, 255, 0.92)' }
  if (c.card) { // card and section backgrounds: the glass panels take the chosen card colour
    out['--glass-a'] = rgba(c.card, 0.96); out['--glass-b'] = rgba(c.card, 0.82); out['--glass-flat-a'] = rgba(c.card, 0.94); out['--glass-flat-b'] = rgba(c.card, 0.8)
    out['--glass-inset'] = rgba(c.card, 0.9)
  }
  return out
}

const decl = (o) => Object.entries(o).map(([k, v]) => `${k}: ${v};`).join(' ')

/** Rules for the parts that have no shared variable (header, footer, navigation, headings, button text, current page, gradient page background). */
function partRules(sel, r, dark, gradient) {
  const { c, bg, text } = r
  const rules = []
  if (c.header) rules.push(`${sel} body > #root header { background-color: color-mix(in srgb, ${c.header} 92%, transparent); }`)
  if (c.footer) rules.push(`${sel} footer[aria-label="Site footer"] { background-color: ${c.footer}; }`)
  if (c.nav) rules.push(`${sel} header nav a, ${sel} nav[aria-label="Mobile"] a { color: ${c.nav}; }`)
  if (c.active) rules.push(`${sel} header nav a[aria-current="page"], ${sel} nav[aria-label="Mobile"] a[aria-current="page"] { color: ${c.active}; }`)
  if (c.heading) rules.push(`${sel} :is(h1, h2, h3, h4, .h1, .h2):not(:where(.media-dark, .media-dark *, .hero-media *)) { color: ${c.heading}; }`)
  if (c.buttonText) rules.push(`${sel} .bg-primary { color: ${c.buttonText}; }`)
  if (gradient) {
    const a = c.gradA || r.ink, b = c.gradB || r.ink2
    rules.push(`${sel} body { background-image: linear-gradient(135deg, color-mix(in srgb, ${a} ${dark ? 16 : 10}%, ${bg}), color-mix(in srgb, ${b} ${dark ? 12 : 8}%, ${bg})); background-attachment: fixed; }`)
  }
  void text
  return rules
}

const COLOR_KEYS = ['primary', 'secondary', 'accent', 'bg', 'surface', 'text', 'heading', 'button', 'buttonText', 'header', 'footer', 'nav', 'card', 'border', 'icon', 'hover', 'active', 'gradA', 'gradB', 'gradC']
const onlyHex = (o) => Object.fromEntries(COLOR_KEYS.filter((k) => o && isHex(o[k])).map((k) => [k, o[k].toLowerCase()]))
/** A definition reduced to what the engine understands: known keys, valid HEX colours only (so nothing but colours can ever reach the generated CSS, wherever the definition came from). */
export function sanitizeDef(def) {
  const d = def && typeof def === 'object' ? def : {}
  return { id: String(d.id || ''), name: String(d.name || ''), mode: ['light', 'dark', 'both'].includes(d.mode) ? d.mode : 'light', gradient: Boolean(d.gradient), colors: onlyHex(d.colors), darkColors: onlyHex(d.darkColors) }
}

/** The CSS (as text) that applies a theme definition: the light and/or dark appearance under <html data-palette="custom">. Pure; safe to cache. */
export function customThemeCss(input) {
  const def = sanitizeDef(input)
  const mode = def.mode
  const light = { ...def.colors }
  const dark = { ...autoDark(def.colors), ...def.darkColors }
  const out = []
  const emit = (name, colors, isDark) => {
    const sel = `:root[data-theme="${name}"][data-palette="custom"]`
    const r = resolve(colors, isDark)
    out.push(`${sel} { ${decl(tokens(r, isDark))} }`)
    if (!isDark) { // always-dark hero video scope keeps its scrim and takes this theme's accent
      const lightAccent = mix(r.primary, '#ffffff', 0.55), veryLight = mix(r.primary, '#ffffff', 0.8)
      out.push(`${sel} .media-dark, ${sel} .hero-media:has([data-hero-video="playing"], [data-hero-video="poster"]) { --color-primary: ${r.btn}; --color-primary-hover: ${r.hover}; --color-accent: ${r.secondary ? mix(r.secondary, '#ffffff', 0.5) : lightAccent}; --color-lav: ${veryLight}; --color-sky: ${lightAccent}; --color-edge: ${rgba(veryLight, 0.22)}; --color-edge-strong: ${rgba(veryLight, 0.42)}; --grad-a: ${veryLight}; --grad-b: ${lightAccent}; --grad-c: ${veryLight}; }`)
    }
    out.push(...partRules(sel, r, isDark, def.gradient))
  }
  if (mode !== 'dark') emit('light', light, false)
  if (mode !== 'light') emit('dark', mode === 'dark' ? { ...def.colors, ...def.darkColors } : dark, true)
  return out.join('\n')
}

/** Dark colours derived from the light ones: the brand colours stay, the backgrounds become dark tints of the primary colour. */
export function autoDark(light) {
  const primary = light.primary || light.accent || '#2563eb'
  const bg = mix('#0a0c10', primary, 0.07)
  const d = { primary, bg, surface: mix(bg, '#ffffff', 0.05), text: '#f1f5f9' }
  if (light.secondary) d.secondary = light.secondary
  if (light.accent) d.accent = light.accent
  return d
}

/** The page colour of each appearance (for the browser's theme-color meta tag). */
export function themeBg(input, dark) {
  const def = sanitizeDef(input)
  const c = dark ? { ...(def.mode === 'dark' ? def.colors : autoDark(def.colors)), ...def.darkColors } : def.colors
  return c.bg || (dark ? '#0b0e14' : '#ffffff')
}

/** Readability notes for the builder: pairs of colours that fall below the WCAG AA contrast of 4.5:1 (text) once the theme is built. */
export function themeWarnings(input) {
  const def = sanitizeDef(input)
  const out = []
  const check = (name, colors, dark) => {
    const r = resolve(colors, dark)
    if (contrast(r.text, r.bg) < 4.5) out.push(`${name}: the text colour is hard to read on the background (${contrast(r.text, r.bg).toFixed(1)}:1, needs 4.5:1).`)
    if (colors.heading && contrast(colors.heading, r.bg) < 3) out.push(`${name}: headings are hard to read on the background.`)
    if (contrast(r.btnText, r.btn) < 4.5) out.push(`${name}: the button text is hard to read on the button colour (${contrast(r.btnText, r.btn).toFixed(1)}:1).`)
    if (colors.nav && colors.header && contrast(colors.nav, colors.header) < 4.5) out.push(`${name}: navigation links are hard to read on the header colour.`)
  }
  const mode = def.mode
  if (mode !== 'dark') check('Light', def.colors, false)
  if (mode !== 'light') check('Dark', { ...(mode === 'dark' ? def.colors : autoDark(def.colors)), ...def.darkColors }, true)
  return out
}
