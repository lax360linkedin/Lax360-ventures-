import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { AlertCircle, ArrowRight, Bot, CheckCircle2, Code2, GraduationCap, Megaphone, Send, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { enquiryTypes } from '../../data/navigation.js'
import { submitEnquiry } from '../../services/enquiryService.js'
import { whatsappLink } from '../../utils/whatsapp.js'
import { EMAIL } from '../../utils/validators.js'

/**
 * The welcome contact card: right after the intro animation, on every page load (not on in-app navigation, and not for a signed-in customer) a card offers to take the visitor's contact details.
 * It is entirely OPTIONAL: "Skip for now", the close button, the Escape key and a click outside all close it and leave the website fully usable; nothing is sent unless the visitor submits.
 * Submitting goes to the same enquiry endpoint as the Contact page (stored for the team; no e-mail is claimed to have been sent).
 */
const PHONE = /^\+?[0-9][0-9\s().-]{6,19}$/
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select, textarea, [tabindex]:not([tabindex="-1"])'
const EASE = [0.22, 1, 0.36, 1]


const field = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[0.95rem] text-[#0b0b0f] placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25'
const labelCls = 'mb-1 block text-[0.8rem] font-bold text-slate-700'
const Err = ({ id, children }) => (children ? <p id={id} className="mt-1 flex items-start gap-1 text-[0.78rem] font-medium text-red-600"><AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{children}</p> : null)

export default function WelcomeContactCard({ open, onClose }) {
  const reduce = useReducedMotion()
  const { user } = useAuth()
  const panelRef = useRef(null)
  const returnRef = useRef(null)
  const [v, setV] = useState({ name: '', email: '', phone: '', interest: 'project', note: '', consent: false, website: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [serverError, setServerError] = useState('')
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })); setErrors((er) => ({ ...er, [k]: undefined })) }
  const close = useCallback(() => onClose(), [onClose])

  useEffect(() => { if (open && user) setV((s) => ({ ...s, name: s.name || user.full_name || '', email: s.email || user.email || '' })) }, [open, user])

  // dialog behaviour: page behind locked, focus trapped, Esc closes, focus returns where it was
  useEffect(() => {
    if (!open) return undefined
    returnRef.current = document.activeElement
    const root = document.documentElement
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root.setAttribute('data-contact-card', '')
    const t = setTimeout(() => panelRef.current?.querySelector('input[name="name"]')?.focus(), 350)
    const onKey = (e) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); document.body.style.overflow = prev; root.removeAttribute('data-contact-card'); document.removeEventListener('keydown', onKey); returnRef.current?.focus?.() }
  }, [open, close])

  const submit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    const found = {}
    if (v.name.trim().length < 2) found.name = 'Enter your name.'
    if (!EMAIL.test(v.email.trim())) found.email = 'Enter a valid email address.'
    if (v.phone.trim() && !PHONE.test(v.phone.trim())) found.phone = 'Enter a valid mobile number, for example +91 98765 43210.'
    if (v.note.trim() && v.note.trim().length < 10) found.note = 'A few more words, please (at least 10 characters), or leave it empty.'
    if (!v.consent) found.consent = 'Please agree so we can get back to you.'
    setErrors(found)
    if (Object.keys(found).length) { panelRef.current?.querySelector('[aria-invalid="true"]')?.focus(); return }
    setStatus('sending')
    setServerError('')
    const label = enquiryTypes.find((t) => t.id === v.interest)?.label || 'General'
    try {
      await submitEnquiry({
        type: v.interest, name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim() || undefined, consent: true, source: 'welcome-card', website: v.website,
        message: v.note.trim() || `Contact request from the website welcome card. Interested in: ${label}.`,
      })
      setStatus('sent')
    } catch (err) {
      const f = err.fields || {}
      setErrors({ name: f.name, email: f.email, phone: f.phone, note: f.message, consent: f.consent })
      setServerError(err.fields ? 'Please check the highlighted fields.' : err.message)
      setStatus('error')
    }
  }

  const bullets = [[Code2, 'Custom software, web & mobile apps'], [Bot, 'AI & business automation'], [Megaphone, 'Digital marketing that grows your reach'], [GraduationCap, 'Courses, workshops & training']]

  return (
    <AnimatePresence>
      {open && (
        <m.div className="fixed inset-0 z-[1100] flex items-end justify-center overflow-y-auto bg-[rgba(6,10,16,0.62)] p-3 backdrop-blur-md sm:items-center sm:p-6"
          initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.3 }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <m.div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="wc-title" aria-describedby="wc-desc"
            className="relative my-auto grid w-full max-w-[56rem] overflow-hidden rounded-[1.75rem] bg-white text-[#0b0b0f] shadow-[0_44px_100px_-34px_rgb(var(--glow)/0.7),0_20px_46px_-26px_rgba(0,0,0,0.6)] ring-1 ring-black/5 md:grid-cols-[0.82fr_1.18fr] md:rounded-[2rem]"
            initial={reduce ? false : { opacity: 0, y: 70, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduce ? undefined : { opacity: 0, y: 40, scale: 0.97 }} transition={{ duration: 0.6, ease: EASE }}>
            <button type="button" onClick={close} aria-label="Close and continue to the website" className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <X className="size-5" aria-hidden="true" />
            </button>

            {/* the brand panel */}
            <div className="relative hidden flex-col justify-between overflow-hidden p-8 text-white md:flex" style={{ background: 'linear-gradient(155deg, color-mix(in srgb, rgb(var(--glow)) 55%, #06121a) 0%, color-mix(in srgb, rgb(var(--glow2)) 22%, #070b14) 100%)' }}>
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full opacity-60" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow3) / 0.5), transparent 72%)' }} />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full opacity-50" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow2) / 0.45), transparent 72%)' }} />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(80% 70% at 30% 30%, #000, transparent)', WebkitMaskImage: 'radial-gradient(80% 70% at 30% 30%, #000, transparent)' }} />
              <div className="relative">
                <span className="grid size-14 place-items-center rounded-2xl border border-white/30 bg-white/15 backdrop-blur-md" style={{ boxShadow: '0 16px 36px -14px rgb(var(--glow) / 0.9), inset 0 1px 0 rgba(255,255,255,0.35)' }}><Send className="size-6" aria-hidden="true" /></span>
                <p className="mt-6 text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-white/75">LAX360 Pvt Ltd</p>
                <h2 id="wc-title" className="mt-2 font-display text-[1.9rem] font-bold leading-[1.08] tracking-tight [text-wrap:balance]">Let&apos;s build something great together.</h2>
                <p id="wc-desc" className="mt-3 text-[0.92rem] leading-relaxed text-white/80">Leave your details and tell us what you need. The team will get back to you. It takes less than a minute, and you can skip it and just explore.</p>
              </div>
              <ul className="relative mt-6 space-y-2.5">
                {bullets.map(([Icon, text]) => <li key={text} className="flex items-center gap-3 text-[0.88rem] font-medium text-white/90"><span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/25 bg-white/12"><Icon className="size-4" aria-hidden="true" /></span>{text}</li>)}
              </ul>
            </div>

            {/* the form */}
            <div className="relative p-4 pt-5 sm:p-8">
              <div aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent md:hidden" />
              {status === 'sent' ? (
                <div role="status" className="flex min-h-[22rem] flex-col items-center justify-center text-center">
                  <span className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-9" aria-hidden="true" /></span>
                  <h2 className="mt-4 font-display text-2xl font-bold">Thank you, {v.name.trim().split(' ')[0]}!</h2>
                  <p className="mt-2 max-w-sm text-slate-600">We have received your details and the team will get back to you. Meanwhile, have a look around.</p>
                  <button type="button" onClick={close} autoFocus className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, rgb(var(--glow)) 62%, #000), color-mix(in srgb, rgb(var(--glow2)) 60%, #000))', boxShadow: '0 14px 28px -12px rgb(var(--glow) / 0.9)' }}>Continue to the website <ArrowRight className="size-4" aria-hidden="true" /></button>
                </div>
              ) : (
                <form onSubmit={submit} noValidate aria-busy={status === 'sending'} className="space-y-3 sm:space-y-3.5">
                  <div className="pr-10">
                    <h2 className="font-display text-[1.25rem] font-bold leading-tight md:hidden">Let&apos;s build something great together.</h2>
                    <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-primary md:mt-0">Get in touch</p>
                    <p className="mt-1 text-[1.15rem] font-bold leading-snug text-slate-800 md:text-[1.3rem]">Share your contact details <span className="font-medium text-slate-500">(optional)</span></p>
                  </div>
                  {serverError && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-2.5 text-sm font-medium text-red-700"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{serverError}</p>}
                  <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true"><label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" value={v.website} onChange={set('website')} /></label></div>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div><label htmlFor="wc-name" className={labelCls}>Full name <span className="text-red-500" aria-hidden="true">*</span></label>
                      <input id="wc-name" name="name" className={`${field} h-10 sm:h-11`} autoComplete="name" required aria-required="true" aria-invalid={errors.name ? 'true' : undefined} aria-describedby={errors.name ? 'wc-name-e' : undefined} value={v.name} onChange={set('name')} placeholder="Your name" /><Err id="wc-name-e">{errors.name}</Err></div>
                    <div><label htmlFor="wc-phone" className={labelCls}>Mobile number <span className="font-normal text-slate-400">(optional)</span></label>
                      <input id="wc-phone" name="phone" type="tel" inputMode="tel" className={`${field} h-10 sm:h-11`} autoComplete="tel" aria-invalid={errors.phone ? 'true' : undefined} aria-describedby={errors.phone ? 'wc-phone-e' : undefined} value={v.phone} onChange={set('phone')} placeholder="+91 98765 43210" /><Err id="wc-phone-e">{errors.phone}</Err></div>
                  </div>
                  <div><label htmlFor="wc-email" className={labelCls}>Email address <span className="text-red-500" aria-hidden="true">*</span></label>
                    <input id="wc-email" name="email" type="email" inputMode="email" className={`${field} h-10 sm:h-11`} autoComplete="email" required aria-required="true" aria-invalid={errors.email ? 'true' : undefined} aria-describedby={errors.email ? 'wc-email-e' : undefined} value={v.email} onChange={set('email')} placeholder="name@example.com" /><Err id="wc-email-e">{errors.email}</Err></div>
                  <div><label htmlFor="wc-interest" className={labelCls}>What are you interested in?</label>
                    <select id="wc-interest" name="interest" className={`${field} h-10 sm:h-11`} value={v.interest} onChange={set('interest')}>{enquiryTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
                  <div><label htmlFor="wc-note" className={labelCls}>Anything you would like to add? <span className="font-normal text-slate-400">(optional)</span></label>
                    <textarea id="wc-note" name="note" rows={2} maxLength={600} className={`${field} py-2.5`} aria-invalid={errors.note ? 'true' : undefined} aria-describedby={errors.note ? 'wc-note-e' : undefined} value={v.note} onChange={set('note')} /><Err id="wc-note-e">{errors.note}</Err></div>
                  <div><label className="flex cursor-pointer items-start gap-2.5 text-[0.82rem] leading-snug text-slate-600">
                    <input type="checkbox" checked={v.consent} onChange={set('consent')} aria-invalid={errors.consent ? 'true' : undefined} className="mt-0.5 size-4 shrink-0 accent-[rgb(var(--glow))]" />
                    <span>I agree that LAX360 Pvt Ltd may contact me about this request. <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 underline">Privacy policy</a></span></label><Err>{errors.consent}</Err></div>
                  <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:items-center">
                    <button type="button" onClick={close} className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-slate-300 px-6 text-sm font-bold text-slate-600 transition-colors hover:border-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Skip for now</button>
                    <button type="submit" disabled={status === 'sending'} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, rgb(var(--glow)) 62%, #000), color-mix(in srgb, rgb(var(--glow2)) 60%, #000))', boxShadow: '0 14px 28px -12px rgb(var(--glow) / 0.9), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                      {status === 'sending' ? 'Sending…' : <>Submit details <ArrowRight className="size-4" aria-hidden="true" /></>}
                    </button>
                  </div>
                  <p className="text-center text-[0.75rem] text-slate-500">Prefer to chat? <a href={whatsappLink('Hi LAX360 Pvt Ltd, I would like to know more.')} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-700 underline">WhatsApp us<span className="sr-only"> (opens in a new tab)</span></a></p>
                </form>
              )}
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
