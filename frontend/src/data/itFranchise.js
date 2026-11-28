// Content of the IT & Software Franchise page, written from "LAX360_IT_Software_Franchise_Website_Content.pdf" supplied by LAX360 management.
// Not published: the document's drafting instructions (button behaviour, "use a sticky sidebar", "website integration", the publication note as written). The publication note's intent is kept as a
// visible caution on the product list: availability, vendor authorization and resale rights are confirmed in the franchise agreement, and listing a platform is not a reseller claim.

export const ITF = {
  hero: { heading: 'Build Your Own Technology Business with LAX360', lead: 'Become part of a growing technology network. Explore software sales, custom development, artificial intelligence and business automation opportunities with the support of LAX360.' },
  about: {
    tagline: 'Innovating Technology. Empowering Businesses. Building the Future.',
    paragraphs: [
      'LAX360 IT & Software is a division of LAX360 Pvt Ltd focused on business-oriented digital solutions for startups, SMEs, institutions and enterprises. Our expertise spans software, websites, web and mobile applications, SaaS, artificial intelligence and automation.',
      'The proposed franchise model enables entrepreneurs to establish a technology-focused business under the approved LAX360 brand. Franchise partners focus on local customer acquisition, sales, requirement collection and customer relationships, with centralized technical delivery and business support as agreed.',
    ],
  },
  who: { items: ['Entrepreneurs and startup founders', 'Existing IT companies and software resellers', 'Business consultants and digital marketing agencies', 'Computer sales and service businesses', 'Working professionals, investors and existing business owners'], note: 'Applications are evaluated based on business objectives, location, infrastructure and operational readiness.' },
  opportunities: {
    lead: 'Build a diversified technology business through approved LAX360 software products, third-party software sales, website projects, custom software, web and mobile applications, AI solutions and automation services. Detailed product and service information is available in the Our Products list in the sidebar rather than repeated on this page.',
    areas: ['Approved LAX360 software products', 'Third-party software sales, where permitted', 'Website projects', 'Custom software', 'Web and mobile applications', 'AI solutions', 'Automation services'],
  },
  benefits: { lead: 'What LAX360 provides', items: ['Approved franchise identity and brand usage rights', 'Access to eligible product and service catalogues', 'Sales presentations, product demonstrations and quotation coordination', 'Centralized technical consultation and project delivery support', 'Marketing resources and local business development guidance', 'Product orientation and staff training', 'Franchise website listing and CRM or partner portal access, where available', 'Customer support escalation and project coordination'], note: 'All benefits are subject to the approved franchise package, system readiness and signed agreement.' },
  branding: {
    lead: 'The proposed branding kit helps franchise partners maintain a consistent and professional LAX360 identity.',
    groups: [['A. Logo & brand identity', ['Official logo files and approved variations', 'Brand colours, typography and usage guidelines']], ['B. Marketing materials', ['Company profile, product and service brochures', 'Sales presentations, posters, social media creatives and launch announcements']],
      ['C. Office branding', ['Entrance signage, reception branding and display materials', 'Business cards, employee ID cards, letterheads and standee designs']], ['D. Digital branding', ['Email signatures and WhatsApp Business branding', 'Social media profile assets, digital catalogues and enquiry templates']]],
  },
  support: {
    lead: 'LAX360 can assist with lead generation guidance, customer meetings, demonstrations, requirement analysis, feasibility assessment, proposals and quotation coordination. Approved projects are handled through the agreed technical delivery model, covering design, development, testing, deployment and post-delivery support.',
    workflow: ['Customer enquiry', 'Requirement collection', 'Technical consultation', 'Proposal', 'Customer approval', 'Development', 'Testing', 'Deployment', 'Support'],
  },
  crm: { lead: 'Approved franchise partners may receive access to centralized business management tools, depending on system readiness and the franchise agreement.', items: ['Dashboard, enquiries, leads and customer management', 'Deal tracking, product catalogue and demo requests', 'Quotation requests and project coordination', 'Eligible earnings, settlements and business reports', 'Documents, notifications and support tickets'] },
  training: {
    training: ['Product features and demonstrations', 'Sales communication', 'Requirement collection', 'Technology awareness', 'CRM usage', 'Customer documentation', 'Support escalation'],
    infrastructure: ['Professional office', 'Reception or customer meeting area', 'Computers', 'Reliable internet', 'Demonstration display', 'Approved signage', 'Business communication facilities', 'Appropriate information security measures'],
    staffing: 'Business development and customer coordination personnel. A full local development team is not required under the proposed centralized delivery model.',
  },
  revenue: {
    oneTime: ['Software sales', 'Website projects', 'Custom development', 'Mobile and web applications', 'AI implementation', 'Eligible installation services'],
    recurring: ['Eligible SaaS subscriptions', 'Vendor renewals', 'Annual maintenance', 'Hosting and ongoing support contracts'],
    note: 'Earnings depend on approved commercial terms, customer payments and applicable vendor policies. No fixed income or guaranteed return is promised.',
  },
  responsibilities: ['Maintain approved brand standards and suitable infrastructure.', 'Develop local business opportunities and register customer leads.', 'Collect accurate requirements and coordinate customer meetings.', 'Follow approved quotations, pricing and payment procedures.', 'Protect customer data and confidential business information.', 'Avoid unauthorized commitments, vendor representations or sub-franchise rights.', 'Maintain records and submit agreed performance reports.'],
  lax: ['Franchise identity, brand rights and catalogues', 'Sales presentations, demonstrations and quotation coordination', 'Centralized technical consultation and project delivery', 'Product orientation and staff training', 'CRM or partner portal access, where available', 'Customer support escalation'],
  commercialNote: 'Franchise fees, investment, security deposit (if applicable), royalty, revenue sharing, renewal charges, agreement duration, territory rights, branding and portal charges will be specified in the approved proposal and agreement.',
  onboarding: ['Submit franchise application', 'Initial business consultation', 'Business and location evaluation', 'Franchise proposal and commercial discussion', 'Documentation and verification', 'Agreement and applicable payment', 'Branding and office setup', 'Product and staff training', 'Approved system access and activation', 'Franchise launch and ongoing support'],
  faqs: [
    ['Who can apply?', 'Entrepreneurs, existing businesses, IT companies, consultants and eligible professionals.'],
    ['Do I need a development team?', 'Not under the proposed centralized technical delivery model; final responsibilities are defined in the agreement.'],
    ['Can I sell LAX360 products and services?', 'Approved partners can promote eligible products and services from the available catalogue.'],
    ['Can I sell third-party software?', 'Only where permitted by the relevant vendor agreements and authorization policies.'],
    ['Will I receive training and branding?', 'Approved resources and training may be provided according to the franchise package.'],
    ['Can I earn recurring revenue?', 'Eligible subscriptions, renewals and support contracts may provide recurring opportunities.'],
    ['What is the investment and territory policy?', 'These details will be discussed during consultation and specified in the agreement.'],
    ['Is income guaranteed?', 'No. Earnings depend on actual business performance and applicable commercial terms.'],
    ['How do I apply?', 'Complete the application form at the bottom of the page.'],
  ],
  applyLead: 'Start your technology business journey with us. Submit your details and our business development team will contact you to discuss the next steps.',
  interests: ['Own software products', 'Third-party products', 'Websites', 'Custom software', 'Web applications', 'Mobile applications', 'AI', 'Automation', 'Headless SaaS & APIs'],
  contact: { name: 'LAX360 IT & Software Division', line: 'LAX360 Pvt Ltd', locations: ['Salem', 'Bangalore', 'Mumbai'] },
}

