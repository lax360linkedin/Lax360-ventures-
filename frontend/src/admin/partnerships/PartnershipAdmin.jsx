import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Badge, Btn, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea, Toggle, fmtDate, label, useDebounced, useFetch, useToast } from '../ui.jsx'
import { MediaPicker } from '../MediaPicker.jsx'

const qs = (p) => { const s = new URLSearchParams(Object.entries(p || {}).filter(([, v]) => v !== '' && v != null && v !== false)).toString(); return s ? `?${s}` : '' }
const pt = (path, { params, ...o } = {}) => api(`/api/admin/partnerships${path}${qs(params)}`, { timeoutMs: 20000, ...o })
const CAT = { franchise: 'Franchise', authorized: 'Authorized Partner', referral: 'Referral Partner' }
const DIV = { education: 'Education', 'digital-marketing': 'Digital Marketing', it: 'IT & Software', 'cad-engineering': 'CAD & Engineering Design', robotics: 'Robotics', blockchain: 'Blockchain & Web 3.0', other: 'Others' }
/** Division slug -> current name, from the list the server sends (it follows the divisions managed in the admin panel). */
const divMap = (opts) => ({ ...DIV, ...Object.fromEntries((opts || []).map((o) => [o.value, o.label])) })
/** Every division an application selected (older records only have the one). */
const divNames = (a, map) => (a.divisions?.length ? a.divisions : [a.division]).filter((d) => d !== 'other' || !a.other_interest).map((d) => map[d] || d) // the custom interest of Others is shown in full beside the list
/** The selected divisions as chips; "All Business Divisions" is shown as one tag, a custom interest under Others is spelled out. */
function DivChips({ a, map, max = 3 }) {
  const names = divNames(a, map)
  const shown = a.all_divisions ? ['All Business Divisions'] : names.slice(0, max)
  const rest = a.all_divisions ? 0 : names.length - shown.length
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {shown.map((n) => <span key={n} className="rounded-full border border-edge bg-glass px-2 py-0.5 text-[0.6875rem] font-semibold text-fg">{n}</span>)}
      {rest > 0 && <span className="rounded-full border border-edge px-2 py-0.5 text-[0.6875rem] text-soft" title={names.slice(max).join(', ')}>+{rest} more</span>}
      {a.other_interest && <span className="rounded-full border border-edge px-2 py-0.5 text-[0.6875rem] text-soft" title={a.other_interest}>Other: {a.other_interest.length > 28 ? `${a.other_interest.slice(0, 28)}…` : a.other_interest}</span>}
    </span>
  )
}
const TONE = { new: 'new', approved: 'success', rejected: 'failure', closed: 'draft', onboarding: 'connected', under_review: 'in_progress', contacted: 'contacted' }
const SLUG_LABEL = (s) => s.split('/').map((x) => ({ overview: 'Partner With Us (main page)', 'authorized-partner': 'Authorized Partner', 'referral-partner': 'Referral Partner', 'digital-marketing': 'Digital Marketing', it: 'IT & Software' }[x] || label(x))).join(' › ')
const COMM = { registration_fee: 'Registration fee', initial_investment: 'Initial investment', infrastructure_investment: 'Infrastructure investment', working_capital: 'Working capital', security_deposit: 'Security deposit', royalty: 'Royalty', revenue_sharing: 'Revenue sharing', agreement_duration: 'Agreement duration', renewal_fee: 'Renewal fee', territory: 'Territory conditions', exclusivity: 'Exclusivity', refund_conditions: 'Refund conditions', exit_conditions: 'Exit conditions', commission_model: 'Commission' }
const SECTIONS = ['overview', 'opportunities', 'model', 'eligibility', 'infrastructure', 'responsibilities', 'benefits', 'support', 'process', 'commercial', 'policies', 'faq']

