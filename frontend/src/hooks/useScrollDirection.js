import { useEffect, useState } from 'react'

/** Tracks scroll position and direction for the hide-on-scroll header. */
export function useScrollDirection(threshold = 8) {
  const [state, setState] = useState({ y: 0, direction: 'up' })

  useEffect(() => {
    let last = window.scrollY
    let ticking = false
    const update = () => {
      const y = Math.max(window.scrollY, 0)
      if (Math.abs(y - last) >= threshold) {
        setState({ y, direction: y > last ? 'down' : 'up' })
        last = y
      } else {
        setState((s) => (s.y === y ? s : { ...s, y }))
      }
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return state
}
