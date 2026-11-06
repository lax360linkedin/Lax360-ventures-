import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock, Link2, MessageCircle, Tag, User } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import NotFound from './NotFound.jsx'
import { categoryLabel, formatDate, useArticles } from '../hooks/useCmsPages.js'
import { useContentReady } from '../hooks/useSite.js'
import { slugify } from '../utils/slugify.js'

// Simple brand marks for the share buttons (lucide no longer ships brand icons).
const BRAND = {
  LinkedIn: 'M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1zM7.1 20.5H3.6V9h3.5v11.5z',
  X: 'M18.2 2.3h3.3l-7.2 8.3 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.6l7.7-8.8L1.2 2.3H8l4.7 6.2 5.5-6.2zm-1.2 17.5h1.8L7 4.2H5.1l11.9 15.6z',
  Facebook: 'M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z',
}

const BlockImage = ({ src, alt }) => (src
  ? <figure className="my-8"><img src={src} alt={alt || ''} width="1200" height="675" loading="lazy" decoding="async" className="aspect-[16/9] w-full rounded-3xl border border-edge object-cover" /></figure>
  : null)

/** Parse the article text (plain text only, never HTML) into blocks: "## " headings, "- " and "1. " lists, "> " quotes, [[image 1]] / [[image 2]] and paragraphs. */
export function parseBody(text) {
  return String(text || '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).flatMap((b) => {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean)
    if (b.startsWith('## ')) {
      const out = [{ type: 'h2', text: lines[0].slice(3), id: slugify(lines[0].slice(3)) }]
      if (lines.length > 1) out.push({ type: 'p', text: lines.slice(1).join(' ') })
      return out
    }
    const img = /^\[\[image\s*([12])\]\]$/i.exec(b)
    if (img) return [{ type: 'image', n: Number(img[1]) }]
    if (lines.every((l) => /^[-*]\s+/.test(l))) return [{ type: 'ul', items: lines.map((l) => l.replace(/^[-*]\s+/, '')) }]
    if (lines.every((l) => /^\d+[.)]\s+/.test(l))) return [{ type: 'ol', items: lines.map((l) => l.replace(/^\d+[.)]\s+/, '')) }]
    if (lines.every((l) => l.startsWith('> '))) return [{ type: 'quote', text: lines.map((l) => l.slice(2)).join(' ') }]
    return [{ type: 'p', text: lines.join(' ') }]
  })
}

