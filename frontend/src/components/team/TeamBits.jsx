import SocialIcon from '../layout/SocialIcon.jsx'

export const SOCIAL_LABEL = { linkedin: 'LinkedIn', x: 'X', github: 'GitHub', instagram: 'Instagram' }

const hash = (text) => { let h = 2166136261; for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const pick = (list, seed, shift) => list[((seed >>> shift) % list.length)]
const SKIN = ['#c68642', '#b5783a', '#a8693a', '#8d5524', '#d29a63', '#9c6b43']
const HAIR = ['#1c1410', '#241a14', '#2d1f17', '#171212']
const SHIRT = ['#1f3a5f', '#334155', '#3f6e4e', '#7a3b4d', '#2b4a7a', '#4b3f72', '#8a5a2b', '#274c56']
const BG = ['#dbeafe', '#e0e7ff', '#dcfce7', '#fce7f3', '#fef3c7', '#e2e8f0']

/** An illustrated placeholder portrait, drawn from the person's name so every profile gets a different one. It is NOT a photograph: upload a real photo in the admin panel to replace it. */
function Illustration({ name, className }) {
  const s = hash(name)
  const skin = pick(SKIN, s, 0), hair = pick(HAIR, s, 3), shirt = pick(SHIRT, s, 5), bg = pick(BG, s, 8)
  const style = (s >>> 11) % 4 // 0 short, 1 long, 2 bun, 3 side-part
  const suit = (s >>> 14) % 2 === 0
  return (
    <svg viewBox="0 0 200 250" className={className} role="img" aria-label={`Illustrated placeholder portrait for ${name}`} preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="250" fill={bg} />
      {style === 1 && <path d="M52 112c0-52 24-70 48-70s48 18 48 70v70c0 8-10 14-18 8l-6-80H76l-6 80c-8 6-18 0-18-8z" fill={hair} />}
      <path d="M30 250c0-52 30-76 70-76s70 24 70 76z" fill={shirt} />
      {suit && <path d="M100 174l-22 26 22 50 22-50z" fill="#f8fafc" />}
      {suit && <path d="M100 174l-22 26-14 50h36zM100 174l22 26 14 50h-36z" fill={shirt} opacity="0.85" />}
      <rect x="86" y="146" width="28" height="34" rx="12" fill={skin} />
      <ellipse cx="100" cy="112" rx="38" ry="44" fill={skin} />
      {style === 0 && <path d="M62 108c-2-34 16-50 40-50s40 14 38 50c-8-14-20-22-38-22s-30 6-40 22z" fill={hair} />}
      {style === 1 && <path d="M62 108c-2-34 16-50 40-50s40 14 38 50c-10-12-22-18-38-18s-30 6-40 18z" fill={hair} />}
      {style === 2 && <><circle cx="100" cy="52" r="15" fill={hair} /><path d="M62 106c-2-34 16-48 38-48s40 14 38 48c-8-14-20-20-38-20s-30 6-38 20z" fill={hair} /></>}
      {style === 3 && <path d="M62 112c-4-40 14-56 42-56 24 0 38 16 34 54-4-14-12-24-26-26-18 4-34 6-50 28z" fill={hair} />}
      <circle cx="86" cy="116" r="3.2" fill="#2b1d16" /><circle cx="114" cy="116" r="3.2" fill="#2b1d16" />
      <path d="M88 134c6 6 18 6 24 0" stroke="#7a3b2e" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/** A profile picture: the uploaded photograph, or an illustrated placeholder when none has been uploaded. */
export function Avatar({ person, className = 'aspect-[4/5]', sizes }) {
  return person.photo
    ? <img src={person.photo} alt={person.photoAlt || person.name} width="600" height="750" sizes={sizes} loading="lazy" decoding="async" className={`${className} w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]`} />
    : <Illustration name={person.name} className={`${className} w-full transition-transform duration-500 group-hover:scale-[1.03]`} />
}

export function Social({ person }) {
  if (!person.links?.length) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {person.links.map((l) => (
        <li key={l.platform}>
          <a href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`${person.name} on ${SOCIAL_LABEL[l.platform]} (opens in a new tab)`} className="inline-flex size-11 items-center justify-center rounded-full border border-edge-strong bg-glass text-fg transition-colors hover:border-lav hover:bg-glass-strong hover:text-lav">
            <SocialIcon platform={l.platform} className="size-4" />
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Shown on profiles an administrator has flagged as fictional sample content. */
export function DemoBadge({ className = '' }) {
  return <span className={`inline-flex w-fit items-center rounded-full border border-dashed border-edge-strong bg-glass px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider text-soft ${className}`}>Demonstration profile</span>
}

export function SkillTags({ items, label, className = '' }) {
  if (!items?.length) return null
  return <ul className={`flex flex-wrap gap-2 ${className}`} aria-label={label}>{items.map((t) => <li key={t} className="rounded-full border border-edge bg-glass px-3 py-1 text-xs font-semibold">{t}</li>)}</ul>
}

export function EmptyNote({ children }) {
  return <p role="note" className="rounded-2xl border border-dashed border-edge px-5 py-6 text-soft">{children}</p>
}
