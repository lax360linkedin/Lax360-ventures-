// LAX360 Partner With Us: the built-in (prerendered) content of the partnership pages. It is original LAX360 copy written for this website; nothing here is taken from another company's site.
//
// Rules this content follows (they are also enforced by the admin panel):
//  - No invented prices, investment amounts, ROI, income, commission percentages, placement or admission guarantees, awards, customer numbers or testimonials.
//  - Franchise commercial terms are not finalised: every commercial field reads "available on consultation" until management publishes a value in the admin panel.
//  - Authorized and Referral partner registration is free under the approved model. Commission depends on the approved product, service, deal and agreement.
//  - Support commitments are "subject to the applicable agreement". An application is an enquiry; it never makes anyone a partner.
// Administrators can override headings, introductions, SEO, commercial fields, FAQs, policies, images and brochures in the admin panel (Partnerships); this file is the fallback and the version search engines read.

import { EDU } from './educationFranchise.js'
import { EDUA } from './educationAuthorized.js'
import { EDUR } from './educationReferral.js'
import { ITF } from './itFranchise.js'
import { ITA } from './itAuthorized.js'
import { ITR } from './itReferral.js'
import { DM, DMA, DMR } from './dmPartners.js'

export const CATEGORIES = [
  {
    slug: 'franchise', path: '/franchise', label: 'Franchise', short: 'Franchise Opportunities', accent: 'var(--color-primary)',
    tagline: 'Establish and operate an approved LAX360 business under a formal franchise agreement.',
    summary: 'A franchise is a formal agreement to set up and run an approved LAX360 business in an agreed territory, with your own premises, team and investment, following LAX360 standards. Commercial terms are still being finalised and are discussed during evaluation.',
    seoTitle: 'Franchise Opportunities in India', seoDescription: 'Explore LAX360 franchise opportunities in Education, Digital Marketing and IT & Software: how a franchise works, who can apply and how to start a consultation.',
    profile: 'Entrepreneurs, institutions and established businesses ready to own and operate a local business.',
  },
  {
    slug: 'authorized-partner', path: '/authorized-partner', label: 'Authorized Partner', short: 'Authorized Partner Program', accent: 'var(--color-primary)',
    tagline: 'Collaborate with LAX360 as a Lead & Sales Support Partner.',
    summary: 'Authorized Partners help LAX360 with business development, lead generation, customer communication and sales coordination. They are not franchise owners and do not run an independent delivery centre. Registration is free; commission depends on the approved product, service, deal and partner agreement.',
    seoTitle: 'Authorized Partner Program', seoDescription: 'Join the LAX360 Authorized Partner Program as a lead and sales support partner for Education, Digital Marketing and IT & Software. Free registration; eligibility and agreement apply.',
    profile: 'Professionals, consultants and businesses with a customer network who want to support LAX360 sales.',
  },
  {
    slug: 'referral-partner', path: '/referral-partner', label: 'Referral Partner', short: 'Referral Partner Program', accent: 'var(--color-primary)',
    tagline: 'Refer. Track. Convert. Earn.',
    summary: 'Referral Partners introduce potential customers to LAX360. LAX360 handles qualification, follow-up, quotations and delivery. There is no registration fee and no centre to operate. Eligible commission is payable only when the approved referral conditions are met.',
    seoTitle: 'Referral Partner Program', seoDescription: 'Introduce customers to LAX360 as a referral partner for Education, Digital Marketing and IT & Software. No registration fee; commission applies only to eligible, converted referrals.',
    profile: 'Anyone with a trusted network: individuals, freelancers, working professionals and small businesses.',
  },
]

export const DIVISIONS = [
  {
    slug: 'education', label: 'Education', long: 'Education & Skill Development', accent: 'var(--color-primary)', icon: 'graduation',
    blurb: 'IT certification courses in programming, web, databases, testing, cloud, DevOps, data, cyber security, digital marketing and frameworks, plus internships, workshops and institutional training.',
    services: ['IT certification courses', 'Software development courses', 'Career-oriented programmes', 'Internships', 'Workshops', 'Institutional and corporate training'],
  },
  {
    slug: 'digital-marketing', label: 'Digital Marketing', long: 'Digital Marketing', accent: 'var(--color-primary)', icon: 'megaphone',
    blurb: 'Search, social, paid advertising, branding, content and lead generation for growing businesses.',
    services: ['Search engine optimization', 'Social media management', 'Paid advertising (Google and Meta)', 'Lead generation', 'Branding and creative', 'Content marketing', 'Digital business growth'],
  },
  {
    slug: 'it', label: 'IT & Software', long: 'IT & Software Solutions', accent: 'var(--color-primary)', icon: 'code',
    blurb: 'Websites, web and mobile applications, business software, CRM and ERP, SaaS, AI and automation.',
    services: ['Website development', 'Web applications', 'Mobile applications', 'Business software', 'CRM and ERP', 'SaaS products', 'Artificial intelligence', 'Business automation'],
  },
]

export const PROGRAM_ORDER = ['education', 'digital-marketing', 'it']
export const divisionBySlug = (s) => DIVISIONS.find((d) => d.slug === s)
export const categoryBySlug = (s) => CATEGORIES.find((c) => c.slug === s)
export const categoryPrefix = (cat) => categoryBySlug(cat)?.path || `/${cat}`
export const opportunityPath = (cat, div) => `${categoryPrefix(cat)}/${div}`

