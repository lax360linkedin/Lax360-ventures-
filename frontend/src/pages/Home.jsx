import { Fragment, lazy, Suspense, useEffect } from 'react'
import PageContainer from '../components/layout/PageContainer.jsx'
import { openWelcomeExperience, useIntroState } from '../utils/welcomeIntro.js'
import { useContentReady, useHomeSections } from '../hooks/useSite.js'
import Hero from '../components/sections/Hero.jsx'
import Marquee from '../components/sections/Marquee.jsx'
import WhoWeAre from '../components/sections/WhoWeAre.jsx'
import OurServices from '../components/sections/OurServices.jsx'
import WhyChooseUs from '../components/sections/WhyChooseUs.jsx'
import OurClients from '../components/sections/OurClients.jsx'
import ImageCarousel from '../components/sections/ImageCarousel.jsx'
import Testimonials from '../components/sections/Testimonials.jsx'
import ProcessWorkflow from '../components/sections/ProcessWorkflow.jsx'
import FaqSection from '../components/sections/FaqSection.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'

// The built-in home page sections, in their default order. The admin panel can re-order and hide them (Website content > Home page sections).
const DEFAULT_ORDER = ['marquee', 'whoweare', 'services', 'outcomes', 'clients', 'gallery', 'testimonials', 'process', 'faq', 'contact']
const SECTIONS = {
  marquee: <Marquee />, whoweare: <WhoWeAre />, services: <OurServices />, outcomes: <WhyChooseUs />, testimonials: <Testimonials />, gallery: <ImageCarousel />, clients: <OurClients />,
  process: <ProcessWorkflow />, faq: <FaqSection />, contact: <ContactCta />,
}

const WelcomeIntro = lazy(() => import('../components/intro/WelcomeIntro.jsx')) // separate chunk

const WelcomeExperience = lazy(() => import('../components/intro/WelcomeExperience.jsx')) // separate chunk: the 7-card welcome experience
const cardsCover = <div aria-hidden="true" className="fixed inset-0 z-[1000]" style={{ background: 'rgba(8,8,14,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />

export default function Home() {
  const intro = useIntroState()
  const order = useHomeSections(DEFAULT_ORDER)
  const contentReady = useContentReady()
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
      {intro === 'cards' && <Suspense fallback={cardsCover}><WelcomeExperience /></Suspense>}
      <Hero />
      {order.map((key) => <Fragment key={key}>{SECTIONS[key]}</Fragment>)}
    </PageContainer>
  )
}
