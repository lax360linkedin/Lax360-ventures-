import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Bot, ChevronRight, Clock, Code2, Layers, Megaphone, Search, Server, Smartphone, Star, TrendingUp, User, Workflow, X } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import BotHighlight from '../components/ui/BotHighlight.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { articleCategories } from '../data/articles.js'
import { categoryLabel, formatDate, useArticles } from '../hooks/useCmsPages.js'

const EASE = [0.2, 0.8, 0.2, 1]
const ICONS = { bot: Bot, code: Code2, workflow: Workflow, server: Server, layers: Layers, smartphone: Smartphone, megaphone: Megaphone, trend: TrendingUp }
const PAGE = 9
const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

function Meta({ a, light = false }) {
  return (
    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${light ? 'text-white/85' : 'text-soft'}`}>
      {a.publishedOn && <time dateTime={a.publishedOn}>{formatDate(a.publishedOn)}</time>}
      {a.author && <span className="inline-flex items-center gap-1"><User className="size-3.5" aria-hidden="true" />{a.author}</span>}
      <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{a.readMinutes} min read</span>
    </span>
  )
}

const CatBadge = ({ value, light = false }) => (
  <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${light ? 'border-white/40 bg-black/30 text-white backdrop-blur-sm' : 'border-edge-strong bg-glass text-lav'}`}>{articleCategories.find((c) => c.value === value)?.short || categoryLabel(value)}</span>
)

