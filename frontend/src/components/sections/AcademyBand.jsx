import { Link } from 'react-router-dom'
import Button from '../ui/Button.jsx'
import Reveal from '../ui/Reveal.jsx'
import DivisionArt from '../art/DivisionArt.jsx'
import { courses } from '../../data/courses.js'

/** Split band: the real course list on the left (no workshop photo is available yet), copy on the right. */
export default function AcademyBand() {
  return (
    <section aria-labelledby="academy-title" className="border-t border-edge">
      <div className="wrap section grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <p className="eyebrow mb-4 text-lav">Academy</p>
          <h2 id="academy-title" className="h2">Learn the skills <span className="text-gradient">we use every day.</span></h2>
          <p className="lead mt-5 text-soft">
            Workshops for colleges and courses for professionals — including AI tools and prompt engineering.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/training" arrow>See courses</Button>
            <Button to="/contact?type=workshop" variant="secondary">Invite us to your college</Button>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="glass overflow-hidden">
            <DivisionArt id="training" className="h-44 w-full border-b border-edge bg-night/40 p-4 md:h-52" />
            <ul className="divide-y divide-edge">
            {courses.map((c, i) => (
                <li key={c.slug}>
                  <Link to={`/training#${c.slug}`} className="group flex items-start gap-5 p-5 transition-colors hover:bg-glass-strong md:p-6">
                    <span className="font-display text-2xl font-semibold text-lav">0{i + 1}</span>
                    <span>
                      <span className="block font-display text-xl font-semibold group-hover:underline">{c.title}</span>
                      <span className="mt-1 block text-base text-soft">{c.format} · {c.duration}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
