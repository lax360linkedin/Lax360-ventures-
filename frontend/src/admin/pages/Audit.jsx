import { useState } from 'react'
import { api } from '../../services/apiClient.js'
import { Badge, Card, DataTable, EmptyState, ErrorState, Field, Input, PageHeader, Pagination, Select, Spinner, fmtDate, useFetch } from '../ui.jsx'

export default function Audit() {
  const [f, setF] = useState({ action: '', status: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const { data, error, loading, reload } = useFetch(() => {
    const p = new URLSearchParams({ page, page_size: 25 })
    Object.entries(f).forEach(([k, v]) => v && p.set(k, v))
    return api(`/api/admin/audit-logs?${p}`)
  }, [f.action, f.status, f.from, f.to, page])
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const columns = [
    { key: 'when', header: 'When', render: (r) => fmtDate(r.created_at) },
    { key: 'admin', header: 'Administrator', render: (r) => r.admin },
    { key: 'action', header: 'Action', render: (r) => <code className="text-xs">{r.action}</code> },
    { key: 'res', header: 'Resource', render: (r) => (r.resource_type ? <span>{r.resource_type}{r.resource_id && <span className="block max-w-[10rem] truncate text-xs text-soft" title={r.resource_id}>{r.resource_id}</span>}</span> : '—') },
    { key: 'status', header: 'Result', render: (r) => <Badge value={r.status} /> },
    { key: 'detail', header: 'Details', render: (r) => (r.detail ? <code className="block max-w-[18rem] truncate text-xs text-soft" title={JSON.stringify(r.detail)}>{JSON.stringify(r.detail)}</code> : '—') },
  ]
  return (
    <>
      <PageHeader title="Audit log" lead="Who did what, and when. Entries cannot be edited or deleted (the database refuses it), and passwords, keys and customer message text are never recorded." />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Action">{(p) => <Select {...p} value={f.action} onChange={set('action')}><option value="">All actions</option>{(data?.actions || []).map((a) => <option key={a} value={a}>{a}</option>)}</Select>}</Field>
          <Field label="Result">{(p) => <Select {...p} value={f.status} onChange={set('status')}><option value="">All</option><option value="success">Success</option><option value="failure">Failure</option></Select>}</Field>
          <Field label="From">{(p) => <Input {...p} type="date" value={f.from} onChange={set('from')} />}</Field>
          <Field label="To">{(p) => <Input {...p} type="date" value={f.to} onChange={set('to')} />}</Field>
        </div>
      </Card>
      <Card className="!p-0">
        {loading && !data && <div className="px-4"><Spinner /></div>}
        {error && !data && <div className="p-4"><ErrorState error={error} onRetry={reload} /></div>}
        {data && <><DataTable columns={columns} rows={data.items} empty={<EmptyState title="No matching entries" />} /><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} /></>}
      </Card>
    </>
  )
}
