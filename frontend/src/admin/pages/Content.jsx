import { useState } from 'react'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, Toggle, cx, fmtDate, useFetch, useToast } from '../ui.jsx'

function FieldInput({ f, value, onChange, props }) {
  if (f.type === 'textarea') return <Textarea {...props} maxLength={f.max} value={value} onChange={onChange} />
  if (f.type === 'select') return <Select {...props} value={value} onChange={onChange}><option value="">Select…</option>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
  return <Input {...props} maxLength={f.max} value={value} onChange={onChange} />
}

/** Preview mirrors how the item will look on the site (text only). */
function Preview({ kind, title, data }) {
  if (kind === 'faq') return <div className="rounded-lg border border-edge p-3"><p className="font-semibold">{title || 'Question'}</p><p className="mt-1 text-sm text-soft">{data.answer || 'Answer'}</p></div>
  if (kind === 'project') return <div className="rounded-lg border border-edge p-3"><p className="text-xs uppercase text-lav">{data.division || 'division'}</p><p className="font-semibold">{title || 'Project title'}</p><p className="mt-1 text-sm text-soft">{data.summary || 'Summary'}</p></div>
  return (
    <div className="rounded-lg border border-edge p-3">
      <p className="font-display text-xl font-semibold">{[data.headline_1, data.headline_2, data.headline_3].filter(Boolean).map((l, i) => <span key={i} className="block">{l}</span>)}{!data.headline_1 && !data.headline_2 && !data.headline_3 && <span className="text-soft">Built-in headline</span>}</p>
      <p className="mt-2 text-sm text-soft">{data.lead || 'Built-in paragraph'}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-primary px-3 py-1.5 text-white">{data.cta_primary_label || 'Discuss Your Project'}</span><span className="rounded-full border border-edge-strong px-3 py-1.5">{data.cta_secondary_label || 'Explore Our Solutions'}</span></div>
    </div>
  )
}

