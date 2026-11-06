/** "AI & Automation" -> "ai-and-automation". Used for offering anchors (/services/ai#ai-assistants). */
export const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/** Link to an individual service's own page: /services/<category>/<service>. */
export const offeringHref = (divisionSlug, offeringName) => `/services/${divisionSlug}/${slugify(offeringName)}`
