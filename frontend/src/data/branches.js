// Single source of truth for LAX360 Ventures branch locations and branch phone numbers. Everything that mentions offices
// (hero, footer, About, Contact, Career, Our Network, chatbot demo, structured data) reads from here.
// These are the official details supplied by LAX360 Ventures. The same details are stored in the database (branches table, migration 0010),
// so keep both in step when they change.
const mapUrl = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

export const branches = [
  {
    id: 'salem',
    city: 'Salem',
    name: 'LAX360 Ventures — Salem Branch',
    address: ['1st Floor, 16, CPS Tower', 'Advaitha Ashram Road, Fairlands', 'Salem, Tamil Nadu – 636004'],
    phone: '+91 95666 79928',
    tel: '+919566679928',
    mapUrl: mapUrl('1st Floor, 16, CPS Tower, Advaitha Ashram Road, Fairlands, Salem, Tamil Nadu 636004'),
  },
  {
    id: 'bangalore',
    city: 'Bangalore',
    name: 'LAX360 Ventures — Bangalore Branch',
    address: ['472/7, 20th L Cross Road', 'AVS Layout, Koramangala', 'Bengaluru, Karnataka – 560034'],
    phone: '+91 95666 79928',
    tel: '+919566679928',
    mapUrl: mapUrl('472/7, 20th L Cross Road, AVS Layout, Koramangala, Bengaluru, Karnataka 560034'),
  },
  {
    id: 'mumbai',
    city: 'Mumbai',
    name: 'LAX360 Ventures — Mumbai Branch',
    address: ['Level 4, Dynasty Business Park', 'Andheri–Kurla Road, A-Wing, J. B. Nagar', 'Andheri East, Mumbai, Maharashtra – 400059'],
    phone: '+91 95666 05272',
    tel: '+919566605272',
    mapUrl: mapUrl('Level 4, Dynasty Business Park, Andheri-Kurla Road, A-Wing, J. B. Nagar, Andheri East, Mumbai, Maharashtra 400059'),
  },
]

export const branchCities = branches.map((b) => b.city)
/** "Salem · Bangalore · Mumbai" */
export const branchLine = branchCities.join(' · ')
/** "Salem, Bangalore and Mumbai" */
export const branchSentence = `${branchCities.slice(0, -1).join(', ')} and ${branchCities.at(-1)}`
