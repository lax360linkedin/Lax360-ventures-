import { useEffect, useRef, useState } from 'react'

/** Renders its children only once the placeholder is near the viewport, so panels that load data (leaderboard, achievements, challenges) do not hit the API until a visitor scrolls to them. */
export default function LazyMount({ children, minHeight = 240, margin = '300px' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (shown || !ref.current) return undefined
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect() } }, { rootMargin: margin })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [shown, margin])
  return shown ? children : <div ref={ref} style={{ minHeight }} aria-hidden="true" />
}
