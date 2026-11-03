import { Check } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHero from '../components/sections/PageHero.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import DivisionArt from '../components/art/DivisionArt.jsx'
import { useIndustries } from '../hooks/useCmsPages.js'

/** Industries LAX360 Ventures builds technology for: image, short description and the solutions we provide for each. Managed in the admin panel. */
export default function Industries() {
  const industries = useIndustries()
  return (
    <PageContainer
      path="/industries"
      title="Industries"
      description="The industries LAX360 Ventures builds technology for — manufacturing, retail, healthcare, education, logistics, construction, finance and hospitality — and the solutions we provide for each."
    >
      <PageHero
        eyebrow="Industries"
        title="Technology built around your industry."
        art={<DivisionArt id="software" className="h-auto w-full" />}
        lead="Every sector has its own workflows. Here is where we work and the solutions we provide, from software and AI to digital growth and CAD."
      />

      <section className="wrap section" aria-labelledby="industries-title">
        <h2 id="industries-title" className="sr-only">Industries we serve</h2>
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {industries.map((ind, i) => (
            <Reveal as="li" key={ind.slug} delay={(i % 3) * 0.07}>
              <article id={ind.slug} className="glass-flat lift group flex h-full scroll-mt-32 flex-col overflow-hidden">
                {ind.image && <img src={ind.image} alt={ind.imageAlt || ''} width="1000" height="700" loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-2xl font-semibold">{ind.title}</h3>
                  <p className="mt-2 text-soft">{ind.summary}</p>
                  {ind.description && <p className="mt-3 text-sm text-soft">{ind.description}</p>}
                  {ind.solutions.length > 0 && (
                    <>
                      <p className="eyebrow mt-5 text-lav">Solutions we provide</p>
                      <ul className="mt-3 space-y-2 text-sm">
                        {ind.solutions.map((s) => (
                          <li key={s} className="flex items-start gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-lav" aria-hidden="true" /><span>{s}</span></li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
        <p className="mt-10 text-sm text-soft">These describe what we can build for each sector. They are not claims about past clients.</p>
      </section>

      <ContactCta title="Tell us about your industry." />
    </PageContainer>
  )
}
