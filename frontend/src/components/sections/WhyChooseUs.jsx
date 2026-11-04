import { BadgeCheck, Gem, HeartHandshake, ShieldCheck, Target } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'

// The five principles behind how LAX360 Ventures works. Plain statements about our approach; no figures or claims about past results.
const principles = [
  { icon: HeartHandshake, title: 'Your Needs Come First', text: 'We prioritize your requirements over unnecessary sales.', span: 'lg:col-span-2' },
  { icon: ShieldCheck, title: 'Honest Recommendations', text: 'We suggest solutions based on what your business genuinely needs.', span: 'lg:col-span-2' },
  { icon: BadgeCheck, title: 'No Unnecessary Promises', text: 'We make realistic commitments and focus on what we can deliver.', span: 'lg:col-span-2' },
  { icon: Target, title: 'Built Around Your Goals', text: 'We develop solutions aligned with your business objectives.', span: 'lg:col-span-3' },
  { icon: Gem, title: 'Quality Over Quantity', text: 'We focus on meaningful outcomes rather than simply completing projects.', span: 'lg:col-span-3' },
]

/** Home "Why Choose Us": the two headline promises in large gradient type, the supporting message, then the five principles as cards (3 + 2 on desktop). */
export default function WhyChooseUs() {
  return (
    <section aria-labelledby="why-choose-title" className="relative overflow-hidden border-t border-edge bg-base2/50">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 size-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="wrap section relative">
        <Reveal className="mx-auto max-w-6xl text-center">
          <p className="eyebrow mb-5 flex items-center justify-center gap-3 text-lav">
            <span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-transparent to-accent" />
            Why Choose Us
            <span aria-hidden="true" className="h-px w-8 bg-gradient-to-l from-transparent to-accent" />
          </p>
          <h2 id="why-choose-title" className="font-display font-semibold tracking-[-0.025em]">
            <span className="block text-[clamp(2.1rem,4.7vw,3.9rem)] leading-[1.04]">
              We Don&apos;t Convince. <span className="text-gradient">We Understand.</span>
            </span>
            <span className="mt-2 block text-[clamp(1.5rem,3.3vw,2.85rem)] leading-[1.08] text-fg/90 md:mt-3">
              We Don&apos;t Overpromise. <span className="text-gradient">We Deliver.</span>
            </span>
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-3xl space-y-4 text-center text-base text-soft md:text-lg">
          <p>
            At LAX360 Ventures, we don&apos;t try to convince clients to purchase services they don&apos;t need. We first listen to their requirements, understand their
            business challenges, and then work towards delivering solutions that genuinely meet their expectations.
          </p>
          <p>
            We believe in honest recommendations, realistic commitments, transparent communication, and building solutions around our clients&apos; actual needs.
          </p>
        </Reveal>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {principles.map(({ icon: Icon, title, text, span }, i) => (
            <Reveal as="li" key={title} delay={i * 0.07} className={`${span} ${i === principles.length - 1 ? 'sm:col-span-2' : ''}`}>
              <div className="glass-flat lift group flex h-full items-start gap-5 p-6">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <Icon className="size-7" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold leading-tight">{title}</h3>
                  <p className="mt-2 text-sm text-soft">{text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
