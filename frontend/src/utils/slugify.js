/** "AI & Automation" -> "ai-and-automation". Used for offering anchors (/services/ai#ai-assistants). */
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
export const offeringHref = (divisionSlug, offeringName) => `/services/${divisionUrl(divisionSlug)}/${slugify(offeringName)}`
