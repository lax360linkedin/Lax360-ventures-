import { Link, useParams } from 'react-router-dom'
import { m, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Lightbulb, Sparkles, TrendingUp } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { IndustryCard, IndustryIcon, PairCard } from '../components/industries/IndustryBits.jsx'
import { StatusBadge } from '../components/products/ProductBits.jsx'
import { industryGroups } from '../data/industries.js'
import { getDivision } from '../data/services.js'
import { divisionIcons } from '../utils/divisionIcons.js'
import { categoryLabel, formatDate, useArticles, useIndustries } from '../hooks/useCmsPages.js'
import { useProducts } from '../hooks/useProducts.js'
import { useContentReady } from '../hooks/useSite.js'
import NotFound from './NotFound.jsx'

const EASE = [0.2, 0.8, 0.2, 1]
const crumbCls = 'inline-flex min-h-9 items-center transition-colors hover:text-lav'

function Crumb({ ind, light = false }) {
  const sep = <ChevronRight className="size-3.5 opacity-70" aria-hidden="true" />
  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${light ? 'text-white/80' : 'text-soft'}`}>
      <ol className="flex flex-wrap items-center gap-x-1.5">
        <li><Link to="/" className={crumbCls}>Home</Link></li>{sep}
        <li><Link to="/industries" className={crumbCls}>Industries</Link></li>{sep}
        <li aria-current="page" className={`font-semibold ${light ? 'text-white' : 'text-fg'}`}>{ind.name}</li>
      </ol>
    </nav>
  )
}

const Badge = ({ ind, light = false }) => (
  <p className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] backdrop-blur-md ${light ? 'border-white/30 bg-white/10 text-white' : 'border-edge-strong bg-glass text-lav'}`}>
    <IndustryIcon name={ind.icon} className="size-3.5" />{industryGroups[ind.group] || 'Industry'}
  </p>
)

function Actions({ light = false }) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <Button to="/contact?type=project" arrow>Book a consultation</Button>
      <Button href="#solutions" variant="secondary" className={light ? '!border-white/40 !bg-white/10 !text-white hover:!bg-white/20' : ''} onClick={(e) => { e.preventDefault(); document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth' }) }}>See the solutions</Button>
    </div>
  )
}

const rise = (reduce, delay) => (reduce ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } })
const frame = 'overflow-hidden rounded-[2rem] border border-edge-strong shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]'
const heroBg = 'relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night'
const blobs = (<><div aria-hidden="true" className="absolute -left-28 top-10 -z-10 size-[24rem] rounded-full bg-primary/20 blur-3xl" /><div aria-hidden="true" className="absolute -right-24 bottom-0 -z-10 size-[26rem] rounded-full bg-sky/15 blur-3xl" /></>)