function Body({ blocks, images }) {
  return blocks.map((b, i) => {
    if (b.type === 'h2') return <h2 key={i} id={b.id} className="scroll-mt-[calc(var(--header-bottom,92px)+1rem)] pt-6 font-display text-2xl font-semibold md:text-3xl">{b.text}</h2>
    if (b.type === 'ul') return <ul key={i} className="space-y-2.5">{b.items.map((t) => <li key={t} className="flex gap-3"><span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-lav" /><span>{t}</span></li>)}</ul>
    if (b.type === 'ol') return <ol key={i} className="space-y-2.5">{b.items.map((t, n) => <li key={t} className="flex gap-3"><span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-lav">{n + 1}</span><span>{t}</span></li>)}</ol>
    if (b.type === 'quote') return <blockquote key={i} className="rounded-2xl border-l-4 border-lav bg-glass p-5 font-display text-xl italic">{b.text}</blockquote>
    if (b.type === 'image') return <BlockImage key={i} src={images[b.n - 1]} />
    return <p key={i}>{b.text}</p>
  })
}

function Share({ url, title, vertical = false }) {
  const [copied, setCopied] = useState(false)
  const enc = encodeURIComponent
  const links = [
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`],
    ['X', `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`],
  ]
  const cls = 'flex size-11 items-center justify-center rounded-full border border-edge-strong bg-glass text-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-transparent hover:bg-primary hover:text-white focus-visible:bg-primary focus-visible:text-white'
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000) } catch { window.prompt('Copy this link', url) }
  }
  return (
    <div className={`flex ${vertical ? 'flex-col' : 'flex-wrap'} items-center gap-2.5`}>
      <span className="text-xs font-bold uppercase tracking-wider text-soft">Share</span>
      {links.map(([name, href]) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${name} (opens in a new tab)`} title={`Share on ${name}`} className={cls}><svg viewBox="0 0 24 24" className="size-[1.1rem]" fill="currentColor" aria-hidden="true"><path d={BRAND[name]} /></svg></a>
      ))}
      <a href={`https://wa.me/?text=${enc(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp (opens in a new tab)" title="Share on WhatsApp" className={cls}><MessageCircle className="size-[1.1rem]" aria-hidden="true" /></a>
      <button type="button" onClick={copy} aria-label="Copy link" title="Copy link" className={cls}>{copied ? <Check className="size-[1.1rem]" aria-hidden="true" /> : <Link2 className="size-[1.1rem]" aria-hidden="true" />}</button>
      <span className="sr-only" role="status" aria-live="polite">{copied ? 'Link copied' : ''}</span>
    </div>
  )
}

/** /insights/<slug>: header and cover, share buttons, contents list, the article text (headings, lists, quotes, inline images), tags, related articles and a call to action. */
export default function ArticleDetail() {
  const { slug } = useParams()
  const articles = useArticles()
  const ready = useContentReady()
  const a = articles.find((x) => x.slug === slug)
  if (!a) return ready ? <NotFound /> : null
  const blocks = parseBody(a.body)
  const headings = blocks.filter((b) => b.type === 'h2')
  const shared = new Set(a.tags.map((t) => t.toLowerCase()))
  const score = (x) => (x.category === a.category ? 2 : 0) + x.tags.filter((t) => shared.has(t.toLowerCase())).length
  const related = articles.filter((x) => x.slug !== a.slug).sort((x, y) => score(y) - score(x)).slice(0, 3)
  const idx = articles.findIndex((x) => x.slug === a.slug)
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const url = `${origin}/insights/${a.slug}`
  const person = a.author && !/^lax360/i.test(a.author)
  return (
    <PageContainer
      path={`/insights/${a.slug}`}
      title={a.seoTitle || a.title}
      description={a.metaDescription || a.excerpt}
      jsonLd={{ '@context': 'https://schema.org', '@type': 'Article', headline: a.title, datePublished: a.publishedOn, author: { '@type': person ? 'Person' : 'Organization', name: a.author }, description: a.metaDescription || a.excerpt, image: a.image || undefined, publisher: { '@type': 'Organization', name: 'LAX360 Ventures' } }}
    >
      <article>
        <header className="relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-night via-base2 to-night">
          <div aria-hidden="true" className="absolute -left-28 top-10 -z-10 size-[24rem] rounded-full bg-primary/20 blur-3xl" />
          <div aria-hidden="true" className="absolute -right-24 bottom-0 -z-10 size-[24rem] rounded-full bg-sky/15 blur-3xl" />
          <div className="wrap max-w-5xl pb-10 pt-8 md:pt-10">
            <nav aria-label="Breadcrumb" className="text-sm text-soft">
              <ol className="flex flex-wrap items-center gap-x-1.5">
                <li><Link to="/" className="inline-flex min-h-9 items-center hover:text-lav">Home</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
                <li><Link to="/insights" className="inline-flex min-h-9 items-center hover:text-lav">Insights</Link></li><ChevronRight className="size-3.5 text-lav" aria-hidden="true" />
                <li aria-current="page" className="max-w-[16rem] truncate font-semibold text-fg sm:max-w-md">{a.title}</li>
              </ol>
            </nav>
            <p className="mt-6"><Link to="/insights" className="inline-flex items-center rounded-full border border-edge-strong bg-glass px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-lav hover:border-lav">{categoryLabel(a.category)}</Link></p>
            <h1 className="h1 mt-4 !text-[clamp(2rem,4.6vw,3.75rem)]">{a.title}</h1>
            <p className="lead mt-5 max-w-3xl text-soft">{a.excerpt}</p>
            <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-soft">
              <span className="inline-flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white"><User className="size-4" aria-hidden="true" /></span><span><span className="block text-xs uppercase tracking-wider">Author</span><span className="font-semibold text-fg">{a.author}</span></span></span>
              {a.publishedOn && <span><span className="block text-xs uppercase tracking-wider">Published</span><time dateTime={a.publishedOn} className="font-semibold text-fg">{formatDate(a.publishedOn)}</time></span>}
              <span className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden="true" />{a.readMinutes} min read</span>
            </p>
          </div>
        </header>
        {a.image && <div className="wrap max-w-5xl -mt-1 pt-8"><img src={a.image} alt={a.imageAlt} width="1200" height="675" decoding="async" fetchPriority="high" className="aspect-[16/8] w-full rounded-3xl border border-edge-strong object-cover shadow-[0_30px_70px_-40px_rgb(var(--glow)/0.55)]" /></div>}

        <div className="wrap grid max-w-5xl gap-10 pb-16 pt-10 lg:grid-cols-12">
          <aside className="hidden lg:col-span-2 lg:block" aria-label="Share this article"><div className="sticky top-[calc(var(--header-bottom,92px)+1.5rem)]"><Share url={url} title={a.title} vertical /></div></aside>
          <div className="lg:col-span-7">
            <div className="space-y-5 text-lg leading-relaxed text-fg/90"><Body blocks={blocks} images={a.inlineImages} /></div>
            {a.tags.length > 0 && <ul className="mt-10 flex flex-wrap items-center gap-2" aria-label="Tags"><Tag className="size-4 text-lav" aria-hidden="true" />{a.tags.map((t) => <li key={t} className="tag">{t}</li>)}</ul>}
            <div className="mt-8 border-t border-edge pt-6 lg:hidden"><Share url={url} title={a.title} /></div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-6">
              <Link to="/insights" className="inline-flex min-h-11 items-center gap-2 font-semibold text-lav"><ArrowLeft className="size-4" aria-hidden="true" />Back to Insights</Link>
              {idx > -1 && articles[idx + 1] && <Link to={`/insights/${articles[idx + 1].slug}`} className="inline-flex min-h-11 items-center gap-2 text-right font-semibold text-soft hover:text-lav">Older: {articles[idx + 1].title.slice(0, 40)}{articles[idx + 1].title.length > 40 ? '…' : ''}<ArrowRight className="size-4" aria-hidden="true" /></Link>}
            </div>
          </div>
          {headings.length > 1 && (
            <aside className="lg:col-span-3" aria-label="In this article">
              <div className="glass-flat p-5 lg:sticky lg:top-[calc(var(--header-bottom,92px)+1.5rem)]">
                <p className="font-display text-sm font-semibold uppercase tracking-wider text-lav">In this article</p>
                <ol className="mt-3 space-y-1.5 text-sm">{headings.map((h) => <li key={h.id}><a href={`#${h.id}`} className="block rounded-lg px-2 py-1.5 text-soft transition-colors hover:bg-glass hover:text-lav">{h.text}</a></li>)}</ol>
              </div>
            </aside>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-edge bg-glass" aria-labelledby="related-title">
          <div className="wrap section">
            <SectionHeading id="related-title" eyebrow="Keep reading" title="Related" gradient="articles." />
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <Reveal as="li" key={r.slug} delay={i * 0.06}>
                  <Link to={`/insights/${r.slug}`} className="glass-flat lift group flex h-full flex-col overflow-hidden">
                    <img src={r.image} alt="" width="800" height="500" loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                    <span className="flex flex-1 flex-col gap-2 p-6"><span className="text-xs font-bold uppercase tracking-wider text-lav">{categoryLabel(r.category)}</span><span className="font-display text-lg font-semibold leading-snug transition-colors group-hover:text-lav">{r.title}</span><span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-lav">Read More <ArrowRight className="size-4" aria-hidden="true" /></span></span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="wrap py-16 md:py-24" aria-labelledby="article-cta-title">
        <Reveal>
          <div className="glass relative overflow-hidden p-8 text-center md:p-14">
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-0 size-72 rounded-full bg-primary/25 blur-3xl" />
            <h2 id="article-cta-title" className="h2 relative">Talk to <span className="text-gradient">the team.</span></h2>
            <p className="lead relative mx-auto mt-5 max-w-2xl text-soft">Have a question about the ideas in this article, or a project in mind? We would be glad to hear from you.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button to="/contact?type=project" arrow>Start a Project</Button><Button to="/insights" variant="secondary">More insights</Button></div>
          </div>
        </Reveal>
      </section>
    </PageContainer>
  )
}
