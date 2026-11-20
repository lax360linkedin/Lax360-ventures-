import { getLocalBest } from '../services/localScores.js'
import { useState } from 'react'
import { Crown, Medal, Trophy } from 'lucide-react'
import { games } from '../data/games.js'
import { DEV_PREVIEW_NOTICE, devPreviewLeaderboard } from '../data/devPreview.js'
import { fetchLeaderboard, NotIntegratedError } from '../services/playZoneService.js'
import LaxBotPlayer from './LaxBotPlayer.jsx'
import { DevBadge, EmptyState, ErrorState, LoadingState, useLoad } from './parts.jsx'

const PERIODS = [['daily', 'Daily'], ['weekly', 'Weekly'], ['all-time', 'All-time']]
const fmt = (n) => new Intl.NumberFormat().format(n)

function Avatar({ variant, size = 44 }) {
  return <span className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/20" style={{ width: size, height: size }}><span className="-mb-1 mt-1.5"><LaxBotPlayer variant={variant || 'star-collector'} size={size * 0.75} /></span></span>
}

// first place stands in the middle and a little higher; second on its left and third on its right (on a phone they simply stack 1, 2, 3)
const PODIUM = [{ at: 0, cls: 'sm:order-2 sm:-mt-6', ring: '#fcd34d', icon: Crown }, { at: 1, cls: 'sm:order-1', ring: '#e5e7eb', icon: Medal }, { at: 2, cls: 'sm:order-3', ring: '#f59e0b', icon: Medal }]

/** The top three on a podium, then everyone else in a list. Entries flagged `sample` carry a visible "Sample" label. */
function Board({ entries }) {
  const top = entries.slice(0, 3)
  const rest = entries.slice(3)
  return (
    <div>
      <ol aria-label="Top three players" className="grid gap-4 sm:grid-cols-3 sm:items-end">
        {PODIUM.map(({ at, cls, ring, icon: Icon }) => {
          const e = top[at]
          if (!e) return null
          return (
            <li key={e.playerId} className={`pz-glass flex flex-col items-center gap-2 px-4 py-6 text-center ${cls}`} style={{ borderColor: ring }}>
              <Icon className="size-7" style={{ color: ring }} aria-hidden="true" />
              <Avatar variant={e.avatar} size={64} />
              <p className="font-display text-lg font-bold">{e.nickname}</p>
              <p className="pz-gold-text font-display text-3xl font-bold">{fmt(e.score)}</p>
              <p className="pz-soft text-xs font-bold uppercase tracking-wider">Rank {e.rank}{e.sample ? ' · Sample' : ''}</p>
            </li>
          )
        })}
      </ol>
      {rest.length > 0 && (
        <ol start={4} aria-label="Ranking" className="mt-5 space-y-2.5">
          {rest.map((e) => (
            <li key={e.playerId} className="pz-glass flex items-center gap-3 !rounded-2xl px-4 py-3">
              <span className="w-8 text-center font-display text-lg font-bold text-[var(--pz-blue)]">{e.rank}</span>
              <Avatar variant={e.avatar} />
              <span className="min-w-0 flex-1 truncate font-semibold">{e.nickname}{e.sample && <span className="pz-chip pz-chip-dev ml-2 !py-0.5 !text-[0.62rem]">Sample</span>}</span>
              <span className="font-display text-lg font-bold">{fmt(e.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/**
 * The leaderboard: game selector, daily / weekly / all-time filters, the podium, the ranking and the signed-in player's own best. It reads through services/playZoneService.js. Milestone 1 has no
 * backend, so by default it shows an honest "not live yet" state. A visible switch turns on the development preview, which shows clearly labelled SAMPLE entries (never real players).
 */
export default function LeaderboardView({ initialGame, compact = false }) {
  const [game, setGame] = useState(games.some((g) => g.slug === initialGame) ? initialGame : games[0].slug)
  const [period, setPeriod] = useState('weekly')
  const [preview, setPreview] = useState(false)
  const load = useLoad(() => fetchLeaderboard({ game, period }), [game, period])
  const g = games.find((x) => x.slug === game)

  const live = load.status === 'ready'
  const notLive = load.status === 'error' && load.error instanceof NotIntegratedError
  const entries = preview ? devPreviewLeaderboard(game, period) : live ? load.data?.entries || [] : []

  return (
    <div>
      <div role="tablist" aria-label="Choose a game" className="flex flex-wrap gap-2">
        {games.map((x) => <button key={x.slug} role="tab" type="button" aria-selected={x.slug === game} onClick={() => setGame(x.slug)} className="pz-tab">{x.title}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Time period" className="flex flex-wrap gap-2">
          {PERIODS.map(([v, label]) => <button key={v} type="button" aria-pressed={period === v} onClick={() => setPeriod(v)} className="pz-tab">{label}</button>)}
        </div>
        {!compact && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-full border border-dashed border-pink-300/60 bg-pink-300/10 px-4 text-sm font-semibold">
            <input type="checkbox" role="switch" checked={preview} onChange={(e) => setPreview(e.target.checked)} className="size-5 accent-[#f472b6]" />Show development preview (sample data)
          </label>
        )}
      </div>

      <div className="mt-6" aria-live="polite">
        <h3 className="mb-4 flex flex-wrap items-center gap-3 font-display text-xl font-bold"><Trophy className="size-5 text-[var(--pz-gold)]" aria-hidden="true" />{g.title} · {PERIODS.find(([v]) => v === period)[1]}{preview && <DevBadge />}</h3>
        {preview && <p role="note" className="pz-soft mb-4 text-sm">{DEV_PREVIEW_NOTICE}</p>}
        {!preview && load.status === 'loading' && <LoadingState label="Loading the leaderboard" />}
        {!preview && notLive && <EmptyState title="The leaderboard is not live yet">Leaderboards open together with the games. There are no scores to show, and no sample scores are ever shown as real rankings. Come back once {g.title} launches.</EmptyState>}
        {!preview && load.status === 'error' && !notLive && <ErrorState title="Could not load the leaderboard" onRetry={load.reload}>Please check your connection and try again.</ErrorState>}
        {!preview && live && entries.length === 0 && <EmptyState title="No scores yet">Be the first to set a score in {g.title}.</EmptyState>}
        {entries.length > 0 && <Board entries={entries} />}
      </div>

      <section aria-labelledby="pz-best-title" className="pz-glass mt-8 flex flex-wrap items-center gap-4 p-5">
        <span className="grid size-12 place-items-center rounded-2xl bg-white/10"><Medal className="size-6 text-[var(--pz-pink)]" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h3 id="pz-best-title" className="font-display text-lg font-bold">Your personal best</h3>
          <p className="pz-soft text-sm">{live && load.data?.me ? `${fmt(load.data.me.score)} points · rank ${load.data.me.rank}` : (getLocalBest(game) ? `${fmt(getLocalBest(game))} points · Local best on this device, not an official rank.` : 'No official score yet. Play to set a local best; official ranked scores arrive with the backend.')}</p></div>
      </section>
    </div>
  )
}
