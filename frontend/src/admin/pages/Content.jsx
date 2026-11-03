import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { MediaField } from '../MediaPicker.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, Toggle, cx, fmtDate, useFetch, useToast } from '../ui.jsx'

function FieldInput({ f, value, onChange, props }) {
  if (f.type === 'bool') return <Toggle checked={!!value} onChange={(v) => onChange({ target: { value: v } })} label={value ? 'On' : 'Off'} />
  if (f.type === 'image' || f.type === 'video') return <MediaField {...props} kind={f.type} value={value} onChange={(v) => onChange({ target: { value: v } })} />
  if (f.type === 'textarea') return <Textarea {...props} maxLength={f.max} value={value} onChange={onChange} />
  if (f.type === 'select') return <Select {...props} value={value} onChange={onChange}><option value="">Select…</option>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
  return <Input {...props} maxLength={f.max} value={value} onChange={onChange} />
}

/** A quick look at the content as entered. The exact result, in the real design, is one click away ("Preview on the website"). */
function Preview({ spec, title, data }) {
  const shown = spec.fields.filter((f) => f.type !== 'image' && f.type !== 'video' && data[f.name] !== '' && data[f.name] !== undefined && data[f.name] !== false)
  const label = (f, v) => (f.type === 'select' ? (f.options.find((o) => o.value === v)?.label || v) : f.type === 'bool' ? 'Yes' : v)
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

function Editor({ spec, item, onClose, onSaved }) {
  const toast = useToast()
  const [title, setTitle] = useState(item?.title || '')
  const initial = () => Object.fromEntries(spec.fields.map((f) => [f.name, item?.data?.[f.name] ?? (f.type === 'bool' ? (f.default ?? false) : f.type === 'select' && f.name === 'group' ? 'home' : '')]))
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

export default function Content() {
  const toast = useToast()
  const meta = useFetch(() => api('/api/admin/content/kinds'), [])
  const [group, setGroup] = useState(null)
  const [kind, setKind] = useState(null)
  const items = useFetch(() => (kind ? api(`/api/admin/content/${kind}`) : Promise.resolve([])), [kind])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const kinds = meta.data?.kinds || []
  const groups = meta.data?.groups || []
  const activeGroup = group || groups[0]
  const inGroup = useMemo(() => kinds.filter((k) => k.group === activeGroup), [kinds, activeGroup])
  const spec = kinds.find((k) => k.kind === kind) || inGroup[0]
  if (meta.loading && !meta.data) return <Spinner />
  if (meta.error && !meta.data) return <ErrorState error={meta.error} onRetry={meta.reload} />
  if (!spec) return <Card><EmptyState title="Nothing to manage">Your account has no website-content modules. A super admin can grant them.</EmptyState></Card>
  if (kind !== spec.kind) setTimeout(() => setKind(spec.kind), 0)
  const counts = meta.data.counts
  const list = items.data || []

  const flip = async (it) => {
    try { await api(`/api/admin/content/item/${it.id}`, { method: 'PATCH', body: { status: it.status === 'published' ? 'draft' : 'published' } }); toast(it.status === 'published' ? 'Unpublished: hidden from the website' : 'Published: live on the website'); items.reload(); meta.reload() } catch (e) { toast(e.message, 'error') }
  }
  const move = async (index, delta) => {
    const ids = list.map((i) => i.id)
    const [id] = ids.splice(index, 1)
    ids.splice(index + delta, 0, id)
    try { await api(`/api/admin/content/${spec.kind}/order`, { method: 'PUT', body: { ids } }); toast('Order saved'); items.reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${del.id}`, { method: 'DELETE' }); toast('Deleted. Any pictures it used stay in the media library.'); setDel(null); items.reload(); meta.reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const canAdd = !(spec.single && list.length)
  const previewUrl = spec.preview_path ? `${spec.preview_path}?cms_preview=1` : null

  return (
    <>
      <PageHeader title="Website content" lead="Manage the content of the public website. Drafts are private; publish when you are ready and the website updates for visitors. Anything you leave empty keeps the website's built-in content."
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
      <p className="mb-4 text-sm text-soft"><strong className="text-fg">{spec.label}.</strong> {spec.help} <span className="whitespace-nowrap">(published / total: {counts[spec.kind].published}/{counts[spec.kind].published + counts[spec.kind].draft})</span></p>
      <Card className="!p-0">
        {items.error && !items.data && <div className="p-4"><ErrorState error={items.error} onRetry={items.reload} /></div>}
        {items.loading && !items.data && <div className="px-4"><Spinner /></div>}
        {items.data && (list.length === 0 ? <EmptyState title={`No ${spec.label.toLowerCase()} yet`}>Create one to start managing it here. Until then the website shows its built-in content.</EmptyState> :
          <ul className="divide-y divide-edge">
            {list.map((it, i) => (
              <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {!spec.single && list.length > 1 && (
                    <span className="flex flex-col">
                      <Btn kind="ghost" className="!min-h-7 !px-1.5" aria-label={`Move ${it.title} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" aria-hidden="true" /></Btn>
                      <Btn kind="ghost" className="!min-h-7 !px-1.5" aria-label={`Move ${it.title} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" aria-hidden="true" /></Btn>
                    </span>
                  )}
                  <div className="min-w-0"><p className="truncate font-semibold">{it.title}</p><p className="text-xs text-soft">Updated {fmtDate(it.updated_at)}{!spec.single && ` · position ${i + 1}`}{it.data?.enabled === false && ' · hidden'}{it.data?.open === false && ' · closed'}</p></div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge value={it.status} />
                  <Btn onClick={() => flip(it)}>{it.status === 'published' ? <><EyeOff className="size-4" aria-hidden="true" /> Unpublish</> : <><Eye className="size-4" aria-hidden="true" /> Publish</>}</Btn>
                  <Btn onClick={() => setEdit({ item: it })} aria-label={`Edit ${it.title}`}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn>
                  <Btn kind="danger" onClick={() => setDel(it)} aria-label={`Delete ${it.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {edit && <Editor key={edit.item?.id || 'new'} spec={spec} item={edit.item} onClose={() => setEdit(null)} onSaved={() => { items.reload(); meta.reload() }} />}
      <ConfirmDialog open={!!del} title="Delete this item?" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>“{del?.title}” will be removed permanently and disappear from the website. Pictures and videos it used stay in the media library. Consider unpublishing instead if you may need it again.</ConfirmDialog>
    </>
  )
}
