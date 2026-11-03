import { ArrowUpRight, MapPin } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHero from '../components/sections/PageHero.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Ring360 from '../components/art/Ring360.jsx'
import { networkCategories } from '../data/network.js'
import { useNetwork } from '../hooks/useCmsPages.js'

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

/** Our Network: the companies LAX360 Ventures works with, grouped by the kind of relationship. Managed in the admin panel. */
export default function Network() {
  const entries = useNetwork()
  return (
    <PageContainer
      path="/our-network"
      title="Our Network"
      description="The partners and companies in the LAX360 Ventures network: authorized partners, technology partners, associated companies and strategic collaborations."
    >
      <PageHero
        eyebrow="Our Network"
        title="The partners we build with."
        art={<Ring360 className="h-auto w-full" />}
        lead="LAX360 Ventures works with trusted partners and companies. Here is who they are and how each relationship works."
      />

      <section className="wrap section" aria-labelledby="network-title">
        <h2 id="network-title" className="sr-only">Our network by relationship</h2>
        <div className="space-y-16">
          {networkCategories.map((cat) => {
            const list = entries.filter((e) => e.category === cat.value)
            return (
              <div key={cat.value} id={cat.value} className="scroll-mt-32">
                <Reveal>
                  <h3 className="font-display text-2xl font-semibold md:text-3xl">{cat.label}</h3>
                  <p className="mt-2 max-w-2xl text-soft">{cat.text}</p>
                </Reveal>
                {list.length ? (
                  <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((e, i) => (
                      <Reveal as="li" key={e.slug} delay={(i % 3) * 0.07}>
                        <article className="glass-flat lift flex h-full flex-col gap-4 p-6">
                          <div className="flex items-center gap-4">
                            {e.logo
                              ? <img src={e.logo} alt={e.logoAlt || `${e.title} logo`} width="64" height="64" loading="lazy" decoding="async" className="size-16 shrink-0 rounded-2xl border border-edge bg-white object-contain p-2" />
                              : <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent font-display text-xl font-bold text-white">{initials(e.title)}</span>}
                            <div className="min-w-0">
                              <h4 className="font-display text-xl font-semibold leading-tight">{e.title}</h4>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-lav">{cat.label.replace(/s$/, '')}</p>
                            </div>
                          </div>
                          {e.location && <p className="flex items-center gap-1.5 text-sm text-soft"><MapPin className="size-4 text-lav" aria-hidden="true" />{e.location}</p>}
                          <p className="flex-1 text-soft">{e.description}</p>
                          {e.website && (
                            <a href={e.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-lav hover:underline">
                              Visit website <ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
                            </a>
                          )}
                        </article>
                      </Reveal>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-6 rounded-2xl border border-dashed border-edge px-5 py-4 text-sm text-soft">No companies are listed in this category yet.</p>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-14 text-sm text-soft">A company appears here only where the relationship has been confirmed with LAX360 Ventures. Authorized-partner status applies only where it is stated.</p>
      </section>

      <ContactCta title="Interested in working with us?" />
    </PageContainer>
  )
}
