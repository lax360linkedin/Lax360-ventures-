import { useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import SettingsForm from '../SettingsForm.jsx'
import { Badge, Btn, Card, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, cx, fmtDate, label, useDebounced, useFetch } from '../ui.jsx'

function Settings() {
  const { data, error, loading, reload } = useFetch(() => api('/api/admin/chatbot/settings'), [])
  if (loading && !data) return <Spinner />
  if (error && !data) return <ErrorState error={error} onRetry={reload} />
  const p = data.provider
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-display text-lg font-semibold">AI provider</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-soft">Active provider</dt><dd className="font-semibold">{label(p.active)}</dd></div>
          <div><dt className="text-soft">Model</dt><dd className="break-all font-semibold">{p.model || '—'}</dd></div>
          <div><dt className="text-soft">Status</dt><dd><Badge value={p.configured ? 'not_tested' : 'configuration_missing'} text={p.configured ? 'Configured' : 'Configuration missing'} /></dd></div>
          <div><dt className="text-soft">OpenAI</dt><dd><Badge value={p.available.openai ? 'not_tested' : 'configuration_missing'} text={p.available.openai ? 'Configured (inactive)' : 'Not available'} /></dd></div>
        </dl>
        <p className="mt-3 text-xs text-soft">{p.note} “Configured” means a key and model are present; use System status → “Run test” (super admin) to check the live connection.</p>
      </Card>
      <SettingsForm endpoint="/api/admin/chatbot/settings" payload={data} onSaved={reload} />
    </div>
  )
}