// ------------------------------------------------------------------------------------------------ division-specific building blocks (what makes each page different)
const D = {
  education: {
    franchise: {
      heading: 'Open an approved LAX360 training centre.',
      lead: 'Run a technical training centre in your city under a formal franchise agreement: IT certification courses, internships, workshops and institutional training, delivered to LAX360 academic standards.',
      intro: ['Demand for practical, career-oriented technical skills is steady in most cities, and many learners want a local centre with real classrooms and computer labs. An LAX360 Education Franchise is for people and institutions who want to build that kind of centre as their own business.',
        'The franchisee owns and operates the centre: premises, staff, local admissions and day-to-day management. LAX360 provides the approved course catalogue, academic guidelines, brand standards and the coordination described in the franchise agreement.'],
      opportunities: ['Technical training and skill-development programmes', 'IT certification courses from the LAX360 Education course list', 'Student admissions for local learners', 'College workshops, seminars and internship programmes', 'Corporate and institutional training enquiries', 'Short-term and career-oriented courses where approved'],
      model: [['Centre', 'A branded training centre with classrooms and a computer laboratory that meet LAX360 guidelines.'], ['Programmes', 'Courses and training categories approved by LAX360 for your territory.'], ['Students', 'Admissions handled locally; student records managed through the processes LAX360 specifies.'], ['Institutions', 'Local college, school and company relationships for workshops and training.']],
      infrastructure: ['A suitable commercial space with reception, classroom(s) and a computer laboratory', 'Computers and networking meeting the minimum specification LAX360 provides', 'Reliable internet, power backup and basic safety provisions', 'Display equipment for instruction and demonstrations', 'A counselling and admissions area', 'Signage and branding applied according to the brand guidelines'],
      team: ['A centre manager or owner who is actively involved', 'Qualified trainers for the programmes you offer (onboarded and briefed by LAX360)', 'An admissions and counselling coordinator', 'Support staff as the centre grows'],
      lax: ['Approved course catalogue and curriculum guidance', 'Trainer onboarding and academic delivery guidelines', 'Assessment and certification process, where applicable', 'Marketing and admission-campaign guidance', 'Business-setup consultation', 'Career guidance material and placement assistance only where LAX360 has approved it'],
      partner: ['Set up and maintain the centre to the agreed standards', 'Recruit and manage trainers and staff', 'Follow the approved curriculum and academic guidelines', 'Handle admissions honestly, without promising jobs, placements or results', 'Protect student data and use the brand only as permitted', 'Meet the financial and reporting obligations in the agreement'],
      policies: [['Student promises', 'Franchisees must not promise guaranteed admissions, jobs, placements or income to students.'], ['Academic standards', 'Courses, assessments and certificates follow the standards LAX360 approves.'], ['Student data', 'Student information is collected only for training administration and protected.'], ['Fees and refunds', 'Student fee and refund rules are set out in the franchise agreement and the centre\'s published policy.']],
      faqs: [['Do I need a teaching background?', 'Not necessarily. A franchisee can be an entrepreneur who manages the centre while qualified trainers deliver the courses. Trainers are onboarded according to LAX360 guidelines.'], ['What courses can the centre offer?', 'Only programmes that LAX360 has approved for your territory. The catalogue can change as programmes are added or withdrawn.'], ['Does LAX360 guarantee placements?', 'No. Career guidance and placement assistance are offered only where LAX360 has approved them, and no job, admission or income is guaranteed.'], ['What does a classroom and lab setup need?', 'Indicative requirements are listed on this page; the final specification is provided during evaluation and may differ by programme.']],
    },
    authorized: {
      heading: 'Support LAX360 admissions and institutional training.',
      lead: 'As an Education Authorized Partner you help LAX360 reach students, colleges and companies: course enquiries, admission follow-up, workshop coordination and institutional business development.',
      intro: ['Learners and institutions often need someone they know to explain a course, arrange a workshop or connect them with a training provider. Education Authorized Partners play that role for LAX360.',
        'You are a Lead & Sales Support Partner: you build relationships and coordinate enquiries, while LAX360 retains authority over official academic commitments, pricing, certification and admission confirmation unless an agreement says otherwise.'],
      opportunities: ['Student admission enquiries and course promotion', 'Connections with colleges, schools and training institutes', 'Corporate training opportunities', 'Workshop and seminar coordination', 'Internship opportunities for students', 'Student counselling coordination and admission follow-up', 'Institutional business development'],
      model: [['Role', 'Lead & Sales Support Partner, not a franchise owner and not a delivery centre.'], ['Registration', 'Free under the approved partner model.'], ['Earnings', 'Commission depends on the approved course or programme, the deal and the partner agreement.'], ['Authority', 'LAX360 confirms admissions, fees, certification and academic commitments.']],
      lax: ['Course information and approved promotional material', 'Qualification of enquiries and official counselling', 'Quotations, admission confirmation and delivery', 'Commission calculation under the approved terms', 'Partner guidance and a partner portal where available'],
      partner: ['Represent LAX360 accurately and only with approved information', 'Pass genuine enquiries to LAX360 promptly', 'Never promise admissions, jobs, placements or discounts on LAX360\'s behalf', 'Respect student and institutional confidentiality'],
      policies: [['Academic commitments', 'Only LAX360 may confirm admission, fees, certification and academic outcomes.'], ['Lead ownership', 'The first valid lead submitted keeps its ownership under the approved rules; duplicates are not paid twice.'], ['Commission', 'Commission is based on the approved programme and deal, and applies only after verification and payment as described in the agreement.'], ['Confidentiality', 'Student and institution details learned through the programme stay confidential.']],
      faqs: [['Can I enrol students myself?', 'No. You introduce and support; LAX360 confirms admissions and receives fees as the agreement specifies.'], ['Do I need an office?', 'No office is required for the Authorized Partner model.'], ['How is commission decided?', 'By the approved programme, the deal and your agreement. Rates are not published for every programme.'], ['Is registration free?', 'Yes, under the approved partner model.']],
    },
    referral: {
      heading: 'Refer learners and institutions to LAX360.',
      lead: 'Introduce students, colleges and companies to LAX360 training. LAX360 handles counselling, enrolment and delivery; you earn eligible commission when a referral converts.',
      intro: ['If people around you ask where to learn software, AI or technical skills, you can point them to LAX360 and be recognised for it. Referral partners do not need a centre, an office or any investment.',
        'You share the details of an interested person or institution (with their permission); LAX360 qualifies and follows up. Commission is payable only when the approved referral conditions are satisfied.'],
      opportunities: ['Students interested in technical and software courses', 'IT certification course enquiries', 'Internship and workshop requests', 'Colleges and educational institutions', 'Corporate training enquiries'],
      model: [['Process', 'Refer, track, convert, earn.'], ['Registration', 'No registration fee.'], ['Your role', 'Introduce; LAX360 qualifies, counsels and enrols.'], ['Commission', 'Only for eligible, converted referrals under the approved terms.']],
      lax: ['Verification of each referral', 'Counselling, enrolment and delivery', 'Referral tracking', 'Commission calculation and settlement under the approved terms'],
      partner: ['Refer only people who have agreed to be contacted', 'Share accurate details', 'Make no promises about admission, jobs or fees', 'Respect the duplicate-referral rules'],
      policies: [['Eligible referral', 'A genuine enquiry from a person or institution that has agreed to be contacted and is not already known to LAX360.'], ['Duplicates', 'The first valid referral is the one considered; later duplicates are not eligible.'], ['Commission', 'No commission is earned by submitting an unqualified enquiry; it applies only when the approved conditions are met.'], ['Privacy', 'You must have the person\'s consent before sharing their details.']],
      faqs: [['Do I get paid for every enquiry?', 'No. Commission is payable only when a referral meets the approved conditions, such as verification and a completed enrolment or payment.'], ['Can I refer an institution?', 'Yes, colleges and training bodies can be referred for workshops, training or collaboration.'], ['Is there any fee?', 'No registration fee is charged under the approved model.'], ['Do I need LAX360\'s permission to promote?', 'Use only approved material and do not make promises on LAX360\'s behalf.']],
    },
  },
  'digital-marketing': {
    franchise: {
      heading: 'Build a digital marketing business with LAX360.',
      lead: 'Operate an approved LAX360 digital marketing business: SEO, social media, paid advertising, branding, content and lead generation for local clients, delivered to LAX360 service standards.',
      intro: ['Local businesses want to be found online and reach customers, but few can run marketing in-house. A digital marketing franchise lets you serve those clients locally with an established brand and shared processes.',
        'The franchisee runs the business and its team and owns the client relationships in the territory. LAX360 provides the service framework, brand standards and coordination set out in the franchise agreement. No campaign result is guaranteed.'],
      opportunities: ['Search engine optimization services', 'Social media marketing and management', 'Google advertising services', 'Meta advertising services', 'Branding and creative services', 'Content marketing', 'Lead-generation services and client acquisition', 'Recurring monthly service relationships'],
      model: [['Services', 'A service menu approved by LAX360, delivered under the LAX360 brand rules.'], ['Clients', 'Local business clients served and managed by the franchisee.'], ['Delivery', 'Campaign planning, execution and reporting following LAX360 processes.'], ['Coordination', 'Technical and marketing coordination with the LAX360 team as the agreement describes.']],
      infrastructure: ['A small office suitable for a working team and client meetings', 'Computers, reliable internet and the marketing tools LAX360 requires', 'Subscriptions to advertising and analytics platforms as the work needs', 'A secure way to store client data and credentials', 'Brand-compliant signage and templates'],
      team: ['A business owner or manager', 'Digital marketing specialists (search, social, paid media)', 'A designer or content creator', 'A client-service coordinator'],
      lax: ['Service framework and delivery guidelines', 'Client onboarding and campaign-management process guidance', 'Performance-reporting formats', 'Business-development guidance', 'Technical and marketing coordination as the agreement specifies'],
      partner: ['Deliver services to the agreed quality and honestly describe what they can achieve', 'Manage client onboarding, campaigns and reporting', 'Protect client data, accounts and confidential information', 'Follow the brand guidelines and commercial policies', 'Meet the financial and reporting obligations in the agreement'],
      policies: [['No guaranteed results', 'Advertising and marketing results depend on many factors. Franchisees must not guarantee rankings, leads, revenue or conversions.'], ['Client data', 'Client accounts, data and credentials must be handled securely and returned or deleted as the client\'s contract requires.'], ['Brand', 'LAX360 branding and creative templates are used only as the brand guidelines permit.'], ['Service quality', 'Reporting and delivery standards are set out in the franchise agreement.']],
      faqs: [['Will LAX360 guarantee that I get clients?', 'No. LAX360 provides the framework and guidance; winning clients depends on your own effort, market and service quality.'], ['Do campaigns have guaranteed results?', 'No. Results are never guaranteed and franchisees may not promise them to clients.'], ['What tools will I need?', 'Analytics, advertising, design and project tools. The required list is provided during evaluation.'], ['Is a technical background needed?', 'Marketing experience helps, but a franchisee can lead a qualified team.']],
    },
    authorized: {
      heading: 'Bring marketing clients to LAX360.',
      lead: 'As a Digital Marketing Authorized Partner you find businesses that need marketing, coordinate meetings and requirements, and support the sales process while LAX360 prepares proposals and delivers the work.',
      intro: ['Many business owners know they need marketing but not where to start. Authorized Partners who already speak with such owners can introduce LAX360 and guide the conversation.',
        'You help with lead generation, scheduling and requirement gathering. Official proposals, campaign commitments, pricing and delivery follow LAX360 approval; you do not deliver the service or set prices.'],
      opportunities: ['Business lead generation and client acquisition', 'Promoting LAX360 marketing services', 'Coordinating digital strategy consultations', 'Meeting scheduling and requirement gathering', 'Sales follow-up and campaign proposal requests', 'Client onboarding coordination', 'Eligible recurring-service opportunities'],
      model: [['Role', 'Lead & Sales Support Partner.'], ['Registration', 'Free under the approved partner model.'], ['Earnings', 'Commission based on the approved service, deal and partner agreement; recurring services may qualify where the agreement says so.'], ['Delivery', 'Done by LAX360 only.']],
      lax: ['Qualification of leads and discovery calls', 'Proposals, quotations and campaign planning', 'Service delivery, reporting and client communication', 'Commission calculation under the approved terms'],
      partner: ['Describe services accurately using approved material', 'Never promise results, prices or timelines on LAX360\'s behalf', 'Share genuine leads promptly', 'Keep client and lead information confidential'],
      policies: [['Proposals and prices', 'Only LAX360 issues proposals and prices.'], ['Lead ownership', 'The first valid lead keeps its ownership under the approved rules.'], ['Recurring business', 'Commission on recurring services applies only as the partner agreement specifies and while the customer continues to pay.'], ['Confidentiality', 'Lead and client information is used only for the purpose of the programme.']],
      faqs: [['Do I run the campaigns?', 'No. LAX360 delivers the service; you support lead generation and coordination.'], ['Can I set my own prices?', 'No. Pricing and proposals come from LAX360.'], ['Is there a registration fee?', 'No, registration is free under the approved model.'], ['How is recurring commission handled?', 'Only where your agreement provides for it and subject to customer payments.']],
    },
    referral: {
      heading: 'Refer businesses that need marketing.',
      lead: 'Introduce small businesses, retailers, startups and professionals to LAX360 digital marketing. LAX360 qualifies the lead and discusses the service; you earn eligible commission when it converts.',
      intro: ['You probably know business owners who say, "I need more customers online." A referral to LAX360 is a simple way to help them and be recognised for it, with no investment and no office.',
        'Share a lead with the owner\'s permission; LAX360 does the qualification and service discussion. Commission applies only to eligible, converted referrals under the approved terms.'],
      opportunities: ['Small and medium businesses', 'Retail and local businesses', 'Startups', 'Educational institutions', 'Professional service providers', 'Businesses needing SEO, social media, paid advertising, branding or lead generation'],
      model: [['Process', 'Refer, track, convert, earn.'], ['Registration', 'No registration fee.'], ['Your role', 'Introduce the business.'], ['LAX360\'s role', 'Qualification, proposal, delivery and billing.']],
      lax: ['Lead verification and qualification', 'Service discussions and proposals', 'Delivery and customer billing', 'Commission calculation under the approved terms'],
      partner: ['Refer only businesses that agree to be contacted', 'Give accurate details', 'Do not describe prices or results on LAX360\'s behalf'],
      policies: [['Referral guidelines', 'Refer only genuine, interested businesses with their consent.'], ['Duplicates', 'A lead already known to LAX360 is not an eligible referral.'], ['Payment', 'Commission is settled under the payment and withdrawal policy once the referral is verified and paid for.'], ['Privacy', 'You must have permission before sharing a business owner\'s details.']],
      faqs: [['What counts as a good referral?', 'A business owner who wants marketing help, has agreed to be contacted, and is not already in contact with LAX360.'], ['Will I be told what happens to my referral?', 'Referral tracking is part of the approved model; the detail available depends on the partner portal.'], ['Is any investment needed?', 'No.'], ['When is commission earned?', 'Only after the referral is verified and the customer has paid, as the approved terms describe.']],
    },
  },
  it: {
    franchise: {
      heading: 'Run an IT and software business with LAX360.',
      lead: 'Operate an approved LAX360 IT and software business: websites, web and mobile applications, business software, CRM and ERP, SaaS, AI and automation, delivered with LAX360 products and processes.',
      intro: ['Businesses of every size are digitising, and many look for a local partner who understands their needs, demonstrates solutions and supports them after delivery. An IT & Software franchise is for operators who want to be that partner under an established brand.',
        'The franchisee runs the local business and client relationships and coordinates delivery with LAX360. Only products and programmes that LAX360 has approved for resale or service may be offered, and third-party vendors do not automatically authorise franchisees.'],
      opportunities: ['Website and e-commerce development', 'Web and mobile applications', 'Desktop and business software', 'CRM and ERP solutions', 'SaaS products and recurring subscriptions', 'AI solutions, AI agents and automation', 'Software implementation, deployment and support', 'Approved third-party software, where permitted'],
      model: [['Solutions', 'LAX360-approved products and services only.'], ['Clients', 'Local businesses served and managed by the franchisee.'], ['Delivery', 'Requirement gathering, demonstrations and project coordination with LAX360 teams.'], ['Recurring', 'Subscription and support relationships where the product allows.']],
      infrastructure: ['An office suited to client meetings and a working team', 'Computers, secure networking and development or demo environments as required', 'Secure storage for client and project data', 'Access to the demonstration environments LAX360 provides'],
      team: ['A business owner or manager', 'Solution consultants or pre-sales staff', 'Technical staff for implementation and support, or an arrangement with LAX360 for delivery', 'A client-support coordinator'],
      lax: ['Approved products, demonstrations and technical consultation', 'Project coordination and delivery arrangements as the agreement specifies', 'Licensing guidance and intellectual-property rules', 'Business-development guidance'],
      partner: ['Offer only approved products and services', 'Protect client confidentiality and intellectual property', 'Follow software-licensing rules and never re-sell what you are not authorised to sell', 'Meet the financial and reporting obligations in the agreement'],
      policies: [['Intellectual property', 'LAX360 and licensor software, source code and documentation remain the property of their owners.'], ['Licensing', 'Software may be sold only under the licence terms that apply; third-party products need the vendor\'s own authorisation.'], ['Confidentiality', 'Client data and project details are confidential and used only to deliver the agreed service.'], ['Product status', 'Products still in development are not offered as available until LAX360 approves them.']],
      faqs: [['Can I sell any software I like?', 'No. Only LAX360-approved products and services, under their licence terms.'], ['Does a third-party vendor authorise me automatically?', 'No. Third-party vendors set their own conditions; authorisation is never assumed.'], ['Do I need developers?', 'Not always: delivery arrangements with LAX360 can be part of the agreement. This is discussed in evaluation.'], ['Are products under development available to clients?', 'Not until LAX360 explicitly approves them.']],
    },
    authorized: {
      heading: 'Sell and support LAX360 software solutions.',
      lead: 'As an IT & Software Authorized Partner you help LAX360 find customers for software, SaaS, websites, applications, CRM, ERP and AI solutions: demonstrations, requirement collection, quotation requests and sales follow-up.',
      intro: ['Software sells best through trusted relationships. Authorized Partners who already advise businesses can introduce LAX360 solutions, arrange demonstrations and collect requirements.',
        'LAX360 prepares quotations and delivers. Eligible commission applies to LAX360 products and to approved third-party products under their own terms; no fixed percentage applies across all products.'],
      opportunities: ['Software and SaaS subscription sales', 'Website and application development enquiries', 'CRM and ERP solutions', 'AI and automation services', 'Product demonstrations', 'Business requirement collection and customer meetings', 'Proposed deals and quotation requests', 'Sales follow-up'],
      model: [['Role', 'Lead & Sales Support Partner.'], ['Registration', 'Free under the approved partner model.'], ['LAX360 products', 'Commission depends on the customer\'s payment and the approved terms; instalments are credited in proportion to payments received.'], ['Third-party SaaS', 'Commission depends on the vendor\'s verified commission and the applicable arrangement.']],
      lax: ['Demonstration support and technical answers', 'Quotations, contracts, delivery and support', 'Deal verification and commission calculation under the approved terms'],
      partner: ['Present only approved products and prices from LAX360', 'Collect requirements accurately', 'Respect software licensing and customer confidentiality', 'Report deals honestly'],
      policies: [['Software licensing', 'Customers receive software under the licence that applies; partners may not alter or re-license it.'], ['Confidentiality', 'Customer requirements and data are confidential.'], ['Commission', 'No fixed percentage applies to every product. Commission is product-based and deal-based and starts only after verification and customer payment.'], ['Customer data', 'Personal data collected for a deal is used only for that deal and kept secure.']],
      faqs: [['Is commission the same for every product?', 'No. It depends on the product, the deal and the agreement, and some products may not carry commission.'], ['What if a customer pays in instalments?', 'Eligible commission is calculated in proportion to the payments actually received, as applicable.'], ['Can I sell third-party software?', 'Only products LAX360 has approved, and commission depends on the vendor\'s verified commission.'], ['Do I need technical knowledge?', 'Basic familiarity helps; LAX360 supports technical questions.']],
    },
    referral: {
      heading: 'Refer customers who need software.',
      lead: 'Introduce businesses that need websites, applications, business software, CRM, ERP, SaaS, AI or automation. LAX360 handles qualification, quotations and delivery; you earn eligible commission when it converts.',
      intro: ['When someone you know says, "We need a website," or "Our billing is a mess," you can introduce LAX360. No investment, no office and no technical work is required of you.',
        'Eligible one-time and recurring commission is available only where the approved product agreement supports it, and some products carry referral restrictions.'],
      opportunities: ['Website and e-commerce development', 'Business software and mobile applications', 'Web applications', 'CRM and ERP', 'SaaS products', 'Artificial intelligence and AI automation', 'Software integration services'],
      model: [['Process', 'Refer, track, convert, earn.'], ['Registration', 'No registration fee.'], ['One-time vs recurring', 'Recurring commission applies only where the approved product agreement supports it.'], ['Restrictions', 'Some products have referral restrictions set out in their terms.']],
      lax: ['Referral verification', 'Requirement discussion, quotation and delivery', 'Commission calculation under the approved terms'],
      partner: ['Refer only people who consent to be contacted', 'Give accurate details', 'Make no promises about prices, features or timelines'],
      policies: [['Product restrictions', 'Certain products (for example third-party SaaS) have their own referral conditions. Check them before referring.'], ['Duplicates', 'A customer already known to LAX360 is not an eligible referral.'], ['Recurring commission', 'Only where the approved agreement supports it and while the customer keeps paying.'], ['Privacy', 'Obtain consent before sharing anyone\'s details.']],
      faqs: [['Will I earn on subscriptions?', 'Only where the approved product agreement supports recurring commission.'], ['Do all products qualify?', 'No. Some products have restrictions or no commission.'], ['Do I handle the sale?', 'No. LAX360 qualifies, quotes and delivers.'], ['Is registration free?', 'Yes, no registration fee under the approved model.']],
    },
  },
}