function Bars({ title, data, names }) {
  const rows = Object.entries(data || {})
  const max = Math.max(1, ...rows.map(([, n]) => n))
  return <Card><h3 className="font-display text-base font-semibold">{title}</h3>{rows.length === 0 ? <p className="mt-4 text-sm text-soft">No applications in this period.</p> : <ul className="mt-3 space-y-2.5">{rows.map(([k, n]) => <li key={k} className="text-sm"><div className="flex justify-between"><span>{names?.[k] || label(k)}</span><span className="tabular-nums text-soft">{n}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-glass-strong"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div></li>)}</ul>}</Card>
}

export function PtOverview() {
  const [days, setDays] = useState(30)
  const { data, error, loading, reload } = useFetch(() => pt('/dashboard', { params: { days } }), [days])
  return (
    <>
      <PageHeader title="Partnership overview" lead="Real numbers from the applications received through the Partner With Us pages." />
      <Card className="mb-4"><div className="flex flex-wrap gap-2" role="group" aria-label="Period">{[[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days'], [365, 'Last year']].map(([n, t]) => <Btn key={n} kind={days === n ? 'primary' : 'secondary'} aria-pressed={days === n} onClick={() => setDays(n)}>{t}</Btn>)}</div></Card>
      {loading && !data && <Spinner />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Total applications', data.total], ['New', data.new], ['Under review', data.under_review], ['Approved', data.approved], ['Rejected', data.rejected], ['Consultation requests', data.consultation_requests], ['Franchise', data.by_category.franchise || 0], ['Authorized Partner', data.by_category.authorized || 0], ['Referral Partner', data.by_category.referral || 0], ['Education', data.by_division.education || 0], ['Digital Marketing', data.by_division['digital-marketing'] || 0], ['IT & Software', data.by_division.it || 0]].map(([k, v]) => <Card key={k} className="!p-4"><p className="text-xs font-semibold uppercase tracking-wide text-soft">{k}</p><p className="mt-1 font-display text-2xl font-semibold tabular-nums">{v}</p></Card>)}</div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3"><Bars title="By partnership type" data={data.by_category} names={CAT} /><Bars title="By division" data={data.by_division} names={divMap(data.division_options)} /><Bars title="By status" data={data.by_status} /></div>
        <Card className="mt-4"><h3 className="font-display text-base font-semibold">Recent applications</h3>{data.recent.length === 0 ? <p className="mt-3 text-sm text-soft">No applications yet.</p> : <ul className="mt-3 divide-y divide-edge text-sm">{data.recent.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span><strong>{a.full_name}</strong> · {CAT[a.category]} · {divNames(a, divMap(data.division_options)).join(', ')} <code className="text-xs text-soft">{a.reference}</code></span><span className="text-soft">{fmtDate(a.created_at)}</span></li>)}</ul>}</Card>
        <p className="mt-3 text-xs text-soft">{data.note}</p>
      </>}
    </>
  )
}

function ApplicationModal({ id, staff, onClose, onChanged }) {
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => pt(`/applications/${id}`), [id])
  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')
  const [kind, setKind] = useState('note')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (data) setStatus(data.status) }, [data?.status])
  const run = async (fn, ok) => { setBusy(true); try { await fn(); toast(ok); setNote(''); reload(); onChanged() } catch (e) { toast(e.fields ? Object.values(e.fields)[0] : e.message, 'error') } finally { setBusy(false) } }
  const answers = data ? Object.entries(data.answers || {}) : []
  return (
    <Modal open onClose={onClose} wide title={data ? `${data.reference} · ${data.full_name}` : 'Application'}>
      {loading && !data && <Spinner />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && <div className="space-y-5 text-sm">
        <div className="flex flex-wrap items-center gap-2"><Badge value={TONE[data.status] || 'draft'} text={label(data.status)} /><span className="text-soft">{CAT[data.category]} · received {fmtDate(data.created_at)} {data.source_page ? `from ${data.source_page}` : ''}</span></div>
        <section><h3 className="font-display font-semibold">Business divisions of interest</h3><DivChips a={data} map={divMap(data.division_options)} max={20} />{data.all_divisions && <p className="mt-1 text-xs text-soft">The applicant chose All Business Divisions: {divNames(data, divMap(data.division_options)).join(', ')}.</p>}{data.other_interest && <p className="mt-2"><span className="text-xs uppercase text-soft">Others (custom interest)</span><br />{data.other_interest}</p>}</section>
        <p className="rounded-lg bg-glass-strong p-3 text-xs">An application is an enquiry. Approving it here records the decision only: no partner account is created and no access is granted.</p>
        <dl className="grid gap-3 sm:grid-cols-2">{[['E-mail', data.email], ['Mobile', data.phone], ['Location', [data.city, data.state, data.country].filter(Boolean).join(', ')], ['Occupation', data.occupation], ['Applying as', data.entity_type ? `${data.entity_type}${data.organization ? `: ${data.organization}` : ''}` : ''], ['Preferred location', data.preferred_location], ['Preferred office', data.preferred_branch], ['Marketing consent', data.consent_marketing ? 'Yes (optional)' : 'No'], ['Processing consent', data.consent_processing ? `Yes, ${fmtDate(data.consent_at)}` : 'No']].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="text-xs uppercase text-soft">{k}</dt><dd className="break-words">{v}</dd></div>)}</dl>
        {answers.length > 0 && <section><h3 className="font-display font-semibold">Answers</h3><dl className="mt-2 grid gap-3 sm:grid-cols-2">{answers.map(([k, v]) => <div key={k}><dt className="text-xs uppercase text-soft">{label(k)}</dt><dd className="whitespace-pre-wrap break-words">{v}</dd></div>)}</dl></section>}
        {Object.keys(data.consultation || {}).length > 0 && <section><h3 className="font-display font-semibold">Consultation request (not a confirmed booking)</h3><p className="mt-1 text-soft">{[data.consultation.date, data.consultation.time, data.consultation.mode, data.consultation.method].filter(Boolean).join(' · ')}{data.consultation.message ? ` · ${data.consultation.message}` : ''}</p></section>}
        <section className="grid gap-4 md:grid-cols-2">
          <div><Field label="Status">{(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value)}>{(data.statuses || ALL_STATUSES).map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>}</Field><Btn className="mt-2" kind="primary" loading={busy} disabled={status === data.status} onClick={() => run(() => pt(`/applications/${id}/status`, { method: 'PATCH', body: { status, note } }), 'Status updated.')}>Update status</Btn></div>
          <div><Field label="Assigned to">{(p) => <Select {...p} value={data.assigned_to || ''} onChange={(e) => run(() => pt(`/applications/${id}/assignment`, { method: 'PUT', body: { assigned_to: e.target.value || null, branch: data.assigned_branch } }), 'Assignment saved.')}><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>}</Field>
            <Field label="Assigned branch" className="mt-2">{(p) => <Select {...p} value={data.assigned_branch || ''} onChange={(e) => run(() => pt(`/applications/${id}/assignment`, { method: 'PUT', body: { assigned_to: data.assigned_to, branch: e.target.value || null } }), 'Branch saved.')}><option value="">Not assigned</option><option value="salem">Salem</option><option value="bangalore">Bangalore</option><option value="mumbai">Mumbai</option></Select>}</Field></div>
        </section>
        <section><h3 className="font-display font-semibold">Add to the history</h3><div className="mt-2 grid gap-2 sm:grid-cols-4"><Select aria-label="Entry type" value={kind} onChange={(e) => setKind(e.target.value)}><option value="note">Internal note</option><option value="followup">Follow-up</option><option value="consultation">Consultation</option></Select><Textarea aria-label="Note" className="sm:col-span-3" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} /></div><Btn className="mt-2" loading={busy} disabled={note.trim().length < 2} onClick={() => run(() => pt(`/applications/${id}/notes`, { method: 'POST', body: { kind, note } }), 'Added.')}>Add</Btn></section>
        <section><h3 className="font-display font-semibold">History</h3><ul className="mt-2 space-y-2">{data.events.map((e) => <li key={e.id} className="rounded-lg border border-edge p-2.5"><strong>{label(e.kind)}</strong>{e.to_status ? `: ${e.from_status ? `${label(e.from_status)} → ` : ''}${label(e.to_status)}` : ''} <span className="text-soft">· {e.author} · {fmtDate(e.at)}</span>{e.note && <p className="mt-1 whitespace-pre-wrap text-soft">{e.note}</p>}</li>)}</ul></section>
      </div>}
    </Modal>
  )
}
const ALL_STATUSES = ['new', 'contacted', 'under_review', 'consultation_scheduled', 'documents_requested', 'verification_in_progress', 'agreement_pending', 'approved', 'rejected', 'onboarding', 'closed']

