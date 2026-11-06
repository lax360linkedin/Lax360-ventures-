import { useState } from 'react'
import { Link } from 'react-router-dom'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, ChevronRight } from 'lucide-react'
import Button from '../../ui/Button.jsx'
import Reveal from '../../ui/Reveal.jsx'
import BotHighlight from '../../ui/BotHighlight.jsx'
import { getOffering, offeringsByGroup } from '../../../data/services.js'
import { divisionIcons } from '../../../utils/divisionIcons.js'
import { serviceIcons } from '../../../utils/serviceIcons.js'
import { offeringHref } from '../../../utils/slugify.js'
import { useSite } from '../../../hooks/useSite.js'

const P = (n) => `/assets/services/items/p${String(n).padStart(2, '0')}.webp`
const EASE = [0.2, 0.8, 0.2, 1]
const photoOf = (d, o) => getOffering(d.slug, o.slug)?.photo || d.photo
const crumbCls = 'inline-flex min-h-9 items-center transition-colors hover:text-lav'

export function Crumb({ d, light = false }) {
  const sep = <ChevronRight className="size-3.5 opacity-70" aria-hidden="true" />
  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${light ? 'text-white/80' : 'text-soft'}`}>
      <ol className="flex flex-wrap items-center gap-x-1.5">
        <li><Link to="/" className={crumbCls}>Home</Link></li>{sep}
        <li><Link to="/services" className={crumbCls}>Services</Link></li>{sep}
        <li aria-current="page" className={`font-semibold ${light ? 'text-white' : 'text-fg'}`}>{d.name}</li>
      </ol>
    </nav>
  )
}

const Eyebrow = ({ d, light = false }) => {
  const Icon = divisionIcons[d.slug]
  return (
    <p className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] backdrop-blur-md ${light ? 'border-white/30 bg-white/10 text-white' : 'border-edge-strong bg-glass text-lav'}`}>
      <Icon className="size-3.5" aria-hidden="true" />Category {d.number} · {d.name}
    </p>
  )
}

const rise = (reduce, delay) => (reduce ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } })
const frame = 'overflow-hidden rounded-[2rem] border border-edge-strong shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]'
const heroBg = 'relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night'
const blobs = (
  <>
    <div aria-hidden="true" className="absolute -left-28 top-10 -z-10 size-[24rem] rounded-full bg-primary/20 blur-3xl" />
    <div aria-hidden="true" className="absolute -right-24 bottom-0 -z-10 size-[26rem] rounded-full bg-sky/15 blur-3xl" />
  </>
)

function Ctas({ d, light = false }) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      {d.slug === 'ai'
        ? <Button to={`/contact?type=${d.enquiryType}`} variant="violet" arrow>Book an AI consultation</Button>
        : <Button to={`/contact?type=${d.enquiryType}`} arrow>Discuss Your Project</Button>}
      <Button href="#services" variant="secondary" className={light ? '!border-white/40 !bg-white/10 !text-white hover:!bg-white/20' : ''} onClick={(e) => { e.preventDefault(); document.getElementById("services")?.scrollIntoView({ behavior: "smooth" }) }}>Explore the services</Button>
    </div>
  )
}

/* ============================================================ HEROES (one per category) ============================================================ */

/** 01 — text left, photo right with the category's groups pinned to it as labelled chips. */
function HeroSoftware({ d }) {
  const reduce = useReducedMotion()
  return (
    <section className={heroBg} aria-labelledby="cat-title">
      {blobs}
      <div className="wrap grid items-center gap-12 pb-16 pt-8 md:pt-10 lg:grid-cols-12 lg:pb-24">
        <div className="lg:col-span-6">
          <m.div {...rise(reduce, 0.05)}><Crumb d={d} /></m.div>
          <m.div {...rise(reduce, 0.1)} className="mt-6"><Eyebrow d={d} /></m.div>
          <m.h1 {...rise(reduce, 0.18)} id="cat-title" className="h1 mt-5 !text-[clamp(2.3rem,4.8vw,4.2rem)]">Software that <BotHighlight delay={0.9}><span className="text-gradient">fits how you work.</span></BotHighlight></m.h1>
          <m.p {...rise(reduce, 0.28)} className="lead mt-6 max-w-xl text-soft">{d.short}</m.p>
          <m.div {...rise(reduce, 0.36)}><Ctas d={d} /></m.div>
        </div>
        <m.div {...rise(reduce, 0.3)} className="lg:col-span-6">
          <div className="relative mx-auto max-w-lg">
            <div className={frame}><img src={d.photo} alt="" width="1000" height="800" fetchPriority="high" decoding="async" className="aspect-[5/4] w-full object-cover" /></div>
            <ul className="absolute -bottom-6 left-4 right-4 flex flex-wrap gap-2" aria-label="Service groups">
              {offeringsByGroup(d).map((g) => <li key={g.title} className="glass px-4 py-2 text-sm font-semibold">{g.title} <span className="text-lav">· {g.items.length}</span></li>)}
            </ul>
          </div>
        </m.div>
      </div>
    </section>
  )
}

