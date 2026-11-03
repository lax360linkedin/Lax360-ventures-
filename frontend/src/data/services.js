// The four approved divisions. All copy lives here so pages never hard-code content.
// Scope for Digital Growth and CAD & Engineering is marked [Confirm] in the planning
// document, so the copy below stays at the level of "what we can discuss", not guarantees.

export const processSteps = [
  { n: '01', title: 'Discover', text: 'We listen, ask questions and write down the business problem before any build starts.' },
  { n: '02', title: 'Design', text: 'We shape the experience, architecture and a written scope so you know what you are getting.' },
  { n: '03', title: 'Develop', text: 'We build in steps and show working progress, so feedback arrives early.' },
  { n: '04', title: 'Deploy & Improve', text: 'We help release it, gather feedback and keep improving after launch.' },
]

export const divisions = [
  {
    slug: 'software',
    number: '01',
    name: 'Software & Apps',
    short: 'Custom software, CRM and ERP, websites and mobile apps.',
    outcome: 'Software that fits how your business already works.',
    tags: ['Custom software', 'CRM & ERP', 'Web & mobile'],
    enquiryType: 'project',
    accent: 'monogram',
    metaTitle: 'Software & Apps — Custom Software, CRM, ERP, Web and Mobile',
    metaDescription:
      'Custom business software, CRM and ERP, website and mobile app development from LAX360 Ventures — planned, built and supported by one team.',
    heroLine: 'Software that fits how you work.',
    overview:
      'Off-the-shelf tools rarely match the way a growing business actually runs. We design and build custom applications, CRM and ERP systems, websites and mobile apps around your processes, so your team spends less time working around the software.',
    offerings: [
      { name: 'Software development & IT services', text: 'Tailored web-based and desktop software for your own workflows, built to be maintained and extended.' },
      { name: 'Custom business applications', text: 'Internal tools for orders, billing, inventory, approvals and reporting — shaped around your team.' },
      { name: 'CRM & ERP', text: 'Systems that bring customers, sales, stock and operations into one place, scoped to what you actually need.' },
      { name: 'Website development', text: 'Fast, accessible, search-friendly business websites with clear paths to enquiry.' },
      { name: 'Mobile app development', text: 'Android and iOS applications for customers or staff, planned together with your web platform.' },
    ],
    challenges: [
      'Billing, stock and customer data live in different tools.',
      'Spreadsheets have outgrown the team that maintains them.',
      'Your website looks fine but does not turn visitors into enquiries.',
      'Staff repeat manual steps that software could handle.',
    ],
    useCases: ['Order and billing management', 'Sales pipeline tracking', 'Service request handling', 'Customer portals', 'Business websites'],
    stack: ['React', 'Node.js', 'REST APIs', 'Relational databases', 'Android / iOS'],
    stackNote: 'Technology is chosen for your requirement — the list shows the kinds of tools we work with, not a fixed menu.',
    engagement: 'Engagement model (fixed scope or monthly) will be agreed during discovery.',
    faqs: [
      { q: 'Can you build on top of the tools we already use?', a: 'Often yes. During discovery we review what you use today and decide whether to connect to it, extend it or replace it.' },
      { q: 'Do you build both websites and mobile apps?', a: 'Yes. Web and mobile development sit in the same division, so they can share planning and design.' },
      { q: 'How do I get an estimate?', a: 'Share your requirement through the enquiry form. We follow up to understand it, then provide a written scope before work starts.' },
    ],
    related: ['ai', 'growth'],
  },
  {
    slug: 'ai',
    number: '02',
    name: 'AI & Automation',
    short: 'AI assistants, business automation and AI-powered applications.',
    outcome: 'Let AI take the repetitive work off your team.',
    tags: ['AI assistants', 'Automation', 'AI apps'],
    enquiryType: 'ai',
    accent: 'violet',
    metaTitle: 'AI & Automation — AI Assistants and Business Workflow Automation',
    metaDescription:
      'AI assistants, business automation and AI-powered application development from LAX360 Ventures. Start with a consultation.',
    heroLine: 'Let AI handle the repetitive work.',
    overview:
      'Many teams spend hours every week on answering the same questions, moving data between tools and drafting routine replies. We design AI assistants and automated workflows that sit alongside your people, with a human approving what matters.',
    offerings: [
      { name: 'AI solutions', text: 'Identify where AI genuinely helps in your business and where a simpler solution is better.' },
      { name: 'Business automation', text: 'Connect your tools so enquiries, follow-ups and records move without manual re-entry.' },
      { name: 'AI-powered applications', text: 'Applications that use language and document understanding as part of the product.' },
      { name: 'AI assistants', text: 'Assistants that answer from approved information and hand over to a person when needed.' },
    ],
    challenges: [
      'The team answers the same customer questions all day.',
      'Data is copied by hand between forms, email and spreadsheets.',
      'Documents pile up waiting for someone to read and classify them.',
      'You are curious about AI but unsure where it is worth using.',
    ],
    workflowLabel: 'Example workflow (illustrative, not a client result)',
    workflow: ['Enquiry arrives', 'AI drafts a reply', 'Staff approves', 'CRM is updated'],
    dataSafety: [
      'AI answers are grounded in information you approve.',
      'People stay in the loop for decisions that matter.',
      'We discuss what data is used, where it is processed and who can see it before building.',
    ],
    useCases: ['Customer support assistant', 'Lead follow-up automation', 'Document sorting and summaries', 'Internal knowledge assistant'],
    engagement: 'Start with an AI consultation: describe the repetitive task, and we assess what is realistic.',
    faqs: [
      { q: 'Do we need AI for every process?', a: 'No. We start with the task and recommend AI only where it is a good fit; sometimes simple automation is better.' },
      { q: 'Will AI replace our staff?', a: 'Our approach keeps people in the loop. The aim is to remove repetitive work, not decision-making.' },
      { q: 'How is our data handled?', a: 'We talk through data handling during consultation and agree it before anything is built.' },
    ],
    related: ['software', 'growth'],
  },
  {
    slug: 'growth',
    number: '03',
    name: 'Digital Growth',
    short: 'Digital marketing that pairs with your website and software.',
    outcome: 'Help the right people find you and enquire.',
    tags: ['SEO', 'Social media', 'Performance ads'],
    enquiryType: 'marketing',
    accent: 'monogram',
    metaTitle: 'Digital Growth — Digital Marketing, SEO, Social and Ads',
    metaDescription:
      'Digital marketing from LAX360 Ventures — SEO, social media, performance advertising and content, paired with your website.',
    heroLine: 'Be found. Be remembered. Be contacted.',
    overview:
      'A good website needs visitors, and visitors need a reason to get in touch. Our digital growth work pairs marketing with the website and software we build, so the pieces work together. Exact scope is agreed per business.',
    offerings: [
      { name: 'Search engine optimisation', text: 'Technical and content improvements so people searching for what you offer can find you.' },
      { name: 'Social media', text: 'Planning and publishing that fits your audience and your brand voice.' },
      { name: 'Performance advertising', text: 'Paid campaigns aimed at enquiries, with clear tracking of what you spend.' },
      { name: 'Content', text: 'Clear, useful writing and creative that supports your pages and campaigns.' },
    ],
    challenges: [
      'People find you, but they do not enquire.',
      'You are not sure which marketing activity is worth the budget.',
      'Your website and your campaigns are managed separately.',
    ],
    useCases: ['New website with launch marketing', 'Local and regional search visibility', 'Lead generation campaigns', 'Social presence for a new brand'],
    engagement: 'Scope and reporting approach are agreed with you before work begins.',
    faqs: [
      { q: 'Can marketing be added to a website project?', a: 'Yes — a website and marketing bundle is a natural pairing, and we can plan both together.' },
      { q: 'How will I know what is working?', a: 'We agree what to measure up front and report on it in plain language.' },
    ],
    related: ['software', 'ai'],
  },
  {
    slug: 'engineering',
    number: '04',
    name: 'CAD & Engineering',
    short: 'CAD support for civil and mechanical engineering work.',
    outcome: 'Drawings and models prepared to your brief.',
    tags: ['Civil', 'Mechanical', '2D / 3D'],
    enquiryType: 'cad',
    accent: 'monogram',
    metaTitle: 'CAD & Engineering — Civil and Mechanical CAD Services',
    metaDescription:
      'CAD services for civil and mechanical engineering — drafting and 2D/3D modelling from LAX360 Ventures. Send your drawing brief.',
    heroLine: 'Drawings and models, prepared to your brief.',
    overview:
      'Our CAD and engineering division supports civil and mechanical engineering work with drafting and 2D/3D modelling. It is deliberately separate from our software work, because it serves a different kind of client with different needs.',
    offerings: [
      { name: 'Civil CAD', text: 'Drafting and drawing support for civil and construction-related work.' },
      { name: 'Mechanical CAD', text: '2D drawings and 3D models for mechanical parts and assemblies.' },
      { name: '2D drafting & 3D modelling', text: 'Technical drawings and models prepared from your sketches, markups or requirements.' },
    ],
    challenges: [
      'Your engineers are busy and drawings are backing up.',
      'You have sketches or markups that need turning into clean drawings.',
      'You need 3D models for review or manufacturing discussions.',
    ],
    useCases: ['Drawing preparation from sketches', '3D part modelling', 'Drawing revisions and updates'],
    engagement:
      'Software used, deliverable formats and turnaround are confirmed per project. Files are shared by email after we review your brief; there is no file upload on this website.',
    faqs: [
      { q: 'How do I send my drawing brief?', a: 'Describe the work in the enquiry form. We reply to discuss details and arrange to receive files by email.' },
      { q: 'Which file formats are supported?', a: 'This is confirmed per project, so tell us what you need in the brief.' },
    ],
    related: ['software', 'ai'],
  },
]

// All four divisions, in homepage order.
export const allDivisions = divisions.map((d) => ({ ...d, to: `/services/${d.slug}` }))

export const getDivision = (slug) => divisions.find((d) => d.slug === slug)

export const servicesFaq = [
  { q: 'Which division should I start with?', a: 'Start with the problem you want to solve. If it is unclear, send an enquiry and we will help you decide.' },
  { q: 'Can you work across several divisions on one project?', a: 'Yes. One team handles software, AI, marketing and training, so one project can use more than one.' },
  { q: 'Do you offer technology consulting?', a: 'Consulting is the first step of every engagement and is also available as an enquiry type.' },
  { q: 'How do you price projects?', a: 'It depends on scope. We provide a written scope and estimate before work starts.' },
  { q: 'Can I talk to someone first?', a: 'Yes. Use WhatsApp, phone or the enquiry form — whichever suits you.' },
]
