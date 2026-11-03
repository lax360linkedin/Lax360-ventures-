import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import MobileMenu from './MobileMenu.jsx'
import MobileBottomBar from './MobileBottomBar.jsx'
import WhatsAppFloat from './WhatsAppFloat.jsx'
import { useScrollDirection } from '../../hooks/useScrollDirection.js'
import PreviewBanner from '../cms/PreviewBanner.jsx'
import { useSite, useSiteSettings } from '../../hooks/useSite.js'

// Loaded after the page itself / on first use, so they never compete with first paint.
const ChatWidget = lazy(() => import('../chatbot/ChatWidget.jsx'))
const EnquiryModal = lazy(() => import('./EnquiryModal.jsx'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return undefined
    }
    // The target may live in a lazy page that has not mounted yet, so wait for it (up to ~3s).
    let frame
    let tries = 0
    const seek = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) el.scrollIntoView()
      else if (tries++ < 180) frame = requestAnimationFrame(seek)
    }
    seek()
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])
  return null
}

/** Shown to visitors instead of the site while an administrator has switched maintenance mode on. */
function Maintenance({ message }) {
  const site = useSite()
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        <h1 className="h2">We&apos;ll be right back</h1>
        <p className="mt-4 text-soft">{message || 'The website is undergoing scheduled maintenance. Please check back shortly.'}</p>
        <p className="mt-6 text-sm text-soft">Urgent? <a className="font-semibold text-fg underline" href={`mailto:${site.email}`}>{site.email}</a></p>
      </div>
    </main>
  )
}

export default function RootLayout() {
  const settings = useSiteSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const [enquiryOpen, setEnquiryOpen] = useState(false)
  const [enquiryEverOpened, setEnquiryEverOpened] = useState(false)
  const menuButtonRef = useRef(null)
  const { y } = useScrollDirection()
  const { pathname } = useLocation()
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const openEnquiry = useCallback(() => { setEnquiryEverOpened(true); setEnquiryOpen(true) }, [])
  const closeEnquiry = useCallback(() => setEnquiryOpen(false), [])
  const [chatReady, setChatReady] = useState(false)
  const favicon = settings.site_favicon_url
  useEffect(() => { // a favicon chosen in the admin panel replaces the built-in one
    if (!favicon) return
    const el = document.head.querySelector('link[rel="icon"]') || Object.assign(document.createElement('link'), { rel: 'icon' })
    el.setAttribute('href', favicon)
    if (!el.isConnected) document.head.appendChild(el)
  }, [favicon])

  useEffect(() => closeMenu(), [pathname, closeMenu])
  useEffect(() => {
    const t = window.requestIdleCallback ? window.requestIdleCallback(() => setChatReady(true)) : setTimeout(() => setChatReady(true), 800)
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(t) : clearTimeout(t))
  }, [])
  // Any CTA can open the enquiry dialog with: window.dispatchEvent(new CustomEvent('lax360:open-enquiry'))
  useEffect(() => {
    window.addEventListener('lax360:open-enquiry', openEnquiry)
    return () => window.removeEventListener('lax360:open-enquiry', openEnquiry)
  }, [openEnquiry])

  const barVisible = y > 500
  if (settings.maintenance_mode === true) return <Maintenance message={settings.maintenance_message} />

  return (
    <>
      <a href="#main" className="fixed left-4 top-2 z-[70] -translate-y-20 rounded-full bg-primary px-5 py-3 font-semibold text-white focus:translate-y-0">
        Skip to content
      </a>
      <ScrollToTop />
      <Header onOpenMenu={() => setMenuOpen(true)} menuButtonRef={menuButtonRef} />
      <MobileMenu open={menuOpen} onClose={closeMenu} returnFocusRef={menuButtonRef} />
      {/* The home hero is full-bleed under a transparent header; every other page clears the header. */}
      <main id="main" tabIndex={-1} className={`outline-none ${pathname === '/' ? '' : 'pt-[72px] lg:pt-[92px]'}`}>
        {/* Suspense lives inside the layout so header and footer stay on screen while a page chunk loads. */}
        <Suspense fallback={<div className="wrap section min-h-screen" role="status"><p className="text-soft">Loading…</p></div>}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <MobileBottomBar visible={barVisible} />
      <PreviewBanner />
      <WhatsAppFloat />
      {chatReady && settings.chatbot_enabled !== false && (
        <Suspense fallback={null}>
          <ChatWidget raised={barVisible} suppressed={menuOpen || enquiryOpen} />
        </Suspense>
      )}
      {enquiryEverOpened && (
        <Suspense fallback={null}>
          <EnquiryModal open={enquiryOpen} onClose={closeEnquiry} />
        </Suspense>
      )}
    </>
  )
}
