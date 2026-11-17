import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Phone } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { branchSentence } from '../data/branches.js'
import { useBranchDirectory } from '../hooks/useBranches.js'

/** /locations: the LAX360 Pvt Ltd offices, each linking to its own page. The list comes from the branches managed in the admin panel (the built-in offices are the stand-in while it loads). */
export default function Locations() {
  const { branches } = useBranchDirectory()
  return (
    <PageContainer path="/locations" title="Our Locations: Salem, Bangalore and Mumbai" description={`LAX360 Pvt Ltd has offices in ${branchSentence}. Find each office's address, phone number, map and directions.`}>
      <section className="wrap section">
        <SectionHeading eyebrow="Our offices" title="LAX360 Pvt Ltd" gradient="locations." as="h1" lead={`Visit or contact the team in ${branchSentence}. Each office has its own page with its address, phone number, map and directions.`} />
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {branches.map((b, i) => (
            <Reveal as="li" key={b.id} delay={i * 0.08}>
              <Link to={`/locations/${b.id}`} className="glass-flat lift group flex h-full flex-col gap-3 p-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white"><MapPin className="size-6" aria-hidden="true" /></span>
                <span className="font-display text-2xl font-semibold transition-colors group-hover:text-lav">LAX360 {b.city}</span>
                {b.address && <address className="not-italic text-sm text-soft">{b.address.map((l) => <span key={l} className="block">{l}</span>)}</address>}
                {b.phone && <span className="inline-flex items-center gap-2 text-sm font-semibold"><Phone className="size-4 text-lav" aria-hidden="true" />{b.phone}</span>}
                <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-lav">Office details and directions <ArrowRight className="size-4" aria-hidden="true" /></span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </section>
    </PageContainer>
  )
}
