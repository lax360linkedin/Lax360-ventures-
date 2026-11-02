import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import Logo from './Logo.jsx'
import Reveal from '../ui/Reveal.jsx'
import { footerColumns, legalLinks } from '../../data/navigation.js'
import { useSite } from '../../hooks/useSite.js'
import { whatsappLink } from '../../utils/whatsapp.js'
import { replayIntro } from '../../utils/welcomeIntro.js'

const linkCls = 'inline-flex min-h-11 items-center text-soft transition-colors duration-200 hover:text-lav focus-visible:text-lav'

/** Deep-violet footer: ambient light, closing CTA strip, organised links and a large typographic wordmark. */
export default function Footer() {
  const navigate = useNavigate()
  const replay = () => { navigate('/'); window.setTimeout(replayIntro, 60) } // go Home first; the intro only plays on the homepage
  const site = useSite()
  return (
    <footer className="relative overflow-hidden border-t border-edge bg-gradient-to-b from-base2 to-deep/70 pb-24 pt-20 lg:pb-0 lg:pt-28">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 size-[28rem] rounded-full bg-primary/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-10 size-[24rem] rounded-full bg-sky/10 blur-3xl" />
      <div className="wrap relative">
        <Reveal className="glass flex flex-col items-start justify-between gap-6 p-6 md:flex-row md:items-center md:p-10">
          <div>
            <p className="eyebrow text-lav">Ready when you are</p>
            <p className="mt-2 font-display text-3xl font-semibold leading-tight md:text-4xl">Have a business challenge to solve?</p>
          </div>
          <Link to="/contact?type=project" className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(168,85,247,0.9)]">
            Let&apos;s Talk <ArrowUpRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </Link>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-6 max-w-sm text-base text-soft">
              One team to build, automate and grow your business — software, AI, digital growth, CAD engineering and training.
            </p>
            <ul className="mt-5 flex gap-3" aria-label="Social profiles">
              {site.social.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-edge bg-glass px-4 text-sm font-semibold transition-[transform,border-color,color] duration-200 hover:-translate-y-0.5 hover:border-lav hover:text-lav">
                    {s.label}<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            {footerColumns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="eyebrow mb-3 font-sans text-lav">{col.title}</h2>
                <ul className="text-base">
                  {col.links.map((l) => (
                    <li key={l.to}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
                  ))}
                </ul>
              </nav>
            ))}
            <div className="col-span-2 sm:col-span-1">
              <h2 className="eyebrow mb-3 font-sans text-lav">Contact</h2>
              <ul className="text-base">
                <li className="flex items-center gap-2"><Mail className="size-4 shrink-0 text-lav" aria-hidden="true" /><a href={`mailto:${site.email}`} className={`${linkCls} break-all`}>{site.email}</a></li>
                {site.phones.map((p) => (
                  <li key={p.tel} className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-lav" aria-hidden="true" /><a href={`tel:${p.tel}`} className={linkCls}>{p.display}</a></li>
                ))}
                <li className="flex items-center gap-2"><MessageCircle className="size-4 shrink-0 text-lav" aria-hidden="true" /><a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className={linkCls}>WhatsApp</a></li>
                <li className="flex gap-2 py-2 text-soft"><MapPin className="mt-1 size-4 shrink-0 text-lav" aria-hidden="true" /><span>{site.locations}</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-edge pt-6 text-sm text-soft md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {site.legalEntity}. {site.legalLine}</p>
          <ul className="flex flex-wrap gap-x-6">
            {legalLinks.map((l) => (
              <li key={l.to}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
            ))}
            <li><button type="button" onClick={replay} className={linkCls}>Replay welcome intro</button></li>
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
