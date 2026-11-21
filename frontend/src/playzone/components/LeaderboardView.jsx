import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, Info, Medal, Trophy } from 'lucide-react'
import { games } from '../data/games.js'
import { useAuth } from '../../hooks/useAuth.js'
import { fetchLeaderboardPage, isUnavailable } from '../services/playZoneApi.js'
import { getLocalBest } from '../services/localScores.js'
import LaxBotPlayer from './LaxBotPlayer.jsx'
import { EmptyState, ErrorState, LoadingState, useLoad } from './parts.jsx'

const PERIODS = [['daily', 'Daily'], ['weekly', 'Weekly'], ['all', 'All-time']]
const TABS = [{ slug: 'overall', title: 'Overall' }, ...games.map((g) => ({ slug: g.slug, title: g.title }))]
const fmt = (n) => new Intl.NumberFormat().format(n)

function Avatar({ variant, size = 44 }) {
  return <span className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/20" style={{ width: size, height: size }}><span className="-mb-1 mt-1.5"><LaxBotPlayer variant={variant || 'star-collector'} size={size * 0.75} /></span></span>
}

// first place stands in the middle and a little higher; second on its left and third on its right (on a phone they simply stack 1, 2, 3)
const PODIUM = [{ at: 0, cls: 'sm:order-2 sm:-mt-6', ring: '#fcd34d', icon: Crown }, { at: 1, cls: 'sm:order-1', ring: '#e5e7eb', icon: Medal }, { at: 2, cls: 'sm:order-3', ring: '#f59e0b', icon: Medal }]
const shown = (e, overall) => (overall ? e.points : e.score)

function Podium({ entries, overall }) {
  return (
    <ol aria-label="Top three players" className="grid gap-4 sm:grid-cols-3 sm:items-end">
      {PODIUM.map(({ at, cls, ring, icon: Icon }) => {
        const e = entries[at]
        if (!e) return null
        return (
          <li key={e.rank} className={`pz-glass flex flex-col items-center gap-2 px-4 py-6 text-center ${cls}`} style={{ borderColor: ring }}>
            <Icon className="size-7" style={{ color: ring }} aria-hidden="true" />
            <Avatar variant={e.avatar} size={64} />
            <p className="font-display max-w-full truncate text-lg font-bold">{e.nickname}</p>
            <p className="pz-gold-text font-display text-3xl font-bold">{fmt(shown(e, overall))}</p>
            <p className="pz-soft text-xs font-bold uppercase tracking-wider">Rank {e.rank}{overall ? ' · points' : ''}</p>
          </li>
        )
      })}
    </ol>
  )
}

