import { useEffect, useState } from 'react'
import { fetchBranches } from '../services/branchService.js'
import { branches as staticBranches } from '../data/branches.js'
import { mapOpenUrl } from '../utils/mapEmbed.js'
import { phoneList } from '../utils/phones.js'

let cache = null

/** The branches for DISPLAY (cards, maps): the database's published branches as { id, city, name, address (lines), phone, tel, mapUrl, embed }. While the list is loading, or if the backend cannot be
 *  reached, the built-in list (data/branches.js) is shown instead so the page is never empty; once the backend has answered, ONLY its branches are shown (so a branch the administrator added, edited,
 *  disabled or deleted is exactly what visitors see). */
export function useBranchDirectory() {
  const [state, setState] = useState(() => ({ list: cache, failed: false }))
  useEffect(() => {
    if (cache) return undefined
    let alive = true
    fetchBranches().then((list) => { cache = list; if (alive) setState({ list, failed: false }) }).catch(() => { if (alive) setState({ list: null, failed: true }) })
    return () => { alive = false }
  }, [])
  if (!state.list) return { branches: staticBranches, live: false }
  const place = (b) => [...(b.address_lines || []), b.city].join(', ')
  return {
    live: true,
    branches: state.list.map((b) => ({
      id: b.slug, city: b.city, name: b.name, address: b.address_lines?.length ? b.address_lines : null, phone: b.phone, phones: phoneList(b.phone), tel: phoneList(b.phone)[0]?.tel || null, embed: b.map_embed_url || null,
      mapUrl: mapOpenUrl(b.map_embed_url, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place(b))}`), // the branch's saved Google Maps location when it has one, else a search for its address
    })),
  }
}

/** Branch list from the backend. `branches` is [] until loaded or if the backend is unreachable (the forms still work without it). */
export function useBranches() {
  const [branches, setBranches] = useState(cache || [])
  useEffect(() => {
    if (cache) return undefined
    let alive = true
    fetchBranches().then((list) => { cache = list; if (alive) setBranches(list) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return branches
}
