import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Cookie, X } from 'lucide-react'
import { setConsent, useConsent, useSettingsRequest } from '../../utils/consent.js'
import { useIntroState } from '../../utils/welcomeIntro.js'

const btn = 'inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm sm:flex-none sm:px-5 font-semibold transition-[transform,background-color,border-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lav'

/** A labelled on / off switch (a real checkbox underneath, so it works with a keyboard and a screen reader). */
function Switch({ id, checked, onChange, disabled, label }) {
  return (
    <label htmlFor={id} className={`relative inline-flex shrink-0 items-center ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
      <input id={id} type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} aria-label={label} />
      <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-glass-strong ring-1 ring-edge-strong transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lav" />
    </label>
  )
}

/**
 * Cookie consent. First visit: a small card at the bottom of the screen (after the intro animation and the welcome contact card, never on top of them) with Accept all, Reject optional and Cookie
 * settings, and a link to the Privacy Policy. The choice is saved in this browser, so the banner does not come back; the footer's "Cookie settings" reopens it to change the choice. Only necessary
 * cookies are used until the visitor accepts: analytics (utils/analytics.js) starts only after consent and stops again if it is withdrawn.
 */
export default function CookieBanner() {
  const consent = useConsent()
  const request = useSettingsRequest()
  const intro = useIntroState()
  const [settings, setSettings] = useState(false)
  const [analytics, setAnalytics] = useState(consent.analytics)
  const [reopened, setReopened] = useState(false)
  const ref = useRef(null)
  const lastRequest = useRef(request)

  // the footer's "Cookie settings" asks to open the settings, whatever was chosen before
  useEffect(() => {
    if (request === lastRequest.current) return
    lastRequest.current = request
    setAnalytics(consent.analytics)
    setSettings(true)
    setReopened(true)
    window.setTimeout(() => ref.current?.focus({ preventScroll: true }), 0)
  }, [request, consent.analytics])

  const holdForIntro = intro === 'pending' || intro === 'playing' || intro === 'revealing'
  const open = reopened || !consent.decided
  if (!open || holdForIntro) return null

  const decide = (value) => { setConsent({ analytics: value }); setSettings(false); setReopened(false) }
  const close = () => { setSettings(false); setReopened(false) } // closing a reopened panel keeps the saved choice

  return (
    <section ref={ref} tabIndex={-1} role="region" aria-label="Cookie consent" data-cookie-banner
      data-cookie-banner
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[1050] mx-auto max-w-3xl rounded-2xl border border-edge-strong bg-night/95 p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] outline-none backdrop-blur-xl sm:p-5 lg:bottom-5 lg:left-5 lg:right-24 lg:mx-0">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-lav ring-1 ring-edge"><Cookie className="size-5" strokeWidth={1.75} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold leading-snug">Cookies on this website</h2>
          <p className="mt-1 text-sm leading-relaxed text-soft">
            We use necessary cookies to make the site work, and optional analytics cookies to understand how it is used. Optional cookies are used only if you accept.{' '}
            <Link to="/privacy" className="font-semibold text-fg underline underline-offset-2 hover:text-lav">Privacy Policy</Link>
          </p>
        </div>
        {reopened && <button type="button" onClick={close} aria-label="Close cookie settings" className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-soft transition-colors hover:text-fg"><X className="size-5" aria-hidden="true" /></button>}
      </div>

      {settings && (
        <ul className="mt-4 divide-y divide-edge rounded-xl border border-edge bg-glass/50" aria-label="Cookie categories">
          <li className="flex items-center justify-between gap-4 p-3.5">
            <div><p className="text-sm font-semibold">Necessary</p><p className="text-xs leading-relaxed text-soft">Keep you signed in, protect forms, and remember this choice and your display theme. Always on.</p></div>
            <Switch id="ck-necessary" checked disabled label="Necessary cookies (always on)" />
          </li>
          <li className="flex items-center justify-between gap-4 p-3.5">
            <div><p className="text-sm font-semibold">Analytics</p><p className="text-xs leading-relaxed text-soft">Anonymous statistics about visits and enquiries (Google Analytics), so we can improve the website. Off unless you turn it on.</p></div>
            <Switch id="ck-analytics" checked={analytics} onChange={setAnalytics} label="Analytics cookies" />
          </li>
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {settings ? (
          <>
            <button type="button" onClick={() => decide(analytics)} className={`${btn} bg-primary text-white hover:-translate-y-0.5`}><Check className="mr-1.5 size-4" aria-hidden="true" />Save preferences</button>
            <button type="button" onClick={() => decide(true)} className={`${btn} border border-edge-strong bg-glass text-fg hover:border-lav`}>Accept all</button>
            <button type="button" onClick={() => decide(false)} className={`${btn} border border-edge-strong bg-glass text-fg hover:border-lav`}>Reject optional</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => decide(true)} className={`${btn} bg-primary text-white hover:-translate-y-0.5`}>Accept all</button>
            <button type="button" onClick={() => decide(false)} className={`${btn} border border-edge-strong bg-glass text-fg hover:border-lav`}>Reject optional</button>
            <button type="button" onClick={() => { setAnalytics(consent.analytics); setSettings(true) }} className={`${btn} text-soft underline underline-offset-4 hover:text-fg basis-full sm:basis-auto sm:ml-auto`}>Cookie settings</button>
          </>
        )}
      </div>
    </section>
  )
}
