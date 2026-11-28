// One product portfolio: LAX360's own products, the live websites and the solutions of the Software & IT portfolio are shown together on the Products page under these categories.
export const PORTFOLIO_CATEGORIES = [
  { slug: 'software', label: 'Software' },
  { slug: 'webapps', label: 'Web Applications' },
  { slug: 'mobile', label: 'Mobile Applications' },
  { slug: 'websites', label: 'Websites' },
  { slug: 'api', label: 'Headless SaaS & API Solutions' },
  { slug: 'ai-agents', label: 'AI Agents & Automation' },
]
export const categoryLabel = (slug) => PORTFOLIO_CATEGORIES.find((c) => c.slug === slug)?.label || slug

// Where LAX360's own products belong. An administrator can choose another category for a product (Admin > Products > "Portfolio category"); this is only the default.
const BY_SLUG = {
  'lax360-business-crm': 'webapps', 'lax360-clinic-management': 'software', 'lax360-learning-platform': 'webapps', 'lax360-smart-billing-pos': 'software', 'lax360-api-hub': 'api',
  'lax360-field-operations': 'mobile', 'lax360-bookings': 'webapps', 'lax360-inventory-management': 'software', 'lax360-hr-employee-management': 'webapps', 'lax360-project-management': 'webapps',
  'lax360-workflow-automation': 'ai-agents',
}
const BY_OLD = { business: 'webapps', industry: 'software', education: 'webapps', developer: 'api', workforce: 'mobile', booking: 'webapps', productivity: 'webapps', automation: 'ai-agents' }
export const portfolioCategoryOf = (slug, oldCategory, chosen) => (chosen || BY_SLUG[slug] || BY_OLD[oldCategory] || 'software')

/** The one availability vocabulary of the portfolio (a product's Live / Beta / In Development / Coming Soon are mapped onto it). */
export const AVAILABILITY = {
  available: 'Available', custom: 'Custom Development', under_development: 'Under Development', coming_soon: 'Coming Soon', temporarily_unavailable: 'Temporarily Unavailable',
}
export const availabilityOf = (type, status) => {
  if (type === 'product') return { live: 'available', beta: 'available', in_development: 'under_development', soon: 'coming_soon' }[status] || 'coming_soon'
  if (type === 'website') return status
  return { live: 'available', demo_available: 'available' }[status] || status || 'custom'
}

/** The caption of a generated picture. A real screenshot or photo gets none. */
export const previewLabel = (category, status) => {
  if (status === 'under_development' || status === 'coming_soon') return 'Concept Preview'
  if (category === 'websites') return 'Website Design Preview'
  if (category === 'api' || category === 'ai-agents') return 'Solution Preview'
  return 'Product Interface Preview'
}
