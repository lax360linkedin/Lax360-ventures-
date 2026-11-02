import Reveal from '../ui/Reveal.jsx'

/**
 * Inner-page opener: indexed eyebrow, oversized H1, lead, actions and an optional art panel.
 * `art` is a decorative illustration node; `accent` tints the eyebrow (violet for AI).
 */
export default function PageHero({ eyebrow, title, lead, accent = 'monogram', art, children, className = '' }) {
  return (
    <section className={`relative overflow-hidden border-b border-edge ${className}`}>
      <div className={`wrap grid items-center gap-10 pb-14 pt-12 md:pb-20 md:pt-20 ${art ? 'lg:grid-cols-12 lg:gap-12' : ''}`}>
        <Reveal y={12} className={art ? 'lg:col-span-8' : 'max-w-5xl'}>
          <p className={`eyebrow mb-6 flex items-center gap-3 ${accent === 'violet' ? 'text-violet' : 'text-lav'}`}>
            <span aria-hidden="true" className="h-px w-10 bg-current" />
            {eyebrow}
          </p>
          <h1 className="h1 !text-[clamp(2.5rem,5.6vw,5.5rem)]">{title}</h1>
          {lead && <p className="lead mt-7 text-soft">{lead}</p>}
          {children && <div className="mt-9 flex flex-col gap-3 sm:flex-row">{children}</div>}
        </Reveal>
        {art && (
          <Reveal delay={0.1} className="hidden lg:col-span-4 lg:block">
            <div className="glass p-5">{art}</div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
