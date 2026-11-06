import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, ChevronRight, Globe, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import Logo from './Logo.jsx'
import Reveal from '../ui/Reveal.jsx'
import { footerColumns, legalLinks } from '../../data/navigation.js'
import { branches } from '../../data/branches.js'
import { useNav, useSite } from '../../hooks/useSite.js'
import { whatsappLink } from '../../utils/whatsapp.js'
import { replayIntro } from '../../utils/welcomeIntro.js'

const linkCls = 'group/l inline-flex min-h-10 items-center gap-1 text-soft transition-all duration-200 hover:translate-x-1 hover:text-lav focus-visible:text-lav'

// Simple brand marks (lucide no longer ships brand icons), 24x24, filled with currentColor.
const BRAND = {
  Instagram: 'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 4 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7C8.3 24 8.7 24 12 24s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z',
  LinkedIn: 'M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1zM7.1 20.5H3.6V9h3.5v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z',
  X: 'M18.2 2.3h3.3l-7.2 8.3 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.6l7.7-8.8L1.2 2.3H8l4.7 6.2 5.5-6.2zm-1.2 17.5h1.8L7 4.2H5.1l11.9 15.6z',
  Facebook: 'M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z',
  YouTube: 'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z',
}

function SocialIcon({ label }) {
  return BRAND[label]
    ? <svg viewBox="0 0 24 24" className="size-[1.15rem]" fill="currentColor" aria-hidden="true" focusable="false"><path d={BRAND[label]} /></svg>
    : <Globe className="size-[1.15rem]" aria-hidden="true" />
}

function FooterLink({ l }) {
  const inner = <><ChevronRight className="size-3.5 -ml-1 opacity-0 transition-opacity duration-200 group-hover/l:opacity-100" aria-hidden="true" />{l.label}</>
  return l.external
    ? <a href={l.to} target="_blank" rel="noopener noreferrer" className={linkCls}>{inner}<span className="sr-only"> (opens in a new tab)</span></a>
    : <Link to={l.to} className={linkCls}>{inner}</Link>
}