export function PtApplications() {
  const toast = useToast()
  const [params] = useSearchParams()
  const [f, setF] = useState({ q: '', status: '', category: params.get('category') || '', division: '', assigned: '', from: '', to: '', source: '' })
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const q = useDebounced(f.q, 350)
  const staff = useFetch(() => pt('/staff'))
  const { data, error, loading, reload } = useFetch(() => pt('/applications', { params: { ...f, q, page, page_size: 20 } }), [q, f.status, f.category, f.division, f.assigned, f.from, f.to, f.source, page])
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const exportCsv = async () => { try { const { blob } = await api(`/api/admin/partnerships/applications/export${qs({ ...f, q })}`, { as: 'blob', timeoutMs: 60000 }); const url = URL.createObjectURL(blob); const a = Object.assign(document.createElement('a'), { href: url, download: 'partnership-applications.csv' }); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url) } catch (e) { toast(e.message, 'error') } }
  const map = divMap(data?.division_options)
  const cols = [
    { key: 'ref', header: 'Reference', render: (a) => <code className="text-xs">{a.reference}</code> }, { key: 'n', header: 'Applicant', render: (a) => <span><strong>{a.full_name}</strong><span className="block text-xs text-soft">{a.email} · {a.phone}</span></span> },
    { key: 'c', header: 'Program', render: (a) => <span>{CAT[a.category]}<DivChips a={a} map={map} /></span> }, { key: 'l', header: 'Location', render: (a) => [a.city, a.state].filter(Boolean).join(', ') || a.country },
    { key: 'd', header: 'Received', render: (a) => fmtDate(a.created_at) }, { key: 'a', header: 'Assigned', render: (a) => a.assigned_to_name || <span className="text-soft">—</span> }, { key: 's', header: 'Status', render: (a) => <Badge value={TONE[a.status] || 'draft'} text={label(a.status)} /> },
  ]
  return (
    <>
      <PageHeader title="Applications & enquiries" lead="Every application from the Partner With Us pages. Approving an application records the decision only; it never creates a partner account." actions={<Btn onClick={exportCsv}><Download className="size-4" aria-hidden="true" />Export CSV</Btn>} />
      <Card className="mb-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Search">{(p) => <Input {...p} type="search" placeholder="Reference, name, e-mail, phone" value={f.q} onChange={set('q')} />}</Field>
        <Field label="Status">{(p) => <Select {...p} value={f.status} onChange={set('status')}><option value="">All</option>{ALL_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>}</Field>
        <Field label="Partnership type">{(p) => <Select {...p} value={f.category} onChange={set('category')}><option value="">All</option>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}</Field>
        <Field label="Business division">{(p) => <Select {...p} value={f.division} onChange={set('division')}><option value="">All</option>{Object.entries(map).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}</Field>
        <Field label="From">{(p) => <Input {...p} type="date" value={f.from} max={f.to || undefined} onChange={set('from')} />}</Field>
        <Field label="To">{(p) => <Input {...p} type="date" value={f.to} min={f.from || undefined} onChange={set('to')} />}</Field>
        <Field label="Source page">{(p) => <Input {...p} placeholder="e.g. /franchise/it" value={f.source} onChange={set('source')} />}</Field>
        <Field label="Assigned">{(p) => <Select {...p} value={f.assigned} onChange={set('assigned')}><option value="">Anyone</option><option value="unassigned">Unassigned</option>{(staff.data?.items || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>}</Field>
      </div></Card>
      <Card className="!p-0">
        {loading && !data && <div className="px-4"><Spinner /></div>}
        {error && !data && <div className="p-4"><ErrorState error={error} onRetry={reload} /></div>}
        {data && <><DataTable columns={cols} rows={data.items} onRowClick={(a) => setOpen(a.id)} empty={<EmptyState title="No applications match" />} /><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} /></>}
      </Card>
      {open && <ApplicationModal id={open} staff={staff.data?.items || []} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  )
}

function PageEditor({ item, commercialFields, onClose, onSaved }) {
  const toast = useToast()
  const c = item.content || {}
  const [v, setV] = useState({ published: item.published, hero_heading: c.hero_heading || '', hero_lead: c.hero_lead || '', cta_label: c.cta_label || '', intro: (c.intro || []).join('\n\n'), hidden: c.hidden_sections || [], extras: c.extra_sections || [],
    seo_title: item.seo_title || '', seo_description: item.seo_description || '', noindex: item.noindex, commercial: item.commercial || {}, hero_media_id: item.hero_media_id, hero_alt: item.hero_alt || '', brochure_media_id: item.brochure_media_id, brochure_published: item.brochure_published })
  const [pick, setPick] = useState(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }))
  const franchise = item.slug.startsWith('franchise')
  const fields = commercialFields.filter((k) => (franchise ? k !== 'commission_model' : ['registration_fee', 'commission_model', 'agreement_duration', 'territory'].includes(k)))
  const save = async () => {
    setBusy(true); setErrors({})
    const body = { published: v.published, content: { hero_heading: v.hero_heading, hero_lead: v.hero_lead, cta_label: v.cta_label, intro: v.intro.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean), hidden_sections: v.hidden, extra_sections: v.extras },
      seo_title: v.seo_title, seo_description: v.seo_description, noindex: v.noindex, commercial: v.commercial, hero_media_id: v.hero_media_id, hero_alt: v.hero_alt, brochure_media_id: v.brochure_media_id, brochure_published: v.brochure_published }
    try { await pt(`/pages/${item.slug}`, { method: 'PUT', body }); toast('Page saved. Public pages pick it up within about a minute.'); onSaved() } catch (e) { setErrors(e.fields || {}); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error') } finally { setBusy(false) }
  }
  const com = (k) => v.commercial[k] || { value: '', published: false }
  return (
    <Modal open wide onClose={onClose} title={`Edit: ${SLUG_LABEL(item.slug)}`} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={save}>Save page</Btn></>}>
      <div className="space-y-6">
        <p className="rounded-lg bg-glass-strong p-3 text-xs">Blank fields keep the built-in text. All text is plain text (no HTML). Unpublished commercial values are never sent to the public site; those fields show “available upon consultation”.</p>
        <div className="flex flex-wrap gap-6"><Toggle checked={v.published} onChange={(on) => setV((s) => ({ ...s, published: on }))} label="Published (unpublished pages show “not found”)" /><Toggle checked={v.noindex} onChange={(on) => setV((s) => ({ ...s, noindex: on }))} label="Hide from search engines (noindex)" /></div>
        <fieldset className="grid gap-4 md:grid-cols-2"><legend className="mb-2 font-semibold">Hero and introduction</legend>
          <Field label="Hero heading">{(p) => <Input {...p} maxLength={160} value={v.hero_heading} onChange={set('hero_heading')} />}</Field>
          <Field label="Main button label" hint="Default: Apply Now">{(p) => <Input {...p} maxLength={40} value={v.cta_label} onChange={set('cta_label')} />}</Field>
          <Field label="Hero description" className="md:col-span-2">{(p) => <Textarea {...p} maxLength={500} value={v.hero_lead} onChange={set('hero_lead')} />}</Field>
          <Field label="Introduction (separate paragraphs with a blank line)" className="md:col-span-2">{(p) => <Textarea {...p} className="min-h-40" value={v.intro} onChange={set('intro')} />}</Field>
        </fieldset>
        <fieldset><legend className="mb-2 font-semibold">Hero image</legend><div className="flex flex-wrap items-center gap-3"><Btn onClick={() => setPick('hero')}>{v.hero_media_id ? 'Replace image' : 'Choose image'}</Btn>{v.hero_media_id && <Btn kind="ghost" onClick={() => setV((s) => ({ ...s, hero_media_id: null }))}>Remove</Btn>}<span className="text-sm text-soft">{v.hero_media_id ? 'An image is set.' : 'No image: the page uses its gradient background. Use real, licensed photographs only.'}</span></div><Field label="Image description (alt text)" className="mt-3" error={errors.hero_alt}>{(p) => <Input {...p} maxLength={200} value={v.hero_alt} onChange={set('hero_alt')} />}</Field></fieldset>
        <fieldset><legend className="mb-2 font-semibold">Brochure (PDF)</legend><div className="flex flex-wrap items-center gap-3"><Btn onClick={() => setPick('brochure')}>{v.brochure_media_id ? 'Replace brochure' : 'Choose PDF'}</Btn>{v.brochure_media_id && <Btn kind="ghost" onClick={() => setV((s) => ({ ...s, brochure_media_id: null, brochure_published: false }))}>Remove</Btn>}<Toggle checked={v.brochure_published && !!v.brochure_media_id} disabled={!v.brochure_media_id} onChange={(on) => setV((s) => ({ ...s, brochure_published: on }))} label="Show the download button" /></div><p className="mt-1 text-xs text-soft">Version {item.brochure_version}. The download button stays hidden unless a brochure is chosen and published.</p>{errors.brochure_media_id && <p className="text-xs text-error">{errors.brochure_media_id}</p>}</fieldset>
        <fieldset><legend className="mb-2 font-semibold">Sections shown</legend><div className="flex flex-wrap gap-3">{SECTIONS.map((s) => <label key={s} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!v.hidden.includes(s)} onChange={() => setV((x) => ({ ...x, hidden: x.hidden.includes(s) ? x.hidden.filter((h) => h !== s) : [...x.hidden, s] }))} />{label(s)}</label>)}</div></fieldset>
        <fieldset><legend className="mb-2 font-semibold">Extra sections</legend>
          {v.extras.map((s, i) => <div key={i} className="mb-3 rounded-lg border border-edge p-3"><div className="flex gap-2"><Input aria-label="Section heading" placeholder="Heading" maxLength={120} value={s.heading} onChange={(e) => setV((x) => ({ ...x, extras: x.extras.map((y, j) => (j === i ? { ...y, heading: e.target.value } : y)) }))} /><Btn kind="ghost" aria-label="Remove section" onClick={() => setV((x) => ({ ...x, extras: x.extras.filter((_, j) => j !== i) }))}><Trash2 className="size-4" aria-hidden="true" /></Btn></div><Textarea aria-label="Section text" className="mt-2" maxLength={2000} value={s.body} onChange={(e) => setV((x) => ({ ...x, extras: x.extras.map((y, j) => (j === i ? { ...y, body: e.target.value } : y)) }))} /></div>)}
          {v.extras.length < 8 && <Btn onClick={() => setV((x) => ({ ...x, extras: [...x.extras, { heading: '', body: '', enabled: true }] }))}><Plus className="size-4" aria-hidden="true" />Add a section</Btn>}</fieldset>
        <fieldset><legend className="mb-2 font-semibold">Commercial information</legend>
          <div className="space-y-3">{fields.map((k) => <div key={k} className="grid gap-2 md:grid-cols-12"><label className="pt-2 text-sm font-semibold md:col-span-3" htmlFor={`c-${k}`}>{COMM[k]}</label><Input id={`c-${k}`} className="md:col-span-6" maxLength={600} value={com(k).value} onChange={(e) => setV((x) => ({ ...x, commercial: { ...x.commercial, [k]: { ...com(k), value: e.target.value } } }))} placeholder="Not set: shows “available upon consultation”" /><div className="pt-1 md:col-span-3"><Toggle checked={com(k).published && !!com(k).value} disabled={!com(k).value} onChange={(on) => setV((x) => ({ ...x, commercial: { ...x.commercial, [k]: { ...com(k), published: on } } }))} label="Publish" /></div></div>)}</div>
          <p className="mt-2 text-xs text-soft">Only publish values management has approved. Do not enter income or return promises.</p></fieldset>
        <fieldset className="grid gap-4"><legend className="mb-2 font-semibold">Search and sharing</legend>
          <Field label="SEO title" hint="About 60 characters">{(p) => <Input {...p} maxLength={160} value={v.seo_title} onChange={set('seo_title')} />}</Field>
          <Field label="Meta description" hint="About 150 characters">{(p) => <Textarea {...p} maxLength={320} value={v.seo_description} onChange={set('seo_description')} />}</Field>
        </fieldset>
      </div>
      <MediaPicker open={!!pick} kind={pick === 'brochure' ? 'document' : 'image'} onClose={() => setPick(null)} onPick={(a) => { setV((s) => (pick === 'brochure' ? { ...s, brochure_media_id: a.id } : { ...s, hero_media_id: a.id })); setPick(null) }} />
    </Modal>
  )
}

