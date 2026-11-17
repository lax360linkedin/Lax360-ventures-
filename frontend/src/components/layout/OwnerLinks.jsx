import ChannelIcon, { opensNewTab } from './ChannelIcon.jsx'
import { useOwnedChannels } from '../../hooks/useSite.js'

/**
 * The social media links and contact details of ONE branch or partner (managed in the admin panel under that branch / partner), drawn with the same icons as the rest of the website.
 * `type` is 'branch' or 'partner', `owner` its slug, `name` is used in the accessible labels. Nothing is rendered when that owner has none, and one owner never shows another's links.
 * `socialOnly` shows just the round social icons (compact cards); otherwise the contact details are listed too.
 */
export default function OwnerLinks({ type, owner, name, title, socialOnly = false, className = '' }) {
  const { social, contacts } = useOwnedChannels(type, owner)
  const shown = socialOnly ? [] : contacts.filter((c) => c.type !== 'address')
  if (!social.length && !shown.length) return null
  return (
    <div className={className}>
      {title && <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-soft">{title}</p>}
      {social.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${name} on social media`}>
          {social.map((s) => (
            <li key={s.id}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${name} on ${s.label} (opens in a new tab)`} title={s.label}
                className="ct-social inline-flex size-10 items-center justify-center rounded-full border border-edge-strong bg-glass text-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-lav hover:text-lav focus-visible:text-lav">
                <ChannelIcon channel={s} className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {shown.length > 0 && (
        <ul className={`${social.length ? 'mt-3 ' : ''}space-y-1`} aria-label={`${name} contact details`}>
          {shown.map((c) => {
            const out = opensNewTab(c)
            return (
              <li key={c.id}>
                <a href={c.href} {...(out ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="inline-flex min-h-9 items-center gap-2 break-all text-sm font-semibold text-fg transition-colors hover:text-lav">
                  <span className="shrink-0 text-lav"><ChannelIcon channel={c} className="size-4" /></span>
                  {c.type === 'whatsapp' ? 'WhatsApp' : c.type === 'website' || c.type === 'other' || c.type === 'enquiry' ? c.label : c.value}
                  {c.note && <span className="font-normal text-soft">({c.note})</span>}
                  {out && <span className="sr-only"> (opens in a new tab)</span>}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
