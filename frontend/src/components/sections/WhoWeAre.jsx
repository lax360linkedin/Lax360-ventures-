import { Bot, Code2, DraftingCompass, MapPin, Megaphone } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import ServiceSlider from './ServiceSlider.jsx'
import { branchCities, branchSentence } from '../../data/branches.js'
import { site } from '../../data/site.js'

const divisions = [
  { icon: Code2, label: 'Software & Apps' },
  { icon: Bot, label: 'AI & Automation' },
  { icon: Megaphone, label: 'Digital Growth' },
  { icon: DraftingCompass, label: 'CAD & Engineering' },
]

/** "Who We Are": introduction to LAX360 Ventures. Text and the division list on the left, a service photo slider on the right
 *  (an auto-advancing slider of the services). Stacks on small screens with the panel after the text. */
export default function WhoWeAre() {
  return (
    <section aria-labelledby="who-title" className="relative overflow-hidden border-b border-edge">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-10 size-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="wrap section relative grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <SectionHeading id="who-title" eyebrow="Who We Are" title="About" gradient="LAX360 Ventures" />
          <Reveal delay={0.08} className="mt-6 max-w-2xl space-y-5 text-lg leading-relaxed text-soft">
            <p>
              Welcome to <strong className="font-semibold text-fg">LAX360 Ventures</strong>, one accountable team that builds, automates and grows
              your business. We bring software, AI, digital growth, CAD engineering and training together under one roof.
            </p>
            <p>
              Our work is planned, built and supported by the same people, so every piece fits the way you already work instead of competing for
              your attention. From a first conversation to the finished product, you deal with one team, from {branchSentence}.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <ul className="mt-8 flex flex-wrap gap-2.5" aria-label="Our divisions">
              {divisions.map(({ icon: Icon, label }) => (
                <li key={label} className="tag"><Icon className="size-3.5 text-lav" aria-hidden="true" /> {label}</li>
              ))}
            </ul>
            <div className="mt-9"><Button to="/about" arrow>About LAX360</Button></div>
          </Reveal>
        </div>

        <Reveal delay={0.12} y={24} className="lg:col-span-5">
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <ServiceSlider />
            <p className="absolute -bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-edge-strong bg-night/90 px-4 py-2 text-sm font-semibold backdrop-blur-md">
              <img src="/assets/logo-shield.png" alt="" width="20" height="20" className="size-5 object-contain" />
              <span className="text-gradient">{site.tagline}</span>
              <span aria-hidden="true" className="h-3 w-px bg-edge-strong" />
              <MapPin className="size-3.5 text-lav" aria-hidden="true" /> {branchCities.length} branches
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
