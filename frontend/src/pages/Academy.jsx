import { useState } from 'react'
import { Clock, Users } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHero from '../components/sections/PageHero.jsx'
import DivisionArt from '../components/art/DivisionArt.jsx'
import EnquiryForm from '../components/sections/EnquiryForm.jsx'
import Accordion from '../components/ui/Accordion.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { academyFaq, courseCategories, courses } from '../data/courses.js'
import { useFaqs } from '../hooks/useSite.js'

export default function Academy() {
  const faqs = useFaqs('academy', academyFaq)
  const [category, setCategory] = useState('all')
  const visible = category === 'all' ? courses : courses.filter((c) => c.category === category)

  return (
    <PageContainer
      path="/training"
      title="Academy — Training & Workshops"
      description="Workshops for colleges and courses for professionals from LAX360 Ventures, including AI Tools & Prompt Engineering, a 3-Day Hands-on AI Workshop and Python with AI."
    >
      <PageHero
        eyebrow="Academy"
        title="Learn the skills we use every day."
        art={<DivisionArt id="training" className="h-auto w-full" />}
        lead="Workshops for colleges and courses for professionals — including AI tools and prompt engineering. Practical, hands-on, and taught by the team that builds with these tools."
      >
        <Button href="#enquire" arrow>Enquire about a course</Button>
        <Button to="/contact?type=workshop" variant="secondary">Invite us to your college</Button>
      </PageHero>

      <section className="wrap section" aria-labelledby="courses-title">
        <SectionHeading id="courses-title" eyebrow="Courses & workshops" title="What we teach." lead="Fees, schedules and certificate details are shared when you enquire." />

        <div role="group" aria-label="Filter by category" className="mt-10 flex flex-wrap gap-2">
          {[{ id: 'all', name: 'All' }, ...courseCategories].map((c) => (
            <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className={`min-h-11 rounded-full border px-5 text-sm font-semibold ${category === c.id ? 'border-edge-strong bg-base2 text-fg' : 'border-edge bg-glass hover:border-edge-strong'}`}>
              {c.name}
            </button>
          ))}
        </div>

        <ul className="mt-10 grid gap-6 lg:grid-cols-3">
          {visible.map((c, i) => (
            <Reveal as="li" key={c.slug} delay={i * 0.06}>
              <article id={c.slug} className="flex h-full flex-col rounded-xl border border-edge bg-glass p-6 md:p-8">
                <p className="eyebrow text-lav">{c.format}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold leading-tight">{c.title}</h3>
                <p className="mt-1 text-base text-soft">{c.subtitle}</p>
                <p className="mt-4 text-base">{c.summary}</p>
                <dl className="mt-5 space-y-2 text-sm text-soft">
                  <div className="flex gap-2"><dt className="sr-only">Duration</dt><Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><dd>{c.duration}</dd></div>
                  <div className="flex gap-2"><dt className="sr-only">Audience</dt><Users className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><dd>{c.audience}</dd></div>
                </dl>
                <details className="group mt-5 border-t border-edge pt-4">
                  <summary className="min-h-11 cursor-pointer font-semibold text-lav">What it covers</summary>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base">
                    {c.topics.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </details>
                <div className="mt-auto pt-6">
                  <Button to={`/contact?type=${c.enquiryType}&course=${c.slug}`} variant="secondary" className="w-full">Enquire</Button>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="border-y border-edge bg-glass" aria-labelledby="workshops-title">
        <div className="wrap section grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 id="workshops-title" className="h2">Workshops for colleges.</h2>
            <p className="mt-5 text-soft">We run hands-on workshops for students — from a half-day introduction to AI tools and prompt engineering to a three-day programme that ends with student project presentations.</p>
            <div className="mt-8"><Button to="/contact?type=workshop" arrow>Invite us to your college</Button></div>
          </div>
          <div className="lg:col-span-7">
            <h3 className="h3">Our training approach</h3>
            <ol className="mt-6 divide-y divide-edge border-y border-edge">
              {['Concept explained with a real-world example', 'Live demonstration of the tool or technique', 'Guided hands-on activity', 'Student mini-project or practical', 'Discussion and feedback'].map((t, i) => (
                <li key={t} className="flex gap-5 py-4"><span className="font-display font-semibold text-lav">0{i + 1}</span>{t}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="wrap section grid gap-10 lg:grid-cols-12" aria-labelledby="faq-title">
        <SectionHeading id="faq-title" className="lg:col-span-4" eyebrow="FAQ" title="Training questions." />
        <div className="lg:col-span-8"><Accordion items={faqs} /></div>
      </section>

      <section id="enquire" className="on-ink bg-base2 text-fg" aria-labelledby="enquire-title">
        <div className="wrap section grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4 text-soft">Course enquiry</p>
            <h2 id="enquire-title" className="h2">Tell us what you&apos;d like to learn.</h2>
            <p className="lead mt-5 text-soft">Share your name and the programme you&apos;re interested in, and the team will follow up with details.</p>
          </div>
          <div className="lg:col-span-7"><EnquiryForm tone="dark" idPrefix="acad" defaultType="course" source="academy" /></div>
        </div>
      </section>
    </PageContainer>
  )
}
