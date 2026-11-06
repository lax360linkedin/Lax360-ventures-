// Verified, client-approved case studies go in `projects`. The planning document says the
// Work section stays hidden until at least 3 exist, so this list is intentionally empty.
//
// Project shape:
// { slug, title, division: 'software'|'ai'|'growth', clientType, summary,
//   problem, built, stack: [], results: [] /* verified only */, image }
export const projects = []

// Until real projects exist, the Work page shows clearly labelled *illustrative concepts*
// (not client work) so visitors can see what each division can build.
export const concepts = [
  { id: 'c1', division: 'software', title: 'Order & billing workspace', text: 'Orders, invoices and stock in one internal web app.' },
  { id: 'c2', division: 'software', title: 'Service request portal', text: 'Customers raise requests; staff track them to completion.' },
  { id: 'c3', division: 'ai', title: 'Enquiry assistant', text: 'Drafts replies from approved information for staff to approve.' },
  { id: 'c4', division: 'ai', title: 'Document sorting workflow', text: 'Reads incoming documents and routes them to the right team.' },
  { id: 'c5', division: 'growth', title: 'Website + launch campaign', text: 'A new site paired with search and social activity.' },
]
