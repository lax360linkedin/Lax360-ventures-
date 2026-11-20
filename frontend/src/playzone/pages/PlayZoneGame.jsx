import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Keyboard, ListChecks, Medal, Smartphone, Trophy } from 'lucide-react'
import PzPage from './PzPage.jsx'
import NotFound from '../../pages/NotFound.jsx'
import GameArt from '../components/GameArt.jsx'
import GameStage from '../components/GameStage.jsx'
import LaxBotPlayer from '../components/LaxBotPlayer.jsx'
import PrefsPanel from '../components/PrefsPanel.jsx'
import { BackLink, StatusChip } from '../components/parts.jsx'
import { BOT_VARIANTS, games, gameBySlug } from '../data/games.js'

const List = ({ items, icon: Icon, tint }) => (
  <ul className="mt-3 space-y-2.5">
    {items.map((t) => <li key={t} className="flex gap-3 leading-relaxed"><Icon className="mt-1 size-4 shrink-0" style={{ color: tint }} aria-hidden="true" /><span className="pz-soft">{t}</span></li>)}
  </ul>
)

/**
 * A game's introduction page: themed header with its LAXBOT outfit, the (non-functional) game stage, the story, controls, objectives and scoring, the sound and graphics preferences and links.
 * Milestone 1 has no gameplay: the stage says "Coming soon" and the scoring lines describe the planned design.
 */
export default function PlayZoneGame() {
  const { game: slug } = useParams()
  const game = gameBySlug(slug)
  if (!game) return <NotFound />
  const bot = BOT_VARIANTS.find((b) => b.id === game.bot)
  const index = games.indexOf(game)
  const next = games[(index + 1) % games.length]
  return (
    <PzPage path={`/play-zone/${game.slug}`} title={`${game.title}: ${game.world}`} description={`${game.title} in the LAX360 Play Zone: ${game.tagline}${game.status === 'live' ? '' : ' Coming soon.'}`}>
      <section aria-labelledby="pz-game-title" className="relative overflow-hidden" style={{ '--accent': game.accent }}>
        <div aria-hidden="true" className="absolute inset-0"><GameArt slug={game.slug} /></div>
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#120c2e]/30 via-[#120c2e]/55 to-[#120c2e]" />
        <div className="wrap relative grid items-end gap-6 pb-12 pt-10 md:pb-16 md:pt-14 lg:grid-cols-[1fr_auto]">
          <div className="pz-rise">
            <BackLink />
            <p className="pz-eyebrow mt-8" style={{ color: game.accent }}>{game.world}</p>
            <h1 id="pz-game-title" className="pz-h1 mt-3">{game.title}</h1>
            <p className="pz-soft mt-5 max-w-2xl text-lg leading-relaxed sm:text-xl">{game.tagline}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3"><StatusChip status={game.status} /><span className="pz-chip">{game.category}</span><span className="pz-chip">LAXBOT · {bot?.label}</span></div>
          </div>
          <div className="hidden lg:block"><LaxBotPlayer variant={game.bot} size={210} /></div>
        </div>
      </section>

      <div className="wrap space-y-10 pb-16 md:space-y-14 md:pb-24">
        <GameStage game={game} />

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="pz-story" className="pz-glass p-6 sm:p-8">
            <h2 id="pz-story" className="font-display text-2xl font-bold">The story</h2>
            <p className="pz-soft mt-3 text-lg leading-relaxed">{game.story}</p>
            <p className="pz-soft mt-4 leading-relaxed">{game.description}</p>
          </section>
          <section aria-labelledby="pz-obj" className="pz-glass p-6 sm:p-8">
            <h2 id="pz-obj" className="font-display text-2xl font-bold">Objectives & scoring</h2>
            <h3 className="mt-4 text-sm font-bold uppercase tracking-wider" style={{ color: game.accent }}>Objectives</h3><List items={game.objectives} icon={ListChecks} tint={game.accent} />
            <h3 className="mt-5 text-sm font-bold uppercase tracking-wider" style={{ color: game.accent }}>{game.status === 'live' ? 'Scoring' : 'Scoring (planned design)'}</h3><List items={game.scoring} icon={Medal} tint={game.accent} />
            <p className="pz-soft mt-4 text-xs">{game.status === 'live' ? 'Scores are saved on this device only. Official ranked scores need a server check and arrive in a later milestone.' : 'Final scoring values are set when the game is built.'}</p>
          </section>
        </div>

        <section aria-labelledby="pz-controls" className="pz-glass p-6 sm:p-8">
          <h2 id="pz-controls" className="font-display text-2xl font-bold">Controls</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div><h3 className="flex items-center gap-2 font-semibold"><Keyboard className="size-5 text-[var(--pz-blue)]" aria-hidden="true" />Keyboard</h3><List items={game.controls.keyboard} icon={ArrowRight} tint="#7dd3fc" /></div>
            <div><h3 className="flex items-center gap-2 font-semibold"><Smartphone className="size-5 text-[var(--pz-pink)]" aria-hidden="true" />Touch</h3><List items={game.controls.touch} icon={ArrowRight} tint="#f9a8d4" /></div>
          </div>
        </section>

        <PrefsPanel />

        <nav aria-label="More Play Zone" className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3"><BackLink /><Link to={`/play-zone/leaderboard?game=${game.slug}`} className="pz-btn pz-btn-primary"><Trophy className="size-5" aria-hidden="true" />{game.title} leaderboard</Link></div>
          <Link to={`/play-zone/${next.slug}`} className="pz-btn pz-btn-ghost">Next: {next.title}<ArrowRight className="size-5" aria-hidden="true" /></Link>
        </nav>

        <details className="pz-glass !rounded-2xl px-5 py-2 text-sm">
          <summary className="flex min-h-12 items-center font-semibold">Development notes (for the team)</summary>
          <p className="pz-soft pb-3 leading-relaxed">This page is the gameplay container: <code>GameStage</code> reserves the game area, <code>engine/index.js</code> loads each game as a separate lazy module so no 3D library reaches the corporate website, and <code>services/playZoneService.js</code> is the boundary to the future FastAPI endpoints. Catch the Stars and LAXBOT Jump are live (each is a separate lazy chunk with three.js and React Three Fiber, and its rules are pure code, tested with <code>npm run test:game</code>); the Catch the Stars notes: it is a separate lazy chunk (three.js + React Three Fiber), its rules are pure code in <code>games/catchTheStars/logic.js</code> (tested with <code>npm run test:game</code>), and its scores stay local (<code>services/localScores.js</code>). The other games are not playable yet.</p>
        </details>
      </div>
    </PzPage>
  )
}
