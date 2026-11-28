import { useEffect, useMemo } from 'react'
import { BUILTIN_MENU, loadPartnerMenu, usePartnerContent, usePartnerMenu } from '../services/partnershipService.js'
import { useUpcoming } from './useUpcoming.js'
import { STATUSES, isLive } from '../data/upcomingServices.js'

/** Built-in divisions are shown with their full business names in the forms (the menu labels are shorter). */
const BUILTIN_NAMES = { education: 'Education & Training', 'digital-marketing': 'Digital Marketing', it: 'IT & Software' }

/**
 * The business divisions a visitor can choose in any partnership form, in one list that follows the admin panel:
 *   - the divisions of the Partner With Us menu (the three built-in ones plus any an administrator added; switched-off ones are left out),
 *   - the upcoming service categories (Artificial Intelligence, IoT / Embedded Systems & Robotics, CAD Designing & Training, Blockchain & Web 3.0, and any added), each with its status (Coming Soon, Under Development, ...).
 * Returns [{ slug, label, upcoming, status, statusLabel }]. "All Business Divisions" and "Others" are added by the picker itself.
 */
export function usePartnerDivisions() {
  const { categories } = usePartnerMenu()
  const data = usePartnerContent()
  const upcoming = useUpcoming()
  useEffect(() => { loadPartnerMenu() }, []) // the live menu, so a division added, renamed or switched off in the admin panel shows up here
  return useMemo(() => {
    const menu = data?.menu || categories || BUILTIN_MENU
    const seen = new Map()
    for (const c of menu) for (const it of c.items || []) if (!seen.has(it.slug)) seen.set(it.slug, it.label)
    const base = [...seen].map(([slug, label]) => ({ slug, label: BUILTIN_NAMES[slug] || label, upcoming: false, status: '', statusLabel: '' }))
    const soon = upcoming.map((c) => ({ slug: c.slug, label: c.short, upcoming: !isLive(c.status), status: c.status, statusLabel: isLive(c.status) ? '' : STATUSES[c.status]?.label || '' }))
    return [...base, ...soon.filter((u) => !seen.has(u.slug))]
  }, [categories, data, upcoming])
}
