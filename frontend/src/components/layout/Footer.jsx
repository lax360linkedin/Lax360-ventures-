import { Link, useNavigate } from 'react-router-dom'
import { ArrowUp, ArrowUpRight, ChevronRight, MapPin, Phone, RotateCcw } from 'lucide-react'
import ChannelIcon, { opensNewTab } from './ChannelIcon.jsx'
import Logo from './Logo.jsx'
import OwnerLinks from './OwnerLinks.jsx'
import { footerColumns, legalLinks } from '../../data/navigation.js'
import { useBranchDirectory } from '../../hooks/useBranches.js'
import { useContacts, useNav, useSite, useSocial } from '../../hooks/useSite.js'
import { openWelcomeExperience, replayIntro } from '../../utils/welcomeIntro.js'

const ico = { strokeWidth: 1.75, 'aria-hidden': 'true' }
const linkCls = 'inline-flex min-h-10 items-center text-[0.95rem] text-soft transition-[color,transform] duration-200 hover:translate-x-0.5 hover:text-lav focus-visible:text-lav'
// One icon style everywhere in the footer: a small rounded tile with a line icon; on hover only its colour changes.
const tile = 'grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-lav ring-1 ring-edge transition-colors duration-200 group-hover/c:bg-primary group-hover/c:text-white group-hover/c:ring-transparent'

/** A column heading: small caps label with a short accent rule beneath it. */
function Heading({ id, children }) {
  return (
    <div className="mb-4">
      <h2 id={id} className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-fg">{children}</h2>
      <span aria-hidden="true" className="mt-2 block h-0.5 w-8 rounded-full bg-gradient-to-r from-primary to-accent" />
    </div>
  )
}

function FooterLink({ l }) {
  return l.external
    ? <a href={l.to} target="_blank" rel="noopener noreferrer" className={linkCls}>{l.label}<span className="sr-only"> (opens in a new tab)</span></a>
    : <Link to={l.to} className={linkCls}>{l.label}</Link>
}

