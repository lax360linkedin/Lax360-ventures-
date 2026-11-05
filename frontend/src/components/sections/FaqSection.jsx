import { useMemo, useState } from 'react'
import { MessageCircleQuestion, Search, X } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading.jsx'
import Accordion from '../ui/Accordion.jsx'
import Button from '../ui/Button.jsx'
import Reveal from '../ui/Reveal.jsx'
import { useHomeFaq } from '../../hooks/useCmsPages.js'

/**
 * Home FAQ: questions grouped into categories (tabs), a search box that looks through every question and answer, a smooth accordion, and a
 * "Still have questions?" call to action. Categories and questions come from the admin panel (Website content > FAQ entries / FAQ categories);
 * the built-in set in data/faqs.json is used until something is published there.
 */
export default function FaqSection() {
  const { categories, items } = useHomeFaq()
  const [cat, setCat] = useState(null)
  const [query, setQuery] = useState('')
  const activeSlug = categories.some((c) => c.slug === cat) ? cat : categories[0]?.slug
  const q = query.trim().toLowerCase()
  const label = useMemo(() => Object.fromEntries(categories.map((c) => [c.slug, c.title])), [categories])

  const visible = useMemo(() => {
    if (q) return items.filter((x) => `${x.q} ${x.a}`.toLowerCase().includes(q)).map((x) => ({ ...x, tag: label[x.category] }))
    return items.filter((x) => x.category === activeSlug)
  }, [items, q, activeSlug, label])

  return (
    <section aria-labelledby="faq-home-title" className="wrap section">
      <SectionHeading id="faq-home-title" eyebrow="FAQ" title="Frequently Asked" gradient="Questions" center className="!max-w-3xl" lead="Straight answers to what clients ask before they choose a technology partner." />

      <div className="mx-auto mt-8 max-w-4xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-soft" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions, e.g. pricing, support, AI"
            aria-label="Search the FAQ"
            className="min-h-12 w-full rounded-full border border-edge-strong bg-glass pl-12 pr-12 text-base text-fg placeholder:text-soft focus-visible:border-lav focus-visible:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-soft hover:text-fg">
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {!q && categories.length > 1 && (
          <div role="tablist" aria-label="FAQ categories" className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-center">
            {categories.map((c) => (
              <button
                key={c.slug || 'general'}
                type="button"
                role="tab"
                aria-selected={c.slug === activeSlug}
                onClick={() => setCat(c.slug)}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ${c.slug === activeSlug ? 'border-transparent bg-gradient-to-r from-primary to-accent text-white' : 'border-edge bg-glass text-soft hover:border-edge-strong hover:text-fg'}`}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}

        <p className="sr-only" role="status" aria-live="polite">{q ? `${visible.length} ${visible.length === 1 ? 'question matches' : 'questions match'} your search` : ''}</p>

        <div className="mt-6">
          {visible.length ? (
            <Accordion key={`${q}|${activeSlug}`} items={visible} />
          ) : (
            <p className="rounded-2xl border border-dashed border-edge px-5 py-8 text-center text-soft">No questions match &ldquo;{query}&rdquo;. Try another word, or ask us directly below.</p>
          )}
        </div>

        <Reveal className="mt-8">
          <div className="glass flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center md:p-8">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white"><MessageCircleQuestion className="size-6" aria-hidden="true" /></span>
              <div>
                <p className="font-display text-xl font-semibold">Still Have Questions?</p>
                <p className="mt-1 text-soft">Tell us what you need and the team will get back to you.</p>
              </div>
            </div>
            <Button to="/contact" arrow className="shrink-0">Contact Us</Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
