import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import ChannelIcon, { opensNewTab } from './ChannelIcon.jsx'
import { showOnPage, useContacts, useSiteSettings, useSocial } from '../../hooks/useSite.js'

/** Slim contact strip above the menu: phone, email, WhatsApp and social icons (all from the website settings / admin panel).
 *  It is fixed to the top of the viewport; the fixed header is offset by --topbar-offset so the two never overlap. */
export default function TopBar() {
  const settings = useSiteSettings()
  const contacts = useContacts('header')
  const social = useSocial('header')
  const { pathname } = useLocation()
  const ref = useRef(null)
  const visible = settings.contact_bar_enabled !== false && showOnPage(settings.contact_bar_pages, pathname)

  useEffect(() => {
    const root = document.documentElement
    if (!visible || !ref.current) { root.style.setProperty('--topbar-h', '0px'); root.style.setProperty('--topbar-offset', '0px'); return undefined }
    const el = ref.current
    const apply = () => {
      const h = el.offsetHeight
      root.style.setProperty('--topbar-h', `${h}px`)
      root.style.setProperty('--topbar-offset', `${h}px`) // the fixed header always sits directly below the fixed bar
    }
    apply()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply)
    ro?.observe(el)
    window.addEventListener('resize', apply)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', apply)
      root.style.setProperty('--topbar-h', '0px')
      root.style.setProperty('--topbar-offset', '0px')
    }
  }, [visible, pathname])

  if (!visible) return null
  const link = 'inline-flex min-h-8 items-center gap-1.5 transition-colors hover:text-lav focus-visible:text-lav'
  // phones and WhatsApp stay visible on a phone; the rest (email, addresses ...) appear from the small breakpoint up, and only the first two are shown on a phone so the strip stays one line
  const shown = contacts.filter((c) => c.type !== 'address')
  const mobile = new Set(shown.filter((c) => c.type !== 'email').slice(0, 2).map((c) => c.id))
  const text = (c) => (c.type === 'whatsapp' ? 'WhatsApp' : c.type === 'other' || c.type === 'enquiry' || c.type === 'branch' ? c.label : c.value)
  return (
    <div ref={ref} data-topbar className="fixed inset-x-0 top-0 z-[41] border-b border-edge/60 bg-night/80 text-xs text-soft backdrop-blur-md">
      <div className="wrap flex min-h-8 items-center justify-between gap-3">
        <ul className="flex items-center gap-x-4" aria-label="Contact">
          {shown.map((c) => {
            const out = opensNewTab(c)
            return (
              <li key={c.id} className={mobile.has(c.id) ? '' : 'hidden sm:block'}>
                <a href={c.href} {...(out ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={link}>
                  <span className={c.type === 'whatsapp' ? 'text-[#25d366]' : 'text-lav'}><ChannelIcon channel={c} className="size-3.5" /></span>
                  <span className={c.type === 'whatsapp' ? 'font-medium' : ''}>{text(c)}</span>{out && <span className="sr-only"> (opens in a new tab)</span>}
                </a>
              </li>
            )
          })}
        </ul>
        {social.length > 0 && (
          <ul className="flex items-center gap-1" aria-label="Social media">
            {social.map((s) => (
              <li key={s.id}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`} className="grid size-8 place-items-center rounded-full transition-[color,transform] duration-200 hover:-translate-y-0.5 hover:text-lav focus-visible:text-lav">
                  <ChannelIcon channel={s} className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
