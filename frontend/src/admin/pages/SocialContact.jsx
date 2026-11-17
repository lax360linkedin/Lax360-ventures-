import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import ChannelIcon, { GENERIC_ICONS } from '../../components/layout/ChannelIcon.jsx'
import { BRAND_COLOR } from '../../components/layout/SocialIcon.jsx'
import { Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, Toggle, cx, useFetch, useToast } from '../ui.jsx'

const SHORT = { header: 'Header', footer: 'Footer', contact: 'Contact page', social_band: 'Stay connected', detail: 'Details section' }
const TYPE_HELP = {
  phone: ['+91 95666 79928', 'A number people can call. It becomes a tap-to-call link.'],
  whatsapp: ['+91 95666 79928', 'With the country code. It becomes a WhatsApp chat link.'],
  email: ['hello@yourcompany.com', 'It becomes a tap-to-email link.'],
  website: ['https://www.example.com', 'The full https:// address of the website.'],
  address: ['1st Floor, CPS Tower\nSalem, Tamil Nadu – 636004', 'One line per row, as it should appear.'],
  branch: ['+91 95666 79928', 'The branch’s phone number or email. Put the branch name in “Name”.'],
  enquiry: ['sales@yourcompany.com', 'An email, phone number or page for business enquiries.'],
  other: ['https://example.com/book-a-call', 'A web page, mailto: or tel: link.'],
}
const NEEDS_NAME = new Set(['custom', 'other', 'branch', 'enquiry'])

/** One item as the website will draw it in a place: the same icon and text the header / footer / Contact page use. */
function Chip({ c, place }) {
  const brand = c.kind === 'social' ? BRAND_COLOR[c.type] : undefined
  if (place === 'header' || place === 'social_band') {
    return (
      <span className={cx('inline-flex items-center gap-1.5 rounded-full border border-edge px-2.5 py-1 text-xs', c.kind === 'social' && 'size-8 justify-center !p-0')} title={c.label}>
        <span style={brand ? { color: brand } : undefined} className={brand ? '' : 'text-lav'}><ChannelIcon channel={c} className="size-3.5" /></span>
        {c.kind === 'contact' && <span className="max-w-40 truncate">{c.type === 'whatsapp' ? 'WhatsApp' : c.value}</span>}
      </span>
    )
  }
  if (c.kind === 'social') {
    return <span className="grid size-9 place-items-center rounded-full border border-edge-strong bg-glass text-soft" title={c.label}><ChannelIcon channel={c} className="size-4" /></span>
  }
  return (
    <span className="flex items-center gap-2.5 rounded-xl border border-edge p-1.5 pr-3 text-xs">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/20 text-lav"><ChannelIcon channel={c} className="size-4" /></span>
      <span className="min-w-0"><span className="block text-[0.6rem] font-bold uppercase tracking-wider text-soft">{c.label}{c.note ? ` · ${c.note}` : ''}</span><span className="block max-w-56 truncate font-semibold">{c.type === 'whatsapp' ? 'Chat with us' : c.value}</span></span>
    </span>
  )
}

/** Live preview: the enabled items as each place on the website will show them, in the order of the list. */
function LivePreview({ items, kind, owner }) {
  const places = owner ? ['detail'] : kind === 'social' ? ['header', 'footer', 'contact', 'social_band'] : ['header', 'footer', 'contact']
  const [place, setPlace] = useState(places[0])
  const shown = items.filter((c) => c.is_active && c.kind === kind && c.locations.includes(place))
  return (
    <Card className="!p-4">
      <h2 className="font-display text-lg font-semibold">Live preview</h2>
      <p className="mb-3 text-xs text-soft">{owner ? `How the enabled items look in the ${owner.label} section of the website, in the order of the list.` : 'How the enabled items look in each place, in the order of the list.'} Changes reach the website as soon as they are saved.</p>
      <div role="tablist" aria-label="Preview place" className="mb-3 flex flex-wrap gap-1.5">
        {places.map((p) => <button key={p} role="tab" aria-selected={place === p} onClick={() => setPlace(p)} className={cx('rounded-full border px-3 py-1 text-xs font-semibold transition-colors', place === p ? 'border-primary bg-primary/20' : 'border-edge hover:border-edge-strong')}>{owner ? `${owner.label} details` : SHORT[p]}</button>)}
      </div>
      <div className="min-h-20 rounded-xl border border-dashed border-edge-strong p-3">
        {shown.length ? <div className="flex flex-wrap items-center gap-2">{shown.map((c) => <Chip key={c.id} c={c} place={place} />)}</div> : <p className="text-sm text-soft">Nothing is shown here. {owner ? 'Add an item and switch it on.' : `Switch an item on and tick “${SHORT[place]}”.`}</p>}
      </div>
    </Card>
  )
}

