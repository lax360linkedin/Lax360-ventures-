import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, Bot, Boxes, Building2, Cog, Code2, Cpu, DraftingCompass, Globe2, GraduationCap,
  Layers, LayoutDashboard, Megaphone, MessagesSquare, PenLine, Search, Share2, Smartphone, Sparkles, Workflow,
} from 'lucide-react'
import Reveal from '../../ui/Reveal.jsx'
import Button from '../../ui/Button.jsx'
import DivisionArt from '../../art/DivisionArt.jsx'
import { getDivision } from '../../../data/services.js'
import { courses } from '../../../data/courses.js'
import { offeringHref } from '../../../utils/slugify.js'

const sw = getDivision('software')
const ai = getDivision('ai')
const growth = getDivision('growth')
const eng = getDivision('engineering')

/** Shared heading for each category: number, icon, title, summary and the two links every category gets. */
function CategoryHead({ n, Icon, title, text, to, linkLabel, enquiry, className = '' }) {
  return (
    <Reveal className={className}>
      <div className="flex items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg"><Icon className="size-6" aria-hidden="true" /></span>
        <span className="font-display text-sm font-semibold tracking-wider text-lav">{n}</span>
      </div>
      <h2 className="h2 mt-5">{title}</h2>
      <p className="lead mt-4 text-soft">{text}</p>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1">
        <Link to={to} className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold text-lav">{linkLabel} <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
        <Link to={enquiry} className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold">Enquire <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
      </div>
    </Reveal>
  )
}

/** A single offering as one link to its row on the division detail page. */
function OfferingLink({ division, offering, Icon, delay = 0, className = '' }) {
  return (
    <Reveal as="li" delay={delay} className={className}>
      <Link to={offeringHref(division, offering.name)} className="glass-flat lift group flex h-full items-start gap-4 p-5 md:p-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-edge bg-primary/20 text-lav transition-[transform,background-color,color] duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl font-semibold leading-tight transition-colors group-hover:text-lav">{offering.name}</span>
          <span className="mt-1.5 block text-base text-soft">{offering.text}</span>
        </span>
        <ArrowRight className="mt-1 size-5 shrink-0 text-soft transition-all duration-200 group-hover:translate-x-1.5 group-hover:text-lav" aria-hidden="true" />
      </Link>
    </Reveal>
  )
}

const bySoftware = (i) => sw.offerings[i]

/** 01 — Software Development: sticky intro + illustration on the left, offerings stacked on the right. */
function Software() {
  const icons = [Code2, LayoutDashboard, Boxes]
  return (
    <section id="software" aria-label="Software Development" className="scroll-mt-32 wrap section">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-40">
            <CategoryHead n="01" Icon={Code2} title="Software Development" text="Custom applications, CRM and ERP systems built around your processes, so your team spends less time working around the software." to="/services/software" linkLabel="Software & Apps" enquiry="/contact?type=project" />
            <Reveal delay={0.1} className="glass mt-8 hidden p-5 lg:block"><DivisionArt id="software" className="h-auto w-full" /></Reveal>
          </div>
        </div>
        <ul className="space-y-4 lg:col-span-7">
          {[0, 1, 2].map((i, k) => <OfferingLink key={i} division="software" offering={bySoftware(i)} Icon={icons[k]} delay={k * 0.1} />)}
        </ul>
      </div>
    </section>
  )
}