// ------------------------------------------------------------------------------------------------ category frames (what is common to a partnership type)
const FRAME = {
  franchise: {
    eligibility: ['Entrepreneurs ready to own and operate a local business', 'Established business owners adding a new line', 'Educational and training institutions (Education)', 'Digital agencies and software companies (Digital Marketing, IT)', 'Investors working with an active operator', 'Meeting the premises, team and verification requirements in evaluation'],
    process: ['Explore the opportunity', 'Submit the application', 'Business consultation', 'Evaluation and verification', 'Review the franchise agreement', 'Approval', 'Onboarding and setup'],
    support: ['Business-setup consultation', 'Onboarding guidance', 'Product and service knowledge', 'Marketing guidance', 'Operational guidance', 'Technical coordination'],
    commercial: ['registration_fee', 'initial_investment', 'infrastructure_investment', 'working_capital', 'security_deposit', 'royalty', 'revenue_sharing', 'agreement_duration', 'renewal_fee', 'territory', 'exclusivity', 'refund_conditions', 'exit_conditions'],
    policyKeys: [['Franchise agreement', 'Operating terms, territory, brand use, standards and obligations are set in a written franchise agreement. This page is not an offer.'], ['Investment and royalty', 'Investment, fees, royalty and any deposits will be communicated during evaluation and are subject to the approved agreement.'], ['Refund and exit', 'Refund conditions, renewal and exit requirements are defined in the agreement.'], ['Applicant privacy', 'Details you submit are used to evaluate your enquiry. See the LAX360 Privacy Policy and the partnership privacy notice.']],
  },
  authorized: {
    eligibility: ['Professionals and consultants with a relevant customer network', 'Business owners who can introduce LAX360 to other businesses', 'Agencies and freelancers working with the same customers', 'Existing service providers wanting an additional offering', 'Verification and acceptance of the partner agreement'],
    process: ['Explore the programme', 'Submit your application', 'Business consultation', 'Verification', 'Review and accept the agreement', 'Approval', 'Onboarding'],
    support: ['Business consultation', 'Onboarding guidance', 'Product and service knowledge', 'Sales enablement', 'Marketing resources', 'Partner portal, where available'],
    commercial: ['registration_fee', 'commission_model', 'agreement_duration', 'territory'],
    policyKeys: [['Free registration', 'No registration fee is charged under the approved partner model.'], ['First valid lead ownership', 'The first valid lead submitted keeps its ownership under the approved rules.'], ['Verification before commission', 'Commission is considered only after the lead is verified and the customer\'s payment conditions are met.'], ['Settlement', 'Eligible commission is consolidated and settled monthly by manual bank or UPI transfer after approval; there is no minimum payout. You may request early withdrawal of the whole available eligible balance, not part of it.'], ['Refund adjustments', 'If a customer is refunded, the related commission is adjusted.'], ['Disputes', 'Disputes are reviewed by LAX360 management under the partner agreement.']],
  },
  referral: {
    eligibility: ['Individuals with a trusted network', 'Freelancers and working professionals', 'Small businesses that meet customers who need LAX360 services', 'Anyone who can refer genuine, consenting prospects'],
    process: ['Join the programme (free)', 'Refer a prospect with their consent', 'LAX360 verifies the referral', 'Track the status', 'The customer converts and pays', 'Eligible commission is settled'],
    support: ['Simple referral submission', 'Referral tracking', 'Product and service information', 'Partner portal, where available'],
    commercial: ['registration_fee', 'commission_model'],
    policyKeys: [['Free to join', 'No registration fee is charged under the approved model.'], ['Eligible referrals', 'A genuine prospect who has consented to be contacted and is not already known to LAX360.'], ['Verification and duplicates', 'LAX360 verifies each referral; the first valid referral is considered and duplicates are not eligible.'], ['Payment and withdrawal', 'Eligible commission is settled monthly by manual bank or UPI transfer after approval, with no minimum payout; early withdrawal covers the entire available eligible balance, not part of it.'], ['Refund adjustments', 'Commission is adjusted if the customer is refunded.'], ['Privacy', 'Share a prospect\'s details only with their permission.']],
  },
}

