import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHero from '../components/sections/PageHero.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import DivisionArt from '../components/art/DivisionArt.jsx'
import { articleCategories } from '../data/articles.js'
import { categoryLabel, formatDate, useArticles } from '../hooks/useCmsPages.js'

function Meta({ a }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.1em] text-lav">
      <span>{categoryLabel(a.category)}</span>
      {a.publishedOn && <time dateTime={a.publishedOn} className="font-medium normal-case tracking-normal text-soft">{formatDate(a.publishedOn)}</time>}
    </span>
  )
}

/** Insights: technology blogs and articles, AI updates, software and digital transformation topics. Managed in the admin panel. */
export default function Insights() {
  const articles = useArticles()
  const [filter, setFilter] = useState('all')
  const categories = useMemo(() => articleCategories.filter((c) => articles.some((a) => a.category === c.value)), [articles])
  const visible = filter === 'all' ? articles : articles.filter((a) => a.category === filter)
  const [featured, ...rest] = visible

  return (
    <PageContainer
      path="/insights"
      title="Insights"
      description="Technology blogs and articles from LAX360 Ventures: AI updates and trends, software development, digital transformation and technology news."
    >
      <PageHero
        eyebrow="Insights"
        title="Ideas and updates on technology."
        art={<DivisionArt id="ai" className="h-auto w-full" />}
        lead="Practical articles on AI, software development and digital transformation, written for people who run businesses."
      />

      <section className="wrap section" aria-labelledby="insights-title">
        <h2 id="insights-title" className="sr-only">Articles</h2>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {[{ value: 'all', label: 'All' }, ...categories].map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={filter === c.value}
              onClick={() => setFilter(c.value)}
              className={`min-h-11 rounded-full border px-5 text-sm font-semibold ${filter === c.value ? 'border-edge-strong bg-base2 text-fg' : 'border-edge bg-glass hover:border-edge-strong'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="sr-only" role="status" aria-live="polite">{visible.length} {visible.length === 1 ? 'article' : 'articles'} shown</p>

        {featured ? (
          <>
            <Reveal className="mt-10">
              <Link to={`/insights/${featured.slug}`} className="glass-flat lift group grid overflow-hidden lg:grid-cols-12">
                {featured.image && <img src={featured.image} alt={featured.imageAlt || ''} width="1000" height="700" decoding="async" className="aspect-[16/10] w-full object-cover lg:col-span-7 lg:aspect-auto lg:h-full" />}
                <span className="flex flex-col justify-center gap-3 p-6 md:p-10 lg:col-span-5">
                  <Meta a={featured} />
                  <span className="font-display text-2xl font-semibold leading-tight transition-colors group-hover:text-lav md:text-3xl">{featured.title}</span>
                  <span className="text-soft">{featured.excerpt}</span>
                  <span className="inline-flex items-center gap-1.5 pt-2 font-semibold text-lav">Read article <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></span>
                </span>
              </Link>
            </Reveal>
            {rest.length > 0 && (
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((a, i) => (
                  <Reveal as="li" key={a.slug} delay={(i % 3) * 0.07}>
                    <Link to={`/insights/${a.slug}`} className="glass-flat lift group flex h-full flex-col overflow-hidden">
                      {a.image && <img src={a.image} alt={a.imageAlt || ''} width="1000" height="700" loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
                      <span className="flex flex-1 flex-col gap-2 p-6">
                        <Meta a={a} />
                        <span className="font-display text-xl font-semibold leading-snug transition-colors group-hover:text-lav">{a.title}</span>
                        <span className="flex-1 text-sm text-soft">{a.excerpt}</span>
                        <span className="inline-flex items-center gap-1.5 pt-2 font-semibold text-lav">Read article <ArrowUpRight className="size-4" aria-hidden="true" /></span>
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-10 text-soft">No articles in this category yet.</p>
        )}
      </section>

      <ContactCta title="Want to put these ideas to work?" />
    </PageContainer>
  )
}
