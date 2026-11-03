import { Fragment, lazy, Suspense } from 'react'
import PageContainer from '../components/layout/PageContainer.jsx'
import { useIntroState } from '../utils/welcomeIntro.js'
import { useHomeSections } from '../hooks/useSite.js'
import Hero from '../components/sections/Hero.jsx'
import Marquee from '../components/sections/Marquee.jsx'
import WhoWeAre from '../components/sections/WhoWeAre.jsx'
import ServicesBento from '../components/sections/ServicesBento.jsx'
import Outcomes from '../components/sections/Outcomes.jsx'
import TechStack from '../components/sections/TechStack.jsx'
import ConceptStack from '../components/sections/ConceptStack.jsx'
import AiSpotlight from '../components/sections/AiSpotlight.jsx'
import ProcessTimeline from '../components/sections/ProcessTimeline.jsx'
import WhyUs from '../components/sections/WhyUs.jsx'
import FaqSection from '../components/sections/FaqSection.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'

// The built-in home page sections, in their default order. The admin panel can re-order and hide them (Website content > Home page sections).
const DEFAULT_ORDER = ['marquee', 'whoweare', 'services', 'outcomes', 'tech', 'concept', 'ai', 'process', 'why', 'faq', 'contact']
const SECTIONS = {
  marquee: <Marquee />, whoweare: <WhoWeAre />, services: <ServicesBento />, outcomes: <Outcomes />, tech: <TechStack />,
  concept: <ConceptStack />, ai: <AiSpotlight />, process: <ProcessTimeline />, why: <WhyUs />, faq: <FaqSection />, contact: <ContactCta />,
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
