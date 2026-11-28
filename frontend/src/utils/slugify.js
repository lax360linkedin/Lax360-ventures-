/** "AI & Automation" -> "ai-and-automation". Used for offering anchors (/artificial-intelligence#ai-assistants). */
export const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/** The address segment of a service category when it differs from the category's internal id (the id `growth` keeps its data, icons and admin records; its public address is /services/digitalmarketing). */
export const DIVISION_URL = { growth: 'digitalmarketing' }
export const divisionUrl = (divisionSlug) => DIVISION_URL[divisionSlug] || divisionSlug

/** Link to an individual service's own page: /services/<category>/<service>. */
/** Sub-services whose display name changed while their address stayed the same (existing links and search results keep working). */
const OFFERING_SLUG = { 'ERP & CRM Solutions': 'crm-and-erp-development', 'Business Application Development': 'business-management-systems' }
/** Headless SaaS & API, Workflow Automation and Mobile & Business Applications are now part of Software & IT Services. */
const MOVED = { headless: 'software', automation: 'software', mobile: 'software' }
/** The page addresses of the sub-services managed in the admin panel (name -> address segment), set by hooks/useDivisions.js: a sub-service keeps its own address when it is renamed. */
const DB_SLUGS = new Map()
export const setOfferingSlugs = (entries) => { DB_SLUGS.clear(); entries.forEach(([name, slug]) => DB_SLUGS.set(name, slug)) }
export const offeringHref = (divisionSlug, offeringName) => `/services/${divisionUrl(MOVED[divisionSlug] || divisionSlug)}/${DB_SLUGS.get(offeringName) || OFFERING_SLUG[offeringName] || slugify(offeringName)}`
