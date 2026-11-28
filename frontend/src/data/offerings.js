import { divisions, getDivision as builtinDivision } from './services.js'
import { getServiceDetail } from './serviceDetails.js'

const builtinOrigin = (serviceSlug) => { for (const d of divisions) { const o = d.offerings.find((x) => x.slug === serviceSlug); if (o) return o.origin || d.slug } return null }

/** An individual service with its category, its detail copy and the photo to show (its own, else the category's).
 *  Kept apart from services.js so the long per-service copy is only downloaded with the service pages, not with the home page.
 *  `getDivision` is the lookup of useDivisionTools() (the divisions as managed in the admin panel); the built-in divisions are used when it is not given.
 *  Detail text entered in the admin panel wins; whatever is empty comes from the built-in copy. */
export const getOffering = (categorySlug, serviceSlug, getDivision = builtinDivision) => {
  const d = getDivision(categorySlug)
  const o = d?.offerings.find((x) => x.slug === serviceSlug)
  if (!o) return null
  const detail = getServiceDetail(o.origin || builtinOrigin(serviceSlug) || d.slug, serviceSlug) || {}
  const own = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
  const blank = { intro: o.text || '', about: [], offers: [], solves: [], features: [], benefits: [], uses: [] } // a sub-service created in the admin panel may leave any of these empty
  return { ...blank, ...detail, ...own, category: d, photo: o.photo || detail.photo || d.photo }
}