/** 02 — a full-bleed photograph under a dark gradient with the text over it and an illustrated workflow strip along the bottom. */
function HeroAi({ d }) {
  const reduce = useReducedMotion()
  return (
    <section className="relative isolate overflow-hidden border-b border-edge text-white" aria-labelledby="cat-title">
      <img src={d.photo} alt="" width="1000" height="800" fetchPriority="high" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a0c10]/90 via-[#0a0c10]/70 to-[#0a0c10]/25" />
      <div className="wrap pb-14 pt-8 md:pt-10 lg:pb-20">
        <m.div {...rise(reduce, 0.05)}><Crumb d={d} light /></m.div>
        <div className="mt-14 max-w-3xl lg:mt-20">
          <m.div {...rise(reduce, 0.1)}><Eyebrow d={d} light /></m.div>
          <m.h1 {...rise(reduce, 0.18)} id="cat-title" className="h1 mt-5 !text-[clamp(2.3rem,5vw,4.5rem)] !text-white">Let AI handle the <span className="text-sky">repetitive work.</span></m.h1>
          <m.p {...rise(reduce, 0.28)} className="lead mt-6 max-w-2xl text-white/85">{d.short}</m.p>
          <m.div {...rise(reduce, 0.36)}><Ctas d={d} light /></m.div>
        </div>
        <m.div {...rise(reduce, 0.45)} className="mt-14 rounded-3xl border border-white/20 bg-black/40 p-4 backdrop-blur-md md:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">{d.workflowLabel}</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-4">
            {d.workflow.map((s, i) => (
              <li key={s} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky font-display text-sm font-bold text-[#0a0c10]">{i + 1}</span>
                <span className="font-display font-semibold leading-tight">{s}</span>
              </li>
            ))}
          </ol>
        </m.div>
      </div>
    </section>
  )
}

/** 03 — a three-photo collage (campaign work, social and analytics) beside the text, with a column of channel chips. */
function HeroGrowth({ d }) {
  const reduce = useReducedMotion()
  return (
    <section className={heroBg} aria-labelledby="cat-title">
      {blobs}
      <div className="wrap grid items-center gap-12 pb-16 pt-8 md:pt-10 lg:grid-cols-12 lg:pb-24">
        <div className="lg:order-2 lg:col-span-6">
          <m.div {...rise(reduce, 0.05)}><Crumb d={d} /></m.div>
          <m.div {...rise(reduce, 0.1)} className="mt-6"><Eyebrow d={d} /></m.div>
          <m.h1 {...rise(reduce, 0.18)} id="cat-title" className="h1 mt-5 !text-[clamp(2.3rem,4.8vw,4.2rem)]">Be found. Be remembered. <BotHighlight delay={0.9}><span className="text-gradient">Be contacted.</span></BotHighlight></m.h1>
          <m.p {...rise(reduce, 0.28)} className="lead mt-6 max-w-xl text-soft">{d.short}</m.p>
          <m.div {...rise(reduce, 0.36)}><Ctas d={d} /></m.div>
        </div>
        <m.div {...rise(reduce, 0.3)} className="lg:col-span-6">
          <div className="relative mx-auto grid max-w-md grid-cols-6 grid-rows-6 gap-3 sm:max-w-lg">
            <div className="col-span-4 row-span-4 overflow-hidden rounded-[2rem] border border-edge-strong shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]"><img src={d.photo} alt="" width="1000" height="800" fetchPriority="high" decoding="async" className="h-full w-full object-cover" /></div>
            <div className="col-span-2 row-span-3 overflow-hidden rounded-3xl border border-edge-strong"><img src={P(24)} alt="" width="900" height="675" decoding="async" className="h-full w-full object-cover" /></div>
            <div className="col-span-2 row-span-3 row-start-4 overflow-hidden rounded-3xl border border-edge-strong"><img src={P(6)} alt="" width="900" height="675" decoding="async" className="h-full w-full object-cover" /></div>
            <ul className="col-span-4 row-span-2 flex flex-wrap content-center gap-2" aria-label="Channels">
              {d.tags.map((t) => <li key={t} className="rounded-full border border-edge-strong bg-glass px-3.5 py-1.5 text-sm font-semibold">{t}</li>)}
            </ul>
          </div>
        </m.div>
      </div>
    </section>
  )
}

/** 04 — the featured gradient panel: positioning, who it is for, the API Hub call to action and an example endpoint list. */
function HeroHeadless({ d }) {
  const reduce = useReducedMotion()
  const site = useSite()
  const external = /^https?:/.test(site.apiHubUrl)
  const hubCls = 'group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-violet-800 shadow-xl transition-transform duration-200 hover:-translate-y-0.5 dark:bg-sky dark:text-night'
  return (
    <section className="wrap pt-8 md:pt-10" aria-labelledby="cat-title">
      <Crumb d={d} />
      <m.div {...rise(reduce, 0.1)} className="relative mt-6 overflow-hidden rounded-[2.5rem] border border-edge-strong bg-gradient-to-br from-primary via-primary to-accent p-6 text-white shadow-[0_40px_90px_-40px_rgb(var(--glow)/0.8)] sm:p-10 lg:p-14 dark:from-base2 dark:via-night dark:to-deep">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/15 blur-3xl dark:bg-sky/15" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(180deg,#000,transparent_70%)]" />
        <div className="relative grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow d={d} light />
            <h1 id="cat-title" className="h1 mt-5 !text-[clamp(2.2rem,4.6vw,4rem)] !text-white">Backend services you can plug in.</h1>
            <p className="lead mt-5 text-white/90">Reusable backend services, APIs and SaaS infrastructure for developers, startups, agencies and businesses.</p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Who it is for">{d.audiences.map((a) => <li key={a} className="rounded-full border border-white/30 bg-white/10 px-3.5 py-1 text-sm font-semibold">{a}</li>)}</ul>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {external
                ? <a href={site.apiHubUrl} target="_blank" rel="noopener noreferrer" className={hubCls}>Explore the API Hub <ArrowUpRight className="size-5" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
                : <Link to={site.apiHubUrl} className={hubCls}>Explore the API Hub <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>}
              <a href="#services" onClick={(e) => { e.preventDefault(); document.getElementById("services")?.scrollIntoView({ behavior: "smooth" }) }} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-6 py-3 font-semibold transition-colors hover:bg-white/10">Browse the services</a>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-3xl border border-white/20 bg-black/35 backdrop-blur-md">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3"><span className="size-2.5 rounded-full bg-white/40" /><span className="size-2.5 rounded-full bg-white/40" /><span className="size-2.5 rounded-full bg-white/40" /><span className="ml-2 text-xs text-white/70">Illustrative endpoints</span></div>
              <pre className="overflow-x-auto p-4 font-mono text-[0.8rem] leading-7 text-white/90 sm:text-sm" aria-label="Example API endpoints"><code>{`POST  /v1/auth/login
GET   /v1/subscriptions/{id}
POST  /v1/bookings
POST  /v1/notifications
POST  /v1/files`}</code></pre>
            </div>
            <div className="mt-4 overflow-hidden rounded-3xl border border-white/20"><img src={d.photo} alt="" width="1000" height="800" fetchPriority="high" decoding="async" className="aspect-[16/8] w-full object-cover" /></div>
          </div>
        </div>
      </m.div>
    </section>
  )
}

