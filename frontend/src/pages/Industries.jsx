import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { BarChart3, Bot, BrainCircuit, ChevronRight, ClipboardList, FileText, Headphones, LineChart, Search, Star, Workflow, X } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import BotHighlight from '../components/ui/BotHighlight.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { IndustryCard, IndustryIcon, PairCard } from '../components/industries/IndustryBits.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import { industryGroups } from '../data/industries.js'
import { useIndustries } from '../hooks/useCmsPages.js'

const EASE = [0.2, 0.8, 0.2, 1]
const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

// The industries whose problem-to-solution comparison is shown on this page (the first pair of each), in this order.
const SHOWCASE = ['healthcare-medical', 'retail-ecommerce', 'education-edtech', 'manufacturing-industrial', 'real-estate-property', 'logistics-transportation', 'hospitality-tourism', 'construction-infrastructure']

const AI_USES = [
  { icon: Headphones, title: 'AI-powered customer support', text: 'An assistant answers routine questions from information you have approved and hands over to a person for anything it cannot settle.', example: 'A clinic answering timing and booking questions after hours.' },
  { icon: Bot, title: 'AI assistants and agents', text: 'Assistants answer; agents carry out defined multi-step tasks with the tools you permit, with a person approving important actions.', example: 'An agent that looks up an order, drafts a reply and waits for approval.' },
  { icon: FileText, title: 'Document processing automation', text: 'Software reads incoming forms and documents, extracts the key fields and passes them on for checking.', example: 'Supplier invoices or claim forms captured for review.' },
  { icon: Workflow, title: 'Intelligent workflow automation', text: 'Workflows move work between people and systems, using AI only at the steps that need reading or drafting.', example: 'An enquiry classified, routed and acknowledged automatically.' },
  { icon: LineChart, title: 'Predictive analytics', text: 'Where enough historical data exists, models can indicate likely demand or maintenance needs. Results are estimates to inform people, not guarantees.', example: 'Spotting equipment that may need servicing sooner.' },
  { icon: BrainCircuit, title: 'Customer behaviour analysis', text: 'Purchase and activity data grouped into patterns so teams can plan offers and follow-ups.', example: 'Identifying members or customers who have gone quiet.' },
  { icon: ClipboardList, title: 'Business process automation', text: 'Repeatable steps such as approvals, reminders and record updates run on their own with logs and alerts.', example: 'Leave requests routed for approval and recorded.' },
  { icon: BarChart3, title: 'AI-powered reporting and insights', text: 'Plain-language summaries of your own figures, with the underlying numbers always available to check.', example: 'A weekly summary of sales or operations data.' },
]

/**
 * /industries — the Industry Technology Solutions platform: hero, search and group browsing, featured industries, all 20 industries, problem-to-solution
 * comparisons and how AI and automation help. Managed in the admin panel (Website content > Industries); the built-in set shows until some are published.
 */
