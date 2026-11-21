import { useState } from 'react'
import { Card, DataTable, EmptyState, ErrorState, Field, Input, PageHeader, Pagination, Select, Spinner, fmtDate, useDebounced, useFetch } from '../ui.jsx'
import { Unavailable, pz } from './shared.jsx'

export default function PzAudit() {
  const [f, setF] = useState({ action: '', admin: '', date_from: '', date_to: '' })
  const [page, setPage] = useState(1)
  const admin = useDebounced(f.admin, 350)
  const { data, error, loading, reload } = useFetch(() => pz('/audit-logs', { params: { action: f.action, admin, date_from: f.date_from, date_to: f.date_to, page, page_size: 25 } }), [f.action, admin, f.date_from, f.date_to, page])
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const columns = [
    { key: 'at', header: 'When', render: (r) => fmtDate(r.at) }, { key: 'admin', header: 'Administrator', render: (r) => r.admin },
    { key: 'action', header: 'Action', render: (r) => <code className="text-xs">{r.action.replace('playzone.', '')}</code> },
    { key: 'res', header: 'Target', render: (r) => (r.resource_type ? <span>{r.resource_type.replace('pz_', '')}{r.resource_id && <span className="block max-w-[10rem] truncate text-xs text-soft" title={r.resource_id}>{r.resource_id}</span>}</span> : '—') },
    { key: 'detail', header: 'Details', render: (r) => (r.detail ? <code className="block max-w-[26rem] whitespace-pre-wrap break-words text-xs text-soft">{Object.entries(r.detail).map(([k, v]) => `${k}: ${v}`).join('\n')}</code> : '—') },
  ]
  return (
    <>
      <PageHeader title="Play Zone audit logs" lead="Who changed what in the Play Zone, and when. Entries cannot be edited or deleted (the database refuses it), and passwords, tokens and secrets are never recorded." />
      <Card className="mb-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Action">{(p) => <Select {...p} value={f.action} onChange={set('action')}><option value="">All actions</option>{(data?.actions || []).map((a) => <option key={a} value={a}>{a.replace('playzone.', '')}</option>)}</Select>}</Field>
        <Field label="Administrator">{(p) => <Input {...p} type="search" placeholder="E-mail contains…" value={f.admin} onChange={set('admin')} />}</Field>
        <Field label="From">{(p) => <Input {...p} type="date" value={f.date_from} onChange={set('date_from')} />}</Field>
        <Field label="To">{(p) => <Input {...p} type="date" value={f.date_to} onChange={set('date_to')} />}</Field>
      </div></Card>
      <Card className="!p-0">
        {loading && !data && <div className="px-4"><Spinner /></div>}
        {error && !data && <div className="space-y-3 p-4"><Unavailable error={error} /><ErrorState error={error} onRetry={reload} /></div>}
        {data && <><DataTable columns={columns} rows={data.items} empty={<EmptyState title="No matching entries" />} /><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} /></>}
      </Card>
    </>
  )
}
