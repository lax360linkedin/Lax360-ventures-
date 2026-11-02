import { m, useReducedMotion } from 'framer-motion'
import { useDocumentHead } from '../../hooks/useDocumentHead.js'

/** Wraps every page: sets the document head and applies a subtle entrance. */
export default function PageContainer({ title, description, path, jsonLd, noindex, children }) {
  const reduce = useReducedMotion()
  useDocumentHead({ title, description, path, jsonLd, noindex })
  return (
    <m.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </m.div>
  )
}