// The "Our Products" list in the sidebar: every product, platform and service named in the document. `to` links to the site's own page where one exists for the same offering; the others are listed as named.
export const ITF_PRODUCTS = {
  note: 'Availability, vendor authorization and resale rights are confirmed during evaluation and in the franchise agreement. Listing a platform here does not mean LAX360 resells it or that franchise partners may resell it.',
  groups: [
    { title: 'LAX360 own products', items: [
      { name: 'Healthcare & Hospital Management' }, { name: 'Business CRM', to: '/products/lax360-business-crm' }, { name: 'HR & Employee Management', to: '/products/lax360-hr-employee-management' },
      { name: 'Inventory & Billing' }, { name: 'ERP Solutions' }, { name: 'Education & Institution Management' }, { name: 'SaaS Products' }] },
    { title: 'Technology partners & platforms', items: [
      { name: 'Zoho', desc: 'CRM, accounting, HR and business applications' }, { name: 'Marg ERP', desc: 'Billing, inventory, accounting and distribution' },
      { name: 'OpenAI', desc: 'AI integration and development technologies' }, { name: 'HexBis', desc: 'Approved product catalogue', tag: 'Pending verification' }] },
    { title: 'IT & software services', items: [
      { name: 'Website Development', desc: 'Static, dynamic, corporate, e-commerce and 3D', to: '/services/software/website-development' },
      { name: 'Custom Software Development', desc: 'Desktop, cloud, online and offline', to: '/services/software/custom-software-development' },
      { name: 'Web Application Development', to: '/services/software/web-application-development' },
      { name: 'Mobile Application Development', desc: 'Android and iOS', to: '/services/software/mobile-application-development' },
      { name: 'AI Solutions (under development)', desc: 'Chatbots, voice AI, AI agents and AI employees: planned, not available yet', to: '/artificial-intelligence' },
      { name: 'Business & Workflow Automation', to: '/services/software/ai-workflow-automations-and-integrations' },
      { name: 'Headless SaaS and API Development & Integration', to: '/services/software/headless-saas-and-api-solutions' },
      { name: 'Cloud & Hosting, UI/UX Design, Testing, Maintenance & Support', to: '/services' }] },
    { title: 'Other partnership opportunities', items: [{ name: 'IT & Software Authorized Partner', to: '/authorized-partner/it' }, { name: 'IT & Software Referral Partner', to: '/referral-partner/it' }] },
  ],
}
export const ITF_PRODUCT_COUNT = ITF_PRODUCTS.groups.reduce((n, g) => n + g.items.length, 0)
