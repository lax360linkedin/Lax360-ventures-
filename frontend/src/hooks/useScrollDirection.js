import { useEffect, useState } from 'react'

/**
 * Has the page been scrolled past `threshold` px? The state is a single boolean that changes only when the line is CROSSED, so the component that uses it re-renders
 * twice per visit instead of on every scroll frame (it used to hold the scroll position itself, which re-rendered the whole page shell, header and footer
 * included, for every frame of every scroll). The listener is passive and runs at most once per animation frame.
 */
export function useScrolledPast(threshold) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    let ticking = false
    const update = () => {
      ticking = false
      setPast(Math.max(window.scrollY, 0) > threshold) // React ignores a set to the same value: no render unless it flipped
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return past
}
