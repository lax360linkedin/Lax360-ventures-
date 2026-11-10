import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight, BadgeCheck, ChevronRight, Search, X } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import BotHighlight from '../components/ui/BotHighlight.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { ProductCard, ProductMark, ProductVisual } from '../components/products/ProductBits.jsx'
import { productCategories } from '../data/products.js'
import { useProducts } from '../hooks/useProducts.js'
import { useWebsites } from '../hooks/useWebsites.js'
import { WebsiteCard } from '../components/websites/WebsiteBits.jsx'

const EASE = [0.2, 0.8, 0.2, 1]
const scrollToList = (e) => { e.preventDefault(); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }) }

/**
 * /products — LAX360's own software and SaaS products (never third-party products). Hero with product visuals, category filters, search by name or
 * category, a card per product and a closing call to action. Products come from the admin panel (Website content > Products); the built-in portfolio
 * (data/products.json) is shown until some are published there.
 */
export default function Products() {
  const products = useProducts()
  const websites = useWebsites()
  const [cat, setCat] = useState('all')
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const up = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40])
  const down = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 30])
  const cats = useMemo(() => Object.keys(productCategories).filter((c) => products.some((p) => p.category === c)), [products])
  const q = query.trim().toLowerCase()
  const shown = products.filter((p) => (cat === 'all' || p.category === cat) && (!q || `${p.name} ${productCategories[p.category] || ''} ${p.summary}`.toLowerCase().includes(q)))
  const rise = (delay) => (reduce ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } })
  const mosaic = products.slice(0, 4)
  return (
    <PageContainer path="/products" title="Products" description="Software products and SaaS platforms from LAX360 Pvt Ltd: CRM, clinic, learning, billing, API, field operations, bookings, inventory, HR, project management and workflow automation.">
      <section ref={ref} aria-labelledby="products-title" className="relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night">
        <div aria-hidden="true" className="absolute -left-28 top-8 -z-10 size-[26rem] rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-24 top-0 -z-10 size-[28rem] rounded-full bg-sky/15 blur-3xl" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(rgb(var(--glow)/0.28)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_75%_35%,#000,transparent_62%)]" />
        <div className="wrap grid items-center gap-12 pb-16 pt-10 md:pt-14 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-16">
          <div className="lg:col-span-6">
            <m.nav {...rise(0.05)} aria-label="Breadcrumb" className="text-sm text-soft">
              <ol className="flex items-center gap-2"><li><Link to="/" className="transition-colors hover:text-lav">Home</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" /><li aria-current="page" className="font-semibold text-fg">Products</li></ol>
            </m.nav>
            <m.p {...rise(0.12)} className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-edge-strong bg-glass px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lav backdrop-blur-md">
              <BadgeCheck className="size-4" aria-hidden="true" />Built and owned by LAX360
            </m.p>
            <m.h1 {...rise(0.2)} id="products-title" className="h1 mt-5 !text-[clamp(2.3rem,4.8vw,4.3rem)]">
              Technology Products Built for the <BotHighlight delay={0.9}><span className="text-gradient">Way Businesses Work.</span></BotHighlight>
            </m.h1>
            <m.p {...rise(0.3)} className="lead mt-7 max-w-xl text-soft">
              Discover practical software products and intelligent SaaS solutions designed to simplify business operations, connect workflows, and support digital growth.
            </m.p>
            <m.div {...rise(0.4)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="#products" arrow onClick={scrollToList}>Explore Our Products</Button>
              <Button to="/contact" variant="secondary">Contact Our Team</Button>
            </m.div>
          </div>
          <m.div {...rise(0.3)} className="lg:col-span-6">
            <div className="relative mx-auto grid max-w-md grid-cols-2 gap-3 sm:max-w-lg sm:gap-4">
              {mosaic.map((p, i) => (
                <m.div key={p.slug} style={{ y: i % 2 ? down : up }} className={`group relative overflow-hidden rounded-3xl border border-edge-strong shadow-[0_24px_60px_-30px_rgb(var(--glow)/0.55)] ${i === 0 || i === 3 ? 'aspect-[4/5]' : 'aspect-[4/4.4]'}`}>
                  <ProductVisual product={p} eager className="transition-transform duration-700 group-hover:scale-[1.06]" />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute inset-x-3 bottom-3 flex items-center gap-2 text-white"><ProductMark product={p} className="size-8 !rounded-xl" /><span className="font-display text-sm font-semibold leading-tight">{p.name.replace('LAX360 ', '')}</span></span>
                </m.div>
              ))}
              <span className="glass absolute -bottom-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap px-4 py-2 text-sm font-semibold">{products.length} products · {cats.length} categories</span>
            </div>
          </m.div>
        </div>
      </section>

      <section id="products" aria-labelledby="list-title" className="wrap section scroll-mt-[calc(var(--header-bottom,92px)+1rem)]">
        <SectionHeading id="list-title" eyebrow="Our products" title="The LAX360" gradient="product portfolio." lead="Software and SaaS platforms developed and owned by LAX360 Pvt Ltd. Each product shows its current development status." />
        <div className="mt-10 flex flex-col gap-4">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-soft" aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products by name or category" aria-label="Search products by name or category"
              className="h-12 w-full rounded-full border border-edge-strong bg-glass pl-12 pr-12 text-base text-fg outline-none transition-colors placeholder:text-soft focus:border-lav" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-soft hover:text-lav"><X className="size-4" aria-hidden="true" /></button>}
          </div>
          <div role="group" aria-label="Filter by category" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {['all', ...cats].map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${cat === c ? 'border-transparent bg-primary text-white shadow-lg' : 'border-edge-strong bg-glass hover:border-lav'}`}>
                {c === 'all' ? `All (${products.length})` : productCategories[c]}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-6 text-sm text-soft" role="status" aria-live="polite">{shown.length} {shown.length === 1 ? 'product' : 'products'}{cat !== 'all' ? ` in ${productCategories[cat]}` : ''}{q ? ` matching “${query.trim()}”` : ''}</p>
        <AnimatePresence mode="wait">
          <m.ul key={`${cat}|${q}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p, i) => <ProductCard key={p.slug} product={p} delay={(i % 3) * 0.07} />)}
          </m.ul>
        </AnimatePresence>
        {shown.length === 0 && (
          <div className="glass mt-6 p-8 text-center">
            <p className="font-display text-xl font-semibold">No products match your search.</p>
            <button type="button" onClick={() => { setCat('all'); setQuery('') }} className="link-underline mt-3 inline-flex min-h-11 items-center font-semibold text-lav">Show all products</button>
          </div>
        )}
      </section>

      {/* Explore Our Websites: the portfolio teaser (managed in the admin panel under Website portfolio) */}
      <section id="websites" className="wrap section scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="websites-teaser-title">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading id="websites-teaser-title" eyebrow="Explore our websites" title="Our Websites" gradient="& Live Demos." lead="Company websites, client websites and industry demos built by LAX360. Open the live website, or view its features and modules." />
          <Button to="/websites" variant="secondary" arrow className="shrink-0">View all {websites.length > 0 ? websites.length : ''} websites</Button>
        </div>
        {websites.length > 0
          ? <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{websites.slice(0, 6).map((w, i) => <WebsiteCard key={w.slug} site={w} delay={(i % 3) * 0.06} />)}</ul>
          : <div className="glass mt-10 p-8 text-center"><p className="font-display text-xl font-semibold">Websites will appear here soon.</p></div>}
      </section>

      <section className="border-y border-edge bg-glass" aria-labelledby="diff-title">
        <div className="wrap section grid gap-6 md:grid-cols-2">
          <Reveal className="glass-flat p-7">
            <p className="eyebrow text-lav">Products</p>
            <h2 id="diff-title" className="mt-2 font-display text-2xl font-semibold">Software we build and own.</h2>
            <p className="mt-3 text-soft">Reusable platforms and applications developed by LAX360, which businesses can adopt, integrate or build on.</p>
          </Reveal>
          <Reveal delay={0.08} className="glass-flat flex flex-col p-7">
            <p className="eyebrow text-lav">Services</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Work we do for you.</h2>
            <p className="mt-3 flex-1 text-soft">Custom software, AI, marketing, APIs, automation and mobile apps, built around your own requirements.</p>
            <Link to="/services" className="link-underline mt-4 inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-lav">Explore our services <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
          </Reveal>
        </div>
      </section>

      <section className="wrap py-16 md:py-24" aria-labelledby="products-cta-title">
        <Reveal>
          <div className="glass relative overflow-hidden p-8 text-center md:p-14">
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-0 size-72 rounded-full bg-primary/25 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 bottom-0 size-72 rounded-full bg-sky/20 blur-3xl" />
            <h2 id="products-cta-title" className="h2 relative">Find the Right Product <span className="text-gradient">for Your Business.</span></h2>
            <p className="lead relative mx-auto mt-5 max-w-2xl text-soft">Whether you are managing daily business operations, developing digital solutions, or looking to automate workflows, explore the LAX360 product portfolio to find solutions that match your requirements.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href="#products" arrow onClick={scrollToList}>Explore Products</Button>
              <Button to="/contact" variant="secondary">Contact Us</Button>
            </div>
          </div>
        </Reveal>
      </section>
    </PageContainer>
  )
}