const commercialDefault = (cat) => Object.fromEntries(FRAME[cat].commercial.map((k) => [k, null]))
const COMMERCIAL_LABELS = {
  registration_fee: 'Registration fee', initial_investment: 'Initial investment', infrastructure_investment: 'Infrastructure investment', working_capital: 'Working capital', security_deposit: 'Security deposit', royalty: 'Royalty',
  revenue_sharing: 'Revenue sharing', agreement_duration: 'Agreement duration', renewal_fee: 'Renewal fee', territory: 'Territory conditions', exclusivity: 'Exclusivity', refund_conditions: 'Refund conditions', exit_conditions: 'Exit conditions', commission_model: 'Commission',
}
export const commercialLabel = (k) => COMMERCIAL_LABELS[k] || k
/** What the public page says for a commercial field when management has not published a value. */
export const commercialFallback = (cat, key) => {
  if (key === 'registration_fee' && cat !== 'franchise') return 'Free. No registration fee under the approved partner model.'
  if (key === 'commission_model') return 'Depends on the approved product, service, deal and your partner agreement. Rates are not published for every product.'
  return cat === 'franchise' ? 'Available upon consultation. Final terms are subject to the approved franchise agreement.' : 'Set out in the partner agreement.'
}

export const SECTIONS = ['overview', 'opportunities', 'model', 'eligibility', 'infrastructure', 'responsibilities', 'benefits', 'support', 'process', 'commercial', 'policies', 'faq']
export const SECTION_LABELS = { overview: 'Overview', opportunities: 'Opportunities', model: 'How it works', eligibility: 'Who can apply', infrastructure: 'Setup requirements', responsibilities: 'Responsibilities', benefits: 'Why partner', support: 'Support', process: 'Process', commercial: 'Commercial information', policies: 'Policies', faq: 'FAQs' }

