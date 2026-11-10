// Generates src/styles/themes-extra.css from src/data/themes.js:  npm run themes
//
// Each palette theme re-colours the shared light-mode tokens (see styles/index.css and styles/themes.css), so every component picks the theme up through the
// existing CSS variables. The specified accent is used exactly for decoration (borders, glows, gradients, icons, art). Where the exact accent is too light to be
// read as text, or to sit behind white button text, a darker shade of the SAME hue is used for those two jobs only (WCAG AA, 4.5:1). The report printed at the
// end lists, per theme, whether the exact accent was usable as is.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PALETTE_THEMES } from '../src/data/themes.js'

const hex = (c) => c.replace('#', '')
const toRgb = (c) => [0, 2, 4].map((i) => parseInt(hex(c).slice(i, i + 2), 16))
const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`
const mix = (a, b, t) => { const x = toRgb(a), y = toRgb(b); return toHex(x.map((v, i) => v * (1 - t) + y[i] * t)) } // t = share of b
const lum = (c) => { const [r, g, b] = toRgb(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const rgba = (c, a) => `rgba(${toRgb(c).join(', ')}, ${a})`
const triple = (c) => toRgb(c).join(' ')
/** Darkens `color` (toward black, same hue) until it reaches `min` contrast against every colour in `on`. Returns the exact colour when it already does. */
const readable = (color, on, min) => { for (let k = 0; k <= 0.9; k += 0.02) { const c = mix(color, '#000000', k); if (on.every((o) => contrast(c, o) >= min)) return c } return '#000000' }

const out = []
const report = []
for (const t of PALETTE_THEMES) {
  const accent = t.accent.toLowerCase()
  const bg = t.bg.toLowerCase()
  const surface = (t.surface || mix(bg, accent, t.navy ? 0.07 : 0.05)).toLowerCase()
  const deep = mix(surface, accent, t.navy ? 0.14 : 0.1)
  const text = (t.text || (t.navy ? mix(accent, '#000000', 0.25) : readable(mix(accent, '#000000', 0.8), [bg, deep], 11))).toLowerCase()
  const soft = readable(mix(text, bg, 0.3), [bg, surface, deep], 4.8)
  const ink = readable(accent, [bg, surface, deep], 4.5) // accent as text / links on any page background
  const btn = readable(accent, ['#ffffff'], 4.5) // accent behind white button text
  const btnHover = mix(btn, '#000000', 0.14)
  const gradC = contrast(mix(accent, ink, 0.5), bg) >= 3 ? mix(accent, ink, 0.5) : ink
  const gradA = mix(ink, '#000000', 0.25)
  const lightAccent = mix(accent, '#ffffff', 0.55) // accent on the dark hero-video scrim
  const veryLight = mix(accent, '#ffffff', 0.8)
  // Optional second brand accent (e.g. crimson next to royal blue): used for the accent token, the end of text gradients and decoration.
  const accent2 = (t.accent2 || '').toLowerCase()
  const ink2 = accent2 ? readable(accent2, [bg, surface, deep], 4.5) : ink
  const gradEnd = accent2 ? (contrast(accent2, bg) >= 3 ? accent2 : ink2) : gradC
  const sel = `:root[data-theme="light"][data-palette="${t.id}"]`
  const tokens = `--color-night: ${bg}; --color-base2: ${surface}; --color-deep: ${deep}; --color-fg: ${text}; --color-soft: ${soft};
  --color-primary: ${btn}; --color-primary-hover: ${btnHover}; --color-accent: ${ink2}; --color-lav: ${ink}; --color-sky: ${ink};
  --color-glass: ${rgba(accent, 0.06)}; --color-glass-strong: ${rgba(accent, 0.11)};
  --color-edge: ${rgba(accent, 0.24)}; --color-edge-strong: ${rgba(accent, 0.46)};
  --color-violet: ${ink2}; --color-tint: ${ink};`
  out.push(`/* ${t.name} — ${t.note}. Accent ${accent.toUpperCase()}${ink === accent ? ' used as is' : `; text/links use ${ink.toUpperCase()}`}${btn === accent ? '' : `; buttons use ${btn.toUpperCase()}`}. */
