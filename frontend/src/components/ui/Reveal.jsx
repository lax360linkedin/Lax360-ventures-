import { m, useReducedMotion } from 'framer-motion'

/** Fade/slide a block in once when it enters the viewport. Plain element under reduced motion. */
export default function Reveal({ as = 'div', delay = 0, y = 16, x = 0, className = '', children, ...rest }) {
  const reduce = useReducedMotion()
  const Tag = reduce ? as : m[as]
  if (reduce) return <Tag className={className} {...rest}>{children}</Tag>
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.4, delay, ease: [0.2, 0.8, 0.2, 1] }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
