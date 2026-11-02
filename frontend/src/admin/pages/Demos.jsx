import { useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Badge, Card, DataTable, EmptyState, ErrorState, Field, Input, PageHeader, Pagination, Select, Spinner, fmtDate, fmtDay, label, useDebounced, useFetch, useToast } from '../ui.jsx'

const STATUSES = ['pending', 'contacted', 'confirmed', 'cancelled']
const SIZE = 20

export default function Demos() {
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [text, setText] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounced(text)
  const { data, error, loading, reload } = useFetch(async () => {
    const p = new URLSearchParams({ limit: SIZE, offset: (page - 1) * SIZE })
    if (status) p.set('status', status)
    if (q.trim()) p.set('q', q.trim())
    const rows = await api(`/api/admin/demo-requests?${p}`)
    return { rows, total: rows.total ?? rows.length }
  }, [status, q, page])

  const change = async (id, next) => {
    try { await api(`/api/admin/demo-requests/${id}`, { method: 'PATCH', body: { status: next } }); toast('Demo request updated'); reload() } catch (e) { toast(e.message, 'error') }
  }
  const columns = [
    { key: 'name', header: 'Name', render: (r) => <span>{r.name}<span className="block text-xs font-normal text-soft">{r.email}</span></span> },
    { key: 'company', header: 'Company', render: (r) => r.company || '—' },
    { key: 'date', header: 'Preferred date', render: (r) => (r.preferred_date ? fmtDay(r.preferred_date) : '—') },
    { key: 'branch', header: 'Branch', render: (r) => r.branch_city || '—' },
    { key: 'message', header: 'Message', render: (r) => <span className="block max-w-[16rem] truncate" title={r.message || ''}>{r.message || '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => (
      <span className="flex items-center gap-2"><Badge value={r.status} />
        <Select aria-label={`Change status for ${r.name}`} className="!h-8 !w-auto" value={r.status} onClick={(e) => e.stopPropagation()} onChange={(e) => change(r.id, e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></span>) },
    { key: 'created', header: 'Requested', render: (r) => fmtDate(r.created_at) },
  ]
  return (
    <>
      <PageHeader title="Demo requests" lead="Requests from signed-in visitors. A request stays “pending” until a person confirms a date with the visitor." />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3" role="search">
          <Field label="Search" className="sm:col-span-2">{(p) => <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-soft" aria-hidden="true" /><Input {...p} className="pl-9" placeholder="Name, email or company" value={text} onChange={(e) => { setText(e.target.value); setPage(1) }} /></div>}</Field>
          <Field label="Status">{(p) => <Select {...p} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>}</Field>
        </div>
      </Card>
      <Card className="!p-0">
        {error && !data && <div className="p-4"><ErrorState error={error} onRetry={reload} /></div>}
        {loading && !data && <div className="px-4"><Spinner /></div>}
        {data && (
          <div className={loading ? 'opacity-60' : ''}>
            <DataTable columns={columns} rows={data.rows} empty={<EmptyState title="No demo requests">They appear when a signed-in visitor submits the “Get a demo” form.</EmptyState>} />
            <Pagination page={page} pages={Math.max(1, Math.ceil(data.total / SIZE))} total={data.total} onPage={setPage} />
          </div>
        )}
      </Card>
    </>
  )
}
