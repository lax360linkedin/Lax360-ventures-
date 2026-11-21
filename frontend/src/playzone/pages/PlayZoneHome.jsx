import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Gamepad2, ListChecks, Trophy } from 'lucide-react'
import PzPage from './PzPage.jsx'
import GameArt from '../components/GameArt.jsx'
import LaxBotPlayer from '../components/LaxBotPlayer.jsx'
import GameShowcase from '../components/GameShowcase.jsx'
import LeaderboardView from '../components/LeaderboardView.jsx'
import LazyMount from '../components/LazyMount.jsx'
import { AchievementsPanel, ChallengesPanel } from '../components/PlayerPanels.jsx'
import { PzHeading, StatusChip } from '../components/parts.jsx'
import { BOT_VARIANTS, faq, games as allGames } from '../data/games.js'
import { applyConfig, unavailableReason, usePlayZoneConfig } from '../hooks.js'

function Hero() {
  return (
    <section aria-labelledby="pz-hero-title" className="relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 opacity-90"><GameArt slug="hero" /></div>
      <div className="wrap relative grid items-center gap-8 pb-16 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-4 lg:pb-24 lg:pt-20">
        <div className="pz-rise">
          <p className="pz-eyebrow">LAX360 Play Zone</p>
          <h1 id="pz-hero-title" className="pz-h1 mt-4">Play. Explore. <span className="pz-gold-text">Win.</span></h1>
          <p className="pz-soft mt-6 max-w-xl text-lg leading-relaxed sm:text-xl">Four little worlds, one cheerful robot. Meet LAXBOT, explore the games and get ready to climb the leaderboard. All four games are open now.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#games" className="pz-btn pz-btn-primary">Explore Games <ChevronDown className="size-5" aria-hidden="true" /></a>
            <Link to="/play-zone/leaderboard" className="pz-btn pz-btn-ghost"><Trophy className="size-5" aria-hidden="true" />Leaderboard</Link>
          </div>
          <p className="mt-5"><StatusChip status="live" /> <span className="pz-soft ml-1 text-sm">All four games are playable now.</span></p>
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
  const cfg = usePlayZoneConfig()
  const games = applyConfig(allGames, cfg)
  const featured = games[0] || allGames[0]
  const notice = cfg && (!cfg.enabled || cfg.maintenance) ? unavailableReason(cfg, '') : null
  return (
    <PzPage path="/play-zone" title="LAX360 Play Zone" description="LAX360 Play Zone: four little game worlds with LAXBOT. Explore the games, the leaderboard and daily challenges. Games open as they are finished.">
      {notice && <div role="status" className="wrap pt-4"><p className="pz-glass px-5 py-3 text-center font-semibold">{notice} The leaderboards and your profile stay available.</p></div>}
      <Hero />

      <Section id="games" labelledBy="pz-games-title">
        <PzHeading id="pz-games-title" eyebrow="Choose your world" title="Four games, four worlds" lead="Each world has its own look, rules and LAXBOT outfit. Tap a game to see its story, controls and scoring." />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {games.map((g) => <li key={g.slug}>{g.adminConfig && unavailableReason(cfg, g.slug) ? <div className="relative"><GameShowcase game={g} /><span className="pz-chip absolute right-3 top-3">{g.adminConfig.maintenance ? 'Maintenance' : 'Unavailable'}</span></div> : <GameShowcase game={g} />}</li>)}
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
        <PzHeading id="pz-lb-title" eyebrow="Leaderboard" title="Where the best players shine" lead="Real, server-verified scores from signed-in players. Guests can browse every board; sign in and play to join them." />
        <div className="mt-8"><LazyMount minHeight={420}><LeaderboardView compact /></LazyMount></div>
        <div className="mt-6"><Link to="/play-zone/leaderboard" className="pz-btn pz-btn-ghost">Open the full leaderboard <ArrowRight className="size-5" aria-hidden="true" /></Link></div>
      </Section>

      <Section labelledBy="pz-ach-title" className="!pt-4">
        <PzHeading id="pz-ach-title" eyebrow="Achievements & daily challenges" title="Badges to earn, goals to hit" lead="Sign in to earn badges and complete today's challenges. Both are awarded by the server from verified runs, so guests can look but not claim." />
        <div className="mt-8"><LazyMount minHeight={360}><div className="grid gap-6 md:grid-cols-2"><AchievementsPanel headingId="pz-ach-h" /><ChallengesPanel headingId="pz-dc-h" /></div></LazyMount></div>
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
