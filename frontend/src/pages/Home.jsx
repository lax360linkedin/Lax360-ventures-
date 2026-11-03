import { Fragment, lazy, Suspense } from 'react'
import PageContainer from '../components/layout/PageContainer.jsx'
import { useIntroState } from '../utils/welcomeIntro.js'
import { useHomeSections } from '../hooks/useSite.js'
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

// The built-in home page sections, in their default order. The admin panel can re-order and hide them (Website content > Home page sections).
const DEFAULT_ORDER = ['marquee', 'positioning', 'services', 'outcomes', 'solutions', 'tech', 'concept', 'ai', 'process', 'why', 'academy', 'faq', 'contact']
const SECTIONS = {
  marquee: <Marquee />, positioning: <Positioning />, services: <ServicesBento />, outcomes: <Outcomes />, solutions: <SolutionsStrip />, tech: <TechStack />,
  concept: <ConceptStack />, ai: <AiSpotlight />, process: <ProcessTimeline />, why: <WhyUs />, academy: <AcademyBand />, faq: <FaqSection />, contact: <ContactCta />,
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
