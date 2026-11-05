// Single source of truth for company facts. Items marked [Confirm] in the planning
// document are listed in `needsConfirmation` so they are easy to find and replace.
import { branches, branchLine } from './branches.js'

export const site = {
  name: 'LAX360 Ventures',
  legalEntity: 'LAX360 Pvt Ltd',
  // [Confirm] exact footer wording
  legalLine: 'LAX360 Ventures is a brand of LAX360 Pvt Ltd.',
  tagline: '360° Execution',
  locations: branchLine, // Salem · Bangalore · Mumbai (see data/branches.js)
  branches,
  email: 'lax360tech@gmail.com', // [Confirm] a domain email for Ventures is recommended
  // Official branch phone numbers (see data/branches.js for the full address of each branch).
  phones: [
    { display: '+91 95666 79928', tel: '+919566679928', label: 'Salem & Bangalore' },
    { display: '+91 95666 05272', tel: '+919566605272', label: 'Mumbai' },
  ],
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || '919566679928',
  // Handles come from the planning document; Facebook has no confirmed handle so it is omitted.
  social: [
    { label: 'Instagram', href: 'https://www.instagram.com/lax360pvtltd' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/lax360-pvt-ltd' },
    { label: 'X', href: 'https://x.com/lax360tech' },
  ],
  responseTime: null, // [Confirm] e.g. "within 1 business day" — not shown until approved
  // Flip to true only when 3+ approved case studies exist (see data/projects.js).
  workIsLive: false,
}

export const needsConfirmation = [
  'Footer legal wording (brand of LAX360 Pvt Ltd)',
  'Domain email for LAX360 Ventures',
  'Social URLs (Instagram, LinkedIn, X) and the Facebook handle',
  'Business hours and response-time promise',
  'Digital marketing and CAD scope',
  'Course mode, duration and public fees',
  'The "What you can expect" commitments and the "Where we can come in" examples',
  'Mascot ownership / commercial licence',
]
