// Our Team: structure and default wording only. People, photographs, biographies and culture photos come from the admin panel
// (Website content > Team) — there are no built-in profiles, because they must be real and verified.

export const teamText = {
  heroEyebrow: 'Our Team',
  heroTitle: 'The People Behind Innovation.',
  heroLead: 'Engineers, AI specialists, marketers and operators working as one team. The expertise, creativity and technology behind LAX360 Pvt Ltd come from the people who build it every day.',
  leadershipTitle: 'Leadership Team',
  leadershipLead: 'The people who set the direction of LAX360 Pvt Ltd and keep every department accountable.',
  departmentsTitle: 'Our Departments',
  departmentsLead: 'Four departments, one accountable team: from software and AI to marketing and client operations.',
  directoryTitle: 'Meet Our Team',
  directoryLead: 'The specialists who design, build, market and support what we deliver.',
  cultureTitle: 'Our People & Culture',
  cultureLead: 'How we work, learn and celebrate together.',
  expertiseTitle: 'Our Expertise',
  expertiseLead: 'The technical and professional capabilities the team brings to every project.',
  careersTitle: 'Build Your Future With Us.',
  careersLead: 'Join a team that works across software, AI and digital growth. Explore where you could fit, or send us your details.',
}

export const leadershipRoles = {
  managing_director: { label: 'Managing Director', rank: 0 },
  founder: { label: 'Founder / Co-Founder', rank: 1 },
  technical_director: { label: 'Technical Director', rank: 2 },
  department_head: { label: 'Department Head', rank: 3 },
  leadership: { label: 'Leadership', rank: 4 },
}

// The four departments (used until departments are managed in the admin panel; a department created there with the same name replaces it).
export const defaultDepartments = [
  { slug: 'software-development', name: 'Software Development', icon: 'code', description: 'Designing and building custom software, websites, web platforms and mobile apps.', overview: 'The software team designs and builds the web applications, websites, APIs and mobile apps that LAX360 delivers.', roles: ['Frontend Developers', 'Backend Developers', 'Full Stack Developers', 'Mobile Application Developers'], responsibilities: [], expertise: [] },
  { slug: 'ai-automation', name: 'AI & Automation', icon: 'bot', description: 'Creating AI-powered applications and automating business workflows.', overview: 'The AI & Automation team builds AI assistants, agents and workflow automations.', roles: ['AI Engineers', 'AI Application Developers', 'AI Agents Developers', 'Automation Specialists'], responsibilities: [], expertise: [] },
  { slug: 'digital-marketing', name: 'Digital Marketing', icon: 'megaphone', description: 'Growing visibility and demand through search, paid media, social and content.', overview: 'The marketing team plans and runs campaigns across search, paid advertising, social media and content.', roles: ['Digital Marketing Manager', 'SEO Specialists', 'Google Ads Specialists', 'Meta Ads Specialists', 'Social Media Managers', 'Content Creators'], responsibilities: [], expertise: [] },
  { slug: 'business-operations', name: 'Business & Operations', icon: 'briefcase', description: 'Keeping clients, projects and people supported from first conversation to delivery.', overview: 'Business & Operations looks after client relationships, project delivery and the people side of the company.', roles: ['Business Development Manager', 'Business Development Executives', 'Sales & Client Relations', 'Project Managers', 'HR & Operations'], responsibilities: [], expertise: [] },
]

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
