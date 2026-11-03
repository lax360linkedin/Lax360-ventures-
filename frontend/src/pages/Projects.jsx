import { useMemo, useState } from 'react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHero from '../components/sections/PageHero.jsx'
import DivisionArt from '../components/art/DivisionArt.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Button from '../components/ui/Button.jsx'
import { projects, concepts } from '../data/projects.js'
import { divisions } from '../data/services.js'
import { useContent } from '../hooks/useSite.js'

const divisionName = Object.fromEntries(divisions.map((d) => [d.slug, d.name]))

/**
 * Verified projects render here once added to data/projects.js. Until then the page shows an
 * honest empty state plus clearly labelled illustrative concepts (not client work).
 */
export default function Projects() {
  const managed = useContent('project') // projects published in the admin panel
  const list = managed ? managed.map((p) => ({ id: p.id, title: p.title, division: p.data.division, summary: p.data.summary, image: p.data.image, video: p.data.video, link: p.data.link, category: p.data.category })) : projects
  const hasProjects = list.length > 0
  const items = hasProjects ? list : concepts
  const [filter, setFilter] = useState('all')
  const filters = useMemo(() => ['all', ...new Set(items.map((i) => i.division))], [items])
  const visible = filter === 'all' ? items : items.filter((i) => i.division === filter)

  return (
    <PageContainer
      path="/work"
      title="Work"
      description="Projects and capability concepts from LAX360 Ventures. Verified client case studies will be published here with permission."
    >
      <PageHero
        eyebrow="Work"
        title={hasProjects ? 'Recent work.' : 'Case studies are on the way.'}
        art={<DivisionArt id="growth" className="h-auto w-full" />}
        lead={hasProjects ? 'Real projects, shared with client permission.' : "We only publish work that clients have approved. Until then, here is the kind of thing each division can build — illustrative concepts, not client projects."}
      />

      <section className="wrap section" aria-labelledby="work-list-title">
        <h2 id="work-list-title" className="sr-only">{hasProjects ? 'Projects' : 'Illustrative concepts'}</h2>
        {!hasProjects && (
          <p role="note" className="mb-8 inline-block rounded-md border border-edge bg-glass px-4 py-2 text-sm font-semibold text-soft">
            Illustrative concepts — not client work and no results are implied.
          </p>
        )}
        <div role="group" aria-label="Filter by division" className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`min-h-11 rounded-full border px-5 text-sm font-semibold ${filter === f ? 'border-edge-strong bg-base2 text-fg' : 'border-edge bg-glass hover:border-edge-strong'}`}
            >
              {f === 'all' ? 'All' : divisionName[f]}
            </button>
          ))}
        </div>

        <p className="sr-only" role="status" aria-live="polite">{visible.length} {visible.length === 1 ? 'item' : 'items'} shown</p>

        {visible.length === 0 ? (
          <p className="mt-10 text-soft">Nothing in this category yet.</p>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <li key={item.id || item.slug} className="flex flex-col rounded-xl border border-edge bg-glass p-6 transition-colors hover:border-2 hover:border-edge-strong hover:p-[23px]">
                {item.video ? <video src={item.video} className="-mx-6 -mt-6 mb-5 aspect-[16/9] w-[calc(100%+3rem)] max-w-none rounded-t-xl object-cover" controls muted playsInline preload="metadata" poster={item.image || undefined} />
                  : item.image && <img src={item.image} alt="" className="-mx-6 -mt-6 mb-5 aspect-[16/9] w-[calc(100%+3rem)] max-w-none rounded-t-xl object-cover" loading="lazy" />}
                <p className="eyebrow text-lav">{divisionName[item.division]}{item.category ? ` · ${item.category}` : ''}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold">{item.title}</h3>
                <p className="mt-2 flex-1 text-soft">{item.text || item.summary}</p>
                {item.link && <a href={item.link} className="link-underline mt-4 inline-flex min-h-11 items-center font-semibold text-lav" {...(/^https?:/.test(item.link) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>View case study</a>}
                {!hasProjects && <p className="mt-4 text-xs font-bold uppercase tracking-wider text-soft">Concept</p>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-12 border-t border-edge pt-8">
          <h2 className="h3">Need something similar?</h2>
          <div className="mt-5"><Button to="/contact?type=project" arrow>Discuss Your Project</Button></div>
        </div>
      </section>

      <ContactCta />
    </PageContainer>
  )
}
