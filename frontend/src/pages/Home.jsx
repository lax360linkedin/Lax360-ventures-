import { Fragment, lazy, Suspense } from 'react'
import PageContainer from '../components/layout/PageContainer.jsx'
import { useIntroState } from '../utils/welcomeIntro.js'
import { useHomeSections } from '../hooks/useSite.js'
import Hero from '../components/sections/Hero.jsx'
import Marquee from '../components/sections/Marquee.jsx'
import WhoWeAre from '../components/sections/WhoWeAre.jsx'
import OurServices from '../components/sections/OurServices.jsx'
import WhyChooseUs from '../components/sections/WhyChooseUs.jsx'
import OurClients from '../components/sections/OurClients.jsx'
import Testimonials from '../components/sections/Testimonials.jsx'
import AiSpotlight from '../components/sections/AiSpotlight.jsx'
import ProcessTimeline from '../components/sections/ProcessTimeline.jsx'
import FaqSection from '../components/sections/FaqSection.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'

// The built-in home page sections, in their default order. The admin panel can re-order and hide them (Website content > Home page sections).
const DEFAULT_ORDER = ['marquee', 'whoweare', 'services', 'outcomes', 'clients', 'testimonials', 'ai', 'process', 'faq', 'contact']
const SECTIONS = {
  marquee: <Marquee />, whoweare: <WhoWeAre />, services: <OurServices />, outcomes: <WhyChooseUs />, clients: <OurClients />, testimonials: <Testimonials />,
  ai: <AiSpotlight />, process: <ProcessTimeline />, faq: <FaqSection />, contact: <ContactCta />,
}

const WelcomeIntro = lazy(() => import('../components/intro/WelcomeIntro.jsx')) // separate chunk

export default function Home() {
  const intro = useIntroState()
  const order = useHomeSections(DEFAULT_ORDER)
  // Testimonials and Team are intentionally not rendered: there is no verified content for them yet.
  return (
    <PageContainer
      path="/"
      title={null}
      description="One team to build, automate and grow your business. Custom software, AI automation, digital marketing, CAD engineering and training from LAX360 Ventures."
    >
      {(intro === 'pending' || intro === 'playing' || intro === 'revealing') && <Suspense fallback={null}><WelcomeIntro /></Suspense>}
      <Hero />
      {order.map((key) => <Fragment key={key}>{SECTIONS[key]}</Fragment>)}
    </PageContainer>
  )
}
