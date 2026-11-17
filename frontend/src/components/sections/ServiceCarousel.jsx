import { Link } from 'react-router-dom'
import { ArrowUpRight, Pause, Play } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading.jsx'
import useDriftStrip from '../../hooks/useDriftStrip.js'
import { useServiceCarousel } from '../../hooks/useServiceCarousel.js'

const isExternal = (href) => /^https?:\/\//i.test(href)

/** One card: a background picture, the title, a short description and an optional Explore more button. The whole card lifts, its picture zooms and a light sweeps across on hover / focus. */
export function ServiceCard({ card, hidden = false, onImage }) {
  const external = isExternal(card.href)
  const cta = card.href && (
    external
      ? <a href={card.href} target="_blank" rel="noopener noreferrer" draggable="false" tabIndex={hidden ? -1 : undefined} className="sc-cta">{card.label}<ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
      : <Link to={card.href} draggable="false" tabIndex={hidden ? -1 : undefined} className="sc-cta">{card.label}<ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> about {card.title}</span></Link>
  )
  return (
    <article className="sc-card group">
      <img src={card.image} alt={hidden ? '' : card.alt} width="1000" height="800" loading="lazy" decoding="async" draggable="false" onLoad={onImage} className="sc-img" />
      <span aria-hidden="true" className="sc-shade" />
      <span aria-hidden="true" className="sc-shine" />
      {card.tag && <span className="sc-tag">{card.tag}</span>}
      <div className="sc-body">
        <h3 className="font-display text-xl font-semibold leading-tight text-white sm:text-2xl">{card.title}</h3>
        {card.text && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/85">{card.text}</p>}
        {cta}
      </div>
    </article>
  )
}

/**
 * "Services & industries": an auto-scrolling strip of cards directly below the home header (above the welcome sections). It drifts from right to left by itself, shows part of the next card so it is clear
 * there is more, and the visitor can swipe, drag, scroll sideways or use the arrow keys; it pauses while hovered, focused or touched and resumes by itself (see hooks/useDriftStrip.js). There is always
 * a Pause button, and with reduced motion it does not drift. Cards, order, on/off, speed and heading come from the admin panel (Services carousel).
 */
export default function ServiceCarousel() {
  const { items, config } = useServiceCarousel()
  const strip = useDriftStrip({ count: items.length, speed: config.speed, scroll: config.scroll, pauseOnHover: config.pauseOnHover, gap: 20 })
  if (!config.enabled || !items.length) return null
  const { box, track, sets, looping, reduce, paused, setPaused, measure, boxProps } = strip
  const copies = Array.from({ length: sets }, (_, i) => i)
  const label = `${config.title} ${config.accent}`.trim() || 'Services and industries'
  return (
    <section id="service-carousel" aria-labelledby="service-carousel-title" className="relative overflow-hidden border-b border-edge py-12 md:py-16">
      {(config.title || config.accent || config.eyebrow) && (
        <div className="wrap">
          <SectionHeading id="service-carousel-title" eyebrow={config.eyebrow || undefined} title={config.title} gradient={config.accent || undefined} lead={config.lead || undefined} center />
        </div>
      )}
      <div ref={box} role="region" aria-roledescription="carousel" aria-label={`${label}: use the left and right arrow keys, or swipe or drag`} tabIndex={0} {...boxProps}
        className="sc-strip mt-8 cursor-grab select-none overflow-hidden active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lav md:mt-10" style={{ touchAction: 'pan-y' }}>
        <ul ref={track} className={`flex w-max items-stretch gap-5 will-change-transform ${looping ? '' : 'mx-auto'}`} style={{ backfaceVisibility: 'hidden' }}>
          {copies.flatMap((c) => items.map((card) => (
            <li key={`${c}-${card.id}`} aria-hidden={c > 0 || undefined} className="shrink-0"><ServiceCard card={card} hidden={c > 0} onImage={measure} /></li>
          )))}
        </ul>
      </div>
      {!reduce && looping && config.scroll && (
        <div className="wrap mt-5 flex justify-end">
          <button type="button" onClick={() => setPaused((v) => !v)} aria-pressed={paused} aria-label={paused ? 'Resume the automatic scrolling of the cards' : 'Pause the automatic scrolling of the cards'}
            className="inline-flex size-10 items-center justify-center rounded-full border border-edge-strong bg-glass text-fg transition-colors hover:border-lav hover:bg-glass-strong">
            {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
          </button>
        </div>
      )}
    </section>
  )
}
