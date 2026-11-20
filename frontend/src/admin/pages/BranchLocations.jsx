import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ExternalLink, MapPin, Pencil, Phone, Plus, Share2, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import BranchMap from '../../components/ui/BranchMap.jsx'
import { parseMapEmbed } from '../../utils/mapEmbed.js'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Spinner, Textarea, Toggle, useFetch, useToast } from '../ui.jsx'

const EMPTY = { name: '', city: '', address: '', phone: '', map: '', is_active: true, sort_order: 0 }

function BranchForm({ branch, nextOrder, onClose, onSaved }) {
  const toast = useToast()
  const [v, setV] = useState(() => (branch ? { name: branch.name, city: branch.city, address: branch.address || '', phone: branch.phone || '', map: branch.map_embed_url || '', is_active: branch.is_active, sort_order: branch.sort_order } : { ...EMPTY, sort_order: nextOrder }))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: undefined })) }
  const embed = useMemo(() => parseMapEmbed(v.map), [v.map])
  const mapProblem = v.map.trim() && !embed
  const save = async () => {
    setBusy(true)
    setErrors({})
    const body = { name: v.name, city: v.city, address: v.address, phone: v.phone, map: v.map, is_active: v.is_active, sort_order: Number(v.sort_order) || 0 }
    try {
      await (branch ? api(`/api/admin/branches/${branch.id}`, { method: 'PUT', body }) : api('/api/admin/branches', { method: 'POST', body }))
      toast(v.is_active ? 'Saved: the branch is live on the website' : 'Saved as disabled: visitors cannot see it')
      onSaved()
      onClose()
    } catch (e) { setErrors(e.fields || {}); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <Modal open wide onClose={onClose} title={branch ? `Edit ${branch.city} branch` : 'Add a branch location'}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={save}>{v.is_active ? 'Save and publish' : 'Save (disabled)'}</Btn></>}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Branch name" required error={errors.name}>{(p) => <Input {...p} maxLength={160} value={v.name} onChange={set('name')} placeholder="LAX360 Pvt Ltd — Chennai Branch" />}</Field>
          <Field label="City" required error={errors.city} hint="One branch per city. Shown as the card's heading.">{(p) => <Input {...p} maxLength={80} value={v.city} onChange={set('city')} placeholder="Chennai" />}</Field>
          <Field label="Complete address" error={errors.address} hint="One line per row, as it should appear.">{(p) => <Textarea {...p} rows={4} maxLength={600} value={v.address} onChange={set('address')} placeholder={'1st Floor, 16, CPS Tower\nAdvaitha Ashram Road, Fairlands\nSalem, Tamil Nadu – 636004'} />}</Field>
          <Field label="Phone number(s)" error={errors.phone} hint="Separate several numbers with a comma, e.g. +91 95666 79928, +91 86676 30258. Each one becomes its own tap-to-call link.">{(p) => <Input {...p} maxLength={80} value={v.phone} onChange={set('phone')} placeholder="+91 95666 79928, +91 86676 30258" />}</Field>
          <Field label="Google Maps embed (optional)" error={errors.map || (mapProblem ? 'This is not a Google Maps embed code or address.' : undefined)}
            hint="On Google Maps: Share > Embed a map > Copy HTML, then paste the whole <iframe> code (or just its address) here. Leave it empty for no map. Only Google Maps embeds are accepted.">
            {(p) => <Textarea {...p} rows={4} maxLength={4000} value={v.map} onChange={set('map')} placeholder={'<iframe src="https://www.google.com/maps/embed?pb=..." ...></iframe>'} />}
          </Field>
          <div className="flex flex-wrap items-center gap-4">
            <Toggle checked={v.is_active} onChange={(on) => setV((s) => ({ ...s, is_active: on }))} label="Show on the website" />
            <label className="text-sm font-semibold">Order<Input className="mt-1 w-24" type="number" min="0" value={v.sort_order} onChange={set('sort_order')} aria-label="Display order" /></label>
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Preview</h3>
          <div className="rounded-xl border border-edge p-3 text-sm">
            <p className="font-display text-lg font-semibold">{v.city || <span className="text-soft">City</span>}</p>
            <p className="text-soft">{v.name || 'Branch name'}</p>
            {v.address.trim() && <address className="mt-2 whitespace-pre-line not-italic text-soft">{v.address}</address>}
            {v.phone.trim() && <p className="mt-2 inline-flex items-center gap-1.5 font-semibold"><Phone className="size-4 text-lav" aria-hidden="true" /> {v.phone}</p>}
            <div className="mt-3">{embed ? <BranchMap src={embed} title="Map preview" /> : <p className="rounded-lg border border-dashed border-edge-strong p-6 text-center text-soft">{mapProblem ? 'The map cannot be shown: check the embed code.' : 'No map yet. Paste a Google Maps embed to preview it here.'}</p>}</div>
          </div>
          <p className="mt-2 text-xs text-soft">This is how the branch will look on the website. Nothing changes there until you save.</p>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Branch locations: add, edit, enable / disable and delete branches (name, complete address, phone and an optional Google Maps embed), with a live map preview before anything is
 * published. Branches are stored in the database: a branch added here appears on the website's branch sections at once, with no code change.
 */
export default function BranchLocations() {
  const toast = useToast()
  const q = useFetch(() => api('/api/admin/branches'), [])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  if (q.loading && !q.data) return <Spinner />
  if (q.error && !q.data) return <ErrorState error={q.error} onRetry={q.reload} />
  const list = q.data || []
  const nextOrder = Math.max(0, ...list.map((b) => b.sort_order || 0)) + 10
  const toggle = async (b) => {
    try { await api(`/api/admin/branches/${b.id}`, { method: 'PUT', body: { name: b.name, city: b.city, address: b.address || '', phone: b.phone || '', map: b.map_embed_url || '', is_active: !b.is_active, sort_order: b.sort_order } }); toast(b.is_active ? 'Disabled: hidden from the website' : 'Enabled: shown on the website'); q.reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/branches/${del.id}`, { method: 'DELETE' }); toast('Branch deleted'); setDel(null); q.reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader title="Branch locations" lead="The branches shown on the website: name, complete address, phone and an interactive Google Map. Add a new branch whenever you open one: no code change is needed, and it appears on the website as soon as it is saved and enabled."
        actions={<><a href="/contact#branches" target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> View on the website</Btn></a><Btn kind="primary" onClick={() => setEdit({ branch: null })}><Plus className="size-4" aria-hidden="true" /> Add branch</Btn></>} />
      {list.length === 0 && <Card><EmptyState title="No branches yet">Add your first branch location.</EmptyState></Card>}
      <ul className="grid gap-4 lg:grid-cols-2">
        {list.map((b) => (
          <li key={b.id} className="min-w-0">
            <Card className={`flex h-full flex-col gap-3 !p-4 ${b.is_active ? '' : 'opacity-75'}`}>
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/20 text-lav"><MapPin className="size-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-semibold">{b.city}</h2><Badge value={b.is_active ? 'published' : 'draft'} text={b.is_active ? 'On the website' : 'Disabled'} />{b.map_embed_url ? <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold">Map set</span> : <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">No map yet</span>}</div>
                  <p className="text-sm text-soft">{b.name}</p>
                  {b.address && <address className="mt-1 whitespace-pre-line text-sm not-italic text-soft">{b.address}</address>}
                  {b.phone && <p className="mt-1 text-sm font-semibold">{b.phone}</p>}
                </div>
              </div>
              {b.map_embed_url && <BranchMap src={b.map_embed_url} title={`Map of the ${b.city} branch`} />}
              <div className="mt-auto flex flex-wrap gap-2">
                <Btn kind="primary" onClick={() => setEdit({ branch: b })}><Pencil className="size-4" aria-hidden="true" /> Edit / replace map</Btn>
                <Link to={`/company-admin/branches/${b.slug}/social`}><Btn><Share2 className="size-4" aria-hidden="true" /> Social media & contact</Btn></Link>
                <Btn onClick={() => toggle(b)}>{b.is_active ? <><EyeOff className="size-4" aria-hidden="true" /> Disable</> : <><Eye className="size-4" aria-hidden="true" /> Enable</>}</Btn>
                <Btn kind="danger" onClick={() => setDel(b)} aria-label={`Delete ${b.city} branch`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {edit && <BranchForm key={edit.branch?.id || 'new'} branch={edit.branch} nextOrder={nextOrder} onClose={() => setEdit(null)} onSaved={q.reload} />}
      <ConfirmDialog open={!!del} title="Delete this branch?" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>
        The {del?.city} branch will be removed from the website and from the enquiry forms. Enquiries and demo requests that named it are kept. Consider “Disable” instead if you may need it again.
      </ConfirmDialog>
    </>
  )
}
