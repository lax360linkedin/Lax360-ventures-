import { useDocumentHead } from '../../hooks/useDocumentHead.js'

/** Wraps every page: sets the document head and applies a subtle entrance. The entrance is a CSS animation (.page-enter): the framer-motion version rendered the whole prerendered page with
 *  opacity 0 until the JavaScript had downloaded and run, which delayed the first and largest paint of every page by the time it took to load the scripts. */
export default function PageContainer({ title, description, path, jsonLd, noindex, ogType, image, keywords, children }) {
  useDocumentHead({ title, description, path, jsonLd, noindex, ogType, image, keywords })
  return <div className="page-enter">{children}</div>
}
