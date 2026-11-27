// The languages of the website. ADDING A LANGUAGE:
//   1. add an entry below (code, native name, locale),
//   2. add its dictionary file  src/i18n/catalogs/<code>.json  (English text -> translation; start with {}),
//   3. add its code to LANGUAGES in backend/app/services/translation_service.py (so administrators can edit its translations),
//   4. if its script needs a font, import the font in styles/index.css and add an  html:lang(<code>)  rule.
// Nothing else changes: the URL prefix (/<code>/...), the selector, hreflang tags, the sitemap, the prerendered pages and the admin screen all follow this list. English is the default and has no prefix.
export const DEFAULT_LANG = 'en'

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', htmlLang: 'en-IN', locale: 'en_IN', short: 'EN' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', htmlLang: 'ta', locale: 'ta_IN', short: 'தமி' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', htmlLang: 'hi', locale: 'hi_IN', short: 'हिं' },
]

export const CODES = LANGUAGES.map((l) => l.code)
export const isLang = (code) => CODES.includes(code)
export const langOf = (code) => LANGUAGES.find((l) => l.code === code) || LANGUAGES[0]
/** URL prefix of a language: '' for English, '/ta' for Tamil. */
export const prefixOf = (code) => (code && code !== DEFAULT_LANG && isLang(code) ? `/${code}` : '')

/** Split a URL path into its language and the page path: '/ta/about' -> { lang: 'ta', path: '/about' }, '/about' -> { lang: 'en', path: '/about' }. */
export function splitPath(pathname) {
  const m = /^\/([a-z]{2})(\/.*)?$/.exec(pathname || '')
  if (m && isLang(m[1]) && m[1] !== DEFAULT_LANG) return { lang: m[1], path: m[2] || '/' }
  return { lang: DEFAULT_LANG, path: pathname || '/' }
}

/** The same page in another language: ('ta', '/about') -> '/ta/about'; ('en', '/about') -> '/about'. */
export const pathIn = (code, path) => `${prefixOf(code)}${path === '/' && prefixOf(code) ? '' : path}` || '/'
