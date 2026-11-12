import { divisions } from './services.js'
import { getServiceDetail } from './serviceDetails.js'

/** An individual service with its category, its detail copy and the photo to show (its own, else the category's).
 *  Kept apart from services.js so the long per-service copy is only downloaded with the service pages, not with the home page. */
export const getOffering = (categorySlug, serviceSlug) => {
  const d = divisions.find((x) => x.slug === categorySlug)
  const o = d?.offerings.find((x) => x.slug === serviceSlug)
  if (!o) return null
  const detail = getServiceDetail(categorySlug, serviceSlug) || {}
  return { ...o, ...detail, category: d, photo: detail.photo || d.photo }
}
