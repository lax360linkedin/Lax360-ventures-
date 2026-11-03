// Our Network: built-in entries, shown until entries are published in the admin panel (Website content > Network).
// Only relationships LAX360 Ventures has stated are listed, and each sits in the category it was given. Official website links and logos are
// left out until they are supplied; add them in the admin panel. Never mark a company an "Authorized Partner" without confirmed authorization.
export const networkCategories = [
  { value: 'authorized', label: 'Authorized Partners', text: 'Companies authorized to represent or deliver LAX360 Ventures services in their region.' },
  { value: 'technology', label: 'Technology Partners', text: 'Technology providers and platforms we build with.' },
  { value: 'associated', label: 'Associated Companies', text: 'Companies connected to LAX360 Ventures through ownership, shared leadership or close working ties.' },
  { value: 'collaboration', label: 'Strategic Collaborations', text: 'Joint initiatives and working relationships on specific programmes or projects.' },
]

export const networkEntries = [
  {
    slug: 'cadpoint-salem', title: 'CADPOINT', category: 'authorized', location: 'Salem',
    description: 'Authorized partner of LAX360 Ventures in Salem.',
    website: '', logo: '',
  },
  {
    slug: 'fatcat-wealthy', title: 'Fatcat Wealthy', category: 'associated', location: '',
    description: 'Associated with LAX360 Ventures.',
    website: '', logo: '',
  },
]
