import { articles } from './data/articles.js'

// Single list of indexable routes. Used by the prerender script and the sitemap generator.
// Keep in sync with src/App.jsx. Redirect aliases (/projects) are excluded.
export const routes = [
  '/',
  '/about',
  '/services',
  '/services/software',
  '/services/ai',
  '/services/growth',
  '/services/engineering',
  '/industries',
  '/insights',
  ...articles.map((a) => `/insights/${a.slug}`), // built-in starter articles (articles published in the admin panel are rendered in the browser)
  '/our-network',
  '/our-team',
  '/work',
  '/career',
  '/contact',
  '/privacy',
  '/terms',
]

// Prerendered for fast first paint but kept out of the sitemap (the pages are noindex).
// /user/dashboard and /demo are signed-in only and are rendered in the browser, not prerendered.
export const noindexRoutes = ['/login', '/register']