/** 05 — centred heading above a wide photograph with a trigger → workflow → actions strip laid over it. */
function HeroAutomation({ d }) {
  const reduce = useReducedMotion()
  const nodes = [['Trigger', 'Form · WhatsApp · Email'], ['Workflow', 'n8n automation'], ['Actions', 'CRM · Notifications · Records']]
  return (
    <section className={heroBg} aria-labelledby="cat-title">
      {blobs}
      <div className="wrap pb-16 pt-8 md:pt-10 lg:pb-24">
        <m.div {...rise(reduce, 0.05)}><Crumb d={d} /></m.div>
        <div className="mx-auto mt-8 max-w-3xl text-center">
          <m.div {...rise(reduce, 0.1)} className="flex justify-center"><Eyebrow d={d} /></m.div>
          <m.h1 {...rise(reduce, 0.18)} id="cat-title" className="h1 mt-5 !text-[clamp(2.3rem,5vw,4.4rem)]">Let your tools <BotHighlight delay={0.9}><span className="text-gradient">work together.</span></BotHighlight></m.h1>
          <m.p {...rise(reduce, 0.28)} className="lead mt-6 text-soft">{d.short}</m.p>
          <m.div {...rise(reduce, 0.36)} className="flex justify-center"><Ctas d={d} /></m.div>
        </div>
        <m.div {...rise(reduce, 0.45)} className="relative mx-auto mt-12 max-w-4xl">
          <div className={frame}><img src={d.photo} alt="" width="1000" height="800" fetchPriority="high" decoding="async" className="aspect-[16/8] w-full object-cover" /></div>
          <div className="glass absolute -bottom-8 left-3 right-3 p-3 sm:left-10 sm:right-10 sm:p-4" role="img" aria-label="Illustration: a trigger starts a workflow, which performs actions in your tools">
            <div className="flex items-stretch gap-1.5 sm:gap-3">
              {nodes.map(([a, b], i) => (
                <div key={a} className="flex flex-1 items-center gap-1.5 sm:gap-3">
                  <div className={`flex-1 rounded-2xl border p-2.5 text-center ${i === 1 ? 'border-transparent bg-gradient-to-br from-primary to-accent text-white' : 'border-edge-strong bg-glass'}`}>
                    <p className="font-display text-sm font-semibold sm:text-base">{a}</p><p className={`text-[0.68rem] sm:text-xs ${i === 1 ? 'text-white/85' : 'text-soft'}`}>{b}</p>
                  </div>
                  {i < 2 && <ArrowRight className="size-4 shrink-0 text-lav motion-safe:animate-pulse" aria-hidden="true" />}
                </div>
              ))}
            </div>
          </div>
        </m.div>
      </div>
    </section>
  )
}

