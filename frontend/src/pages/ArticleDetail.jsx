import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import NotFound from './NotFound.jsx'
import { categoryLabel, formatDate, useArticles } from '../hooks/useCmsPages.js'
import { useContentReady } from '../hooks/useSite.js'

/** Article body: a blank line starts a new paragraph; a line starting with "## " is a sub-heading. Plain text only, never HTML. */
function Body({ text }) {
  const blocks = String(text || '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return blocks.map((b, i) => {
    if (b.startsWith('## ')) {
      const [head, ...tail] = b.split('\n')
      return (
        <div key={i}>
          <h2 className="mt-10 font-display text-2xl font-semibold md:text-3xl">{head.slice(3)}</h2>
          {tail.length > 0 && <p className="mt-4">{tail.join(' ')}</p>}
        </div>
      )
    }
    return <p key={i}>{b}</p>
  })
}

export default function ArticleDetail() {
  const { slug } = useParams()
  const articles = useArticles()
  const ready = useContentReady()
  const a = articles.find((x) => x.slug === slug)
  if (!a) return ready ? <NotFound /> : null
  const related = articles.filter((x) => x.slug !== a.slug).sort((x, y) => Number(y.category === a.category) - Number(x.category === a.category)).slice(0, 3)

  return (
    <PageContainer
      path={`/insights/${a.slug}`}
      title={a.title}
      description={a.excerpt}
      jsonLd={{ '@context': 'https://schema.org', '@type': 'Article', headline: a.title, datePublished: a.publishedOn, author: { '@type': 'Organization', name: a.author }, description: a.excerpt }}
    >
      <article>
        <header className="wrap max-w-4xl pb-8 pt-8 md:pt-14">
          <Link to="/insights" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-lav"><ArrowLeft className="size-4" aria-hidden="true" /> All insights</Link>
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.1em] text-lav">
            <span>{categoryLabel(a.category)}</span>
            {a.publishedOn && <time dateTime={a.publishedOn} className="font-medium normal-case tracking-normal text-soft">{formatDate(a.publishedOn)}</time>}
            <span className="font-medium normal-case tracking-normal text-soft">By {a.author}</span>
          </p>
          <h1 className="h1 mt-4 !text-[clamp(2rem,4.6vw,3.75rem)]">{a.title}</h1>
          <p className="lead mt-5 text-soft">{a.excerpt}</p>
        </header>
        {a.image && (
          <div className="wrap max-w-5xl"><img src={a.image} alt={a.imageAlt || ''} width="1000" height="700" decoding="async" className="aspect-[16/8] w-full rounded-3xl border border-edge object-cover" /></div>
        )}
        <div className="wrap max-w-3xl space-y-5 pb-16 pt-10 text-lg leading-relaxed text-fg/90">
          <Body text={a.body} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-edge bg-glass" aria-labelledby="related-title">
          <div className="wrap section">
            <h2 id="related-title" className="font-display text-2xl font-semibold md:text-3xl">Keep reading</h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <Reveal as="li" key={r.slug} delay={i * 0.06}>
                  <Link to={`/insights/${r.slug}`} className="glass-flat lift group flex h-full flex-col gap-2 p-6">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-lav">{categoryLabel(r.category)}</span>
                    <span className="font-display text-lg font-semibold leading-snug transition-colors group-hover:text-lav">{r.title}</span>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-lav">Read article <ArrowUpRight className="size-4" aria-hidden="true" /></span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}
      <ContactCta title="Talk to the team." />
    </PageContainer>
  )
}
