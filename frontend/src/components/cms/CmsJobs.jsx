import { Briefcase, MapPin } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import { useContent } from '../../hooks/useSite.js'
import { toLines } from '../../utils/cms.js'

/** Open positions published in the admin panel (closed openings are never delivered). Renders nothing when there are none. */
export function useJobs() {
  return useContent('job') || []
}

export default function CmsJobs() {
  const jobs = useJobs()
  if (!jobs.length) return null
  return (
    <section className="wrap section" aria-labelledby="openings-title" id="openings">
      <SectionHeading id="openings-title" eyebrow="Open positions" title="Join the" gradient="team." lead="Roles we are hiring for right now." />
      <ul className="mt-12 grid gap-5 lg:grid-cols-2">
        {jobs.map((j, i) => {
          const reqs = toLines(j.data.requirements)
          const apply = j.data.apply_link
          return (
            <Reveal as="li" key={j.id} delay={i * 0.05} className="glass-flat flex flex-col p-6 md:p-8">
              <h3 className="font-display text-2xl font-semibold">{j.title}</h3>
              <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-soft">
                {j.data.department && <span className="inline-flex items-center gap-1.5"><Briefcase className="size-4" aria-hidden="true" /> {j.data.department}</span>}
                {j.data.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" /> {j.data.location}</span>}
                {j.data.employment_type && <span className="capitalize">{j.data.employment_type}</span>}
              </p>
              <p className="mt-4 whitespace-pre-line text-soft">{j.data.description}</p>
              {reqs.length > 0 && <div className="mt-4"><h4 className="text-sm font-semibold">Requirements</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-soft">{reqs.map((r) => <li key={r}>{r}</li>)}</ul></div>}
              {j.data.eligibility && <p className="mt-4 text-sm text-soft"><strong className="text-fg">Eligibility:</strong> {j.data.eligibility}</p>}
              <div className="mt-6">
                <Button to={apply ? undefined : `/contact?type=career`} href={apply || undefined} arrow>Apply for this role</Button>
              </div>
            </Reveal>
          )
        })}
      </ul>
    </section>
  )
}