/** Four hero layouts, one per industry group, so the pages do not all look alike. */
function Hero({ ind }) {
  const reduce = useReducedMotion()
  const img = <img src={ind.heroImage} alt={ind.imageAlt} width="1200" height="800" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
  if (ind.group === 'commerce') {
    return (
      <section className="relative isolate overflow-hidden border-b border-edge text-white" aria-labelledby="ind-title">
        <div className="absolute inset-0 -z-20">{img}</div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a0c10]/90 via-[#0a0c10]/65 to-[#0a0c10]/20" />
        <div className="wrap pb-16 pt-8 md:pt-10 lg:pb-24">
          <m.div {...rise(reduce, 0.05)}><Crumb ind={ind} light /></m.div>
          <div className="mt-14 max-w-3xl lg:mt-20">
            <m.div {...rise(reduce, 0.1)}><Badge ind={ind} light /></m.div>
            <m.h1 {...rise(reduce, 0.18)} id="ind-title" className="h1 mt-5 !text-[clamp(2.3rem,5vw,4.4rem)] !text-white">{ind.name}</m.h1>
            <m.p {...rise(reduce, 0.28)} className="lead mt-6 max-w-2xl text-white/85">{ind.summary}</m.p>
            <m.div {...rise(reduce, 0.36)}><Actions light /></m.div>
          </div>
        </div>
      </section>
    )
  }
  if (ind.group === 'industry') {
    return (
      <section className={heroBg} aria-labelledby="ind-title">
        {blobs}
        <div className="wrap pb-16 pt-8 md:pt-10 lg:pb-24">
          <m.div {...rise(reduce, 0.05)}><Crumb ind={ind} /></m.div>
          <m.div {...rise(reduce, 0.15)} className={`${frame} relative mt-8`}>
            <div className="aspect-[21/9] min-h-56 w-full">{img}</div>
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </m.div>
          <div className="glass relative z-10 mx-3 -mt-14 p-6 sm:mx-10 md:p-10">
            <Badge ind={ind} />
            <h1 id="ind-title" className="h1 mt-4 !text-[clamp(2.1rem,4.4vw,3.8rem)]">{ind.name}</h1>
            <p className="lead mt-4 max-w-3xl text-soft">{ind.summary}</p>
            <Actions />
          </div>
        </div>
      </section>
    )
  }
  const photoFirst = ind.group === 'finance'
  return (
    <section className={heroBg} aria-labelledby="ind-title">
      {blobs}
      <div className="wrap grid items-center gap-12 pb-16 pt-8 md:pt-10 lg:grid-cols-12 lg:pb-24">
        <div className={`lg:col-span-6 ${photoFirst ? 'lg:order-2' : ''}`}>
          <m.div {...rise(reduce, 0.05)}><Crumb ind={ind} /></m.div>
          <m.div {...rise(reduce, 0.1)} className="mt-6"><Badge ind={ind} /></m.div>
          <m.h1 {...rise(reduce, 0.18)} id="ind-title" className="h1 mt-5 !text-[clamp(2.2rem,4.6vw,4rem)]">{ind.name}</m.h1>
          <m.p {...rise(reduce, 0.28)} className="lead mt-6 max-w-xl text-soft">{ind.summary}</m.p>
          <m.div {...rise(reduce, 0.36)}><Actions /></m.div>
        </div>
        <m.div {...rise(reduce, 0.3)} className={`lg:col-span-6 ${photoFirst ? 'lg:order-1' : ''}`}>
          <div className="relative mx-auto max-w-lg">
            <div className={`${frame} ${photoFirst ? '' : 'rotate-[1.5deg]'}`}><div className="aspect-[4/3]">{img}</div></div>
            <span className="glass absolute -bottom-5 left-5 flex items-center gap-3 px-4 py-3"><span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><IndustryIcon name={ind.icon} /></span><span className="font-display text-sm font-semibold">{ind.name}</span></span>
          </div>
        </m.div>
      </div>
    </section>
  )
}

/**
 * /industries/<slug>: one page per industry. Sections: overview and challenges, problem-to-solution comparisons, solutions, AI and automation
 * opportunities, use cases, benefits, related LAX360 services and products, related Insights articles, related industries and a consultation call to action.
 * Everything loads from the admin-panel Industries (or the built-in set). No delivered projects, clients or results are claimed.
 */
