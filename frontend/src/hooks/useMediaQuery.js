import { useEffect, useState } from 'react'

/**
 * Starts as `false` on both the server and the first client render so prerendered HTML hydrates
 * without a mismatch; the real value is applied right after mount.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}