const BENEFITS = {
  franchise: ['Build a business under an established brand', 'Approved products and services to offer', 'Guidance from setup to operation', 'A formal agreement that defines both sides', 'Long-term collaboration, subject to the agreement'],
  authorized: ['Free registration', 'Earn eligible, product-based commission', 'No centre or large investment required', 'Approved material and guidance', 'A partner portal where available'],
  referral: ['Free to join', 'No investment and no office', 'Simple referral process with tracking', 'Eligible commission on converted referrals', 'LAX360 does the selling and delivery'],
}

export const opportunities = CATEGORIES.flatMap((c) => DIVISIONS.map((d) => {
  const x = D[d.slug][c.slug === 'franchise' ? 'franchise' : c.slug === 'authorized-partner' ? 'authorized' : 'referral']
  const key = c.slug === 'franchise' ? 'franchise' : c.slug === 'authorized-partner' ? 'authorized' : 'referral'
  const f = FRAME[key]
  const slug = `${c.slug}/${d.slug}`
  return {
    slug, path: `${c.path}/${d.slug}`, category: c.slug, key, division: d.slug,
    title: `${d.label} ${c.label}`, navLabel: d.label,
    seoTitle: `${d.label} ${c.label}${key === 'franchise' ? ' Opportunity' : ' Program'}`,
    seoDescription: `${x.lead}`.slice(0, 158).replace(/\s+\S*$/, '') + '.',
    heroHeading: x.heading, heroLead: x.lead, intro: x.intro, opportunities: x.opportunities, model: x.model,
    infrastructure: x.infrastructure ? { place: x.infrastructure, team: x.team } : null,
    eligibility: [...f.eligibility], responsibilities: { partner: x.partner, lax: x.lax }, benefits: BENEFITS[key], support: f.support, process: f.process,
    commercial: commercialDefault(key), policies: [...x.policies, ...f.policyKeys.slice(0, 4)], faqs: x.faqs.map(([q, a]) => ({ q, a })),
    disclaimers: key === 'franchise' ? ['This page is information, not an offer. Investment, fees and terms are available upon consultation and subject to the approved franchise agreement.', 'No income, profit, admission or placement result is guaranteed.']
      : ['Submitting an application is an enquiry. It does not make you a partner; approval follows consultation, verification and an agreement.', 'Commission depends on the approved product, deal and agreement; no earnings are guaranteed.'],
  }
}))
export const opportunityBySlug = (slug) => opportunities.find((o) => o.slug === slug)

/**
 * A page for a division or service an administrator added in the menu manager (Admin > Partnerships > Navigation menu). It carries only the category's generic, already-approved frame
 * (eligibility, process, support, policies, commercial placeholders) and the name/description the administrator typed; the hero heading, introduction, FAQs and extra sections come from the
 * admin page editor. Nothing about the division is invented here: no income, price, placement or result claims.
 */
