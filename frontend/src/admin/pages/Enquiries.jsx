import { useCallback, useMemo, useState } from 'react'
import { Archive, ArchiveRestore, CalendarClock, Check, Download, FileText, Search, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Badge, Btn, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea, fmtDate, label, useDebounced, useFetch, useToast } from '../ui.jsx'

// The lead pipeline. "in_progress" is only shown for enquiries handled before the fuller stages existed.
const STAGES = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'converted', 'not_interested', 'closed']
const STAGE_LABEL = { proposal_sent: 'Proposal sent', not_interested: 'Not interested', in_progress: 'In progress (earlier)' }
const stage = (s) => STAGE_LABEL[s] || label(s)
const FOLLOWUP_KINDS = [['call', 'Call'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['meeting', 'Meeting'], ['other', 'Other']]

export async function downloadBlob(path, filename) {
  const { blob } = await api(path, { as: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const GROUPS = [
  ['Customer profile', ['designation', 'contact_method', 'whatsapp']],
  ['Company information', ['industry', 'company_size', 'business_type', 'location', 'website']],
  ['Project details', ['project_name', 'project_description', 'challenges', 'expected_solution', 'additional_requirements']],
  ['Budget & timeline', ['budget', 'timeline', 'start_date']],
  ['Meeting & source', ['meeting_type', 'meeting_time', 'referral']],
  ['Partnership enquiry', ['partnership_category', 'country', 'state', 'city', 'business_background', 'additional_message']],
]
const SERVICE_KEYS = ['service_mains', 'service_subs']
const ACTION_TEXT = { 'enquiry.update': 'Status or assignment changed', 'enquiry.note': 'Note added', 'enquiry.followup': 'Follow-up recorded', 'enquiry.followup_update': 'Follow-up updated', 'enquiry.followup_delete': 'Follow-up removed', 'enquiry.attachment_view': 'Document opened', 'enquiry.archive': 'Archived', 'enquiry.unarchive': 'Restored from archive' }

function useOptions() {
  const { data } = useFetch(() => api('/api/public/contact-options'), [])
  return useMemo(() => {
    const mains = data?.services || []
    const subs = Object.fromEntries(mains.flatMap((m) => m.subs.map((s) => [s.value, s.label])))
    const pick = (group) => Object.fromEntries((data?.[group] || []).map((o) => [o.value, o.label]))
    return { mains, mainLabel: Object.fromEntries(mains.map((m) => [m.value, m.label])), subLabel: subs, methods: pick('contact_methods'), businessTypes: pick('business_types'), meetings: pick('meeting_types') }
  }, [data])
}

function Section({ title, children }) {
  return <section className="rounded-lg border border-edge p-3"><h3 className="mb-2 text-sm font-semibold">{title}</h3>{children}</section>
}
function Rows({ rows }) {
  return <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-soft">{k}</dt><dd className="min-w-0 whitespace-pre-wrap break-words">{v}</dd></div>)}</dl>
}

function Detail({ id, onClose, onChanged }) {
  const toast = useToast()
  const opts = useOptions()
  const { data: e, error, loading, reload } = useFetch(() => api(`/api/admin/enquiries/${id}`), [id])
  const { data: assignees } = useFetch(() => api('/api/admin/enquiries/assignees'), [])
  const [note, setNote] = useState('')
  const [fu, setFu] = useState({ kind: 'call', summary: '', due_on: '' })
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState(false)

  const act = async (name, fn, ok) => {
    setBusy(name)
    try { await fn(); toast(ok); await reload(); onChanged() } catch (err) { toast(err.message, 'error') } finally { setBusy('') }
  }
  const patch = (body, ok) => act('patch', () => api(`/api/admin/enquiries/${id}`, { method: 'PATCH', body }), ok)
  const stages = e && !STAGES.includes(e.status) ? [e.status, ...STAGES] : STAGES
  const show = (k, v) => (k === 'contact_method' ? opts.methods[v] || v : k === 'business_type' ? opts.businessTypes[v] || v : k === 'meeting_type' ? opts.meetings[v] || v : v)
  const used = new Set([...GROUPS.flatMap(([, keys]) => keys), ...SERVICE_KEYS])
  const mains = e ? (e.extra.service_mains || '').split(',').filter(Boolean) : []
  const subs = e ? (e.extra.service_subs || '').split(',').filter(Boolean) : []
  const rest = e ? Object.entries(e.extra).filter(([k]) => !used.has(k)) : []

  return (
    <Modal open onClose={onClose} wide title={e ? `Lead: ${e.name}${e.company ? ` — ${e.company}` : ''}` : 'Enquiry'}
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
        <div className="grid gap-5 lg:grid-cols-5">
          {/* the lead's details */}
          <div className="space-y-4 lg:col-span-3">
            <Section title="Contact information">
              <Rows rows={[
                ['Name', e.name], ['Email', <a key="m" className="break-all text-lav hover:underline" href={`mailto:${e.email}`}>{e.email}</a>],
                ['Mobile', e.phone ? <a key="p" className="text-lav hover:underline" href={`tel:${e.phone}`}>{e.phone}</a> : '—'],
                ...(e.extra.whatsapp ? [['WhatsApp', e.extra.whatsapp]] : []), ['Company', e.company || '—'], ['Enquiry type', e.subject], ['Branch', e.branch || '—'], ['Received', fmtDate(e.created_at)], ['Last updated', fmtDate(e.updated_at)],
                ['Consent given', e.consented ? 'Yes' : 'No'], ['Source', e.source || '—'],
              ]} />
            </Section>
            {GROUPS.map(([title, keys]) => {
              const rows = keys.filter((k) => e.extra[k] && !(k === 'whatsapp')).map((k) => [label(k), show(k, e.extra[k])])
              return rows.length ? <Section key={title} title={title}><Rows rows={rows} /></Section> : null
            })}
            {(mains.length > 0 || subs.length > 0) && (
              <Section title="Service requirements">
                <ul className="space-y-1.5 text-sm">
                  {mains.map((m) => (
                    <li key={m}><span className="font-semibold">{opts.mainLabel[m] || m}</span>
                      {(opts.mains.find((x) => x.value === m)?.subs || []).filter((s) => subs.includes(s.value)).length > 0 && (
                        <ul className="ml-4 list-disc text-soft">{opts.mains.find((x) => x.value === m).subs.filter((s) => subs.includes(s.value)).map((s) => <li key={s.value}>{s.label}</li>)}</ul>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            <Section title="Message"><p className="whitespace-pre-wrap text-sm">{e.message}</p></Section>
            {e.attachments.length > 0 && (
              <Section title="Uploaded documents">
                <ul className="space-y-1.5 text-sm">{e.attachments.map((a) => (
                  <li key={a.id}><button type="button" className="inline-flex min-h-9 items-center gap-2 text-lav hover:underline" onClick={() => downloadBlob(`/api/admin/enquiries/${id}/attachments/${a.id}`, a.filename).then(() => reload()).catch((err) => toast(err.message, 'error'))}>
                    <FileText className="size-4" aria-hidden="true" />{a.filename} <span className="text-soft">({Math.max(1, Math.round(a.size / 1024))} KB)</span></button></li>
                ))}</ul>
              </Section>
            )}
            {rest.length > 0 && <Section title="Other details"><Rows rows={rest.map(([k, v]) => [label(k), v])} /></Section>}
          </div>

          {/* the pipeline */}
          <div className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">{(p) => <Select {...p} value={e.status} disabled={busy === 'patch'} onChange={(ev) => patch({ status: ev.target.value }, 'Status updated')}>{stages.map((s) => <option key={s} value={s}>{stage(s)}</option>)}</Select>}</Field>
              <Field label="Assigned to">{(p) => (
                <Select {...p} value={e.assigned_to || ''} disabled={busy === 'patch'} onChange={(ev) => patch({ assigned_to: ev.target.value || null }, 'Assignment updated')}>
                  <option value="">Unassigned</option>{(assignees || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>)}</Field>
            </div>
            {e.archived && <p className="rounded-lg bg-glass-strong px-3 py-2 text-sm text-soft">This enquiry is archived.</p>}

            <Section title="Follow-ups">
              {e.followups.length === 0 ? <p className="text-sm text-soft">No follow-ups yet.</p> : (
                <ul className="max-h-56 space-y-2 overflow-y-auto">{e.followups.map((f) => (
                  <li key={f.id} className="rounded-lg border border-edge bg-glass p-2.5 text-sm">
                    <p className="flex flex-wrap items-center gap-2"><span className="font-semibold">{label(f.kind)}</span>{f.due_on && <span className="inline-flex items-center gap-1 text-soft"><CalendarClock className="size-3.5" aria-hidden="true" />{f.due_on}</span>}{f.done && <Badge value="success" text="Done" />}</p>
                    <p className="mt-1 whitespace-pre-wrap">{f.summary}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-soft">{f.author} · {fmtDate(f.created_at)}
                      <button type="button" className="inline-flex min-h-8 items-center gap-1 text-lav hover:underline" onClick={() => act('fu', () => api(`/api/admin/enquiries/${id}/followups/${f.id}`, { method: 'PATCH', body: { done: !f.done } }), f.done ? 'Marked open' : 'Marked done')}><Check className="size-3.5" aria-hidden="true" />{f.done ? 'Reopen' : 'Mark done'}</button>
                      <button type="button" className="inline-flex min-h-8 items-center gap-1 text-error hover:underline" onClick={() => act('fu', () => api(`/api/admin/enquiries/${id}/followups/${f.id}`, { method: 'DELETE' }), 'Follow-up removed')}>Remove</button></p>
                  </li>))}</ul>
              )}
              <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(ev) => { ev.preventDefault(); if (fu.summary.trim()) act('fu', async () => { await api(`/api/admin/enquiries/${id}/followups`, { method: 'POST', body: { kind: fu.kind, summary: fu.summary.trim(), due_on: fu.due_on || null } }); setFu({ kind: 'call', summary: '', due_on: '' }) }, 'Follow-up recorded') }}>
                <Field label="Type">{(p) => <Select {...p} value={fu.kind} onChange={(ev) => setFu({ ...fu, kind: ev.target.value })}>{FOLLOWUP_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
                <Field label="Follow-up date">{(p) => <Input {...p} type="date" value={fu.due_on} onChange={(ev) => setFu({ ...fu, due_on: ev.target.value })} />}</Field>
                <Field label="What happened or is planned" className="sm:col-span-2">{(p) => <Textarea {...p} maxLength={1000} value={fu.summary} onChange={(ev) => setFu({ ...fu, summary: ev.target.value })} />}</Field>
                <div className="sm:col-span-2"><Btn type="submit" loading={busy === 'fu'} disabled={!fu.summary.trim()}>Record follow-up</Btn></div>
              </form>
            </Section>

            <Section title="Internal notes">
              <p className="mb-2 text-xs text-soft">Never shown to the customer.</p>
              {e.notes.length === 0 ? <p className="text-sm text-soft">No notes yet.</p> : (
                <ul className="max-h-44 space-y-2 overflow-y-auto">{e.notes.map((n) => <li key={n.id} className="rounded-lg border border-edge bg-glass p-2.5 text-sm"><p className="whitespace-pre-wrap">{n.body}</p><p className="mt-1 text-xs text-soft">{n.author} · {fmtDate(n.created_at)}</p></li>)}</ul>
              )}
              <form className="mt-3 space-y-2" onSubmit={(ev) => { ev.preventDefault(); if (note.trim()) act('note', async () => { await api(`/api/admin/enquiries/${id}/notes`, { method: 'POST', body: { body: note.trim() } }); setNote('') }, 'Note added') }}>
                <Field label="Add a note">{(p) => <Textarea {...p} maxLength={2000} value={note} onChange={(ev) => setNote(ev.target.value)} />}</Field>
                <Btn type="submit" loading={busy === 'note'} disabled={!note.trim()}>Add note</Btn>
              </form>
            </Section>

            <Section title="Enquiry history">
              {e.history.length === 0 ? <p className="text-sm text-soft">No activity yet.</p> : (
                <ul className="max-h-44 space-y-1.5 overflow-y-auto text-sm">{e.history.map((h, i) => (
                  <li key={i}><span className="font-semibold">{ACTION_TEXT[h.action] || h.action}</span>{h.detail?.status ? ` — ${h.detail.status}` : ''}<span className="block text-xs text-soft">{h.by} · {fmtDate(h.created_at)}</span></li>))}</ul>
              )}
            </Section>
          </div>
        </div>
      )}
      <ConfirmDialog open={confirm} title="Delete this enquiry?" busy={busy === 'delete'} onClose={() => setConfirm(false)}
        onConfirm={async () => { setBusy('delete'); try { await api(`/api/admin/enquiries/${id}`, { method: 'DELETE' }); toast('Enquiry deleted'); onChanged(); onClose() } catch (err) { toast(err.message, 'error'); setBusy(''); setConfirm(false) } }}>
        This permanently removes the enquiry with its notes, follow-ups and uploaded documents. It cannot be undone (the deletion is recorded in the audit log). Consider archiving instead.
      </ConfirmDialog>
    </Modal>
  )
}

export default function Enquiries() {
  const toast = useToast()
  const opts = useOptions()
  const [f, setF] = useState({ q: '', status: '', type: '', service: '', industry: '', from: '', to: '', archived: 'no' })
  const [sort, setSort] = useState({ key: 'created_at', order: 'desc' })
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const { data: industries } = useFetch(() => api('/api/public/contact-options').then((o) => o.industries), [])
  const q = useDebounced(f.q)
  const qs = useCallback((extra = '') => {
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    ;['status', 'type', 'service', 'industry', 'from', 'to'].forEach((k) => { if (f[k]) p.set(k, f[k]) })
    p.set('archived', f.archived)
    return `${p}${extra}`
  }, [q, f.status, f.type, f.service, f.industry, f.from, f.to, f.archived])
  const { data, error, loading, reload } = useFetch(() => api(`/api/admin/enquiries?${qs(`&sort=${sort.key}&order=${sort.order}&page=${page}&page_size=20`)}`), [qs, sort.key, sort.order, page])
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const onSort = (key) => { setSort((s) => (s.key === key ? { key, order: s.order === 'asc' ? 'desc' : 'asc' } : { key, order: key === 'name' ? 'asc' : 'desc' })); setPage(1) }

  const exportCsv = async () => {
    setExporting(true)
    try { await downloadBlob(`/api/admin/enquiries/export.csv?${qs(`&sort=${sort.key}&order=${sort.order}`)}`, `enquiries-${new Date().toISOString().slice(0, 10)}.csv`); toast('Export downloaded (current filters)') } catch (err) { toast(err.message, 'error') } finally { setExporting(false) }
  }

  const columns = [
    { key: 'name', header: 'Name', sort: 'name', render: (r) => <span className="block">{r.name}{r.company && <span className="block text-xs text-soft">{r.company}</span>}</span> },
    { key: 'contact', header: 'Contact', render: (r) => <span className="block max-w-[15rem] truncate">{r.email}<span className="block text-xs text-soft">{r.phone || ''}</span></span> },
    { key: 'subject', header: 'Type', render: (r) => r.subject },
    { key: 'status', header: 'Status', sort: 'status', render: (r) => <span className="flex flex-wrap gap-1"><Badge value={r.status} text={stage(r.status)} />{r.archived && <Badge value="closed" text="Archived" />}</span> },
    { key: 'assigned', header: 'Assigned', render: (r) => r.assigned_name || <span className="text-soft">—</span> },
    { key: 'created_at', header: 'Received', sort: 'created_at', render: (r) => fmtDate(r.created_at) },
  ]

  return (
    <>
      <PageHeader title="Customer enquiries & leads" lead="Messages and quote requests sent through the website. Open one to see the full lead profile, assign it, move it through the pipeline and record follow-ups."
        actions={<Btn loading={exporting} onClick={exportCsv}><Download className="size-4" aria-hidden="true" /> Export CSV</Btn>} />
      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Filter enquiries" onSubmit={(e) => e.preventDefault()}>
          <Field label="Search" className="lg:col-span-2">{(p) => <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-soft" aria-hidden="true" /><Input {...p} className="pl-9" placeholder="Name, company, email, phone, service or project" value={f.q} onChange={set('q')} /></div>}</Field>
          <Field label="Status">{(p) => <Select {...p} value={f.status} onChange={set('status')}><option value="">All</option>{[...STAGES.slice(0, 1), 'in_progress', ...STAGES.slice(1)].map((s) => <option key={s} value={s}>{stage(s)}</option>)}</Select>}</Field>
          <Field label="Service">{(p) => (
            <Select {...p} value={f.service} onChange={set('service')}><option value="">All services</option>
              {opts.mains.map((m) => <optgroup key={m.value} label={m.label}><option value={m.value}>{m.label} (any)</option>{m.subs.map((s) => <option key={`${m.value}-${s.value}`} value={s.value}>{s.label}</option>)}</optgroup>)}
            </Select>)}</Field>
          <Field label="Industry">{(p) => <Select {...p} value={f.industry} onChange={set('industry')}><option value="">All industries</option>{(industries || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>}</Field>
          <Field label="Type">{(p) => <Select {...p} value={f.type} onChange={set('type')}><option value="">All types</option><option value="quote">Quote request</option><option value="project">Software project</option><option value="career">Careers</option><option value="partner">All partnership enquiries</option><option value="partner-franchise">Partnership: Franchise</option><option value="partner-business">Partnership: Business &amp; sales partner</option><option value="partner-authorised">Partnership: Authorised partner</option><option value="partner-technology">Partnership: Technology</option><option value="partner-reseller">Partnership: Reseller / distribution</option><option value="general">Something else</option></Select>}</Field>
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
              empty={<EmptyState title="No enquiries match">{f.q || f.status || f.service || f.industry || f.from || f.to ? 'Try clearing the filters.' : 'New enquiries will appear here.'}</EmptyState>} />
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </div>
        )}
      </Card>
      {openId && <Detail id={openId} onClose={() => setOpenId(null)} onChanged={reload} />}
    </>
  )
}
