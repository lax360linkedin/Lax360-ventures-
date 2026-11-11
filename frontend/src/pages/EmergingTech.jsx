import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { emergingTech } from '../data/emergingTech.js'

/**
 * Robotics and Blockchain: one page layout for two EMERGING initiatives (/robotics, /blockchain). The page says what is planned and what LAX360 does today, and never
 * presents the initiative as a finished product. Wording lives in data/emergingTech.js.
 */
export default function EmergingTech({ topic }) {
  const t = emergingTech[topic]
  return (
    <PageContainer path={t.path} title={t.name} description={t.description}>
      <section className="relative overflow-hidden border-b border-edge">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-24 size-[34rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.28), transparent)' }} />
        <div className="wrap relative pb-14 pt-10 md:pb-20 md:pt-16">
          <Reveal y={12} className="max-w-4xl">
            <p className="eyebrow mb-6 flex flex-wrap items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-10 bg-current" />{t.name}
              <span className="rounded-full border border-amber-400/60 bg-amber-400/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300">Planned initiative</span></p>
            <h1 className="h1 !text-[clamp(2.4rem,5.4vw,5rem)]">{t.headline}</h1>
            <p className="lead mt-7 max-w-3xl text-soft">{t.lead}</p>
          </Reveal>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="status-title">
        <Reveal className="glass max-w-4xl border-l-4 border-amber-400 p-6 md:p-8">
          <h2 id="status-title" className="font-display text-2xl font-semibold">{t.statusTitle}</h2>
          <p className="mt-3 text-lg text-soft">{t.status}</p>
        </Reveal>
      </section>

      <section className="wrap section pt-0" aria-labelledby="areas-title">
        <SectionHeading id="areas-title" eyebrow="Direction" title={t.areasTitle} />
        <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {t.areas.map((a, i) => (
            <Reveal as="li" key={a.title} delay={i * 0.05} className="glass p-6">
              <h3 className="font-display text-xl font-semibold">{a.title}</h3>
              <p className="mt-2 text-soft">{a.text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="wrap section pt-0" aria-labelledby="now-title">
        <h2 id="now-title" className="sr-only">What is available today and what is planned</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal className="glass p-6 md:p-8">
            <p className="eyebrow text-lav">Available today</p>
            <p className="mt-2 font-display text-2xl font-semibold">What LAX360 already delivers</p>
            <ul className="mt-4 space-y-2 text-soft">{t.today.map((x) => <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-lav" />{x}</li>)}</ul>
            <div className="mt-6 flex flex-wrap gap-3">{t.todayLinks.map((l) => <Button key={l.to} to={l.to} variant="secondary">{l.label}</Button>)}</div>
          </Reveal>
          <Reveal delay={0.08} className="glass border-amber-400/50 p-6 md:p-8">
            <p className="eyebrow text-amber-600 dark:text-amber-300">Planned, not yet available</p>
            <p className="mt-2 font-display text-2xl font-semibold">{t.plannedTitle}</p>
            <ul className="mt-4 space-y-2 text-soft">{t.planned.map((x) => <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-amber-400" />{x}</li>)}</ul>
            <p className="mt-6 text-sm text-soft">Plans can change. We will describe a {t.name.toLowerCase()} offering here only when it is ready and verified.</p>
          </Reveal>
        </div>
      </section>

      <section className="wrap section pt-0">
        <Reveal className="glass flex flex-col items-start justify-between gap-6 p-6 md:flex-row md:items-center md:p-10">
          <div className="max-w-2xl">
            <p className="font-display text-3xl font-semibold leading-tight">{t.ctaTitle}</p>
            <p className="mt-2 text-lg text-soft">{t.ctaText}</p>
          </div>
          <Button to="/contact?type=quote" arrow>Contact us</Button>
        </Reveal>
      </section>
    </PageContainer>
  )
}