export function customOpportunity(category, divisionSlug, label, description) {
  const c = categoryBySlug(category)
  if (!c) return null
  const key = category === 'franchise' ? 'franchise' : category === 'authorized-partner' ? 'authorized' : 'referral'
  const f = FRAME[key]
  const what = key === 'franchise' ? 'a franchise' : key === 'authorized' ? 'an authorized partner' : 'a referral partner'
  const lead = description || `Explore how to become ${what} for LAX360 ${label}. Details are confirmed during consultation.`
  return {
    slug: `${category}/${divisionSlug}`, path: `${c.path}/${divisionSlug}`, category, key, division: divisionSlug, custom: true,
    title: `${label} ${c.label}`, navLabel: label,
    seoTitle: `${label} ${c.label}${key === 'franchise' ? ' Opportunity' : ' Program'}`, seoDescription: lead.slice(0, 158),
    heroHeading: `${label}: ${c.short}`, heroLead: lead,
    intro: [lead, c.summary], opportunities: [], model: [], infrastructure: null,
    eligibility: [...f.eligibility], responsibilities: { partner: [], lax: [] }, benefits: BENEFITS[key], support: f.support, process: f.process,
    commercial: commercialDefault(key), policies: [...f.policyKeys.slice(0, 4)], faqs: [],
    disclaimers: key === 'franchise' ? ['This page is information, not an offer. Investment, fees and terms are available upon consultation and subject to the approved franchise agreement.', 'No income, profit, admission or placement result is guaranteed.']
      : ['Submitting an application is an enquiry. It does not make you a partner; approval follows consultation, verification and an agreement.', 'Commission depends on the approved product, deal and agreement; no earnings are guaranteed.'],
  }
}

// The Education Franchise page is written from the content LAX360 management supplied (data/educationFranchise.js). Its generic fields are replaced here so the prerendered summary,
// FAQs, eligibility, infrastructure and process all agree with the supplied document.
{
  const ef = opportunityBySlug('franchise/education')
  Object.assign(ef, {
    seoTitle: 'Education Franchise: LAX360 Education Training Centres',
    seoDescription: 'Open a LAX360 Education training centre: 53 IT certification courses, branding kit, academic and certification support, CRM, internships and placement assistance, under a franchise agreement.',
    heroHeading: 'Open a LAX360 Education training centre.',
    heroLead: EDU.about.paragraphs[1],
    intro: EDU.about.paragraphs,
    infrastructure: { place: EDU.infrastructure.map(([k, v]) => `${k}: ${v}`), team: ['Qualified faculty recruited by the franchise partner', 'Admission and counselling staff', 'Staff trained on CRM, admissions, fee documentation and reporting'] },
    responsibilities: { partner: EDU.responsibilities, lax: EDU.provide.map(([k, v]) => `${k}: ${v}`) },
    eligibility: ['Entrepreneurs', 'Educational institutions and training centres', 'Individuals interested in the education and skill development sector', 'Meeting the location, infrastructure and due-diligence requirements of the approval process'],
    process: EDU.onboarding.map(([t]) => t),
    faqs: EDU.faqs.map(([q, a]) => ({ q, a })),
    disclaimers: ['This page is information, not an offer. Franchise fees, territory rights, royalty and renewal terms are governed by the signed franchise agreement.', 'Placement assistance does not guarantee employment. Franchise authorization does not imply government or university accreditation.'],
  })
}

// The Digital Marketing Authorized Partner and Referral Partner pages are written from "Digital_Marketing_Partner_Program_Website_Content.docx_20261125_220245_0000.pdf" (data/dmPartners.js).
// That document has no responsibilities, fees, policies or FAQs, so none are published for these two pages (the generic ones are left empty on purpose).
for (const [slug, P] of [['authorized-partner/digital-marketing', DMA], ['referral-partner/digital-marketing', DMR]]) {
  const o = opportunityBySlug(slug)
  Object.assign(o, {
    heroHeading: DM.hero.heading,
    heroLead: DM.hero.lead,
    intro: [P.tagline, P.intro],
    opportunities: [], model: [], infrastructure: null,
    eligibility: P.who,
    responsibilities: { partner: [], lax: [] },
    benefits: P.benefits, support: [], process: P.how, policies: [],
    faqs: [],
    disclaimers: ['Submitting a partnership enquiry does not by itself make you a partner.'],
  })
}

// The IT & Software Referral Partner page is written from "LAX360_IT_Software_Referral_Partner_Website_Content.docx" (data/itReferral.js).
{
  const ir = opportunityBySlug('referral-partner/it')
  Object.assign(ir, {
    seoTitle: 'IT & Software Referral Partner Program: Refer Customers to LAX360',
    seoDescription: 'Join the LAX360 IT & Software Referral Partner programme: free registration, refer businesses needing software, websites, mobile apps, AI and automation, track referrals and eligible commission in a partner portal.',
    heroHeading: ITR.hero.heading,
    heroLead: ITR.hero.lead,
    intro: ITR.about.paragraphs,
    eligibility: ITR.who.items,
    responsibilities: { partner: ITR.responsibilities, lax: ITR.lax },
    process: ITR.onboarding,
    faqs: ITR.faqs.map(([q, a]) => ({ q, a })),
    disclaimers: ['Submitting a registration is an enquiry. Registration is free, but submission does not activate a partner account; approval follows verification and a signed partner agreement.', 'Commission is flexible and depends on the partner, product, deal and vendor terms. No fixed or guaranteed income and no commission percentage is promised. Referral status does not grant franchise rights or reseller authorization.'],
  })
}

// The IT & Software Authorized Partner page is written from "LAX360_IT_Software_Authorized_Partner_Website_Content.docx" (data/itAuthorized.js).
{
  const ia = opportunityBySlug('authorized-partner/it')
  Object.assign(ia, {
    seoTitle: 'IT & Software Authorized Partner Program: Sell LAX360 Technology Solutions',
    seoDescription: 'Become a LAX360 IT & Software Authorized Partner: free registration, eligible commission, product demonstrations, quotation support and a partner portal for software, web, mobile and AI solutions.',
    heroHeading: ITA.hero.heading,
    heroLead: ITA.hero.lead,
    intro: ITA.about.paragraphs,
    eligibility: ITA.who.items,
    responsibilities: { partner: ITA.responsibilities, lax: ITA.lax },
    process: ITA.onboarding,
    faqs: ITA.faqs.map(([q, a]) => ({ q, a })),
    disclaimers: ['Submitting an application is an enquiry. Registration is free, but submission does not grant authorization or activate an account; approval follows verification and a signed partner agreement.', 'Commission is flexible and depends on the partner, product, deal and vendor terms. No fixed or guaranteed income and no commission percentage is promised.'],
  })
}

