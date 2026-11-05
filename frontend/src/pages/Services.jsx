import PageContainer from '../components/layout/PageContainer.jsx'
import ServicesHero from '../components/sections/services/ServicesHero.jsx'
import CategoryNav from '../components/sections/services/CategoryNav.jsx'
import ServiceCategories from '../components/sections/services/ServiceCategories.jsx'
import CmsServices from '../components/cms/CmsServices.jsx'
import ProcessTimeline from '../components/sections/ProcessTimeline.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Accordion from '../components/ui/Accordion.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { servicesFaq } from '../data/services.js'
import { useFaqs } from '../hooks/useSite.js'

/**
 * /services — the single entry point for everything we do. Hero with orbit, sticky category navigation,
 * six category sections in varied layouts (each links to its detail page / anchor), process, FAQ and an enquiry CTA.
 */
export default function Services() {
  const faqs = useFaqs('services', servicesFaq)
  return (
    <PageContainer
      path="/services"
      title="Services"
      description="Software development, AI and business automation, websites and mobile apps, digital marketing, CAD engineering and training from LAX360 Ventures."
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
      <ContactCta title="Discuss your requirements." />
    </PageContainer>
  )
}
