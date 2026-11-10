import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronRight, FileText, MapPin } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { asCompany, ownershipLabels, pinnedProfiles, relationshipLabels, softwareCategories } from '../data/network.js'
import { getDivision } from '../data/services.js'
import { offeringHref } from '../utils/slugify.js'
import { useContentReady } from '../hooks/useSite.js'
import { useNetwork, useSoftware } from '../hooks/useCmsPages.js'

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const isHttp = (u) => /^https?:\/\//.test(u || '')
const crumb = 'inline-flex min-h-9 items-center transition-colors hover:text-lav'

function BackLink() {
  return <Link to="/our-network" className="group inline-flex min-h-11 items-center gap-2 font-semibold text-lav hover:underline"><ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" /> Back to Our Network</Link>
}

/** A labelled block that is shown only when the administrator has entered something for it: nothing is invented. */
function Block({ title, children, show = true }) {
  if (!show) return null
  return <div className="glass-flat p-6"><h3 className="font-display text-xl font-semibold">{title}</h3><div className="mt-3 space-y-3 text-soft">{children}</div></div>
}
const Paras = ({ items }) => items.map((t) => <p key={t}>{t}</p>)
const Bullets = ({ items }) => <ul className="space-y-2">{items.map((t) => <li key={t} className="flex gap-2.5"><Check className="mt-1 size-4 shrink-0 text-lav" aria-hidden="true" /><span>{t}</span></li>)}</ul>
const Pending = ({ what }) => <p role="note" className="rounded-2xl border border-dashed border-edge-strong bg-glass px-5 py-4 text-soft">{what} are being confirmed with the partner and will be published here once verified.</p>

/** A related LAX360 service id ("<category>/*" or "<category>/<service>") as a link with its name. */
function serviceLink(key) {
  const [cat, sub] = key.split('/')
  const d = getDivision(cat)
  if (!d) return null
  if (sub === '*' || !sub) return { to: `/services/${cat}`, label: d.name }
  const o = d.offerings.find((x) => x.slug === sub)
  return o ? { to: offeringHref(cat, o.name), label: `${d.name} — ${o.name}` } : null
}

/**
 * /our-network/<partner> — one partnership in detail: the partner (overview), what LAX360 does with them (partnership details), the products and solutions,
 * and how the two work together (collaboration). The text comes from the admin panel (Website content > Network companies & partners); a section with nothing
 * entered says the details are being confirmed. No authorization, level, certification or benefit is stated unless an administrator has entered it.
 */
