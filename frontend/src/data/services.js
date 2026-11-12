// The six official LAX360 service categories. All copy lives here so pages never hard-code content: the Services page, the service detail pages,
// the homepage "Our Services", About, the footer, the enquiry form and the chatbot knowledge (backend/app/knowledge/lax360_knowledge.py) all read
// these names, so keep them in step. Copy describes what we offer and how we work; it makes no claims about results, clients or figures.
// `group` (optional) sorts the offerings of a category into logical groups on its page.

import { slugify } from '../utils/slugify.js'

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
    name: 'Software & IT Services',
    short: 'Custom software, websites, web and mobile apps, CRM and ERP, business systems and e-commerce.',
    outcome: 'Software that fits how your business already works.',
    tags: ['Custom software', 'Websites & web apps', 'CRM & ERP', 'E-commerce'],
    enquiryType: 'project',
    accent: 'monogram',
    photo: '/assets/services/software.webp',
    metaTitle: 'Software & IT Services — Custom Software, Web, Mobile, CRM, ERP and E-commerce',
    metaDescription:
      'Custom software, website, web application, mobile app, CRM, ERP, business management and e-commerce development from LAX360 Pvt Ltd.',
    heroLine: 'Software that fits how you work.',
    overview:
      'Off-the-shelf tools rarely match the way a growing business actually runs. We design and build custom software, websites, applications and business systems around your processes, so your team spends less time working around the tools.',
    offerings: [
      { group: 'Build', name: 'Custom Software Development', text: 'Tailored software for your own workflows, designed to be maintained and extended as the business changes.' },
      { group: 'Build', name: 'Website Development', text: 'Fast, accessible, search-friendly business websites with a clear path from visitor to enquiry.' },
      { group: 'Build', name: 'Web Application Development', text: 'Browser-based applications — portals, dashboards and internal tools — that your team or customers sign in to.' },
      { group: 'Build', name: 'Mobile Application Development', text: 'Android and iOS applications for customers or staff, planned together with your web platform.' },
      { group: 'Run the business', name: 'CRM & ERP Development', text: 'Systems that bring customers, sales, stock and operations into one place, scoped to what you actually need.' },
      { group: 'Run the business', name: 'Business Management Systems', text: 'Applications for orders, billing, approvals and reporting that replace scattered spreadsheets.' },
      { group: 'Run the business', name: 'E-commerce Development', text: 'Online stores with catalogue, checkout and order handling, connected to the way you fulfil and bill.' },
    ],
    challenges: [
      'Billing, stock and customer data live in different tools.',
      'Spreadsheets have outgrown the team that maintains them.',
      'Your website looks fine but does not turn visitors into enquiries.',
      'Staff repeat manual steps that software could handle.',
    ],
    useCases: ['Order and billing management', 'Sales pipeline tracking', 'Service request handling', 'Customer portals', 'Business websites', 'Online stores'],
    stack: ['React', 'Node.js', 'REST APIs', 'Relational databases', 'Android / iOS'],
    stackNote: 'Technology is chosen for your requirement — the list shows the kinds of tools we work with, not a fixed menu.',
    engagement: 'Engagement model (fixed scope or monthly) is agreed during discovery.',
    faqs: [
      { q: 'Can you build on top of the tools we already use?', a: 'Often yes. During discovery we review what you use today and decide whether to connect to it, extend it or replace it.' },
      { q: 'Do you build both websites and mobile apps?', a: 'Yes. Web and mobile development sit in the same category, so they can share planning and design.' },
      { q: 'How do I get an estimate?', a: 'Share your requirement through the enquiry form. We follow up to understand it, then provide a written scope before work starts.' },
    ],
    related: ['mobile', 'headless'],
  },
  {
    slug: 'ai',
    number: '02',
    name: 'AI & Business Automation',
    short: 'AI applications, chatbots, AI agents, RAG solutions, process automation and AI consulting.',
    outcome: 'Let AI take the repetitive work off your team.',
    tags: ['AI applications', 'Chatbots & agents', 'RAG', 'Consulting'],
    enquiryType: 'ai',
    accent: 'violet',
    photo: '/assets/services/ai.webp',
    metaTitle: 'AI & Business Automation — AI Applications, Chatbots, Agents and RAG',
    metaDescription:
      'AI application development, chatbots and virtual assistants, AI agents, business process and workflow automation, RAG-based solutions and AI consulting from LAX360 Pvt Ltd.',
    heroLine: 'Let AI handle the repetitive work.',
    overview:
      'Many teams spend hours every week answering the same questions, moving data between tools and drafting routine replies. We design AI applications and automated workflows that sit alongside your people, with a person approving what matters.',
    offerings: [
      { group: 'Build with AI', name: 'AI Application Development', text: 'Applications that use language, document or image understanding as part of the product.' },
      { group: 'Build with AI', name: 'AI Chatbots & Virtual Assistants', text: 'Assistants that answer from information you approve and hand over to a person when needed.' },
      { group: 'Build with AI', name: 'AI Agent Development', text: 'Agents that carry out multi-step tasks with the tools you give them, with clear limits and human approval points.' },
      { group: 'Build with AI', name: 'RAG-Based AI Solutions', text: 'Assistants that retrieve answers from your own documents and data, so replies are grounded in your content.' },
      { group: 'Automate', name: 'Business Process Automation', text: 'Connect your tools so enquiries, follow-ups and records move without manual re-entry.' },
      { group: 'Automate', name: 'Workflow Automation', text: 'Repeatable multi-step flows — approvals, notifications, data updates — that run in the background.' },
      { group: 'Advise', name: 'AI Integration & Consulting', text: 'Work out where AI genuinely helps in your business, where a simpler solution is better, and how to connect it to your systems.' },
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
    related: ['automation', 'software'],
  },
  {
    slug: 'growth',
    number: '03',
    name: 'Digital Marketing',
    short: 'Social media, Meta and Google Ads, SEO, landing pages, content and marketing strategy.',
    outcome: 'Help the right people find you and enquire.',
    tags: ['Social media', 'Meta & Google Ads', 'SEO', 'Content'],
    enquiryType: 'marketing',
    accent: 'monogram',
    photo: '/assets/services/marketing.webp',
    metaTitle: 'Digital Marketing — Social Media, Meta Ads, Google Ads, SEO and Content',
    metaDescription:
      'Social media management, Meta and Google Ads, SEO, website and landing page optimisation, content creation and digital marketing strategy from LAX360 Pvt Ltd.',
    heroLine: 'Be found. Be remembered. Be contacted.',
    overview:
      'A good website needs visitors, and visitors need a reason to get in touch. Our digital marketing work pairs with the website and software we build, so the pieces work together. Exact scope is agreed per business.',
    offerings: [
      { group: 'Reach', name: 'Social Media Management', text: 'Planning and publishing that fits your audience and your brand voice.' },
      { group: 'Reach', name: 'Meta Ads Management', text: 'Paid campaigns on Facebook and Instagram aimed at enquiries, with clear tracking of what you spend.' },
      { group: 'Reach', name: 'Google Ads Management', text: 'Search and display campaigns that reach people already looking for what you offer.' },
      { group: 'Be found', name: 'Search Engine Optimization (SEO)', text: 'Technical and content improvements so people searching for what you offer can find you.' },
      { group: 'Convert', name: 'Website & Landing Page Optimization', text: 'Improve page structure, speed and calls to action so more visitors become enquiries.' },
      { group: 'Create & plan', name: 'Content Creation', text: 'Clear, useful writing and creative that supports your pages and campaigns.' },
      { group: 'Create & plan', name: 'Digital Marketing Strategy', text: 'A plan that connects channels, budget and goals, so each activity has a purpose.' },
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
    slug: 'headless',
    number: '04',
    name: 'Headless SaaS & API Solutions',
    short: 'Ready-to-integrate APIs and reusable backend services for developers, startups, agencies and businesses.',
    outcome: 'Add authentication, billing, bookings and more through APIs instead of building each from scratch.',
    tags: ['API Hub', 'Headless backend', 'Multi-tenant', 'White-label SaaS'],
    enquiryType: 'project',
    accent: 'monogram',
    photo: '/assets/services/headless.webp',
    metaTitle: 'Headless SaaS & API Solutions — API Hub, Headless Backend, Multi-Tenant and White-Label SaaS',
    metaDescription:
      'Reusable backend services and ready-to-integrate APIs from LAX360 Pvt Ltd: authentication, billing, bookings, CRM, notifications, payments, files, AI APIs, multi-tenant and white-label SaaS.',
    heroLine: 'Backend services you can plug in.',
    overview:
      'Most products need the same backend building blocks: sign-in, subscriptions, bookings, notifications, payments and file handling. We build these as reusable, API-first services that developers, startups, agencies and businesses can connect to their own web and mobile front ends — and we can build multi-tenant and white-label SaaS on the same foundation.',
    offerings: [
      { group: 'Platform', name: 'API Hub Development', text: 'A single place to publish, document and manage the APIs your products and partners use.' },
      { group: 'Platform', name: 'Headless Backend Development', text: 'API-first backends with no fixed front end, so the same logic can power web, mobile and partner apps.' },
      { group: 'Platform', name: 'Multi-Tenant SaaS Development', text: 'One application serving many customers, with each customer’s data and settings kept separate.' },
      { group: 'Platform', name: 'White-Label SaaS Solutions', text: 'Software you can offer under your own brand, built on a reusable core.' },
      { group: 'Account & money', name: 'Authentication APIs', text: 'Sign-up, sign-in, sessions and roles as a service, ready to connect to your app.' },
      { group: 'Account & money', name: 'Billing & Subscription APIs', text: 'Plans, subscriptions and invoicing logic you can integrate rather than rebuild.' },
      { group: 'Account & money', name: 'Payment Gateway Integration', text: 'Connect your product to the payment gateway you choose, with orders and payment status kept in step.' },
      { group: 'Business services', name: 'Booking & Appointment APIs', text: 'Availability, bookings and reminders for services that run on appointments.' },
      { group: 'Business services', name: 'CRM APIs', text: 'Contacts, leads and activity records exposed through APIs for your own tools.' },
      { group: 'Business services', name: 'Notification APIs', text: 'Email, SMS and in-app notifications sent through one consistent interface.' },
      { group: 'Business services', name: 'File & Media APIs', text: 'Upload, storage and delivery of documents and images through a simple interface.' },
      { group: 'Business services', name: 'AI APIs', text: 'AI capabilities such as text understanding and generation, offered as APIs your product can call.' },
    ],
    highlights: [
      { title: 'Ready-to-integrate APIs', text: 'Documented endpoints you connect to, so common features do not start from a blank page.' },
      { title: 'Reusable backend modules', text: 'Building blocks designed to be combined, extended and reused across projects.' },
      { title: 'Authentication & billing', text: 'The account and subscription services most products need, available as services.' },
      { title: 'Multi-tenant architecture', text: 'One platform serving many customers, with their data kept apart.' },
      { title: 'White-label SaaS', text: 'Launch software under your own brand on a reusable foundation.' },
      { title: 'Developer-focused infrastructure', text: 'Clear documentation and predictable interfaces for the people who integrate them.' },
    ],
    audiences: ['Developers', 'Startups', 'Agencies', 'Businesses'],
    challenges: [
      'You are rebuilding sign-in, billing or notifications for every new product.',
      'Your front ends — web, mobile and partners — need one shared backend.',
      'You want to offer software to your own customers under your brand.',
      'You need to connect your product to payments and third-party tools.',
    ],
    useCases: ['A startup adding subscriptions and sign-in to its app', 'An agency reusing one backend across client projects', 'A business exposing booking or CRM data to its own apps', 'A white-label platform resold under a partner’s brand'],
    stack: ['REST APIs', 'Webhooks', 'Token-based authentication', 'Relational databases', 'Cloud hosting'],
    stackNote: 'We choose the stack with you based on scale, hosting and your team’s skills.',
    engagement: 'We start by agreeing which services you need and how they should connect, then deliver them in stages.',
    faqs: [
      { q: 'Is the LAX360 API Hub available today?', a: 'A product page for the API Hub will be linked from here. Until then, describe what you need through the enquiry form and we will discuss it.' },
      { q: 'Can you build a backend for our existing front end?', a: 'Yes. A headless backend is designed to work with whichever web or mobile front end you already have.' },
      { q: 'Can the same platform serve several of our customers?', a: 'That is what multi-tenant development is for: one platform, with each customer’s data kept separate.' },
    ],
    related: ['software', 'automation'],
  },
  {
    slug: 'automation',
    number: '05',
    name: 'Workflow Automation & Integration',
    short: 'n8n, WhatsApp and email automation, CRM and AI agent workflows, app and webhook integrations.',
    outcome: 'Connect the tools you already use so work moves without re-typing.',
    tags: ['n8n', 'WhatsApp', 'Email & CRM', 'Integrations'],
    enquiryType: 'ai',
    accent: 'monogram',
    photo: '/assets/services/automation.webp',
    metaTitle: 'Workflow Automation & Integration — n8n, WhatsApp, Email, CRM and Webhooks',
    metaDescription:
      'n8n workflow automation, business process, WhatsApp, email and CRM automation, AI agent workflows, third-party application and webhook integration from LAX360 Pvt Ltd.',
    heroLine: 'Let your tools work together.',
    overview:
      'Most businesses already use several tools that do not talk to each other, so people copy data by hand and follow-ups get missed. We build automations and integrations that connect those tools and handle the routine steps, with people stepping in where judgement is needed.',
    offerings: [
      { group: 'Automate', name: 'n8n Workflow Automation', text: 'Visual workflows built on n8n that connect your apps and run routine steps automatically.' },
      { group: 'Automate', name: 'Business Process Automation', text: 'Turn repeated manual processes — approvals, hand-offs, updates — into defined, automatic flows.' },
      { group: 'Channels', name: 'WhatsApp Automation', text: 'Automated messages and replies for common customer interactions, with a path to a person.' },
      { group: 'Channels', name: 'Email Automation', text: 'Triggered and scheduled emails — confirmations, reminders, follow-ups — sent without manual effort.' },
      { group: 'Channels', name: 'CRM Automation', text: 'Leads and customer records created, updated and followed up automatically.' },
      { group: 'Smart workflows', name: 'AI Agent Workflows', text: 'Workflows where an AI agent handles a step — such as drafting or classifying — with a person approving.' },
      { group: 'Connect', name: 'Third-Party Application Integration', text: 'Connect your systems to the other applications and services your business depends on.' },
      { group: 'Connect', name: 'Webhook Integration', text: 'Send and receive events between systems in real time, so one change updates the others.' },
    ],
    challenges: [
      'Enquiries from forms, WhatsApp and email end up in different places.',
      'Follow-ups depend on someone remembering to send them.',
      'Data is copied by hand between your CRM, spreadsheets and other tools.',
    ],
    useCases: ['New enquiry added to the CRM and acknowledged on WhatsApp', 'Appointment reminders by email or WhatsApp', 'Form submissions routed to the right person', 'Orders synced between a store and an accounts tool'],
    engagement: 'We map the current steps with you, automate the repeatable ones first and extend from there.',
    faqs: [
      { q: 'Do we have to replace the tools we use now?', a: 'No. The point of integration is to connect your current tools rather than replace them.' },
      { q: 'Do automations run without anyone watching?', a: 'They run on their own, with notifications and clear fallbacks so a person can step in when something needs attention.' },
    ],
    related: ['ai', 'headless'],
  },
  {
    slug: 'mobile',
    number: '06',
    name: 'Mobile & Business Applications',
    short: 'Booking, field-staff, location tracking, billing and inventory apps, and custom business mobile apps.',
    outcome: 'Put the day-to-day tools of your business on your team’s phones.',
    tags: ['Booking apps', 'Field staff', 'Billing', 'Inventory'],
    enquiryType: 'website-app',
    accent: 'monogram',
    photo: '/assets/services/mobile.webp',
    metaTitle: 'Mobile & Business Applications — Booking, Field Staff, Tracking, Billing and Inventory Apps',
    metaDescription:
      'Appointment booking, field staff and task tracking, employee location tracking, billing, inventory and custom business mobile applications from LAX360 Pvt Ltd.',
    heroLine: 'Business tools, built for the phone.',
    overview:
      'Many businesses run on people who are away from a desk — visiting customers, serving them or managing stock. We build mobile and business applications that give those teams the information and tools they need in one place, and that connect back to your central systems.',
    offerings: [
      { group: 'Customers', name: 'Appointment Booking Applications', text: 'Let customers book, change and cancel appointments, with reminders and a clear schedule for your team.' },
      { group: 'Teams in the field', name: 'Field Staff & Task Tracking Applications', text: 'Assign, update and complete tasks from the field, with progress visible to the office.' },
      { group: 'Teams in the field', name: 'Employee Location Tracking Applications', text: 'Location features for teams that work on the move, built with clear consent and privacy rules agreed with you.' },
      { group: 'Operations', name: 'Business Billing Applications', text: 'Create bills and invoices and record payments from a phone or counter.' },
      { group: 'Operations', name: 'Inventory Management Applications', text: 'Track stock in and out, with levels visible wherever your team works.' },
      { group: 'Custom', name: 'Custom Business Mobile Applications', text: 'A mobile application designed around a process specific to your business.' },
    ],
    challenges: [
      'Field teams report by phone or messages, and the office keeps re-entering updates.',
      'Bookings are managed by hand and clash or get missed.',
      'Billing and stock are only updated when someone is back at a computer.',
    ],
    useCases: ['A service business scheduling customer visits', 'A sales or service team recording daily tasks', 'A shop billing and tracking stock from a phone', 'A clinic or salon taking appointments'],
    stack: ['Android', 'iOS', 'Cross-platform frameworks', 'REST APIs', 'Cloud backend'],
    stackNote: 'The approach — native or cross-platform — is chosen for your requirement and budget.',
    engagement: 'We usually start with the most important workflow, release it to a small group, then extend it.',
    faqs: [
      { q: 'Do you build for both Android and iOS?', a: 'Yes. We plan platform choice with you during discovery.' },
      { q: 'How is location tracking handled?', a: 'It is designed around consent and clear rules for when location is collected, which we agree with you before building.' },
    ],
    related: ['software', 'headless'],
  },
]

// Every offering gets its own slug (its page is /services/<category>/<slug>).
divisions.forEach((d) => d.offerings.forEach((o) => { o.slug = slugify(o.name) }))

// (getOffering lives in offerings.js: it needs the long per-service copy in serviceDetails.js, which the home page does not.)

// All divisions (service categories), in page order.
export const allDivisions = divisions.map((d) => ({ ...d, to: `/services/${d.slug}` }))

export const getDivision = (slug) => divisions.find((d) => d.slug === slug)

/** An offering's links: its anchor on the category's page. */
export const offeringsByGroup = (d) => {
  const groups = []
  d.offerings.forEach((o) => {
    const g = o.group || 'Services'
    let slot = groups.find((x) => x.title === g)
    if (!slot) { slot = { title: g, items: [] }; groups.push(slot) }
    slot.items.push(o)
  })
  return groups
}

export const servicesFaq = [
  { q: 'Which category should I start with?', a: 'Start with the problem you want to solve. If it is unclear, send an enquiry and we will help you decide.' },
  { q: 'Can you work across several categories on one project?', a: 'Yes. One team handles software, AI, automation, APIs, mobile and marketing, so one project can use more than one.' },
  { q: 'Do you offer technology consulting?', a: 'Consulting is the first step of every engagement and is also available as an enquiry type.' },
  { q: 'How do you price projects?', a: 'It depends on scope. We provide a written scope and estimate before work starts.' },
  { q: 'Can I talk to someone first?', a: 'Yes. Use WhatsApp, phone or the enquiry form — whichever suits you.' },
]