export default function Industries() {
  const industries = useIndustries()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [az, setAz] = useState(false)
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const up = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40])
  const down = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 30])
  const rise = (delay) => (reduce ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } })
  const q = query.trim().toLowerCase()
  const groups = useMemo(() => Object.keys(industryGroups).filter((g) => industries.some((i) => i.group === g)), [industries])
  const featured = industries.filter((i) => i.featured).slice(0, 4)
  const list = industries
    .filter((i) => (group === 'all' || i.group === group) && (!q || `${i.name} ${i.summary} ${i.solutions.join(' ')} ${industryGroups[i.group] || ''}`.toLowerCase().includes(q)))
    .sort((a, b) => (az ? a.name.localeCompare(b.name) : 0))
  const showcase = SHOWCASE.map((slug) => industries.find((i) => i.slug === slug)).filter((i) => i && i.pairs[0]).map((i) => ({ ...i.pairs[0], industry: i.name, to: `/industries/${i.slug}` }))
  const mosaic = industries.slice(0, 5)

  return (
    <PageContainer path="/industries" title="Industries" description="Technology solutions for every industry: how LAX360 Pvt Ltd software, AI and automation can support healthcare, retail, education, manufacturing, finance, real estate, logistics, hospitality and more.">
      <section ref={ref} aria-labelledby="industries-title" className="relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night">
        <div aria-hidden="true" className="absolute -left-28 top-8 -z-10 size-[26rem] rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-24 top-0 -z-10 size-[28rem] rounded-full bg-sky/15 blur-3xl" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(rgb(var(--glow)/0.28)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_75%_35%,#000,transparent_62%)]" />
        <div className="wrap grid items-center gap-12 pb-16 pt-10 md:pt-14 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-16">
          <div className="lg:col-span-6">
            <m.nav {...rise(0.05)} aria-label="Breadcrumb" className="text-sm text-soft">
              <ol className="flex items-center gap-2"><li><Link to="/" className="transition-colors hover:text-lav">Home</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" /><li aria-current="page" className="font-semibold text-fg">Industries</li></ol>
            </m.nav>
            <m.p {...rise(0.12)} className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-edge-strong bg-glass px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lav backdrop-blur-md">Industries We Empower</m.p>
            <m.h1 {...rise(0.2)} id="industries-title" className="h1 mt-5 !text-[clamp(2.3rem,4.8vw,4.3rem)]">Technology Solutions for <BotHighlight delay={0.9}><span className="text-gradient">Every Industry.</span></BotHighlight></m.h1>
            <m.p {...rise(0.3)} className="lead mt-7 max-w-xl text-soft">Discover how modern software, AI, and intelligent automation are transforming businesses and industries.</m.p>
            <m.div {...rise(0.4)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="#browse" arrow onClick={(e) => { e.preventDefault(); jump('browse') }}>Explore Industries</Button>
              <Button to="/contact?type=project" variant="secondary">Talk to us</Button>
            </m.div>
          </div>
          <m.div {...rise(0.3)} className="lg:col-span-6">
            <div className="relative mx-auto grid max-w-md grid-cols-6 gap-3 sm:max-w-lg">
              {mosaic.map((ind, i) => (
                <m.div key={ind.slug} style={{ y: i % 2 ? down : up }} className={`group relative overflow-hidden rounded-3xl border border-edge-strong shadow-[0_24px_60px_-30px_rgb(var(--glow)/0.55)] ${i === 0 ? 'col-span-4 row-span-2 aspect-[4/3]' : i === 1 ? 'col-span-2 aspect-square' : i === 2 ? 'col-span-2 aspect-square' : i === 3 ? 'col-span-3 aspect-[4/3]' : 'col-span-3 aspect-[4/3]'}`}>
                  <Link to={`/industries/${ind.slug}`} aria-label={ind.name} className="block h-full">
                    <img src={ind.image} alt="" width="800" height="600" decoding="async" fetchPriority={i === 0 ? 'high' : undefined} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute inset-x-3 bottom-3 flex items-center gap-2 text-white"><IndustryIcon name={ind.icon} className="size-4" /><span className="text-xs font-semibold leading-tight sm:text-sm">{ind.name.split(' & ')[0]}</span></span>
                  </Link>
                </m.div>
              ))}
            </div>
          </m.div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="wrap section" aria-labelledby="featured-title">
          <SectionHeading id="featured-title" eyebrow="Featured industries" title="Where technology" gradient="makes a difference." />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((ind, i) => (
              <Reveal as="li" key={ind.slug} delay={i * 0.06}>
                <Link to={`/industries/${ind.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-edge-strong">
                  <img src={ind.image} alt="" width="800" height="1000" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]" />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-sky px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-night"><Star className="size-3" aria-hidden="true" />Featured</span>
                  <span className="absolute inset-x-0 bottom-0 p-5 text-white"><IndustryIcon name={ind.icon} className="size-6 text-sky" /><span className="mt-2 block font-display text-xl font-semibold leading-tight">{ind.name}</span><span className="mt-1 line-clamp-2 block text-sm text-white/85">{ind.summary}</span></span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      <section id="browse" className="border-y border-edge bg-glass scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="browse-title">
        <div className="wrap section">
          <SectionHeading id="browse-title" eyebrow={`${industries.length} industries`} title="Find your" gradient="industry." lead="Search by name or solution, browse by group, or sort A to Z." />
          <div className="mt-10 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-soft" aria-hidden="true" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search industries or solutions" aria-label="Search industries"
                  className="h-12 w-full rounded-full border border-edge-strong bg-glass pl-12 pr-12 text-base text-fg outline-none transition-colors placeholder:text-soft focus:border-lav" />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-soft hover:text-lav"><X className="size-4" aria-hidden="true" /></button>}
              </div>
              <button type="button" onClick={() => setAz((v) => !v)} aria-pressed={az} className={`inline-flex h-12 items-center rounded-full border px-5 text-sm font-semibold transition-all duration-200 ${az ? 'border-transparent bg-primary text-white' : 'border-edge-strong bg-glass hover:border-lav'}`}>Sort A–Z</button>
            </div>
            <div role="group" aria-label="Filter by group" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {['all', ...groups].map((g) => (
                <button key={g} type="button" onClick={() => setGroup(g)} aria-pressed={group === g}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${group === g ? 'border-transparent bg-primary text-white shadow-lg' : 'border-edge-strong bg-glass hover:border-lav'}`}>
                  {g === 'all' ? `All (${industries.length})` : industryGroups[g]}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-6 text-sm text-soft" role="status" aria-live="polite">{list.length} {list.length === 1 ? 'industry' : 'industries'}{group !== 'all' ? ` in ${industryGroups[group]}` : ''}{q ? ` matching “${query.trim()}”` : ''}</p>
          <AnimatePresence mode="wait">
            <m.ul key={`${group}|${q}|${az}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((ind, i) => <IndustryCard key={ind.slug} ind={ind} delay={(i % 4) * 0.05} />)}
            </m.ul>
          </AnimatePresence>
          {list.length === 0 && (
            <div className="glass mt-6 p-8 text-center"><p className="font-display text-xl font-semibold">No industries match your search.</p><button type="button" onClick={() => { setQuery(''); setGroup('all') }} className="link-underline mt-3 inline-flex min-h-11 items-center font-semibold text-lav">Show all industries</button></div>
          )}
        </div>
      </section>

      {showcase.length > 0 && (
        <section className="wrap section" aria-labelledby="pairs-title">
          <SectionHeading id="pairs-title" eyebrow="Challenges and solutions" title="From manual work" gradient="to connected systems." lead="Common problems in each sector, and the kind of technology that addresses them. Select one to read more." />
          <ul className="mt-10 grid gap-5 lg:grid-cols-2">{showcase.map((p, i) => <PairCard key={p.to} pair={p} to={p.to} delay={(i % 2) * 0.06} />)}</ul>
        </section>
      )}

      <section className="border-y border-edge bg-base2/50" aria-labelledby="ai-title">
        <div className="wrap section">
          <SectionHeading id="ai-title" eyebrow="AI & automation" title="How AI and automation" gradient="support every industry." lead="Practical uses, described honestly: AI assists people and speeds up routine work. It works best on a clearly defined task, with a person reviewing what matters." />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AI_USES.map(({ icon: Icon, title, text, example }, i) => (
              <Reveal as="li" key={title} delay={(i % 4) * 0.06} className="glass-flat lift flex h-full flex-col gap-3 p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Icon className="size-5" aria-hidden="true" /></span>
                <p className="font-display text-lg font-semibold leading-tight">{title}</p>
                <p className="flex-1 text-soft">{text}</p>
                <p className="border-t border-edge pt-3 text-sm"><span className="font-semibold text-lav">Example: </span>{example}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <p className="wrap pt-8 text-sm text-soft">These pages describe what technology can do for each sector and what LAX360 can build. They are not claims about past clients or projects.</p>
      <ContactCta title="Tell us about your industry." />
    </PageContainer>
  )
}
