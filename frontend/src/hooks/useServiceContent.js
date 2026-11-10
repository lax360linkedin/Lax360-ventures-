import { useEffect, useState } from 'react'
import { api } from '../services/apiClient.js'

const EMPTY = { clients: [], testimonials: [] }
const cache = new Map() // url -> { at, data }; short-lived so a published change shows up within seconds
const TTL = 10_000

/**
 * Clients and testimonials for one service page, filtered by the backend through the service hierarchy:
 * a main service page (`sub` omitted) gets everything assigned to the main service or any of its sub-services; a sub-service page gets what is assigned
 * to that sub-service plus what is assigned to its main service as a whole. Returns empty lists while loading or if the API is unreachable.
 */
export function useServiceContent(category, sub) {
  const url = `/api/public/services/${encodeURIComponent(category)}${sub ? `/${encodeURIComponent(sub)}` : ''}/content`
  const [data, setData] = useState(() => cache.get(url)?.data || EMPTY)
  useEffect(() => {
    let live = true
    const hit = cache.get(url)
    if (hit && Date.now() - hit.at < TTL) { setData(hit.data); return undefined }
    api(url).then((r) => {
      const next = { clients: r.clients || [], testimonials: r.testimonials || [] }
      cache.set(url, { at: Date.now(), data: next })
      if (live) setData(next)
    }).catch(() => { if (live) setData(cache.get(url)?.data || EMPTY) })
    return () => { live = false }
  }, [url])
  return data
}
