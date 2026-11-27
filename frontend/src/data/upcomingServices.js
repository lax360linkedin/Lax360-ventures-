// Upcoming service categories of LAX360 Pvt Ltd: CAD & Engineering Design, Robotics, and Blockchain & Web 3.0.
// They are PLANNED / UNDER DEVELOPMENT: nothing here describes a launched service, a finished product or a client project, and no dates, prices or results are stated.
// This is the built-in (prerendered) content. Administrators can change every field, add services and change the launch status in Admin > Services > Upcoming service
// categories / Upcoming services (see hooks/useUpcoming.js); activating a service for launch is a status change, not a code change.

export const STATUSES = {
  coming_soon: { label: 'Coming Soon', tone: 'amber', note: 'This service is not available yet. It will be launched in the future.' },
  under_development: { label: 'Under Development', tone: 'violet', note: 'This service is currently under development and will be launched in the future. It is not available to order yet.' },
  available: { label: 'Available', tone: 'green', note: 'This service is available. Contact us to get started.' },
  unavailable: { label: 'Temporarily Unavailable', tone: 'rose', note: 'This service is temporarily unavailable. Register your interest and we will get back to you.' },
}
export const STATUS_ORDER = ['coming_soon', 'under_development', 'available', 'unavailable']
/** Is the service actually on offer? Only "available" counts: everything else is described as upcoming and never as a live service or an active partnership program. */
export const isLive = (status) => status === 'available'

