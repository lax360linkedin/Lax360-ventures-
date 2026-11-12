import { useState } from 'react'
import { Download, KeyRound, ShieldPlus, Trash2, UserCheck, UserX } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { useAdmin } from '../AdminApp.jsx'
import { downloadBlob } from './Enquiries.jsx'
import { CATEGORIES, CATEGORY_LABEL, PURPOSES, PURPOSE_LABEL } from '../../data/registration.js'
import { Badge, Btn, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, fmtDate, useDebounced, useFetch, useToast } from '../ui.jsx'

const STATUS = { new: 'Received', in_progress: 'In progress', contacted: 'Contacted', converted: 'Completed', closed: 'Closed', pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled' }
const CAT_COLOR = { student: 'bg-primary', professional: 'bg-accent', other: 'bg-lav', not_provided: 'bg-soft/50' }

function StatCard({ label, value, sub, tone }) {
  return (
    <Card className="!p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-soft">{label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold ${tone || ''}`}>{value ?? '…'}</p>
      {sub && <p className="mt-0.5 text-xs text-soft">{sub}</p>}
    </Card>
  )
}

/** Horizontal bars: a label, a bar sized against the largest value, and the count. Pure CSS: no chart library. */
function Bars({ rows, color = 'bg-primary', empty = 'No data yet.' }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  if (!rows.length) return <p className="text-sm text-soft">{empty}</p>
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="text-sm">
          <div className="flex items-baseline justify-between gap-3"><span className="truncate">{r.label}</span><span className="font-semibold tabular-nums">{r.count}</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-glass-strong" role="img" aria-label={`${r.label}: ${r.count}`}><div className={`h-full rounded-full ${r.color || color}`} style={{ width: `${Math.max(3, (r.count / max) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

/** Registrations per day as columns (SVG). The newest day is on the right; the labels show the first, middle and last dates. */
function Trend({ points }) {
  const max = Math.max(1, ...points.map((p) => p.count))
  const w = 600
  const h = 140
  const bar = w / points.length
  const total = points.reduce((s, p) => s + p.count, 0)
  const short = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 22}`} className="w-full" role="img" aria-label={`Registrations per day: ${total} in the last ${points.length} days`}>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1="0" x2={w} y1={h - h * f} y2={h - h * f} stroke="currentColor" strokeOpacity="0.1" />)}
        {points.map((p, i) => {
          const bh = (p.count / max) * (h - 6)
          return <rect key={p.date} x={i * bar + 1.5} y={h - bh} width={Math.max(2, bar - 3)} height={bh} rx="2" className="fill-[rgb(var(--primary))]" opacity={p.count ? 1 : 0.15}><title>{`${short(p.date)}: ${p.count}`}</title></rect>
        })}
        {[0, Math.floor(points.length / 2), points.length - 1].map((i) => <text key={i} x={Math.min(w - 20, Math.max(20, i * bar + bar / 2))} y={h + 16} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6">{short(points[i].date)}</text>)}
        <text x="2" y="10" fontSize="11" fill="currentColor" opacity="0.6">{max}</text>
      </svg>
      <figcaption className="mt-1 text-xs text-soft">{total} registration{total === 1 ? '' : 's'} in the last {points.length} days</figcaption>
    </figure>
  )
}

function Stats({ stats }) {
  if (stats.loading && !stats.data) return <Spinner />
  if (!stats.data) return null
  const s = stats.data
  const cats = [...CATEGORIES.map((c) => ({ key: c.value, label: CATEGORY_LABEL[c.value], count: s.categories[c.value] || 0, color: CAT_COLOR[c.value] })), ...(s.categories.not_provided ? [{ key: 'np', label: 'Not provided (older accounts)', count: s.categories.not_provided, color: CAT_COLOR.not_provided }] : [])]
  return (
    <section aria-label="Registration statistics" className="mb-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total registered users" value={s.total} sub={`${s.active} active`} />
        <StatCard label="Students" value={s.categories.student} />
        <StatCard label="Working professionals" value={s.categories.professional} />
        <StatCard label="Other users" value={s.categories.other} />
        <StatCard label="New registrations" value={s.new.week} sub={`${s.new.today} today · ${s.new.month} in 30 days`} tone="text-lav" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><h2 className="mb-3 font-display text-base font-semibold">Registration trend</h2><Trend points={s.trend} /></Card>
        <Card><h2 className="mb-3 font-display text-base font-semibold">Who is registering</h2><Bars rows={cats} /></Card>
      </div>
      <Card><h2 className="mb-3 font-display text-base font-semibold">Most common reasons for visiting</h2>
        <Bars rows={s.purposes.map((p) => ({ key: p.code, label: PURPOSE_LABEL[p.code] || p.label, count: p.count }))} color="bg-accent" empty="Nobody has chosen a reason yet." />
      </Card>
    </section>
  )
}

/**
 * Registered users: the website's customers. Statistics and charts, search (name, email, mobile), filters (category, registration date, company, institution, purpose), each person's full
 * registration details and history, CSV export, activate / deactivate, and deletion (deactivate first; super admin only). Granting administrator access and setting a password are
 * super-admin-only too, all checked on the server. Administrators are not listed here: they live under Administrators.
 */
export default function Customers() {
  const toast = useToast()
  const { me } = useAdmin()
  const isSuper = me.user.role === 'super_admin'
  const [f, setF] = useState({ q: '', status: 'all', category: '', company: '', institution: '', purpose: '', from: '', to: '', sort: 'newest' })
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const [exporting, setExporting] = useState(false)
  const dq = useDebounced(f.q, 300)
  const dc = useDebounced(f.company, 300)
  const di = useDebounced(f.institution, 300)
  const qs = (extra = '') => `q=${encodeURIComponent(dq)}&status=${f.status}&category=${f.category}&company=${encodeURIComponent(dc)}&institution=${encodeURIComponent(di)}&purpose=${f.purpose}${f.from ? `&registered_from=${f.from}` : ''}${f.to ? `&registered_to=${f.to}` : ''}${extra}`
  const list = useFetch(() => api(`/api/admin/customers?${qs(`&sort=${f.sort}&page=${page}&page_size=20`)}`), [dq, dc, di, f.status, f.category, f.purpose, f.from, f.to, f.sort, page])
  const stats = useFetch(() => api('/api/admin/customers/stats?days=30'), [])
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const filtered = Boolean(f.q || f.category || f.company || f.institution || f.purpose || f.from || f.to || f.status !== 'all')
  const refresh = () => { list.reload(); stats.reload() }
  const exportCsv = async () => {
    setExporting(true)
    try { await downloadBlob(`/api/admin/customers/export?${qs()}`, `registered-users-${new Date().toISOString().slice(0, 10)}.csv`); toast('Export downloaded: it contains personal data, so keep it safe') } catch (e) { toast(e.message, 'error') } finally { setExporting(false) }
  }

  const columns = [
    { key: 'name', header: 'Name', render: (u) => <span className="font-semibold">{u.full_name}<span className="block break-all text-xs font-normal text-soft">{u.email}</span></span> },
    { key: 'mobile', header: 'Mobile', render: (u) => u.mobile || <span className="text-soft">—</span> },
    { key: 'cat', header: 'Category', render: (u) => (u.category ? <span>{CATEGORY_LABEL[u.category]}<span className="block text-xs text-soft">{u.category === 'student' ? u.institution : u.category === 'professional' ? u.company : ''}</span></span> : <span className="text-soft">Not provided</span>) },
    { key: 'status', header: 'Account', render: (u) => <Badge value={u.is_active ? 'active' : 'inactive'} text={u.is_active ? 'Active' : 'Deactivated'} /> },
    { key: 'reqs', header: 'Requests', render: (u) => `${u.enquiries} / ${u.demo_requests}` },
    { key: 'joined', header: 'Registered', render: (u) => fmtDate(u.created_at) },
  ]

  return (
    <>
      <PageHeader title="Registered users" lead="People who created an account on the public website: who they are, why they visit, and what they asked for. They can use the website's customer features and nothing in this admin panel."
        actions={<Btn onClick={exportCsv} loading={exporting}><Download className="size-4" aria-hidden="true" /> Export {filtered ? 'filtered ' : ''}records (CSV)</Btn>} />
      <Stats stats={stats} />

      <Card className="mb-4 !p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Find registered users">
          <label className="text-sm font-semibold sm:col-span-2">Search<Input className="mt-1" placeholder="Name, email or mobile number" value={f.q} onChange={set('q')} /></label>
          <label className="text-sm font-semibold">Category<Select className="mt-1" value={f.category} onChange={set('category')}><option value="">All</option>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{CATEGORY_LABEL[c.value]}</option>)}<option value="none">Not provided</option></Select></label>
          <label className="text-sm font-semibold">Reason for visiting<Select className="mt-1" value={f.purpose} onChange={set('purpose')}><option value="">All</option>{PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></label>
          <label className="text-sm font-semibold">Company<Input className="mt-1" placeholder="Part of a company name" value={f.company} onChange={set('company')} /></label>
          <label className="text-sm font-semibold">Institution<Input className="mt-1" placeholder="Part of a college name" value={f.institution} onChange={set('institution')} /></label>
          <label className="text-sm font-semibold">Registered from<Input className="mt-1" type="date" value={f.from} onChange={set('from')} /></label>
          <label className="text-sm font-semibold">Registered to<Input className="mt-1" type="date" value={f.to} onChange={set('to')} /></label>
          <label className="text-sm font-semibold">Account<Select className="mt-1" value={f.status} onChange={set('status')}><option value="all">All</option><option value="active">Active</option><option value="inactive">Deactivated</option></Select></label>
          <label className="text-sm font-semibold">Sort<Select className="mt-1" value={f.sort} onChange={set('sort')}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A to Z</option><option value="last_login">Last login</option></Select></label>
          {filtered && <div className="flex items-end"><Btn kind="ghost" onClick={() => { setF({ q: '', status: 'all', category: '', company: '', institution: '', purpose: '', from: '', to: '', sort: 'newest' }); setPage(1) }}>Clear filters</Btn></div>}
        </div>
      </Card>

      {list.loading && !list.data ? <Spinner /> : list.error && !list.data ? <ErrorState error={list.error} onRetry={list.reload} /> : (
        <>
          <p className="mb-2 text-sm text-soft" role="status">{list.data?.total ?? 0} {filtered ? 'matching ' : ''}user{list.data?.total === 1 ? '' : 's'}. Requests column: enquiries / demo requests.</p>
          <DataTable columns={columns} rows={list.data?.items || []} onRowClick={(u) => setOpen(u.id)} empty={<EmptyState title="No registered users found">{filtered ? 'Try a different search or filter.' : 'Nobody has created an account yet.'}</EmptyState>} />
          {list.data && list.data.pages > 1 && <div className="mt-4"><Pagination page={page} pages={list.data.pages} total={list.data.total} onPage={setPage} /></div>}
        </>
      )}
      {open && <CustomerDialog id={open} isSuper={isSuper} modules={me.modules} onClose={() => setOpen(null)} onChanged={refresh} toast={toast} />}
    </>
  )
}

const row = (label, value) => (value || value === 0) ? <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-soft">{label}</dt><dd className="break-words">{value}</dd></div> : null

function CustomerDialog({ id, isSuper, modules, onClose, onChanged, toast }) {
  const q = useFetch(() => api(`/api/admin/customers/${id}`), [id])
  const [confirm, setConfirm] = useState(null) // 'toggle' | 'admin' | 'password' | 'delete'
  const [perms, setPerms] = useState([])
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const u = q.data
  const p = u?.profile
  const run = async (fn, ok, after) => {
    setBusy(true)
    try { await fn(); toast(ok); setConfirm(null); onChanged(); if (after) after(); else q.reload() } catch (e) { toast(e.fields ? Object.values(e.fields).join(' ') : e.message, 'error') } finally { setBusy(false) }
  }
  const grantable = Object.entries(modules || {}).filter(([k]) => !['users', 'audit', 'system'].includes(k))

  return (
    <Modal open onClose={onClose} wide title={u ? u.full_name : 'Registered user'}
      footer={u && <>
        <Btn onClick={onClose}>Close</Btn>
        {isSuper && !u.is_active && <Btn kind="danger" onClick={() => setConfirm('delete')}><Trash2 className="size-4" aria-hidden="true" /> Delete account…</Btn>}
        <Btn kind={u.is_active ? 'danger' : 'primary'} onClick={() => setConfirm('toggle')}>{u.is_active ? <><UserX className="size-4" aria-hidden="true" /> Deactivate account</> : <><UserCheck className="size-4" aria-hidden="true" /> Activate account</>}</Btn>
      </>}>
      {q.loading && !u ? <Spinner /> : q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : u && (
        <div className="space-y-5">
          <section><h3 className="mb-2 font-semibold">Account</h3>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {row('Email', u.email)}{row('Mobile', p?.mobile)}
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-soft">Status</dt><dd><Badge value={u.is_active ? 'active' : 'inactive'} text={u.is_active ? 'Active' : 'Deactivated'} /></dd></div>
              {row('Registered', fmtDate(u.created_at))}{row('Last login', fmtDate(u.last_login_at))}
            </dl></section>
          <section><h3 className="mb-2 font-semibold">Registration details</h3>
            {p ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {row('Category', CATEGORY_LABEL[p.category])}
                {p.category === 'student' && <>{row('College / institution', p.institution)}{row('Course / degree', p.course)}{row('Department / specialization', p.department)}{row('Year of study', p.study_year)}</>}
                {p.category === 'professional' && <>{row('Company', p.company)}{row('Job role', p.job_role)}{row('Industry / sector', p.industry)}{row('Years of experience', p.experience_years)}</>}
                {p.category === 'other' && row('About them', p.other_details)}
                <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-soft">Reasons for visiting</dt><dd>{p.purposes.length ? <ul className="mt-1 flex flex-wrap gap-1.5">{p.purposes.map((c) => <li key={c} className="rounded-full border border-edge-strong px-2.5 py-0.5 text-xs">{PURPOSE_LABEL[c] || c}</li>)}</ul> : '—'}</dd></div>
                {row('Additional note', p.purpose_note)}
              </dl>
            ) : <p className="text-sm text-soft">This account was created before registration details were collected, so there is nothing to show. The person can add them from their account page.</p>}
          </section>
          <section><h3 className="mb-2 font-semibold">Enquiries ({u.enquiry_history.length})</h3>
            {u.enquiry_history.length ? <ul className="space-y-1.5 text-sm">{u.enquiry_history.map((e) => <li key={e.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-edge px-3 py-2"><span>{e.subject} <span className="text-soft">· {fmtDate(e.created_at)}</span></span><Badge value={e.status} text={STATUS[e.status] || e.status} /></li>)}</ul> : <p className="text-sm text-soft">None sent while signed in.</p>}</section>
          <section><h3 className="mb-2 font-semibold">Demo requests ({u.demo_history.length})</h3>
            {u.demo_history.length ? <ul className="space-y-1.5 text-sm">{u.demo_history.map((d) => <li key={d.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-edge px-3 py-2"><span>{d.interest || 'Product demo'} <span className="text-soft">· {fmtDate(d.created_at)}</span></span><Badge value={d.status} text={STATUS[d.status] || d.status} /></li>)}</ul> : <p className="text-sm text-soft">None yet.</p>}</section>
          {isSuper ? (
            <section className="rounded-xl border border-edge p-3"><h3 className="mb-2 font-semibold">Super admin actions</h3>
              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => { setPassword(''); setConfirm('password') }}><KeyRound className="size-4" aria-hidden="true" /> Set a new password</Btn>
                <Btn onClick={() => { setPerms([]); setConfirm('admin') }} disabled={!u.is_active}><ShieldPlus className="size-4" aria-hidden="true" /> Give administrator access…</Btn>
              </div>
              <p className="mt-2 text-xs text-soft">Customers can never become administrators by themselves: only a super admin can grant it, for chosen modules only, and it is recorded in the audit log. An account can be deleted only after it has been deactivated.</p>
            </section>
          ) : <p className="text-xs text-soft">Setting passwords, granting administrator access and deleting accounts are limited to super admins.</p>}

          <ConfirmDialog open={confirm === 'toggle'} title={u.is_active ? 'Deactivate this account?' : 'Activate this account?'} confirmLabel={u.is_active ? 'Deactivate' : 'Activate'} busy={busy} onClose={() => setConfirm(null)}
            onConfirm={() => run(() => api(`/api/admin/customers/${u.id}`, { method: 'PATCH', body: { is_active: !u.is_active } }), u.is_active ? 'Account deactivated and signed out' : 'Account activated')}>
            {u.is_active ? `${u.full_name} will be signed out at once and will not be able to log in until you activate the account again. Their details and history are kept.` : `${u.full_name} will be able to log in again.`}
          </ConfirmDialog>
          <ConfirmDialog open={confirm === 'delete'} title="Delete this account permanently?" confirmLabel="Delete account" busy={busy} onClose={() => setConfirm(null)}
            onConfirm={() => run(() => api(`/api/admin/customers/${u.id}`, { method: 'DELETE' }), 'Account deleted', onClose)}>
            The account, its login sessions and its registration details of {u.full_name} will be erased and this cannot be undone. Enquiries and demo requests they sent stay as business records but are no longer linked to any account. Consider exporting the record first if you need a copy.
          </ConfirmDialog>
          <Modal open={confirm === 'password'} onClose={() => setConfirm(null)} title={`New password for ${u.full_name}`} footer={<><Btn onClick={() => setConfirm(null)}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={() => run(() => api(`/api/admin/customers/${u.id}/reset-password`, { method: 'POST', body: { new_password: password } }), 'Password set: the person was signed out everywhere')}>Set password</Btn></>}>
            <Field label="New password" hint="At least 8 characters. Tell the person through a safe channel; they can change it on their account page.">{(pp) => <Input {...pp} type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          </Modal>
          <Modal open={confirm === 'admin'} onClose={() => setConfirm(null)} title={`Administrator access for ${u.full_name}`} footer={<><Btn onClick={() => setConfirm(null)}>Cancel</Btn><Btn kind="danger" loading={busy} onClick={() => run(() => api(`/api/admin/customers/${u.id}/make-admin`, { method: 'POST', body: { permissions: perms } }), 'Administrator access granted: manage it under Administrators', onClose)}>Grant access</Btn></>}>
            <p className="mb-3 text-sm text-soft">This account will be able to sign in to the Company Admin and use ONLY the modules ticked below. They will be signed out now and will sign in through the admin login. You can change or remove this later under Administrators.</p>
            <div className="grid gap-2 sm:grid-cols-2">{grantable.map(([k, label]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={perms.includes(k)} onChange={(e) => setPerms(e.target.checked ? [...perms, k] : perms.filter((x) => x !== k))} /> {label}</label>)}</div>
          </Modal>
        </div>
      )}
    </Modal>
  )
}
