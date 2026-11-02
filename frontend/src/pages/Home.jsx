import { lazy, Suspense } from 'react'
import PageContainer from '../components/layout/PageContainer.jsx'
import { useIntroState } from '../utils/welcomeIntro.js'
import Hero from '../components/sections/Hero.jsx'
import Marquee from '../components/sections/Marquee.jsx'
import Positioning from '../components/sections/Positioning.jsx'
import ServicesBento from '../components/sections/ServicesBento.jsx'
import Outcomes from '../components/sections/Outcomes.jsx'
import SolutionsStrip from '../components/sections/SolutionsStrip.jsx'
import TechStack from '../components/sections/TechStack.jsx'
import ConceptStack from '../components/sections/ConceptStack.jsx'
import AiSpotlight from '../components/sections/AiSpotlight.jsx'
import ProcessTimeline from '../components/sections/ProcessTimeline.jsx'
import WhyUs from '../components/sections/WhyUs.jsx'
import AcademyBand from '../components/sections/AcademyBand.jsx'
import FaqSection from '../components/sections/FaqSection.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'

const WelcomeIntro = lazy(() => import('../components/intro/WelcomeIntro.jsx')) // separate chunk

export default function Home() {
  const intro = useIntroState()
  // Testimonials and Team are intentionally not rendered: there is no verified content for them yet.
  return (
    <PageContainer
      path="/"
      title={null}
      description="One team to build, automate and grow your business. Custom software, AI automation, digital marketing, CAD engineering and training from LAX360 Ventures."
    >
      {(intro === 'pending' || intro === 'playing' || intro === 'revealing') && <Suspense fallback={null}><WelcomeIntro /></Suspense>}
      <Hero />
      <Marquee />
      <Positioning />
      <ServicesBento />
      <Outcomes />
      <SolutionsStrip />
      <TechStack />
      <ConceptStack />
      <AiSpotlight />
      <ProcessTimeline />
      <WhyUs />
      <AcademyBand />
      <FaqSection />
      <ContactCta />
    </PageContainer>
  )
}
