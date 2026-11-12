import { articles } from './data/articles.js'
import { divisions } from './data/services.js'
import portfolio from './data/products.json' with { type: 'json' }
import industryPortfolio from './data/industries.json' with { type: 'json' }
import networkPortfolio from './data/network.json' with { type: 'json' }
import { slugify } from './utils/slugify.js'

// Single list of indexable routes. Used by the prerender script and the sitemap generator.
// Keep in sync with src/App.jsx. Redirect aliases (/projects) are excluded.
export const routes = [
  '/',
  '/about',
  '/services',
  '/services/software',
  '/services/ai',
  '/services/growth',
  '/services/headless',
  '/services/automation',
  '/services/mobile',
  ...divisions.flatMap((d) => d.offerings.map((o) => `/services/${d.slug}/${slugify(o.name)}`)), // one page per individual service
  '/products',
  ...portfolio.map((p) => `/products/${p.slug}`), // built-in products (products published in the admin panel are rendered in the browser)
  '/industries',
  ...industryPortfolio.map((i) => `/industries/${i.slug}`), // built-in industries (industries published in the admin panel are rendered in the browser)
  '/insights',
  ...articles.map((a) => `/insights/${a.slug}`), // built-in starter articles (articles published in the admin panel are rendered in the browser)
  '/our-network',
  '/our-network/cadpoint-salem',
  ...networkPortfolio.companies.filter((c) => c.status === 'published' && c.category === 'authorized').map((c) => `/our-network/${c.slug}`), // built-in authorized partners (partners published in the admin panel are rendered in the browser)
  '/our-team',
  '/work',
  '/robotics',
  '/blockchain',
  '/career',
  '/contact',
  '/privacy',
  '/terms',
]

// Prerendered for fast first paint but kept out of the sitemap (the pages are noindex).
// /user/dashboard and /demo are signed-in only and are rendered in the browser, not prerendered.
export const noindexRoutes = ['/login', '/register', '/forgot-password', '/reset-password']
