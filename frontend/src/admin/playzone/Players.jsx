import { useState } from 'react'
import { Badge, Btn, Card, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, fmtDate, fmtDay, useDebounced, useFetch, useToast } from '../ui.jsx'
import { ReasonDialog, Unavailable, fmtNum, gameTitle, pz } from './shared.jsx'
import { useAdmin } from '../AdminApp.jsx'

const MOD = { ok: ['active', 'OK'], flagged: ['pending', 'Has flagged scores'], hidden: ['draft', 'Hidden'], suspended: ['inactive', 'Suspended'] }

function Detail({ id, onClose, onChanged }) {
  const { can } = useAdmin()
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => pz(`/players/${id}`), [id])
  const [ask, setAsk] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const act = async (reason) => {
    setBusy(true); setErr('')
    try { await pz(`/players/${id}/${ask}`, { method: 'POST', body: { reason } }); toast(ask === 'suspend' ? 'Play Zone participation paused. The website account is unchanged.' : 'Play Zone participation restored.'); setAsk(null); reload(); onChanged() } catch (e) { setErr(e.fields?.reason || e.message) } finally { setBusy(false) }
  }
  const scores = useFetch(() => pz(`/players/${id}/scores`, { params: { page_size: 10 } }), [id])
  return (
    <Modal open onClose={onClose} wide title={data ? data.nickname : 'Player'} footer={data && can('pz_players') && (data.suspended ? <Btn kind="primary" onClick={() => setAsk('restore')}>Restore participation</Btn> : <Btn kind="danger" onClick={() => setAsk('suspend')}>Suspend Play Zone participation</Btn>)}>
      {loading && !data && <Spinner />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center gap-2"><Badge value={MOD[data.moderation][0]} text={MOD[data.moderation][1]} /><Badge value={data.account_active ? 'active' : 'inactive'} text={data.account_active ? 'Website account active' : 'Website account inactive'} /><span className="text-soft">Player ID {data.id.slice(0, 8)} · joined {fmtDay(data.registered_at)} · last active {fmtDate(data.last_active_at)}</span></div>
          {data.suspended && <p role="note" className="rounded-lg border border-error/40 bg-error/10 p-3">Suspended {fmtDate(data.suspended_at)}: {data.suspended_reason}. Their website account still works normally.</p>}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Games played', data.games_played], ['Verified points', data.verified_points], ['Achievements', data.achievements], ['Flagged scores', data.flagged_scores]].map(([k, v]) => <div key={k} className="rounded-xl border border-edge p-3"><dt className="text-xs uppercase text-soft">{k}</dt><dd className="font-display text-xl font-semibold tabular-nums">{fmtNum(v)}</dd></div>)}</dl>
          <section><h3 className="font-display font-semibold">Progress</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(data.progress).map(([g, p]) => <li key={g} className="rounded-xl border border-edge p-3"><strong>{gameTitle(g)}</strong><br /><span className="text-soft">{g === 'catch-the-stars' ? `Best ${fmtNum(p.best || 0)}` : `${p.levels_verified.length} verified · ${p.levels_completed.length} completed · ${p.unlocked.length} unlocked`}</span></li>)}</ul></section>
          <section><h3 className="font-display font-semibold">Achievements</h3>{data.achievements_earned.length === 0 ? <p className="text-soft">None earned yet.</p> : <ul className="mt-2 flex flex-wrap gap-2">{data.achievements_earned.map((a) => <li key={a.code}><Badge value="success" text={`${a.title} · ${fmtDay(a.at)}`} /></li>)}</ul>}</section>
          <section><h3 className="font-display font-semibold">Verified game history</h3>
            {scores.loading && !scores.data && <Spinner />}
            {scores.data && (scores.data.items.length === 0 ? <p className="text-soft">No verified scores yet.</p> : <ul className="mt-2 divide-y divide-edge">{scores.data.items.map((s) => <li key={s.id} className="flex flex-wrap justify-between gap-2 py-1.5"><span>{gameTitle(s.game)}{s.level !== 'main' ? ` · ${s.level}` : ''} · <strong>{fmtNum(s.score)}</strong></span><span className="flex items-center gap-2 text-xs text-soft"><Badge value={s.status === 'accepted' ? 'success' : s.status === 'flagged' ? 'pending' : 'inactive'} text={s.status === 'hidden' ? 'invalidated' : s.status} />{fmtDate(s.at)}</span></li>)}</ul>)}
          </section>
          <section><h3 className="font-display font-semibold">Moderation history</h3>{data.moderation_history.length === 0 ? <p className="text-soft">Nothing recorded.</p> : <ul className="mt-2 space-y-1.5">{data.moderation_history.map((e) => <li key={e.id}><strong>{e.action}</strong> by {e.admin} · {fmtDate(e.at)}<span className="block text-soft">{e.reason}</span></li>)}</ul>}</section>
        </div>
      )}
      <ReasonDialog open={!!ask} title={ask === 'suspend' ? 'Suspend Play Zone participation' : 'Restore Play Zone participation'} danger={ask === 'suspend'} confirmLabel={ask === 'suspend' ? 'Suspend' : 'Restore'} busy={busy} error={err}
        intro={ask === 'suspend' ? 'The player cannot start games, submit scores or sync progress, and disappears from the leaderboards. Their website account is not affected.' : 'The player can play again and returns to the leaderboards.'} onConfirm={act} onClose={() => setAsk(null)} />
    </Modal>
  )
}

