// Single source of truth for LAX360 Ventures branch locations. Everything that mentions offices
// (hero, footer, About, Contact, Career, chatbot demo, structured data) reads from here.
//
// Only the Salem street address exists in the project data (copied from lax360.in, still marked
// [Confirm] in the planning document). Bangalore and Mumbai have NO confirmed address, so none is
// shown — add an `address` array to those entries once the real details are supplied.
export const branches = [
  {
    id: 'salem',
    city: 'Salem',
    name: 'LAX360 Ventures — Salem Branch',
    address: ['LAX360 Pvt Ltd', '1st Floor, 16, CPS Tower', 'Advaitha Ashram Rd, Fairlands', 'Salem, Tamil Nadu 636007'],
  },
  { id: 'bangalore', city: 'Bangalore', name: 'LAX360 Ventures — Bangalore Branch' },
  { id: 'mumbai', city: 'Mumbai', name: 'LAX360 Ventures — Mumbai Branch' },
]

export const branchCities = branches.map((b) => b.city)
/** "Salem · Bangalore · Mumbai" */
export const branchLine = branchCities.join(' · ')
/** "Salem, Bangalore and Mumbai" */
export const branchSentence = `${branchCities.slice(0, -1).join(', ')} and ${branchCities.at(-1)}`