/** One contact detail from the managed "Social & contact" list: icon tile, small label, value. The whole row is the link (an address is plain text). */
function ContactRow({ c }) {
  const label = c.type === 'phone' ? (c.note ? `Phone · ${c.note}` : c.label) : c.note && c.type !== 'whatsapp' ? `${c.label} · ${c.note}` : c.label
  const value = c.type === 'whatsapp' ? 'Chat with us' : c.value
  const external = opensNewTab(c)
  const body = (
    <>
      <span className={tile}><ChannelIcon channel={c} className="size-4" /></span>
      <span className="min-w-0">
        <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-soft/80">{label}</span>
        <span className="block whitespace-pre-line break-words text-[0.95rem] font-semibold text-fg transition-colors group-hover/c:text-lav">{value}{external && <span className="sr-only"> (opens in a new tab)</span>}</span>
        {c.detail && <span className="mt-0.5 block whitespace-pre-line text-sm font-normal text-soft">{c.detail}</span>}
      </span>
    </>
  )
  const cls = 'group/c flex items-center gap-3 py-1.5'
  return <li>{c.href ? <a href={c.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={cls}>{body}</a> : <div className={cls}>{body}</div>}</li>
}

/**
 * Footer, the same on every page: a closing call to action; then Company information (logo, description), Quick links, Our services and Connect with us (contact details and social profiles);
 * then Branch locations (address, phone, Google Maps link and office page of each branch); then the copyright line with the legal links. Links, contact details, social profiles and branches
 * are the ones managed in the admin panel (Navigation, Social media & contact, Branch locations); the built-in lists are only the stand-in until they load.
 */
export default function Footer() {
  const navigate = useNavigate()
  const { branches } = useBranchDirectory() // a branch with a saved Google Maps location opens exactly that place
  const services = useNav('footer_divisions', footerColumns[0].links)
  const company = useNav('footer_company', footerColumns[1].links)
  const site = useSite()
  const social = useSocial('footer')
  const contacts = useContacts('footer')
  // go Home first; the intro only plays on the homepage. Visitors who prefer reduced motion get the welcome cards without the animation.
  const replay = () => { navigate('/'); window.setTimeout(() => { if (!replayIntro()) openWelcomeExperience() }, 60) }
  return (
    <footer className="border-t border-edge bg-base2 pb-24 lg:pb-0" aria-label="Site footer">
      <div className="wrap">
        <div className="flex flex-col items-start justify-between gap-5 border-b border-edge py-10 md:flex-row md:items-center">
          <div>
            <p className="eyebrow text-lav">Ready when you are</p>
            <p className="mt-2 font-display text-2xl font-semibold leading-tight md:text-3xl">Have a business challenge to solve?</p>
          </div>
          <Link to="/contact?type=project" className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-white shadow-[0_8px_24px_-12px_rgb(var(--glow)/0.9)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5">
            Let&apos;s Talk <ArrowUpRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <section aria-label="Company information" className="sm:col-span-2 lg:col-span-4">
            <Logo />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-lav">{site.tagline}</p>
            <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-soft">
              {site.footerTagline || 'One team to build, automate and grow your business — software, AI, digital growth and training.'}
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-5">
              <li><Link to="/contact?type=quote" className={`${linkCls} font-semibold !text-fg hover:!text-lav`}>Request a quote <ChevronRight className="size-4" {...ico} /></Link></li>
              <li><Link to="/demo" className={`${linkCls} font-semibold !text-fg hover:!text-lav`}>Get a demo <ChevronRight className="size-4" {...ico} /></Link></li>
            </ul>
          </section>

          <nav aria-labelledby="footer-quick" className="lg:col-span-2">
            <Heading id="footer-quick">Quick links</Heading>
            <ul>{company.map((l) => <li key={l.to}><FooterLink l={l} /></li>)}</ul>
          </nav>

          <nav aria-labelledby="footer-services" className="lg:col-span-3">
            <Heading id="footer-services">Our services</Heading>
            <ul>{services.map((l) => <li key={l.to}><FooterLink l={l} /></li>)}</ul>
          </nav>

          <section aria-labelledby="footer-connect" className="lg:col-span-3">
            <Heading id="footer-connect">Connect with us</Heading>
            <ul>{contacts.map((c) => <ContactRow key={c.id} c={c} />)}</ul>
            {social.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Social profiles">
                {social.map((s) => (
                  <li key={s.id}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`} title={s.label}
                      className="flex size-10 items-center justify-center rounded-full border border-edge-strong bg-glass text-soft transition-colors duration-200 hover:border-lav hover:text-lav focus-visible:border-lav focus-visible:text-lav">
                      <ChannelIcon channel={s} className="size-[1.1rem]" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section aria-labelledby="footer-branches" className="border-t border-edge py-12">
          <Heading id="footer-branches">Branch locations</Heading>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => (
              <li key={b.id} className="flex flex-col rounded-2xl border border-edge bg-glass/50 p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-lav ring-1 ring-edge"><MapPin className="size-4" {...ico} /></span>
                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-semibold leading-tight"><Link to={`/locations/${b.id}`} className="inline-flex min-h-9 items-center transition-colors hover:text-lav">{b.city}</Link></h3>
                    <address className="mt-2 not-italic text-sm leading-relaxed text-soft">{(b.address || []).map((line) => <span key={line} className="block">{line}</span>)}</address>
                  </div>
                </div>
                {b.phone && (
                  <a href={`tel:${b.tel}`} className="mt-4 inline-flex min-h-10 items-center gap-2 self-start text-[0.95rem] font-semibold transition-colors hover:text-lav"><Phone className="size-4 text-lav" {...ico} />{b.phone}</a>
                )}
                <OwnerLinks type="branch" owner={b.id} name={`${b.city} branch`} socialOnly className="mt-3" />
                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-edge pt-4 text-sm font-semibold">
                  <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 text-lav transition-colors hover:text-fg">View on map<ArrowUpRight className="size-4" {...ico} /><span className="sr-only"> ({b.city} branch, opens in a new tab)</span></a>
                  <Link to={`/locations/${b.id}`} className="inline-flex min-h-9 items-center gap-1 text-soft transition-colors hover:text-lav">Office page<ChevronRight className="size-4" {...ico} /></Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-3 border-t border-edge py-6 text-sm text-soft md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {site.legalEntity}. {String(site.legalLine || '').replace(/\.$/, '') === site.legalEntity ? 'All rights reserved.' : site.legalLine}</p>
          <ul className="flex flex-wrap items-center gap-x-6">
            {legalLinks.map((l) => (
              <li key={l.to}><Link to={l.to} className="inline-flex min-h-10 items-center transition-colors hover:text-lav focus-visible:text-lav">{l.label}</Link></li>
            ))}
            <li><button type="button" onClick={replay} className="inline-flex min-h-10 items-center gap-1.5 transition-colors hover:text-lav focus-visible:text-lav"><RotateCcw className="size-3.5" {...ico} />Replay welcome intro</button></li>
            <li><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex min-h-10 items-center gap-1.5 transition-colors hover:text-lav focus-visible:text-lav"><ArrowUp className="size-3.5" {...ico} />Back to top</button></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