export const UPCOMING_CATEGORIES = [
  {
    slug: 'cad-engineering', path: '/cad-engineering', name: 'CAD & Engineering Design Services', short: 'CAD & Engineering Design', status: 'coming_soon', icon: 'cad',
    tagline: 'Computer-aided design and engineering drawing support for mechanical and civil work.',
    description: ['LAX360 is planning to add CAD and engineering design services for mechanical and civil requirements. The service is currently under development and will be launched in the future.',
      'We have not delivered CAD or engineering design projects under this category yet. The scope, the software and the way of working will be published here when the service is ready and verified.'],
    seoTitle: 'CAD & Engineering Design Services (Coming Soon)', seoDescription: 'Mechanical CAD and Civil CAD from LAX360 Pvt Ltd: an upcoming service category that is currently under development. Register your interest.',
    headline: 'Engineering design, drawn with care.',
    lead: 'Mechanical CAD and Civil CAD are being planned as new LAX360 services. Register your interest and we will let you know when they are ready.',
    areas: [
      { title: 'Drawings and models', text: 'Technical drawings and models prepared in CAD software. The exact scope will be defined before launch.' },
      { title: 'Mechanical and civil', text: 'Two planned areas: mechanical parts and assemblies, and civil and construction drawings.' },
      { title: 'Connected with our other services', text: 'Engineering work often needs software, documents and automation around it, which LAX360 already provides.' },
    ],
    services: [
      { slug: 'mechanical-cad', name: 'Mechanical CAD', summary: 'Planned: CAD drawings and models for mechanical parts and assemblies.' },
      { slug: 'civil-cad', name: 'Civil CAD', summary: 'Planned: CAD drawings and plans for civil and construction work.' },
    ],
  },
  {
    slug: 'robotics', path: '/robotics', name: 'Robotics Services', short: 'Robotics', status: 'coming_soon', icon: 'robot',
    tagline: 'Intelligent machines that combine software, AI, sensors and connected technologies.',
    description: ['LAX360 is planning robotics services that combine software, AI, sensors and connected technologies to create solutions for real-world applications. The service is currently under development and will be launched in the future.',
      'We have not developed robotics products, and no robotics product or service is commercially available yet.'],
    seoTitle: 'Robotics Services (Coming Soon)', seoDescription: 'Robotics Solutions and Robotics Development and Integration from LAX360 Pvt Ltd: an upcoming service category that is currently under development. Register your interest.',
    headline: 'Bringing Intelligent Machines to Life.',
    lead: 'We are exploring the future of robotics and intelligent automation, combining software, AI, sensors and connected technologies to create innovative solutions for real-world applications.',
    areas: [
      { title: 'Intelligent automation', text: 'Using software and AI to automate work that machines can do reliably, building on the automation work we already do for businesses.' },
      { title: 'Software and AI for machines', text: 'The software layer that lets a machine understand its task and its surroundings and make useful decisions.' },
      { title: 'Sensors and connected technologies', text: 'Sensors and connected devices that let machines gather information and share it with business systems.' },
      { title: 'Real-world applications', text: 'Practical uses that solve a real problem. Which applications we pursue will be decided as the plans mature; none is committed yet.' },
    ],
    services: [
      { slug: 'robotics-solutions', name: 'Robotics Solutions', summary: 'Planned: robotics solutions that bring software, AI and sensors together for a practical task.' },
      { slug: 'robotics-development-integration', name: 'Robotics Development and Integration', summary: 'Planned: developing robotic systems and integrating them with business software and processes.' },
    ],
    today: ['Software and IT services', 'AI and business automation (AI applications, agents, process automation)', 'Workflow automation and integration'],
    todayLinks: [{ label: 'AI & Business Automation', to: '/services/ai' }, { label: 'Software & IT Services', to: '/services/software' }],
  },
  {
    slug: 'blockchain', path: '/blockchain', name: 'Blockchain & Web 3.0 Services', short: 'Blockchain & Web 3.0', status: 'coming_soon', icon: 'chain',
    tagline: 'Secure digital transactions, decentralized applications and next-generation digital ecosystems.',
    description: ['LAX360 is planning blockchain and Web 3.0 services, exploring practical applications such as secure digital transactions, decentralized applications, smart contracts and transparent business processes. The service is currently under development and will be launched in the future.',
      'We have not launched a blockchain or Web 3.0 product or service yet.'],
    seoTitle: 'Blockchain & Web 3.0 Services (Coming Soon)', seoDescription: 'Blockchain Development and Web 3.0 Solutions from LAX360 Pvt Ltd: an upcoming service category that is currently under development. Register your interest.',
    headline: 'Building a More Connected and Trustworthy Digital Future.',
    lead: 'We are exploring blockchain technology and its potential to support secure digital transactions, decentralized applications, smart contracts, transparent business processes and next-generation digital ecosystems.',
    areas: [
      { title: 'Secure digital transactions', text: 'How blockchain can help record and protect transactions so that the record can be trusted.' },
      { title: 'Decentralized applications', text: 'Applications that do not depend on a single central system to run.' },
      { title: 'Smart contracts', text: 'Agreements that run as code, so that agreed steps happen automatically and visibly.' },
      { title: 'Transparent business processes', text: 'Processes whose steps can be checked by the people involved.' },
    ],
    services: [
      { slug: 'blockchain-development', name: 'Blockchain Development', summary: 'Planned: building blockchain-based applications and smart contracts.' },
      { slug: 'web3-solutions', name: 'Web 3.0 Solutions', summary: 'Planned: decentralized and next-generation web solutions.' },
    ],
    today: ['Software and IT services', 'Web and mobile applications', 'Secure, API-driven business software'],
    todayLinks: [{ label: 'Software & IT Services', to: '/services/software' }, { label: 'Mobile & Business Applications', to: '/services/mobile' }],
  },
]

/** The three partnership programs the upcoming services are listed under (the slugs and paths of data/partnership.js). */
export const PROGRAMS = [
  { key: 'franchise', flag: 'partner_franchise', label: 'Franchise Opportunities', path: '/franchise' },
  { key: 'authorized', flag: 'partner_authorized', label: 'Authorized Partner Program', path: '/authorized-partner' },
  { key: 'referral', flag: 'partner_referral', label: 'Referral Partner Program', path: '/referral-partner' },
]
/** The partnership program (category slug of data/partnership.js) each key belongs to. */
export const PROGRAM_BY_SLUG = { franchise: 'franchise', 'authorized-partner': 'authorized', 'referral-partner': 'referral' }

export const upcomingPath = (slug, builtin) => builtin?.path || `/upcoming/${slug}`
