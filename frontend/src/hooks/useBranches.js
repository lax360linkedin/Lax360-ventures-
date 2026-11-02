import { useEffect, useState } from 'react'
import { fetchBranches } from '../services/branchService.js'

let cache = null

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
