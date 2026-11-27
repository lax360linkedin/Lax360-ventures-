import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BadgeCheck, Building2, GraduationCap, Handshake, MapPin, Sparkles } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import { canonicalSlug, relationshipLabels } from '../../data/network.js'
import { branches } from '../../data/branches.js'

/**
 * The partner ecosystem of the Our Network page, in separate sections: the group company (Fatcat Wealthy), IT & Software Partners, Cybersecurity Partners, Education & Training Partners
 * (CADPOINT Salem Branch) and Digital Marketing Partners. The companies come from the admin panel (Website content > Network companies & partners) over the built-in profiles in data/network.json:
 * a company's Business division (or category) decides its section, "Established through" says whether it is a direct or a group-company partnership, and only a VERIFIED designation is shown.
 * Nothing here states a reseller right, certification or partnership level that has not been verified.
 */
export const ECOSYSTEM_SECTIONS = [
  { id: 'group-company', label: 'Group Company', key: 'group' },
  { id: 'it-software-partners', label: 'IT & Software Partners', key: 'it' },
  { id: 'cybersecurity-partners', label: 'Cybersecurity Partners', key: 'cyber' },
  { id: 'education-partners', label: 'Education & Training Partners', key: 'education' },
  { id: 'digital-marketing-partners', label: 'Digital Marketing Partners', key: 'dm' },
]
const DIVISION_SECTION = { group: 'group', it: 'it', cybersecurity: 'cyber', education: 'education', 'digital-marketing': 'dm' }
const CATEGORY_SECTION = { group: 'group', it_software: 'it', technology: 'it', authorized: 'it', reseller: 'it', implementation: 'it', cybersecurity: 'cyber', education: 'education', digital_marketing: 'dm' }
const DIVISION_LABEL = { group: 'Group company', it: 'IT & Software', cybersecurity: 'Cybersecurity', education: 'Education & Training', 'digital-marketing': 'Digital Marketing' }
const salem = branches.find((b) => b.id === 'salem') || branches[0]
const isHttp = (u) => /^https?:\/\//.test(u || '')
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

export const sectionOf = (c) => (canonicalSlug(c.slug) === 'cadpoint-salem' ? 'education' : DIVISION_SECTION[c.division] || CATEGORY_SECTION[c.category] || null)

/** The companies of each section, in the order they were given. */
export function groupEcosystem(companies) {
  const out = { group: [], it: [], cyber: [], education: [], dm: [] }
  companies.forEach((c) => { const k = sectionOf(c); if (k) out[k].push(c) })
  return out
}

function Logo({ c, size = 'size-16' }) {
  return c.logo
    ? <img src={c.logo} alt={c.logoAlt || `${c.name} logo`} width="72" height="72" loading="lazy" decoding="async" className={`${size} shrink-0 rounded-2xl border border-edge bg-white object-contain p-2`} />
    : <span aria-hidden="true" className={`${size} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent font-display text-xl font-bold text-white`}>{initials(c.name)}</span>
}

/** Direct LAX360 partnership, or one established through a group company: always stated, never implied. */
function Route({ c }) {
  if (c.category === 'group' || c.relationship === 'group_company') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-lav"><Building2 className="size-3.5" aria-hidden="true" />Company within the LAX360 business group</span>
  if (c.establishedVia) return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-lav"><Building2 className="size-3.5" aria-hidden="true" />Established through {c.establishedVia}</span>
  if (c.relationship === 'operated') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-lav"><Handshake className="size-3.5" aria-hidden="true" />Operated by LAX360 Pvt Ltd</span>
  if (c.relationship === 'collaboration') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-lav"><Handshake className="size-3.5" aria-hidden="true" />Collaboration with the LAX360 business group</span>
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-lav"><Handshake className="size-3.5" aria-hidden="true" />Direct LAX360 partnership</span>
}

const STATUS = { planned: 'Partnership being finalised', paused: 'Partnership paused' }

/** Chips: the partnership type, a VERIFIED designation, and the status when it is not active. */
function Chips({ c }) {
  const type = c.partnershipType || relationshipLabels[c.relationship]
  return (
    <div className="flex flex-wrap gap-2">
      {type && <span className="rounded-full border border-edge-strong bg-glass px-3 py-1 text-xs font-semibold">{type}</span>}
      {c.designation && <span className="inline-flex items-center gap-1.5 rounded-full border border-sky/50 bg-sky/10 px-3 py-1 text-xs font-bold text-sky"><BadgeCheck className="size-3.5" aria-hidden="true" />{c.designation}</span>}
      {STATUS[c.partnershipStatus] && <span className="rounded-full border border-amber-400/60 bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">{STATUS[c.partnershipStatus]}</span>}
    </div>
  )
}