export function PtPages() {
  const { data, error, loading, reload } = useFetch(() => pt('/pages'))
  const [edit, setEdit] = useState(null)
  const cols = [{ key: 'p', header: 'Page', render: (p) => <strong>{SLUG_LABEL(p.slug)}</strong> }, { key: 's', header: 'Status', render: (p) => <Badge value={p.published ? 'published' : 'draft'} text={p.published ? (p.noindex ? 'Published (noindex)' : 'Published') : 'Unpublished'} /> },
    { key: 'c', header: 'Customised', render: (p) => (p.customised ? `v${p.version}` : 'Built-in content') }, { key: 'b', header: 'Brochure', render: (p) => (p.brochure_published ? 'Shown' : '—') }, { key: 'u', header: 'Updated', render: (p) => fmtDate(p.updated_at) },
    { key: 'a', header: '', render: (p) => <Btn onClick={() => setEdit(p)} aria-label={`Edit ${SLUG_LABEL(p.slug)}`}><Pencil className="size-4" aria-hidden="true" /></Btn> }]
  return (
    <>
      <PageHeader title="Opportunity pages" lead="Edit the headings, introductions, images, brochures, commercial information, sections and search settings of the main page, the three program pages and the nine opportunity pages." />
      {loading && !data && <Spinner />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && <><Card className="!p-0"><DataTable columns={cols} rows={data.items} rowKey={(p) => p.slug} /></Card><p className="mt-3 text-xs text-soft">{data.note}</p></>}
      {edit && data && <PageEditor item={edit} commercialFields={data.commercial_fields} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </>
  )
}

export function PtFaqs() {
  const toast = useToast()
  const [scope, setScope] = useState('')
  const { data, error, loading, reload } = useFetch(() => pt('/faqs', { params: { scope } }), [scope])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const save = async () => { setBusy(true); try { const body = { scope: edit.scope, question: edit.question, answer: edit.answer, sort_order: Number(edit.sort_order) || 0, published: edit.published }; await pt(edit.id ? `/faqs/${edit.id}` : '/faqs', { method: edit.id ? 'PATCH' : 'POST', body }); toast('FAQ saved.'); setEdit(null); reload() } catch (e) { toast(e.fields ? Object.values(e.fields)[0] : e.message, 'error') } finally { setBusy(false) } }
  const remove = async () => { setBusy(true); try { await pt(`/faqs/${del.id}`, { method: 'DELETE' }); toast('FAQ deleted.'); setDel(null); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) } }
  const cols = [{ key: 'q', header: 'Question', render: (f) => <span><strong>{f.question}</strong><span className="block max-w-md truncate text-xs text-soft">{f.answer}</span></span> }, { key: 's', header: 'Shown on', render: (f) => (f.scope === 'general' ? 'All partnership pages' : SLUG_LABEL(f.scope)) }, { key: 'p', header: 'Status', render: (f) => <Badge value={f.published ? 'published' : 'draft'} /> },
    { key: 'a', header: '', render: (f) => <span className="flex gap-1"><Btn onClick={() => setEdit(f)} aria-label="Edit FAQ"><Pencil className="size-4" aria-hidden="true" /></Btn><Btn kind="danger" onClick={() => setDel(f)} aria-label="Delete FAQ"><Trash2 className="size-4" aria-hidden="true" /></Btn></span> }]
  return (
    <>
      <PageHeader title="FAQs" lead="Extra questions shown on the partnership pages, in addition to the built-in ones." actions={<Btn kind="primary" onClick={() => setEdit({ scope: 'general', question: '', answer: '', sort_order: 0, published: true })}><Plus className="size-4" aria-hidden="true" />New FAQ</Btn>} />
      <Card className="mb-4"><Field label="Show FAQs for">{(p) => <Select {...p} value={scope} onChange={(e) => setScope(e.target.value)}><option value="">Everything</option>{(data?.scopes || ['general']).map((s) => <option key={s} value={s}>{s === 'general' ? 'General' : SLUG_LABEL(s)}</option>)}</Select>}</Field></Card>
      {loading && !data && <Spinner />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && <Card className="!p-0"><DataTable columns={cols} rows={data.items} empty={<EmptyState title="No extra FAQs yet" />} /></Card>}
      {edit && <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit FAQ' : 'New FAQ'} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={save}>Save</Btn></>}>
        <div className="space-y-4"><Field label="Shown on">{(p) => <Select {...p} value={edit.scope} onChange={(e) => setEdit({ ...edit, scope: e.target.value })}>{(data?.scopes || ['general']).map((s) => <option key={s} value={s}>{s === 'general' ? 'General' : SLUG_LABEL(s)}</option>)}</Select>}</Field>
          <Field label="Question" required>{(p) => <Input {...p} maxLength={300} value={edit.question} onChange={(e) => setEdit({ ...edit, question: e.target.value })} />}</Field>
          <Field label="Answer" required>{(p) => <Textarea {...p} maxLength={3000} value={edit.answer} onChange={(e) => setEdit({ ...edit, answer: e.target.value })} />}</Field>
          <Field label="Order">{(p) => <Input {...p} type="number" min="0" max="999" value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: e.target.value })} />}</Field>
          <Toggle checked={edit.published} onChange={(on) => setEdit({ ...edit, published: on })} label="Published" /></div></Modal>}
      <ConfirmDialog open={!!del} title="Delete this FAQ?" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>{del?.question}</ConfirmDialog>
    </>
  )
}

