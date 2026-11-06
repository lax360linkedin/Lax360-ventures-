import { useCallback, useState } from 'react'
import { Archive, ArchiveRestore, Download, Search, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Badge, Btn, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea, fmtDate, label, useDebounced, useFetch, useToast } from '../ui.jsx'

const STATUSES = ['new', 'in_progress', 'contacted', 'converted', 'closed']

export async function downloadBlob(path, filename) {
  const { blob } = await api(path, { as: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Detail({ id, onClose, onChanged }) {
  const toast = useToast()
  const { data: e, error, loading, reload } = useFetch(() => api(`/api/admin/enquiries/${id}`), [id])
  const { data: assignees } = useFetch(() => api('/api/admin/enquiries/assignees'), [])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState(false)

  const act = async (name, fn, ok) => {
    setBusy(name)
    try { await fn(); toast(ok); await reload(); onChanged() } catch (err) { toast(err.message, 'error') } finally { setBusy('') }
  }
  const patch = (body, ok) => act('patch', () => api(`/api/admin/enquiries/${id}`, { method: 'PATCH', body }), ok)

  return (
    <Modal open onClose={onClose} wide title={e ? `Enquiry from ${e.name}` : 'Enquiry'}
      footer={e && (
        <>
          <Btn kind="danger" onClick={() => setConfirm(true)}><Trash2 className="size-4" aria-hidden="true" /> Delete</Btn>
          <Btn loading={busy === 'archive'} onClick={() => act('archive', () => api(`/api/admin/enquiries/${id}/archive?archived=${!e.archived}`, { method: 'POST' }), e.archived ? 'Restored from archive' : 'Archived')}>
            {e.archived ? <><ArchiveRestore className="size-4" aria-hidden="true" /> Restore</> : <><Archive className="size-4" aria-hidden="true" /> Archive</>}
          </Btn>
          <Btn kind="primary" onClick={onClose}>Done</Btn>
        </>
      )}>
      {loading && !e && <Spinner />}
      {error && !e && <ErrorState error={error} onRetry={reload} />}
      {e && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
              {[['Email', <a key="m" className="break-all text-lav hover:underline" href={`mailto:${e.email}`}>{e.email}</a>], ['Phone', e.phone ? <a key="p" className="text-lav hover:underline" href={`tel:${e.phone}`}>{e.phone}</a> : '—'],
                ['Company', e.company || '—'], ['Type', e.subject], ['Branch', e.branch || '—'], ['Received', fmtDate(e.created_at)], ['Last updated', fmtDate(e.updated_at)]].map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-soft">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {Object.keys(e.extra).length > 0 && <dl className="grid grid-cols-[7rem_1fr] gap-y-1 rounded-lg border border-edge p-3 text-sm">{Object.entries(e.extra).map(([k, v]) => <div key={k} className="contents"><dt className="text-soft">{label(k)}</dt><dd>{v}</dd></div>)}</dl>}
            <div><h3 className="mb-1 text-sm font-semibold">Message</h3><p className="whitespace-pre-wrap rounded-lg border border-edge bg-glass p-3 text-sm">{e.message}</p></div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">{(p) => <Select {...p} value={e.status} disabled={busy === 'patch'} onChange={(ev) => patch({ status: ev.target.value }, 'Status updated')}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>}</Field>
              <Field label="Assigned to">{(p) => (
                <Select {...p} value={e.assigned_to || ''} disabled={busy === 'patch'} onChange={(ev) => patch({ assigned_to: ev.target.value || null }, 'Assignment updated')}>
                  <option value="">Unassigned</option>{(assignees || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>)}</Field>
            </div>
            {e.archived && <p className="rounded-lg bg-glass-strong px-3 py-2 text-sm text-soft">This enquiry is archived.</p>}
            <div>
              <h3 className="mb-2 text-sm font-semibold">Internal notes <span className="font-normal text-soft">(never shown to the customer)</span></h3>
              {e.notes.length === 0 ? <p className="text-sm text-soft">No notes yet.</p> : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">{e.notes.map((n) => <li key={n.id} className="rounded-lg border border-edge bg-glass p-2.5 text-sm"><p className="whitespace-pre-wrap">{n.body}</p><p className="mt-1 text-xs text-soft">{n.author} · {fmtDate(n.created_at)}</p></li>)}</ul>
              )}
              <form className="mt-3 space-y-2" onSubmit={(ev) => { ev.preventDefault(); if (note.trim()) act('note', async () => { await api(`/api/admin/enquiries/${id}/notes`, { method: 'POST', body: { body: note.trim() } }); setNote('') }, 'Note added') }}>
                <Field label="Add a note">{(p) => <Textarea {...p} maxLength={2000} value={note} onChange={(ev) => setNote(ev.target.value)} />}</Field>
                <Btn type="submit" loading={busy === 'note'} disabled={!note.trim()}>Add note</Btn>
              </form>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={confirm} title="Delete this enquiry?" busy={busy === 'delete'} onClose={() => setConfirm(false)}
        onConfirm={async () => { setBusy('delete'); try { await api(`/api/admin/enquiries/${id}`, { method: 'DELETE' }); toast('Enquiry deleted'); onChanged(); onClose() } catch (err) { toast(err.message, 'error'); setBusy(''); setConfirm(false) } }}>
        This permanently removes the enquiry and its notes. It cannot be undone (the deletion is recorded in the audit log). Consider archiving instead.
      </ConfirmDialog>
    </Modal>
  )
}

export default function Enquiries() {
  const toast = useToast()
  const [f, setF] = useState({ q: '', status: '', type: '', from: '', to: '', archived: 'no' })
  const [sort, setSort] = useState({ key: 'created_at', order: 'desc' })
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const q = useDebounced(f.q)
  const qs = useCallback((extra = '') => {
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (f.status) p.set('status', f.status)
    if (f.type) p.set('type', f.type)
    if (f.from) p.set('from', f.from)
    if (f.to) p.set('to', f.to)
    p.set('archived', f.archived)
    return `${p}${extra}`
  }, [q, f.status, f.type, f.from, f.to, f.archived])
  const { data, error, loading, reload } = useFetch(() => api(`/api/admin/enquiries?${qs(`&sort=${sort.key}&order=${sort.order}&page=${page}&page_size=20`)}`), [qs, sort.key, sort.order, page])
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const onSort = (key) => { setSort((s) => (s.key === key ? { key, order: s.order === 'asc' ? 'desc' : 'asc' } : { key, order: key === 'name' ? 'asc' : 'desc' })); setPage(1) }

  const exportCsv = async () => {
    setExporting(true)
    try { await downloadBlob(`/api/admin/enquiries/export.csv?${qs(`&sort=${sort.key}&order=${sort.order}`)}`, `enquiries-${new Date().toISOString().slice(0, 10)}.csv`); toast('Export downloaded (current filters)') } catch (err) { toast(err.message, 'error') } finally { setExporting(false) }
  }

  const columns = [
    { key: 'name', header: 'Name', sort: 'name', render: (r) => r.name },
    { key: 'contact', header: 'Contact', render: (r) => <span className="block max-w-[15rem] truncate">{r.email}<span className="block text-xs text-soft">{r.phone || ''}</span></span> },
    { key: 'subject', header: 'Type', render: (r) => r.subject },
    { key: 'status', header: 'Status', sort: 'status', render: (r) => <span className="flex flex-wrap gap-1"><Badge value={r.status} />{r.archived && <Badge value="closed" text="Archived" />}</span> },
    { key: 'assigned', header: 'Assigned', render: (r) => r.assigned_name || <span className="text-soft">—</span> },
    { key: 'created_at', header: 'Received', sort: 'created_at', render: (r) => fmtDate(r.created_at) },
  ]

  return (
    <>
      <PageHeader title="Customer enquiries" lead="Messages sent through the website's contact form."
        actions={<Btn loading={exporting} onClick={exportCsv}><Download className="size-4" aria-hidden="true" /> Export CSV</Btn>} />
      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label="Filter enquiries" onSubmit={(e) => e.preventDefault()}>
          <Field label="Search" className="lg:col-span-2">{(p) => <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-soft" aria-hidden="true" /><Input {...p} className="pl-9" placeholder="Name, email, phone or type" value={f.q} onChange={set('q')} /></div>}</Field>
          <Field label="Status">{(p) => <Select {...p} value={f.status} onChange={set('status')}><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>}</Field>
          <Field label="Type">{(p) => <Select {...p} value={f.type} onChange={set('type')}><option value="">All types</option><option value="partner">All partnership enquiries</option><option value="partner-technology">Partnership: Technology partner</option><option value="partner-reseller">Partnership: Software reseller</option><option value="partner-education">Partnership: Education partner</option><option value="partner-associate">Partnership: Business associate</option><option value="partner-implementation">Partnership: Implementation partner</option><option value="partner-other">Partnership: Other</option><option value="project">Software project</option><option value="general">Something else</option></Select>}</Field>
          <Field label="From">{(p) => <Input {...p} type="date" value={f.from} max={f.to || undefined} onChange={set('from')} />}</Field>
          <Field label="To">{(p) => <Input {...p} type="date" value={f.to} min={f.from || undefined} onChange={set('to')} />}</Field>
          <Field label="Archive">{(p) => <Select {...p} value={f.archived} onChange={set('archived')}><option value="no">Active</option><option value="only">Archived only</option><option value="all">All</option></Select>}</Field>
        </form>
      </Card>
      <Card className="!p-0">
        {error && !data && <div className="p-4"><ErrorState error={error} onRetry={reload} /></div>}
        {loading && !data && <div className="px-4"><Spinner /></div>}
        {data && (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <DataTable columns={columns} rows={data.items} sort={sort} onSort={onSort} onRowClick={(r) => setOpenId(r.id)}
              empty={<EmptyState title="No enquiries match">{f.q || f.status || f.from || f.to ? 'Try clearing the filters.' : 'New contact-form messages will appear here.'}</EmptyState>} />
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </div>
        )}
      </Card>
      {openId && <Detail id={openId} onClose={() => setOpenId(null)} onChanged={reload} />}
    </>
  )
}
