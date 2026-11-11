import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, ExternalLink, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { MediaField } from '../MediaPicker.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, Toggle, cx, fmtDate, useFetch, useToast } from '../ui.jsx'

/** The service hierarchy from a field's options: main services ("<category>/*") and their sub-services ("<category>/<service>"). */
function serviceTree(options) {
  const mains = options.filter((o) => o.value.endsWith('/*')).map((o) => ({ slug: o.value.slice(0, -2), label: o.label.replace(/^All /, '').replace(/ service pages$/, '') }))
  return mains.map((m) => ({ ...m, subs: options.filter((o) => o.value.startsWith(`${m.slug}/`) && !o.value.endsWith('/*')).map((o) => ({ value: o.value, label: o.label.split(' — ').slice(1).join(' — ') || o.label })) }))
}
const csvSet = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean)

/** Testimonial: Step 1 choose the main service, Step 2 the exact sub-service (or the main service as a whole). Stored as one service id. */
function ServiceSingle({ f, value, onChange, props }) {
  const tree = serviceTree(f.options)
  const main = tree.find((m) => value && value.startsWith(`${m.slug}/`))
  const set = (v) => onChange({ target: { value: v } })
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-soft" htmlFor={`${props?.id}-main`}>Step 1: main service</label>
        <Select id={`${props?.id}-main`} value={main?.slug || ''} onChange={(e) => set(e.target.value ? `${e.target.value}/*` : '')}>
          <option value="">Not linked to a service (home page only)</option>
          {tree.map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-soft" htmlFor={props?.id}>Step 2: specific sub-service</label>
        <Select {...props} value={main ? value : ''} disabled={!main} onChange={(e) => set(e.target.value)}>
          {main ? <><option value={`${main.slug}/*`}>{main.label} as a whole (main page and all its sub-services)</option>{main.subs.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</> : <option value="">Choose a main service first</option>}
        </Select>
      </div>
    </div>
  )
}

/** Client: choose the main service, then tick the sub-services it received (several allowed; other main services' choices are kept). Stored as a list of service ids. */
function ServiceMulti({ f, value, onChange, props }) {
  const tree = serviceTree(f.options)
  const chosen = csvSet(value)
  const [mainSlug, setMain] = useState(() => tree.find((m) => chosen.some((k) => k.startsWith(`${m.slug}/`)))?.slug || '')
  const main = tree.find((m) => m.slug === mainSlug)
  const all = tree.flatMap((m) => [`${m.slug}/*`, ...m.subs.map((o) => o.value)])
  const emit = (set) => onChange({ target: { value: all.filter((k) => set.has(k)).join(',') } })
  const toggle = (k) => { const next = new Set(chosen); if (next.has(k)) next.delete(k); else next.add(k); emit(next) }
  const nameOf = (k) => { const [c, s] = k.split('/'); const m = tree.find((x) => x.slug === c); return s === '*' ? `${m?.label || c} (whole)` : `${m?.label || c} → ${m?.subs.find((o) => o.value === k)?.label || s}` }
  return (
    <div id={props?.id} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-soft" htmlFor={`${props?.id}-main`}>Step 1: main service</label>
        <Select id={`${props?.id}-main`} value={mainSlug} onChange={(e) => setMain(e.target.value)}>
          <option value="">Choose a main service…</option>
          {tree.map((m) => <option key={m.slug} value={m.slug}>{m.label}{chosen.some((k) => k.startsWith(`${m.slug}/`)) ? ' ✓' : ''}</option>)}
        </Select>
      </div>
      {main && (
        <fieldset className="rounded-lg border border-edge p-2">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-soft">Step 2: sub-services of {main.label}</legend>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {[{ value: `${main.slug}/*`, label: `${main.label} as a whole (shown on the main page and every sub-service page)` }, ...main.subs].map((o, i) => (
              <label key={o.value} className={cx('flex min-h-9 cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-glass', i === 0 && 'font-semibold')}>
                <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]" checked={chosen.includes(o.value)} onChange={() => toggle(o.value)} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <p className="text-xs text-soft" aria-live="polite">{chosen.length ? <>Assigned to: {chosen.map(nameOf).join(' · ')}</> : 'Not assigned to a service yet (home page only).'}</p>
    </div>
  )
}

/** Tick several options; stored as one comma-separated text value. */
function MultiSelect({ f, value, onChange, props }) {
  const chosen = new Set(String(value || '').split(',').map((v) => v.trim()).filter(Boolean))
  const toggle = (v) => { const next = new Set(chosen); if (next.has(v)) next.delete(v); else next.add(v); onChange({ target: { value: f.options.map((o) => o.value).filter((x) => next.has(x)).join(',') } }) }
  return (
    <div id={props?.id} role="group" aria-label={f.label} className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-edge p-2">
      {f.options.map((o) => (
        <label key={o.value} className={cx('flex min-h-9 cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-glass', o.value.endsWith('/*') && 'font-semibold')}>
          <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]" checked={chosen.has(o.value)} onChange={() => toggle(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )
}

function FieldInput({ f, value, onChange, props }) {
  if (f.type === 'bool') return <Toggle checked={!!value} onChange={(v) => onChange({ target: { value: v } })} label={value ? 'On' : 'Off'} />
  if (f.type === 'document') return <MediaField {...props} kind="document" value={value} onChange={(v) => onChange({ target: { value: v } })} />
  if (f.type === 'image' || f.type === 'video') return <MediaField {...props} kind={f.type} value={value} onChange={(v) => onChange({ target: { value: v } })} />
  if (f.ui === 'date') return <Input {...props} type="date" value={value} onChange={onChange} />
  if (f.type === 'textarea') return <Textarea {...props} maxLength={f.max} value={value} onChange={onChange} />
  if (f.ui === 'service') return <ServiceSingle f={f} value={value} onChange={onChange} props={props} />
  if (f.ui === 'services') return <ServiceMulti f={f} value={value} onChange={onChange} props={props} />
  if (f.type === 'multiselect') return <MultiSelect f={f} value={value} onChange={onChange} props={props} />
  if (f.type === 'select') return <Select {...props} value={value} onChange={onChange}><option value="">Select…</option>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
  return <Input {...props} maxLength={f.max} value={value} onChange={onChange} />
}

/** A quick look at the content as entered. The exact result, in the real design, is one click away ("Preview on the website"). */
function Preview({ spec, title, data }) {
  const shown = spec.fields.filter((f) => f.type !== 'image' && f.type !== 'video' && data[f.name] !== '' && data[f.name] !== undefined && data[f.name] !== false)
  const label = (f, v) => (f.type === 'multiselect' ? String(v).split(',').map((x) => f.options.find((o) => o.value === x)?.label || x).join(', ') : f.type === 'select' ? (f.options.find((o) => o.value === v)?.label || v) : f.type === 'bool' ? 'Yes' : v)
  return (
    <div className="rounded-lg border border-edge p-3 text-sm">
      <p className="font-display text-lg font-semibold">{spec.single ? spec.label : title || <span className="text-soft">Untitled</span>}</p>
      <dl className="mt-2 space-y-2">
        {shown.map((f) => <div key={f.name}><dt className="text-xs font-semibold uppercase tracking-wide text-soft">{f.label}</dt><dd className="whitespace-pre-line break-words">{label(f, data[f.name])}</dd></div>)}
        {!shown.length && <p className="text-soft">Nothing entered yet. Empty fields keep the website's built-in text.</p>}
      </dl>
    </div>
  )
}

function Editor({ spec, item, onClose, onSaved, preset = {} }) {
  const toast = useToast()
  const [title, setTitle] = useState(item?.title || '')
  const initial = () => Object.fromEntries(spec.fields.map((f) => [f.name, item?.data?.[f.name] ?? (!item && preset[f.name] !== undefined ? preset[f.name] : f.type === 'bool' ? (f.default ?? false) : f.type === 'select' && f.name === 'group' ? 'home' : '')]))
  const [data, setData] = useState(initial)
  const [order, setOrder] = useState(item?.sort_order ?? 0)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState('')
  const effectiveTitle = spec.single ? spec.label : title
  const wasPublished = item?.status === 'published'

  const save = async (status) => {
    setBusy(status)
    setErrors({})
    const body = { title: effectiveTitle, data, status, sort_order: Number(order) || 0 }
    try {
      await (item ? api(`/api/admin/content/item/${item.id}`, { method: 'PATCH', body }) : api(`/api/admin/content/${spec.kind}`, { method: 'POST', body }))
      toast(status === 'published' ? 'Saved and published: it is live on the website' : 'Saved as a draft: visitors cannot see it')
      onSaved()
      onClose()
    } catch (e) { setErrors({ ...(e.fields || {}) }); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error') } finally { setBusy('') }
  }
  return (
    <Modal open onClose={onClose} wide title={`${item ? 'Edit' : 'New'} — ${spec.label}`}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn loading={busy === 'draft'} onClick={() => save('draft')}>{wasPublished ? 'Unpublish & save as draft' : 'Save as draft'}</Btn>
        <Btn kind="primary" loading={busy === 'published'} onClick={() => save('published')}>{wasPublished ? 'Save & keep published' : 'Publish'}</Btn>
      </>}>
      <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
        <div className="space-y-3">
          {!spec.single && <Field label={spec.title_label || 'Title'} required error={errors.title}>{(p) => <Input {...p} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>}
          {spec.fields.map((f) => <Field key={f.name} label={f.label} required={f.required} hint={f.help} error={errors[f.name]}>{(p) => <FieldInput f={f} props={p} value={data[f.name]} onChange={(e) => setData({ ...data, [f.name]: e.target.value })} />}</Field>)}
          {!spec.single && <Field label="Display order" hint="Lower numbers come first. You can also reorder with the arrows in the list."><Input type="number" min="0" max="100000" value={order} onChange={(e) => setOrder(e.target.value)} aria-label="Display order" /></Field>}
          <p className="text-xs text-soft">Status: <Badge value={item?.status || 'draft'} />. A draft is private. It only appears on the website after you publish it.</p>
        </div>
        <div><h3 className="mb-2 text-sm font-semibold">Preview</h3><Preview spec={spec} title={effectiveTitle} data={data} />
          {spec.preview_path && <p className="mt-2 text-xs text-soft">To see drafts in the real design, save and use “Preview on the website” in the list.</p>}</div>
      </div>
    </Modal>
  )
}

const PAGE_SIZE = 20

export { Editor }

export default function Content() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const meta = useFetch(() => api('/api/admin/content/kinds'), [])
  const [group, setGroup] = useState(null)
  const [kind, setKind] = useState(params.get('kind'))
  const productFilter = params.get('product') || ''
  const items = useFetch(() => (kind ? api(`/api/admin/content/${kind}`) : Promise.resolve([])), [kind])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [picked, setPicked] = useState(() => new Set())
  const [bulk, setBulk] = useState('')
  const [bulkDelete, setBulkDelete] = useState(false)
  const kinds = meta.data?.kinds || []
  const groups = meta.data?.groups || []
  const fromKind = kinds.find((k) => k.kind === kind)
  const activeGroup = group || fromKind?.group || groups[0]
  const inGroup = useMemo(() => kinds.filter((k) => k.group === activeGroup), [kinds, activeGroup])
  const spec = fromKind || inGroup[0]
  // changing the type resets the search, filters and selection
  useEffect(() => { setQ(''); setStatusFilter('all'); setPage(1); setPicked(new Set()) }, [kind])
  useEffect(() => { if (spec && kind !== spec.kind) setKind(spec.kind) }, [spec, kind])
  useEffect(() => { if (kind && params.get('kind') !== kind) setParams({ kind, ...(productFilter ? { product: productFilter } : {}) }, { replace: true }) }, [kind]) // eslint-disable-line react-hooks/exhaustive-deps

  const all = items.data || []
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return all.filter((it) => (!productFilter || it.data?.product === productFilter) && (statusFilter === 'all' || it.status === statusFilter) && (!t || `${it.title} ${Object.values(it.data || {}).filter((v) => typeof v === 'string').join(' ')}`.toLowerCase().includes(t)))
  }, [all, q, statusFilter, productFilter])
  const filtering = Boolean(q.trim()) || statusFilter !== 'all' || Boolean(productFilter)
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const shown = list.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE)

  if (meta.loading && !meta.data) return <Spinner />
  if (meta.error && !meta.data) return <ErrorState error={meta.error} onRetry={meta.reload} />
  if (!spec) return <Card><EmptyState title="Nothing to manage">Your account has no website-content modules. A super admin can grant them.</EmptyState></Card>
  const counts = meta.data.counts
  const total = counts[spec.kind].published + counts[spec.kind].draft

  const refresh = () => { items.reload(); meta.reload() }
  const flip = async (it) => {
    try { await api(`/api/admin/content/item/${it.id}`, { method: 'PATCH', body: { status: it.status === 'published' ? 'draft' : 'published' } }); toast(it.status === 'published' ? 'Unpublished: hidden from the website' : 'Published: live on the website'); refresh() } catch (e) { toast(e.message, 'error') }
  }
  const move = async (index, delta) => {
    const ids = all.map((i) => i.id)
    const [id] = ids.splice(index, 1)
    ids.splice(index + delta, 0, id)
    try { await api(`/api/admin/content/${spec.kind}/order`, { method: 'PUT', body: { ids } }); toast('Order saved'); items.reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${del.id}`, { method: 'DELETE' }); toast('Deleted. Any pictures it used stay in the media library.'); setDel(null); refresh() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const duplicate = async (it) => {
    try { await api(`/api/admin/content/${spec.kind}`, { method: 'POST', body: { title: `${it.title} (copy)`.slice(0, 200), data: it.data || {}, status: 'draft', sort_order: (it.sort_order || 0) + 1 } }); toast('Copied as a draft. Edit it, then publish.'); refresh() }
    catch (e) { toast(e.fields ? 'This item cannot be copied as it is (it needs a unique address or key). Create a new one instead.' : e.message, 'error') }
  }
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allShownPicked = shown.length > 0 && shown.every((it) => picked.has(it.id))
  const runBulk = async (action) => {
    const chosen = all.filter((it) => picked.has(it.id))
    setBulk(action)
    let ok = 0
    let failed = 0
    for (const it of chosen) {
      try {
        if (action === 'delete') await api(`/api/admin/content/item/${it.id}`, { method: 'DELETE' })
        else await api(`/api/admin/content/item/${it.id}`, { method: 'PATCH', body: { status: action } })
        ok += 1
      } catch { failed += 1 }
    }
    setBulk('')
    setBulkDelete(false)
    setPicked(new Set())
    toast(`${ok} item${ok === 1 ? '' : 's'} ${action === 'delete' ? 'deleted' : action === 'published' ? 'published' : 'unpublished'}${failed ? `, ${failed} could not be changed` : ''}`, failed ? 'error' : undefined)
    refresh()
  }
  const canAdd = !(spec.single && all.length)
  const previewUrl = spec.preview_path ? `${spec.preview_path.split('#')[0]}?cms_preview=1${spec.preview_path.includes('#') ? `#${spec.preview_path.split('#')[1]}` : ''}` : null

  return (
    <>
      <PageHeader title="Website content" lead="Manage every page of the public website. Drafts are private; publish when you are ready and the website updates for visitors. Anything you leave empty keeps the website's built-in content."
        actions={<>
          {previewUrl && <Btn onClick={() => window.open(previewUrl, '_blank')}><ExternalLink className="size-4" aria-hidden="true" /> Preview on the website</Btn>}
          {canAdd && <Btn kind="primary" onClick={() => setEdit({ item: null })}><Plus className="size-4" aria-hidden="true" /> New {spec.single ? '' : 'item'}</Btn>}
        </>} />
      <div role="tablist" aria-label="Area" className="mb-3 flex flex-wrap gap-2">
        {groups.map((g) => (
          <button key={g} role="tab" aria-selected={g === activeGroup} type="button" onClick={() => { setGroup(g); setKind(null) }}
            className={cx('min-h-10 rounded-lg px-4 text-sm font-semibold', g === activeGroup ? 'bg-primary text-white' : 'border border-edge bg-glass text-soft hover:text-fg')}>{g}</button>
        ))}
      </div>
      {inGroup.length > 1 && (
        <div role="tablist" aria-label="Content type" className="mb-4 flex flex-wrap gap-2">
          {inGroup.map((k) => (
            <button key={k.kind} role="tab" aria-selected={k.kind === spec.kind} type="button" onClick={() => setKind(k.kind)}
              className={cx('min-h-9 rounded-full px-3.5 text-sm font-medium', k.kind === spec.kind ? 'bg-glass-strong text-fg ring-1 ring-lav' : 'border border-edge text-soft hover:text-fg')}>
              {k.label} <span className="ml-1 opacity-80">({counts[k.kind].published}/{counts[k.kind].published + counts[k.kind].draft})</span>
            </button>
          ))}
        </div>
      )}
      {productFilter && <p className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-lav bg-glass px-3 py-2 text-sm">Showing only <strong>{productFilter}</strong>. New items are added to this product.<button type="button" className="font-semibold text-lav hover:underline" onClick={() => setParams({ kind: spec.kind }, { replace: true })}>Show all</button><Link to="/company-admin/products" className="font-semibold text-lav hover:underline">Back to Products</Link></p>}
      <p className="mb-4 text-sm text-soft"><strong className="text-fg">{spec.label}.</strong> {spec.help} <span className="whitespace-nowrap">(published / total: {counts[spec.kind].published}/{total})</span></p>

      {!spec.single && total > 0 && (
        <div className="mb-3 flex flex-wrap items-end gap-3" role="search" aria-label={`Search ${spec.label}`}>
          <Field label="Search" className="min-w-[14rem] flex-1">{(p) => <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-soft" aria-hidden="true" /><Input {...p} className="pl-9" placeholder="Search by title or text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div>}</Field>
          <Field label="Status">{(p) => <Select {...p} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}><option value="all">All</option><option value="published">Published</option><option value="draft">Drafts</option></Select>}</Field>
          {filtering && <Btn kind="ghost" onClick={() => { setQ(''); setStatusFilter('all') }}>Clear filters</Btn>}
        </div>
      )}
      {picked.size > 0 && (
        <div role="region" aria-label="Bulk actions" className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-lav bg-glass px-4 py-2.5 text-sm">
          <strong>{picked.size} selected</strong>
          <Btn loading={bulk === 'published'} onClick={() => runBulk('published')}><Eye className="size-4" aria-hidden="true" /> Publish</Btn>
          <Btn loading={bulk === 'draft'} onClick={() => runBulk('draft')}><EyeOff className="size-4" aria-hidden="true" /> Unpublish</Btn>
          <Btn kind="danger" onClick={() => setBulkDelete(true)}><Trash2 className="size-4" aria-hidden="true" /> Delete</Btn>
          <Btn kind="ghost" onClick={() => setPicked(new Set())}>Clear selection</Btn>
        </div>
      )}
      <Card className="!p-0">
        {items.error && !items.data && <div className="p-4"><ErrorState error={items.error} onRetry={items.reload} /></div>}
        {items.loading && !items.data && <div className="px-4"><Spinner /></div>}
        {items.data && (all.length === 0 ? <EmptyState title={`No ${spec.label.toLowerCase()} yet`}>Create one to start managing it here. Until then the website shows its built-in content.</EmptyState> :
          list.length === 0 ? <EmptyState title="Nothing matches">Try a different search or clear the filters.</EmptyState> : (
            <>
              {!spec.single && list.length > 1 && (
                <div className="flex items-center gap-3 border-b border-edge px-4 py-2 text-sm text-soft">
                  <label className="inline-flex min-h-9 cursor-pointer items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={allShownPicked} onChange={() => setPicked((s) => { const n = new Set(s); shown.forEach((it) => (allShownPicked ? n.delete(it.id) : n.add(it.id))); return n })} />Select all on this page</label>
                  <span className="ml-auto">{filtering ? `${list.length} of ${all.length} shown` : `${all.length} item${all.length === 1 ? '' : 's'}`}</span>
                </div>
              )}
              <ul className="divide-y divide-edge">
                {shown.map((it) => {
                  const i = all.findIndex((x) => x.id === it.id)
                  return (
                    <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {!spec.single && list.length > 1 && <input type="checkbox" className="size-4 shrink-0 accent-[var(--color-primary)]" checked={picked.has(it.id)} onChange={() => toggle(it.id)} aria-label={`Select ${it.title}`} />}
                        {!spec.single && all.length > 1 && !filtering && (
                          <span className="flex flex-col">
                            <Btn kind="ghost" className="!min-h-7 !px-1.5" aria-label={`Move ${it.title} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" aria-hidden="true" /></Btn>
                            <Btn kind="ghost" className="!min-h-7 !px-1.5" aria-label={`Move ${it.title} down`} disabled={i === all.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" aria-hidden="true" /></Btn>
                          </span>
                        )}
                        <div className="min-w-0"><p className="truncate font-semibold">{it.title}</p><p className="text-xs text-soft">Updated {fmtDate(it.updated_at)}{!spec.single && ` · position ${i + 1}`}{it.data?.enabled === false && ' · hidden'}{it.data?.open === false && ' · closed'}{it.data?.active === false && ' · inactive'}</p></div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge value={it.status} />
                        <Btn onClick={() => flip(it)}>{it.status === 'published' ? <><EyeOff className="size-4" aria-hidden="true" /> Unpublish</> : <><Eye className="size-4" aria-hidden="true" /> Publish</>}</Btn>
                        <Btn onClick={() => setEdit({ item: it })} aria-label={`Edit ${it.title}`}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn>
                        {!spec.single && <Btn kind="ghost" onClick={() => duplicate(it)} aria-label={`Duplicate ${it.title}`} title="Copy as a draft"><Copy className="size-4" aria-hidden="true" /></Btn>}
                        <Btn kind="danger" onClick={() => setDel(it)} aria-label={`Delete ${it.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {pages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-edge px-4 py-3 text-sm">
                  <span className="text-soft">Page {Math.min(page, pages)} of {pages}</span>
                  <span className="flex gap-2"><Btn disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn><Btn disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Btn></span>
                </div>
              )}
            </>
          ))}
      </Card>
      {edit && <Editor key={edit.item?.id || 'new'} spec={spec} item={edit.item} preset={productFilter ? { product: productFilter } : {}} onClose={() => setEdit(null)} onSaved={refresh} />}
      <ConfirmDialog open={!!del} title="Delete this item?" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>“{del?.title}” will be removed permanently and disappear from the website. Pictures and videos it used stay in the media library. Consider unpublishing instead if you may need it again.</ConfirmDialog>
      <ConfirmDialog open={bulkDelete} title={`Delete ${picked.size} item${picked.size === 1 ? '' : 's'}?`} busy={bulk === 'delete'} onClose={() => setBulkDelete(false)} onConfirm={() => runBulk('delete')}>The selected items will be removed permanently and disappear from the website. Pictures and videos they used stay in the media library. Consider unpublishing instead.</ConfirmDialog>
    </>
  )
}