export function PtPolicies() {
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => pt('/policies'))
  const [edit, setEdit] = useState(null)
  const [pub, setPub] = useState(null)
  const [reviewer, setReviewer] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (fn, ok, after) => { setBusy(true); try { await fn(); toast(ok); after?.(); reload() } catch (e) { toast(e.fields ? Object.values(e.fields)[0] : e.message, 'error') } finally { setBusy(false) } }
  const cols = [{ key: 't', header: 'Policy', render: (p) => <span><strong>{p.title}</strong><span className="block text-xs text-soft">{label(p.key)} · {p.scope === 'general' ? 'General' : SLUG_LABEL(p.scope)}</span></span> }, { key: 'v', header: 'Version', render: (p) => `v${p.version}` },
    { key: 's', header: 'Status', render: (p) => <Badge value={p.status === 'published' ? 'published' : 'draft'} text={label(p.status)} /> }, { key: 'e', header: 'Effective', render: (p) => p.effective_date || '—' }, { key: 'r', header: 'Reviewed by', render: (p) => p.reviewed_by || '—' },
    { key: 'a', header: '', render: (p) => <span className="flex gap-1">{p.status === 'draft' && <><Btn onClick={() => setEdit(p)}>Edit</Btn><Btn kind="primary" onClick={() => { setPub(p); setReviewer('') }}>Publish</Btn><Btn kind="danger" aria-label="Delete draft" onClick={() => run(() => pt(`/policies/${p.id}`, { method: 'DELETE' }), 'Draft deleted.')}><Trash2 className="size-4" aria-hidden="true" /></Btn></>}{p.status === 'published' && <Btn onClick={() => run(() => pt(`/policies/${p.id}/unpublish`, { method: 'POST' }), 'Withdrawn: it is a draft again.')}>Withdraw</Btn>}{p.status !== 'draft' && <Btn onClick={() => setEdit({ ...p, id: null, version: undefined })}>New version</Btn>}</span> }]
  return (
    <>
      <PageHeader title="Policies & agreements" lead="Versioned public policy texts. A draft is never shown on the website. Binding commercial or legal text needs management and legal review before publishing." actions={<Btn kind="primary" onClick={() => setEdit({ key: 'terms', scope: 'general', title: '', body: '', effective_date: '' })}><Plus className="size-4" aria-hidden="true" />New policy</Btn>} />
      {loading && !data && <Spinner />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && <><Card className="!p-0"><DataTable columns={cols} rows={data.items} empty={<EmptyState title="No policies yet">Until a policy is published, the pages state that the terms are provided in the agreement.</EmptyState>} /></Card><p className="mt-3 text-xs text-soft">{data.note}</p></>}
      {edit && <Modal open wide onClose={() => setEdit(null)} title={edit.id ? 'Edit draft' : 'New policy / version'} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={() => run(() => pt(edit.id ? `/policies/${edit.id}` : '/policies', { method: edit.id ? 'PATCH' : 'POST', body: { key: edit.key, scope: edit.scope, title: edit.title, body: edit.body, effective_date: edit.effective_date || null } }), 'Saved as a draft.', () => setEdit(null))}>Save draft</Btn></>}>
        <div className="grid gap-4 md:grid-cols-2"><Field label="Type">{(p) => <Select {...p} disabled={!!edit.id} value={edit.key} onChange={(e) => setEdit({ ...edit, key: e.target.value })}>{(data?.keys || []).map((k) => <option key={k} value={k}>{label(k)}</option>)}</Select>}</Field>
          <Field label="Applies to">{(p) => <Select {...p} disabled={!!edit.id} value={edit.scope} onChange={(e) => setEdit({ ...edit, scope: e.target.value })}>{(data?.scopes || []).map((s) => <option key={s} value={s}>{s === 'general' ? 'General (all partnership pages)' : SLUG_LABEL(s)}</option>)}</Select>}</Field>
          <Field label="Title" required className="md:col-span-2">{(p) => <Input {...p} maxLength={160} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />}</Field>
          <Field label="Text (plain text; blank line between paragraphs)" required className="md:col-span-2">{(p) => <Textarea {...p} className="min-h-64" maxLength={20000} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />}</Field>
          <Field label="Effective date">{(p) => <Input {...p} type="date" value={edit.effective_date || ''} onChange={(e) => setEdit({ ...edit, effective_date: e.target.value })} />}</Field></div></Modal>}
      {pub && <Modal open onClose={() => setPub(null)} title={`Publish ${pub.title} v${pub.version}`} footer={<><Btn onClick={() => setPub(null)}>Cancel</Btn><Btn kind="primary" loading={busy} disabled={reviewer.trim().length < 3} onClick={() => run(() => pt(`/policies/${pub.id}/publish`, { method: 'POST', body: { reviewed_by: reviewer } }), 'Published.', () => setPub(null))}>Publish</Btn></>}>
        <p className="mb-3 text-sm text-soft">Publishing makes this text public and archives the previous published version. Confirm that management and legal counsel have approved it, and record who did.</p>
        <Field label="Approved by (name or role)" required>{(p) => <Input {...p} maxLength={160} value={reviewer} onChange={(e) => setReviewer(e.target.value)} />}</Field></Modal>}
    </>
  )
}

