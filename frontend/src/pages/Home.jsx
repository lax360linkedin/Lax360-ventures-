import { Fragment, lazy, Suspense, useEffect, useState } from 'react'
import PageContainer from '../components/layout/PageContainer.jsx'
import { openWelcomeExperience, useIntroState, useWelcomePlan } from '../utils/welcomeIntro.js'
import { useContentReady, useHomeSections } from '../hooks/useSite.js'
import { useAuth } from '../hooks/useAuth.js'
import Hero from '../components/sections/Hero.jsx'
import ServiceCarousel from '../components/sections/ServiceCarousel.jsx'
import Marquee from '../components/sections/Marquee.jsx'
import WhoWeAre from '../components/sections/WhoWeAre.jsx'
import VisionMission from '../components/sections/VisionMission.jsx'
import OurServices from '../components/sections/OurServices.jsx'
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
  marquee: <Marquee />, whoweare: <WhoWeAre />, purpose: <VisionMission />, services: <OurServices />, outcomes: <WhyChooseUs />, testimonials: <Testimonials />, gallery: <ImageCarousel />, clients: <OurClients />,
  process: <ProcessWorkflow />, faq: <FaqSection />, contact: <ContactCta />,
}

const WelcomeIntro = lazy(() => import('../components/intro/WelcomeIntro.jsx')) // separate chunk

const WelcomeCards = lazy(() => import('../components/sections/WelcomeCards.jsx')) // separate chunk: the welcome cards section, directly below the home header
const WelcomeContactCard = lazy(() => import('../components/sections/WelcomeContactCard.jsx')) // separate chunk: the optional contact card shown after the intro
let contactOffered = false // once per page load: coming back to Home by navigating inside the site does not offer it again
const cardsRoom = <div aria-hidden="true" style={{ height: 'calc(100dvh - var(--header-bottom, 0px))', minHeight: '34rem' }} /> // reserves the section's height while its code loads, so nothing jumps

export default function Home() {
  const intro = useIntroState()
  const order = useHomeSections(DEFAULT_ORDER)
  const contentReady = useContentReady()
  const welcome = useWelcomePlan()
  const { user, loading: authLoading } = useAuth()
  const [contactOpen, setContactOpen] = useState(false)
  const [thanks, setThanks] = useState(false)
  // The flow of a visit: intro animation, then the OPTIONAL contact card (fill it in or skip), then the home page with the welcome cards below its header. The card is offered right after the intro
  // on every page load (or at once when there is no animation); never for a signed-in customer or an admin preview.
  useEffect(() => {
    if ((intro !== 'done' && intro !== 'off') || authLoading || user || contactOffered || new URLSearchParams(window.location.search).get('welcome') === 'preview') return undefined
    contactOffered = true
    setContactOpen(true) // immediately: no waiting period after the intro animation
    return undefined
  }, [intro, user, authLoading])
  const closeContact = (result) => { // Skip, close, Esc or a submitted form: the card goes at once and the home page is shown from its top
    setContactOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (result?.sent) { setThanks(true); window.setTimeout(() => setThanks(false), 4500) }
  }
  // /?welcome=preview (the admin panel's "Preview the experience" button) opens the cards straight away, ignoring the on/off switches
  useEffect(() => {
    if (contentReady && new URLSearchParams(window.location.search).get('welcome') === 'preview') openWelcomeExperience({ preview: true })
  }, [contentReady])
  // Testimonials and Team are intentionally not rendered: there is no verified content for them yet.
  return (
    <PageContainer
      path="/"
      title={null}
      description="One team to build, automate and grow your business. Custom software, AI automation, digital marketing and training from LAX360 Pvt Ltd."
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
