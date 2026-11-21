import { Link } from 'react-router-dom'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, fmtDate, useFetch } from '../ui.jsx'
import { BarChart, HBars, Kpi, LineChart, RangeFilter, Unavailable, fmtNum, gameTitle, pz, useRange, GAMES } from './shared.jsx'

export default function Overview() {
  const { range, setRange, params, ready } = useRange('7d')
  const { data, error, loading, reload } = useFetch(() => (ready ? pz('/overview', { params }) : Promise.resolve(null)), [range.range, range.start, range.end])
  const k = data?.kpis
  return (
    <>
      <PageHeader title="Play Zone overview" lead="Live numbers from the Play Zone database: players, sessions, verified points and moderation. Nothing here is estimated." />
      <Card className="mb-4"><RangeFilter value={range} onChange={setRange} />{!ready && <p className="mt-2 text-sm text-soft">Choose both dates to load a custom range.</p>}</Card>
      {loading && !data && <Spinner />}
      {error && <><Unavailable error={error} /><ErrorState error={error} onRetry={reload} /></>}
      {data && (
        <>
          {data.truncated && <p role="note" className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">This range holds a very large number of rows, so the charts use the first 200,000 per series. Choose a shorter range for exact charts.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Registered players" value={fmtNum(k.total_players)} />
            <Kpi label="Active today" value={fmtNum(k.active_today)} hint="Players who started a game today" />
            <Kpi label="Active this week" value={fmtNum(k.active_week)} hint="Since Monday" />
            <Kpi label="Games played" value={fmtNum(k.total_games_played)} hint="Verified rounds, all time" />
            <Kpi label="Verified sessions" value={fmtNum(k.verified_sessions)} hint="Accepted by the server" />
            <Kpi label="Verified points" value={fmtNum(k.verified_points)} hint="Sum of players' ranking points" />
            <Kpi label="Most played game" value={k.most_played_game ? k.most_played_game.title : '—'} hint={k.most_played_game ? `${fmtNum(k.most_played_game.sessions)} verified sessions` : 'No games played yet'} />
            <Kpi label="Games enabled" value={`${k.games_enabled} / ${k.games_total}`} hint="Enabled and published" />
            <Kpi label="Flagged scores" value={fmtNum(k.flagged_scores)} tone={k.flagged_scores ? 'warn' : undefined} hint={k.suspended_players ? `${k.suspended_players} suspended players` : 'Awaiting review'} />
            <Kpi label="Challenges completed today" value={fmtNum(k.challenges_completed_today)} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <LineChart title="Player growth (total players)" data={data.player_growth} yKey="total" empty="No players yet." />
            <BarChart title="Daily game sessions by game" data={data.daily_sessions} series={GAMES.map(([key, label]) => ({ key, label }))} empty="No sessions in this period." />
            <HBars title="Game popularity (verified sessions in range)" rows={data.game_popularity} labelKey="title" valueKey="sessions" />
            <BarChart title="Leaderboard activity (accepted scores per day)" data={data.leaderboard_activity} series={[{ key: 'scores', label: 'Scores' }]} empty="No scores recorded in this period." />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card>
              <h3 className="font-display text-base font-semibold">Recent player activity</h3>
              {data.recent_activity.length === 0 ? <EmptyState title="No activity yet" /> : (
                <ul className="mt-3 space-y-2 text-sm">{data.recent_activity.map((a, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-2"><span><strong>{a.nickname}</strong> · {gameTitle(a.game)}{a.level !== 'main' ? ` · ${a.level}` : ''}</span><span className="flex items-center gap-2 text-xs text-soft">{a.verdict && <Badge value={a.verdict === 'accepted' ? 'success' : a.verdict === 'flagged' ? 'pending' : 'failure'} text={a.verdict} />}{fmtDate(a.at)}</span></li>)}</ul>
              )}
            </Card>
            <Card>
              <h3 className="font-display text-base font-semibold">Recent achievements</h3>
              {data.recent_achievements.length === 0 ? <EmptyState title="No achievements earned yet" /> : (
                <ul className="mt-3 space-y-2 text-sm">{data.recent_achievements.map((a, i) => <li key={i} className="flex flex-wrap justify-between gap-2"><span><strong>{a.nickname}</strong> earned {a.title}</span><span className="text-xs text-soft">{fmtDate(a.at)}</span></li>)}</ul>
              )}
            </Card>
            <Card>
              <h3 className="font-display text-base font-semibold">Moderation alerts</h3>
              {data.moderation_alerts.flagged === 0 ? <p className="mt-3 text-sm text-soft" role="note">No flagged scores are waiting for review.</p> : (
                <>
                  <p className="mt-2 text-sm"><strong>{data.moderation_alerts.flagged}</strong> flagged {data.moderation_alerts.flagged === 1 ? 'score needs' : 'scores need'} review.</p>
                  <ul className="mt-2 space-y-2 text-sm">{data.moderation_alerts.items.map((a) => <li key={a.score_id}><strong>{a.nickname}</strong> · {gameTitle(a.game)} · {fmtNum(a.score)} <span className="block text-xs text-soft">{a.flags.join(', ')}</span></li>)}</ul>
                  <Link to="/company-admin/play-zone/leaderboards" className="mt-3 inline-block text-sm font-semibold underline">Review flagged scores</Link>
                </>
              )}
            </Card>
          </div>
          <p className="mt-3 text-xs text-soft">Dates use {data.range.timezone} time ({data.range.start} to {data.range.end}). Charts and tables cover the chosen range; the tiles at the top are totals or "today/this week".</p>
        </>
      )}
    </>
  )
}
