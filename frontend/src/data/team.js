// Our Team: structure and default wording only. People, photographs, biographies and culture photos come from the admin panel
// (Website content > Team) — there are no built-in profiles, because they must be real and verified.

export const teamText = {
  heroEyebrow: 'Our Team',
  heroTitle: 'The People Behind Innovation.',
  heroLead: 'The people behind LAX360 Pvt Ltd: the leaders who set our direction and the specialists who plan, build and support what we deliver for our clients.',
  leadershipTitle: 'Leadership Team',
  leadershipLead: 'The people who set the direction of LAX360 Pvt Ltd.',
  departmentsTitle: 'Our Departments',
  departmentsLead: 'Our people, organised by the department they work in.',
  directoryTitle: 'Meet Our Team',
  directoryLead: 'The specialists who plan, build and support what we deliver.',
  cultureTitle: 'Our People & Culture',
  cultureLead: 'How we work, learn and celebrate together.',
  expertiseTitle: 'Our Expertise',
  expertiseLead: 'The technical and professional capabilities the team brings to every project.',
  careersTitle: 'Build Your Future With Us.',
  careersLead: 'Join a team that works across software, AI and digital growth. Explore where you could fit, or send us your details.',
}

// Positions an employee can hold (the "Position" field of a profile). Founder, CEO and Managing Director are the Leadership section; the rest appear in the team gallery
// or, when the Departments section is on, inside their department (the Department Head first, then Team Leads, then Team Members).
export const roleLabels = {
  founder: 'Founder', ceo: 'CEO', managing_director: 'Managing Director', department_head: 'Department Head', team_lead: 'Team Lead', team_member: 'Team Member',
}
export const leaderRank = { founder: 0, ceo: 1, managing_director: 2 }
export const roleRank = { department_head: 0, team_lead: 1, team_member: 2 }

// There are no built-in departments and no built-in profiles: departments and people are created in the admin panel (Team) and must be real.

export const defaultExpertise = [
  { title: 'React & JavaScript', icon: 'code', tags: ['React', 'JavaScript', 'Modern web interfaces'] },
  { title: 'Python & FastAPI', icon: 'server', tags: ['Python', 'FastAPI', 'REST APIs'] },
  { title: 'AI & Generative AI', icon: 'sparkles', tags: ['AI assistants', 'Generative AI', 'AI agents'] },
  { title: 'Machine Learning', icon: 'brain', tags: ['Machine learning', 'Data-driven features'] },
  { title: 'SaaS & API Development', icon: 'layers', tags: ['SaaS platforms', 'API development', 'Integrations'] },
  { title: 'Cloud Technologies', icon: 'cloud', tags: ['Cloud hosting', 'Deployment', 'Databases'] },
  { title: 'Business Automation', icon: 'workflow', tags: ['Workflow automation', 'Process automation'] },
  { title: 'Digital Marketing', icon: 'megaphone', tags: ['SEO', 'Paid ads', 'Social media', 'Content'] },
]

export const cultureCategories = [
  { value: 'activities', label: 'Team activities' },
  { value: 'office', label: 'Office environment' },
  { value: 'celebrations', label: 'Team celebrations' },
  { value: 'workshops', label: 'Technical workshops' },
  { value: 'knowledge', label: 'Knowledge-sharing sessions' },
  { value: 'learning', label: 'Learning & development' },
  { value: 'achievements', label: 'Employee achievements' },
]
