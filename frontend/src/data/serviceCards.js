// The stand-in cards of the home page "Services & industries" carousel, built from the website's own service and industry data. They are shown only until the server's content (managed in the admin
// panel under Services carousel) is available; from then on the administrator's cards are what visitors see.
import { divisionUrl } from '../utils/slugify.js'
import industries from './industries.json'
import { divisions } from './services.js'

const list = Array.isArray(industries) ? industries : Object.values(industries).find(Array.isArray) || []
const industry = (slug, title) => { const i = list.find((x) => x.slug === slug); return i && { id: `i-${slug}`, title, tag: 'Industry', text: i.summary, href: `/industries/${slug}`, label: 'Explore more', image: i.photo, alt: title } }
const service = (slug, title, text) => { const d = divisions.find((x) => x.slug === slug); return d && { id: `s-${slug}`, title, tag: 'Service', text, href: `/services/${divisionUrl(slug)}`, label: 'Explore more', image: d.photo, alt: title } }

export const builtInServiceCards = [
  service('software', 'IT & Software Development', 'Websites, web and mobile apps, CRM and ERP, and business systems built around how your team actually works.'), service('growth', 'Digital Marketing', 'Social media, search and ad campaigns, and content that bring you more of the right customers.'), service('ai', 'AI & Automation', 'Chatbots, AI assistants and automated workflows that take repetitive work off your team.'),
  { id: 's-education', title: 'Education & Training', tag: 'Service', text: 'Technical training, certification courses, internships and workshops for students, professionals, colleges and companies.', href: '/services/education', label: 'Explore more', image: '/assets/services/education.webp', alt: 'Education & Training' },
  industry('healthcare-medical', 'Healthcare'), industry('banking-fintech', 'Finance & Business'), industry('retail-ecommerce', 'E-commerce'),
  industry('manufacturing-industrial', 'Manufacturing & Industrial'), industry('real-estate-property', 'Real Estate & Property'),
  industry('logistics-transportation', 'Logistics & Transportation'), industry('hospitality-tourism', 'Hospitality & Tourism'),
].filter(Boolean)
