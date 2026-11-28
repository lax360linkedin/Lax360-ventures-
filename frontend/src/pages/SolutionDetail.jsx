import { Link, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Accordion from '../components/ui/Accordion.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import EnquiryForm from '../components/sections/EnquiryForm.jsx'
import { CustomStatement, SolutionCard, StatusBadge } from '../components/solutions/SolutionBits.jsx'
import { actionsFor, imgSet, solutionHref, statusOf } from '../data/solutions.js'
import fullData from '../data/solutions.json'
import { hasSolution, useSolutionIndex, useSolutionRemote } from '../hooks/useSolutions.js'
import NotFound from './NotFound.jsx'

const FULL = Object.fromEntries(fullData.solutions.map((s) => [s.slug, s]))
const filled = (v) => (Array.isArray(v) ? v.length > 0 : v !== '' && v != null && v !== false)

const Block = ({ id, eyebrow, title, children, tone = '' }) => (
  <section aria-labelledby={`${id}-title`} className={tone}>
    <div className="wrap section">
      <Reveal>
        <p className="eyebrow text-lav">{eyebrow}</p>
        <h2 id={`${id}-title`} className="h2 mt-2 !text-[clamp(1.5rem,3vw,2.4rem)]">{title}</h2>
      </Reveal>
      <div className="mt-8">{children}</div>
    </div>
  </section>
)
const Ticks = ({ items, cols = 'md:grid-cols-2' }) => <ul className={`grid gap-3 ${cols}`}>{items.map((t) => <li key={t} className="flex gap-3 rounded-2xl border border-edge bg-glass p-4"><Check className="mt-0.5 size-5 shrink-0 text-lav" aria-hidden="true" /><span>{t}</span></li>)}</ul>
const Chips = ({ items }) => <ul className="flex flex-wrap gap-2">{items.map((t) => <li key={t} className="rounded-full border border-edge-strong bg-glass px-4 py-2 text-sm font-semibold">{t}</li>)}</ul>

/**
 * /solutions/<solution> — the page of one solution of the Software & IT portfolio. The built-in text (data/solutions.json) is shown at once; the record from the database (Admin > Services > Solutions)
 * replaces any field an administrator has filled in. An unpublished or deleted solution is a 404. Illustrations are labelled as illustrative mockups, and the buttons follow the real availability.
 */
export default function SolutionDetail() {
  const { slug } = useParams()
  const index = useSolutionIndex()
  const remote = useSolutionRemote(slug)
  const builtin = FULL[slug]
  if (index.migrated && !hasSolution(index, slug)) return <NotFound />
  if (!builtin && !remote) return index.migrated ? <div className="wrap section min-h-[50vh]" role="status"><p className="text-soft">Loading…</p></div> : <NotFound />
  const s = { ...(builtin || {}), ...Object.fromEntries(Object.entries(remote || {}).filter(([, v]) => filled(v))) }
  const cat = index.categories.find((c) => c.slug === s.category)
  const status = statusOf(s.status)
  const act = actionsFor(s)
  const related = (s.related || []).map((r) => index.solutions.find((x) => x.slug === r)).filter(Boolean).slice(0, 3)
  const productLink = s.linked_product ? `/products/${s.linked_product}` : ''
  const note = s.mockup_note || 'Product Interface Preview: a design concept with sample data, not a screenshot of a live system.'
  const extra = { service: s.name, service_category: cat?.name || s.category, source_page: `/solutions/${s.slug}`, product_slug: s.slug, availability: status.label }
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'Service', name: s.name, description: s.pitch, serviceType: cat?.name, provider: { '@type': 'Organization', name: 'LAX360 Pvt Ltd' }, areaServed: 'IN' },
    ...(s.faqs?.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: s.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
  ]
  return (
    <PageContainer path={solutionHref(s)} title={s.seo_title || `${s.name} | LAX360 Pvt Ltd`} description={s.seo_description || s.pitch} keywords={(s.keywords || []).join(', ')} jsonLd={jsonLd}>
      <section className="relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night" aria-labelledby="sol-title">
        <div className="wrap grid items-center gap-10 pb-14 pt-8 md:pt-10 lg:grid-cols-12 lg:pb-20">
          <div className="lg:col-span-6">
            <nav aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-1.5 text-sm text-soft">
              <li><Link to="/products#solutions" className="hover:text-lav">Solutions</Link></li><li aria-hidden="true">/</li>
              {cat && <><li><Link to={`/products#sol-${cat.slug}`} className="hover:text-lav">{cat.name}</Link></li><li aria-hidden="true">/</li></>}
              <li aria-current="page" className="font-semibold text-fg">{s.name}</li>
            </ol></nav>
            <div className="mt-6 flex flex-wrap items-center gap-3"><StatusBadge status={s.status} /><span className="text-sm text-soft">{status.note}</span></div>
            <h1 id="sol-title" className="h1 mt-4 !text-[clamp(2.1rem,4.4vw,3.8rem)]">{s.name}</h1>
            <p className="lead mt-5 max-w-xl text-soft">{s.pitch}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to={act.primary.to} arrow>{s.cta_label || act.primary.label}</Button>
              <Button to={s.cta_link || act.secondary.to} variant="secondary">{act.secondary.label}</Button>
              <Button href="#enquire" variant="secondary">Enquire Now</Button>
            </div>
            {(s.links || []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Links">
                {s.links.map((l) => <Button key={l.type} {...(l.external ? { href: l.url, target: '_blank', rel: 'noopener noreferrer' } : { to: l.url })} variant="secondary" className="!px-4 !py-2 text-sm">{l.label}</Button>)}
              </div>
            )}
            {productLink && <p className="mt-5 text-sm text-soft">This is covered by an existing LAX360 product: <Link to={productLink} className="link-underline font-semibold text-lav">see the product page</Link>.</p>}
          </div>
          <figure className="lg:col-span-6">
            <img {...imgSet(s.image)} sizes="(min-width:1024px) 560px, 92vw" alt={s.image_alt || `Solution Preview of ${s.name}`} width="1600" height="1067" fetchPriority="high" decoding="async" className="aspect-[3/2] w-full rounded-[2rem] border border-edge-strong object-cover shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.55)]" />
            <figcaption className="mt-2 text-center text-xs font-semibold text-soft">{note}</figcaption>
          </figure>
        </div>
      </section>

      <Block id="overview" eyebrow="Solution overview" title={`What ${s.name} is.`}>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="space-y-4 text-lg text-soft lg:col-span-7">{(s.overview || [s.pitch]).map((p) => <p key={p}>{p}</p>)}</div>
          <div className="glass p-6 lg:col-span-5">
            <h3 className="font-display text-xl font-semibold">Business problems it addresses</h3>
            <ul className="mt-4 space-y-3">{(s.problems || []).map((p) => <li key={p} className="flex gap-3 text-soft"><Check className="mt-1 size-4 shrink-0 text-lav" aria-hidden="true" />{p}</li>)}</ul>
          </div>
        </div>
      </Block>

      <Block id="features" eyebrow="Key features" title="What it can do." tone="border-y border-edge bg-glass">
        <Ticks items={s.features || []} cols="sm:grid-cols-2 lg:grid-cols-4" />
        <h3 className="mt-10 font-display text-xl font-semibold">Modules and functionalities</h3>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{(s.modules || []).map((m, i) => <li key={m} className="rounded-2xl border border-edge bg-glass p-4"><span className="font-display text-sm font-bold text-lav">{String(i + 1).padStart(2, '0')}</span><p className="mt-1 font-semibold">{m}</p></li>)}</ol>
      </Block>

      <Block id="how" eyebrow="How it works" title="From first conversation to working solution.">
        <ol className="grid gap-4 md:grid-cols-4">{(s.how || []).map((st, i) => <li key={st.title} className="glass-flat p-5"><span className="font-display text-sm font-bold text-lav">Step {i + 1}</span><h3 className="mt-1 font-display text-lg font-semibold">{st.title}</h3><p className="mt-2 text-soft">{st.text}</p></li>)}</ol>
      </Block>

      <Block id="who" eyebrow="Who it is for" title="Customers, industries and benefits." tone="border-y border-edge bg-base2/50">
        <div className="grid gap-8 lg:grid-cols-3">
          <div><h3 className="font-display text-lg font-semibold">Target customers</h3><div className="mt-3"><Chips items={s.customers || []} /></div></div>
          <div><h3 className="font-display text-lg font-semibold">Suitable industries</h3><div className="mt-3"><Chips items={s.industries || []} /></div></div>
          <div><h3 className="font-display text-lg font-semibold">Business benefits</h3><ul className="mt-3 space-y-2">{(s.benefits || []).map((b) => <li key={b} className="flex gap-2.5 text-soft"><Check className="mt-1 size-4 shrink-0 text-lav" aria-hidden="true" />{b}</li>)}</ul></div>
        </div>
      </Block>

      <Block id="platforms" eyebrow="Platforms, customization and integrations" title="Built around your setup.">
        <div className="grid gap-8 lg:grid-cols-3">
          <div><h3 className="font-display text-lg font-semibold">Supported platforms and devices</h3><div className="mt-3"><Chips items={s.platforms || []} /></div><p className="mt-3 text-sm text-soft">Final platforms are confirmed in the written scope.</p></div>
          <div><h3 className="font-display text-lg font-semibold">Customization possibilities</h3><ul className="mt-3 space-y-2">{(s.customization || []).map((b) => <li key={b} className="flex gap-2.5 text-soft"><Check className="mt-1 size-4 shrink-0 text-lav" aria-hidden="true" />{b}</li>)}</ul></div>
          <div><h3 className="font-display text-lg font-semibold">Available integrations</h3><div className="mt-3"><Chips items={s.integrations || []} /></div><p className="mt-3 text-sm text-soft">Which integrations are used is agreed per project.</p></div>
        </div>
      </Block>

      {s.gallery?.length > 0 && (
        <Block id="gallery" eyebrow="Screens" title="Screens and mockups." tone="border-y border-edge bg-glass">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{s.gallery.map((g, i) => { const it = typeof g === 'string' ? { url: g, caption: '', alt: '' } : g; return <li key={`${it.url}-${i}`}><figure><img src={it.url} alt={it.alt || it.caption || `${s.name} screen ${i + 1}`} loading="lazy" decoding="async" className="aspect-[3/2] w-full rounded-2xl border border-edge object-cover" />{it.caption && <figcaption className="mt-1.5 text-xs text-soft">{it.caption}</figcaption>}</figure></li> })}</ul>
          <p className="mt-3 text-xs font-semibold text-soft">{note}</p>
        </Block>
      )}

      {s.faqs?.length > 0 && <Block id="faq" eyebrow="FAQ" title="Common questions." tone="border-y border-edge bg-base2/50"><div className="max-w-3xl"><Accordion items={s.faqs} /></div></Block>}

      {related.length > 0 && (
        <Block id="related" eyebrow="Related solutions" title="You may also be interested in.">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.map((r, i) => <SolutionCard key={r.slug} s={r} delay={i * 0.05} />)}</ul>
        </Block>
      )}

      <section id="enquire" aria-labelledby="enquire-title" className="scroll-mt-[calc(var(--header-bottom,92px)+1rem)] border-t border-edge bg-glass">
        <div className="wrap section grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow text-lav">Enquiry and consultation</p>
            <h2 id="enquire-title" className="h2 mt-2 !text-[clamp(1.5rem,3vw,2.4rem)]">Talk to us about {s.name}.</h2>
            <p className="mt-4 text-soft">Tell us what you need. Your enquiry is saved with this page and solution, so the right person can reply. We agree the scope in writing before any quotation; no standard price is listed.</p>
          </Reveal>
          <div className="glass p-6 lg:col-span-7"><EnquiryForm defaultType="product" compact lockType idPrefix="solution" source="solutions" extra={extra} presets={{ message: `I would like to discuss ${s.name} for my business.` }} /></div>
        </div>
      </section>
      <CustomStatement id="sol-custom" heading={cat?.custom_name} text={cat?.custom_text} />
    </PageContainer>
  )
}
