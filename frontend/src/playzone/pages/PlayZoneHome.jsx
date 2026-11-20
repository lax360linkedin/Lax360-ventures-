import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Gamepad2, ListChecks, Lock, Target, Trophy } from 'lucide-react'
import PzPage from './PzPage.jsx'
import GameArt from '../components/GameArt.jsx'
import LaxBotPlayer from '../components/LaxBotPlayer.jsx'
import GameShowcase from '../components/GameShowcase.jsx'
import LeaderboardView from '../components/LeaderboardView.jsx'
import { PzHeading, StatusChip } from '../components/parts.jsx'
import { BOT_VARIANTS, faq, games, plannedAchievements, plannedChallenges } from '../data/games.js'

function Hero() {
  return (
    <section aria-labelledby="pz-hero-title" className="relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 opacity-90"><GameArt slug="hero" /></div>
      <div className="wrap relative grid items-center gap-8 pb-16 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-4 lg:pb-24 lg:pt-20">
        <div className="pz-rise">
          <p className="pz-eyebrow">LAX360 Play Zone</p>
          <h1 id="pz-hero-title" className="pz-h1 mt-4">Play. Explore. <span className="pz-gold-text">Win.</span></h1>
          <p className="pz-soft mt-6 max-w-xl text-lg leading-relaxed sm:text-xl">Four little worlds, one cheerful robot. Meet LAXBOT, explore the games and get ready to climb the leaderboard. Catch the Stars and LAXBOT Jump are open now; the other games open one by one as they are finished.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#games" className="pz-btn pz-btn-primary">Explore Games <ChevronDown className="size-5" aria-hidden="true" /></a>
            <Link to="/play-zone/leaderboard" className="pz-btn pz-btn-ghost"><Trophy className="size-5" aria-hidden="true" />Leaderboard</Link>
          </div>
          <p className="mt-5"><StatusChip status="live" /> <span className="pz-soft ml-1 text-sm">Catch the Stars and LAXBOT Jump are playable now. The other games are coming soon.</span></p>
        </div>
        <div className="relative mx-auto grid w-full max-w-md place-items-center py-6" aria-hidden="true">
          <span className="pz-spin absolute size-[88%] rounded-full border border-dashed border-white/25" />
          <span className="absolute size-[62%] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(252,211,77,0.45), rgba(167,139,250,0.2) 60%, transparent)' }} />
          <LaxBotPlayer variant="star-collector" size={250} />
          {BOT_VARIANTS.slice(1).map((v, i) => (
            <span key={v.id} className={`pz-float${i === 1 ? '-b' : i === 2 ? '-c' : ''} absolute grid size-14 place-items-center overflow-hidden rounded-2xl border border-white/25 bg-white/10 backdrop-blur`} style={{ [i === 1 ? 'right' : 'left']: i === 1 ? '-2%' : i === 0 ? '-2%' : '6%', top: i === 0 ? '12%' : i === 1 ? '34%' : '82%' }}>
              <span className="mt-2"><LaxBotPlayer variant={v.id} size={40} /></span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function Section({ id, labelledBy, className = '', children }) {
  return <section id={id} aria-labelledby={labelledBy} className={`wrap scroll-mt-24 py-14 md:py-20 ${className}`}>{children}</section>
}

export default function PlayZoneHome() {
  const featured = games[0]
  return (
    <PzPage path="/play-zone" title="LAX360 Play Zone" description="LAX360 Play Zone: four little game worlds with LAXBOT. Explore the games, the leaderboard and daily challenges. Games open as they are finished.">
      <Hero />

      <Section id="games" labelledBy="pz-games-title">
        <PzHeading id="pz-games-title" eyebrow="Choose your world" title="Four games, four worlds" lead="Each world has its own look, rules and LAXBOT outfit. Tap a game to see its story, controls and scoring." />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {games.map((g) => <li key={g.slug}><GameShowcase game={g} /></li>)}
        </ul>
      </Section>

      <Section labelledBy="pz-featured-title" className="!pt-0">
        <div className="pz-glass relative grid items-center gap-8 overflow-hidden p-6 sm:p-9 lg:grid-cols-2">
          <div aria-hidden="true" className="absolute -right-24 -top-24 size-80 rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(252,211,77,0.28), transparent)' }} />
          <div className="relative">
            <p className="pz-eyebrow">Featured game</p>
            <h2 id="pz-featured-title" className="pz-h2 mt-3">{featured.title}</h2>
            <p className="pz-soft mt-2 text-sm font-bold uppercase tracking-wider">{featured.world}</p>
            <p className="pz-soft mt-5 text-lg leading-relaxed">{featured.story}</p>
            <div className="mt-6 flex flex-wrap gap-3"><Link to={`/play-zone/${featured.slug}`} className="pz-btn pz-btn-primary">See the game <ArrowRight className="size-5" aria-hidden="true" /></Link><StatusChip status={featured.status} /></div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-white/20" style={{ aspectRatio: '16 / 10' }}><GameArt slug={featured.slug} /><div className="absolute bottom-0 right-4 w-1/4 min-w-[5.5rem]"><LaxBotPlayer variant={featured.bot} size={130} /></div></div>
        </div>
      </Section>

      <Section id="how" labelledBy="pz-how-title" className="!pt-4">
        <PzHeading id="pz-how-title" eyebrow="How to play" title="Easy to start, fun to master" center />
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {[[Gamepad2, 'Pick a world', 'Choose any of the four games and read its story, controls and scoring on its page.'], [ListChecks, 'Learn the controls', 'Every game works with a keyboard or with touch. Set your sound and graphics before you start.'], [Trophy, 'Climb the leaderboard', 'When the games launch, sign in with your LAX360 account to save your scores and compare them with other players.']].map(([Icon, t, d], i) => (
            <li key={t} className="pz-glass relative p-6">
              <span className="pz-gold-text absolute right-5 top-3 font-display text-6xl font-bold opacity-40">{i + 1}</span>
              <span className="grid size-12 place-items-center rounded-2xl bg-white/10"><Icon className="size-6 text-[var(--pz-gold)]" aria-hidden="true" /></span>
              <h3 className="mt-4 font-display text-xl font-bold">{t}</h3><p className="pz-soft mt-2">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="leaderboard" labelledBy="pz-lb-title">
        <PzHeading id="pz-lb-title" eyebrow="Leaderboard preview" title="Where the best players will shine" lead="Leaderboards open together with the games. Until then this shows the honest state: no scores, and no made-up rankings." />
        <div className="mt-8"><LeaderboardView compact /></div>
        <div className="mt-6"><Link to="/play-zone/leaderboard" className="pz-btn pz-btn-ghost">Open the full leaderboard <ArrowRight className="size-5" aria-hidden="true" /></Link></div>
      </Section>

      <Section labelledBy="pz-ach-title" className="!pt-4">
        <PzHeading id="pz-ach-title" eyebrow="Player achievements" title="Badges to collect" lead="A preview of the planned achievements. They are locked for everyone until gameplay is live." />
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
          {plannedAchievements.map((a) => (
            <li key={a.id} className="pz-glass flex items-start gap-3 !rounded-2xl p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[var(--pz-gold)]"><Lock className="size-5" aria-hidden="true" /></span>
              <div><p className="font-display font-bold leading-tight">{a.title}</p><p className="pz-soft mt-1 text-sm">{a.text}</p><span className="pz-chip pz-chip-dev mt-2 !py-0.5 !text-[0.62rem]">Planned · locked</span></div>
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="pz-dc-title" className="!pt-4">
        <PzHeading id="pz-dc-title" eyebrow="Daily challenges" title="A new goal every day" lead="Daily challenges will refresh each day once the games are live. These are the kinds of goals planned; none is active yet." />
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {plannedChallenges.map((c) => (
            <li key={c.id} className="pz-glass flex flex-col gap-2 p-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-white/10"><Target className="size-5 text-[var(--pz-pink)]" aria-hidden="true" /></span>
              <p className="font-display text-lg font-bold">{c.title}</p><p className="pz-soft text-sm">{c.text}</p>
              <span className="pz-chip pz-chip-dev mt-auto w-fit !text-[0.62rem]">Planned · not active</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="faq" labelledBy="pz-faq-title">
        <PzHeading id="pz-faq-title" eyebrow="Play Zone FAQ" title="Good to know" center />
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {faq.map((f) => (
            <details key={f.q} className="pz-glass group !rounded-2xl px-5 py-1">
              <summary className="flex min-h-14 items-center justify-between gap-4 font-display text-lg font-semibold">{f.q}<ChevronDown className="pz-chev size-5 shrink-0 text-[var(--pz-gold)]" aria-hidden="true" /></summary>
              <p className="pz-soft pb-4 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>
    </PzPage>
  )
}
