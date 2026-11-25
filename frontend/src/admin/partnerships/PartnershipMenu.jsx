import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Badge, Btn, Card, ConfirmDialog, ErrorState, Field, Input, Modal, PageHeader, Spinner, Textarea, Toggle, useFetch, useToast } from '../ui.jsx'

const menuApi = (path = '', o = {}) => api(`/api/admin/partnerships/menu${path}`, { timeoutMs: 20000, ...o })
const PATH = { franchise: '/franchise', 'authorized-partner': '/authorized-partner', 'referral-partner': '/referral-partner' }
const slugify = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

/** Admin > Partnerships > Navigation menu: the divisions / services shown under each Partner With Us program in the website header (and on the category pages and the application form). */
export function PtMenu() {
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => menuApi())
  const [cat, setCat] = useState('franchise')
  const [rows, setRows] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [edit, setEdit] = useState(null) // { index | null, slug, label, description, builtin }
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const current = data?.categories.find((c) => c.slug === cat)
  useEffect(() => { if (current) { setRows(current.items.map((i) => ({ slug: i.slug, label: i.label, description: i.description || '', enabled: i.enabled, builtin: i.builtin }))); setDirty(false) } }, [data, cat]) // eslint-disable-line react-hooks/exhaustive-deps
  if (loading && !data) return <Spinner />
  if (error && !data) return <ErrorState error={error} onRetry={reload} />
  if (!rows) return null

  const change = (next) => { setRows(next); setDirty(true) }
  const move = (i, d) => { const n = [...rows]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; change(n) }
  const patch = (i, p) => change(rows.map((r, k) => (k === i ? { ...r, ...p } : r)))
  const switchCat = (c) => { if (dirty && !window.confirm('Discard the unsaved changes to this menu?')) return; setCat(c) }
  const save = async () => {
    setBusy(true)
    try {
      await menuApi(`/${cat}`, { method: 'PUT', body: { items: rows.map((r) => ({ slug: r.slug, label: r.label, description: r.description || null, enabled: r.enabled })) } })
      toast('Menu saved. The website shows it within a few minutes.'); reload()
    } catch (e) { toast(e.fields ? Object.values(e.fields)[0] : e.message, 'error') } finally { setBusy(false) }
  }
  const commit = () => {
    const label = edit.label.trim()
    const slug = edit.index == null ? (edit.slug || slugify(label)) : edit.slug
    if (label.length < 2) return toast('Enter a name of at least 2 characters.', 'error')
    if (edit.index == null) {
      if (rows.length >= data.max_items) return toast(`A menu can have at most ${data.max_items} entries.`, 'error')
      if (rows.some((r) => r.slug === slug)) return toast('An entry with that page address already exists.', 'error')
      if (!/^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/.test(slug)) return toast('The page address needs lowercase letters, numbers and hyphens (at least 2 characters).', 'error')
      change([...rows, { slug, label, description: edit.description.trim(), enabled: true, builtin: false }])
    } else patch(edit.index, { label, description: edit.description.trim() })
    setEdit(null)
  }

  return (
    <>
      <PageHeader title="Partner With Us menu" lead="The dropdown under the Partner With Us button in the website header. Each program lists its business divisions or services; every entry opens its own page." actions={<Btn kind="primary" loading={busy} disabled={!dirty} onClick={save}>Save changes</Btn>} />
      <div role="tablist" aria-label="Partnership program" className="mb-4 flex flex-wrap gap-2">
        {data.categories.map((c) => <button key={c.slug} type="button" role="tab" aria-selected={c.slug === cat} onClick={() => switchCat(c.slug)} className={`min-h-10 rounded-full px-4 text-sm font-semibold ${c.slug === cat ? 'bg-primary text-white' : 'border border-edge text-soft hover:bg-glass'}`}>{c.label}</button>)}
      </div>
      <Card className="!p-0">
        <ul className="divide-y divide-edge">
          {rows.map((r, i) => (
            <li key={r.slug} className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex flex-col">
                <button type="button" aria-label={`Move ${r.label} up`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 text-soft hover:text-fg disabled:opacity-30"><ArrowUp className="size-4" aria-hidden="true" /></button>
                <button type="button" aria-label={`Move ${r.label} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 text-soft hover:text-fg disabled:opacity-30"><ArrowDown className="size-4" aria-hidden="true" /></button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">{r.label}{r.builtin && <Badge value="draft" text="Built-in" />}{!r.enabled && <Badge value="draft" text="Hidden" />}</p>
                <p className="truncate text-xs text-soft">{PATH[cat]}/{r.slug}{r.description ? ` · ${r.description}` : ''}</p>
              </div>
              <Toggle checked={r.enabled} onChange={(on) => patch(i, { enabled: on })} label="Show in menu" />
              <a href={`${PATH[cat]}/${r.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${r.label} page`} className="rounded p-2 text-soft hover:text-fg"><ExternalLink className="size-4" aria-hidden="true" /></a>
              <Btn onClick={() => setEdit({ index: i, slug: r.slug, label: r.label, description: r.description, builtin: r.builtin })} aria-label={`Edit ${r.label}`}><Pencil className="size-4" aria-hidden="true" /></Btn>
              {!r.builtin && <Btn kind="danger" onClick={() => setDel(i)} aria-label={`Remove ${r.label}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge p-4">
          <Btn onClick={() => setEdit({ index: null, slug: '', label: '', description: '', builtin: false })} disabled={rows.length >= data.max_items}><Plus className="size-4" aria-hidden="true" />Add division or service</Btn>
          <span className="text-xs text-soft">{rows.length} of {data.max_items} entries{dirty ? ' · unsaved changes' : ''}</span>
        </div>
      </Card>
      <p className="mt-3 text-xs text-soft">{data.note} Built-in divisions can be hidden or renamed but not removed.</p>

      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.index == null ? 'Add division or service' : 'Edit entry'} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn kind="primary" onClick={commit}>{edit.index == null ? 'Add to menu' : 'Apply'}</Btn></>}>
          <div className="space-y-4">
            <Field label="Name shown in the menu" required>{(p) => <Input {...p} maxLength={60} value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />}</Field>
            {edit.index == null && <Field label="Page address" hint={`${PATH[cat]}/… Lowercase letters, numbers and hyphens. It cannot be changed later. Leave empty to create it from the name.`}>{(p) => <Input {...p} maxLength={40} placeholder={slugify(edit.label) || 'healthcare-training'} value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value.toLowerCase() })} />}</Field>}
            <Field label="Short description (optional)" hint="Shown on the program page and used as the page summary. Plain text.">{(p) => <Textarea {...p} maxLength={300} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />}</Field>
          </div>
        </Modal>
      )}
      <ConfirmDialog open={del != null} title="Remove this entry?" onClose={() => setDel(null)} onConfirm={() => { change(rows.filter((_, k) => k !== del)); setDel(null) }}>
        {del != null && `“${rows[del].label}” and its page content, FAQs and policies are deleted when you press Save changes. Applications already received are kept.`}
      </ConfirmDialog>
    </>
  )
}
