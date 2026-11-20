import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Trophy } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import GameArt from './GameArt.jsx'
import LaxBotPlayer from './LaxBotPlayer.jsx'
import { StatusChip } from './parts.jsx'

/**
 * One game showcase: the world's artwork with its LAXBOT outfit, the category and status, the title, a description, the Play button and the leaderboard link. On a pointer device the card
 * tilts towards the pointer and the mascot rises; on touch it simply reacts to the tap (no hover is needed for anything), and the whole card can be reached and used with the keyboard.
 * The Play button opens the game's introduction page: in Milestone 1 that page shows "Coming soon", so the button is labelled "View game", never "Play now".
 */
export default function GameShowcase({ game, featured = false }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const tilt = (e) => {
    if (reduce || e.pointerType !== 'mouse' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`)
    ref.current.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`)
  }
  const rest = () => { ref.current?.style.setProperty('--rx', '0deg'); ref.current?.style.setProperty('--ry', '0deg') }
  return (
    <article ref={ref} onPointerMove={tilt} onPointerLeave={rest} className="pz-card group h-full" style={{ '--accent': game.accent }}>
      <div className="pz-card-art" style={featured ? { aspectRatio: '16 / 9' } : undefined}>
        <GameArt slug={game.slug} />
        <span aria-hidden="true" className="pz-card-shine" />
        <div className="pz-card-bot"><LaxBotPlayer variant={game.bot} size={150} /></div>
        <div className="absolute left-4 top-4 flex flex-wrap gap-2"><span className="pz-chip bg-black/30 backdrop-blur">{game.category}</span><StatusChip status={game.status} /></div>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#120c2e] to-transparent" />
      </div>
      <div className="relative -mt-6 flex flex-col gap-3 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: game.accent }}>{game.world}</p>
        <h3 className="font-display text-2xl font-bold leading-tight">{game.title}</h3>
        <p className="pz-soft text-[0.95rem] leading-relaxed">{game.description}</p>
        <div className="mt-2 flex flex-wrap gap-2.5">
          <Link to={`/play-zone/${game.slug}`} className="pz-btn pz-btn-primary !min-h-11 !px-5 text-sm">{game.status === 'live' ? 'Play' : 'View game'} <ArrowRight className="size-4" aria-hidden="true" /><span className="sr-only"> {game.title}</span></Link>
          <Link to={`/play-zone/leaderboard?game=${game.slug}`} className="pz-btn pz-btn-ghost !min-h-11 !px-4 text-sm"><Trophy className="size-4" aria-hidden="true" />Leaderboard<span className="sr-only"> for {game.title}</span></Link>
        </div>
      </div>
    </article>
  )
}
