import { m, useReducedMotion } from 'framer-motion'

/**
 * Motion for the Contact page. Everything animates only `transform` and `opacity` (cheap on the GPU), runs once as the block scrolls into view, uses one shared easing
 * (a soft deceleration) and is a plain element under `prefers-reduced-motion`. `Rise` is a drop-in for `Reveal` (same props); `Stagger` / `StaggerItem` reveal a list one item after another.
 */
const EASE = [0.16, 1, 0.3, 1]
const VIEW = { once: true, margin: '0px 0px -8% 0px' }

export function Rise({ as = 'div', delay = 0, y = 26, x = 0, scale = 1, className = '', children, ...rest }) {
  const reduce = useReducedMotion()
  const Tag = reduce ? as : m[as]
  if (reduce) return <Tag className={className} {...rest}>{children}</Tag>
  return (
    <Tag className={className} initial={{ opacity: 0, y, x, scale }} whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }} viewport={VIEW} transition={{ duration: 0.8, delay, ease: EASE }} {...rest}>
      {children}
    </Tag>
  )
}

const container = (gap, delay) => ({ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } })
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } } }

export function Stagger({ as = 'ul', gap = 0.09, delay = 0, className = '', children, ...rest }) {
  const reduce = useReducedMotion()
  const Tag = reduce ? as : m[as]
  if (reduce) return <Tag className={className} {...rest}>{children}</Tag>
  return <Tag className={className} variants={container(gap, delay)} initial="hidden" whileInView="show" viewport={VIEW} {...rest}>{children}</Tag>
}

export function StaggerItem({ as = 'li', className = '', children, ...rest }) {
  const reduce = useReducedMotion()
  const Tag = reduce ? as : m[as]
  if (reduce) return <Tag className={className} {...rest}>{children}</Tag>
  return <Tag className={className} variants={item} {...rest}>{children}</Tag>
}