/** 02 — AI Solutions & Business Automation: one wide violet-lit glass panel with the example workflow. */
function Ai() {
  const icons = [Sparkles, Workflow, Cpu, Bot]
  return (
    <section id="ai" aria-label="AI Solutions and Business Automation" className="scroll-mt-32 wrap section !pt-0">
      <Reveal className="glass relative overflow-hidden p-6 md:p-10 lg:p-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(168,85,247,0.35), transparent)' }} />
        <div className="relative grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <CategoryHead n="02" Icon={Bot} title="AI Solutions & Business Automation" text="Assistants, automated workflows and AI-powered applications that take repetitive work off your team, with a person approving what matters." to="/services/ai" linkLabel="AI & Automation" enquiry="/contact?type=ai" />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {ai.offerings.map((o, i) => {
                const Icon = icons[i]
                return (
                  <Reveal as="li" key={o.name} delay={i * 0.08} y={10}>
                    <Link to={offeringHref('ai', o.name)} className="group flex min-h-14 items-center gap-3 rounded-2xl border border-edge bg-tint/5 px-4 py-3 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-lav hover:bg-primary/20">
                      <Icon className="size-5 shrink-0 text-violet transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" aria-hidden="true" />
                      <span className="font-semibold">{o.name}</span>
                    </Link>
                  </Reveal>
                )
              })}
            </ul>
            <div className="mt-8"><Button to="/contact?type=ai" variant="violet" arrow>Book an AI consultation</Button></div>
          </div>
          <div className="lg:col-span-6">
            <p className="eyebrow text-violet">{ai.workflowLabel}</p>
            <ol className="mt-5 space-y-3">
              {ai.workflow.map((step, i) => (
                <Reveal as="li" key={step} delay={0.1 + i * 0.12} y={10} className="relative">
                  <div className="flex items-center gap-4 rounded-2xl border border-edge bg-night/50 p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display font-semibold text-white">{i + 1}</span>
                    <span className="font-display text-lg font-semibold md:text-xl">{step}</span>
                  </div>
                  {i < ai.workflow.length - 1 && <span aria-hidden="true" className="absolute -bottom-3 left-9 h-3 w-px bg-edge-strong" />}
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/** 03 — Website & Mobile: two device-style panels, the second offset so the pair feels staggered. */
function WebMobile() {
  const web = sw.offerings[3]
  const mobile = sw.offerings[4]
  return (
    <section id="web-mobile" aria-label="Website and Mobile Application Development" className="scroll-mt-32 wrap section">
      <div className="grid gap-12 lg:grid-cols-12">
        <CategoryHead className="lg:col-span-5" n="03" Icon={Globe2} title="Website & Mobile Application Development" text="Fast, accessible, search-friendly business websites and Android and iOS apps, planned together with your web platform." to="/services/software" linkLabel="Software & Apps" enquiry="/contact?type=website-app" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
          <Reveal as="li">
            <Link to={offeringHref('software', web.name)} className="glass-flat lift group flex h-full flex-col p-5 md:p-6">
              <div className="rounded-xl border border-edge bg-night/60 p-3 transition-transform duration-500 group-hover:-translate-y-1">
                <div className="flex gap-1.5"><span className="size-2 rounded-full bg-accent" /><span className="size-2 rounded-full bg-lav" /><span className="size-2 rounded-full bg-sky" /></div>
                <div className="mt-3 h-16 rounded-lg bg-gradient-to-br from-primary/70 to-accent/40" />
                <div className="mt-2 grid grid-cols-3 gap-2"><span className="h-8 rounded-md bg-tint/10" /><span className="h-8 rounded-md bg-tint/10" /><span className="h-8 rounded-md bg-tint/10" /></div>
              </div>
              <span className="mt-5 flex items-center gap-2 font-display text-xl font-semibold transition-colors group-hover:text-lav"><Globe2 className="size-5 text-lav" aria-hidden="true" />{web.name}</span>
              <span className="mt-1.5 text-base text-soft">{web.text}</span>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-4 font-semibold text-lav">Details <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
            </Link>
          </Reveal>
          <Reveal as="li" delay={0.12} className="sm:mt-12">
            <Link to={offeringHref('software', mobile.name)} className="glass-flat lift group flex h-full flex-col p-5 md:p-6">
              <div className="mx-auto w-28 rounded-[1.4rem] border-[3px] border-edge-strong bg-night/60 p-2 transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-2">
                <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-tint/20" />
                <div className="h-14 rounded-lg bg-gradient-to-br from-accent/70 to-primary/50" />
                {[0, 1, 2].map((i) => <div key={i} className="mt-2 flex items-center gap-1.5"><span className="size-4 rounded bg-tint/15" /><span className="h-1.5 flex-1 rounded-full bg-white/12" /></div>)}
              </div>
              <span className="mt-5 flex items-center gap-2 font-display text-xl font-semibold transition-colors group-hover:text-lav"><Smartphone className="size-5 text-lav" aria-hidden="true" />{mobile.name}</span>
              <span className="mt-1.5 text-base text-soft">{mobile.text}</span>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-4 font-semibold text-lav">Details <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
            </Link>
          </Reveal>
        </ul>
      </div>
    </section>
  )
}

/** 04 — Digital Marketing: four offerings as a rising staircase on desktop, a plain stack on mobile. */
function Growth() {
  const icons = [Search, Share2, Megaphone, PenLine]
  const rise = ['lg:mt-24', 'lg:mt-16', 'lg:mt-8', 'lg:mt-0']
  return (
    <section id="growth" aria-label="Digital Marketing" className="scroll-mt-32 border-y border-edge bg-base2/50">
      <div className="wrap section">
        <CategoryHead className="max-w-2xl" n="04" Icon={Megaphone} title="Digital Marketing" text="Marketing that pairs with the website and software we build, so visitors become enquiries. Exact scope is agreed per business." to="/services/growth" linkLabel="Digital Growth" enquiry="/contact?type=marketing" />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
          {growth.offerings.map((o, i) => {
            const Icon = icons[i]
            return (
              <Reveal as="li" key={o.name} delay={i * 0.1} className={rise[i]}>
                <Link to={offeringHref('growth', o.name)} className="glass-flat lift group block h-full p-6">
                  <span className="font-display text-5xl font-semibold leading-none text-transparent" style={{ WebkitTextStroke: '1.5px var(--color-lav)' }} aria-hidden="true">0{i + 1}</span>
                  <span className="mt-5 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky to-primary text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="mt-4 block font-display text-xl font-semibold transition-colors group-hover:text-lav">{o.name}</span>
                  <span className="mt-1.5 block text-base text-soft">{o.text}</span>
                </Link>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/** 05 — CAD & Engineering: a blueprint-style panel with dimension marks. */
function Engineering() {
  const icons = [Building2, Cog, Layers]
  return (
    <section id="engineering" aria-label="CAD and Engineering Services" className="scroll-mt-32 wrap section">
      <Reveal className="glass relative overflow-hidden p-6 md:p-10 lg:p-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(var(--color-lav) 1px, transparent 1px), linear-gradient(90deg, var(--color-lav) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <CategoryHead n="05" Icon={DraftingCompass} title="CAD & Engineering Services" text="Drafting and 2D/3D modelling support for civil and mechanical engineering work, prepared to your brief." to="/services/engineering" linkLabel="CAD & Engineering" enquiry="/contact?type=cad" />
            <p className="mt-6 text-sm text-soft">Software used, deliverable formats and turnaround are confirmed per project. Files are shared by email after we review your brief.</p>
            <div className="mt-6"><Button to="/contact?type=cad" arrow>Send your drawing brief</Button></div>
          </div>
          <ul className="space-y-4 lg:col-span-7">
            {eng.offerings.map((o, i) => {
              const Icon = icons[i]
              return (
                <Reveal as="li" key={o.name} delay={i * 0.1}>
                  <Link to={offeringHref('engineering', o.name)} className="group relative flex items-start gap-4 rounded-2xl border border-edge bg-night/60 p-5 transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-lav md:p-6">
                    <span className="absolute -left-px top-4 h-8 w-px bg-sky" aria-hidden="true" />
                    <Icon className="mt-1 size-6 shrink-0 text-sky transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-xl font-semibold transition-colors group-hover:text-lav">{o.name}</span>
                      <span className="mt-1 block text-base text-soft">{o.text}</span>
                    </span>
                    <ArrowRight className="mt-1 size-5 shrink-0 text-soft transition-all group-hover:translate-x-1.5 group-hover:text-lav" aria-hidden="true" />
                  </Link>
                </Reveal>
              )
            })}
          </ul>
        </div>
      </Reveal>
    </section>
  )
}

/** Consulting is the first step of every engagement (not a standalone division), so it gets a closing band. */
function Consulting() {
  return (
    <section aria-label="Technology consulting" className="wrap pb-4">
      <Reveal className="glass flex flex-col items-start justify-between gap-6 p-6 md:flex-row md:items-center md:p-10">
        <div className="flex items-start gap-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/30 text-lav"><MessagesSquare className="size-6" aria-hidden="true" /></span>
          <div>
            <p className="eyebrow text-lav">Technology consulting</p>
            <h2 className="mt-1 font-display text-2xl font-semibold md:text-3xl">Not sure where to start?</h2>
            <p className="mt-2 max-w-xl text-soft">Consulting is the first step of every engagement. Tell us the problem and we&apos;ll help you work out which service — or combination — fits.</p>
          </div>
        </div>
        <Button to="/contact?type=general" arrow className="shrink-0">Talk to us about your problem</Button>
      </Reveal>
    </section>
  )
}

export default function ServiceCategories() {
  return (
    <>
      <Software />
      <Ai />
      <WebMobile />
      <Growth />
      <Engineering />
      <Consulting />
    </>
  )
}
