import { useEffect, useState } from 'react'

export const categoryLinks = [
  { id: 'software', label: 'Software' },
  { id: 'ai', label: 'AI & Automation' },
  { id: 'web-mobile', label: 'Web & Mobile' },
  { id: 'growth', label: 'Digital Marketing' },
  { id: 'engineering', label: 'CAD & Engineering' },
]

/** Smooth-scroll to a section (instant under reduced motion) and keep the URL hash in sync. */
export function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  window.history.replaceState(null, '', `#${id}`)
}

/**
 * Sticky pill navigation for the page's sections. The section in view is highlighted
 * (IntersectionObserver); on small screens the bar scrolls horizontally.
 */
export default function CategoryNav() {
  const [active, setActive] = useState(null)

  useEffect(() => {
    const els = categoryLinks.map((c) => document.getElementById(c.id)).filter(Boolean)
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-35% 0px -55% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Keep the active pill visible in the horizontal scroller on small screens.
  useEffect(() => {
    document.querySelector('[data-cat-pill][aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [active])

  return (
    <nav aria-label="Service categories" className="sticky top-[72px] z-30 lg:top-[92px] border-b border-edge bg-night/70 backdrop-blur-xl">
      <ul className="wrap no-scrollbar flex gap-2 overflow-x-auto py-3">
        {categoryLinks.map((c) => (
          <li key={c.id} className="shrink-0">
            <a
              href={`#${c.id}`}
              data-cat-pill
              aria-current={active === c.id ? 'true' : undefined}
              onClick={(e) => { e.preventDefault(); scrollToSection(c.id) }}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ${active === c.id ? 'border-lav bg-primary/40 text-white' : 'border-edge bg-glass text-soft hover:border-edge-strong hover:text-fg'}`}
            >
              {c.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
