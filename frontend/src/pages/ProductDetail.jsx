import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { AlertCircle, ArrowLeft, ArrowUpRight, Briefcase, Check, ChevronRight, Lightbulb, Sparkles, Users } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { CategoryBadge, ProductCard, ProductMark, ProductVisual, StatusBadge } from '../components/products/ProductBits.jsx'
import { isAvailable, productStatuses } from '../data/products.js'
import { useProducts } from '../hooks/useProducts.js'
import { useContentReady } from '../hooks/useSite.js'
import { isExternal } from '../utils/cms.js'
import NotFound from './NotFound.jsx'

const crumb = 'inline-flex min-h-9 items-center transition-colors hover:text-lav'

/** A link that is a router link for site paths and a normal link for full URLs. */
function LinkButton({ to, variant = 'primary', arrow = false, children }) {
  return isExternal(to) ? <Button href={to} variant={variant} arrow={arrow}>{children}</Button> : <Button to={to} variant={variant} arrow={arrow}>{children}</Button>
}

const STATUS_NOTE = {
  in_development: 'This product is currently in development. Enquire to be kept informed about its progress.',
  soon: 'This product is planned for a future release. Enquire to be kept informed when it becomes available.',
}

/**
 * /products/<slug>: hero, introduction, business problems addressed, key features and modules, screenshots and previews, benefits and use cases, target
 * users and industries, an enquiry form and related products. A demo, login or access button is shown only when the product is Live or Beta and the
 * administrator has set its link.
 */