export default function NetworkPartner() {
  const { slug } = useParams()
  const companies = useNetwork()
  const software = useSoftware()
  const ready = useContentReady()
  const pin = pinnedProfiles.find((p) => p.slugs.includes(slug))
  const c = companies.find((x) => x.slug === slug) || (pin ? asCompany({ ...pin.fallback, category: 'authorized', relationship: 'authorized' }) : null)

  if (!c) {
    return (
      <PageContainer path={`/our-network/${slug}`} title="Partner not found" description="This partner is not listed on the Our Network page." noindex>
        <section className="wrap section"><BackLink /><h1 className="h2 mt-8">{ready ? 'We could not find that partner.' : 'Loading…'}</h1>{ready && <p className="mt-4 max-w-xl text-lg text-soft">It may have been renamed or removed. See every partner on the Our Network page.</p>}</section>
      </PageContainer>
    )
  }

  const products = software.filter((s) => s.vendor === c.slug)
  const label = relationshipLabels[c.relationship]
  const related = c.relatedServices.map(serviceLink).filter(Boolean)
  const intro = c.overview.length ? c.overview : [c.description]
  const hasPartnership = c.partnershipNature.length || c.partnershipType || c.collaboration.length || c.weOffer.length || c.solutions.length || c.implementationServices.length || c.supportServices.length
  const hasProducts = c.products.length || products.length || c.softwareCategories.length || c.features.length || c.adoptionHelp.length || related.length
  const hasCollab = c.collaboration.length || c.weReceive.length || c.weContribute.length || c.customerBenefits.length || c.journey.length
  const path = `/our-network/${c.slug}`
  const kindLabel = c.relationship === 'technology_provider' ? 'Technology Partner' : 'Authorised Partner'
  const kindPlural = c.relationship === 'technology_provider' ? 'Technology Partners' : 'Authorised Partners'
  const status = c.designation
    ? <span className="inline-flex items-center gap-1.5 rounded-full border border-sky/50 bg-sky/10 px-3 py-1 text-xs font-bold text-sky-700 dark:text-sky"><BadgeCheck className="size-3.5" aria-hidden="true" />{c.designation}</span>
    : <span className="inline-flex items-center rounded-full border border-edge-strong bg-glass px-3 py-1 text-xs font-semibold text-soft">Partnership designation: pending verification</span>

  return (
    <PageContainer
      path={path}
      title={`${c.name} — ${kindLabel} | Our Network`}
      description={(c.description || '').slice(0, 300)}
      jsonLd={{ '@context': 'https://schema.org', '@type': 'Organization', name: c.name, description: c.description, ...(isHttp(c.website) ? { url: c.website } : {}) }}
    >
      <section className="relative overflow-hidden border-b border-edge">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-[30rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.25), transparent)' }} />
        <div className="wrap relative pb-12 pt-8 md:pb-16">
          <nav aria-label="Breadcrumb" className="text-sm text-soft">
            <ol className="flex flex-wrap items-center gap-x-1.5">
              <li><Link to="/" className={crumb}>Home</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li><Link to="/our-network" className={crumb}>Our Network</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li><Link to={c.relationship === 'technology_provider' ? '/our-network#technology-partners' : '/our-network#authorized-partners'} className={crumb}>{kindPlural}</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li aria-current="page" className="font-semibold text-fg">{c.name}</li>
            </ol>
          </nav>
          <Reveal y={12} className="mt-8 grid items-center gap-8 lg:grid-cols-[auto_1fr]">
            {c.logo ? <img src={c.logo} alt={c.logoAlt || `${c.name} logo`} width="128" height="128" decoding="async" className="size-28 rounded-3xl border border-edge bg-white object-contain p-3 md:size-32" />
              : <span aria-hidden="true" className="flex size-28 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent font-display text-4xl font-bold text-white md:size-32">{initials(c.name)}</span>}
            <div>
              <p className="eyebrow text-lav">{kindLabel}</p>
              <h1 className="h1 mt-3 !text-[clamp(2.2rem,4.8vw,4.2rem)]">{c.name}</h1>
              <div className="mt-4 flex flex-wrap gap-2">{label && <span className="rounded-full border border-edge-strong bg-glass px-3 py-1 text-xs font-semibold">{label}</span>}{status}</div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {isHttp(c.website) && <Button href={c.website} arrow>Official website</Button>}
                <Button to="/contact?type=project" variant="secondary">Enquire about this partnership</Button>
              </div>
            </div>
          </Reveal>
          <div className="mt-8"><BackLink /></div>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="overview-title">
        <SectionHeading id="overview-title" eyebrow="Partner overview" title="About" gradient={`${c.name}.`} />
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <Reveal className="space-y-4 text-lg text-soft lg:col-span-7"><Paras items={intro} /></Reveal>
          <Reveal delay={0.06} className="glass p-6 lg:col-span-5">
            <dl className="space-y-4">
              <div><dt className="text-xs font-semibold uppercase tracking-wider text-soft">Official company name</dt><dd className="font-display text-lg font-semibold">{c.name}</dd></div>
              {c.businessCategory && <div><dt className="text-xs font-semibold uppercase tracking-wider text-soft">Industry &amp; business category</dt><dd>{c.businessCategory}</dd></div>}
              {isHttp(c.website) && <div><dt className="text-xs font-semibold uppercase tracking-wider text-soft">Official website</dt><dd><a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 break-all font-semibold text-lav hover:underline">{c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}<ArrowUpRight className="size-4 shrink-0" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></dd></div>}
              {(c.sameLocation || c.location) && <div><dt className="text-xs font-semibold uppercase tracking-wider text-soft">Location</dt><dd className="flex items-start gap-1.5"><MapPin className="mt-1 size-4 shrink-0 text-lav" aria-hidden="true" />{c.location || 'Salem'}</dd></div>}
            </dl>
          </Reveal>
        </div>
        {c.products.length > 0 && (
          <div className="mt-8"><h3 className="font-display text-xl font-semibold">Products and services offered by {c.name}</h3>
            <ul className="mt-4 flex flex-wrap gap-2">{c.products.map((p) => <li key={p} className="rounded-full border border-edge bg-glass px-3 py-1.5 text-sm font-semibold text-lav">{p}</li>)}</ul></div>
        )}
      </section>

      <section className="border-y border-edge bg-base2/50" aria-labelledby="partnership-title">
        <div className="wrap section">
          <SectionHeading id="partnership-title" eyebrow="LAX360 partnership details" title="How we are" gradient="connected." />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Block title="Nature of the partnership">
              <p>{label ? `${label}.` : 'Relationship to be confirmed.'}</p>
              <Paras items={c.partnershipNature} />
            </Block>
            <Block title="Partnership or authorization type">
              <p>{c.partnershipType || (c.designation ? c.designation : 'The exact authorization type has not been verified yet, so none is stated.')}</p>
            </Block>
            <Block title="What LAX360 does in collaboration with the partner" show={c.collaboration.length > 0}><Paras items={c.collaboration} /></Block>
            <Block title="Products or services we offer through the partnership" show={c.weOffer.length > 0}><Bullets items={c.weOffer} /></Block>
            <Block title="Solutions we provide using the partner's products" show={c.solutions.length > 0}><Bullets items={c.solutions} /></Block>
            <Block title="Implementation, configuration, customization and integration" show={c.implementationServices.length > 0}><Bullets items={c.implementationServices} /></Block>
            <Block title="Training, onboarding, technical support and customer assistance" show={c.supportServices.length > 0}><Bullets items={c.supportServices} /></Block>
          </div>
          {!hasPartnership && <div className="mt-6"><Pending what="Details of what LAX360 does with this partner, and the products, solutions and services offered through the partnership," /></div>}
        </div>
      </section>

      <section className="wrap section" aria-labelledby="products-title">
        <SectionHeading id="products-title" eyebrow="Products & solutions" title="Platforms and" gradient="capabilities." />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Block title="Relevant partner products and platforms" show={products.length > 0 || c.products.length > 0}>
            {products.length > 0
              ? <ul className="space-y-3">{products.map((p) => (
                <li key={p.slug}><p className="font-semibold text-fg">{isHttp(p.link) ? <a href={p.link} target="_blank" rel="noopener noreferrer" className="hover:text-lav hover:underline">{p.name}<span className="sr-only"> (opens in a new tab)</span></a> : p.name}</p>
                  <p className="text-sm">{softwareCategories[p.category] || p.category} · {ownershipLabels[p.ownership] || p.ownership}</p>{p.description && <p className="text-sm">{p.description}</p>}</li>))}</ul>
              : <Bullets items={c.products} />}
          </Block>
          <Block title="Software categories" show={c.softwareCategories.length > 0 || products.length > 0}>
            <ul className="flex flex-wrap gap-2">{[...new Set([...c.softwareCategories, ...products.map((p) => softwareCategories[p.category] || p.category)])].map((t) => <li key={t} className="rounded-full border border-edge bg-glass px-3 py-1 text-sm font-semibold text-lav">{t}</li>)}</ul>
          </Block>
          <Block title="Features and capabilities" show={c.features.length > 0}><Bullets items={c.features} /></Block>
          <Block title="How LAX360 helps customers adopt and use these solutions" show={c.adoptionHelp.length > 0}><Paras items={c.adoptionHelp} /></Block>
          <Block title="Related LAX360 services" show={related.length > 0}>
            <ul className="space-y-2">{related.map((r) => <li key={r.to}><Link to={r.to} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-lav hover:underline">{r.label}<ArrowRight className="size-4" aria-hidden="true" /></Link></li>)}</ul>
          </Block>
        </div>
        {!hasProducts && <div className="mt-6"><Pending what="Product, feature and related-service details" /></div>}
      </section>

      <section className="border-y border-edge bg-glass" aria-labelledby="collab-title">
        <div className="wrap section">
          <SectionHeading id="collab-title" eyebrow="Our collaboration" title="Working together," gradient="for customers." />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Block title="What we do together" show={c.collaboration.length > 0}><Paras items={c.collaboration} /></Block>
            <Block title="What LAX360 receives from the partner" show={c.weReceive.length > 0}><Paras items={c.weReceive} /></Block>
            <Block title="What LAX360 contributes" show={c.weContribute.length > 0}><Paras items={c.weContribute} /></Block>
            <Block title="How customers benefit" show={c.customerBenefits.length > 0}><Bullets items={c.customerBenefits} /></Block>
          </div>
          {c.journey.length > 0 && (
            <div className="mt-8"><h3 className="font-display text-2xl font-semibold">The customer journey</h3>
              <ol className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{c.journey.map((j, i) => (
                <Reveal as="li" key={j.title} delay={(i % 3) * 0.05} className="glass-flat p-5"><span className="font-display text-sm font-bold text-lav">Step {i + 1}</span><p className="mt-1 font-display text-lg font-semibold">{j.title}</p>{j.text && <p className="mt-1 text-soft">{j.text}</p>}</Reveal>))}</ol></div>
          )}
          {!hasCollab && <Pending what="The details of the collaboration, what each side contributes and the customer journey," />}
        </div>
      </section>

      {(c.images.length > 0 || c.documentLink || c.extraLinks.length > 0) && (
        <section className="wrap section" aria-labelledby="more-title">
          <h2 id="more-title" className="h2">More about this partnership</h2>
          {c.images.length > 0 && <ul className="mt-6 grid gap-4 sm:grid-cols-2">{c.images.map((im) => <li key={im.src}><img src={im.src} alt={im.alt} width="800" height="500" loading="lazy" decoding="async" className="aspect-[16/10] w-full rounded-2xl border border-edge object-cover" /></li>)}</ul>}
          <ul className="mt-6 flex flex-wrap gap-3">
            {isHttp(c.documentLink) && <li><a href={c.documentLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-edge-strong bg-glass px-5 font-semibold hover:border-lav"><FileText className="size-4" aria-hidden="true" />{c.documentLabel}<span className="sr-only"> (opens in a new tab)</span></a></li>}
            {c.extraLinks.map((l) => <li key={l.href}><a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-edge-strong bg-glass px-5 font-semibold hover:border-lav">{l.label}<ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></li>)}
          </ul>
        </section>
      )}

      <section className="wrap pb-16 pt-8 md:pb-24">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-edge bg-glass p-6 sm:flex-row sm:items-center">
          <BackLink />
          <Button to="/contact?type=project" arrow>Talk to us about {c.name}</Button>
        </div>
      </section>
    </PageContainer>
  )
}
