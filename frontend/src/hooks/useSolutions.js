import { useEffect, useState } from 'react'
import { api } from '../services/apiClient.js'
import { builtinIndex } from '../data/solutions.js'

/**
 * The solutions portfolio (cards + categories). The built-in list is used at once (and when the page is prerendered); once the portfolio has been moved to the database the list from
 * `/api/public/solutions` replaces it, so everything an administrator adds, edits, moves, hides or deletes in Admin > Services > Solutions is what visitors see.
 * One request per page load, shared by every component.
 */
let pending = null
let cached = null
const load = () => {
  if (cached) return Promise.resolve(cached)
  if (!pending) pending = api('/api/public/solutions').then((r) => { cached = r; return r }).catch(() => { pending = null; return null })
  return pending
}

export function useSolutionIndex() {
  const [remote, setRemote] = useState(cached)
  useEffect(() => {
    let alive = true
    load().then((r) => { if (alive && r) setRemote(r) })
    return () => { alive = false }
  }, [])
  if (remote?.migrated) return { migrated: true, categories: remote.categories, solutions: remote.solutions }
  return { migrated: false, categories: builtinIndex.categories, solutions: builtinIndex.solutions }
}

/** Does a card's solution have a page of its own in the database list (when migrated) or in the built-in list? */
export const hasSolution = (index, slug) => index.solutions.some((s) => s.slug === slug)

/** Full record of one solution from the database (null while loading or when the database does not have it). */
export function useSolutionRemote(slug) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let alive = true
    setData(null)
    api(`/api/public/solutions/${slug}`).then((r) => { if (alive) setData(r) }).catch(() => {})
    return () => { alive = false }
  }, [slug])
  return data
}
