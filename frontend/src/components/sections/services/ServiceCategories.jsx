import { useState } from 'react'
import { Link } from 'react-router-dom'
import { m, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, Boxes, BrainCircuit, CalendarCheck, Check, ClipboardList, CreditCard, FileText, Globe2, LayoutDashboard, Mail, MapPin,
  Megaphone, MessageCircle, MessagesSquare, Package, PenLine, Receipt, Search, Share2, ShoppingCart, Sparkles, Users, Webhook, Wrench, KeyRound,
} from 'lucide-react'
import Reveal from '../../ui/Reveal.jsx'
import { getDivision, offeringsByGroup } from '../../../data/services.js'
import { divisionIcons } from '../../../utils/divisionIcons.js'
import { offeringHref } from '../../../utils/slugify.js'
import { useSite } from '../../../hooks/useSite.js'

const sw = getDivision('software')
const ai = getDivision('ai')
const growth = getDivision('growth')
const headless = getDivision('headless')
const automation = getDivision('automation')
const mobile = getDivision('mobile')

const img = (src, className = '') => <img src={src} alt="" width="1000" height="800" loading="lazy" decoding="async" className={`h-full w-full object-cover ${className}`} />

/** The text block every category opens with: number, icon, name, summary, the problems it addresses and the two standard links. */
function Head({ d, className = '' }) {
  const Icon = divisionIcons[d.slug]
  return (
    <Reveal className={className}>
      <div className="flex items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg"><Icon className="size-6" aria-hidden="true" /></span>
        <span className="font-display text-sm font-semibold tracking-wider text-lav">CATEGORY {d.number}</span>
      </div>
      <h2 className="h2 mt-5">{d.name}</h2>
      <p className="lead mt-4 text-soft">{d.overview}</p>
      <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-lav">Helps when</p>
      <ul className="mt-2 space-y-1.5">
        {d.challenges.slice(0, 3).map((c) => (
          <li key={c} className="flex gap-2.5 text-soft"><Check className="mt-1 size-4 shrink-0 text-lav" aria-hidden="true" />{c}</li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1">
        <Link to={`/services/${d.slug}`} className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold text-lav">Category details <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
        <Link to={`/contact?type=${d.enquiryType}`} className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold">Enquire <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
      </div>
    </Reveal>
  )
}

/** 01 — photo beside the text; services as open lists grouped under their heading. */
function Software() {
  const icons = [Boxes, Globe2, LayoutDashboard, Wrench, Users, ClipboardList, ShoppingCart]
  let n = -1
  return (
    <section id="software" aria-label={sw.name} className="scroll-mt-[calc(var(--header-bottom,92px)+var(--catnav-h,64px)+1rem)] wrap section">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <Reveal x={-24} y={0} className="lg:col-span-5">
          <div className="relative lg:sticky lg:top-40">
            <div className="overflow-hidden rounded-[2rem] border border-edge-strong shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]">{img(sw.photo, 'aspect-[4/4.4]')}</div>
            <span aria-hidden="true" className="absolute -bottom-4 -right-3 -z-10 h-full w-full rounded-[2rem] border-2 border-dashed border-lav/40" />
          </div>
        </Reveal>
        <div className="lg:col-span-7">
          <Head d={sw} />
          <div className="mt-10 space-y-8">
            {offeringsByGroup(sw).map((g) => (
              <div key={g.title}>
                <p className="eyebrow text-lav">{g.title}</p>
                <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">
                  {g.items.map((o) => {
                    n += 1
                    const Icon = icons[n]
                    return (
                      <li key={o.name} className="border-t border-edge">
                        <Link to={offeringHref('software', o.name)} className="group flex gap-3 py-4">
                          <Icon className="mt-0.5 size-5 shrink-0 text-lav transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                          <span><span className="block font-display text-lg font-semibold transition-colors group-hover:text-lav">{o.name}</span><span className="mt-1 block text-soft">{o.text}</span></span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** 02 — wide photo banner on top, then numbered cards. */
function Ai() {
  const icons = [Sparkles, MessagesSquare, BrainCircuit, Search, Webhook, Boxes, ClipboardList]
  const Icon = divisionIcons.ai
  return (
    <section id="ai" aria-label={ai.name} className="scroll-mt-[calc(var(--header-bottom,92px)+var(--catnav-h,64px)+1rem)] border-y border-edge bg-glass">
      <div className="wrap section">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-edge-strong">
            {img(ai.photo, 'aspect-[16/8] sm:aspect-[21/8]')}
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 text-white sm:p-10">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg"><Icon className="size-6" aria-hidden="true" /></span>
              <p className="mt-3 font-display text-sm font-semibold tracking-wider text-white/80">CATEGORY {ai.number}</p>
              <h2 className="h2 mt-1 !text-white">{ai.name}</h2>
            </div>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="lead text-soft">{ai.overview}</p>
            <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-lav">Helps when</p>
            <ul className="mt-2 space-y-1.5">{ai.challenges.slice(0, 3).map((c) => <li key={c} className="flex gap-2.5 text-soft"><Check className="mt-1 size-4 shrink-0 text-lav" aria-hidden="true" />{c}</li>)}</ul>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1">
              <Link to={`/services/${ai.slug}`} className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold text-lav">Category details <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
              <Link to="/contact?type=ai" className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold">Book an AI consultation <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </Reveal>
          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {ai.offerings.map((o, i) => {
              const OIcon = icons[i]
              return (
                <Reveal as="li" key={o.name} delay={(i % 2) * 0.07} className={i === ai.offerings.length - 1 && ai.offerings.length % 2 ? 'sm:col-span-2' : ''}>
                  <Link to={offeringHref('ai', o.name)} className="glass-flat lift group flex h-full gap-4 p-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-lav transition-colors duration-300 group-hover:bg-primary group-hover:text-white"><OIcon className="size-5" aria-hidden="true" /></span>
                    <span><span className="block font-display text-lg font-semibold leading-tight">{o.name}</span><span className="mt-1.5 block text-soft">{o.text}</span></span>
                  </Link>
                </Reveal>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

const GROWTH_ICONS = { 'Social Media Management': Share2, 'Meta Ads Management': Megaphone, 'Google Ads Management': Search, 'Search Engine Optimization (SEO)': Search, 'Website & Landing Page Optimization': LayoutDashboard, 'Content Creation': PenLine, 'Digital Marketing Strategy': ClipboardList }

/** 03 — services as selectable pills; the chosen one is explained in a panel over the photo. */
function Growth() {
  const [pick, setPick] = useState(growth.offerings[0].name)
  const cur = growth.offerings.find((o) => o.name === pick)
  const CurIcon = GROWTH_ICONS[pick] || Megaphone
  return (
    <section id="growth" aria-label={growth.name} className="scroll-mt-[calc(var(--header-bottom,92px)+var(--catnav-h,64px)+1rem)] wrap section">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
        <Head d={growth} className="lg:col-span-6" />
        <Reveal x={24} y={0} className="lg:col-span-6">
          <div className="relative overflow-hidden rounded-[2rem] border border-edge-strong">
            {img(growth.photo, 'aspect-[4/3]')}
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/20 bg-black/45 p-4 text-white backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-5" aria-live="polite">
              <AnimatePresence mode="wait">
                <m.div key={pick} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <p className="flex items-center gap-2 font-display text-lg font-semibold"><CurIcon className="size-5 text-sky" aria-hidden="true" />{cur.name}</p>
                  <p className="mt-1 text-white/85">{cur.text}</p>
                </m.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {offeringsByGroup(growth).map((g, i) => (
          <Reveal key={g.title} delay={i * 0.06} className="rounded-3xl border border-edge bg-glass p-5">
            <p className="eyebrow text-lav">{g.title}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {g.items.map((o) => (
                <li key={o.name}>
                  <button type="button" onClick={() => setPick(o.name)} onMouseEnter={() => setPick(o.name)} onFocus={() => setPick(o.name)} aria-pressed={pick === o.name}
                    className={`rounded-full border px-3.5 py-1.5 text-left text-sm font-semibold transition-all duration-200 ${pick === o.name ? 'border-transparent bg-primary text-white shadow-lg' : 'border-edge-strong bg-glass hover:border-lav'}`}>
                    {o.name}
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

const HEADLESS_ICONS = { 'Authentication APIs': KeyRound, 'Billing & Subscription APIs': CreditCard, 'Payment Gateway Integration': CreditCard, 'Booking & Appointment APIs': CalendarCheck, 'CRM APIs': Users, 'Notification APIs': Mail, 'File & Media APIs': FileText, 'AI APIs': BrainCircuit }

/** 04 — the featured category: a full-width gradient panel presenting reusable backend services and APIs, with an API Hub call to action. */
function Headless() {
  const site = useSite()
  const hubExternal = /^https?:/.test(site.apiHubUrl)
  const hubCls = 'group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-violet-800 shadow-xl transition-transform duration-200 hover:-translate-y-0.5 dark:bg-sky dark:text-night'
  return (
    <section id="headless" aria-label={headless.name} className="scroll-mt-[calc(var(--header-bottom,92px)+var(--catnav-h,64px)+1rem)] wrap section">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] border border-edge-strong bg-gradient-to-br from-primary via-primary to-accent p-6 text-white shadow-[0_40px_90px_-40px_rgb(var(--glow)/0.8)] sm:p-10 lg:p-14 dark:from-base2 dark:via-night dark:to-deep">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/15 blur-3xl dark:bg-sky/15" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(180deg,#000,transparent_70%)]" />
          <div className="relative grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em]"><Sparkles className="size-3.5" aria-hidden="true" />Featured · Category {headless.number}</p>
              <h2 className="h2 mt-5 !text-white">{headless.name}</h2>
              <p className="lead mt-4 text-white/90">
                LAX360 provides reusable backend services, APIs and SaaS infrastructure, so developers, startups, agencies and businesses can add proven building blocks to their products instead of building each one from scratch.
              </p>
              <p className="mt-4 text-white/85">{headless.overview}</p>
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Who it is for">
                {headless.audiences.map((a) => <li key={a} className="rounded-full border border-white/30 bg-white/10 px-3.5 py-1 text-sm font-semibold">{a}</li>)}
              </ul>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {hubExternal
                  ? <a href={site.apiHubUrl} target="_blank" rel="noopener noreferrer" className={hubCls}>Explore the API Hub <ArrowUpRight className="size-5" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
                  : <Link to={site.apiHubUrl} className={hubCls}>Explore the API Hub <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>}
                <Link to="/contact?type=project" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/40 px-6 py-3 font-semibold transition-colors hover:bg-white/10">Discuss your requirements</Link>
              </div>
              <p className="mt-3 text-sm text-white/80"><Link to={`/services/${headless.slug}`} className="underline underline-offset-4">Category details</Link></p>
            </div>

            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-3xl border border-white/20 bg-black/35 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3"><span className="size-2.5 rounded-full bg-white/40" /><span className="size-2.5 rounded-full bg-white/40" /><span className="size-2.5 rounded-full bg-white/40" /><span className="ml-2 text-xs text-white/70">Illustrative endpoints</span></div>
                <pre className="overflow-x-auto p-4 font-mono text-[0.8rem] leading-7 text-white/90 sm:text-sm" aria-label="Example API endpoints"><code>{`POST  /v1/auth/login
GET   /v1/subscriptions/{id}
POST  /v1/bookings
POST  /v1/notifications
POST  /v1/files`}</code></pre>
              </div>
              <div className="mt-4 overflow-hidden rounded-3xl border border-white/20">{img(headless.photo, 'aspect-[16/8]')}</div>
            </div>
          </div>

          <ul className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="What this category provides">
            {headless.highlights.map((h, i) => (
              <Reveal as="li" key={h.title} delay={(i % 3) * 0.06} className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm transition-colors duration-300 hover:bg-white/15">
                <p className="font-display text-lg font-semibold">{h.title}</p>
                <p className="mt-1 text-white/85">{h.text}</p>
              </Reveal>
            ))}
          </ul>

          <div className="relative mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {offeringsByGroup(headless).map((g) => (
              <div key={g.title}>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/75">{g.title}</p>
                <ul className="mt-3 space-y-1.5">
                  {g.items.map((o) => {
                    const Icon = HEADLESS_ICONS[o.name] || Package
                    return (
                      <li key={o.name}>
                        <Link to={offeringHref('headless', o.name)} title={o.text} className="group flex items-start gap-2.5 rounded-lg py-1 font-semibold text-white transition-transform duration-200 hover:translate-x-1">
                          <Icon className="mt-0.5 size-4 shrink-0 text-white/75" aria-hidden="true" />{o.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/** 05 — an illustrated trigger → workflow → action strip over the photo, then the list of automation services. */
function Automation() {
  const icons = [Webhook, ClipboardList, MessageCircle, Mail, Users, BrainCircuit, Boxes, Webhook]
  const nodes = [
    { label: 'Trigger', items: 'Form · WhatsApp · Email' },
    { label: 'Workflow', items: 'n8n automation' },
    { label: 'Actions', items: 'CRM · Notifications · Records' },
  ]
  return (
    <section id="automation" aria-label={automation.name} className="scroll-mt-[calc(var(--header-bottom,92px)+var(--catnav-h,64px)+1rem)] border-y border-edge bg-glass">
      <div className="wrap section">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <Head d={automation} className="lg:col-span-5" />
          <Reveal x={24} y={0} className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-[2rem] border border-edge-strong">
              {img(automation.photo, 'aspect-[16/10]')}
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            </div>
            <div className="glass relative z-10 -mt-12 mx-3 p-4 sm:mx-8" role="img" aria-label="Illustration: a trigger starts a workflow, which performs actions in your tools">
              <div className="flex items-stretch justify-between gap-1.5 sm:gap-3">
                {nodes.map((n, i) => (
                  <div key={n.label} className="flex flex-1 items-center gap-1.5 sm:gap-3">
                    <div className={`flex-1 rounded-2xl border p-3 text-center ${i === 1 ? 'border-transparent bg-gradient-to-br from-primary to-accent text-white' : 'border-edge-strong bg-glass'}`}>
                      <p className="font-display text-sm font-semibold sm:text-base">{n.label}</p>
                      <p className={`mt-0.5 text-[0.7rem] sm:text-xs ${i === 1 ? 'text-white/85' : 'text-soft'}`}>{n.items}</p>
                    </div>
                    {i < nodes.length - 1 && <ArrowRight className="size-4 shrink-0 text-lav motion-safe:animate-pulse sm:size-5" aria-hidden="true" />}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-soft">Illustrative example</p>
            </div>
          </Reveal>
        </div>
        <ul className="mt-12 grid gap-x-10 sm:grid-cols-2">
          {automation.offerings.map((o, i) => {
            const Icon = icons[i]
            return (
              <Reveal as="li" key={o.name} delay={(i % 2) * 0.06} className="border-t border-edge">
                <Link to={offeringHref('automation', o.name)} className="group flex gap-4 py-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-glass text-lav ring-1 ring-edge-strong transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:ring-transparent"><Icon className="size-5" aria-hidden="true" /></span>
                  <span><span className="block font-display text-lg font-semibold transition-colors group-hover:text-lav">{o.name}</span><span className="mt-1 block text-soft">{o.text}</span></span>
                </Link>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/** 06 — the phone photo first, then a card per application. */
function Mobile() {
  const icons = [CalendarCheck, ClipboardList, MapPin, Receipt, Package, Boxes]
  return (
    <section id="mobile" aria-label={mobile.name} className="scroll-mt-[calc(var(--header-bottom,92px)+var(--catnav-h,64px)+1rem)] wrap section">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <Reveal x={-24} y={0} className="lg:col-span-5">
          <div className="overflow-hidden rounded-[2rem] border border-edge-strong shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]">{img(mobile.photo, 'aspect-[4/4.2]')}</div>
        </Reveal>
        <Head d={mobile} className="lg:col-span-7" />
      </div>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {mobile.offerings.map((o, i) => {
          const Icon = icons[i]
          return (
            <Reveal as="li" key={o.name} delay={(i % 3) * 0.07}>
              <Link to={offeringHref('mobile', o.name)} className="glass-flat lift group flex h-full flex-col gap-3 p-6">
                <span className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"><Icon className="size-6" aria-hidden="true" /></span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-soft">{o.group}</span>
                </span>
                <span className="font-display text-xl font-semibold leading-tight">{o.name}</span>
                <span className="text-soft">{o.text}</span>
              </Link>
            </Reveal>
          )
        })}
      </ul>
    </section>
  )
}

export default function ServiceCategories() {
  return (
    <>
      <Software />
      <Ai />
      <Growth />
      <Headless />
      <Automation />
      <Mobile />
    </>
  )
}
