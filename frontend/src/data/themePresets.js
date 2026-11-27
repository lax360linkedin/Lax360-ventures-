// Ready-made colour themes (id "preset-..."): every one works in Light and Dark. They are definitions for src/utils/themeEngine.js, so they are generated in the browser
// (nothing is added to the page until one is chosen). An administrator can pick one as the website theme, or "Duplicate" it into the Theme builder and change any colour.
// `primary` is the brand colour; the engine darkens or lightens it within the same hue where it would not be readable as text or behind button text.
const P = (id, name, group, colors, extra = {}) => ({ id: `preset-${id}`, name, group, mode: 'both', note: '', ...extra, colors })

export const PRESET_GROUPS = [
  { id: 'blue', label: 'Blues' },
  { id: 'green', label: 'Greens' },
  { id: 'purple', label: 'Purples & pinks' },
  { id: 'warm', label: 'Reds, oranges & yellows' },
  { id: 'neutral', label: 'Neutrals & luxury' },
  { id: 'pastel', label: 'Pastel' },
  { id: 'gradient', label: 'Gradient' },
]

export const THEME_PRESETS = [
  P('royal-blue', 'Royal Blue', 'blue', { primary: '#2152d9', bg: '#ffffff' }),
  P('navy-blue', 'Navy Blue', 'blue', { primary: '#14306b', bg: '#f6f8fc', secondary: '#c9a227' }),
  P('sky-blue', 'Sky Blue', 'blue', { primary: '#2e9be6', bg: '#fbfdff' }),
  P('ocean-blue', 'Ocean Blue', 'blue', { primary: '#0e7aa8', bg: '#ffffff', secondary: '#0f9d8a' }),
  P('cyan', 'Cyan', 'blue', { primary: '#0891b2', bg: '#ffffff' }),
  P('teal', 'Teal', 'blue', { primary: '#0f766e', bg: '#fbfefd' }),
  P('emerald', 'Emerald Green', 'green', { primary: '#059669', bg: '#ffffff' }),
  P('forest', 'Forest Green', 'green', { primary: '#166534', bg: '#fbfdfb', secondary: '#a16207' }),
  P('lime', 'Lime Green', 'green', { primary: '#65a30d', bg: '#ffffff' }),
  P('violet', 'Violet', 'purple', { primary: '#7c3aed', bg: '#ffffff' }),
  P('lavender', 'Lavender', 'purple', { primary: '#8b7cc8', bg: '#faf8ff' }),
  P('indigo', 'Indigo', 'purple', { primary: '#4f46e5', bg: '#ffffff' }),
  P('magenta', 'Magenta', 'purple', { primary: '#c026d3', bg: '#ffffff' }),
  P('pink', 'Pink', 'purple', { primary: '#db2777', bg: '#fffafc' }),
  P('rose', 'Rose', 'purple', { primary: '#e11d48', bg: '#fffafb' }),
  P('crimson', 'Crimson Red', 'warm', { primary: '#b91c1c', bg: '#ffffff' }),
  P('maroon', 'Maroon', 'warm', { primary: '#7f1d1d', bg: '#fffafa', secondary: '#b45309' }),
  P('orange', 'Orange', 'warm', { primary: '#ea580c', bg: '#ffffff' }),
  P('amber', 'Amber', 'warm', { primary: '#d97706', bg: '#fffefa' }),
  P('golden-yellow', 'Golden Yellow', 'warm', { primary: '#ca8a04', bg: '#fffefb' }),
  P('chocolate', 'Chocolate Brown', 'neutral', { primary: '#6b4423', bg: '#fbf7f2' }),
  P('beige', 'Beige', 'neutral', { primary: '#a8895f', bg: '#f6efe3', text: '#33291c' }),
  P('slate', 'Slate Grey', 'neutral', { primary: '#475569', bg: '#ffffff' }),
  P('charcoal', 'Charcoal', 'neutral', { primary: '#374151', bg: '#f4f4f5', secondary: '#0e7490' }),
  P('silver', 'Silver', 'neutral', { primary: '#6b7280', bg: '#f5f6f8' }),
  P('white-gold', 'White & Gold', 'neutral', { primary: '#b8962e', bg: '#ffffff', surface: '#faf6ea', text: '#2b2417' }),
  { id: 'preset-black-gold', name: 'Black & Gold', group: 'neutral', mode: 'dark', note: 'Dark luxury', colors: { primary: '#d4af37', bg: '#0b0b0b', surface: '#16140f', text: '#f5efe0', buttonText: '#14110a' } },
  P('pastel-mint', 'Pastel Mint', 'pastel', { primary: '#3f9b7e', bg: '#f4fbf8', surface: '#e6f6ef' }),
  P('pastel-peach', 'Pastel Peach', 'pastel', { primary: '#d9774f', bg: '#fff8f3', surface: '#ffeadd' }),
  P('pastel-lilac', 'Pastel Lilac', 'pastel', { primary: '#8a6fd1', bg: '#faf7ff', surface: '#eee6fb' }),
  P('pastel-sky', 'Pastel Sky', 'pastel', { primary: '#4a8fd1', bg: '#f5faff', surface: '#e3f0fc' }),
  P('pastel-blush', 'Pastel Blush', 'pastel', { primary: '#c8607f', bg: '#fff7f9', surface: '#fde6ec' }),
  P('gradient-sunset', 'Sunset Gradient', 'gradient', { primary: '#e8590c', secondary: '#c2255c', bg: '#ffffff' }, { gradient: true }),
  P('gradient-aurora', 'Aurora Gradient', 'gradient', { primary: '#0f9d8a', secondary: '#6d28d9', bg: '#ffffff' }, { gradient: true }),
  P('gradient-ocean', 'Ocean Gradient', 'gradient', { primary: '#0369a1', secondary: '#0d9488', bg: '#ffffff' }, { gradient: true }),
  P('gradient-berry', 'Berry Gradient', 'gradient', { primary: '#9d174d', secondary: '#6d28d9', bg: '#ffffff' }, { gradient: true }),
]

export const presetById = (id) => THEME_PRESETS.find((t) => t.id === id) || null
