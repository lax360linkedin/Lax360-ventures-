import { useEffect, useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { Bot, Code2, DraftingCompass, Globe2, MessageCircle } from 'lucide-react'
import Button from '../ui/Button.jsx'
import BotHighlight from '../ui/BotHighlight.jsx'
import HeroVideo from './HeroVideo.jsx'
import HeroBackground from '../art/HeroBackground.jsx'
import { useMediaQuery } from '../../hooks/useMediaQuery.js'
import { useContent } from '../../hooks/useSite.js'
import { site } from '../../data/site.js'
import { whatsappLink } from '../../utils/whatsapp.js'

const WORDS = ['software', 'AI', 'growth', 'engineering', 'skills']
const chips = [
  { icon: Code2, label: 'Custom software' },
  { icon: Bot, label: 'AI automation' },
  { icon: Globe2, label: 'Web & mobile' },
  { icon: DraftingCompass, label: 'CAD & engineering' },
]

/** Button that is a router link for site paths and a normal link for full URLs (hero buttons can be edited in the admin panel). */
function CtaButton({ link, children, ...rest }) {
  return /^https?:/.test(link) ? <Button href={link} {...rest}>{children}</Button> : <Button to={link} {...rest}>{children}</Button>
}

/** Rotating keyword; the mini-bot beside it points at the word. Static on mobile and under reduced motion. */
function RotatingWord() {
  const reduce = useReducedMotion()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [i, setI] = useState(0)
  const animate = desktop && !reduce

  useEffect(() => {
    if (!animate) return undefined
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2400)
    return () => clearInterval(t)
  }, [animate])

  return (
    <p className="font-display text-3xl font-medium md:text-5xl">
      <span className="sr-only">for software, AI, growth, engineering and skills</span>
      <span aria-hidden="true" className="text-soft">for </span>
      <BotHighlight delay={1.9}>
      <span aria-hidden="true" className="relative inline-block">
        {animate ? (
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={WORDS[i]}
              className="text-gradient inline-block"
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {WORDS[i]}
            </m.span>
          </AnimatePresence>
        ) : (
          <span className="text-gradient">software</span>
        )}
      </span>
      </BotHighlight>
    </p>
  )
}

/**
 * Hero. Load sequence (all CSS, so it plays before hydration): header drops in → eyebrow → headline lines →
 * supporting text → CTAs → status chips. The content is centred over the scheduled background video (see HeroVideo); without a video the
 * built-in animated background shows instead.
 */
export default function Hero() {
  const hero = useContent('hero')?.[0]?.data || {} // published override from the admin panel, else the built-in text
  const lines = [hero.headline_1 || 'One team to build,', hero.headline_2 || 'automate and grow', hero.headline_3 || 'your business.']
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <HeroBackground />
      <HeroVideo />
      <div className="wrap relative flex min-h-[min(100svh,58rem)] items-center justify-center pb-16 pt-[116px] md:pt-[140px] lg:pb-24">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center [text-shadow:0_2px_24px_rgba(11,7,20,0.55)]">
          <p className="a-rise glass-flat inline-flex items-center gap-2.5 !rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lav" style={{ '--d': '0.25s' }}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(168,85,247,0.8)]" />
            Software · AI · Growth · Engineering · Academy
          </p>
          <h1 id="hero-title" className="h1 mt-7 !text-[clamp(2.5rem,6vw,5.75rem)]">
            {lines.map((line, n) => (
              <span key={line} className="a-rise block" style={{ '--d': `${0.35 + n * 0.12}s` }}>
                {n === 1 ? <span className="text-gradient">{line}</span> : line}
              </span>
            ))}
          </h1>
          <div className="a-rise mt-6" style={{ '--d': '0.8s' }}><RotatingWord /></div>
          <p className="a-rise lead mx-auto mt-8 text-fg/85" style={{ '--d': '0.95s' }}>
            {hero.lead || 'Custom software, AI automation, websites, apps, digital marketing and CAD engineering — planned, built and supported by LAX360 Ventures.'}
          </p>
          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <div className="a-rise w-full sm:w-auto" style={{ '--d': '1.1s' }}><CtaButton link={hero.cta_primary_link || '/contact?type=project'} arrow className="w-full sm:w-auto">{hero.cta_primary_label || 'Discuss Your Project'}</CtaButton></div>
            <div className="a-rise w-full sm:w-auto" style={{ '--d': '1.22s' }}><CtaButton link={hero.cta_secondary_link || '/solutions'} variant="secondary" className="w-full sm:w-auto">{hero.cta_secondary_label || 'Explore Our Solutions'}</CtaButton></div>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-2" aria-label="What we do">
            {chips.map(({ icon: Icon, label }, i) => (
              <li key={label} className="a-pop tag" style={{ '--d': `${1.35 + i * 0.1}s` }}>
                <Icon className="size-3.5 text-lav" aria-hidden="true" /> {label}
              </li>
            ))}
          </ul>
          <p className="a-fade mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-fg/80" style={{ '--d': '1.8s' }}>
            <span>{site.locations} — part of {site.legalEntity}</span>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold text-fg">
              <MessageCircle className="size-4" aria-hidden="true" /> Chat on WhatsApp
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
