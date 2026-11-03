// Small helpers for content that comes from the admin panel.
const PAGES = { '/': 'home', '/about': 'about', '/services': 'services', '/industries': 'industries', '/insights': 'insights', '/our-network': 'network', '/our-team': 'team', '/work': 'work', '/career': 'career', '/contact': 'contact' }

/** Which "Page titles & SEO" entry belongs to this route (null for pages that cannot be edited there). */
export const pagePathToKey = (path) => PAGES[path] || null

/** "One point per line" text -> list. */
export const toLines = (text) => String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

/** Paragraphs separated by a blank line -> list. */
export const toParagraphs = (text) => String(text || '').split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean)

/** A link from the CMS: internal path or full URL. */
export const isExternal = (to) => /^(https?:|mailto:)/.test(to || '')