/** 06 — the phone photograph first on the left, text on the right with the application types as floating chips. */
function HeroMobile({ d }) {
  const reduce = useReducedMotion()
  return (
    <section className={heroBg} aria-labelledby="cat-title">
      {blobs}
      <div className="wrap grid items-center gap-12 pb-16 pt-8 md:pt-10 lg:grid-cols-12 lg:pb-24">
        <m.div {...rise(reduce, 0.2)} className="lg:col-span-5">
          <div className="relative mx-auto max-w-sm">
            <div className={`${frame} rotate-[-2deg]`}><img src={d.photo} alt="" width="1000" height="800" fetchPriority="high" decoding="async" className="aspect-[4/5] w-full object-cover" /></div>
            {d.offerings.slice(0, 3).map((o, i) => {
              const Icon = serviceIcons[o.slug]
              return (
                <span key={o.slug} className={`glass absolute flex items-center gap-2 px-3 py-2 text-xs font-semibold sm:text-sm ${['-right-3 top-8', '-left-3 top-1/2', '-right-2 bottom-6'][i]} ${reduce ? '' : 'motion-safe:animate-[net-bob_5s_ease-in-out_infinite]'}`} style={{ animationDelay: `${i * 0.7}s` }}>
                  <Icon className="size-4 text-lav" aria-hidden="true" />{o.name.replace(' Applications', '')}
                </span>
              )
            })}
          </div>
        </m.div>
        <div className="lg:col-span-7">
          <m.div {...rise(reduce, 0.05)}><Crumb d={d} /></m.div>
          <m.div {...rise(reduce, 0.1)} className="mt-6"><Eyebrow d={d} /></m.div>
          <m.h1 {...rise(reduce, 0.18)} id="cat-title" className="h1 mt-5 !text-[clamp(2.3rem,4.8vw,4.2rem)]">Business tools, <BotHighlight delay={0.9}><span className="text-gradient">built for the phone.</span></BotHighlight></m.h1>
          <m.p {...rise(reduce, 0.28)} className="lead mt-6 max-w-xl text-soft">{d.short}</m.p>
          <m.div {...rise(reduce, 0.36)}><Ctas d={d} /></m.div>
        </div>
      </div>
    </section>
  )
}

