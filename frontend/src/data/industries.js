import portfolio from './industries.json'

// The industries LAX360 Ventures builds technology for. `industries.json` is the built-in set of 20: it is shown until industries are published in the admin panel
// (Website content > Industries), and it is also what `python -m app.cli seed-industries` loads into the CMS so each one can be edited there.
// Everything describes what technology CAN do for a sector and what LAX360 can build. Nothing here claims delivered projects, clients or results.
export const industryGroups = {
  health: 'Health, Education & Wellness',
  commerce: 'Commerce, Hospitality & Travel',
  finance: 'Finance, Property & Professional Services',
  industry: 'Industry, Infrastructure & Utilities',
}

/** The built-in industries in the same shape as admin-panel items (so both go through one normaliser, hooks/useCmsPages.js). */
export const industries = portfolio.map((p) => ({
  slug: p.slug,
  title: p.name,
  data: {
    group: p.group,
    featured: p.featured,
    summary: p.summary,
    description: p.overview,
    challenges: p.challenges.join('\n'),
    problem_solution: p.pairs.map(([a, b]) => `${a} => ${b}`).join('\n'),
    solutions: p.solutions.join('\n'),
    ai_opportunities: p.ai.map(([a, b]) => `${a}: ${b}`).join('\n'),
    use_cases: p.useCases.join('\n'),
    benefits: p.benefits.join('\n'),
    services: p.services.join('\n'),
    products: p.products.join('\n'),
    insight_categories: p.insightCategories.join('\n'),
  },
}))

/** Built-in photo and icon per industry (used when an admin-panel industry has no image of its own). */
export const industryVisuals = Object.fromEntries(portfolio.map((p) => [p.slug, { photo: p.photo, icon: p.icon }]))