export default function IndustryDetail() {
  const { slug } = useParams()
  const industries = useIndustries()
  const articles = useArticles()
  const products = useProducts()
  const ready = useContentReady()
  const ind = industries.find((i) => i.slug === slug)
  if (!ind) return ready ? <NotFound /> : <div className="wrap section min-h-[50vh]" role="status"><p className="text-soft">Loading…</p></div>
  const services = ind.services.map(getDivision).filter(Boolean)
  const linkedProducts = ind.products.map((s) => products.find((p) => p.slug === s)).filter(Boolean)
  const cats = ind.insightCategories
  const related = articles.filter((a) => cats.includes(a.category)).slice(0, 3)
  const query = new URLSearchParams({ ...(cats[0] ? { category: cats[0] } : {}), q: '' })
  const similar = industries.filter((i) => i.slug !== ind.slug && i.group === ind.group).concat(industries.filter((i) => i.slug !== ind.slug && i.group !== ind.group)).slice(0, 3)
  return (
    <PageContainer
      path={`/industries/${ind.slug}`}
      title={ind.seoTitle || `${ind.name} technology solutions`}
      description={ind.metaDescription || ind.summary}
      jsonLd={{ '@context': 'https://schema.org', '@type': 'WebPage', name: ind.name, description: ind.summary, about: ind.name, publisher: { '@type': 'Organization', name: 'LAX360 Pvt Ltd' } }}
    >
      <Hero ind={ind} />

      <section className="wrap section grid gap-10 lg:grid-cols-12 lg:gap-14" aria-labelledby="ov-title">
        <Reveal className="lg:col-span-7">
          <p className="eyebrow text-lav">Overview</p>
          <h2 id="ov-title" className="h2 mt-3">Technology for {ind.name.split(' & ')[0].toLowerCase()}.</h2>
          <div className="mt-5 space-y-4 text-lg text-soft">{ind.overview.map((p) => <p key={p}>{p}</p>)}</div>
        </Reveal>
        {ind.challenges.length > 0 && (
          <Reveal delay={0.08} className="lg:col-span-5">
            <div className="glass p-6 md:p-8"><h3 className="font-display text-xl font-semibold">Major challenges</h3><ul className="mt-4 space-y-3">{ind.challenges.map((c) => <li key={c} className="flex gap-3"><Check className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" />{c}</li>)}</ul></div>
          </Reveal>
        )}
      </section>

      {ind.pairs.length > 0 && (
        <section className="border-y border-edge bg-glass" aria-labelledby="pairs-title">
          <div className="wrap section">
            <SectionHeading id="pairs-title" eyebrow="How technology helps" title="From problem" gradient="to solution." />
            <ul className="mt-10 grid gap-5 lg:grid-cols-1">{ind.pairs.map((p, i) => <PairCard key={p.problem} pair={p} delay={i * 0.06} />)}</ul>
          </div>
        </section>
      )}

      {ind.solutions.length > 0 && (
        <section id="solutions" className="wrap section scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="sol-title">
          <SectionHeading id="sol-title" eyebrow="Software and applications" title="Solutions we can" gradient="build." />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ind.solutions.map((s, i) => (
              <Reveal as="li" key={s} delay={(i % 3) * 0.06} className="glass-flat lift flex items-center gap-4 p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-sm font-bold text-white">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-display text-lg font-semibold leading-tight">{s}</span>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {ind.ai.length > 0 && (
        <section className="border-y border-edge bg-base2/50" aria-labelledby="ai-title">
          <div className="wrap section">
            <SectionHeading id="ai-title" eyebrow="AI and automation" title="Where AI and automation" gradient="can help." lead="Practical opportunities, with people reviewing what matters." />
            <ul className="mt-10 grid gap-5 md:grid-cols-3">
              {ind.ai.map((a, i) => (
                <Reveal as="li" key={a.title} delay={i * 0.07} className="glass-flat lift flex h-full flex-col gap-3 p-6">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-lav"><Sparkles className="size-5" aria-hidden="true" /></span>
                  <p className="font-display text-lg font-semibold leading-tight">{a.title}</p>
                  {a.text && <p className="text-soft">{a.text}</p>}
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(ind.useCases.length > 0 || ind.benefits.length > 0) && (
        <section className="wrap section grid gap-12 lg:grid-cols-12 lg:gap-14" aria-label="Use cases and benefits">
          {ind.useCases.length > 0 && (
            <div className="lg:col-span-7">
              <h2 className="h2 flex items-center gap-3"><Lightbulb className="size-7 text-lav" aria-hidden="true" />Use cases</h2>
              <ul className="mt-6 space-y-3">{ind.useCases.map((u, i) => <Reveal as="li" key={u} delay={i * 0.06} className="glass-flat flex gap-4 p-5 text-lg"><span className="font-display font-bold text-lav">0{i + 1}</span>{u}</Reveal>)}</ul>
            </div>
          )}
          {ind.benefits.length > 0 && (
            <div className="lg:col-span-5">
              <h2 className="h2 flex items-center gap-3"><TrendingUp className="size-7 text-lav" aria-hidden="true" />Benefits</h2>
              <ul className="mt-6 space-y-3">{ind.benefits.map((b) => <li key={b} className="flex gap-3 rounded-2xl border border-edge bg-glass p-4 text-lg"><Check className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" />{b}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      {(services.length > 0 || linkedProducts.length > 0) && (
        <section className="border-y border-edge bg-glass" aria-labelledby="lax-title">
          <div className="wrap section">
            <SectionHeading id="lax-title" eyebrow="With LAX360" title="Relevant services" gradient="and products." />
            {services.length > 0 && (
              <ul className="mt-10 grid gap-5 md:grid-cols-3">
                {services.map((d, i) => {
                  const Icon = divisionIcons[d.slug]
                  return (
                    <Reveal as="li" key={d.slug} delay={i * 0.06}>
                      <Link to={`/services/${d.slug}`} className="glass-flat lift group flex h-full flex-col gap-3 p-6">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Icon className="size-5" aria-hidden="true" /></span>
                        <span className="font-display text-lg font-semibold leading-tight">{d.name}</span><span className="flex-1 text-soft">{d.short}</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-lav">View service <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                      </Link>
                    </Reveal>
                  )
                })}
              </ul>
            )}
            {linkedProducts.length > 0 && (
              <>
                <h3 className="mt-12 font-display text-xl font-semibold">LAX360 products that may apply</h3>
                <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {linkedProducts.map((p, i) => (
                    <Reveal as="li" key={p.slug} delay={i * 0.06}>
                      <Link to={`/products/${p.slug}`} className="glass-flat lift group flex h-full flex-col gap-2 p-5">
                        <StatusBadge status={p.status} />
                        <span className="font-display text-lg font-semibold leading-tight">{p.name}</span><span className="flex-1 text-sm text-soft">{p.summary}</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-lav">View product <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                      </Link>
                    </Reveal>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      <section className="wrap section" aria-labelledby="ins-title">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading id="ins-title" eyebrow="Insights" title="Related" gradient="articles and guides." />
          <Link to={`/insights?${query.toString()}`} className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold text-lav">Explore all related articles <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
        </div>
        {related.length > 0 ? (
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {related.map((a, i) => (
              <Reveal as="li" key={a.slug} delay={i * 0.06}>
                <Link to={`/insights/${a.slug}`} className="glass-flat lift group flex h-full flex-col overflow-hidden">
                  <img src={a.image} alt="" width="800" height="500" loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                  <span className="flex flex-1 flex-col gap-2 p-5"><span className="text-xs font-bold uppercase tracking-wider text-lav">{categoryLabel(a.category)}</span><span className="font-display text-lg font-semibold leading-snug transition-colors group-hover:text-lav">{a.title}</span>{a.publishedOn && <span className="mt-auto text-xs text-soft">{formatDate(a.publishedOn)}</span>}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        ) : <p className="mt-6 text-soft">Articles for this industry will appear here as they are published. <Link to="/insights" className="font-semibold text-lav hover:underline">Browse all Insights</Link>.</p>}
      </section>

      <section className="border-t border-edge bg-glass" aria-labelledby="similar-title">
        <div className="wrap section">
          <div className="flex items-end justify-between gap-4"><SectionHeading id="similar-title" eyebrow="Keep exploring" title="Related" gradient="industries." /><Link to="/industries" className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold text-lav">All industries <ArrowUpRight className="size-4" aria-hidden="true" /></Link></div>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{similar.map((s, i) => <IndustryCard key={s.slug} ind={s} delay={i * 0.06} />)}</ul>
        </div>
      </section>

      <ContactCta title={`Talk to us about ${ind.name.split(' & ')[0].toLowerCase()}.`} />
    </PageContainer>
  )
}