function Website({ c, className = '' }) {
  return isHttp(c.website)
    ? <a href={c.website} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[var(--btn-hover)] ${className}`}>{c.ctaLabel === 'Visit website' ? 'Visit Website' : c.ctaLabel}<ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (official website, opens in a new tab)</span></a>
    : <span className={`inline-flex min-h-11 items-center rounded-full border border-dashed border-edge-strong px-5 text-sm font-semibold text-soft ${className}`}>Official website to be added</span>
}

/** A partner profile card: logo, name, division, partnership type and route, expertise, introduction, products and services, website and details. */
export function PartnerCard({ c }) {
  const division = DIVISION_LABEL[c.division] || DIVISION_LABEL[Object.keys(DIVISION_SECTION).find((k) => DIVISION_SECTION[k] === sectionOf(c))]
  return (
    <article className="glass-flat lift group relative flex h-full flex-col overflow-hidden">
      <span aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-primary to-accent opacity-80 transition-opacity group-hover:opacity-100" />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <Logo c={c} />
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold leading-tight"><Link to={`/our-network/${c.slug}`} className="after:absolute after:inset-0 after:content-['']">{c.name}<span className="sr-only"> — view partnership details</span></Link></h3>
            {division && <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-soft">{division}</p>}
          </div>
        </div>
        <Route c={c} />
        <Chips c={c} />
        {c.businessCategory && <p className="text-sm"><span className="font-semibold">Area of expertise: </span><span className="text-soft">{c.businessCategory}</span></p>}
        <p className="text-soft">{c.description}</p>
        {c.products.length > 0 && <ul className="flex flex-wrap gap-1.5" aria-label={`${c.name} products and services`}>{c.products.slice(0, 6).map((p) => <li key={p} className="rounded-full border border-edge bg-glass px-2.5 py-1 text-xs font-semibold text-lav">{p}</li>)}</ul>}
        {c.certificateImage && <img src={c.certificateImage} alt={c.certificateAlt || `${c.name} partnership certificate`} loading="lazy" decoding="async" className="h-28 w-auto max-w-full self-start rounded-lg border border-edge object-contain" />}
        <div className="relative z-10 mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
          <Website c={c} />
          <span aria-hidden="true" className="inline-flex items-center gap-1 text-sm font-semibold text-lav">Details <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
        </div>
      </div>
    </article>
  )
}

function Block({ id, eyebrow, title, gradient, lead, tone = '', children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-[calc(var(--header-bottom,92px)+var(--netnav-h,64px)+1rem)] ${tone}`}>
      <div className="wrap section">
        <SectionHeading id={`${id}-title`} eyebrow={eyebrow} title={title} gradient={gradient} lead={lead} />
        {children}
      </div>
    </section>
  )
}

/** Shown while a category has no partner yet (never a made-up company). */
function Waiting({ title, text }) {
  return (
    <Reveal className="mt-8 rounded-3xl border border-dashed border-edge-strong bg-glass p-6 text-center md:p-10">
      <Sparkles className="mx-auto size-7 text-lav" aria-hidden="true" />
      <p className="mt-3 font-display text-xl font-semibold md:text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-soft">{text}</p>
    </Reveal>
  )
}

