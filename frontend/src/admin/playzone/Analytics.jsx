import { useState } from 'react'
import { Download } from 'lucide-react'
import { Btn, Card, DataTable, EmptyState, ErrorState, Field, PageHeader, Pagination, Select, Spinner, useFetch, useToast } from '../ui.jsx'
import { BarChart, GAMES, LineChart, RangeFilter, Unavailable, fmtNum, gameTitle, pct, pz, qs, useRange } from './shared.jsx'
import { api } from '../../services/apiClient.js'

const METRICS = [
  ['Daily active players', 'Distinct players who started at least one game that local day.'],
  ['Weekly active players', 'Distinct players who started a game in that Monday-start week.'],
  ['New players', 'Players whose Play Zone profile was created that day.'],
  ['Returning players', 'Active players that day whose profile was created on an earlier day.'],
  ['Sessions', 'Game sessions started (including ones never finished).'],
  ['Average session duration', 'Mean server-measured time of completed sessions (start to completion). Unfinished sessions have no duration and are left out.'],
  ['Game completion rate', 'Sessions accepted by the server divided by sessions started.'],
  ['Level completion rate', 'For each level: accepted sessions divided by sessions started on that level.'],
  ['Popular worlds', 'Sessions started, grouped by the world a level belongs to.'],
  ['Achievement unlock rate', 'Players who earned the achievement divided by all Play Zone players (all time); "earned in range" counts awards in the chosen dates.'],
  ['Challenge participation', 'For challenges generated in the range: players with progress, completed and claimed.'],
  ['Retention', 'Not shown: the stored data (profiles and sessions) is too thin to report a trustworthy cohort retention figure yet.'],
]

const REPORTS = [['sessions_by_day', 'Daily activity'], ['sessions_by_game', 'Sessions by game'], ['levels', 'Level completion'], ['worlds', 'Popular worlds'], ['achievements', 'Achievement unlocks'], ['challenges', 'Challenge participation']]