${sel} {
  ${tokens}
  --shadow-menu: 0 24px 60px -24px ${rgba(mix(ink, '#000000', 0.5), 0.26)}, 0 0 0 1px ${rgba(accent, 0.14)};
  --shadow-lift: 0 24px 50px -22px ${rgba(btn, 0.4)};
  --glass-a: rgba(255, 255, 255, 0.93); --glass-b: ${rgba(surface, 0.78)}; --glass-flat-a: rgba(255, 255, 255, 0.91); --glass-flat-b: ${rgba(surface, 0.75)};
  --glass-inset: rgba(255, 255, 255, 0.92); --glass-shadow: ${rgba(mix(ink, '#000000', 0.5), 0.26)}; --shine: ${rgba(accent, 0.13)};
  --grad-a: ${gradA}; --grad-b: ${ink}; --grad-c: ${gradEnd};
  --amb-1: ${rgba(accent, 0.15)}; --amb-2: ${rgba(accent2 || mix(accent, '#ffffff', 0.5), accent2 ? 0.1 : 0.13)}; --amb-3: ${rgba(accent, 0.08)};
  --wordmark-a: ${rgba(accent, 0.22)}; --wordmark-b: ${rgba(accent, 0.05)};
  --art-line: ${ink}; --art-glass: ${rgba(accent, 0.08)}; --art-faint: ${rgba(accent, 0.26)}; --art-grid: ${rgba(accent, 0.1)};
  --art-solid: ${bg}; --art-vio: ${accent2 || accent}; --art-sky: ${ink};
  --glow: ${triple(accent)}; --glow2: ${triple(accent2 || mix(accent, '#ffffff', 0.3))}; --glow3: ${triple(mix(accent, '#ffffff', 0.55))}; --btn-hover: ${btnHover};
  --bot-violet: ${btn}; --bot-heart: ${accent}; --bot-line: ${rgba(ink, 0.7)}; --bot-glow: ${rgba(accent, 0.42)}; --bot-hl: ${rgba(accent, 0.14)};
  --page-bg: ${bg};
}
/* hero video / always-dark media scope: keeps its dark scrim, takes this theme's accent */
${sel} .media-dark, ${sel} .hero-media:has([data-hero-video="playing"], [data-hero-video="poster"]) {
  --color-primary: ${btn}; --color-primary-hover: ${btnHover}; --color-accent: ${accent2 ? mix(accent2, '#ffffff', 0.5) : lightAccent}; --color-lav: ${veryLight}; --color-sky: ${lightAccent}; --color-violet: ${accent2 ? mix(accent2, '#ffffff', 0.5) : lightAccent};
  --color-edge: ${rgba(veryLight, 0.22)}; --color-edge-strong: ${rgba(veryLight, 0.42)}; --grad-a: ${veryLight}; --grad-b: ${lightAccent}; --grad-c: ${veryLight};
  --bot-line: ${rgba(veryLight, 0.6)}; --bot-glow: ${rgba(lightAccent, 0.55)}; --bot-hl: ${rgba(lightAccent, 0.2)};
}
/* always-bright scope (About hero) takes the theme values */
${sel} .hero-light { ${tokens} --grad-a: ${gradA}; --grad-b: ${ink}; --grad-c: ${gradEnd}; }
`)
  report.push({ id: t.id, accent2: accent2.toUpperCase() || '-', crimsonText: accent2 ? contrast(ink2, bg).toFixed(1) : '-', accent: accent.toUpperCase(), exact_text: ink === accent, exact_button: btn === accent, text_on_bg: contrast(text, bg).toFixed(1), soft_on_deep: contrast(soft, deep).toFixed(1), link: contrast(ink, bg).toFixed(1), white_on_button: contrast('#ffffff', btn).toFixed(1) })
}

const header = `/*
 * GENERATED by scripts/generate-themes.mjs from src/data/themes.js — do not edit by hand; run \`npm run themes\`.
 * 21 extra colour themes (Premium & Luxury, Modern Technology & AI, Minimal Aesthetic, Additional Premium). <html> keeps data-theme="light" and adds
 * data-palette="<id>"; the blocks re-colour the shared tokens, so every component follows. Existing themes (dark, light, snow, rose, sage) are untouched.
 */
`
const here = dirname(fileURLToPath(import.meta.url))
writeFileSync(join(here, '..', 'src', 'styles', 'themes-extra.css'), header + out.join('\n'))
console.table(report)