function Editor({ spec, item, onClose, onSaved }) {
  const toast = useToast()
  const [title, setTitle] = useState(item?.title || '')
  const [data, setData] = useState(() => Object.fromEntries(spec.fields.map((f) => [f.name, item?.data?.[f.name] || (f.type === 'select' && f.name === 'group' ? 'home' : '')])))
  const [status, setStatus] = useState(item?.status || 'draft')
  const [order, setOrder] = useState(item?.sort_order ?? 0)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const effectiveTitle = spec.single ? spec.label : title

  const save = async () => {
    setBusy(true)
    setErrors({})
    const body = { title: effectiveTitle, data, status, sort_order: Number(order) || 0 }
    try {
      await (item ? api(`/api/admin/content/item/${item.id}`, { method: 'PATCH', body }) : api(`/api/admin/content/${spec.kind}`, { method: 'POST', body }))
      toast(status === 'published' ? 'Saved and published' : 'Saved as draft')
      onSaved()
      onClose()
    } catch (e) { setErrors(e.fields || {}); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} wide title={`${item ? 'Edit' : 'New'} — ${spec.label}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={save}>{status === 'published' ? 'Save & publish' : 'Save draft'}</Btn></>}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          {!spec.single && <Field label={spec.title_label || 'Title'} required error={errors.title}>{(p) => <Input {...p} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>}
          {spec.fields.map((f) => <Field key={f.name} label={f.label} required={f.required} hint={f.help} error={errors[f.name]}>{(p) => <FieldInput f={f} props={p} value={data[f.name]} onChange={(e) => setData({ ...data, [f.name]: e.target.value })} />}</Field>)}
          {!spec.single && <Field label="Display order" hint="Lower numbers come first."><Input type="number" min="0" max="100000" value={order} onChange={(e) => setOrder(e.target.value)} aria-label="Display order" /></Field>}
          <Toggle checked={status === 'published'} onChange={(on) => setStatus(on ? 'published' : 'draft')} label={status === 'published' ? 'Published (visible on the website)' : 'Draft (not visible)'} />
        </div>
        <div><h3 className="mb-2 text-sm font-semibold">Preview</h3><Preview kind={spec.kind} title={effectiveTitle} data={data} /><p className="mt-2 text-xs text-soft">A text preview of the content. The live page also applies the website's styling.</p></div>
      </div>
    </Modal>
  )
}

export default function Content() {
  const toast = useToast()
  const meta = useFetch(() => api('/api/admin/content/kinds'), [])
  const [kind, setKind] = useState('hero')
  const items = useFetch(() => api(`/api/admin/content/${kind}`), [kind])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  if (meta.loading && !meta.data) return <Spinner />
  if (meta.error && !meta.data) return <ErrorState error={meta.error} onRetry={meta.reload} />
  const spec = meta.data.kinds.find((k) => k.kind === kind)
  const counts = meta.data.counts

  const toggle = async (it) => {
    try { await api(`/api/admin/content/item/${it.id}`, { method: 'PATCH', body: { status: it.status === 'published' ? 'draft' : 'published' } }); toast(it.status === 'published' ? 'Unpublished' : 'Published'); items.reload(); meta.reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${del.id}`, { method: 'DELETE' }); toast('Deleted'); setDel(null); items.reload(); meta.reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const canAdd = !(spec.single && items.data?.length)

  return (
    <>
      <PageHeader title="Website content" lead="Edit the parts of the public website that are connected to this panel. Only published items are shown to visitors; if nothing is published, the website's built-in content is used."
        actions={canAdd && <Btn kind="primary" onClick={() => setEdit({ item: null })}><Plus className="size-4" aria-hidden="true" /> New {spec.single ? '' : 'item'}</Btn>} />
      <div role="tablist" aria-label="Content type" className="mb-4 flex flex-wrap gap-2">
        {meta.data.kinds.map((k) => (
          <button key={k.kind} role="tab" aria-selected={k.kind === kind} type="button" onClick={() => setKind(k.kind)}
            className={cx('min-h-10 rounded-lg px-4 text-sm font-semibold', k.kind === kind ? 'bg-primary text-white' : 'border border-edge bg-glass text-soft hover:text-fg')}>
            {k.label} <span className="ml-1 opacity-80">({counts[k.kind].published}/{counts[k.kind].published + counts[k.kind].draft})</span>
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-soft">{spec.help} <span className="whitespace-nowrap">(published / total)</span></p>
      <Card className="!p-0">
        {items.error && !items.data && <div className="p-4"><ErrorState error={items.error} onRetry={items.reload} /></div>}
        {items.loading && !items.data && <div className="px-4"><Spinner /></div>}
        {items.data && (items.data.length === 0 ? <EmptyState title={`No ${spec.label.toLowerCase()} yet`}>Create one to start managing it here. Until then the website shows its built-in content.</EmptyState> : (
          <ul className="divide-y divide-edge">
            {items.data.map((it) => (
              <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0"><p className="truncate font-semibold">{it.title}</p><p className="text-xs text-soft">Updated {fmtDate(it.updated_at)}{!spec.single && ` · order ${it.sort_order}`}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge value={it.status} />
                  <Btn onClick={() => toggle(it)}>{it.status === 'published' ? <><EyeOff className="size-4" aria-hidden="true" /> Unpublish</> : <><Eye className="size-4" aria-hidden="true" /> Publish</>}</Btn>
                  <Btn onClick={() => setEdit({ item: it })} aria-label={`Edit ${it.title}`}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn>
                  <Btn kind="danger" onClick={() => setDel(it)} aria-label={`Delete ${it.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                </div>
              </li>
            ))}
          </ul>
        ))}
      </Card>
      {edit && <Editor spec={spec} item={edit.item} onClose={() => setEdit(null)} onSaved={() => { items.reload(); meta.reload() }} />}
      <ConfirmDialog open={!!del} title="Delete this item?" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>“{del?.title}” will be removed permanently and disappear from the website. Consider unpublishing instead.</ConfirmDialog>
    </>
  )
}
