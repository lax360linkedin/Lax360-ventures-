import { Link } from 'react-router-dom'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHero from '../components/sections/PageHero.jsx'
import DivisionArt from '../components/art/DivisionArt.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import { solutions } from '../data/solutions.js'

export default function Solutions() {
  return (
    <PageContainer
      path="/solutions"
      title="Solutions"
      description="CRM and sales management, ERP, AI assistants and custom business applications from LAX360 Ventures — packaged as answers to common business problems."
    >
      <PageHero
        eyebrow="Solutions"
        title="Business problems, packaged as solutions."
        art={<DivisionArt id="software" className="h-auto w-full" />}
        lead="Four starting points for non-technical owners. Each is scoped to your business — we don't sell one-size-fits-all products."
      />

      <nav aria-label="Solutions" className="border-b border-edge">
        <ul className="wrap flex gap-6 overflow-x-auto py-3 text-base font-semibold">
          {solutions.map((s) => (
            <li key={s.id} className="shrink-0"><a href={`#${s.id}`} className="link-underline inline-flex min-h-11 items-center">{s.title}</a></li>
          ))}
        </ul>
      </nav>

      {solutions.map((s, i) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className={`border-b border-edge ${i % 2 ? 'bg-glass' : ''}`}>
          <div className="wrap section grid gap-10 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-5">
              <p className="font-display text-6xl font-semibold leading-none text-lav md:text-7xl">0{i + 1}</p>
              <h2 id={`${s.id}-title`} className="h2 mt-6">{s.title}</h2>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button to={`/contact?type=${s.enquiryType}`} arrow>Enquire about this</Button>
                <Button to={`/services/${s.division}`} variant="secondary">View division</Button>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-7">
              <dl className="divide-y divide-edge border-y border-edge">
                <div className="grid gap-1 py-5 md:grid-cols-[10rem_1fr] md:gap-6"><dt className="eyebrow pt-1 text-lav">The problem</dt><dd>{s.problem}</dd></div>
                <div className="grid gap-1 py-5 md:grid-cols-[10rem_1fr] md:gap-6"><dt className="eyebrow pt-1 text-lav">Intended users</dt><dd>{s.forWho}</dd></div>
                <div className="grid gap-1 py-5 md:grid-cols-[10rem_1fr] md:gap-6">
                  <dt className="eyebrow pt-1 text-lav">What can be included</dt>
                  <dd><ul className="flex flex-wrap gap-2">{s.included.map((x) => <li key={x} className="tag !text-base">{x}</li>)}</ul></dd>
                </div>
                <div className="grid gap-1 py-5 md:grid-cols-[10rem_1fr] md:gap-6"><dt className="eyebrow pt-1 text-lav">Potential value</dt><dd>{s.value}</dd></div>
              </dl>
            </Reveal>
          </div>
        </section>
      ))}

      <section className="wrap section">
        <p className="max-w-2xl text-soft">
          Solutions are built on our <Link to="/services" className="font-semibold text-lav underline">services</Link>. We don&apos;t quote performance figures — the value depends on your process, and we&apos;ll discuss what&apos;s realistic during discovery.
        </p>
      </section>

      <ContactCta />
    </PageContainer>
  )
}
