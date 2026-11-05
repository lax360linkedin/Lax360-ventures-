import Reveal from '../ui/Reveal.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import { useContent } from '../../hooks/useSite.js'
import { toParagraphs } from '../../utils/cms.js'

const TITLES = { vision: 'Our vision', mission: 'Our mission' }

/** About Us content managed in the admin panel (introduction, vision, mission, values, achievements, team, images). */
export function useAboutBlocks() {
  const items = useContent('about_block')
  const by = (type) => (items || []).filter((i) => i.data.block === type)
  return { any: Boolean(items), intro: by('intro'), vision: by('vision'), mission: by('mission'), story: by('story'), values: by('value'), achievements: by('achievement'), team: by('team'), images: by('image') }
}

export function AboutIntro({ blocks }) {
  if (!blocks.intro.length) return null
  return (
    <section className="wrap section grid gap-10 lg:grid-cols-12" aria-label="Company introduction">
      {blocks.intro.map((b) => (
        <div key={b.id} className="contents">
          <h2 className="h2 lg:col-span-5">{b.title}</h2>
          <div className="space-y-5 text-lg text-soft lg:col-span-7">
            {b.data.image && <img src={b.data.image} alt={b.data.image_alt || ''} className="w-full rounded-xl object-cover" loading="lazy" />}
            {toParagraphs(b.data.text).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      ))}
    </section>
  )
}

export function AboutMore({ blocks, skipVisionMission = false, skipValues = false }) {
  const visionMission = skipVisionMission ? [] : [...blocks.vision, ...blocks.mission]
  if (!(visionMission.length || (!skipValues && blocks.values.length) || blocks.achievements.length || blocks.team.length || blocks.images.length)) return null
  return (
    <>
      {visionMission.length > 0 && (
        <section className="border-y border-edge bg-base2/50" aria-label="Vision and mission"><div className="wrap section grid gap-6 md:grid-cols-2">
          {visionMission.map((b) => <Reveal key={b.id} className="glass-flat p-6 md:p-8"><p className="eyebrow text-lav">{TITLES[b.data.block]}</p><h3 className="mt-3 font-display text-2xl font-semibold">{b.title}</h3><p className="mt-3 whitespace-pre-line text-soft">{b.data.text}</p></Reveal>)}
        </div></section>
      )}
      {!skipValues && blocks.values.length > 0 && (
        <section className="wrap section" aria-labelledby="values-title"><SectionHeading id="values-title" eyebrow="What we stand for" title="Our" gradient="values." />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{blocks.values.map((b, i) => <Reveal as="li" key={b.id} delay={i * 0.05} className="glass-flat p-6"><h3 className="font-display text-xl font-semibold">{b.title}</h3><p className="mt-2 text-soft">{b.data.text}</p></Reveal>)}</ul>
        </section>
      )}
      {blocks.achievements.length > 0 && (
        <section className="border-y border-edge bg-glass" aria-labelledby="ach-title"><div className="wrap section"><SectionHeading id="ach-title" eyebrow="Milestones" title="Our" gradient="achievements." />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{blocks.achievements.map((b, i) => <Reveal as="li" key={b.id} delay={i * 0.05} className="rounded-xl border border-edge bg-night p-6">{b.data.role && <p className="font-display text-3xl font-semibold text-gradient">{b.data.role}</p>}<h3 className="mt-2 font-semibold">{b.title}</h3><p className="mt-1 text-sm text-soft">{b.data.text}</p></Reveal>)}</ul>
        </div></section>
      )}
      {blocks.team.length > 0 && (
        <section className="wrap section" aria-labelledby="team-title"><SectionHeading id="team-title" eyebrow="People" title="Our" gradient="team." />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{blocks.team.map((b, i) => (
            <Reveal as="li" key={b.id} delay={i * 0.05} className="glass-flat overflow-hidden">
              {b.data.image && <img src={b.data.image} alt={b.data.image_alt || b.title} className="aspect-square w-full object-cover" loading="lazy" />}
              <div className="p-5"><h3 className="font-display text-lg font-semibold">{b.title}</h3>{b.data.role && <p className="text-sm font-medium text-lav">{b.data.role}</p>}{b.data.text && <p className="mt-2 text-sm text-soft">{b.data.text}</p>}</div>
            </Reveal>
          ))}</ul>
        </section>
      )}
      {blocks.images.length > 0 && (
        <section className="wrap section" aria-label="Gallery"><ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{blocks.images.filter((b) => b.data.image).map((b) => <li key={b.id}><figure><img src={b.data.image} alt={b.data.image_alt || b.title} className="w-full rounded-xl object-cover" loading="lazy" />{b.title && <figcaption className="mt-2 text-sm text-soft">{b.title}</figcaption>}</figure></li>)}</ul></section>
      )}
    </>
  )
}
