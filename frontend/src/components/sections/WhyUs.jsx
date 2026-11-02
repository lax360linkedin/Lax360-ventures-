import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'

// Draft commitments from the planning document — each is marked [Confirm] there.
const commitments = [
  { title: 'One point of contact', text: 'A single person you can ask, instead of chasing separate vendors.' },
  { title: 'Written scope first', text: 'A written scope and estimate before work starts, so nothing is a surprise.' },
  { title: 'Clear ownership', text: 'Ownership of your code and data is agreed up front.' },
  { title: 'Support after launch', text: 'Support options are discussed before you sign off, not after.' },
]

export default function WhyUs() {
  return (
    <section aria-labelledby="why-title" className="border-t border-edge">
      <div className="wrap section">
        <SectionHeading id="why-title" eyebrow="Why LAX360" title="What you can expect from us." />
        <ol className="mt-12 grid gap-x-16 gap-y-12 md:grid-cols-2">
          {commitments.map((c, i) => (
            <Reveal as="li" key={c.title} delay={(i % 2) * 0.08} className="glass-flat p-6 md:p-8">
              <p className="text-gradient font-display text-6xl font-semibold leading-none md:text-7xl">0{i + 1}</p>
              <h3 className="mt-4 font-display text-2xl font-semibold md:text-3xl">{c.title}</h3>
              <p className="mt-2 max-w-md text-soft">{c.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