/** Footer: closing CTA, then brand + socials, quick links, services, branches and contact, and a large typographic wordmark. Same on every page. */
export default function Footer() {
  const navigate = useNavigate()
  const services = useNav('footer_divisions', footerColumns[0].links)
  const company = useNav('footer_company', footerColumns[1].links)
  const replay = () => { navigate('/'); window.setTimeout(replayIntro, 60) } // go Home first; the intro only plays on the homepage
  const site = useSite()
  const heading = 'mb-4 flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.16em] text-lav'
  const bar = <span aria-hidden="true" className="h-0.5 w-5 rounded-full bg-gradient-to-r from-primary to-accent" />
  return (
    <footer className="relative overflow-hidden border-t border-edge bg-gradient-to-b from-base2 to-deep/70 pb-24 pt-14 lg:pb-0 lg:pt-20">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 size-[28rem] rounded-full bg-primary/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-10 size-[24rem] rounded-full bg-sky/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgb(var(--glow2)/0.25)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(180deg,#000,transparent_55%)]" />
      <div className="wrap relative">
        <Reveal className="glass relative flex flex-col items-start justify-between gap-6 overflow-hidden p-6 md:flex-row md:items-center md:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <p className="eyebrow text-lav">Ready when you are</p>
            <p className="mt-2 font-display text-3xl font-semibold leading-tight md:text-4xl">Have a business challenge to solve?</p>
          </div>
          <Link to="/contact?type=project" className="group relative inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-white shadow-[0_8px_24px_-10px_rgb(var(--glow)/0.9)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgb(var(--glow2)/0.9)]">
            Let&apos;s Talk <ArrowUpRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </Link>
        </Reveal>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-4">
            <Logo />
            <p className="mt-5 max-w-sm text-base text-soft">
              {site.footerTagline || 'One team to build, automate and grow your business — software, AI, digital growth and training.'}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2.5" aria-label="Social profiles">
              {site.social.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`} title={s.label}
                    className="flex size-11 items-center justify-center rounded-full border border-edge-strong bg-glass text-soft transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:bg-gradient-to-br hover:from-primary hover:to-accent hover:text-white hover:shadow-[0_10px_24px_-10px_rgb(var(--glow2)/0.9)] focus-visible:text-lav">
                    <SocialIcon label={s.label} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Quick links" className="lg:col-span-2">
            <h2 className={heading}>{bar}Quick links</h2>
            <ul>{company.map((l) => <li key={l.to}><FooterLink l={l} /></li>)}</ul>
          </nav>

          <nav aria-label="Our services" className="lg:col-span-2">
            <h2 className={heading}>{bar}Our services</h2>
            <ul>{services.map((l) => <li key={l.to}><FooterLink l={l} /></li>)}</ul>
          </nav>

          <div className="lg:col-span-4">
            <h2 className={heading}>{bar}Get in touch</h2>
            <ul className="space-y-1">
              <li><a href={`mailto:${site.email}`} className="group/c flex min-h-10 items-center gap-3 text-soft transition-colors hover:text-lav"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-glass text-lav ring-1 ring-edge transition-colors group-hover/c:bg-primary group-hover/c:text-white"><Mail className="size-4" aria-hidden="true" /></span><span className="break-all">{site.email}</span></a></li>
              {site.phones.map((p) => (
                <li key={p.tel}><a href={`tel:${p.tel}`} className="group/c flex min-h-10 items-center gap-3 text-soft transition-colors hover:text-lav"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-glass text-lav ring-1 ring-edge transition-colors group-hover/c:bg-primary group-hover/c:text-white"><Phone className="size-4" aria-hidden="true" /></span>{p.display}{p.label && <span className="text-sm">({p.label})</span>}</a></li>
              ))}
              <li><a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="group/c flex min-h-10 items-center gap-3 text-soft transition-colors hover:text-lav"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-glass text-lav ring-1 ring-edge transition-colors group-hover/c:bg-primary group-hover/c:text-white"><MessageCircle className="size-4" aria-hidden="true" /></span>WhatsApp<span className="sr-only"> (opens in a new tab)</span></a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-edge pt-8">
          <h2 className={heading}>{bar}Our branches</h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {branches.map((b) => (
              <li key={b.id} className="group rounded-2xl border border-edge bg-glass/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-edge-strong hover:bg-glass-strong">
                <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 focus-visible:text-lav">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><MapPin className="size-4" aria-hidden="true" /></span>
                  <span>
                    <span className="block font-display text-lg font-semibold leading-tight">{b.city}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-soft">{b.address.join(', ')}</span>
                    <span className="sr-only"> (view on map, opens in a new tab)</span>
                  </span>
                </a>
                <a href={`tel:${b.tel}`} className="mt-3 inline-flex min-h-9 items-center gap-2 pl-12 text-sm font-semibold text-lav transition-colors hover:text-fg"><Phone className="size-3.5" aria-hidden="true" />{b.phone}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-edge pt-6 text-sm text-soft md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {site.legalEntity}. {site.legalLine}</p>
          <ul className="flex flex-wrap gap-x-6">
            {legalLinks.map((l) => (
              <li key={l.to}><Link to={l.to} className="inline-flex min-h-10 items-center transition-colors hover:text-lav focus-visible:text-lav">{l.label}</Link></li>
            ))}
            <li><button type="button" onClick={replay} className="inline-flex min-h-10 items-center transition-colors hover:text-lav focus-visible:text-lav">Replay welcome intro</button></li>
          </ul>
        </div>
      </div>

      {/* large typographic wordmark: decorative sign-off, gradient fades out at the bottom */}
      <p
        aria-hidden="true"
        className="wrap relative mt-10 select-none whitespace-nowrap text-center font-display font-semibold leading-[0.78] tracking-tighter lg:mt-6"
        style={{
          fontSize: 'clamp(4.5rem, 21vw, 21rem)',
          marginBottom: '-0.1em',
          background: 'linear-gradient(180deg, var(--wordmark-a) 0%, var(--wordmark-b) 70%, transparent 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        LAX360
      </p>
    </footer>
  )
}
