// The website's colour themes: one list for the whole site. It feeds the admin theme picker, the theme hook and the CSS generator
// (`npm run themes` -> scripts/generate-themes.mjs -> src/styles/themes-extra.css). The backend keeps the same ids in
// backend/app/services/settings_service.py (THEMES); a backend test checks that the two lists match.
//
// Every theme is a light-family palette on <html data-theme="light" data-palette="<id>"> except the built-in "dark" and "light".
// `bg` = main background, `surface` = cards/sections, `accent` = the brand accent exactly as specified, `text` = body text.
// Where only a background and an accent are specified, the surface and text colours are derived from the accent hue by the generator.
// The accent is used exactly as given for decoration (borders, glows, gradients, icons). Where the exact accent would not be readable as text or as a
// button behind white text (WCAG AA 4.5:1), the generator uses a darker shade of the SAME hue for those uses (see scripts/generate-themes.mjs).

export const THEME_CATEGORIES = [
  { id: 'standard', label: 'Standard' },
  { id: 'luxury', label: 'Premium & Luxury' },
  { id: 'tech', label: 'Modern Technology & AI' },
  { id: 'minimal', label: 'Minimal Aesthetic' },
  { id: 'premium', label: 'Additional Premium' },
]

// Existing themes (unchanged). "visitor" is not a palette: each visitor chooses Dark or Light.
export const BUILT_IN_THEMES = [
  { id: 'visitor', category: 'standard', name: 'Visitor choice', note: 'Visitors switch Dark / Light themselves.', colors: ['#0a0c10', '#f1f5f9', '#38bdf8'] },
  { id: 'dark', category: 'standard', name: 'Dark', note: 'Black / graphite with sky blue.', colors: ['#0a0c10', '#f1f5f9', '#38bdf8'] },
  { id: 'light', category: 'standard', name: 'Light', note: 'White and violet.', colors: ['#ffffff', '#1a1033', '#7c3aed'] },
  { id: 'snow', category: 'standard', name: 'Snow White + Slate Grey (original)', note: 'Apple-style minimal.', colors: ['#fafafa', '#1d2330', '#475569'] },
  { id: 'rose', category: 'standard', name: 'White + Dusty Rose (original)', note: 'Soft and elegant.', colors: ['#fffbfb', '#3a2328', '#a8556a'] },
  { id: 'sage', category: 'standard', name: 'White + Sage Green (original)', note: 'Natural and premium.', colors: ['#fbfdfa', '#1f2d24', '#4a7c59'] },
]

export const PALETTE_THEMES = [
  // 1. Premium & Luxury
  { id: 'ivory-gold', category: 'luxury', name: 'Ivory + Champagne Gold', note: 'Luxury corporate', bg: '#FFFFFF', surface: '#F8F5EF', accent: '#B99A65', text: '#292929' },
  { id: 'deep-teal', category: 'luxury', name: 'White + Deep Teal', note: 'Premium technology', bg: '#FFFFFF', surface: '#F0F7F6', accent: '#0F5C5B', text: '#183B3A' },
  { id: 'copper', category: 'luxury', name: 'White + Copper', note: 'Elegant creative agency', bg: '#FFFFFF', surface: '#FAF5F0', accent: '#B76E45', text: '#33302E' },
  { id: 'mocha', category: 'luxury', name: 'Cream + Mocha', note: 'Warm luxury', bg: '#FFFDF8', surface: '#F0E8DD', accent: '#75563F', text: '#332820' },
  { id: 'burgundy', category: 'luxury', name: 'White + Midnight Burgundy', note: 'Executive premium', bg: '#FFFFFF', surface: '#F8F2F3', accent: '#681E38', text: '#29212A' },
  // 2. Modern Technology & AI
  { id: 'violet', category: 'tech', name: 'White + Electric Violet', note: 'AI / SaaS', bg: '#FFFFFF', accent: '#6938EF' },
  { id: 'cobalt', category: 'tech', name: 'White + Cobalt Blue', note: 'Software company', bg: '#FFFFFF', accent: '#2457D6' },
  { id: 'aqua', category: 'tech', name: 'White + Aqua Teal', note: 'Future technology', bg: '#FFFFFF', accent: '#00A99D' },
  { id: 'lime', category: 'tech', name: 'White + Neon Lime', note: 'Innovative startup', bg: '#FFFFFF', accent: '#9BCB36' },
  { id: 'coral', category: 'tech', name: 'White + Coral Orange', note: 'Modern digital agency', bg: '#FFFFFF', accent: '#F07850' },
  { id: 'cyan', category: 'tech', name: 'White + Electric Cyan', note: 'Advanced AI', bg: '#FFFFFF', accent: '#00A6D6' },
  { id: 'indigo', category: 'tech', name: 'White + Indigo Purple', note: 'Enterprise SaaS', bg: '#FFFFFF', accent: '#5046A8' },
  { id: 'ocean', category: 'tech', name: 'White + Ocean Blue', note: 'Global technology', bg: '#FFFFFF', accent: '#247BA0' },
  // 3. Minimal Aesthetic
  { id: 'slate-grey', category: 'minimal', name: 'Snow White + Slate Grey', note: 'Apple-style minimal', bg: '#FFFFFF', accent: '#64748B' },
  { id: 'dusty-rose', category: 'minimal', name: 'White + Dusty Rose', note: 'Soft aesthetic', bg: '#FFFFFF', accent: '#C27B91' },
  { id: 'sage-green', category: 'minimal', name: 'White + Sage Green', note: 'Natural premium', bg: '#FFFFFF', accent: '#829B76' },
  { id: 'sky-blue', category: 'minimal', name: 'White + Sky Blue', note: 'Clean modern', bg: '#FFFFFF', accent: '#72A9E8' },
  { id: 'terracotta', category: 'minimal', name: 'White + Terracotta', note: 'Creative studio', bg: '#FFFFFF', accent: '#C16E4B' },
  { id: 'plum', category: 'minimal', name: 'White + Plum', note: 'Distinctive premium', bg: '#FFFFFF', accent: '#80518D' },
  { id: 'mustard', category: 'minimal', name: 'White + Mustard', note: 'Bold corporate', bg: '#FFFFFF', accent: '#D4A72C' },
  // 4. Additional Premium: deep navy for prominent elements on a soft beige background
  // Two brand colours: royal blue is the main accent (buttons, links); crimson is the second accent (highlights, gradient ends, badges).
  { id: 'royal-crimson', category: 'premium', name: 'Royal Blue + Crimson Red + Pure White', note: 'Bold premium corporate', bg: '#FFFFFF', surface: '#F4F6FA', accent: '#1717A5', accent2: '#B50918', text: '#171717' },
  { id: 'navy-beige', category: 'premium', name: 'Deep Navy Blue + Soft Beige', note: 'Balanced premium corporate', bg: '#F8F0E5', accent: '#082052', navy: true },
]

export const PALETTE_IDS = ['snow', 'rose', 'sage', ...PALETTE_THEMES.map((t) => t.id)]
export const ALL_THEME_IDS = ['dark', 'light', ...PALETTE_IDS]