export default function ProductDetail() {
  const { slug } = useParams()
  const products = useProducts()
  const ready = useContentReady()
  const [shot, setShot] = useState(0)
  const p = products.find((x) => x.slug === slug)
  if (!p) return ready ? <NotFound /> : <div className="wrap section min-h-[50vh]" role="status"><p className="text-soft">Loading…</p></div>
  const live = isAvailable(p.status)
  const related = [...products.filter((x) => x.slug !== p.slug && x.category === p.category), ...products.filter((x) => x.slug !== p.slug && x.category !== p.category)].slice(0, 3)
  const hasShots = p.screenshots.length > 0
  return (
    <PageContainer
      path={`/products/${p.slug}`}
      title={p.name}
      description={p.summary}
      jsonLd={{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: p.name, description: p.summary, applicationCategory: 'BusinessApplication', publisher: { '@type': 'Organization', name: 'LAX360 Ventures' } }}
    >
      {/* hero */}
      <section className="relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night">
        <div aria-hidden="true" className="absolute -left-28 top-10 -z-10 size-[24rem] rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-24 bottom-0 -z-10 size-[24rem] rounded-full bg-sky/15 blur-3xl" />
        <div className="wrap pb-14 pt-8 md:pt-10 lg:pb-20">
          <nav aria-label="Breadcrumb" className="text-sm text-soft">
            <ol className="flex flex-wrap items-center gap-x-1.5">
              <li><Link to="/" className={crumb}>Home</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li><Link to="/products" className={crumb}>Products</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
              <li aria-current="page" className="font-semibold text-fg">{p.name}</li>
            </ol>
          </nav>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-6">
              <div className="flex flex-wrap items-center gap-2"><CategoryBadge category={p.category} /><StatusBadge status={p.status} /></div>
              <div className="mt-5 flex items-center gap-4">
                <ProductMark product={p} className="size-16" />
                <h1 className="h1 !text-[clamp(2rem,4.2vw,3.5rem)]">{p.name}</h1>
              </div>
              <p className="lead mt-5 text-soft">{p.summary}</p>
              {!live && <p className="mt-5 flex gap-2.5 rounded-2xl border border-edge bg-glass p-4 text-soft"><AlertCircle className="mt-0.5 size-5 shrink-0 text-lav" aria-hidden="true" />{STATUS_NOTE[p.status] || STATUS_NOTE.soon}</p>}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {live && p.productLink && <LinkButton to={p.productLink} arrow>{p.status === 'beta' ? 'Access the beta' : 'Access the product'}</LinkButton>}
                {live && p.demoLink && <LinkButton to={p.demoLink} variant="secondary">Request a demo</LinkButton>}
                <Button href="#enquire" variant={live && (p.productLink || p.demoLink) ? 'secondary' : 'primary'} arrow={!(live && (p.productLink || p.demoLink))} onClick={(e) => { e.preventDefault(); document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' }) }}>{p.ctaLabel}</Button>
              </div>
              <Link to="/products" className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-soft transition-colors hover:text-lav"><ArrowLeft className="size-4" aria-hidden="true" />All products</Link>
            </div>
            <Reveal x={24} y={0} className="lg:col-span-6">
              <div className="relative">
                <div className="overflow-hidden rounded-[2rem] border border-edge-strong shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]"><div className="aspect-[4/3]"><ProductVisual product={p} eager /></div></div>
                <span className="glass absolute -bottom-5 left-5 flex items-center gap-3 px-4 py-3"><ProductMark product={p} className="size-10" /><span><span className="block text-xs font-semibold uppercase tracking-wider text-soft">{productStatuses[p.status]}</span><span className="block font-display text-sm font-semibold leading-tight">{p.name}</span></span></span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* introduction */}
      {p.overview.length > 0 && (
        <section className="wrap section grid gap-10 lg:grid-cols-12 lg:gap-14" aria-labelledby="overview-title">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow text-lav">Introduction</p>
            <h2 id="overview-title" className="h2 mt-3">What {p.name.replace('LAX360 ', '')} is for.</h2>
            <div className="mt-5 space-y-4 text-lg text-soft">{p.overview.map((t) => <p key={t}>{t}</p>)}</div>
          </Reveal>
          {p.problems.length > 0 && (
            <Reveal delay={0.08} className="lg:col-span-5">
              <div className="glass p-6 md:p-8">
                <h3 className="font-display text-xl font-semibold">Business problems it addresses</h3>
                <ul className="mt-4 space-y-3">{p.problems.map((x) => <li key={x} className="flex gap-3"><Check className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" />{x}</li>)}</ul>
              </div>
            </Reveal>
          )}
        </section>
      )}

      {/* features and modules */}
      {p.features.length > 0 && (
        <section className="border-y border-edge bg-glass" aria-labelledby="features-title">
          <div className="wrap section">
            <SectionHeading id="features-title" eyebrow="Modules" title="Key features" gradient="and modules." />
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {p.features.map((f, i) => (
                <Reveal as="li" key={f.title} delay={(i % 4) * 0.06} className="glass-flat lift flex h-full flex-col gap-3 p-6">
                  <span className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Sparkles className="size-5" aria-hidden="true" /></span><span className="font-display text-sm font-bold text-lav">{String(i + 1).padStart(2, '0')}</span></span>
                  <p className="font-display text-lg font-semibold leading-tight">{f.title}</p>
                  {f.text && <p className="text-soft">{f.text}</p>}
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* screenshots and previews */}
      <section className="wrap section" aria-labelledby="shots-title">
        <SectionHeading id="shots-title" eyebrow="Previews" title="Screenshots and" gradient="dashboard previews." />
        {hasShots ? (
          <>
            <div className="mt-10 overflow-hidden rounded-[2rem] border border-edge-strong bg-glass shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]">
              <AnimatePresence mode="wait">
                <m.img key={shot} src={p.screenshots[shot]} alt={`${p.name} screenshot ${shot + 1}`} width="1600" height="900" loading="lazy" decoding="async" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="aspect-[16/9] w-full object-contain" />
              </AnimatePresence>
            </div>
            {p.screenshots.length > 1 && (
              <ul className="mt-4 grid grid-cols-4 gap-3" aria-label="Screenshots">
                {p.screenshots.map((s, i) => (
                  <li key={s}><button type="button" onClick={() => setShot(i)} aria-label={`Show screenshot ${i + 1}`} aria-pressed={shot === i} className={`block w-full overflow-hidden rounded-xl border-2 transition-all duration-200 ${shot === i ? 'border-lav' : 'border-edge opacity-70 hover:opacity-100'}`}><img src={s} alt="" width="400" height="225" loading="lazy" decoding="async" className="aspect-[16/9] w-full object-cover" /></button></li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="glass mt-10 grid items-center gap-6 p-6 md:grid-cols-12 md:p-8">
            <div className="overflow-hidden rounded-2xl md:col-span-5"><div className="aspect-[4/3]"><ProductVisual product={p} /></div></div>
            <div className="md:col-span-7">
              <p className="font-display text-xl font-semibold">Screenshots will be added as the product is released.</p>
              <p className="mt-2 text-soft">We only publish real screenshots and dashboard previews of {p.name}. Enquire below and we will share the current status and what to expect.</p>
            </div>
          </div>
        )}
      </section>

      {/* benefits and use cases */}
      {(p.benefits.length > 0 || p.useCases.length > 0) && (
        <section className="border-y border-edge bg-base2/50" aria-labelledby="benefits-title">
          <div className="wrap section grid gap-12 lg:grid-cols-12 lg:gap-14">
            {p.benefits.length > 0 && (
              <div className="lg:col-span-5">
                <h2 id="benefits-title" className="h2">Benefits</h2>
                <ul className="mt-6 space-y-3">{p.benefits.map((b) => <li key={b} className="flex gap-3 rounded-2xl border border-edge bg-glass p-4 text-lg"><Check className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" />{b}</li>)}</ul>
              </div>
            )}
            {p.useCases.length > 0 && (
              <div className="lg:col-span-7">
                <h2 className="h2 flex items-center gap-3"><Lightbulb className="size-7 text-lav" aria-hidden="true" />Practical use cases</h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">{p.useCases.map((u, i) => <Reveal as="li" key={u} delay={i * 0.06} className={`glass-flat p-5 text-lg ${i === 2 && p.useCases.length % 2 ? 'sm:col-span-2' : ''}`}>{u}</Reveal>)}</ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* users and industries */}
      {(p.users.length > 0 || p.industries.length > 0) && (
        <section className="wrap section grid gap-8 md:grid-cols-2" aria-label="Target users and industries">
          {p.users.length > 0 && <Reveal className="glass p-6 md:p-8"><h2 className="flex items-center gap-2 font-display text-2xl font-semibold"><Users className="size-6 text-lav" aria-hidden="true" />Target users</h2><ul className="mt-4 flex flex-wrap gap-2">{p.users.map((x) => <li key={x} className="tag !py-1.5 !text-base">{x}</li>)}</ul></Reveal>}
          {p.industries.length > 0 && <Reveal delay={0.08} className="glass p-6 md:p-8"><h2 className="flex items-center gap-2 font-display text-2xl font-semibold"><Briefcase className="size-6 text-lav" aria-hidden="true" />Industries</h2><ul className="mt-4 flex flex-wrap gap-2">{p.industries.map((x) => <li key={x} className="tag !py-1.5 !text-base">{x}</li>)}</ul></Reveal>}
        </section>
      )}

      {/* related */}
      {related.length > 0 && (
        <section className="border-t border-edge bg-glass" aria-labelledby="more-title">
          <div className="wrap section">
            <div className="flex items-end justify-between gap-4"><SectionHeading id="more-title" eyebrow="More from LAX360" title="Related" gradient="products." /><Link to="/products" className="link-underline inline-flex min-h-11 items-center gap-1.5 font-semibold text-lav">All products <ArrowUpRight className="size-4" aria-hidden="true" /></Link></div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.map((o, i) => <ProductCard key={o.slug} product={o} delay={i * 0.07} />)}</ul>
          </div>
        </section>
      )}

      {/* enquiry */}
      <div id="enquire" className="scroll-mt-[calc(var(--header-bottom,92px)+1rem)]"><ContactCta defaultType="project" title={`Enquire about ${p.name.replace('LAX360 ', '')}.`} /></div>
    </PageContainer>
  )
}
