// The stand-in cards of the home page "Services & industries" carousel, built from the website's own service and industry data. They are shown only until the server's content (managed in the admin
// panel under Services carousel) is available; from then on the administrator's cards are what visitors see.
import industries from './industries.json'
import { divisions } from './services.js'

const list = Array.isArray(industries) ? industries : Object.values(industries).find(Array.isArray) || []
const industry = (slug, title) => { const i = list.find((x) => x.slug === slug); return i && { id: `i-${slug}`, title, tag: 'Industry', text: i.summary, href: `/industries/${slug}`, label: 'Explore more', image: i.photo, alt: title } }
const service = (slug, title) => { const d = divisions.find((x) => x.slug === slug); return d && { id: `s-${slug}`, title, tag: 'Service', text: d.short, href: `/services/${slug}`, label: 'Explore more', image: d.photo, alt: title } }

export const builtInServiceCards = [
  service('software', 'IT & Software Development'), service('growth', 'Digital Marketing'), service('ai', 'AI & Automation'),
  { id: 's-education', title: 'Education & Training', tag: 'Service', text: 'Courses and workshops for students and professionals.', href: '/contact?type=course', label: 'Explore more', image: '/assets/services/education.webp', alt: 'Education & Training' },
  industry('construction-infrastructure', 'CAD & Engineering'), industry('healthcare-medical', 'Healthcare'), industry('banking-fintech', 'Finance & Business'), industry('retail-ecommerce', 'E-commerce'),
  service('mobile', 'Mobile & Business Apps'), industry('manufacturing-industrial', 'Manufacturing & Industrial'), industry('real-estate-property', 'Real Estate & Property'),
  industry('logistics-transportation', 'Logistics & Transportation'), industry('hospitality-tourism', 'Hospitality & Tourism'),
].filter(Boolean)