function Conversation({ id, onClose }) {
  const { data, error, loading } = useFetch(() => api(`/api/admin/chatbot/conversations/${id}`), [id])
  return (
    <Modal open onClose={onClose} wide title="Conversation" footer={<Btn kind="primary" onClick={onClose}>Close</Btn>}>
      {loading && <Spinner />}
      {error && <ErrorState error={error} />}
      {data && (
        <>
          <p className="mb-3 text-xs text-soft">Started {fmtDate(data.created_at)} · stored until {fmtDate(data.expires_at)}. Opening a conversation is recorded in the audit log.</p>
          <ol className="space-y-2">
            {data.messages.map((m) => (
              <li key={m.id} className={cx('max-w-[85%] rounded-xl border p-3 text-sm', m.role === 'user' ? 'ml-auto border-primary/40 bg-primary/15' : 'border-edge bg-glass')}>
                <p className="mb-1 flex items-center gap-2 text-xs text-soft">{label(m.role)} · {fmtDate(m.created_at)} {m.status === 'failed' && <Badge value="failure" text="Failed" />}</p>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </Modal>
  )
}

function Conversations() {
  const [q, setQ] = useState('')
  const [failed, setFailed] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const term = useDebounced(q)
  const { data, error, loading, reload } = useFetch(() => {
    const p = new URLSearchParams({ page, page_size: 20 })
    if (term.trim()) p.set('q', term.trim())
    if (failed) p.set('status', failed)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    return api(`/api/admin/chatbot/conversations?${p}`)
  }, [term, failed, from, to, page])
  const reset = (fn) => (e) => { fn(e.target.value); setPage(1) }
  const columns = [
    { key: 'preview', header: 'First message', render: (r) => <span className="block max-w-xs truncate">{r.preview || '—'}</span> },
    { key: 'visitor', header: 'Visitor', render: (r) => r.visitor },
    { key: 'messages', header: 'Messages', render: (r) => r.messages },
    { key: 'failed', header: 'Failed', render: (r) => (r.failed ? <Badge value="failure" text={`${r.failed} failed`} /> : '—') },
    { key: 'last', header: 'Last active', render: (r) => fmtDate(r.last_active_at) },
  ]
  return (
    <>
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search">
          <Field label="Search message text">{(p) => <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-soft" aria-hidden="true" /><Input {...p} className="pl-9" value={q} onChange={reset(setQ)} /></div>}</Field>
          <Field label="Show">{(p) => <Select {...p} value={failed} onChange={reset(setFailed)}><option value="">All conversations</option><option value="failed">With failed requests</option></Select>}</Field>
          <Field label="From">{(p) => <Input {...p} type="date" value={from} onChange={reset(setFrom)} />}</Field>
          <Field label="To">{(p) => <Input {...p} type="date" value={to} onChange={reset(setTo)} />}</Field>
        </div>
        <p className="mt-3 text-xs text-soft">Conversations are kept only for the retention period set on the server (default 30 days), then deleted automatically.</p>
      </Card>
      <Card className="!p-0">
        {error && !data && <div className="p-4"><ErrorState error={error} onRetry={reload} /></div>}
        {loading && !data && <div className="px-4"><Spinner /></div>}
        {data && <><DataTable columns={columns} rows={data.items} onRowClick={(r) => setOpen(r.id)} empty={<EmptyState title="No conversations found">Visitor chats appear here once someone uses the assistant.</EmptyState>} /><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} /></>}
      </Card>
      {open && <Conversation id={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function Usage() {
  const [days, setDays] = useState(7)
  const { data, error, loading, reload } = useFetch(() => api(`/api/admin/chatbot/usage?days=${days}`), [days])
  return (
    <div className="space-y-4">
      <Field label="Period" className="max-w-[12rem]">{(p) => <Select {...p} value={days} onChange={(e) => setDays(Number(e.target.value))}>{[1, 7, 30, 90].map((d) => <option key={d} value={d}>Last {d} {d === 1 ? 'day' : 'days'}</option>)}</Select>}</Field>
      {loading && !data && <Spinner />}
      {error && !data && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><p className="text-sm text-soft">AI requests</p><p className="font-display text-3xl font-semibold">{data.requests}</p></Card>
            <Card><p className="text-sm text-soft">Successful</p><p className="font-display text-3xl font-semibold text-success">{data.ok}</p></Card>
            <Card><p className="text-sm text-soft">Errors</p><p className="font-display text-3xl font-semibold text-error">{data.errors}</p></Card>
          </div>
          <Card className="!p-0">
            <h2 className="px-4 pt-4 font-display text-lg font-semibold">Outcomes</h2>
            <DataTable rows={data.by_status} rowKey={(r) => r.status} columns={[
              { key: 'status', header: 'Outcome', render: (r) => <Badge value={r.status === 'ok' ? 'success' : 'failure'} text={label(r.status)} /> },
              { key: 'requests', header: 'Requests' }, { key: 'in', header: 'Input tokens', render: (r) => r.input_tokens }, { key: 'out', header: 'Output tokens', render: (r) => r.output_tokens }, { key: 'lat', header: 'Avg latency', render: (r) => `${r.avg_latency_ms} ms` }]}
              empty={<EmptyState title="No AI requests in this period" />} />
          </Card>
          <Card className="!p-0">
            <h2 className="px-4 pt-4 font-display text-lg font-semibold">Recent failed requests</h2>
            <p className="px-4 text-xs text-soft">Error codes only: no message text, keys or provider internals are stored here.</p>
            <DataTable rows={data.failures} columns={[{ key: 'when', header: 'When', render: (r) => fmtDate(r.created_at) }, { key: 'status', header: 'Error', render: (r) => <Badge value="failure" text={label(r.status)} /> }, { key: 'model', header: 'Model', render: (r) => r.model || '—' }, { key: 'lat', header: 'Latency', render: (r) => (r.latency_ms ? `${r.latency_ms} ms` : '—') }]}
              empty={<EmptyState title="No failures">Failed or blocked AI requests are listed here.</EmptyState>} />
          </Card>
        </>
      )}
    </div>
  )
}

const TABS = [['settings', 'Settings', Settings], ['conversations', 'Conversations', Conversations], ['usage', 'Usage & errors', Usage]]
export default function Chatbot() {
  const [tab, setTab] = useState('settings')
  const Panel = TABS.find((t) => t[0] === tab)[2]
  return (
    <>
      <PageHeader title="AI chatbot" lead="Turn the assistant on or off, edit its messages and business information, and review usage and failures." />
      <div role="tablist" aria-label="Chatbot sections" className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([k, name]) => <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('min-h-10 rounded-lg px-4 text-sm font-semibold', tab === k ? 'bg-primary text-white' : 'border border-edge bg-glass text-soft hover:text-fg')}>{name}</button>)}
      </div>
      <Panel />
    </>
  )
}
