import { useState } from 'react'
import { Badge, Btn, Card, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, fmtDate, useDebounced, useFetch, useToast } from '../ui.jsx'
import { GAMES, ReasonDialog, Unavailable, fmtNum, gameTitle, pz } from './shared.jsx'
import { useAdmin } from '../AdminApp.jsx'

const SCORE_BADGE = { accepted: ['success', 'Counts'], flagged: ['pending', 'Flagged'], hidden: ['inactive', 'Invalidated'] }
const PERIODS = [['all', 'All-time'], ['weekly', 'Weekly'], ['daily', 'Daily']]

function ScoreDetail({ id, onClose, onChanged }) {
  const { can } = useAdmin()
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => pz(`/scores/${id}`), [id])
  const [ask, setAsk] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const act = async (reason) => {
    setBusy(true); setErr('')
    try { await pz(`/scores/${id}/${ask}`, { method: 'POST', body: { reason } }); toast(ask === 'invalidate' ? 'Score invalidated. Rankings were recalculated.' : 'Score restored. Rankings were recalculated.'); setAsk(null); reload(); onChanged() } catch (e) { setErr(e.fields?.reason || e.message) } finally { setBusy(false) }
  }
  const canMod = can('pz_moderation')
  const footer = data && canMod && (
    <>
      {data.status === 'flagged' && <Btn kind="primary" onClick={() => setAsk('approve')}>Approve (counts)</Btn>}
      {data.status === 'hidden' && <Btn kind="primary" onClick={() => setAsk('restore')}>Restore score</Btn>}
      {data.status !== 'hidden' && <Btn kind="danger" onClick={() => setAsk('invalidate')}>Invalidate</Btn>}
    </>
  )
  const titles = { invalidate: 'Invalidate this score', restore: 'Restore this score', approve: 'Approve this flagged score' }
  return (
    <Modal open onClose={onClose} wide title="Score details" footer={footer}>
      {loading && !data && <Spinner />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2"><strong className="text-base">{data.nickname}</strong><Badge value={SCORE_BADGE[data.status][0]} text={SCORE_BADGE[data.status][1]} /><span className="text-soft">{gameTitle(data.game)}{data.level !== 'main' ? ` · ${data.level}` : ''} · {fmtDate(data.at)}</span></div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Verified score', fmtNum(data.score)], ['Ranking points', fmtNum(data.points)], ['Session', data.verification.session_status || '—'], ['Duration', data.verification.duration_seconds != null ? `${data.verification.duration_seconds} s` : '—']].map(([k, v]) => <div key={k} className="rounded-xl border border-edge p-3"><dt className="text-xs uppercase text-soft">{k}</dt><dd className="font-display text-lg font-semibold">{v}</dd></div>)}</dl>
          <p className="text-xs text-soft">The score value is computed by the server and cannot be edited here. You can only invalidate or restore it, with a reason.</p>
          <section><h3 className="font-display font-semibold">Verification</h3>
            <p className="mt-1">Verdict: <strong>{data.verification.verdict || '—'}</strong>{data.verification.config_version ? ` · game profile v${data.verification.config_version}` : ''}{data.effects_applied ? '' : ' · progress and counters not applied yet'}</p>
            {(data.flags.length > 0 || data.verification.reasons.length > 0) && <p className="mt-1">Flags: {[...data.flags, ...data.verification.reasons].map((f) => <code key={f} className="mr-1.5 rounded bg-glass-strong px-1.5 py-0.5 text-xs">{f}</code>)}</p>}
            <details className="mt-2"><summary className="cursor-pointer text-soft">Result details recorded by the server</summary><pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-glass-strong p-2 text-xs">{JSON.stringify({ verified: data.details, submitted: data.verification.client_result }, null, 2)}</pre></details>
          </section>
          <section><h3 className="font-display font-semibold">Moderation history</h3>{data.moderation_history.length === 0 ? <p className="text-soft">No moderation actions yet.</p> : <ul className="mt-1 space-y-1.5">{data.moderation_history.map((e) => <li key={e.id}><strong>{e.action}</strong> by {e.admin} · {fmtDate(e.at)}<span className="block text-soft">{e.reason}</span></li>)}</ul>}</section>
        </div>
      )}
      <ReasonDialog open={!!ask} title={titles[ask] || ''} danger={ask === 'invalidate'} confirmLabel={ask === 'invalidate' ? 'Invalidate' : ask === 'approve' ? 'Approve' : 'Restore'} busy={busy} error={err} onConfirm={act} onClose={() => setAsk(null)}
        intro={ask === 'invalidate' ? 'The score disappears from every leaderboard and the player\'s points are recalculated. It can be restored later.' : 'The score counts again and rankings are recalculated.'} />
    </Modal>
  )
}