export default function Players() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [flagged, setFlagged] = useState(false)
  const [sort, setSort] = useState('joined')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const dq = useDebounced(q, 350)
  const { data, error, loading, reload } = useFetch(() => pz('/players', { params: { q: dq, status, flagged, sort, page, page_size: 20 } }), [dq, status, flagged, sort, page])
  const columns = [
    { key: 'nickname', header: 'Player', render: (r) => <span><strong>{r.nickname}</strong><span className="block text-xs text-soft">ID {r.id.slice(0, 8)}</span></span> },
    { key: 'status', header: 'Status', render: (r) => <span className="flex flex-col gap-1"><Badge value={MOD[r.moderation][0]} text={MOD[r.moderation][1]} />{!r.account_active && <Badge value="inactive" text="Account inactive" />}</span> },
    { key: 'joined', header: 'Registered', render: (r) => fmtDay(r.registered_at) }, { key: 'last', header: 'Last active', render: (r) => fmtDate(r.last_active_at) },
    { key: 'games', header: 'Games', render: (r) => fmtNum(r.games_played) }, { key: 'points', header: 'Points', render: (r) => fmtNum(r.verified_points) }, { key: 'ach', header: 'Achievements', render: (r) => fmtNum(r.achievements) },
  ]
  return (
    <>
      <PageHeader title="Players" lead="Search the player directory by nickname or Player ID. E-mail addresses and real names are not shown here. Suspending a player pauses Play Zone only; their website account is never changed." />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search">{(p) => <Input {...p} type="search" placeholder="Nickname or Player ID" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />}</Field>
          <Field label="Status">{(p) => <Select {...p} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="">All players</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="hidden">Hidden from boards</option></Select>}</Field>
          <Field label="Sort by">{(p) => <Select {...p} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }}><option value="joined">Newest</option><option value="points">Verified points</option><option value="last_active">Last active</option><option value="games">Games played</option></Select>}</Field>
          <label className="flex min-h-10 items-center gap-2 self-end text-sm font-medium"><input type="checkbox" checked={flagged} onChange={(e) => { setFlagged(e.target.checked); setPage(1) }} />Only players with flagged scores (suspicious activity)</label>
        </div>
      </Card>
      <Card className="!p-0">
        {loading && !data && <div className="px-4"><Spinner /></div>}
        {error && !data && <div className="space-y-3 p-4"><Unavailable error={error} /><ErrorState error={error} onRetry={reload} /></div>}
        {data && <><DataTable columns={columns} rows={data.items} onRowClick={(r) => setOpen(r.id)} empty={<EmptyState title="No players match" />} /><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} /></>}
      </Card>
      {open && <Detail id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  )
}
