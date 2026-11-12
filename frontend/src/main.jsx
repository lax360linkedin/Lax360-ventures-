import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LazyMotion } from 'framer-motion'
import App from './App.jsx'
import './styles/index.css'

const root = document.getElementById('root')

const app = (
  <StrictMode>
    {/* Animation features load in a separate chunk, keeping them off the critical path. */}
    <LazyMotion features={() => import('./motionFeatures.js').then((mod) => mod.default)}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LazyMotion>
  </StrictMode>
)

// Production pages are prerendered (scripts/prerender.js), so hydrate them; in dev the root is empty.
// Signed-in-only pages have no prerendered HTML (a host may serve its 404 shell there), so they render fresh.
// Each prerendered page names its route in `data-route`: hydrate only when that is the page being shown (the 404 shell, user pages, admin, CMS service pages and unknown
// URLs have no matching HTML and render fresh). This also keeps the whole route list (and every data file behind it) out of the first JavaScript download.
const clientOnly = root.dataset.route !== (window.location.pathname.replace(/\/+$/, '') || '/')
if (root.hasChildNodes() && !clientOnly) hydrateRoot(root, app)
else createRoot(root).render(app)
