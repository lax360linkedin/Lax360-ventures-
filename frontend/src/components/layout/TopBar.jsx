import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'
import SocialIcon from './SocialIcon.jsx'
import { showOnPage, useSite, useSiteSettings, useSocial } from '../../hooks/useSite.js'
import { whatsappLink } from '../../utils/whatsapp.js'

/** Slim contact strip above the menu: phone, email, WhatsApp and social icons (all from the website settings / admin panel).
 *  It is fixed to the top of the viewport; the fixed header is offset by --topbar-offset so the two never overlap. */
export default function TopBar() {
  const settings = useSiteSettings()
  const site = useSite()
  const social = useSocial()
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
  const phone = site.phones[0]
  const link = 'inline-flex min-h-8 items-center gap-1.5 transition-colors hover:text-lav focus-visible:text-lav'
  return (
    <div ref={ref} data-topbar className="fixed inset-x-0 top-0 z-[41] border-b border-edge/60 bg-night/80 text-xs text-soft backdrop-blur-md">
      <div className="wrap flex min-h-8 items-center justify-between gap-3">
        <ul className="flex items-center gap-x-4" aria-label="Contact">
          {phone && <li><a href={`tel:${phone.tel}`} className={link}><Phone className="size-3.5 text-lav" aria-hidden="true" />{phone.display}</a></li>}
          {site.email && <li className="hidden sm:block"><a href={`mailto:${site.email}`} className={link}><Mail className="size-3.5 text-lav" aria-hidden="true" />{site.email}</a></li>}
          {site.whatsappNumber && <li><a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className={link}><SocialIcon platform="whatsapp" className="size-3.5 text-[#25d366]" /><span className="font-medium">WhatsApp</span><span className="sr-only"> (opens in a new tab)</span></a></li>}
        </ul>
        {social.length > 0 && (
          <ul className="flex items-center gap-1" aria-label="Social media">
            {social.map((s) => (
              <li key={s.platform + s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`} className="grid size-8 place-items-center rounded-full transition-[color,transform] duration-200 hover:-translate-y-0.5 hover:text-lav focus-visible:text-lav">
                  <SocialIcon platform={s.platform} className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