export default function Analytics() {
  const { range, setRange, params, ready } = useRange('30d')
  const [game, setGame] = useState('')
  const [page, setPage] = useState(1)
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => (ready ? pz('/analytics', { params: { ...params, game, page, page_size: 15 } }) : Promise.resolve(null)), [range.range, range.start, range.end, game, page])
  const exportCsv = async (report) => {
    try {
      const { blob } = await api(`/api/admin/play-zone/analytics/export${qs({ ...params, game, report })}`, { as: 'blob', timeoutMs: 60000 })
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: `play-zone-${report}.csv` })
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (e) { toast(e.message || 'The export failed.', 'error') }
  }
  const byGame = [
    { key: 'title', header: 'Game' }, { key: 'sessions', header: 'Sessions', render: (r) => fmtNum(r.sessions) }, { key: 'accepted', header: 'Accepted', render: (r) => fmtNum(r.accepted) },
    { key: 'flagged', header: 'Flagged', render: (r) => fmtNum(r.flagged) }, { key: 'rejected', header: 'Rejected', render: (r) => fmtNum(r.rejected) },
    { key: 'avg', header: 'Avg duration', render: (r) => (r.avg_duration_seconds === null ? '—' : `${r.avg_duration_seconds} s`) }, { key: 'rate', header: 'Completion rate', render: (r) => pct(r.completion_rate) },
  ]
  const levels = [
    { key: 'title', header: 'Game' }, { key: 'world', header: 'World' }, { key: 'level', header: 'Level', render: (r) => <code className="text-xs">{r.level}</code> }, { key: 'started', header: 'Started', render: (r) => fmtNum(r.started) },
    { key: 'accepted', header: 'Accepted', render: (r) => fmtNum(r.accepted) }, { key: 'rate', header: 'Completion rate', render: (r) => pct(r.completion_rate) },
  ]
  return (
    <>
      <PageHeader title="Analytics & reports" lead="Charts and tables computed from real sessions, scores, achievements and challenges. Each metric's definition is listed below; metrics the data cannot support are not shown." />
      <Card className="mb-4">
        <RangeFilter value={range} onChange={(r) => { setRange(r); setPage(1) }} extra={<Field label="Game">{(p) => <Select {...p} value={game} onChange={(e) => { setGame(e.target.value); setPage(1) }}><option value="">All games</option>{GAMES.map(([s, t]) => <option key={s} value={s}>{t}</option>)}</Select>}</Field>} />
      </Card>
      {loading && !data && <Spinner />}
      {error && <><Unavailable error={error} /><ErrorState error={error} onRetry={reload} /></>}
      {data && (
        <div className="space-y-4">
          {data.truncated && <p role="note" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">This range is very large; figures use the first 200,000 sessions. Choose a shorter range for exact numbers.</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            <LineChart title="Daily active players" data={data.by_day} yKey="daily_active" empty="No player activity in this period." />
            <BarChart title="New vs returning players (active that day)" data={data.by_day} series={[{ key: 'new_players', label: 'New players' }, { key: 'returning_players', label: 'Returning players' }]} empty="No player activity in this period." />
            <BarChart title="Weekly active players" data={data.weekly_active} xKey="week_start" series={[{ key: 'players', label: 'Players' }]} empty="No player activity in this period." />
            <BarChart title="Sessions per day" data={data.by_day} series={[{ key: 'sessions', label: 'Sessions' }]} empty="No sessions in this period." />
          </div>
          <Card className="!p-0"><div className="flex items-center justify-between p-4"><h2 className="font-display text-lg font-semibold">Sessions by game</h2></div><DataTable columns={byGame} rows={data.sessions_by_game} rowKey={(r) => r.game} empty={<EmptyState title="No sessions in this period" />} /></Card>
          <Card className="!p-0">
            <div className="p-4"><h2 className="font-display text-lg font-semibold">Level completion rates</h2></div>
            <DataTable columns={levels} rows={data.levels} rowKey={(r) => `${r.game}:${r.level}`} empty={<EmptyState title="No level activity in this period" />} />
            <Pagination page={data.page} pages={data.pages} total={data.levels_total} onPage={setPage} />
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="!p-0"><div className="p-4"><h2 className="font-display text-lg font-semibold">Popular worlds</h2></div><DataTable columns={[{ key: 'world', header: 'World' }, { key: 'sessions', header: 'Sessions', render: (r) => fmtNum(r.sessions) }]} rows={data.popular_worlds} rowKey={(r) => r.world} empty={<EmptyState title="No sessions in this period" />} /></Card>
            <Card className="!p-0"><div className="p-4"><h2 className="font-display text-lg font-semibold">Challenge participation</h2></div><DataTable columns={[{ key: 'code', header: 'Challenge', render: (r) => <code className="text-xs">{r.code}</code> }, { key: 'participants', header: 'Players', render: (r) => fmtNum(r.participants) }, { key: 'completed', header: 'Completed', render: (r) => fmtNum(r.completed) }, { key: 'claimed', header: 'Claimed', render: (r) => fmtNum(r.claimed) }, { key: 'rate', header: 'Completion', render: (r) => pct(r.completion_rate) }]} rows={data.challenges} rowKey={(r) => r.code} empty={<EmptyState title="No challenges were generated in this period" />} /></Card>
          </div>
          <Card className="!p-0"><div className="p-4"><h2 className="font-display text-lg font-semibold">Achievement unlock rates</h2></div><DataTable columns={[{ key: 'title', header: 'Achievement' }, { key: 'earned_total', header: 'Earned (all time)', render: (r) => fmtNum(r.earned_total) }, { key: 'in', header: 'Earned in range', render: (r) => fmtNum(r.earned_in_range) }, { key: 'rate', header: 'Unlock rate', render: (r) => pct(r.unlock_rate) }]} rows={data.achievements} rowKey={(r) => r.code} /></Card>
          <Card>
            <h2 className="font-display text-lg font-semibold">Export (CSV)</h2>
            <p className="mt-1 text-sm text-soft">Exports use the date range and game chosen above. Cells that start with =, +, - or @ are neutralised so a spreadsheet never runs them.</p>
            <div className="mt-3 flex flex-wrap gap-2">{REPORTS.map(([r, label]) => <Btn key={r} onClick={() => exportCsv(r)}><Download className="size-4" aria-hidden="true" />{label}</Btn>)}</div>
          </Card>
          <Card>
            <h2 className="font-display text-lg font-semibold">How each metric is calculated</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">{METRICS.map(([t, d]) => <div key={t}><dt className="font-semibold">{t}</dt><dd className="text-soft">{d}</dd></div>)}</dl>
            <p className="mt-3 text-xs text-soft">Days are {data.range.timezone} calendar days; weeks start on Monday. {data.range.game ? `Filtered to ${gameTitle(data.range.game)}.` : ''}</p>
          </Card>
        </div>
      )}
    </>
  )
}
