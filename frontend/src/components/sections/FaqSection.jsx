import { Link } from 'react-router-dom'
import SectionHeading from '../ui/SectionHeading.jsx'
import Accordion from '../ui/Accordion.jsx'
import { servicesFaq } from '../../data/services.js'
import { useFaqs } from '../../hooks/useSite.js'

export default function FaqSection() {
  const faqs = useFaqs('home', servicesFaq)
  return (
    <section aria-labelledby="faq-home-title" className="wrap section">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <SectionHeading id="faq-home-title" eyebrow="FAQ" title="Common" gradient="questions." />
          <p className="mt-6 max-w-sm text-soft">
            Something else on your mind? <Link to="/contact" className="link-underline font-semibold text-lav">Ask the team</Link>.
          </p>
        </div>
        <div className="lg:col-span-8"><Accordion items={faqs} /></div>
      </div>
    </section>
  )
}
