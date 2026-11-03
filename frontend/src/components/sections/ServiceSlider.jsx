import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const INTERVAL = 4200 // ms each slide stays
const SWIPE_MIN = 40

// One slide per service. Photos are free-licence images from Unsplash (see public/assets/services/CREDITS.md), cropped to 1000x800 WebP.
const slides = [
  { id: 'software', title: 'Software Development & IT Services', text: 'Custom software, CRM, ERP, websites and apps.', photo: '/assets/services/software.webp' },
  { id: 'ai', title: 'AI & Business Automation', text: 'Assistants and workflows that remove manual work.', photo: '/assets/services/ai.webp' },
  { id: 'marketing', title: 'Digital Marketing', text: 'Search, social and performance campaigns.', photo: '/assets/services/marketing.webp' },
  { id: 'headless', title: 'Headless SaaS', text: 'One API powering web, mobile and more.', photo: '/assets/services/headless.webp' },
  { id: 'civil', title: 'Civil Engineering CAD', text: 'Drafting and drawing support for construction work.', photo: '/assets/services/civil.webp' },
  { id: 'mechanical', title: 'Mechanical Engineering CAD', text: '2D drawings and 3D models for parts and assemblies.', photo: '/assets/services/mechanical.webp' },
  { id: 'education', title: 'Technology Education & Training', text: 'Courses and workshops for students and professionals.', photo: '/assets/services/education.webp' },
]

/** Auto-advancing photo slider of the services (cross-fade with a gentle slide and zoom). Pauses on hover, focus and while the tab is hidden;
 *  swipe, dots and arrow keys also work. Under reduced motion it does not auto-advance. */
export default function ServiceSlider() {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const touch = useRef(null)
  const n = slides.length
  const go = useCallback((k) => setI(((k % n) + n) % n), [n])

  useEffect(() => {
    if (reduce || paused) return undefined
    const t = setInterval(() => { if (!document.hidden) setI((k) => (k + 1) % n) }, INTERVAL)
    return () => clearInterval(t)
  }, [reduce, paused, n])

  const down = (e) => { touch.current = e.clientX }
  const up = (e) => {
    if (touch.current == null) return
    const dx = e.clientX - touch.current
    touch.current = null
    if (Math.abs(dx) >= SWIPE_MIN) go(i + (dx < 0 ? 1 : -1))
  }
  const key = (e) => { if (e.key === 'ArrowRight') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1) }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Our services"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={(e) => { if (e.target.matches(':focus-visible')) setPaused(true) }}
      onBlur={() => setPaused(false)}
      onKeyDown={key}
      tabIndex={0}
    >
      <div
        className="relative aspect-[4/3.4] w-full select-none overflow-hidden rounded-[2rem] border border-edge-strong bg-glass shadow-[0_0_70px_-28px_rgba(124,58,237,0.9)] backdrop-blur-xl focus-visible:outline-2 focus-visible:outline-lav"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={() => { touch.current = null }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.28),transparent_60%),radial-gradient(circle_at_80%_90%,rgba(59,130,246,0.18),transparent_55%)]" />
        {slides.map((s, k) => (
          <figure
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${k + 1} of ${n}: ${s.title}`}
            aria-hidden={k !== i}
            className={`absolute inset-0 m-0 flex flex-col transition-[opacity,transform] duration-[900ms] ease-signal motion-reduce:transition-none ${k === i ? 'translate-x-0 scale-100 opacity-100' : `pointer-events-none opacity-0 ${k < i ? '-translate-x-6' : 'translate-x-6'} scale-[1.03]`}`}
          >
            <img src={s.photo} alt="" width="1000" height="800" loading={k === 0 ? 'eager' : 'lazy'} decoding="async" draggable="false" className="absolute inset-0 h-full w-full object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0b0714] via-[#0b0714]/55 to-[#0b0714]/10" />
            <figcaption className="relative mt-auto px-6 pb-16 text-center sm:px-8 sm:pb-[4.5rem]">
              <p className="font-display text-lg font-semibold text-white sm:text-xl">{s.title}</p>
              <p className="mt-1 text-sm text-white/80">{s.text}</p>
            </figcaption>
          </figure>
        ))}
        <div className="absolute inset-x-0 bottom-9 z-10 flex justify-center gap-2" role="tablist" aria-label="Choose a service">
          {slides.map((s, k) => (
            <button key={s.id} type="button" role="tab" aria-selected={k === i} aria-label={s.title} onClick={() => go(k)}
              className={`relative h-2 rounded-full transition-all duration-300 after:absolute after:-inset-2 after:content-[''] ${k === i ? 'w-8 bg-white' : 'w-2 bg-white/60 hover:bg-white/90'} shadow-[0_0_0_1px_rgba(11,7,20,0.35)]`} />
          ))}
        </div>
      </div>
    </div>
  )
}
