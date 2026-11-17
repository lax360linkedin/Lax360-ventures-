import { Link, useNavigate } from 'react-router-dom'
import { ArrowUp, ArrowUpRight, Building2, ChevronRight, Compass, Headset, Layers, MapPin, Navigation, Phone, RotateCcw } from 'lucide-react'
import ChannelIcon, { opensNewTab } from './ChannelIcon.jsx'
import Logo from './Logo.jsx'
import OwnerLinks from './OwnerLinks.jsx'
import Reveal from '../ui/Reveal.jsx'
import { footerColumns, legalLinks } from '../../data/navigation.js'
import { useBranchDirectory } from '../../hooks/useBranches.js'
import { useContacts, useNav, useSite, useSocial } from '../../hooks/useSite.js'
import { openWelcomeExperience, replayIntro } from '../../utils/welcomeIntro.js'

const linkCls = 'group/l inline-flex min-h-10 items-center gap-1 text-soft transition-all duration-300 ease-out hover:translate-x-1.5 hover:text-lav focus-visible:text-lav'

/** One icon style for the whole footer: a rounded tile with a soft gradient; it fills with the brand gradient (and tilts a little) when its row is hovered. */
const tile = 'grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-accent/10 text-lav ring-1 ring-edge transition-all duration-300 group-hover/c:-rotate-6 group-hover/c:from-primary group-hover/c:to-accent group-hover/c:text-white group-hover/c:shadow-[0_10px_22px_-10px_rgb(var(--glow2)/0.9)] group-hover/c:ring-transparent'
const ico = { strokeWidth: 1.75, 'aria-hidden': 'true' }

