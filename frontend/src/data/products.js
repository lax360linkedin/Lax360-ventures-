import portfolio from './products.json'

// LAX360's own products. `products.json` is the built-in portfolio: it is shown until products are published in the admin panel
// (Website content > Products), and it is also what `python -m app.cli seed-products` loads into the CMS so each product can be edited there.
// Only list software that LAX360 develops or owns: never third-party products. Every product starts as "Coming soon"; change a product's status in the
// admin panel only when it has really reached that stage (the demo and access buttons appear only for Live and Beta products).
export const productCategories = {
  business: 'Business Management',
  industry: 'Industry Solutions',
  education: 'Education & Learning',
  developer: 'Developer Solutions',
  workforce: 'Workforce Management',
  booking: 'Booking & Scheduling',
  productivity: 'Productivity & Collaboration',
  automation: 'Automation & Integration',
}

export const productStatuses = {
  live: 'Live',
  beta: 'Beta',
  in_development: 'In Development',
  soon: 'Coming Soon',
}

/** Statuses for which a demo, login or access button may be shown. */
export const isAvailable = (status) => status === 'live' || status === 'beta'

/** The built-in portfolio in the same shape as admin-panel items (so both go through one normaliser, hooks/useProducts.js). */
export const builtInProducts = portfolio.map((p) => ({
  slug: p.slug,
  title: p.name,
  data: {
    category: p.category,
    status: p.status,
    summary: p.summary,
    overview: p.overview.join('\n\n'),
    problems: p.problems.join('\n'),
    features: p.features.join('\n'),
    benefits: p.benefits.join('\n'),
    use_cases: p.useCases.join('\n'),
    users: p.users.join('\n'),
    industries: p.industries.join('\n'),
    cta_label: 'Enquire about this product',
  },
}))

/** Built-in photo and icon per product (used when an admin-panel product has no image of its own). */
export const productVisuals = Object.fromEntries(portfolio.map((p) => [p.slug, { photo: p.photo, icon: p.icon }]))