// The IT & Software Franchise page is written from "LAX360_IT_Software_Franchise_Website_Content.pdf" (data/itFranchise.js).
{
  const it = opportunityBySlug('franchise/it')
  Object.assign(it, {
    seoTitle: 'IT & Software Franchise: Build a Technology Business with LAX360',
    seoDescription: 'Explore the LAX360 IT & Software franchise: software and SaaS sales, websites, web and mobile apps, AI and automation, with branding, training, CRM and centralized delivery support under a franchise agreement.',
    heroHeading: ITF.hero.heading,
    heroLead: ITF.hero.lead,
    intro: ITF.about.paragraphs,
    infrastructure: null,
    eligibility: ITF.who.items,
    responsibilities: { partner: ITF.responsibilities, lax: ITF.lax },
    process: ITF.onboarding,
    faqs: ITF.faqs.map(([q, a]) => ({ q, a })),
    disclaimers: ['This page is information, not an offer. Franchise fees, investment, territory, royalty and renewal terms are specified in the approved proposal and signed franchise agreement.', 'Earnings depend on approved commercial terms, customer payments and vendor policies. No fixed income or guaranteed return is promised.'],
  })
}

// The Education Referral Partner page is written from "LAX360_Referral_Programme_Updated.pdf" (data/educationReferral.js).
{
  const er = opportunityBySlug('referral-partner/education')
  Object.assign(er, {
    seoTitle: 'Education Referral Partner Program: Refer Students to LAX360 Education',
    seoDescription: 'Join the LAX360 Education Referral Partnership: refer students, colleges and organizations to IT certification courses, internships and workshops, with referral tracking and commission under a written agreement.',
    heroHeading: 'Become a LAX360 Education Referral Partner.',
    heroLead: EDUR.about.paragraphs[0],
    intro: EDUR.about.paragraphs,
    eligibility: EDUR.who.map(([t]) => t),
    responsibilities: { partner: EDUR.responsibilities, lax: EDUR.lax },
    process: EDUR.process.map(([t]) => t),
    faqs: EDUR.faqs.map(([q, a]) => ({ q, a })),
    disclaimers: ['This page is information, not an offer. Submitting an application is an enquiry; approval follows verification and a written agreement.', 'Commission applies only to eligible, verified referrals under the agreement; no earnings are guaranteed. Referral partnership does not grant franchise rights or authority to collect fees.'],
  })
}

// The Education Authorized Partner page is written from "LAX360_Authorized_Partnership_Updated.pdf" (data/educationAuthorized.js), the same way.
{
  const ea = opportunityBySlug('authorized-partner/education')
  Object.assign(ea, {
    seoTitle: 'Education Authorized Partner Program: Institutions & Training Partners',
    seoDescription: 'Become a LAX360 Education Authorized Partner: college and university MoUs, authorized training partners, workshops, internships, faculty training, branding kit and certification support, under a written agreement.',
    heroHeading: 'Become a LAX360 Education Authorized Partner.',
    heroLead: EDUA.about.paragraphs[0],
    intro: EDUA.about.paragraphs,
    eligibility: EDUA.who.map(([t]) => t),
    responsibilities: { partner: EDUA.responsibilities, lax: EDUA.provide.map(([t]) => t) },
    process: EDUA.onboarding.map(([t]) => t),
    faqs: EDUA.faqs.map(([q, a]) => ({ q, a })),
    disclaimers: ['This page is information, not an offer. Submitting an application is an enquiry; approval follows consultation, verification and a signed agreement or MoU.', 'Placement support is not a job guarantee. Authorization is a company-issued partnership and does not imply government, university or statutory accreditation.'],
  })
}

export const GENERAL_FAQS = [
  { q: 'What is the difference between a franchise, an authorized partner and a referral partner?', a: 'A franchisee owns and operates an approved LAX360 business under a formal agreement. An authorized partner supports LAX360 sales and lead generation. A referral partner introduces prospects and LAX360 does the rest. The commitment, responsibilities and earnings differ for each.' },
  { q: 'Is there a fee to become an authorized or referral partner?', a: 'No. Registration is free under the approved partner model. Franchise fees and investment are not yet finalised and are discussed during consultation.' },
  { q: 'Does submitting an application make me a partner?', a: 'No. An application is an enquiry. Approval follows a consultation, verification and an agreement.' },
  { q: 'Can I apply for more than one programme?', a: 'Yes. Submit a separate application for each programme and division you are interested in.' },
  { q: 'Do you guarantee income, admissions or placements?', a: 'No. LAX360 does not guarantee income, profit, admissions, jobs or business results to any partner or franchisee.' },
  { q: 'Where is LAX360 based?', a: 'LAX360 operates from Salem, Bangalore and Mumbai. Applications may be coordinated through the nearest office, with final decisions made by authorised LAX360 management.' },
]

export const COMPARISON = {
  heads: ['Franchise', 'Authorized Partner', 'Referral Partner'],
  rows: [
    ['Suitable for', 'Entrepreneurs, institutions and businesses ready to own and run a local business', 'Professionals and businesses with a customer network', 'Individuals and small businesses with a trusted network'],
    ['Registration fee', 'Available upon consultation', 'Free', 'Free'],
    ['Business investment', 'Available upon consultation', 'None required', 'None required'],
    ['Office or premises', 'Required, to LAX360 standards', 'Not required', 'Not required'],
    ['Business ownership', 'Own and operate a local LAX360 business', 'No ownership; support role', 'No ownership; referral role'],
    ['Lead generation', 'Local marketing and admissions', 'Responsible for generating and sharing leads', 'Refers prospects'],
    ['Sales', 'Local sales within the agreement', 'Supports sales; LAX360 issues quotations', 'None; LAX360 follows up'],
    ['Revenue opportunity', 'From local business operations, not guaranteed', 'Eligible commission', 'Eligible commission'],
    ['Commission', 'Not applicable (franchise model)', 'Product- and deal-based, after verification', 'Only on converted, verified referrals'],
    ['Operations', 'Run the centre or business and its team', 'None', 'None'],
    ['Brand use', 'Per franchise agreement and guidelines', 'Approved material only', 'Approved material only'],
    ['Training and support', 'As the franchise agreement specifies', 'Guidance and sales enablement', 'Information and tracking'],
    ['Partner portal', 'Where available', 'Where available', 'Where available'],
    ['Agreement', 'Formal franchise agreement', 'Partner agreement', 'Referral terms'],
  ],
}

export const WHO_CAN_APPLY = ['Entrepreneurs', 'Business owners', 'IT professionals', 'Educational institutions', 'Training institutes', 'Digital marketing agencies', 'Software companies', 'Consultants', 'Freelancers', 'Working professionals', 'Investors', 'Existing service providers']
export const ECOSYSTEM = ['Business consultation', 'Onboarding guidance', 'Product and service knowledge', 'Sales enablement', 'Marketing resources', 'Technical coordination', 'Operational guidance', 'Partner portal']
export const JOURNEY = ['Explore partnership models', 'Select a business division', 'Submit your application', 'Attend a business consultation', 'Complete verification', 'Review the agreement', 'Receive approval', 'Begin onboarding']
export const WHY = [['Multiple business opportunities', 'Education, digital marketing and IT & software under one company.'], ['Technology-focused solutions', 'Products and services built around business software, AI and automation.'], ['Flexible participation', 'Own a business, support sales or simply refer.'], ['Centralised coordination', 'One LAX360 team coordinating enquiries, approvals and delivery.'], ['Approved products and services', 'Offer only what LAX360 has approved.'], ['Partner guidance', 'Consultation and onboarding, subject to the applicable agreement.'], ['Transparent commercial process', 'Clear rules for lead ownership, verification, commission and settlement.'], ['Long-term collaboration', 'Programmes designed for continuing relationships.']]
export const PARTNER_POLICIES = [
  ['First valid lead ownership', 'The first valid lead keeps its ownership under the approved rules.'], ['Lead verification', 'Commission is considered only after a lead is verified.'], ['Product- and deal-based commission', 'Rates depend on the approved product, service, deal and agreement.'],
  ['Monthly settlement', 'Eligible commission is consolidated and settled monthly.'], ['No minimum payout', 'There is no minimum payout amount.'], ['Manual settlement', 'Payments are made by bank or UPI transfer after approval by LAX360 management.'],
  ['Early withdrawal', 'You may ask to withdraw the entire available eligible balance early; partial payouts are not made.'], ['Refund adjustments', 'Commission is adjusted when a customer is refunded.'], ['Customer payments', 'For LAX360 products, commission depends on the customer\'s payment; instalments count in proportion to the payments received.'],
  ['Third-party SaaS', 'Commission depends on the vendor\'s verified commission and the applicable arrangement.'], ['Disputes', 'Disputes are reviewed by LAX360 management under the agreement.'],
]

