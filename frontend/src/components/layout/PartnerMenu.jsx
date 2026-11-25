import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Handshake } from 'lucide-react'
import { usePartnerMenu } from '../../services/partnershipService.js'

/**
 * "Partner With Us": a highlighted call-to-action beside the Login button, with a hover dropdown (the three partnership programs) and a nested side menu (the business divisions of the
 * program under the pointer). The menu is data: it follows what administrators publish (Admin > Partnerships > Navigation menu). The label itself is a real link to the landing page.
 *
 * Mouse: hover or keyboard focus opens it (short leave delay, so the pointer can cross the gap). Touch and keyboard: the chevron button opens and closes it (aria-expanded), Arrow keys move,
 * Escape closes. Phones and tablets use the expandable list in the mobile menu instead.
 */
export default function PartnerMenu({ bot }) {
  const { categories, refresh } = usePartnerMenu()
  // The header's mini-bot follows this menu like it follows the nav links (keys are matched to [data-bot] elements by Header.measureLink).
  const botTo = (key) => { if (window.matchMedia('(hover: hover)').matches) bot?.current?.hover(key) }
  const botClick = (key) => bot?.current?.click(key)
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [sub, setSub] = useState(null)
  const root = useRef(null)
  const timer = useRef(null)
  const id = useId()

  const show = useCallback(() => { clearTimeout(timer.current); setOpen((o) => { if (!o) refresh(); return true }) }, [refresh])
  const hide = useCallback((delay = 160) => { clearTimeout(timer.current); timer.current = setTimeout(() => { setOpen(false); setSub(null) }, delay) }, [])
  useEffect(() => { setOpen(false); setSub(null) }, [pathname]) // navigating closes the menu
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!root.current?.contains(e.target)) { setOpen(false); setSub(null) } }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  const onKey = (e) => {
    if (e.key === 'Escape') { setOpen(false); setSub(null); root.current?.querySelector('a')?.focus() }
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return
    const focusables = [...root.current.querySelectorAll('[data-pm-item]')].filter((el) => el.offsetParent !== null)
    const i = focusables.indexOf(document.activeElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open) { show(); return }
      e.preventDefault()
      const level = document.activeElement?.dataset?.pmLevel
      const same = focusables.filter((el) => el.dataset.pmLevel === (level || '0'))
      const j = same.indexOf(document.activeElement)
      same[(j + (e.key === 'ArrowDown' ? 1 : -1) + same.length) % same.length]?.focus()
    } else if (e.key === 'ArrowRight' && document.activeElement?.dataset?.pmCat) {
      e.preventDefault(); setSub(document.activeElement.dataset.pmCat)
      requestAnimationFrame(() => root.current.querySelector(`[data-pm-level="1"]`)?.focus())
    } else if (e.key === 'ArrowLeft' && document.activeElement?.dataset?.pmLevel === '1') {
      e.preventDefault(); root.current.querySelector(`[data-pm-cat="${sub}"]`)?.focus()
    }
    void i
  }

  const cur = categories.find((c) => c.slug === sub)
  return (
    <div ref={root} className="relative" onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) { show(); botTo('partner') } }} onMouseLeave={() => { hide(); bot?.current?.leave() }} onKeyDown={onKey} onBlur={(e) => !root.current?.contains(e.relatedTarget) && hide(60)}>
      <div className="inline-flex items-stretch overflow-hidden rounded-full bg-gradient-to-r from-primary-hover to-primary text-white shadow-[0_8px_24px_-10px_rgb(var(--glow)/0.9)] ring-1 ring-white/20 transition-shadow hover:shadow-[0_12px_28px_-10px_rgb(var(--glow)/1)]">
        <Link to="/partner-with-us" data-bot="partner" data-bot-at="top" data-pm-item data-pm-level="0" onFocus={() => { show(); botTo('partner') }} aria-haspopup="menu" aria-expanded={open} aria-controls={`${id}-panel`}
          onClick={(e) => { if (!window.matchMedia('(hover: hover)').matches && !open) { e.preventDefault(); show() } else botClick('partner') /* touch: the first tap opens the menu, the second opens the landing page */ }}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-[0.8125rem] font-semibold min-[1140px]:text-[0.875rem] xl:px-5 xl:text-[0.9375rem]">
          <Handshake className="hidden size-4 xl:block" aria-hidden="true" /><span className="whitespace-nowrap">Partner With Us</span>
        </Link>
      </div>

      <div id={`${id}-panel`} role="menu" aria-label="Partnership programs" className={`absolute right-0 top-full z-50 pt-2 transition-[opacity,transform] duration-200 ease-out ${open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'}`}>
        <div className="relative w-72 rounded-2xl border border-edge-strong bg-night/95 p-2 shadow-menu backdrop-blur-xl">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-soft">Partnership programs</p>
          <ul>
            {categories.map((c) => (
              <li key={c.slug} onMouseEnter={() => { setSub(c.slug); botTo(`partner:${c.slug}`) }}>
                <Link to={c.path} role="menuitem" data-bot={`partner:${c.slug}`} data-bot-at="row" data-pm-item data-pm-level="0" data-pm-cat={c.slug} tabIndex={open ? 0 : -1} onClick={() => botClick(`partner:${c.slug}`)} onFocus={() => { setSub(c.slug); botTo(`partner:${c.slug}`) }} aria-haspopup="menu" aria-expanded={sub === c.slug}
                  className={`flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-[0.9375rem] font-semibold text-fg transition-colors ${sub === c.slug ? 'bg-glass-strong' : 'hover:bg-glass'}`}>
                  {c.label}<ChevronRight className="size-4 text-soft" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/partner-with-us" role="menuitem" data-pm-item data-pm-level="0" tabIndex={open ? 0 : -1} className="mt-1 flex min-h-11 items-center rounded-xl border-t border-edge px-3 pt-0.5 text-sm font-semibold text-lav hover:text-fg">All partnership programs</Link>

          {/* nested side menu: the divisions of the program under the pointer */}
          <div role="menu" aria-label={cur ? `${cur.label}: business divisions` : undefined} className={`absolute right-full top-0 pr-2 transition-[opacity,transform] duration-200 ease-out ${open && cur ? 'visible translate-x-0 opacity-100' : 'pointer-events-none invisible translate-x-1 opacity-0'}`}>
            <div className="w-64 rounded-2xl border border-edge-strong bg-night/95 p-2 shadow-menu backdrop-blur-xl">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-soft">{cur?.label}</p>
              <ul>
                {(cur?.items || []).map((d) => (
                  <li key={d.slug}><Link to={d.path} role="menuitem" data-bot={`partner:${cur.slug}/${d.slug}`} data-bot-at="row" data-pm-item data-pm-level="1" tabIndex={open && cur ? 0 : -1} onMouseEnter={() => botTo(`partner:${cur.slug}/${d.slug}`)} onFocus={() => botTo(`partner:${cur.slug}/${d.slug}`)} onClick={() => botClick(`partner:${cur.slug}/${d.slug}`)} className="flex min-h-11 items-center rounded-xl px-3 text-[0.9375rem] font-medium text-fg transition-colors hover:bg-glass">{d.label}</Link></li>
                ))}
              </ul>
              <Link to={cur?.path || '/partner-with-us'} role="menuitem" data-pm-item data-pm-level="1" tabIndex={open && cur ? 0 : -1} className="mt-1 flex min-h-11 items-center rounded-xl border-t border-edge px-3 pt-0.5 text-sm font-semibold text-lav hover:text-fg">Program overview</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
