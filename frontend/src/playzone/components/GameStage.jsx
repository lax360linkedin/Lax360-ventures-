import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hammer, Lock } from 'lucide-react'
import GameArt from './GameArt.jsx'
import LaxBotPlayer from './LaxBotPlayer.jsx'
import { loadGameEngine } from '../engine/index.js'
import { LoadingState, StatusChip } from './parts.jsx'
import ErrorBoundary from '../../components/ErrorBoundary.jsx'
import { webglSupported } from '../../utils/webgl.js'

/**
 * The future gameplay container. It owns the 16:10 stage, the loading / error / ready states and the mount point (`data-game-mount`) where a game engine draws, and it is the only place that
 * will call `loadGameEngine(slug)` (see engine/index.js). Games without an engine honestly show "Coming soon"; a live game (Catch the Stars) is a lazily loaded React component mounted in the container.
 *
 *   status 'coming-soon' → artwork + "in development" panel (Milestone 1)
 *   status 'live'        → loads the engine lazily, shows a loading skeleton, then renders the game component; failures show a retry
 */
export default function GameStage({ game }) {
  const navigate = useNavigate()
  const [Game, setGame] = useState(null)
  const [phase, setPhase] = useState(game.status === 'live' ? 'loading' : 'idle')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (game.status !== 'live') return undefined
    if (!webglSupported()) { setPhase('nowebgl'); return undefined } // no 3D on this device: say so instead of letting the 3D library throw
    const ctrl = new AbortController()
    setPhase('loading')
    loadGameEngine(game.slug)
      .then((engine) => { if (ctrl.signal.aborted) return; setGame(() => engine.default); setPhase('ready') })
      .catch(() => { if (!ctrl.signal.aborted) setPhase('error') })
    return () => { ctrl.abort(); setGame(null) }
  }, [game.slug, game.status, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-label={`${game.title} game area`} className="pz-stage" style={{ '--accent': game.accent }}>
      <GameArt slug={game.slug} />
      <div data-game-mount={game.slug} className="absolute inset-0">{Game && (
        <ErrorBoundary resetKey={attempt} fallback={(_, reset) => (
          <div role="alert" className="absolute inset-0 z-10 grid place-items-center bg-[#0b0724]/80 p-4"><div className="pz-glass max-w-md p-6 text-center"><p className="font-display text-xl font-semibold">The game stopped unexpectedly</p><p className="pz-soft mt-2">The rest of the website is fine. Your scores that were already saved are safe.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" className="pz-btn pz-btn-primary" onClick={reset}>Try again</button><button type="button" className="pz-btn pz-btn-ghost" onClick={() => navigate('/play-zone')}>Back to Play Zone</button></div></div></div>
        )}>
          <Game game={game} onExit={() => navigate('/play-zone')} />
        </ErrorBoundary>
      )}</div>
      {phase !== 'ready' && (
        <div className="absolute inset-0 grid place-items-center bg-[#0b0724]/55 p-4 backdrop-blur-[2px]">
          {phase === 'loading' && <div className="w-full max-w-sm"><LoadingState label={`Loading ${game.title}`} rows={3} /></div>}
          {phase === 'error' && (
            <div role="alert" className="pz-glass max-w-md p-6 text-center"><p className="font-display text-xl font-semibold">The game could not start</p><p className="pz-soft mt-2">Please try again.</p>
              <button type="button" className="pz-btn pz-btn-primary mt-4" onClick={() => setAttempt((n) => n + 1)}>Try again</button></div>
          )}
          {phase === 'nowebgl' && (
            <div role="alert" className="pz-glass max-w-md p-6 text-center"><p className="font-display text-xl font-semibold">This device cannot run the 3D games</p>
              <p className="pz-soft mt-2">Your browser did not provide WebGL, which the Play Zone games need. Turning on hardware acceleration in the browser settings, or trying another browser or device, usually fixes it. The rest of the Play Zone, the leaderboards and your profile still work.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" className="pz-btn pz-btn-primary" onClick={() => navigate('/play-zone/leaderboard')}>See the leaderboard</button><button type="button" className="pz-btn pz-btn-ghost" onClick={() => navigate('/play-zone')}>Back to Play Zone</button></div></div>
          )}
          {phase === 'idle' && (
            <div className="pz-glass flex max-w-lg flex-col items-center gap-3 p-6 text-center sm:p-8">
              <div className="-mt-20 sm:-mt-24"><LaxBotPlayer variant={game.bot} size={118} /></div>
              <StatusChip status={game.status} />
              <h3 className="font-display text-2xl font-bold sm:text-3xl">{game.title} is coming soon</h3>
              <p className="pz-soft">This game is still being built. You can read how it will work below; nothing here is playable yet and no scores are recorded.</p>
              <div className="mt-1 flex flex-wrap justify-center gap-2.5">
                <button type="button" disabled aria-disabled="true" className="pz-btn pz-btn-primary"><Lock className="size-4" aria-hidden="true" />Play (not available yet)</button>
                <span className="pz-chip"><Hammer className="size-3.5" aria-hidden="true" />In development</span>
              </div>
            </div>
          )}
        </div>
      )}
      <p aria-live="polite" className="sr-only">{phase === 'idle' ? `${game.title} is coming soon.` : phase === 'nowebgl' ? 'This device cannot run the 3D games.' : phase === 'loading' ? 'Loading the game.' : ''}</p>
    </section>
  )
}