function ItemForm({ kind, item, catalog, owner, onClose, onSaved }) {
  const toast = useToast()
  const types = kind === 'social' ? catalog.platforms : catalog.contact_types
  const places = owner ? [{ value: 'detail', label: `${owner.label} details section` }] : kind === 'social' ? catalog.social_locations : catalog.contact_locations
  const [v, setV] = useState(() => (item
    ? { type: item.type, label: item.label, value: item.value, note: item.note || '', detail: item.detail || '', icon: item.icon || 'globe', locations: item.locations, is_active: item.is_active }
    : { type: types[0].value, label: '', value: '', note: '', detail: '', icon: 'globe', locations: owner ? ['detail'] : kind === 'social' ? ['footer'] : ['contact'], is_active: true }))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: undefined })) }
  const known = types.find((t) => t.value === v.type)
  const needsName = NEEDS_NAME.has(v.type)
  const place = (kind === 'social' ? ['Profile or channel link', `https://www.${known?.hosts?.[0] || 'example.com'}/your-page`] : TYPE_HELP[v.type] || ['', ''])
  const preview = { id: 'preview', kind, type: v.type, label: v.label || known?.label || '', value: v.value || place[0].split('\n')[0], note: v.note, icon: v.icon, detail: v.detail }
  const toggle = (p) => setV((s) => ({ ...s, locations: s.locations.includes(p) ? s.locations.filter((x) => x !== p) : [...s.locations, p] }))
  const save = async () => {
    setBusy(true)
    setErrors({})
    const body = { ...(owner ? { owner_type: owner.type, owner_ref: owner.ref } : {}), kind, type: v.type, label: v.label, value: v.value, note: v.note, detail: v.detail, icon: v.type === 'custom' || v.type === 'other' ? v.icon : null, locations: v.locations, is_active: v.is_active, sort_order: item?.sort_order || 0 }
    try {
      await (item ? api(`/api/admin/channels/${item.id}`, { method: 'PUT', body }) : api('/api/admin/channels', { method: 'POST', body }))
      toast(v.is_active ? 'Saved: it is live on the website' : 'Saved as disabled: visitors cannot see it')
      onSaved()
      onClose()
    } catch (e) { setErrors(e.fields || {}); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error') } finally { setBusy(false) }
  }
  const title = item ? `Edit ${item.label}` : kind === 'social' ? 'Add new social media' : 'Add contact detail'
  return (
    <Modal open wide onClose={onClose} title={title} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={save}>{v.is_active ? 'Save and publish' : 'Save (disabled)'}</Btn></>}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Field label={kind === 'social' ? 'Platform' : 'Type'} required error={errors.type}>
            {(p) => <Select {...p} value={v.type} onChange={set('type')}>{types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>}
          </Field>
          <Field label={needsName ? 'Name shown to visitors' : 'Name (optional)'} required={needsName} error={errors.label} hint={needsName ? (kind === 'social' ? 'For example Our blog.' : 'For example Salem branch or Sales enquiries.') : `Leave empty to use “${known?.label}”.`}>
            {(p) => <Input {...p} maxLength={120} value={v.label} onChange={set('label')} placeholder={known?.label} />}
          </Field>
          <Field label={kind === 'social' ? 'Profile / channel URL' : v.type === 'address' ? 'Address' : 'Value'} required error={errors.value} hint={kind === 'social' ? (v.type === 'whatsapp' ? 'A wa.me link, or just the number with its country code.' : v.type === 'custom' ? 'Any full https:// address.' : `Must be a ${known?.label} address.`) : place[1]}>
            {(p) => (kind === 'contact' && v.type === 'address' ? <Textarea {...p} rows={4} maxLength={600} value={v.value} onChange={set('value')} placeholder={place[0]} /> : <Input {...p} maxLength={500} value={v.value} onChange={set('value')} placeholder={place[0]} />)}
          </Field>
          {kind === 'contact' && v.type !== 'address' && <Field label="Short caption (optional)" error={errors.note} hint="Shown beside the value, for example Salem & Bangalore.">{(p) => <Input {...p} maxLength={160} value={v.note} onChange={set('note')} />}</Field>}
          {kind === 'contact' && ['branch', 'enquiry', 'other'].includes(v.type) && <Field label="More details (optional)" error={errors.detail} hint="For example the branch address or the hours to call.">{(p) => <Textarea {...p} rows={3} maxLength={600} value={v.detail} onChange={set('detail')} />}</Field>}
          {(v.type === 'custom' || v.type === 'other') && (
            <Field label="Icon" error={errors.icon} hint="A custom platform has no official icon, so pick one that fits.">
              {(p) => <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon" id={p.id}>{catalog.icons.map((name) => { const G = GENERIC_ICONS[name]; return <button key={name} type="button" role="radio" aria-checked={v.icon === name} aria-label={name} title={name} onClick={() => setV((s) => ({ ...s, icon: name }))} className={cx('grid size-9 place-items-center rounded-lg border transition-colors', v.icon === name ? 'border-primary bg-primary/20' : 'border-edge hover:border-edge-strong')}><G className="size-4" aria-hidden="true" /></button> })}</div>}
            </Field>
          )}
          {!owner && <fieldset>
            <legend className="mb-1 text-sm font-semibold">Show it in</legend>
            <div className="grid gap-1.5">
              {places.map((p) => (
                <label key={p.value} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg border border-edge px-3 text-sm hover:border-edge-strong">
                  <input type="checkbox" className="size-4 accent-[rgb(var(--primary))]" checked={v.locations.includes(p.value)} onChange={() => toggle(p.value)} />{p.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-soft">The same item can appear in several places at once.</p>
            {errors.locations && <p role="alert" className="mt-1 text-xs font-medium text-error">{errors.locations}</p>}
          </fieldset>}
          {owner && <p className="rounded-lg border border-edge p-2.5 text-xs text-soft">These belong only to <strong>{owner.label}</strong> and appear in its own section of the website. They are separate from the LAX360 links.</p>}
          <Toggle checked={v.is_active} onChange={(on) => setV((s) => ({ ...s, is_active: on }))} label="Enabled (visible on the website)" />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Preview</h3>
          <div className="space-y-3 rounded-xl border border-edge p-3">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary/20 text-lav"><ChannelIcon channel={preview} className="size-5" /></span><div className="min-w-0"><p className="font-display text-lg font-semibold">{preview.label || 'Name'}</p><p className="truncate text-sm text-soft">{v.value || 'Value'}</p></div></div>
            {places.map((p) => (
              <div key={p.value} className={cx('rounded-lg border border-dashed p-2.5', v.locations.includes(p.value) && v.is_active ? 'border-edge-strong' : 'border-edge opacity-50')}>
                <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-soft">{p.label}{!(v.locations.includes(p.value) && v.is_active) && ' · not shown'}</p>
                <Chip c={preview} place={p.value} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-soft">The platform icon is matched automatically. Nothing changes on the website until you save.</p>
        </div>
      </div>
    </Modal>
  )
}

function Row({ c, i, last, dragging, over, handlers, onMove, onToggle, onEdit, onDelete, locationLabels }) {
  return (
    <li draggable {...handlers} className={cx('rounded-xl border bg-glass p-3 transition-colors', over ? 'border-lav' : 'border-edge', dragging && 'opacity-40', !c.is_active && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="cursor-grab text-soft active:cursor-grabbing" aria-hidden="true" title="Drag to re-order"><GripVertical className="size-5" /></span>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-lav"><ChannelIcon channel={c} className="size-5" /></span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate font-semibold">{c.label}{c.note && <span className="ml-2 text-xs font-normal text-soft">{c.note}</span>}</p>
          <p className="truncate text-sm text-soft">{c.value.split('\n')[0]}</p>
          <p className="mt-1 flex flex-wrap gap-1">{c.locations.length ? c.locations.map((l) => <span key={l} className="rounded-full border border-edge-strong px-2 py-0.5 text-[0.7rem] font-semibold">{locationLabels[l] || SHORT[l]}</span>) : <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-600 dark:text-amber-300">Not shown anywhere</span>}</p>
        </div>
        <div className="flex items-center gap-1">
          <Btn kind="ghost" className="!min-h-8 !px-2" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={`Move ${c.label} up`}><ArrowUp className="size-4" aria-hidden="true" /></Btn>
          <Btn kind="ghost" className="!min-h-8 !px-2" disabled={last} onClick={() => onMove(i, 1)} aria-label={`Move ${c.label} down`}><ArrowDown className="size-4" aria-hidden="true" /></Btn>
        </div>
        <Toggle checked={c.is_active} onChange={() => onToggle(c)} label={<span className="sr-only">{c.is_active ? `Disable ${c.label}` : `Enable ${c.label}`}</span>} />
        <Btn onClick={() => onEdit(c)} aria-label={`Edit ${c.label}`}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn>
        <Btn kind="danger" onClick={() => onDelete(c)} aria-label={`Delete ${c.label}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
      </div>
    </li>
  )
}

/**
 * Social media & contact details: ONE list the whole website reads. Each item has a platform / type with its matched icon, a value, an on / off switch, an order (drag it, or use the arrows)
 * and the places it is shown (header, footer, Contact page, the "Stay connected" section). Saved to the database: no code change is needed and the website follows at once.
 */
export default function SocialContact({ owner = null }) {
  const toast = useToast()
  const q = useFetch(() => api(owner ? `/api/admin/channels?owner_type=${owner.type}&owner_ref=${encodeURIComponent(owner.ref)}` : '/api/admin/channels'), [owner?.type, owner?.ref])
  const [tab, setTab] = useState('social')
  const [items, setItems] = useState([])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState({ from: null, over: null })
  useEffect(() => { if (q.data) setItems(q.data.items) }, [q.data])
  const labels = useMemo(() => Object.fromEntries([...(q.data?.social_locations || []), ...(q.data?.contact_locations || [])].map((l) => [l.value, SHORT[l.value] || l.label])), [q.data])
  if (q.loading && !q.data) return <Spinner />
  if (q.error && !q.data) return <ErrorState error={q.error} onRetry={q.reload} />
  const list = items.filter((c) => c.kind === tab)
  const counts = { social: items.filter((c) => c.kind === 'social').length, contact: items.filter((c) => c.kind === 'contact').length }

  const persist = async (next) => {
    const before = items
    setItems((all) => { const others = all.filter((c) => c.kind !== tab); return [...others, ...next].sort((a, b) => a.sort_order - b.sort_order) })
    try {
      const r = await api('/api/admin/channels/reorder', { method: 'POST', body: { ids: next.map((c) => c.id) } })
      setItems(r.items)
      toast('Order saved')
    } catch (e) { setItems(before); toast(e.message, 'error') }
  }
  const move = (i, d) => { const next = [...list]; const j = i + d; if (j < 0 || j >= next.length) return; [next[i], next[j]] = [next[j], next[i]]; persist(next) }
  const drop = (to) => {
    const from = drag.from
    setDrag({ from: null, over: null })
    if (from == null || from === to) return
    const next = [...list]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    persist(next)
  }
  const toggle = async (c) => {
    try {
      await api(`/api/admin/channels/${c.id}`, { method: 'PUT', body: { kind: c.kind, type: c.type, label: c.label, value: c.value, note: c.note || '', detail: c.detail || '', icon: c.icon, locations: c.locations, is_active: !c.is_active, sort_order: c.sort_order } })
      toast(c.is_active ? 'Disabled: hidden from the website' : 'Enabled: shown on the website')
      q.reload()
    } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/channels/${del.id}`, { method: 'DELETE' }); toast('Deleted'); setDel(null); q.reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const handlers = (i) => ({
    onDragStart: (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); setDrag({ from: i, over: null }) },
    onDragOver: (e) => { e.preventDefault(); if (drag.over !== i) setDrag((d) => ({ ...d, over: i })) },
    onDrop: (e) => { e.preventDefault(); drop(i) },
    onDragEnd: () => setDrag({ from: null, over: null }),
  })
  return (
    <>
      <PageHeader title={owner ? `${owner.label}: social media & contact` : 'Social media & contact'}
        lead={owner ? `The social media links and contact details of ${owner.label} only: they appear in its own section of the website and never mix with the LAX360 links or another ${owner.type}'s. Add, edit, delete, switch on or off, and drag to re-order. Changes appear on the website as soon as you save.` : 'Every social media link and contact detail of the website, in one place. Choose where each one appears (header, footer, Contact page, the “Stay connected” section), switch it on or off, and drag to re-order. Changes appear on the website as soon as you save: no code change is needed.'}
        actions={<><a href={owner?.viewPath || '/contact'} target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> View on the website</Btn></a><Btn kind="primary" onClick={() => setEdit({ item: null })}><Plus className="size-4" aria-hidden="true" /> {tab === 'social' ? 'Add new social media' : 'Add contact detail'}</Btn></>} />
      <div role="tablist" aria-label="Section" className="mb-4 flex gap-2">
        {[['social', 'Social media'], ['contact', 'Contact details']].map(([k, text]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors', tab === k ? 'border-primary bg-primary/20' : 'border-edge hover:border-edge-strong')}>
            {text}<span className="rounded-full bg-glass-strong px-2 text-xs">{counts[k]}</span>
          </button>
        ))}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          {list.length === 0 && <Card><EmptyState title={tab === 'social' ? 'No social media links yet' : 'No contact details yet'}>{tab === 'social' ? 'Add your first social media account.' : 'Add a phone number, email or address.'}</EmptyState></Card>}
          <ul className="space-y-2" aria-label={tab === 'social' ? 'Social media links' : 'Contact details'}>
            {list.map((c, i) => <Row key={c.id} c={c} i={i} last={i === list.length - 1} dragging={drag.from === i} over={drag.over === i && drag.from !== i} handlers={handlers(i)} onMove={move} onToggle={toggle} onEdit={(x) => setEdit({ item: x })} onDelete={setDel} locationLabels={labels} />)}
          </ul>
          {list.length > 1 && <p className="mt-2 text-xs text-soft">Drag a row by its handle, or use the arrows, to change the order. The order is the same in every place the item appears.</p>}
        </div>
        <div className="xl:sticky xl:top-4"><LivePreview items={items} kind={tab} owner={owner} /></div>
      </div>
      {edit && <ItemForm key={edit.item?.id || `new-${tab}`} kind={edit.item?.kind || tab} item={edit.item} catalog={q.data} owner={owner} onClose={() => setEdit(null)} onSaved={q.reload} />}
      <ConfirmDialog open={!!del} title="Delete this item?" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>
        “{del?.label}” will be removed from every place on the website. Consider “Disable” instead if you may need it again.
      </ConfirmDialog>
    </>
  )
}
