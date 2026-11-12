import SocialIcon from '../layout/SocialIcon.jsx'

export const SOCIAL_LABEL = { linkedin: 'LinkedIn' }

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

/** A profile picture: the uploaded photograph; when none has been uploaded, the person's initials on a neutral brand background (never a drawn or stock face). */
export function Avatar({ person, className = 'aspect-[4/5]', sizes }) {
  return person.photo
    ? <img src={person.photo} alt={person.photoAlt || person.name} width="600" height="750" sizes={sizes} loading="lazy" decoding="async" className={`${className} w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]`} />
    : (
      <div role="img" aria-label={`${person.name} (no photograph yet)`} className={`${className} flex w-full items-center justify-center bg-gradient-to-br from-primary/35 via-accent/20 to-transparent`}>
        <span aria-hidden="true" className="font-display text-6xl font-semibold tracking-wide text-fg/80 md:text-7xl">{initials(person.name)}</span>
      </div>
    )
}

/** The only external link shown for a person: their professional LinkedIn profile, when one was entered. */
export function Social({ person }) {
  if (!person.links?.length) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {person.links.map((l) => (
        <li key={l.platform}>
          <a href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`${person.name} on ${SOCIAL_LABEL[l.platform]} (opens in a new tab)`} className="inline-flex size-11 items-center justify-center rounded-full border border-edge-strong bg-glass transition-colors hover:border-lav hover:bg-glass-strong">
            <SocialIcon platform={l.platform} className="size-4" />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function SkillTags({ items, label, className = '', max }) {
  const list = max ? items?.slice(0, max) : items
  if (!list?.length) return null
  return <ul className={`flex flex-wrap gap-2 ${className}`} aria-label={label}>{list.map((t) => <li key={t} className="rounded-full border border-edge bg-glass px-3 py-1 text-xs font-semibold">{t}</li>)}</ul>
}

export function EmptyNote({ children }) {
  return <p role="note" className="rounded-2xl border border-dashed border-edge px-5 py-6 text-soft">{children}</p>
}
