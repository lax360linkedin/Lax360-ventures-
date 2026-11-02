// Single list of indexable routes. Used by the prerender script and the sitemap generator.
// Keep in sync with src/App.jsx. Redirect aliases (/projects, /academy) are excluded.
export const routes = [
  '/',
  '/about',
  '/services',
  '/services/software',
  '/services/ai',
  '/services/growth',
  '/services/engineering',
  '/solutions',
  '/work',
  '/training',
  '/career',
  '/contact',
  '/privacy',
  '/terms',
]

// Prerendered for fast first paint but kept out of the sitemap (the pages are noindex).
// /user/dashboard and /demo are signed-in only and are rendered in the browser, not prerendered.
export const noindexRoutes = ['/login', '/register']
