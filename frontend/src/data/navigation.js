import { site } from './site.js'

// Primary header links. "Work" only appears once real projects are published (site.workIsLive).
// Header order is fixed: About → Services → Products → Industries → Insights → Our Network → Our Team → Careers → Contact.
// (Work stays reachable from Services, the footer and the home page.)
export const primaryNav = [
  { label: 'About', to: '/about' },
  { label: 'Services', to: '/services' },
  { label: 'Products', to: '/products' },
  { label: 'Industries', to: '/industries' },
  { label: 'Insights', to: '/insights' },
  { label: 'Our Network', to: '/our-network' },
  { label: 'Our Team', to: '/our-team' },
  { label: 'Careers', to: '/career' },
  { label: 'Contact', to: '/contact' },
]

export const footerColumns = [
  {
    title: 'Our Services',
    links: [
      { label: 'Software & IT Services', to: '/services/software' },
      { label: 'AI & Business Automation', to: '/services/ai' },
      { label: 'Digital Marketing', to: '/services/growth' },
      { label: 'Headless SaaS & API Solutions', to: '/services/headless' },
      { label: 'Workflow Automation & Integration', to: '/services/automation' },
      { label: 'Mobile & Business Applications', to: '/services/mobile' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Services overview', to: '/services' },
      { label: 'Products', to: '/products' },
      { label: 'Industries', to: '/industries' },
      { label: 'Insights', to: '/insights' },
      { label: 'Our Network', to: '/our-network' },
      { label: 'Our Team', to: '/our-team' },
      { label: 'Work', to: '/work' },
      { label: 'Careers', to: '/career' },
      { label: 'Contact', to: '/contact' },
    ],
  },
]

export const legalLinks = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Use', to: '/terms' },
]

// Enquiry types shared by the contact form, CTAs (?type=) and the chatbot.
export const enquiryTypes = [
  { id: 'project', label: 'Software project' },
  { id: 'ai', label: 'AI consultation' },
  { id: 'website-app', label: 'Website or app' },
  { id: 'marketing', label: 'Digital marketing' },
  { id: 'course', label: 'Course enquiry' },
  { id: 'workshop', label: 'College workshop' },
  { id: 'partnership', label: 'Partnership' },
  { id: 'career', label: 'Careers' },
  { id: 'general', label: 'Something else' },
]
