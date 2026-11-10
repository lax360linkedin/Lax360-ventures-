import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { m, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness, ChevronRight, ClipboardList, Cloud, Code2, Compass, FileText, GraduationCap, Handshake, HeartHandshake, Layers, LifeBuoy, MapPin, MessagesSquare,
  Network as NetworkIcon, PackageCheck, Plug, Rocket, Search, ShoppingCart, Sparkles, Users, Wrench, Store, Cpu, Building2, Megaphone, TrendingUp, SlidersHorizontal, Check,
} from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PartnerForm from '../components/network/PartnerForm.jsx'
import PartnershipModal from '../components/network/PartnershipModal.jsx'
import BotHighlight from '../components/ui/BotHighlight.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { branches } from '../data/branches.js'
import { networkCta, networkIntro, partnershipCategories, partnershipProcess, whyPartner } from '../data/partnerships.js'
import { asCompany, networkCategories, ownershipLabels, partnerTypes, pinnedProfiles, relationshipLabels, softwareCategories } from '../data/network.js'
import { allDivisions, getDivision } from '../data/services.js'
import { divisionIcons } from '../utils/divisionIcons.js'
import { normaliseCompany, useNetwork, useNetworkCategories, useNetworkPageText, useSoftware } from '../hooks/useCmsPages.js'
import { useContent } from '../hooks/useSite.js'

const EASE = [0.2, 0.8, 0.2, 1]
const CAT_ICONS = { store: Store, handshake: Handshake, badge: BadgeCheck, cpu: Cpu, network: NetworkIcon }
const WHY_ICONS = { building: Building2, layers: Layers, wrench: Wrench, briefcase: BriefcaseBusiness, megaphone: Megaphone, trending: TrendingUp, sliders: SlidersHorizontal }
const salem = branches.find((b) => b.id === 'salem') || branches[0]
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const isHttp = (u) => /^https?:\/\//.test(u || '')
const go = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); window.history.replaceState(null, '', `#${id}`) }

// The eight sections of the page, in order. `id` is the anchor used by the tab bar.
const SECTIONS = [
  { id: 'authorized-partners', n: 1, label: 'Authorized Partners' },
  { id: 'software-distribution', n: 2, label: 'Software Distribution Network' },
  { id: 'education-network', n: 3, label: 'Education & Academic Network' },
  { id: 'business-associates', n: 4, label: 'Business Collaborations' },
  { id: 'future-partners', n: 5, label: 'Future Partner Opportunities' },
  { id: 'group-companies', n: 6, label: 'Group Companies' },
  { id: 'reseller-partners', n: 7, label: 'Reseller & Distribution Partners' },
  { id: 'implementation-ecosystem', n: 8, label: 'Implementation & Technology Ecosystem' },
]

const AREAS = [
  [ShoppingCart, 'Software Sales & Licensing'], [Layers, 'CRM and ERP Solutions'], [FileText, 'Accounting & Billing Software'], [Users, 'HR and Payroll Software'], [BriefcaseBusiness, 'Business Productivity Tools'],
  [Sparkles, 'AI Platforms and Subscriptions'], [Cloud, 'Cloud and Business Applications'], [Plug, 'Software Implementation & Configuration'], [GraduationCap, 'Training and Onboarding'], [LifeBuoy, 'Technical Support and Maintenance'],
]
const KINDS = [['lax360', 'Developed by LAX360', 'Software LAX360 builds and owns. See our Products.'], ['third_party', 'Third-party partner products', 'Made and owned by the vendor named on each product.'], ['resold', 'Resold or distributed software', 'Sold under the vendor’s licence terms, where LAX360 has an agreement with the vendor.'], ['integrated', 'Integrated technology solutions', 'Several products connected into one working solution.']]
const PURCHASE = [['Enquire', 'Tell us what the business needs.'], ['Review', 'We match the requirement to suitable products.'], ['Licence', 'Pricing and licensing as set by the vendor.'], ['Purchase', 'Procurement under the vendor’s terms.'], ['Onboard', 'Set-up, configuration and training.']]
const CAPABILITIES = [
  [Plug, 'Technology integration', 'Connecting business systems so data moves between them.', 'automation'], [PackageCheck, 'Software deployment', 'Installing and configuring software for a customer’s environment.', 'software'],
  [Code2, 'API integration', 'Linking applications and services through their APIs.', 'headless'], [BriefcaseBusiness, 'Business application implementation', 'Setting up CRM, ERP and business tools around real processes.', 'software'],
  [Cloud, 'Cloud solutions', 'Hosted business applications and cloud-based services.', 'software'], [Sparkles, 'AI and automation integration', 'Adding assistants and automated workflows to existing tools.', 'ai'],
  [LifeBuoy, 'Technical support', 'Help with questions, fixes and improvements after go-live.', 'software'], [GraduationCap, 'Training and onboarding', 'Getting teams confident with new software.', 'software'],
]
const JOURNEY = [
  [Search, 'Discover', 'We learn what the customer is trying to achieve and where their current tools fall short.'],
  [Handshake, 'Connect', 'We bring in the right technology provider, training partner or specialist from our network.'],
  [Compass, 'Recommend', 'We recommend products and approaches that fit the requirement, and are open about who makes what.'],
  [ShoppingCart, 'Purchase', 'We assist with licensing and procurement under the vendor’s terms.'],
  [Wrench, 'Implement', 'We configure and deploy the chosen software with the customer’s team.'],
  [Plug, 'Integrate', 'We connect it to the customer’s other systems, APIs and workflows.'],
  [LifeBuoy, 'Support', 'We provide training, technical assistance and ongoing improvements.'],
]
const FUTURE = [
  [Rocket, 'Technology Partnership', 'partner-technology', 'Cloud, AI, software and infrastructure companies that want to work with us.'],
  [ShoppingCart, 'Software Reseller Partnership', 'partner-reseller', 'Software vendors and resellers interested in licensing and distribution.'],
  [GraduationCap, 'Education Partnership', 'partner-education', 'Institutions and trainers interested in technical learning programmes.'],
  [Handshake, 'Business Associate Partnership', 'partner-associate', 'Consultants and business collaborators who can bring or share opportunities.'],
  [Wrench, 'Implementation Partnership', 'partner-implementation', 'Teams that deploy, integrate and support business software.'],
  [HeartHandshake, 'Strategic Collaboration', 'partner-other', 'Joint initiatives, industry programmes and other ideas.'],
]

