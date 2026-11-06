import portfolio from './network.json'

// Our Network. `network.json` is the built-in starter content: only entries marked "published" are shown until entries are published in the admin panel
// (Website content > Network companies & partners / Software distribution). Unverified partners (Zoho, OpenAI, Marg ERP, HexBis) are drafts there and in
// `python -m app.cli seed-network`, so no partnership claim appears publicly until an administrator verifies and publishes it.
export const networkCategories = {
  group: { label: 'Our Group Companies', text: 'LAX360 Ventures and the businesses connected to it. Each is a separate business unless its profile says otherwise.' },
  authorized: { label: 'Authorized Partners & Business Alliances', text: 'Companies whose partnership with LAX360 Ventures has been verified.' },
  technology: { label: 'Technology Partners', text: 'Cloud platforms, AI providers, software companies, infrastructure providers and technology vendors.' },
  education: { label: 'Education & Academic Network', text: 'Training and education relationships and collaborations.' },
  associate: { label: 'Business Associates', text: 'Strategic business relationships, consultants and business collaborators.' },
  reseller: { label: 'Reseller & Distribution Partners', text: 'Software licensing, authorized resellers, product distributors and software sales relationships.' },
  implementation: { label: 'Implementation Partners', text: 'Technical implementation, integration, deployment and support relationships.' },
  startup: { label: 'Startup & Innovation Ecosystem', text: 'Startup collaborations, innovation initiatives and entrepreneurial ecosystem connections.' },
  industry: { label: 'Industry Collaborations', text: 'Healthcare, retail, education, manufacturing and other industry-specific relationships.' },
  professional: { label: 'Professional Network', text: 'Consultants, trainers, specialists and domain experts.' },
  associated: { label: 'Associated Companies', text: 'Companies connected to LAX360 Ventures through close working ties.' },
  collaboration: { label: 'Strategic Collaborations', text: 'Joint initiatives and working relationships on specific programmes or projects.' },
}

export const relationshipLabels = {
  group_company: 'Group company of LAX360 Ventures', operated: 'Operated by LAX360 Ventures', associated: 'Associated company (separate business)', authorized: 'Authorized partner',
  technology_provider: 'Technology provider', reseller: 'Reseller / distribution partner', associate: 'Business associate', implementation: 'Implementation partner', collaboration: 'Strategic collaboration', other: 'Other',
}

export const softwareCategories = {
  crm_erp: 'CRM & ERP', accounting: 'Accounting & Billing', hr: 'HR & Payroll', productivity: 'Business Productivity', ai: 'AI Platforms & Subscriptions', cloud: 'Cloud & Business Applications', other: 'Other',
}

export const ownershipLabels = {
  lax360: 'Developed by LAX360', third_party: 'Third-party product', resold: 'Resold / distributed', integrated: 'Integrated solution',
}

export const partnerTypes = [
  { value: 'partner-technology', label: 'Become a Technology Partner' },
  { value: 'partner-reseller', label: 'Become a Software Reseller' },
  { value: 'partner-education', label: 'Become an Education Partner' },
  { value: 'partner-associate', label: 'Become a Business Associate' },
  { value: 'partner-implementation', label: 'Become an Implementation Partner' },
  { value: 'partner-other', label: 'Other Strategic Collaborations' },
]

const lines = (a) => (a || []).join('\n')

/** Built-in published companies in the same shape as admin-panel items (so both go through one normaliser, hooks/useCmsPages.js). */
export const networkEntries = portfolio.companies.filter((c) => c.status === 'published').map((c) => ({
  slug: c.slug, title: c.name,
  data: { category: c.category, relationship: c.relationship, business_category: c.business_category, description: c.description, designation: c.designation, verification: c.verification, products: lines(c.products), location_type: c.location_type, location: c.location, website_link: c.website_link, cta_label: c.cta_label, featured: c.featured },
}))

export const softwareEntries = portfolio.software.filter((p) => p.status === 'published').map((p) => ({ slug: p.slug, title: p.name, data: { vendor: p.vendor, software_category: p.software_category, ownership: p.ownership, description: p.description, product_link: p.product_link } }))

// CADPOINT and Fatcat Wealthy exactly as they first appeared on the page (original wording and card design). They are shown first on the Our Network page.
// If the admin panel has published entries with these slugs, those entries are shown instead, so an administrator can still edit them.
export const pinnedProfiles = [
  { key: 'authorized', slugs: ['cadpoint-salem', 'cadpoint-academy-salem'], fallback: { slug: 'cadpoint-salem', name: 'CADPOINT', location: 'Salem', description: 'Authorized partner of LAX360 Ventures in Salem.', website: 'https://www.cadpoint.co.in/', logo: '', logoAlt: '' } },
  { key: 'associated', slugs: ['fatcat-wealthy'], fallback: { slug: 'fatcat-wealthy', name: 'Fatcat Wealthy', location: '', description: 'Associated with LAX360 Ventures.', website: 'https://www.fatcatwealthy.com/', logo: '', logoAlt: '' } },
]
