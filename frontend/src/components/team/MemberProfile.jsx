import OptimizedImage from '../ui/OptimizedImage.jsx'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { Award, BadgeCheck, Briefcase, Layers, Trophy, X } from 'lucide-react'
import { Avatar, SkillTags, Social } from './TeamBits.jsx'
import { roleLabels } from '../../data/team.js'

/** One titled list of the profile (achievements, certifications, awards), shown only when the person has some. */
function Facts({ icon: Icon, title, items }) {
  if (!items?.length) return null
  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-lav"><Icon className="size-4" aria-hidden="true" /></span>{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((t) => <li key={t} className="flex gap-3 text-[0.95rem] leading-relaxed text-soft"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-gradient-to-br from-primary to-accent" />{t}</li>)}
      </ul>
    </section>
  )
}

/**
 * The full profile of a team member, opened from their photograph in the team gallery: photographs (the main one and any extra ones, switchable), name, designation, department,
 * introduction, experience, skills, achievements, certifications and awards. It opens with a soft rise, closes with the X button, "Back to the team", the Escape key or a click outside,
 * keeps the page behind it still and returns focus to the photograph that opened it.
 */
export default function MemberProfile({ person, department, onClose }) {
  const reduce = useReducedMotion()
  const closeRef = useRef(null)
  const opener = useRef(null)
  const [shot, setShot] = useState(0)
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, []) // the dialog is only drawn in the browser, after the page has loaded (never in the prerendered HTML)

  useEffect(() => { setShot(0) }, [person])
  useEffect(() => {
    if (!person) return undefined
    opener.current = document.activeElement
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') { // keep the keyboard inside the profile while it is open
        const nodes = [...document.querySelectorAll('[data-profile] button, [data-profile] a[href]')]
        if (!nodes.length) return
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => closeRef.current?.focus(), 60)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; clearTimeout(t); opener.current?.focus?.() }
  }, [person]) // eslint-disable-line react-hooks/exhaustive-deps

  const pics = person ? [person.photo, ...person.photos].filter(Boolean) : []
  const main = person && pics.length ? { ...person, photo: pics[Math.min(shot, pics.length - 1)] } : person
  const role = person && person.role !== 'team_member' ? roleLabels[person.role] : ''
  const anim = reduce ? {} : { initial: { opacity: 0, y: 28, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 20, scale: 0.98 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
  const fade = reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 } }

  if (!ready) return null
  return createPortal( // outside the page's own animated wrapper, so the dialog always covers the whole window
    <AnimatePresence>
      {person && (
        <m.div key="profile" {...fade} className="fixed inset-0 z-[1100] flex items-end justify-center p-0 sm:items-center sm:p-6" data-profile>
          <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-night/75 backdrop-blur-sm" />
          <m.div {...anim} role="dialog" aria-modal="true" aria-labelledby="profile-name" className="relative flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-edge-strong bg-night shadow-[0_40px_90px_-30px_rgb(var(--glow)/0.6)] sm:max-h-[90dvh] sm:rounded-3xl">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close profile" className="absolute right-3 top-4 z-20 grid size-11 place-items-center rounded-full border border-edge-strong bg-night/90 text-fg shadow transition-colors hover:border-lav hover:bg-glass-strong">
              <X className="size-5" aria-hidden="true" />
            </button>
            <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:overflow-hidden">
              {/* photographs */}
              <div className="relative bg-gradient-to-b from-primary/10 to-transparent p-4 sm:p-6 md:overflow-y-auto">
                <div className="mx-auto max-w-[12.5rem] overflow-hidden rounded-2xl border border-edge shadow-[0_24px_50px_-28px_rgb(var(--glow)/0.7)] sm:max-w-[15rem] md:max-w-none">
                  <Avatar person={main} className="aspect-[4/5]" sizes="(min-width: 768px) 22rem, 17rem" />
                </div>
                {pics.length > 1 && (
                  <ul className="mt-4 flex justify-center gap-2.5 overflow-x-auto pb-1">
                    {pics.map((src, i) => (
                      <li key={src + i}>
                        <button type="button" onClick={() => setShot(i)} aria-label={`${person.name} ${i + 1}`} aria-current={i === shot || undefined} className={`block size-14 overflow-hidden rounded-xl border-2 transition-all ${i === shot ? 'border-lav opacity-100' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                          <OptimizedImage src={src} alt="" width="112" height="112" sizes="112px" className="size-full object-cover object-top" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* details */}
              <div className="p-5 pt-4 sm:p-7 md:overflow-y-auto md:pr-10">
                <div className="flex flex-wrap items-center gap-2 pr-12">
                  {role && <span className="rounded-full bg-night/80 px-3 py-1 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-white ring-1 ring-edge-strong">{role}</span>}
                  {department && <span className="inline-flex items-center gap-1.5 rounded-full border border-edge-strong bg-glass px-3 py-1 text-xs font-semibold uppercase tracking-wider text-lav"><Layers className="size-3.5" aria-hidden="true" />{department}</span>}
                </div>
                <h2 id="profile-name" className="mt-3 font-display text-3xl font-semibold leading-tight md:text-4xl">{person.name}</h2>
                <p className="mt-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-lg font-semibold text-transparent">{person.designation}</p>
                {person.experience && <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-soft"><Briefcase className="size-4 text-lav" aria-hidden="true" />{person.experience}</p>}
                {person.bio && <p className="mt-5 border-l-2 border-lav/60 pl-4 text-base leading-relaxed text-soft">{person.bio}</p>}
                {person.expertise.length > 0 && (
                  <section className="mt-6">
                    <h3 className="font-display text-lg font-semibold">Skills</h3>
                    <SkillTags items={person.expertise} label={`${person.name}: skills`} className="mt-3" />
                  </section>
                )}
                <Facts icon={Trophy} title="Achievements" items={person.achievements} />
                <Facts icon={BadgeCheck} title="Certifications" items={person.certifications} />
                <Facts icon={Award} title="Awards & recognition" items={person.awards} />
                <Social person={person} />
                <button type="button" onClick={onClose} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full border border-edge-strong bg-glass px-5 text-sm font-semibold transition-colors hover:border-lav hover:bg-glass-strong">Back to the team</button>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