export const PARTNER_PAGES = {
  overview: { path: '/partner-with-us', title: 'Franchise & Partnership Opportunities', seoTitle: 'Franchise & Partnership Opportunities in India', seoDescription: 'Partner with LAX360 Pvt Ltd: franchise, authorized partner and referral programs across Education, Digital Marketing and IT & Software. Explore the options and apply.' },
  apply: { path: '/partner-with-us/apply', title: 'Become a Partner', seoTitle: 'Apply to Become a LAX360 Partner', seoDescription: 'Apply for a LAX360 franchise, authorized partner or referral partner program. A short multi-step form; an application is an enquiry and does not grant partner status.' },
  faq: { path: '/partner-with-us/faq', title: 'Partnership FAQs', seoTitle: 'Partnership Programs FAQ', seoDescription: 'Answers to common questions about LAX360 franchise, authorized partner and referral partner programs: fees, eligibility, commission, agreements and the application process.' },
  privacy: { path: '/partner-with-us/privacy-policy', title: 'Partnership Privacy Notice', seoTitle: 'Partnership Applicant Privacy Notice', seoDescription: 'How LAX360 Pvt Ltd handles the details you submit when you enquire about a franchise or partnership program.' },
  terms: { path: '/partner-with-us/terms-and-conditions', title: 'Partnership Terms and Conditions', seoTitle: 'Partnership Terms and Conditions', seoDescription: 'Terms that apply to LAX360 franchise and partnership enquiries, and how approved partnership terms are published.' },
}

// ------------------------------------------------------------------------------------------------ search-engine text for every partnership page
// One place for every partnership page's title and meta description, written by hand: the title head is at most 51 characters, so "<head> | LAX360 Pvt Ltd" fits the 68-character limit of fitTitle() and
// is never cut at a colon; the description is at most 158 characters and ends at a full stop. Every title and description is unique. Nothing here promises income, results, approval, placement or accreditation.
// (An administrator's SEO override in the admin panel still wins over these.)
const SEO = {
  'category:franchise': ['Franchise Opportunities in India', 'Explore LAX360 franchise opportunities in Education, Digital Marketing and IT & Software: how a franchise works, who can apply and how to start.'],
  'category:authorized-partner': ['Authorized Partner Program in India', 'Join the LAX360 Authorized Partner Program as a lead and sales support partner for Education, Digital Marketing and IT & Software. Agreement applies.'],
  'category:referral-partner': ['Referral Partner Program in India', 'Introduce customers to LAX360 as a referral partner for Education, Digital Marketing and IT & Software. Commission applies to eligible, converted referrals.'],
  'franchise/education': ['Education Franchise Opportunity in India', 'Open a LAX360 Education training centre: 53 IT certification courses, branding kit, academic and certification support and CRM, under a franchise agreement.'],
  'franchise/digital-marketing': ['Digital Marketing Franchise Opportunity', 'Operate an approved LAX360 digital marketing business: SEO, social media, paid ads, branding and lead generation. No results are guaranteed.'],
  'franchise/it': ['IT & Software Franchise Opportunity', 'Explore the LAX360 IT & Software franchise: software and SaaS sales, websites, apps, AI and automation, with branding, training, CRM and delivery support.'],
  'authorized-partner/education': ['Education Authorized Partner Program', 'Become a LAX360 Education Authorized Partner: college MoUs, training partnerships, workshops, internships and branding support, under an agreement.'],
  'authorized-partner/digital-marketing': ['Digital Marketing Authorized Partner Program', 'Become a LAX360 Digital Marketing Authorized Partner: offer SEO, social media, ads, websites and design to your clients, backed by our team.'],
  'authorized-partner/it': ['IT & Software Authorized Partner Program', 'Become a LAX360 IT & Software Authorized Partner: free registration, eligible commission, demos, quotations and a partner portal.'],
  'referral-partner/education': ['Education Referral Partner Program', 'Join the LAX360 Education Referral Partnership: refer students and colleges to IT certification courses, with tracking and commission under an agreement.'],
  'referral-partner/digital-marketing': ['Digital Marketing Referral Partner Program', 'Refer businesses that need digital marketing to LAX360 and earn a reward for every successful referral. We handle the consultation and delivery.'],
  'referral-partner/it': ['IT & Software Referral Partner Program', 'Join the LAX360 IT & Software Referral Partner programme: free registration, refer customers needing software or AI, and track eligible commission.'],
  'page:overview': ['Franchise & Partnership Opportunities in India', 'Partner with LAX360 Pvt Ltd: franchise, authorized partner and referral programs across Education, Digital Marketing and IT & Software. Apply online.'],
  'page:apply': ['Apply to Become a LAX360 Partner', 'Apply for a LAX360 franchise, authorized partner or referral partner program. An application is an enquiry; approval follows consultation and an agreement.'],
  'page:faq': ['Franchise & Partner Program FAQs', 'Answers about LAX360 franchise, authorized partner and referral partner programs: fees, eligibility, commission, agreements and applications.'],
}
for (const c of CATEGORIES) { const s = SEO[`category:${c.slug}`]; if (s) [c.seoTitle, c.seoDescription] = s }
for (const o of opportunities) { const s = SEO[o.slug]; if (s) [o.seoTitle, o.seoDescription] = s }
for (const k of ['overview', 'apply', 'faq']) [PARTNER_PAGES[k].seoTitle, PARTNER_PAGES[k].seoDescription] = SEO[`page:${k}`]
export const PARTNER_SEO = SEO

/** schema.org FAQPage for the questions that are visible on the page (never questions that are not shown). */
export const faqJsonLd = (items) => {
  const list = (items || []).filter((f) => (f.q || f.question) && (f.a || f.answer)).slice(0, 30)
  return list.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map((f) => ({ '@type': 'Question', name: f.q || f.question, acceptedAnswer: { '@type': 'Answer', text: f.a || f.answer } })) } : null
}

/** schema.org WebPage for a partnership page (the site's organization and its home are referenced, as on the opportunity pages). */
export const webPageLd = (name, description) => ({ '@context': 'https://schema.org', '@type': 'WebPage', name, description, isPartOf: { '@id': '__SITE__/#website' }, about: { '@type': 'Organization', name: 'LAX360 Pvt Ltd', url: '__SITE__/' } })