export const heroes = { software: HeroSoftware, ai: HeroAi, growth: HeroGrowth, headless: HeroHeadless, automation: HeroAutomation, mobile: HeroMobile }

/* ======================================================= SERVICE SECTIONS (one layout per category) ======================================================= */

const readMore = (
  <span className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-lav">View service <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
)

/** Software — each group is a labelled block of numbered cards. */
function SoftwareServices({ d }) {
  let n = 0
  return (
    <div className="space-y-14">
      {offeringsByGroup(d).map((g) => (
        <div key={g.title} className="grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-3"><p className="eyebrow text-lav">{g.title}</p><p className="mt-2 text-soft">{g.title === 'Build' ? 'The software and sites your customers and team use.' : 'The systems that keep daily operations running.'}</p></Reveal>
          <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-9">
            {g.items.map((o) => {
              n += 1
              const Icon = serviceIcons[o.slug]
              return (
                <Reveal as="li" key={o.slug} delay={(n % 2) * 0.06}>
                  <Link to={offeringHref(d.slug, o.name)} className="glass-flat lift group flex h-full flex-col gap-3 p-6">
                    <span className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"><Icon className="size-5" aria-hidden="true" /></span><span className="font-display text-sm font-bold text-lav">0{n}</span></span>
                    <span className="font-display text-xl font-semibold leading-tight">{o.name}</span>
                    <span className="flex-1 text-soft">{o.text}</span>{readMore}
                  </Link>
                </Reveal>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** AI — groups as tabs; the chosen group's services show as photo cards. */
function AiServices({ d }) {
  const groups = offeringsByGroup(d)
  const [tab, setTab] = useState(groups[0].title)
  const cur = groups.find((g) => g.title === tab)
  return (
    <div>
      <div role="tablist" aria-label="Service groups" className="no-scrollbar flex gap-2 overflow-x-auto">
        {groups.map((g) => (
          <button key={g.title} type="button" role="tab" aria-selected={tab === g.title} onClick={() => setTab(g.title)}
            className={`shrink-0 rounded-full border px-5 py-2.5 font-semibold transition-all duration-200 ${tab === g.title ? 'border-transparent bg-primary text-white shadow-lg' : 'border-edge-strong bg-glass hover:border-lav'}`}>
            {g.title} <span className="opacity-70">· {g.items.length}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <m.ul key={tab} role="tabpanel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cur.items.map((o) => (
            <li key={o.slug}>
              <Link to={offeringHref(d.slug, o.name)} className="glass-flat lift group flex h-full flex-col overflow-hidden">
                <span className="block overflow-hidden"><img src={photoOf(d, o)} alt="" width="900" height="675" loading="lazy" decoding="async" className="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" /></span>
                <span className="flex flex-1 flex-col gap-2 p-6"><span className="font-display text-xl font-semibold leading-tight">{o.name}</span><span className="flex-1 text-soft">{o.text}</span>{readMore}</span>
              </Link>
            </li>
          ))}
        </m.ul>
      </AnimatePresence>
    </div>
  )
}

/** Marketing — alternating photo rows. */
function GrowthServices({ d }) {
  return (
    <ol className="space-y-8">
      {d.offerings.map((o, i) => {
        const Icon = serviceIcons[o.slug]
        return (
          <Reveal as="li" key={o.slug} x={i % 2 ? 24 : -24} y={0}>
            <Link to={offeringHref(d.slug, o.name)} className={`glass-flat group grid overflow-hidden transition-colors duration-300 hover:border-lav md:grid-cols-12 ${i % 2 ? 'md:[&>span:first-child]:order-2' : ''}`}>
              <span className="block overflow-hidden md:col-span-4"><img src={photoOf(d, o)} alt="" width="900" height="675" loading="lazy" decoding="async" className="h-full max-h-60 min-h-44 w-full object-cover transition-transform duration-700 group-hover:scale-[1.05] md:max-h-none" /></span>
              <span className="flex flex-col justify-center gap-2 p-6 md:col-span-8 md:p-8">
                <span className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-lav"><Icon className="size-5" aria-hidden="true" /></span><span className="eyebrow text-lav">{o.group}</span></span>
                <span className="font-display text-2xl font-semibold leading-tight">{o.name}</span>
                <span className="text-soft">{o.text}</span>{readMore}
              </span>
            </Link>
          </Reveal>
        )
      })}
    </ol>
  )
}

/** Headless — a catalogue panel: one column per group, each service a row with its icon. */
function HeadlessServices({ d }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {offeringsByGroup(d).map((g, gi) => (
        <Reveal key={g.title} delay={gi * 0.06} className="glass flex flex-col p-5">
          <p className="eyebrow text-lav">{g.title}</p>
          <ul className="mt-3 divide-y divide-edge">
            {g.items.map((o) => {
              const Icon = serviceIcons[o.slug]
              return (
                <li key={o.slug}>
                  <Link to={offeringHref(d.slug, o.name)} className="group flex gap-3 py-3.5">
                    <Icon className="mt-0.5 size-5 shrink-0 text-lav transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                    <span><span className="block font-display font-semibold leading-tight transition-colors group-hover:text-lav">{o.name}</span><span className="mt-1 block text-sm text-soft">{o.text}</span></span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Reveal>
      ))}
    </div>
  )
}

/** Automation — a vertical timeline: a line draws down the page with a numbered stop per service. */
function AutomationServices({ d }) {
  return (
    <ol className="relative space-y-6 pl-14 md:pl-20">
      <span aria-hidden="true" className="absolute bottom-2 left-5 top-2 w-px bg-gradient-to-b from-lav via-accent to-transparent md:left-8" />
      {d.offerings.map((o, i) => {
        const Icon = serviceIcons[o.slug]
        return (
          <Reveal as="li" key={o.slug} delay={0.03}>
            <span className="absolute -left-14 flex size-10 items-center justify-center rounded-full border-2 border-accent bg-night font-display text-sm font-bold text-lav md:-left-20 md:size-14 md:text-lg">{i + 1}</span>
            <Link to={offeringHref(d.slug, o.name)} className="glass-flat lift group flex flex-col gap-2 p-6 md:flex-row md:items-start md:gap-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Icon className="size-5" aria-hidden="true" /></span>
              <span className="flex-1"><span className="eyebrow text-lav">{o.group}</span><span className="mt-0.5 block font-display text-xl font-semibold leading-tight">{o.name}</span><span className="mt-1 block text-soft">{o.text}</span>{readMore}</span>
            </Link>
          </Reveal>
        )
      })}
    </ol>
  )
}

/** Mobile — photo tiles with the name and description over a gradient. */
function MobileServices({ d }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {d.offerings.map((o, i) => {
        const Icon = serviceIcons[o.slug]
        return (
          <Reveal as="li" key={o.slug} delay={(i % 3) * 0.07}>
            <Link to={offeringHref(d.slug, o.name)} className="group relative block overflow-hidden rounded-[1.75rem] border border-edge-strong">
              <img src={photoOf(d, o)} alt="" width="900" height="675" loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]" />
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <span className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md"><Icon className="size-5" aria-hidden="true" /></span>
              <span className="absolute inset-x-0 bottom-0 p-5 text-white">
                <span className="block text-xs font-semibold uppercase tracking-wider text-white/75">{o.group}</span>
                <span className="mt-1 block font-display text-xl font-semibold leading-tight">{o.name}</span>
                <span className="mt-2 block text-sm text-white/85">{o.text}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">View service <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </span>
            </Link>
          </Reveal>
        )
      })}
    </ul>
  )
}

export const serviceSections = { software: SoftwareServices, ai: AiServices, growth: GrowthServices, headless: HeadlessServices, automation: AutomationServices, mobile: MobileServices }