function Board() {
  const [game, setGame] = useState('overall')
  const [period, setPeriod] = useState('weekly')
  const [page, setPage] = useState(1)
  const { data, error, loading, reload } = useFetch(() => pz('/leaderboards', { params: { game, period, page, page_size: 20 } }), [game, period, page])
  const overall = game === 'overall'
  const columns = [{ key: 'rank', header: 'Rank' }, { key: 'nickname', header: 'Player', render: (r) => <strong>{r.nickname}</strong> }, { key: 'score', header: overall ? 'Ranking points' : 'Score', render: (r) => fmtNum(overall ? r.points : r.score) }]
  return (
    <Card className="!p-0">
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <Field label="Leaderboard">{(p) => <Select {...p} value={game} onChange={(e) => { setGame(e.target.value); setPage(1) }}><option value="overall">Overall</option>{GAMES.map(([s, t]) => <option key={s} value={s}>{t}</option>)}</Select>}</Field>
        <Field label="Period">{(p) => <Select {...p} value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1) }}>{PERIODS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select>}</Field>
      </div>
      <p className="px-4 pb-3 text-xs text-soft">This is the ranking exactly as players see it. Flagged and invalidated scores and suspended players are not included, and it recalculates as soon as you moderate.</p>
      {loading && !data && <div className="px-4"><Spinner /></div>}
      {error && !data && <div className="space-y-3 p-4"><Unavailable error={error} /><ErrorState error={error} onRetry={reload} /></div>}
      {data && <><DataTable columns={columns} rows={data.items} rowKey={(r) => r.rank} empty={<EmptyState title="No ranked scores for this board and period" />} /><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} /></>}
    </Card>
  )
}

function Scores() {
  const [f, setF] = useState({ game: '', status: '', period: 'all', q: '' })
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const dq = useDebounced(f.q, 350)
  const { data, error, loading, reload } = useFetch(() => pz('/scores', { params: { game: f.game, status: f.status, period: f.period, q: dq, page, page_size: 20 } }), [f.game, f.status, f.period, dq, page])
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const columns = [
    { key: 'player', header: 'Player', render: (r) => <strong>{r.nickname}</strong> }, { key: 'game', header: 'Game', render: (r) => <span>{gameTitle(r.game)}{r.level !== 'main' && <span className="block text-xs text-soft">{r.level}</span>}</span> },
    { key: 'score', header: 'Score', render: (r) => fmtNum(r.score) }, { key: 'status', header: 'Status', render: (r) => <Badge value={SCORE_BADGE[r.status][0]} text={SCORE_BADGE[r.status][1]} /> },
    { key: 'flags', header: 'Flags', render: (r) => (r.flags.length ? <code className="text-xs">{r.flags.join(', ')}</code> : '—') }, { key: 'at', header: 'When', render: (r) => fmtDate(r.at) },
  ]
  return (
    <>
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Game">{(p) => <Select {...p} value={f.game} onChange={set('game')}><option value="">All games</option>{GAMES.map(([s, t]) => <option key={s} value={s}>{t}</option>)}</Select>}</Field>
          <Field label="Score status">{(p) => <Select {...p} value={f.status} onChange={set('status')}><option value="">All</option><option value="flagged">Flagged (needs review)</option><option value="accepted">Counting</option><option value="hidden">Invalidated</option></Select>}</Field>
          <Field label="Period">{(p) => <Select {...p} value={f.period} onChange={set('period')}>{PERIODS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select>}</Field>
          <Field label="Player">{(p) => <Input {...p} type="search" placeholder="Nickname" value={f.q} onChange={set('q')} />}</Field>
        </div>
      </Card>
      <Card className="!p-0">
        {loading && !data && <div className="px-4"><Spinner /></div>}
        {error && !data && <div className="space-y-3 p-4"><Unavailable error={error} /><ErrorState error={error} onRetry={reload} /></div>}
        {data && <><DataTable columns={columns} rows={data.items} onRowClick={(r) => setOpen(r.id)} empty={<EmptyState title="No scores match" />} /><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} /></>}
      </Card>
      {open && <ScoreDetail id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  )
}

export default function Leaderboards() {
  const [tab, setTab] = useState('scores')
  return (
    <>
      <PageHeader title="Leaderboards & moderation" lead="Review score submissions, inspect how each was verified, and invalidate or restore scores with a recorded reason. Verified score values can never be edited." />
      <div role="tablist" aria-label="Leaderboard tools" className="mb-4 flex gap-2">
        {[['scores', 'Score submissions'], ['boards', 'Live leaderboards']].map(([k, t]) => <Btn key={k} role="tab" aria-selected={tab === k} kind={tab === k ? 'primary' : 'secondary'} onClick={() => setTab(k)}>{t}</Btn>)}
      </div>
      {tab === 'scores' ? <Scores /> : <Board />}
    </>
  )
}