function Rows({ entries, overall, start, mineRank }) {
  return (
    <ol start={start} aria-label="Ranking" className="mt-5 space-y-2.5">
      {entries.map((e) => (
        <li key={e.rank} aria-current={e.rank === mineRank ? 'true' : undefined} className={`pz-glass flex items-center gap-3 !rounded-2xl px-4 py-3 ${e.rank === mineRank ? 'ring-2 ring-[var(--pz-blue)]' : ''}`}>
          <span className="w-10 text-center font-display text-lg font-bold text-[var(--pz-blue)]">{e.rank}</span>
          <Avatar variant={e.avatar} />
          <span className="min-w-0 flex-1 truncate font-semibold">{e.nickname}{e.rank === mineRank && <span className="pz-chip ml-2 !py-0.5 !text-[0.62rem]">You</span>}</span>
          <span className="font-display text-lg font-bold tabular-nums">{fmt(shown(e, overall))}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * The real leaderboard: Overall plus one board per game, Daily / Weekly / All-time, server-side pagination and the signed-in player's own position. Every row is a
 * server-VERIFIED score of a real player (nickname and avatar only; never an e-mail or real name). Nothing here is sample data.
 */
export default function LeaderboardView({ initialGame, compact = false }) {
  const { user } = useAuth()
  const [game, setGame] = useState(TABS.some((g) => g.slug === initialGame) ? initialGame : 'overall')
  const [period, setPeriod] = useState('weekly')
  const [page, setPage] = useState(1)
  const size = compact ? 10 : 25
  const load = useLoad(() => fetchLeaderboardPage({ game, period, page, pageSize: size }), [game, period, page, user?.id])
  const overall = game === 'overall'
  const tab = TABS.find((x) => x.slug === game)
  const d = load.data
  const items = d?.items || []
  const podium = page === 1 ? items.slice(0, 3) : []
  const rest = page === 1 ? items.slice(3) : items
  const unavailable = load.status === 'error' && isUnavailable(load.error)
  const pick = (fn) => (v) => { fn(v); setPage(1) }

  return (
    <div>
      <div role="tablist" aria-label="Choose a board" className="flex flex-wrap gap-2">
        {TABS.map((x) => <button key={x.slug} role="tab" type="button" aria-selected={x.slug === game} onClick={() => pick(setGame)(x.slug)} className="pz-tab">{x.title}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Time period" className="flex flex-wrap gap-2">
          {PERIODS.map(([v, label]) => <button key={v} type="button" aria-pressed={period === v} onClick={() => pick(setPeriod)(v)} className="pz-tab">{label}</button>)}
        </div>
        {d?.timezone && period !== 'all' && <p className="pz-soft text-xs">{period === 'daily' ? 'Days' : 'Weeks (Monday start)'} follow {d.timezone} time.</p>}
      </div>

      <div className="mt-6" aria-live="polite">
        <h3 className="mb-4 flex flex-wrap items-center gap-3 font-display text-xl font-bold"><Trophy className="size-5 text-[var(--pz-gold)]" aria-hidden="true" />{tab.title} · {PERIODS.find(([v]) => v === period)[1]}</h3>
        {overall && <p className="pz-soft mb-4 flex gap-2 text-sm"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Overall ranks by <b>ranking points</b>: each game adds a capped, normalised amount (best score per level only) plus claimed daily-challenge points, so no single game or repeat attempts can dominate.</span></p>}
        {load.status === 'loading' && <LoadingState label="Loading the leaderboard" />}
        {unavailable && <EmptyState title="The leaderboard is unavailable right now">We could not reach the Play Zone server. The games still work and your progress stays on this device. Please try again in a little while.</EmptyState>}
        {load.status === 'error' && !unavailable && <ErrorState title="Could not load the leaderboard" onRetry={load.reload}>Please check your connection and try again.</ErrorState>}
        {load.status === 'ready' && items.length === 0 && <EmptyState title="No scores yet">No verified scores in this period. {user ? 'Play a round to take the first place.' : <>Sign in and play to take the first place. <Link to="/login" state={{ from: '/play-zone' }} className="underline">Sign in</Link></>}</EmptyState>}
        {podium.length > 0 && <Podium entries={podium} overall={overall} />}
        {rest.length > 0 && <Rows entries={rest} overall={overall} start={rest[0].rank} mineRank={d?.me?.rank} />}
        {d && d.pages > 1 && (
          <nav aria-label="Leaderboard pages" className="mt-5 flex items-center justify-center gap-3">
            <button type="button" className="pz-btn pz-btn-ghost !min-h-11 !px-4" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span className="pz-soft text-sm">Page {d.page} of {d.pages}</span>
            <button type="button" className="pz-btn pz-btn-ghost !min-h-11 !px-4" disabled={page >= d.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </nav>
        )}
      </div>

      <section aria-labelledby="pz-best-title" className="pz-glass mt-8 flex flex-wrap items-center gap-4 p-5">
        <span className="grid size-12 place-items-center rounded-2xl bg-white/10"><Medal className="size-6 text-[var(--pz-pink)]" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h3 id="pz-best-title" className="font-display text-lg font-bold">Your position</h3>
          <p className="pz-soft text-sm">
            {!user ? <>You are playing as a guest. <Link to="/login" state={{ from: '/play-zone/leaderboard' }} className="font-bold underline">Sign in</Link> to appear on the leaderboard.{!overall && getLocalBest(game) ? ` Local best on this device: ${fmt(getLocalBest(game))} (not ranked).` : ''}</>
              : d?.me ? `Rank ${d.me.rank} · ${fmt(shown(d.me, overall))} ${overall ? 'ranking points' : 'points'}`
                : load.status === 'ready' ? 'No verified score in this period yet.' : '…'}
          </p></div>
      </section>
    </div>
  )
}
