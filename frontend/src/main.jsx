import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { getLang, prefixOf, useLang } from './i18n/store.js'
import { loadDictionary } from './i18n/dictionary.js'
import { translateTree } from './i18n/translator.js'
import { LazyMotion } from 'framer-motion'
import App from './App.jsx'
import './styles/index.css'
import { connectConsent, trackOutboundClicks } from './utils/analytics.js'

const root = document.getElementById('root')

/** The router follows the language: /ta/... is the same website under the prefix /ta, so every link, route and navigation works unchanged. Switching language gives the router a new key and prefix
 *  (the page is re-rendered in place, nothing is downloaded again). */
function Root() {
  const lang = useLang()
  return (
    <BrowserRouter key={lang} basename={prefixOf(lang)}>
      <App />
    </BrowserRouter>
  )
}

const app = (
  <StrictMode>
    {/* Animation features load in a separate chunk, keeping them off the critical path. */}
    <LazyMotion features={() => import('./motionFeatures.js').then((mod) => mod.default)}>
      <Root />
    </LazyMotion>
  </StrictMode>
)

// Production pages are prerendered (scripts/prerender.js), so hydrate them; in dev the root is empty.
// Signed-in-only pages have no prerendered HTML (a host may serve its 404 shell there), so they render fresh.
// Each prerendered page names its route in `data-route`: hydrate only when that is the page being shown (the 404 shell, user pages, admin, CMS service pages and unknown
// URLs have no matching HTML and render fresh). This also keeps the whole route list (and every data file behind it) out of the first JavaScript download.
// A page in another language is rendered fresh as well (its prerendered HTML is already translated; React renders it again with the dictionary loaded first, so nothing flashes back to English).
const lang = getLang()
const clientOnly = lang !== 'en' || root.dataset.route !== (window.location.pathname.replace(/\/+$/, '') || '/')
const start = async () => {
  if (lang !== 'en') await loadDictionary(lang, () => translateTree(document.body)).catch(() => {})
  if (root.hasChildNodes() && !clientOnly) hydrateRoot(root, app)
  else createRoot(root).render(app)
}
start()

// Analytics (Google Tag Manager / GA4) loads only when its id is configured AND the visitor accepted analytics cookies in the cookie banner (utils/consent.js)
connectConsent()
trackOutboundClicks()