/** A contact row from the managed "Social & contact" list: icon tile, a small label above the value (hierarchy); the whole row is the link (an address is plain text). */
function ContactRow({ c }) {
  const label = c.type === 'phone' ? (c.note ? `Phone · ${c.note}` : c.label) : c.note && c.type !== 'whatsapp' ? `${c.label} · ${c.note}` : c.label
  const value = c.type === 'whatsapp' ? 'Chat with us' : c.value
  const external = opensNewTab(c)
  const body = (
    <>
      <span className={`${tile} size-11`}><ChannelIcon channel={c} className="size-[1.15rem]" /></span>
      <span className="min-w-0">
        <span className="block text-[0.68rem] font-bold uppercase tracking-[0.14em] text-soft/80">{label}</span>
        <span className="block whitespace-pre-line break-words text-[0.95rem] font-semibold text-fg transition-colors group-hover/c:text-lav">{value}{external && <span className="sr-only"> (opens in a new tab)</span>}</span>
        {c.detail && <span className="mt-0.5 block whitespace-pre-line text-sm font-normal text-soft">{c.detail}</span>}
      </span>
      {c.href && <ArrowUpRight className="ml-auto size-4 shrink-0 -translate-x-1 text-lav opacity-0 transition-all duration-300 group-hover/c:translate-x-0 group-hover/c:opacity-100" aria-hidden="true" />}
    </>
  )
  const cls = 'group/c -ml-1.5 flex items-center gap-3.5 rounded-2xl p-1.5 text-soft transition-colors duration-200 hover:bg-glass hover:text-fg focus-visible:bg-glass'
  return <li>{c.href ? <a href={c.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={cls}>{body}</a> : <div className={cls}>{body}</div>}</li>
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
  const { branches } = useBranchDirectory() // the published branches from the database (Admin > Branch locations); a branch with a saved Google Maps location opens exactly that place
  const services = useNav('footer_divisions', footerColumns[0].links)
  const company = useNav('footer_company', footerColumns[1].links)
  // go Home first; the intro only plays on the homepage. Visitors who prefer reduced motion get the welcome cards without the animation.
  const replay = () => { navigate('/'); window.setTimeout(() => { if (!replayIntro()) openWelcomeExperience() }, 60) }
  const site = useSite()
  const social = useSocial('footer')
  const contacts = useContacts('footer')
  const heading = 'mb-5 flex items-center gap-2.5 font-sans text-xs font-bold uppercase tracking-[0.18em] text-fg'
  const Head = ({ icon: Icon, children }) => (
    <h2 className={heading}>
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-[0_6px_16px_-8px_rgb(var(--glow)/0.9)]"><Icon className="size-4" {...ico} /></span>
      {children}
      <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-edge-strong to-transparent" />
    </h2>
  )
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
            {social.length > 0 && <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-fg">Follow us</p>}
            <ul className="mt-3 flex flex-wrap gap-2.5" aria-label="Social profiles">
              {social.map((s) => (
                <li key={s.id}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`} title={s.label}
                    className="flex size-11 items-center justify-center rounded-full border border-edge-strong bg-glass text-soft transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-105 hover:border-transparent hover:bg-gradient-to-br hover:from-primary hover:to-accent hover:text-white hover:shadow-[0_12px_26px_-10px_rgb(var(--glow2)/0.95)] focus-visible:-translate-y-1 focus-visible:text-lav">
                    <ChannelIcon channel={s} className="size-[1.15rem]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Quick links" className="lg:col-span-2">
            <Head icon={Compass}>Quick links</Head>
            <ul>{company.map((l) => <li key={l.to}><FooterLink l={l} /></li>)}</ul>
          </nav>

          <nav aria-label="Our services" className="lg:col-span-2">
            <Head icon={Layers}>Our services</Head>
            <ul>{services.map((l) => <li key={l.to}><FooterLink l={l} /></li>)}</ul>
          </nav>

          <div className="lg:col-span-4">
            <Head icon={Headset}>Get in touch</Head>
            <ul className="space-y-2">
              {contacts.map((c) => <ContactRow key={c.id} c={c} />)}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-edge pt-8">
          <Head icon={Building2}>Our branches</Head>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => (
              <li key={b.id} className="group/c group/b relative flex flex-col overflow-hidden rounded-2xl border border-edge bg-glass/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-edge-strong hover:bg-glass-strong hover:shadow-[0_22px_44px_-26px_rgb(var(--glow)/0.7)]">
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lav to-transparent opacity-0 transition-opacity duration-300 group-hover/b:opacity-100" />
                <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3.5 focus-visible:text-lav">
                  <span className={`${tile} size-11`}><MapPin className="size-[1.15rem]" {...ico} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-semibold leading-tight transition-colors group-hover/b:text-lav">{b.city}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-soft">{(b.address || []).join(', ')}</span>
                    <span className="sr-only"> (view on map, opens in a new tab)</span>
                  </span>
                </a>
                <OwnerLinks type="branch" owner={b.id} name={`${b.city} branch`} socialOnly className="mt-4" />
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-edge pt-4">
                  <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="group/a inline-flex min-h-9 items-center gap-1.5 rounded-full border border-edge-strong bg-glass px-3.5 text-[0.8rem] font-semibold text-fg transition-all duration-300 hover:border-transparent hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-white">
                    <Navigation className="size-3.5 transition-transform duration-300 group-hover/a:rotate-12" {...ico} />View on map<ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover/a:-translate-y-0.5 group-hover/a:translate-x-0.5" {...ico} /><span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  {b.phone && <a href={`tel:${b.tel}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-[0.8rem] font-semibold text-lav transition-colors hover:text-fg"><Phone className="size-3.5" {...ico} />{b.phone}</a>}
                </div>
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
            <li><button type="button" onClick={replay} className="group/r inline-flex min-h-10 items-center gap-1.5 transition-colors hover:text-lav focus-visible:text-lav"><RotateCcw className="size-3.5 transition-transform duration-500 group-hover/r:-rotate-180" {...ico} />Replay welcome intro</button></li>
            <li><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group/t inline-flex min-h-10 items-center gap-1.5 transition-colors hover:text-lav focus-visible:text-lav"><ArrowUp className="size-3.5 transition-transform duration-300 group-hover/t:-translate-y-0.5" {...ico} />Back to top</button></li>
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
