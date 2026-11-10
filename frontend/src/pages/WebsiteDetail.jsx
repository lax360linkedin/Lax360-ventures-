import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Info, Smartphone } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { KindBadge, TypeBadge, WebsiteCard, WebsiteShot } from '../components/websites/WebsiteBits.jsx'
import { useWebsites, websiteKinds, websiteTypes } from '../hooks/useWebsites.js'
import { useContentReady } from '../hooks/useSite.js'
import NotFound from './NotFound.jsx'

const crumb = 'inline-flex min-h-9 items-center transition-colors hover:text-lav'

/**
 * /websites/<slug> — one website in detail: overview, type (and what that means), features, modules, mobile view, admin and content management (only when the
 * website has one), technologies, screenshots and the live website. Every section is shown only when the administrator has entered something for it.
 */
export default function WebsiteDetail() {
  const { slug } = useParams()
  const sites = useWebsites()
  const ready = useContentReady()
  const [shot, setShot] = useState(0)
  const [live, setLive] = useState(false)
  const s = sites.find((x) => x.slug === slug)
  if (!s) return ready ? <NotFound /> : <div className="wrap section min-h-[50vh]" role="status"><p className="text-soft">Loading…</p></div>
  const related = [...sites.filter((x) => x.slug !== s.slug && x.category === s.category), ...sites.filter((x) => x.slug !== s.slug && x.category !== s.category)].slice(0, 3)
  const explore = s.url && <Button href={s.url} arrow>Explore Live Website</Button>

  return (
    <PageContainer path={`/websites/${s.slug}`} title={`${s.name} — ${s.category} website`} description={s.summary}
      jsonLd={{ '@context': 'https://schema.org', '@type': 'WebSite', name: s.name, description: s.summary, ...(s.url ? { url: s.url } : {}) }}>
      <section className="relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night">
        <div aria-hidden="true" className="absolute -left-28 top-10 -z-10 size-[24rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="wrap pb-14 pt-8 md:pt-10 lg:pb-20">
          <nav aria-label="Breadcrumb" className="text-sm text-soft">
            <ol className="flex flex-wrap items-center gap-x-1.5">
              <li><Link to="/" className={crumb}>Home</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li><Link to="/products" className={crumb}>Products</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li><Link to="/websites" className={crumb}>Websites</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li aria-current="page" className="font-semibold text-fg">{s.name}</li>
            </ol>
          </nav>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <div className="flex flex-wrap items-center gap-2"><KindBadge kind={s.kind} /><TypeBadge type={s.type} /></div>
              <p className="eyebrow mt-5 text-lav">{s.category}</p>
              <h1 className="h1 mt-2 !text-[clamp(2rem,4.2vw,3.4rem)]">{s.name}</h1>
              <p className="lead mt-5 text-soft">{s.summary}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {explore || <span className="inline-flex min-h-12 items-center rounded-full border border-dashed border-edge-strong px-6 font-semibold text-soft">Live link coming soon</span>}
                <Button to="/contact?type=website-app" variant="secondary">Get a similar website</Button>
              </div>
              <Link to="/websites" className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-soft transition-colors hover:text-lav"><ArrowLeft className="size-4" aria-hidden="true" />All websites</Link>
            </div>
            <Reveal x={24} y={0} className="lg:col-span-7">
              <div className="overflow-hidden rounded-[1.5rem] border border-edge-strong shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]"><div className="aspect-[16/10]"><WebsiteShot site={s} eager /></div></div>
            </Reveal>
          </div>
        </div>
      </section>

      {(s.overview.length > 0 || s.kind) && (
        <section className="wrap section grid gap-10 lg:grid-cols-12 lg:gap-14" aria-labelledby="overview-title">
          <Reveal className="lg:col-span-7">
            <h2 id="overview-title" className="h2">Overview and purpose</h2>
            <div className="mt-5 space-y-4 text-lg text-soft">{s.overview.length ? s.overview.map((t) => <p key={t}>{t}</p>) : <p>{s.summary}</p>}</div>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-5">
            <dl className="glass space-y-4 p-6 md:p-8">
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-soft">Industry</dt><dd className="font-display text-lg font-semibold">{s.category}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-soft">Kind of website</dt><dd><span className="font-semibold">{websiteKinds[s.kind].label}.</span> <span className="text-soft">{websiteKinds[s.kind].note}</span></dd></div>
              {s.type && <div><dt className="text-xs font-semibold uppercase tracking-wider text-soft">Website type</dt><dd className="font-semibold">{websiteTypes[s.type].label}</dd></div>}
              {s.url && <div><dt className="text-xs font-semibold uppercase tracking-wider text-soft">Live website</dt><dd><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 break-all font-semibold text-lav hover:underline">{s.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}<ArrowUpRight className="size-4 shrink-0" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></dd></div>}
            </dl>
          </Reveal>
        </section>
      )}

      {s.type && (
        <section className="border-y border-edge bg-glass" aria-labelledby="type-title">
          <div className="wrap section grid gap-6 md:grid-cols-12">
            <div className="md:col-span-4"><p className="eyebrow text-lav">Website type</p><h2 id="type-title" className="h2 mt-2">{websiteTypes[s.type].label}</h2></div>
            <div className="space-y-3 text-lg text-soft md:col-span-8"><p className="flex gap-3"><Info className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" />{websiteTypes[s.type].note}</p>{s.typeReason && s.typeReason !== websiteTypes[s.type].note && <p>{s.typeReason}</p>}</div>
          </div>
        </section>
      )}

      {s.features.length > 0 && (
        <section className="wrap section" aria-labelledby="features-title">
          <SectionHeading id="features-title" eyebrow="Features" title="Features and" gradient="functionality." lead="What the live website offers its visitors." />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {s.features.map((f, i) => (
              <Reveal as="li" key={`${f.title}${i}`} delay={(i % 2) * 0.05} className="glass-flat flex gap-3 p-5">
                <Check className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" />
                <div><p className="font-semibold">{f.title}</p>{f.text && <p className="mt-1 text-soft">{f.text}</p>}</div>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {s.modules.length > 0 && (
        <section className="border-y border-edge bg-base2/50" aria-labelledby="modules-title">
          <div className="wrap section">
            <SectionHeading id="modules-title" eyebrow="Modules" title="Modules and" gradient="sections." lead="The parts the website is made of." />
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {s.modules.map((m, i) => (
                <Reveal as="li" key={`${m.title}${i}`} delay={(i % 3) * 0.05} className="glass-flat lift p-6">
                  <span className="font-display text-sm font-bold text-lav">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-2 font-display text-lg font-semibold leading-tight">{m.title}</h3>
                  {m.text && <p className="mt-2 text-soft">{m.text}</p>}
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(s.mobile || s.responsive.length > 0) && (
        <section className="wrap section grid items-center gap-10 lg:grid-cols-12" aria-labelledby="mobile-title">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-2 text-lav"><Smartphone className="size-4" aria-hidden="true" />Responsive design</p>
            <h2 id="mobile-title" className="h2 mt-2">On a phone.</h2>
            <div className="mt-5 space-y-4 text-lg text-soft">{s.responsive.length ? s.responsive.map((t) => <p key={t}>{t}</p>) : <p>This is the live website captured at a phone-sized width.</p>}</div>
          </Reveal>
          {s.mobile && <Reveal delay={0.08} className="lg:col-span-5"><img src={s.mobile} alt={`${s.name} at phone width`} width="500" height="1000" loading="lazy" decoding="async" className="mx-auto max-h-[34rem] w-auto rounded-[1.75rem] border-4 border-edge-strong object-cover object-top shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]" /></Reveal>}
        </section>
      )}

      {s.adminCms.length > 0 && (
        <section className="border-y border-edge bg-glass" aria-labelledby="cms-title">
          <div className="wrap section grid gap-6 md:grid-cols-12"><div className="md:col-span-4"><p className="eyebrow text-lav">Content management</p><h2 id="cms-title" className="h2 mt-2">Admin panel.</h2></div><div className="space-y-4 text-lg text-soft md:col-span-8">{s.adminCms.map((t) => <p key={t}>{t}</p>)}</div></div>
        </section>
      )}

      {s.technologies.length > 0 && (
        <section className="wrap section" aria-labelledby="tech-title">
          <h2 id="tech-title" className="h2">Technologies</h2>
          <p className="mt-2 text-soft">Only what has been verified from the live website.</p>
          <ul className="mt-6 flex flex-wrap gap-2">{s.technologies.map((t) => <li key={t} className="rounded-full border border-edge-strong bg-glass px-4 py-2 text-sm font-semibold">{t}</li>)}</ul>
        </section>
      )}

      {s.screenshots.length > 0 && (
        <section className="wrap section" aria-labelledby="shots-title">
          <SectionHeading id="shots-title" eyebrow="Screenshots" title="Website" gradient="previews." lead="Captured from the live website." />
          <div className="mt-10 overflow-hidden rounded-[1.5rem] border border-edge-strong bg-glass shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]"><img src={s.screenshots[shot]} alt={`${s.name} screenshot ${shot + 1}`} width="1200" height="750" loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover object-top" /></div>
          {s.screenshots.length > 1 && (
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6" aria-label="Screenshots">
              {s.screenshots.map((x, i) => <li key={x}><button type="button" onClick={() => setShot(i)} aria-label={`Show screenshot ${i + 1}`} aria-pressed={shot === i} className={`block w-full overflow-hidden rounded-xl border-2 transition-colors ${shot === i ? 'border-lav' : 'border-edge hover:border-edge-strong'}`}><img src={x} alt="" width="300" height="190" loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover object-top" /></button></li>)}
            </ul>
          )}
        </section>
      )}

      {s.url && (
        <section className="border-t border-edge bg-glass" aria-labelledby="live-title">
          <div className="wrap section">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl"><p className="eyebrow text-lav">Live website</p><h2 id="live-title" className="h2 mt-2">Explore it <span className="text-gradient">yourself.</span></h2><p className="mt-3 text-soft">Open the live website in a new tab{s.embed ? ', or load it here on this page' : ''}. No login is needed.</p></div>
              <div className="flex flex-col gap-3 sm:flex-row">{explore}{s.embed && <button type="button" onClick={() => setLive((v) => !v)} aria-expanded={live} className="inline-flex min-h-12 items-center justify-center rounded-full border border-edge-strong px-6 font-semibold transition-colors hover:border-lav">{live ? 'Hide live preview' : 'Show live preview here'}</button>}</div>
            </div>
            {s.embed && live && (
              <div className="mt-6">
                <iframe src={s.url} title={`${s.name} live preview`} loading="lazy" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" referrerPolicy="no-referrer" className="h-[36rem] w-full rounded-2xl border border-edge-strong bg-white" />
                <p className="mt-2 text-sm text-soft">If the preview stays blank, the website does not allow embedding: use the screenshots above and “Explore Live Website”.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="wrap section" aria-labelledby="more-title">
          <div className="flex items-end justify-between gap-4"><SectionHeading id="more-title" eyebrow="More websites" title="Related" gradient="websites." /><Link to="/websites" className="link-underline hidden min-h-11 items-center font-semibold text-lav sm:inline-flex">View all</Link></div>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.map((o, i) => <WebsiteCard key={o.slug} site={o} delay={i * 0.06} />)}</ul>
        </section>
      )}
    </PageContainer>
  )
}