/** A status chip: a verified designation, a designation that is subject to verification, or "pending verification". Nothing unverified is stated as fact. */
function Designation({ c }) {
  if (c.designation) return <span className="inline-flex items-center gap-1.5 rounded-full border border-sky/50 bg-sky/10 px-3 py-1 text-xs font-bold text-sky-700 dark:text-sky"><BadgeCheck className="size-3.5" aria-hidden="true" />{c.designation}</span>
  if (c.claim) return <span className="inline-flex items-center gap-1.5 rounded-full border border-edge-strong bg-glass px-3 py-1 text-xs font-semibold text-soft">{c.claim} — subject to verification</span>
  if (['technology', 'authorized', 'reseller'].includes(c.category)) return <span className="inline-flex items-center gap-1.5 rounded-full border border-edge-strong bg-glass px-3 py-1 text-xs font-semibold text-soft">Partnership designation: pending verification</span>
  return null
}

/** A company or partner profile card: logo or monogram, name, business category, designation status, description, products, location and official website. */
function CompanyCard({ c, label, cta, to }) {
  return (
    <article className="glass-flat lift relative flex h-full flex-col gap-4 p-6">
      <div className="flex items-center gap-4">
        {c.logo ? <img src={c.logo} alt={c.logoAlt || `${c.name} logo`} width="64" height="64" loading="lazy" decoding="async" className="size-16 shrink-0 rounded-2xl border border-edge bg-white object-contain p-2" />
          : <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent font-display text-xl font-bold text-white">{initials(c.name)}</span>}
        <div className="min-w-0"><h3 className="font-display text-xl font-semibold leading-tight">{to ? <Link to={to} className="after:absolute after:inset-0 after:content-['']">{c.name}<span className="sr-only"> — view partnership details</span></Link> : c.name}</h3>{c.businessCategory && <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-lav">{c.businessCategory}</p>}</div>
      </div>
      <div className="flex flex-wrap gap-2">{label && <span className="rounded-full border border-edge-strong bg-glass px-3 py-1 text-xs font-semibold">{label}</span>}<Designation c={c} /></div>
      <p className="text-soft">{c.description}</p>
      {c.products.length > 0 && <ul className="flex flex-wrap gap-1.5" aria-label="Products and services">{c.products.map((p) => <li key={p} className="rounded-full border border-edge bg-glass px-2.5 py-1 text-xs font-semibold text-lav">{p}</li>)}</ul>}
      {(c.sameLocation || c.location) && <p className="flex items-start gap-1.5 text-sm text-soft"><MapPin className="mt-0.5 size-4 shrink-0 text-lav" aria-hidden="true" />{c.sameLocation ? `${c.location || salem.city} — same location as LAX360 Pvt Ltd (${salem.address[0]}, ${salem.address[1]})` : c.location}</p>}
      {to && <p aria-hidden="true" className="inline-flex items-center gap-1 text-sm font-semibold text-lav">View partnership details <ArrowRight className="size-4" /></p>}
      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-x-5 gap-y-1">
        {isHttp(c.website) && <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[var(--btn-hover)]">{cta || c.ctaLabel} <ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>}
        {!isHttp(c.website) && <Link to="/contact?type=project" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-edge-strong px-5 font-semibold transition-colors hover:border-lav">Contact for enquiry</Link>}
        {isHttp(c.website) && c.category !== 'group' && c.category !== 'associated' && <Link to="/contact?type=project" className="link-underline inline-flex min-h-11 items-center font-semibold text-lav">Contact for enquiry</Link>}
        {c.email && <a href={`mailto:${c.email}`} className="link-underline inline-flex min-h-11 items-center font-semibold text-lav">{c.email}</a>}
        {c.phone && <a href={`tel:${c.phone}`} className="link-underline inline-flex min-h-11 items-center font-semibold text-lav">{c.phone}</a>}
      </div>
    </article>
  )
}

/** Shown when a category has no published entries: an introduction and a way to take part, rather than hiding the section. */
function Empty({ title, text }) {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-edge-strong bg-glass p-6 text-center md:p-8">
      <p className="font-display text-xl font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-soft">{text}</p>
      <div className="mt-5"><Button href="#future-partners" variant="secondary" onClick={(e) => { e.preventDefault(); go('future-partners') }}>Become a Partner</Button></div>
    </div>
  )
}

function Section({ s, children, tone = '', eyebrow, title, gradient, lead }) {
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`} className={`scroll-mt-[calc(var(--header-bottom,92px)+var(--netnav-h,64px)+1rem)] ${tone}`}>
      <div className="wrap section">
        <SectionHeading id={`${s.id}-title`} eyebrow={eyebrow || `Section ${s.n}`} title={title} gradient={gradient} lead={lead} />
        {children}
      </div>
    </section>
  )
}

/**
 * /our-network — the LAX360 business ecosystem platform. Eight sections, ALWAYS present (a category with no published entries shows its introduction and an
 * invitation instead of disappearing): 1 Authorized Partners (technology partners included), 2 Technology & Software Distribution Network, 3 Education & Academic Network, 4 Business
 * Associates & Strategic Collaborations, 5 Future Partner Opportunities (with the partnership form), 6 Group Companies & Associated Businesses,
 * 7 Reseller & Software Distribution Partners, 8 Implementation & Technology Ecosystem. Companies and products come from the admin panel
 * (Website content > Network); the built-in starter entries show until entries are published there. A partnership designation is shown only when verified.
 */
export default function Network() {
  const companies = useNetwork()
  const np = useNetworkPageText()
  const software = useSoftware()
  const extra = useNetworkCategories()
  const cmsCompanies = useContent('network_partner')
  // CADPOINT and Fatcat Wealthy come first, as they originally appeared: the admin-panel entry when one is published, otherwise the original profile.
  const pinned = pinnedProfiles.map((p) => { const hit = cmsCompanies?.find((i) => p.slugs.includes(i.slug)); return { key: p.key, entry: hit ? normaliseCompany(hit) : p.fallback } })
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [enquiry, setEnquiry] = useState(() => { try { const k = new URLSearchParams(window.location.search).get('enquire'); return partnershipCategories.some((c) => c.id === k) ? k : null } catch { return null } })
  const [type, setType] = useState(partnerTypes[0].value)
  const [active, setActive] = useState(SECTIONS[0].id)
  const label = (k) => extra[k]?.label || networkCategories[k]?.label || k

  // Sticky section tabs: publish this bar's height so anchored sections stop below the header and the bar; highlight the section in view.
  useEffect(() => {
    const root = document.documentElement
    const bar = document.getElementById('network-tabs')
    const apply = () => bar && root.style.setProperty('--netnav-h', `${bar.offsetHeight}px`)
    apply()
    const ro = typeof ResizeObserver === 'undefined' || !bar ? null : new ResizeObserver(apply)
    ro?.observe(bar)
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-40% 0px -50% 0px' })
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el) })
    if (window.location.hash) window.setTimeout(() => go(window.location.hash.slice(1)), 400)
    return () => { ro?.disconnect(); io.disconnect(); root.style.removeProperty('--netnav-h') }
  }, [])
  useEffect(() => { document.querySelector('[data-net-tab][aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' }) }, [active])

  // Authorized Partners: CADPOINT first, then every authorized partner (technology partners are listed here too: there is no separate Technology Partners category any more).
  const pinnedSlugs = new Set(pinnedProfiles.flatMap((p) => p.slugs))
  const cadpoint = pinned.find((p) => p.key === 'authorized')?.entry
  const authorized = [...(cadpoint ? [{ ...asCompany(cadpoint), category: 'authorized', relationship: cadpoint.relationship || 'authorized' }] : []), ...companies.filter((c) => ['technology', 'authorized'].includes(c.category) && !pinnedSlugs.has(c.slug))]
  const authorisedList = authorized.filter((c) => c.relationship !== 'technology_provider')
  const techList = authorized.filter((c) => c.relationship === 'technology_provider')
  const education = companies.filter((c) => c.category === 'education' || /education|training/i.test(c.businessCategory))
  const associates = companies.filter((c) => ['associate', 'collaboration', 'professional', 'industry', 'startup'].includes(c.category))
  const group = companies.filter((c) => ['group', 'associated'].includes(c.category))
  const implementation = companies.filter((c) => c.category === 'implementation')
  const resellers = companies.filter((c) => c.category === 'reseller')
  const vendors = useMemo(() => {
    const slugs = [...new Set([...resellers.map((r) => r.slug), ...software.map((s) => s.vendor).filter(Boolean)])]
    return slugs.map((slug) => ({ company: companies.find((c) => c.slug === slug), slug, products: software.filter((s) => s.vendor === slug) })).filter((v) => v.company)
  }, [companies, resellers, software])
  const other = software.filter((s) => !s.vendor || !companies.some((c) => c.slug === s.vendor))
  const rise = (delay) => (reduce ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } })
  const FlowIcon = JOURNEY[step][0]
  const chooseType = (v) => { setType(v); go('partner-form') }

  return (
    <PageContainer
      path="/our-network"
      title="Our Network"
      description="The LAX360 Pvt Ltd business ecosystem: authorized partners, software distribution, education network, business associates, group companies, resellers and implementation."
      jsonLd={{ '@context': 'https://schema.org', '@type': 'Organization', name: 'LAX360 Pvt Ltd', location: { '@type': 'Place', address: salem.address.join(', ') }, subOrganization: group.filter((g) => isHttp(g.website)).map((g) => ({ '@type': 'Organization', name: g.name, url: g.website })) }}
    >
      <section aria-labelledby="network-title" className="relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night">
        <div aria-hidden="true" className="absolute -left-28 top-8 -z-10 size-[26rem] rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-24 top-0 -z-10 size-[28rem] rounded-full bg-sky/15 blur-3xl" />
        <div className="wrap grid items-center gap-12 pb-14 pt-10 md:pt-14 lg:grid-cols-12 lg:gap-8 lg:pb-20 lg:pt-16">
          <div className="lg:col-span-6">
            <m.nav {...rise(0.05)} aria-label="Breadcrumb" className="text-sm text-soft"><ol className="flex items-center gap-2"><li><Link to="/" className="transition-colors hover:text-lav">Home</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" /><li aria-current="page" className="font-semibold text-fg">Our Network</li></ol></m.nav>
            <m.p {...rise(0.12)} className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-edge-strong bg-glass px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lav backdrop-blur-md"><NetworkIcon className="size-4" aria-hidden="true" />Partnerships &amp; business network</m.p>
            <m.h1 {...rise(0.2)} id="network-title" className="h1 mt-5 !text-[clamp(2.6rem,5.2vw,4.6rem)]">{np.heading || networkIntro.heading}</m.h1>
            <m.p {...rise(0.26)} className="mt-3 font-display text-xl font-semibold leading-snug text-lav md:text-2xl"><BotHighlight delay={0.9}>{np.subheading || networkIntro.sub}</BotHighlight></m.p>
            {[np.intro_1 || networkIntro.paragraphs[0], np.intro_2 || networkIntro.paragraphs[1]].map((p, n) => <m.p key={p} {...rise(0.32 + n * 0.06)} className="mt-5 max-w-xl text-lg text-soft">{p}</m.p>)}
            <m.div {...rise(0.45)} className="mt-8 flex flex-col gap-3 sm:flex-row"><Button href="#partnership-opportunities" arrow onClick={(e) => { e.preventDefault(); go('partnership-opportunities') }}>Explore Partnership Opportunities</Button><Button to="/contact" variant="secondary">Contact LAX360</Button></m.div>
          </div>
          <m.div {...rise(0.3)} className="lg:col-span-6">
            <svg viewBox="0 0 480 400" className="mx-auto h-auto w-full max-w-md" role="img" aria-label="Diagram: LAX360 Pvt Ltd at the centre, connected to technology, education, finance, software and business partners">
              {[[90, 80], [390, 80], [60, 250], [420, 250], [240, 360], [240, 40]].map(([x, y], i) => <line key={i} x1="240" y1="200" x2={x} y2={y} stroke="var(--color-edge-strong)" strokeWidth="1.5" strokeDasharray="4 6" />)}
              {[[90, 80, 'Technology'], [390, 80, 'Education'], [60, 250, 'Finance'], [420, 250, 'Software'], [240, 360, 'Associates'], [240, 40, 'Industry']].map(([x, y, l], i) => (
                <g key={l}><circle cx={x} cy={y} r="30" fill="var(--color-glass-strong)" stroke="var(--color-edge-strong)" /><text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-fg)">{l}</text>
                  {!reduce && <circle r="3" fill="var(--color-accent)"><animateMotion dur={`${3 + i * 0.5}s`} repeatCount="indefinite" path={`M240 200 L${x} ${y}`} /></circle>}</g>
              ))}
              <circle cx="240" cy="200" r="56" fill="var(--color-primary)" /><text x="240" y="196" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff">LAX360</text><text x="240" y="216" textAnchor="middle" fontSize="11" fill="#fff" opacity="0.85">Pvt Ltd</text>
            </svg>
          </m.div>
        </div>
      </section>

      {/* Partnership opportunities: five categories, each with its own enquiry */}
      <section id="partnership-opportunities" className="wrap section scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="opps-title">
        <SectionHeading id="opps-title" eyebrow="New partnership opportunities" title="Five ways to" gradient="partner with us." lead={np.opportunities_title || 'Choose the category that fits you. Each has its own enquiry, and our team replies personally.'} />
        <ul className="mt-12 grid gap-6 lg:grid-cols-2">
          {partnershipCategories.map((c, i) => {
            const Icon = CAT_ICONS[c.icon]
            return (
              <Reveal as="li" key={c.id} delay={(i % 2) * 0.06} className={i === partnershipCategories.length - 1 ? 'lg:col-span-2' : ''}>
                <article id={`cat-${c.id}`} className="glass-flat lift group relative flex h-full flex-col gap-5 overflow-hidden p-6 md:p-8">
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-accent opacity-80 transition-opacity group-hover:opacity-100" />
                  <div className="flex items-start gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105"><Icon className="size-7" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <p className="eyebrow text-lav">{c.letter} · {c.label}</p>
                      <h3 className="mt-1 font-display text-2xl font-semibold leading-tight">{c.title}</h3>
                    </div>
                  </div>
                  <p className="text-soft">{c.description}</p>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-fg">{c.listTitle}</h4>
                    <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">{c.items.map((t) => <li key={t} className="flex items-start gap-2.5 text-soft"><Check className="mt-1 size-4 shrink-0 text-lav" aria-hidden="true" />{t}</li>)}</ul>
                  </div>
                  <div className="mt-auto flex flex-col gap-3 border-t border-edge pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold">{c.cta}</p>
                    <Button onClick={() => setEnquiry(c.id)} arrow className="shrink-0">{c.button}</Button>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </ul>
      </section>

      <section className="wrap section border-t border-edge" aria-labelledby="network-first-title">
        <SectionHeading id="network-first-title" eyebrow="Existing partners & business network" title="Who is already" gradient="part of our network." lead="Companies LAX360 already works with, kept apart by the kind of relationship. Authorisation is shown only where it has been confirmed." />
        <div className="mt-12 space-y-16">
          {pinned.map(({ key, entry: e }) => (
            <div key={key} id={key === 'authorized' ? 'authorized-partners' : `first-${key}`} className="scroll-mt-[calc(var(--header-bottom,92px)+1rem)]">
              <Reveal>
                <h3 className="font-display text-2xl font-semibold md:text-3xl">{key === 'authorized' ? 'Existing Authorised Partners' : 'Associated Companies'}</h3>
                <p className="mt-2 max-w-2xl text-soft">{key === 'authorized' ? 'Companies authorised to represent or deliver LAX360 Pvt Ltd services in their region. A partner is listed here only where the authorisation has been confirmed.' : 'Companies connected to LAX360 Pvt Ltd through ownership, shared leadership or close working ties.'}</p>
              </Reveal>
              {key === 'authorized' ? (
                <>
                  <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {authorisedList.map((c, i) => <Reveal as="li" key={c.slug} delay={(i % 3) * 0.06}><CompanyCard c={c} label={relationshipLabels[c.relationship]} cta="Official website" to={`/our-network/${c.slug}`} /></Reveal>)}
                  </ul>
                  {techList.length > 0 && (
                    <div id="technology-partners" className="mt-16 scroll-mt-[calc(var(--header-bottom,92px)+1rem)]">
                      <Reveal>
                        <h3 className="font-display text-2xl font-semibold md:text-3xl">Existing Technology Partners</h3>
                        <p className="mt-2 max-w-2xl text-soft">Technology companies and software providers whose products LAX360 works with. This is a technology relationship; no authorisation or partnership level is stated unless the partner&apos;s profile confirms it.</p>
                      </Reveal>
                      <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {techList.map((c, i) => <Reveal as="li" key={c.slug} delay={(i % 3) * 0.06}><CompanyCard c={c} label={relationshipLabels[c.relationship]} cta="Official website" to={`/our-network/${c.slug}`} /></Reveal>)}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Reveal as="li">
                  <article className="glass-flat lift flex h-full flex-col gap-4 p-6">
                    <div className="flex items-center gap-4">
                      {e.logo
                        ? <img src={e.logo} alt={e.logoAlt || `${e.name} logo`} width="64" height="64" loading="lazy" decoding="async" className="size-16 shrink-0 rounded-2xl border border-edge bg-white object-contain p-2" />
                        : <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent font-display text-xl font-bold text-white">{initials(e.name)}</span>}
                      <div className="min-w-0">
                        <h4 className="font-display text-xl font-semibold leading-tight">{e.name}</h4>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-lav">{key === 'authorized' ? 'Authorized Partner' : 'Associated Company'}</p>
                      </div>
                    </div>
                    {e.location && <p className="flex items-center gap-1.5 text-sm text-soft"><MapPin className="size-4 text-lav" aria-hidden="true" />{e.location}</p>}
                    <p className="flex-1 text-soft">{e.description}</p>
                    {isHttp(e.website) && (
                      <a href={e.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-lav hover:underline">
                        Visit website <ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    )}
                  </article>
                </Reveal>
              </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <nav id="network-tabs" aria-label="Our Network sections" className="sticky top-[var(--header-bottom,92px)] z-30 border-b border-edge bg-night/80 backdrop-blur-xl">
        <ul className="wrap no-scrollbar flex gap-2 overflow-x-auto py-3">
          {SECTIONS.map((s) => (
            <li key={s.id} className="shrink-0"><a href={`#${s.id}`} data-net-tab aria-current={active === s.id ? 'true' : undefined} onClick={(e) => { e.preventDefault(); go(s.id) }}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ${active === s.id ? 'border-transparent bg-primary text-white' : 'border-edge bg-glass text-soft hover:border-edge-strong hover:text-fg'}`}><span className="text-xs opacity-70">{s.n}</span>{s.label}</a></li>
          ))}
        </ul>
      </nav>

      {/* 2 Technology & Software Distribution Network */}
      <Section s={SECTIONS[1]} tone="border-y border-edge bg-glass" title="Technology & Software" gradient="Distribution Network." lead="LAX360’s software sales and distribution ecosystem: how we help customers discover, choose, buy, implement and use business software.">
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Types of software">
          {KINDS.map(([k, t, d], i) => <Reveal as="li" key={k} delay={i * 0.06} className="glass-flat p-5"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${k === 'lax360' ? 'border-transparent bg-primary text-white' : 'border-edge-strong bg-glass text-lav'}`}>{ownershipLabels[k]}</span><p className="mt-3 font-display text-lg font-semibold leading-tight">{t}</p><p className="mt-1 text-sm text-soft">{d}</p></Reveal>)}
        </ul>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="What we help with">
          {AREAS.map(([Icon, t], i) => <Reveal as="li" key={t} delay={(i % 5) * 0.04} className="flex items-center gap-3 rounded-2xl border border-edge bg-base2/60 p-4"><Icon className="size-5 shrink-0 text-lav" aria-hidden="true" /><span className="font-semibold leading-tight">{t}</span></Reveal>)}
        </ul>
        <p className="mt-5 text-sm text-soft">Third-party software is owned by its vendor and is never presented as a LAX360 product. Licensing and resale apply only to products where LAX360 has an agreement with the vendor. <Link to="/products" className="font-semibold text-lav hover:underline">See LAX360’s own products</Link>.</p>
      </Section>

      {/* 3 Education & Academic Network */}
      <Section s={SECTIONS[2]} title="Education &" gradient="Academic Network." lead="CADPOINT Academy – Salem, training and education relationships, technical learning initiatives, and student development.">
        {education.length > 0 && <ul className="mt-10 grid gap-6 md:grid-cols-2">{education.map((c, i) => <Reveal as="li" key={c.slug} delay={i * 0.07}><CompanyCard c={c} label={relationshipLabels[c.relationship]} /></Reveal>)}</ul>}
        <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[[GraduationCap, 'Technical training and education', 'CAD, IT and AI-related training and educational initiatives, as described on CADPOINT’s official website.'], [Rocket, 'Workshops & student development', 'Workshops and skill-building programmes. See also our technology and AI courses.'], [HeartHandshake, 'College collaborations', 'Listed here only when verified. No colleges are named until then.'], [Handshake, 'Institutional partnerships', 'Listed here only when verified. No academic approvals are claimed.']].map(([Icon, t, d]) => (
            <li key={t} className="glass-flat flex gap-4 p-5"><Icon className="mt-0.5 size-6 shrink-0 text-lav" aria-hidden="true" /><span><span className="block font-display text-lg font-semibold leading-tight">{t}</span><span className="mt-1 block text-soft">{d}</span></span></li>
          ))}
        </ul>
        {education.length === 0 && <Empty title="Education partners will be listed here." text="Training providers, colleges and institutions appear once their collaboration with LAX360 is confirmed." />}
      </Section>

      {/* 4 Business Associates & Strategic Collaborations */}
      <Section s={SECTIONS[3]} tone="border-y border-edge bg-base2/50" title="Business Associates &" gradient="Strategic Collaborations." lead="Business associates, strategic collaborators, professional consultants, domain specialists, implementation associates and industry collaborators.">
        <ul className="mt-8 flex flex-wrap gap-2" aria-label="Who appears here">{['Business associates', 'Strategic collaborators', 'Professional consultants', 'Domain specialists', 'Implementation associates', 'Industry collaborators'].map((t) => <li key={t} className="tag">{t}</li>)}</ul>
        {associates.length > 0
          ? <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{associates.map((c, i) => <Reveal as="li" key={c.slug} delay={(i % 3) * 0.07}><CompanyCard c={c} label={label(c.category)} /></Reveal>)}</ul>
          : <Empty title="No associates are listed yet." text="We list business associates and collaborators only when the relationship is confirmed with them. If you would like to collaborate with LAX360, we would be glad to hear from you." />}
      </Section>

      {/* 5 Future Partner Opportunities (with the partnership form) */}
      <Section s={SECTIONS[4]} title="Future Partner" gradient="Opportunities." lead="Companies and individuals are welcome to explore working with LAX360. Choose a type of collaboration, then tell us about yourself.">
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FUTURE.map(([Icon, t, v, d], i) => (
            <Reveal as="li" key={v} delay={(i % 3) * 0.06}>
              <button type="button" onClick={() => chooseType(v)} className="glass-flat lift group flex h-full w-full flex-col gap-3 p-6 text-left">
                <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Icon className="size-5" aria-hidden="true" /></span>
                <span className="font-display text-lg font-semibold leading-tight">{t}</span><span className="flex-1 text-soft">{d}</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-lav">Enquire <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </button>
            </Reveal>
          ))}
        </ul>
        <div className="mt-8 text-center"><Button href="#partner-form" arrow onClick={(e) => { e.preventDefault(); go('partner-form') }}>Become a Partner</Button></div>
        <div id="partner-form" className="mt-12 scroll-mt-[calc(var(--header-bottom,92px)+var(--netnav-h,64px)+1rem)] grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4"><h3 className="font-display text-2xl font-semibold">Partnership enquiry</h3><p className="mt-2 text-soft">Every enquiry is reviewed by our team. A relationship is listed on this page only after it has been verified.</p><p className="mt-4 flex items-start gap-2 text-sm text-soft"><ClipboardList className="mt-0.5 size-4 shrink-0 text-lav" aria-hidden="true" />Selected: <span className="font-semibold text-fg">{partnerTypes.find((t) => t.value === type)?.label}</span></p></div>
          <div className="lg:col-span-8"><PartnerForm key={type} defaultType={type} /></div>
        </div>
      </Section>

      {/* 6 Group Companies & Associated Businesses */}
      <Section s={SECTIONS[5]} tone="border-y border-edge bg-glass" title="Group Companies &" gradient="Associated Businesses." lead={networkCategories.group.text}>
        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-12">
            <article className="glass relative overflow-hidden p-6 md:p-10">
              <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <div className="flex items-center gap-4"><img src="/assets/logo-shield.png" alt="" width="64" height="64" className="size-16 rounded-2xl bg-white object-contain p-1.5" /><div><h3 className="font-display text-2xl font-semibold">LAX360 Pvt Ltd</h3><p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-lav">Technology & Digital Solutions</p></div></div>
                  <p className="mt-4 text-soft">LAX360 Pvt Ltd plans, builds and supports software, AI, digital marketing, APIs, automation and mobile applications, and develops its own software products.</p>
                  <p className="mt-3 flex items-start gap-1.5 text-sm text-soft"><MapPin className="mt-0.5 size-4 shrink-0 text-lav" aria-hidden="true" />{salem.address.join(', ')}</p>
                  <div className="mt-5 flex flex-wrap gap-3"><Button to="/services" arrow>Our Services</Button><Button to="/products" variant="secondary">Our Products</Button></div>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-7" aria-label="LAX360 business areas">
                  {allDivisions.map((d) => { const Icon = divisionIcons[d.slug]; return (
                    <li key={d.slug}><Link to={`/services/${d.slug}`} className="group flex h-full items-center gap-3 rounded-2xl border border-edge bg-base2/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-lav"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Icon className="size-5" aria-hidden="true" /></span><span className="font-display font-semibold leading-tight">{d.name}</span></Link></li>
                  ) })}
                </ul>
              </div>
            </article>
          </Reveal>
          {group.map((c, i) => <Reveal key={c.slug} delay={0.08 + i * 0.06} className="lg:col-span-6"><CompanyCard c={c} label={relationshipLabels[c.relationship] || label(c.category)} /></Reveal>)}
        </div>
        {group.length === 0 && <Empty title="Associated businesses will be listed here." text="Group companies and associated businesses appear once their details are published." />}
        <p className="mt-6 text-sm text-soft">Each profile is a separate business. A company is described as owned by LAX360 Pvt Ltd only where its profile says so. Fatcat Wealthy’s services are provided by Fatcat Wealthy, not by LAX360 Pvt Ltd, and nothing here is financial advice or an offer; see its website for details.</p>
      </Section>

      {/* 7 Reseller & Software Distribution Partners */}
      <Section s={SECTIONS[6]} title="Reseller & Software" gradient="Distribution Partners." lead="Software vendors and their products, organised by vendor and category, and how a customer buys software through LAX360.">
        <ol className="mt-8 grid gap-3 sm:grid-cols-5" aria-label="How purchasing works">
          {PURCHASE.map(([t, d], i) => <Reveal as="li" key={t} delay={i * 0.05} className="rounded-2xl border border-edge bg-glass p-4"><span className="font-display text-sm font-bold text-lav">0{i + 1}</span><p className="mt-1 font-display text-lg font-semibold">{t}</p><p className="mt-1 text-sm text-soft">{d}</p></Reveal>)}
        </ol>
        {vendors.length > 0 || other.length > 0 ? (
          <div className="mt-10 space-y-6">
            {vendors.map(({ company: c, products }) => (
              <Reveal key={c.slug}>
                <article className="glass-flat p-6 md:p-8">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div><h3 className="font-display text-2xl font-semibold">{c.name}</h3><p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-lav">Software vendor{c.businessCategory ? ` · ${c.businessCategory}` : ''}</p></div>
                    <div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center rounded-full border border-edge-strong bg-glass px-3 py-1 text-xs font-semibold text-soft">{c.verified && c.relationship === 'reseller' ? 'Authorized reseller' : 'Reseller / licensing status: pending verification'}</span>{isHttp(c.website) && <a href={c.website} target="_blank" rel="noopener noreferrer" className="link-underline inline-flex min-h-11 items-center gap-1 font-semibold text-lav">Vendor website <ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>}</div>
                  </div>
                  {products.length > 0 ? (
                    <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {products.map((p) => <li key={p.slug} className="flex flex-col gap-1.5 rounded-2xl border border-edge bg-glass p-4"><span className="flex flex-wrap gap-1.5"><span className="rounded-full border border-edge-strong px-2.5 py-0.5 text-xs font-bold text-lav">{ownershipLabels[p.ownership]}</span><span className="rounded-full border border-edge px-2.5 py-0.5 text-xs font-semibold text-soft">{softwareCategories[p.category]}</span></span><span className="font-display text-lg font-semibold leading-tight">{p.name}</span><span className="flex-1 text-sm text-soft">{p.description}</span>{isHttp(p.link) && <a href={p.link} target="_blank" rel="noopener noreferrer" className="link-underline inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-lav">Vendor page <ArrowUpRight className="size-3.5" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>}</li>)}
                    </ul>
                  ) : <p className="mt-4 text-soft">Software products from this vendor will be listed once they are confirmed.</p>}
                  <div className="mt-5"><Link to="/contact?type=project" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-edge-strong px-5 font-semibold transition-colors hover:border-lav">Enquire about {c.name} software <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
                </article>
              </Reveal>
            ))}
          </div>
        ) : <Empty title="Software vendors will be listed here." text="Vendors, authorized reseller relationships and their software products appear in this section once they are confirmed." />}
        <p className="mt-6 text-sm text-soft">Vendor names and products are owned by their respective companies. Reseller or licensing status is shown as a designation only where it has been verified.</p>
      </Section>

      {/* 8 Implementation & Technology Ecosystem */}
      <Section s={SECTIONS[7]} tone="border-y border-edge bg-glass" title="Implementation &" gradient="Technology Ecosystem." lead="How LAX360 connects technology providers, software vendors, implementation services and customers.">
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map(([Icon, t, d, svc], i) => { const sv = getDivision(svc); return (
            <Reveal as="li" key={t} delay={(i % 4) * 0.05}>
              <Link to={`/services/${svc}`} className="glass-flat lift group flex h-full flex-col gap-2 p-5"><span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Icon className="size-5" aria-hidden="true" /></span><span className="font-display text-lg font-semibold leading-tight">{t}</span><span className="flex-1 text-sm text-soft">{d}</span><span className="inline-flex items-center gap-1 text-sm font-semibold text-lav">{sv?.name} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span></Link>
            </Reveal>
          ) })}
        </ul>
        <h3 className="mt-14 text-center font-display text-2xl font-semibold">The customer journey</h3>
        <ol className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:flex-nowrap lg:justify-between" aria-label="Customer journey">
          {JOURNEY.map(([Icon, t], i) => (
            <li key={t} className="flex items-center">
              <button type="button" onClick={() => setStep(i)} onMouseEnter={() => setStep(i)} onFocus={() => setStep(i)} aria-pressed={step === i} className="flex flex-col items-center gap-2 px-2 py-1">
                <span className={`flex size-14 items-center justify-center rounded-2xl border transition-all duration-300 ${step === i ? 'scale-110 border-transparent bg-gradient-to-br from-primary to-accent text-white shadow-[0_0_30px_-4px_rgb(var(--glow2)/0.8)]' : 'border-edge-strong bg-glass text-lav'}`}><Icon className="size-6" aria-hidden="true" /></span>
                <span className={`text-sm font-semibold ${step === i ? 'text-fg' : 'text-soft'}`}>{t}</span>
              </button>
              {i < JOURNEY.length - 1 && <ChevronRight className="hidden size-5 text-lav lg:block" aria-hidden="true" />}
            </li>
          ))}
        </ol>
        <m.div key={step} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="glass mx-auto mt-8 max-w-2xl p-6 text-center" aria-live="polite">
          <FlowIcon className="mx-auto size-8 text-lav" aria-hidden="true" /><p className="mt-3 font-display text-2xl font-semibold">{step + 1}. {JOURNEY[step][1]}</p><p className="mt-2 text-lg text-soft">{JOURNEY[step][2]}</p>
        </m.div>
        <h3 className="mt-14 font-display text-xl font-semibold">Implementation partners</h3>
        {implementation.length > 0
          ? <ul className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{implementation.map((c, i) => <Reveal as="li" key={c.slug} delay={(i % 3) * 0.07}><CompanyCard c={c} label={relationshipLabels[c.relationship]} /></Reveal>)}</ul>
          : <Empty title="No implementation partners are listed yet." text="Teams that deploy, integrate and support business software appear here once the relationship is confirmed. LAX360 also delivers implementation itself." />}
      </Section>

      {/* Why partner with LAX360 */}
      <section id="why-partner" className="border-y border-edge bg-base2/50 scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="why-partner-title">
        <div className="wrap section">
          <SectionHeading id="why-partner-title" eyebrow="Why partner with us" title="Why partner with" gradient="LAX360?" lead="What a partnership with LAX360 Pvt Ltd brings." />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whyPartner.map((w, i) => {
              const Icon = WHY_ICONS[w.icon]
              return (
                <Reveal as="li" key={w.title} delay={(i % 4) * 0.05} className={`glass-flat lift p-6 ${i === whyPartner.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-lav"><Icon className="size-5" aria-hidden="true" /></span>
                  <h3 className="mt-4 font-display text-lg font-semibold leading-tight">{w.title}</h3>
                  <p className="mt-2 text-soft">{w.text}</p>
                </Reveal>
              )
            })}
          </ul>
        </div>
      </section>

      {/* Partnership process */}
      <section id="partnership-process" className="wrap section scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="process-title">
        <SectionHeading id="process-title" eyebrow="Partnership process" title="From enquiry to" gradient="onboarding." lead="Every enquiry is reviewed. Submitting one does not guarantee a partnership: terms are agreed together." />
        <ol className="mt-12 grid gap-4 md:grid-cols-5">
          {partnershipProcess.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.06} className="glass-flat relative p-5">
              <span className="flex size-10 items-center justify-center rounded-full border-2 border-accent font-display text-base font-bold text-lav">{i + 1}</span>
              <h3 className="mt-4 font-display text-lg font-semibold leading-tight">{p.title}</h3>
              <p className="mt-2 text-sm text-soft">{p.text}</p>
              {i < partnershipProcess.length - 1 && <ChevronRight aria-hidden="true" className="absolute -right-3 top-8 hidden size-6 text-lav md:block" />}
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Final call to action */}
      <section className="relative overflow-hidden border-t border-edge bg-gradient-to-b from-base2 to-deep/50" aria-labelledby="network-cta-title">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-0 size-[30rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.28), transparent)' }} />
        <div className="wrap section relative text-center">
          <Reveal className="mx-auto max-w-3xl">
            <h2 id="network-cta-title" className="h1 !text-[clamp(2.2rem,4.6vw,4rem)]"><span className="text-gradient">{np.cta_heading || networkCta.heading}</span></h2>
            {(np.cta_text ? [np.cta_text] : networkCta.paragraphs).map((p) => <p key={p} className="lead mt-5 text-soft">{p}</p>)}
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href="#partnership-opportunities" arrow onClick={(e) => { e.preventDefault(); go('partnership-opportunities') }}>Explore Partnership Opportunities</Button>
              <Button to="/contact" variant="secondary">Contact LAX360</Button>
            </div>
          </Reveal>
        </div>
      </section>

      {enquiry && <PartnershipModal category={enquiry} onClose={() => setEnquiry(null)} />}
    </PageContainer>
  )
}
