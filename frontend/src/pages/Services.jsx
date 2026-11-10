import PageContainer from '../components/layout/PageContainer.jsx'
import ServicesHero from '../components/sections/services/ServicesHero.jsx'
import CategoryNav from '../components/sections/services/CategoryNav.jsx'
import ServiceCategories from '../components/sections/services/ServiceCategories.jsx'
import CmsServices from '../components/cms/CmsServices.jsx'
import ProcessTimeline from '../components/sections/ProcessTimeline.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Accordion from '../components/ui/Accordion.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { servicesFaq } from '../data/services.js'
import { useFaqs } from '../hooks/useSite.js'

/**
 * /services — the single entry point for everything we do. Hero with photo mosaic, sticky quick-access navigation,
 * six category sections in different layouts (Headless SaaS & API Solutions is the featured one), process, FAQ and a closing call to action.
 */
export default function Services() {
  const faqs = useFaqs('services', servicesFaq)
  return (
    <PageContainer
      path="/services"
      title="Services"
      description="Six service categories from LAX360 Pvt Ltd: software and IT services, AI and business automation, digital marketing, headless SaaS and API solutions, workflow automation and integration, and mobile and business applications."
    >
      <ServicesHero />
      <CategoryNav />
      <ServiceCategories />
      <CmsServices />
      <ProcessTimeline eyebrow="How we work" title="Every service follows the same four steps." />
      <section className="wrap section" aria-labelledby="faq-title">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <SectionHeading id="faq-title" className="lg:col-span-4" eyebrow="FAQ" title="Common" gradient="questions." />
          <div className="lg:col-span-8"><Accordion items={faqs} /></div>
        </div>
      </section>
      <section aria-labelledby="services-cta-title" className="wrap pb-16 md:pb-24">
        <Reveal>
          <div className="glass relative overflow-hidden p-8 text-center md:p-14">
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-0 size-72 rounded-full bg-primary/25 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 bottom-0 size-72 rounded-full bg-sky/20 blur-3xl" />
            <h2 id="services-cta-title" className="h2 relative">Have a Project <span className="text-gradient">in Mind?</span></h2>
            <p className="lead relative mx-auto mt-5 max-w-2xl text-soft">Tell us what you are planning to build. Our team can help you explore suitable technology and digital solutions based on your requirements.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button to="/contact?type=project" arrow>Start a Project</Button>
              <Button to="/contact" variant="secondary">Contact Us</Button>
            </div>
          </div>
        </Reveal>
      </section>
    </PageContainer>
  )
}
