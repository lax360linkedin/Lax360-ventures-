import { Fragment, lazy, Suspense, useEffect, useState } from 'react'
import PageContainer from '../components/layout/PageContainer.jsx'
import { openWelcomeExperience, useIntroState, useWelcomePlan } from '../utils/welcomeIntro.js'
import { useContent, useContentReady, useHomeSections } from '../hooks/useSite.js'
import { useHomeFaq } from '../hooks/useCmsPages.js'
import { useLang } from '../i18n/store.js'
import { tr } from '../i18n/translator.js'
import { useAuth } from '../hooks/useAuth.js'
import Hero from '../components/sections/Hero.jsx'
import ServiceCarousel from '../components/sections/ServiceCarousel.jsx'
import Marquee from '../components/sections/Marquee.jsx'
import WhoWeAre from '../components/sections/WhoWeAre.jsx'
import VisionMission from '../components/sections/VisionMission.jsx'
import OurServices from '../components/sections/OurServices.jsx'
import UpcomingServicesSection from '../components/upcoming/UpcomingUI.jsx'
import WhyChooseUs from '../components/sections/WhyChooseUs.jsx'
import OurClients from '../components/sections/OurClients.jsx'
import ImageCarousel from '../components/sections/ImageCarousel.jsx'
import Testimonials from '../components/sections/Testimonials.jsx'
import ProcessWorkflow from '../components/sections/ProcessWorkflow.jsx'
import FaqSection from '../components/sections/FaqSection.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'

// The built-in home page sections, in their default order. The admin panel can re-order and hide them (Website content > Home page sections).
const DEFAULT_ORDER = ['marquee', 'whoweare', 'purpose', 'services', 'outcomes', 'clients', 'gallery', 'testimonials', 'process', 'faq', 'contact']
const SECTIONS = {
  marquee: <Marquee />, whoweare: <WhoWeAre />, purpose: <VisionMission />, services: <><OurServices /><UpcomingServicesSection home /></>, outcomes: <WhyChooseUs />, testimonials: <Testimonials />, gallery: <ImageCarousel />, clients: <OurClients />,
  process: <ProcessWorkflow />, faq: <FaqSection />, contact: <ContactCta />,
}

const WelcomeIntro = lazy(() => import('../components/intro/WelcomeIntro.jsx')) // separate chunk

const WelcomeCards = lazy(() => import('../components/sections/WelcomeCards.jsx')) // separate chunk: the welcome cards section, directly below the home header
const WelcomeContactCard = lazy(() => import('../components/sections/WelcomeContactCard.jsx')) // separate chunk: the optional contact card shown after the intro
// The intro contact card is offered ONCE per browsing session: after the first intro animation, never again on the Home button, in-site navigation, a return to the homepage or a refresh.
// The session (this tab, until it is closed) is tracked in sessionStorage; the module variable covers browsers that block storage (then it is once per page load).
const CONTACT_KEY = 'lax360-intro-contact-offered'
let contactOffered = false
const contactSeen = () => { if (contactOffered) return true; try { return sessionStorage.getItem(CONTACT_KEY) === '1' } catch { return false } }
const markContactSeen = () => { contactOffered = true; try { sessionStorage.setItem(CONTACT_KEY, '1') } catch { /* storage blocked: the module variable still holds for this page load */ } }
const cardsRoom = <div aria-hidden="true" style={{ height: 'calc(100dvh - var(--header-bottom, 0px))', minHeight: '34rem' }} /> // reserves the section's height while its code loads, so nothing jumps

export default function Home() {
  const intro = useIntroState()
  const order = useHomeSections(DEFAULT_ORDER)
  const contentReady = useContentReady()
  const welcome = useWelcomePlan()
  const { user, loading: authLoading } = useAuth()
  const welcomePage = useContent('welcome_page')?.[0]?.data || {}
  const contactOn = welcomePage.contact_card_enabled !== false // admin panel: Welcome Experience settings
  const [contactOpen, setContactOpen] = useState(false)
  const [thanks, setThanks] = useState(false)
  // The flow of a visit: intro animation, then the OPTIONAL contact card (fill it in or skip), then the home page with the welcome cards below its header. The card is offered right after the intro
  // on every page load (or at once when there is no animation); never for a signed-in customer or an admin preview.
  useEffect(() => {
    if ((intro !== 'done' && intro !== 'off') || authLoading || !contentReady || user || !contactOn || contactSeen() || new URLSearchParams(window.location.search).get('welcome') === 'preview') return undefined
    markContactSeen()
    setContactOpen(true) // immediately: no waiting period after the intro animation
    return undefined
  }, [intro, user, authLoading, contactOn, contentReady])
  const closeContact = (result) => { // Skip, close, Esc or a submitted form: the card goes at once and the home page is shown from its top
    setContactOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (result?.sent) { setThanks(true); window.setTimeout(() => setThanks(false), 4500) }
  }
  // /?welcome=preview (the admin panel's "Preview the experience" button) opens the cards straight away, ignoring the on/off switches
  useEffect(() => {
    if (contentReady && new URLSearchParams(window.location.search).get('welcome') === 'preview') openWelcomeExperience({ preview: true })
  }, [contentReady])
  // FAQPage structured data for the home FAQ (voice search): only the questions that are visible when the page opens (the first category), with the same text, in the visitor's language.
  const lang = useLang()
  const T = (x) => (lang === 'en' ? x : tr(x))
  const faq = useHomeFaq()
  const first = faq.categories[0]
  const shown = !order.includes('faq') ? [] : faq.items.filter((x) => (first?.slug ? x.category === first.slug : !x.category)).filter((x) => x.q && x.a)
  const jsonLd = shown.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: shown.map((f) => ({ '@type': 'Question', name: T(f.q), acceptedAnswer: { '@type': 'Answer', text: T(f.a) } })) } : null
  // Testimonials and Team are intentionally not rendered: there is no verified content for them yet.
  return (
    <PageContainer
      path="/"
      title={null}
      description="Custom software, AI automation, digital marketing and training from LAX360 Pvt Ltd. One team in Salem, Bangalore and Mumbai to build and grow your business."
      jsonLd={jsonLd}
    >
      {(intro === 'pending' || intro === 'playing' || intro === 'revealing') && <Suspense fallback={null}><WelcomeIntro /></Suspense>}
      <Hero />
      <ServiceCarousel />{/* services & industries: directly below the header, above the welcome sections */}
      {contactOpen && <Suspense fallback={null}><WelcomeContactCard open={contactOpen} onClose={closeContact} /></Suspense>}
      {thanks && <div role="status" className="fixed inset-x-4 bottom-24 z-[1200] mx-auto max-w-sm rounded-2xl border border-edge-strong bg-night/95 px-5 py-3 text-center text-sm font-semibold shadow-2xl backdrop-blur lg:bottom-8">Thank you! We have received your details and will get back to you.</div>}
      {welcome && <Suspense fallback={cardsRoom}><WelcomeCards plan={welcome} /></Suspense>}
      {order.map((key) => <Fragment key={key}>{SECTIONS[key]}</Fragment>)}
    </PageContainer>
  )
}