export function PtSettings() {
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => pt('/settings'))
  const [v, setV] = useState(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [pick, setPick] = useState(false)
  useEffect(() => { if (data) setV({ ...data.values, notify_emails: (data.values.notify_emails || []).join(', ') }) }, [data])
  if (loading && !data) return <Spinner />
  if (error && !data) return <ErrorState error={error} onRetry={reload} />
  if (!v) return null
  const save = async () => { setBusy(true); setErrors({}); try { await pt('/settings', { method: 'PUT', body: { values: { portal_url: v.portal_url || '', notify_emails: v.notify_emails.split(',').map((x) => x.trim()).filter(Boolean), applications_open: v.applications_open, enquiry_form_enabled: v.enquiry_form_enabled !== false, enquiry_form_title: v.enquiry_form_title || '', enquiry_form_lead: v.enquiry_form_lead || '', acknowledgement_enabled: v.acknowledgement_enabled, general_brochure_media_id: v.general_brochure_media_id || null, general_brochure_published: !!(v.general_brochure_published && v.general_brochure_media_id) } } }); toast('Settings saved.'); reload() } catch (e) { setErrors(e.fields || {}); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error') } finally { setBusy(false) } }
  return (
    <>
      <PageHeader title="Partnership settings" lead="Application intake, notifications, the partner portal link and the general brochure." />
      <Card className="space-y-5">
        <Toggle checked={v.applications_open} onChange={(on) => setV({ ...v, applications_open: on })} label="Accept new applications" />
        <fieldset className="space-y-3 rounded-xl border border-edge p-4"><legend className="px-1 font-semibold">Enquiry form at the bottom of every partnership page</legend>
          <Toggle checked={v.enquiry_form_enabled !== false} onChange={(on) => setV({ ...v, enquiry_form_enabled: on })} label="Show the enquiry form" />
          <Field label="Heading" hint="Leave empty for the built-in heading, “Send a partnership enquiry”.">{(p) => <Input {...p} maxLength={120} value={v.enquiry_form_title || ''} onChange={(e) => setV({ ...v, enquiry_form_title: e.target.value })} />}</Field>
          <Field label="Introduction" hint="Leave empty for the built-in introduction.">{(p) => <Input {...p} maxLength={300} value={v.enquiry_form_lead || ''} onChange={(e) => setV({ ...v, enquiry_form_lead: e.target.value })} />}</Field>
          <p className="text-xs text-soft">The business divisions in the form follow Partnerships &gt; Navigation menu and Services &gt; Upcoming service categories. Submissions are listed under Applications &amp; enquiries and in the Enquiry center.</p>
        </fieldset>
        <Toggle checked={v.acknowledgement_enabled} onChange={(on) => setV({ ...v, acknowledgement_enabled: on })} label="E-mail an acknowledgement to applicants (needs the server's e-mail settings; a failed e-mail never blocks an application)" />
        <Field label="Notify these e-mail addresses about new applications" hint="Comma-separated. The enquiry notification address set on the server is also used." error={errors.notify_emails}>{(p) => <Input {...p} value={v.notify_emails} onChange={(e) => setV({ ...v, notify_emails: e.target.value })} />}</Field>
        <Field label="Partner portal address" hint="Shown as “Partner Login” only when set. Must start with https://. Logging in on the portal never gives access to this admin panel." error={errors.portal_url}>{(p) => <Input {...p} type="url" placeholder="https://" value={v.portal_url} onChange={(e) => setV({ ...v, portal_url: e.target.value })} />}</Field>
        <fieldset><legend className="mb-2 font-semibold">General partnership brochure (PDF)</legend><div className="flex flex-wrap items-center gap-3"><Btn onClick={() => setPick(true)}>{v.general_brochure_media_id ? 'Replace brochure' : 'Choose PDF'}</Btn>{v.general_brochure_media_id && <Btn kind="ghost" onClick={() => setV({ ...v, general_brochure_media_id: null, general_brochure_published: false })}>Remove</Btn>}<Toggle checked={!!v.general_brochure_published && !!v.general_brochure_media_id} disabled={!v.general_brochure_media_id} onChange={(on) => setV({ ...v, general_brochure_published: on })} label="Show the download button" /></div></fieldset>
        <Btn kind="primary" loading={busy} onClick={save}>Save settings</Btn>
        <p className="text-xs text-soft">{data.note}</p>
      </Card>
      <MediaPicker open={pick} kind="document" onClose={() => setPick(false)} onPick={(a) => { setV({ ...v, general_brochure_media_id: a.id }); setPick(false) }} />
    </>
  )
}

export { PtMenu } from './PartnershipMenu.jsx'