/** The group company: another company within the LAX360 business group, with the partnerships established through it. */
function GroupCompany({ list, through }) {
  return (
    <Block id="group-company" eyebrow="Our group company" title="Our Group Company —" gradient="Fatcat Wealthy." tone="border-y border-edge bg-glass"
      lead="Fatcat Wealthy is another company within our business group. It is not an external partner, and LAX360 has established several technology and business partnerships through it.">
      {list.length === 0 ? <Waiting title="Group companies will be listed here." text="Companies within the LAX360 business group appear here once their details are published." /> : (
        <div className="mt-10 space-y-6">
          {list.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.06}>
              <article className="glass relative overflow-hidden p-6 md:p-10">
                <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative grid gap-8 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    <div className="flex items-center gap-4"><Logo c={c} size="size-20" /><div><h3 className="font-display text-3xl font-semibold leading-tight">{c.name}</h3><p className="mt-1"><Route c={c} /></p></div></div>
                    <div className="mt-4"><Chips c={c} /></div>
                    {c.businessCategory && <p className="mt-4 text-sm"><span className="font-semibold">What it does: </span><span className="text-soft">{c.businessCategory}</span></p>}
                    <div className="mt-3 space-y-3 text-lg text-soft">{(c.overview.length ? c.overview : [c.description]).map((p) => <p key={p}>{p}</p>)}</div>
                    {c.products.length > 0 && <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${c.name} services`}>{c.products.map((p) => <li key={p} className="rounded-full border border-edge bg-glass px-3 py-1 text-sm font-semibold text-lav">{p}</li>)}</ul>}
                    {(c.sameLocation || c.location) && <p className="mt-4 flex items-start gap-1.5 text-sm text-soft"><MapPin className="mt-0.5 size-4 shrink-0 text-lav" aria-hidden="true" />{c.sameLocation ? `${c.location || salem.city}: same location as LAX360 Pvt Ltd` : c.location}</p>}
                    <div className="mt-6 flex flex-wrap items-center gap-4"><Website c={c} /><Link to={`/our-network/${c.slug}`} className="link-underline inline-flex min-h-11 items-center gap-1 font-semibold text-lav">Company details<ArrowRight className="size-4" aria-hidden="true" /></Link></div>
                  </div>
                  <div className="lg:col-span-5">
                    <div className="h-full rounded-2xl border border-edge-strong bg-base2/60 p-6">
                      <p className="flex items-center gap-2 font-display text-lg font-semibold"><Handshake className="size-5 text-lav" aria-hidden="true" />Partnerships established through {c.name}</p>
                      {through.length > 0 ? (
                        <>
                          <p className="mt-2 text-sm text-soft">These technology partnerships were set up through {c.name}. They are listed under IT &amp; Software Partners.</p>
                          <ul className="mt-4 space-y-2">{through.map((p) => <li key={p.slug}><a href="#it-software-partners" className="flex min-h-11 items-center gap-3 rounded-xl border border-edge bg-glass px-3 py-2 transition-colors hover:border-lav"><Logo c={p} size="size-9" /><span className="font-semibold">{p.name}</span><span className="ml-auto text-xs text-soft">{p.businessCategory.split(',')[0]}</span></a></li>)}</ul>
                        </>
                      ) : <p className="mt-2 text-sm text-soft">Partnerships established through {c.name} will be listed here.</p>}
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      )}
      <p className="mt-6 text-sm text-soft">Each company is a separate business. A company is described as owned by LAX360 Pvt Ltd only where its profile says so. Fatcat Wealthy’s services are provided by Fatcat Wealthy, not by LAX360 Pvt Ltd, and nothing here is financial advice or an offer; see its website for details.</p>
    </Block>
  )
}

/** CADPOINT Salem Branch: shown prominently, as an authorized education partnership (not a technology reseller partnership). */
function EducationPartner({ c }) {
  const points = [[Handshake, 'Authorized partnership', 'LAX360 Pvt Ltd is an authorized CADPOINT partner in Salem.'], [Building2, 'We operate the Salem branch', 'LAX360 runs the CADPOINT Salem branch.'], [GraduationCap, 'Education and training focus', 'Education, technical training, professional skill development and related training programmes.']]
  return (
    <Reveal>
      <article className="glass relative overflow-hidden p-6 md:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-16 size-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow text-lav">Education &amp; training partner</p>
            <div className="mt-3 flex items-center gap-4"><Logo c={c} size="size-20" /><div><h3 className="font-display text-3xl font-semibold leading-tight">{c.name}</h3><p className="mt-1"><Route c={c} /></p></div></div>
            <div className="mt-4"><Chips c={c} /></div>
            <p className="mt-4 text-lg text-soft">{c.description}</p>
            <p className="mt-3 rounded-xl border border-edge bg-glass p-4 text-sm"><strong>An authorized education partnership.</strong> <span className="text-soft">CADPOINT here is an education and training partnership. It is not a general technology reseller partnership.</span></p>
            {(c.sameLocation || c.location) && <p className="mt-4 flex items-start gap-1.5 text-sm text-soft"><MapPin className="mt-0.5 size-4 shrink-0 text-lav" aria-hidden="true" />{c.sameLocation ? `${c.location || salem.city}: ${salem.address[0]}, ${salem.address[1]}` : c.location}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-4"><Website c={c} /><Link to={`/our-network/${c.slug}`} className="link-underline inline-flex min-h-11 items-center gap-1 font-semibold text-lav">Partnership details<ArrowRight className="size-4" aria-hidden="true" /></Link></div>
          </div>
          <div className="lg:col-span-5">
            {c.images.length > 0 && <div className="mb-4 grid gap-3 sm:grid-cols-2">{c.images.map((im) => <img key={im.src} src={im.src} alt={im.alt || `${c.name}`} loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-2xl border border-edge object-cover" />)}</div>}
            <ul className="space-y-3">{points.map(([Icon, t, d]) => <li key={t} className="flex gap-4 rounded-2xl border border-edge bg-base2/60 p-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Icon className="size-5" aria-hidden="true" /></span><span><span className="block font-display text-lg font-semibold leading-tight">{t}</span><span className="mt-1 block text-sm text-soft">{d}</span></span></li>)}</ul>
          </div>
        </div>
      </article>
    </Reveal>
  )
}

export default function PartnerEcosystem({ companies, onFuture }) {
  const g = groupEcosystem(companies)
  const through = (c) => companies.filter((p) => p.establishedVia && c.name.toLowerCase().includes(p.establishedVia.toLowerCase().split(' ')[0]) && p.slug !== c.slug)
  const grid = (list) => <ul className="mt-10 grid gap-6 md:grid-cols-2">{list.map((c, i) => <Reveal as="li" key={c.slug} delay={(i % 2) * 0.07}><PartnerCard c={c} /></Reveal>)}</ul>
  const cadpoint = g.education.find((c) => canonicalSlug(c.slug) === 'cadpoint-salem')
  const otherEducation = g.education.filter((c) => c !== cadpoint)
  return (
    <>
      <GroupCompany list={g.group} through={g.group[0] ? through(g.group[0]) : []} />

      <Block id="it-software-partners" eyebrow="IT & Software" title="IT & Software" gradient="Partners."
        lead="Technology and software companies LAX360 works with. These partnerships were established through our group company, Fatcat Wealthy.">
        {g.it.length ? grid(g.it) : <Waiting title="IT & software partners will be listed here." text="Software and technology partners appear once their relationship is confirmed." />}
        <p className="mt-6 text-sm text-soft">Product and company names belong to their owners. A partnership designation such as Authorized Partner or Reseller is shown only where it has been verified; until then no reseller right, certification or partnership level is stated.</p>
      </Block>

      <Block id="cybersecurity-partners" eyebrow="Cybersecurity" title="Cybersecurity" gradient="Partners." tone="border-y border-edge bg-glass"
        lead="Security testing, auditing, compliance and training collaborators of the LAX360 business group.">
        {g.cyber.length ? grid(g.cyber) : <Waiting title="Cybersecurity partners will be listed here." text="Cybersecurity partners appear once the collaboration is confirmed." />}
      </Block>

      <Block id="education-partners" eyebrow="Education & training" title="Education & Training" gradient="Partners."
        lead="Our education and training partnerships, including the CADPOINT Salem Branch operated by LAX360 Pvt Ltd.">
        <div className="mt-10">{cadpoint ? <EducationPartner c={cadpoint} /> : g.education.length === 0 && <Waiting title="Education partners will be listed here." text="Training providers and institutions appear once their collaboration with LAX360 is confirmed." />}</div>
        {otherEducation.length > 0 && grid(otherEducation)}
      </Block>

      <Block id="digital-marketing-partners" eyebrow="Digital marketing" title="Digital Marketing" gradient="Partners." tone="border-y border-edge bg-glass"
        lead="Marketing and advertising partners across search, social media, content and paid advertising.">
        {g.dm.length ? grid(g.dm) : (
          <Waiting title="We are expanding our digital marketing partner ecosystem." text="New partnerships will be announced soon." />
        )}
        {g.dm.length === 0 && <div className="mt-5 text-center"><Button href="#future-partners" variant="secondary" onClick={(e) => { e.preventDefault(); onFuture?.() }}>Interested in partnering with us?</Button></div>}
      </Block>
    </>
  )
}