/** One article card: cover photo, category, title, summary, date, author and a Read More link. */
function ArticleCard({ a, delay = 0 }) {
  return (
    <Reveal as="li" delay={delay} className="h-full">
      <article className="glass-flat lift group flex h-full flex-col overflow-hidden">
        <Link to={`/insights/${a.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] overflow-hidden">
          <img src={a.image} alt="" width="1000" height="625" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
          <span className="absolute left-4 top-4"><CatBadge value={a.category} light /></span>
        </Link>
        <div className="flex flex-1 flex-col gap-3 p-6">
          <Meta a={a} />
          <h3 className="font-display text-xl font-semibold leading-snug"><Link to={`/insights/${a.slug}`} className="transition-colors hover:text-lav">{a.title}</Link></h3>
          <p className="flex-1 text-soft">{a.excerpt}</p>
          <Link to={`/insights/${a.slug}`} className="inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-lav">Read More <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>
        </div>
      </article>
    </Reveal>
  )
}

/**
 * /insights — LAX360's technology knowledge hub: a hero with article covers, the eight topics (each filters the list), featured articles, and the full
 * listing with category filters and search. Articles are managed in the admin panel (Website content > Insights articles); the built-in starter articles
 * show until some are published there.
 */
export default function Insights() {
  const articles = useArticles()
  const [params] = useSearchParams()
  const [cat, setCat] = useState(() => (articleCategories.some((c) => c.value === params.get('category')) ? params.get('category') : 'all'))
  const [query, setQuery] = useState(() => params.get('q') || '')
  const [limit, setLimit] = useState(PAGE)
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const up = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40])
  const down = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 30])
  const rise = (delay) => (reduce ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } })
  const counts = useMemo(() => Object.fromEntries(articleCategories.map((c) => [c.value, articles.filter((a) => a.category === c.value).length])), [articles])
  const featured = useMemo(() => {
    const picked = articles.filter((a) => a.featured)
    return (picked.length ? picked : articles.slice(0, 1)).slice(0, 3)
  }, [articles])
  const q = query.trim().toLowerCase()
  const matches = articles.filter((a) => (cat === 'all' || a.category === cat) && (!q || `${a.title} ${a.excerpt} ${categoryLabel(a.category)} ${a.tags.join(' ')}`.toLowerCase().includes(q)))
  const shown = matches.slice(0, limit)
  const pick = (c) => { setCat(c); setLimit(PAGE); jump('articles') }
  const covers = articles.slice(0, 3)
  const [lead, ...side] = featured

  return (
    <PageContainer path="/insights" title="Insights" description="Technology insights from LAX360 Pvt Ltd: AI and generative AI, software development, business automation, SaaS and APIs, digital transformation, web and mobile apps, digital marketing and technology trends.">
      <section ref={ref} aria-labelledby="insights-title" className="relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night">
        <div aria-hidden="true" className="absolute -left-28 top-8 -z-10 size-[26rem] rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-24 top-0 -z-10 size-[28rem] rounded-full bg-sky/15 blur-3xl" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(rgb(var(--glow)/0.28)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_75%_35%,#000,transparent_62%)]" />
        <div className="wrap grid items-center gap-12 pb-16 pt-10 md:pt-14 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-16">
          <div className="lg:col-span-6">
            <m.nav {...rise(0.05)} aria-label="Breadcrumb" className="text-sm text-soft">
              <ol className="flex items-center gap-2"><li><Link to="/" className="transition-colors hover:text-lav">Home</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" /><li aria-current="page" className="font-semibold text-fg">Insights</li></ol>
            </m.nav>
            <m.p {...rise(0.12)} className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-edge-strong bg-glass px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lav backdrop-blur-md">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgb(var(--glow2)/0.6)]" />LAX360 Insights
            </m.p>
            <m.h1 {...rise(0.2)} id="insights-title" className="h1 mt-5 !text-[clamp(2.3rem,4.8vw,4.3rem)]">
              Ideas and updates for a <BotHighlight delay={0.9}><span className="text-gradient">technology-driven business.</span></BotHighlight>
            </m.h1>
            <m.p {...rise(0.3)} className="lead mt-7 max-w-xl text-soft">
              Practical articles on AI, software, automation, SaaS and APIs, digital marketing and the technology trends that matter to the people who run businesses.
            </m.p>
            <m.div {...rise(0.4)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="#articles" arrow onClick={(e) => { e.preventDefault(); jump('articles') }}>Browse articles</Button>
              <Button href="#topics" variant="secondary" onClick={(e) => { e.preventDefault(); jump('topics') }}>Explore topics</Button>
            </m.div>
          </div>
          <m.div {...rise(0.3)} className="lg:col-span-6">
            <div className="relative mx-auto grid max-w-md grid-cols-5 gap-3 sm:max-w-lg sm:gap-4">
              {covers.map((a, i) => (
                <m.div key={a.slug} style={{ y: i === 1 ? down : up }} className={`group relative overflow-hidden rounded-3xl border border-edge-strong shadow-[0_24px_60px_-30px_rgb(var(--glow)/0.55)] ${i === 0 ? 'col-span-3 row-span-2 aspect-[3/4]' : 'col-span-2 aspect-square'}`}>
                  <Link to={`/insights/${a.slug}`} aria-label={a.title} className="block h-full">
                    <img src={a.image} alt="" width="800" height="800" decoding="async" fetchPriority={i === 0 ? 'high' : undefined} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute inset-x-3 bottom-3 text-xs font-semibold leading-snug text-white sm:text-sm">{a.title}</span>
                  </Link>
                </m.div>
              ))}
            </div>
          </m.div>
        </div>
      </section>

      <section id="topics" className="wrap section scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="topics-title">
        <SectionHeading id="topics-title" eyebrow="Topics" title="Explore by" gradient="category." lead="Eight areas we write about. Select a topic to see its articles." />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {articleCategories.map((c, i) => {
            const Icon = ICONS[c.icon] || Code2
            const n = counts[c.value]
            return (
              <Reveal as="li" key={c.value} delay={(i % 4) * 0.06}>
                <button type="button" onClick={() => n && pick(c.value)} disabled={!n} className={`glass-flat group flex h-full w-full flex-col gap-3 p-5 text-left transition-all duration-300 ${n ? 'lift cursor-pointer' : 'opacity-70'}`}>
                  <span className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white transition-transform duration-300 group-hover:-rotate-6"><Icon className="size-5" aria-hidden="true" /></span><span className="text-xs font-semibold text-soft">{n ? `${n} ${n === 1 ? 'article' : 'articles'}` : 'Coming soon'}</span></span>
                  <span className="font-display text-lg font-semibold leading-tight">{c.label}</span>
                  <span className="text-sm text-soft">{c.text}</span>
                </button>
              </Reveal>
            )
          })}
        </ul>
      </section>

      {lead && (
        <section className="border-y border-edge bg-glass" aria-labelledby="featured-title">
          <div className="wrap section">
            <SectionHeading id="featured-title" eyebrow="Featured" title="Start with" gradient="these." />
            <div className="mt-10 grid gap-6 lg:grid-cols-12">
              <Reveal className="lg:col-span-7">
                <Link to={`/insights/${lead.slug}`} className="group relative block h-full min-h-[22rem] overflow-hidden rounded-[2rem] border border-edge-strong">
                  <img src={lead.image} alt="" width="1200" height="800" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                  <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-sky px-3 py-1 text-xs font-bold uppercase tracking-wider text-night"><Star className="size-3.5" aria-hidden="true" />Featured</span>
                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 text-white md:p-8">
                    <CatBadge value={lead.category} light />
                    <span className="font-display text-2xl font-semibold leading-tight md:text-4xl">{lead.title}</span>
                    <span className="max-w-2xl text-white/85">{lead.excerpt}</span>
                    <Meta a={lead} light />
                    <span className="inline-flex items-center gap-1.5 font-semibold">Read More <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></span>
                  </span>
                </Link>
              </Reveal>
              {side.length > 0 && (
                <ul className="grid gap-6 lg:col-span-5">
                  {side.map((a, i) => (
                    <Reveal as="li" key={a.slug} delay={0.08 + i * 0.06}>
                      <Link to={`/insights/${a.slug}`} className="glass-flat lift group grid h-full grid-cols-5 overflow-hidden">
                        <span className="col-span-2 block overflow-hidden"><img src={a.image} alt="" width="500" height="500" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" /></span>
                        <span className="col-span-3 flex flex-col gap-2 p-5"><CatBadge value={a.category} /><span className="font-display text-lg font-semibold leading-snug transition-colors group-hover:text-lav">{a.title}</span><Meta a={a} /></span>
                      </Link>
                    </Reveal>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      <section id="articles" className="wrap section scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="articles-title">
        <SectionHeading id="articles-title" eyebrow="All articles" title="Insights, tutorials" gradient="and updates." />
        <div className="mt-10 flex flex-col gap-4">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-soft" aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }} placeholder="Search articles by title, topic or tag" aria-label="Search articles"
              className="h-12 w-full rounded-full border border-edge-strong bg-glass pl-12 pr-12 text-base text-fg outline-none transition-colors placeholder:text-soft focus:border-lav" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-soft hover:text-lav"><X className="size-4" aria-hidden="true" /></button>}
          </div>
          <div role="group" aria-label="Filter by category" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {[{ value: 'all', short: `All (${articles.length})` }, ...articleCategories.filter((c) => counts[c.value])].map((c) => (
              <button key={c.value} type="button" onClick={() => { setCat(c.value); setLimit(PAGE) }} aria-pressed={cat === c.value}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${cat === c.value ? 'border-transparent bg-primary text-white shadow-lg' : 'border-edge-strong bg-glass hover:border-lav'}`}>
                {c.value === 'all' ? c.short : `${c.short} (${counts[c.value]})`}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-6 text-sm text-soft" role="status" aria-live="polite">{matches.length} {matches.length === 1 ? 'article' : 'articles'}{cat !== 'all' ? ` in ${categoryLabel(cat)}` : ''}{q ? ` matching “${query.trim()}”` : ''}</p>
        <AnimatePresence mode="wait">
          <m.ul key={`${cat}|${q}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((a, i) => <ArticleCard key={a.slug} a={a} delay={(i % 3) * 0.07} />)}
          </m.ul>
        </AnimatePresence>
        {matches.length === 0 && (
          <div className="glass mt-6 p-8 text-center">
            <p className="font-display text-xl font-semibold">No articles match your search.</p>
            <button type="button" onClick={() => { setCat('all'); setQuery('') }} className="link-underline mt-3 inline-flex min-h-11 items-center font-semibold text-lav">Show all articles</button>
          </div>
        )}
        {matches.length > limit && <div className="mt-10 text-center"><Button variant="secondary" onClick={() => setLimit((n) => n + PAGE)}>Load more articles</Button></div>}
      </section>

      <section className="wrap pb-16 md:pb-24" aria-labelledby="insights-cta-title">
        <Reveal>
          <div className="glass relative overflow-hidden p-8 text-center md:p-14">
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-0 size-72 rounded-full bg-primary/25 blur-3xl" />
            <h2 id="insights-cta-title" className="h2 relative">Want to put these ideas <span className="text-gradient">to work?</span></h2>
            <p className="lead relative mx-auto mt-5 max-w-2xl text-soft">Tell us what you are planning. Our team can help you explore suitable technology and digital solutions for your business.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button to="/contact?type=project" arrow>Start a Project</Button>
              <Button to="/services" variant="secondary">Explore our services</Button>
            </div>
          </div>
        </Reveal>
      </section>
    </PageContainer>
  )
}
