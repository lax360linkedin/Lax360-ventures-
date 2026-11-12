import { useMemo, useState } from 'react'
import { Eye, EyeOff, ExternalLink, FileText, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../services/apiClient.js'
import { Editor } from './pages/Content.jsx'
import { BulkImageDialog } from './ImageUpload.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Input, PageHeader, Pagination, Select, Spinner, useFetch, useToast } from './ui.jsx'

const PAGE_SIZE = 24
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const isId = (v) => typeof v === 'string' && /^[0-9a-f-]{32,36}$/i.test(v)
/** The picture of an entry: an uploaded one (a media-library id) or a built-in sample picture (a file path shipped with the website). */
export const pictureOf = (data = {}, ...fields) => {
  for (const f of fields) { const v = data[f]; if (v) return isId(v) ? `/api/admin/media/${v}/file` : v }
  return ''
}

/**
 * One management screen for one kind of website content: the same, simple behaviour in every module.
 *   Add / edit / delete, upload or replace the picture (in the editor: drop, paste or choose), add many pictures at once (when `bulk` is given), re-order, switch an entry on or off
 *   (the "Show on the website" switch), publish / unpublish, preview the real page with drafts included, search, filter and sort, and remove every temporary sample entry in one step.
 * It edits the very same content the public website reads (Website content > the same kind), so there is exactly one copy of everything and every change is live once published.
 *
 *   kind        the content kind (see the KINDS registry on the server)             describe(item)   { image, initials?, sub, badges: [text] } shown on each card
 *   imageFields the data fields that hold the entry's picture (first one found)      bulk             { title, intro, createLabel, toItem({ asset, name, aspect, index }) }
 *   filters     [{ name, label, options }] extra filters on a data field             sampleKey        the data flag that marks temporary sample entries
 *   enableKey   the on/off switch field (default "enabled"; none when null)           embedded         render without the page header (inside tabs)
 */
export default function ModuleManager({ kind, title, lead, noun = 'entry', nouns, preview, describe, imageFields = [], bulk, filters = [], sampleKey, enableKey = 'enabled', preset = {}, embedded = false, actions, empty, wideImage = false }) {
  const toast = useToast()
  const plural = nouns || `${noun}s`
  const meta = useFetch(() => api('/api/admin/content/kinds'), [])
  const itemsQ = useFetch(() => api(`/api/admin/content/${kind}`), [kind])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [state, setState] = useState('all')
  const [extra, setExtra] = useState({})
  const [sort, setSort] = useState('manual')
  const [page, setPage] = useState(1)
  const spec = meta.data?.kinds.find((k) => k.kind === kind)
  const all = useMemo(() => itemsQ.data || [], [itemsQ.data])
  const hiddenOf = (it) => Boolean(enableKey) && it.data?.[enableKey] === false
  const samples = useMemo(() => (sampleKey ? all.filter((it) => it.data?.[sampleKey] === true) : []), [all, sampleKey])

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    const rows = all.filter((it) => {
      if (state === 'published' && !(it.status === 'published' && !hiddenOf(it))) return false
      if (state === 'draft' && it.status !== 'draft') return false
      if (state === 'hidden' && !hiddenOf(it)) return false
      if (state === 'sample' && it.data?.[sampleKey] !== true) return false
      for (const f of filters) if (extra[f.name] && it.data?.[f.name] !== extra[f.name]) return false
      return !t || `${it.title} ${Object.values(it.data || {}).filter((v) => typeof v === 'string' && !isId(v)).join(' ')}`.toLowerCase().includes(t)
    })
    if (sort === 'az') return [...rows].sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'za') return [...rows].sort((a, b) => b.title.localeCompare(a.title))
    if (sort === 'status') return [...rows].sort((a, b) => (a.status === b.status ? 0 : a.status === 'published' ? -1 : 1))
    return rows
  }, [all, q, state, extra, sort]) // eslint-disable-line react-hooks/exhaustive-deps
  const filtering = Boolean(q.trim()) || state !== 'all' || Object.values(extra).some(Boolean) || sort !== 'manual'
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const shown = list.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE)

  if ((meta.loading && !meta.data) || (itemsQ.loading && !itemsQ.data)) return <Spinner />
  if (meta.error && !meta.data) return <ErrorState error={meta.error} onRetry={meta.reload} />
  if (!spec) return <Card><EmptyState title={`${title} is not available`}>Your account cannot manage website content.</EmptyState></Card>

  const reload = () => itemsQ.reload()
  const patch = async (it, body, ok) => {
    try { await api(`/api/admin/content/item/${it.id}`, { method: 'PATCH', body }); toast(ok); reload() } catch (e) { toast(e.message, 'error') }
  }
  const move = async (it, delta) => {
    const ids = all.map((x) => x.id)
    const i = ids.indexOf(it.id)
    ids.splice(i, 1)
    ids.splice(i + delta, 0, it.id)
    try { await api(`/api/admin/content/${kind}/order`, { method: 'PUT', body: { ids } }); toast('Order saved: the website follows it'); reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${del.id}`, { method: 'DELETE' }); toast(`${label(noun)} deleted. Its pictures stay in the media library.`); setDel(null); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const removeSamples = async () => {
    setBusy(true)
    try {
      for (const it of samples) await api(`/api/admin/content/item/${it.id}`, { method: 'DELETE' })
      toast(`${samples.length} sample ${samples.length === 1 ? noun : plural} removed`)
      setClearing(false)
      reload()
    } catch (e) { toast(e.message, 'error'); reload() } finally { setBusy(false) }
  }
  const label = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const live = all.filter((it) => it.status === 'published' && !hiddenOf(it)).length
  const drafts = all.filter((it) => it.status === 'draft').length
  const hiddenN = all.filter(hiddenOf).length
  const previewUrl = preview || (spec.preview_path ? `${spec.preview_path.split('#')[0]}?cms_preview=1${spec.preview_path.includes('#') ? `#${spec.preview_path.split('#')[1]}` : ''}` : '')
  const canReorder = !filtering && all.length > 1
  const pictureField = imageFields[0]

  const header = (
    <>
      {previewUrl && <a href={previewUrl} target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> Preview on the website</Btn></a>}
      {actions}
      {bulk && <Btn onClick={() => setAdding(true)}><ImagePlus className="size-4" aria-hidden="true" /> {bulk.label || 'Add many from pictures'}</Btn>}
      <Btn kind="primary" onClick={() => setEdit({ item: null })}><Plus className="size-4" aria-hidden="true" /> Add {noun}</Btn>
    </>
  )

  return (
    <>
      {embedded ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-3xl text-sm text-soft">{lead}</p><div className="flex flex-wrap gap-2">{header}</div></div> : <PageHeader title={title} lead={lead} actions={header} />}

      <Card className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 !p-4 text-sm" aria-label="Summary">
        <span><strong className="font-display text-lg">{all.length}</strong> {all.length === 1 ? noun : plural}</span>
        <span className="text-soft"><strong className="text-fg">{live}</strong> live on the website</span>
        {drafts > 0 && <span className="text-soft"><strong className="text-fg">{drafts}</strong> draft{drafts === 1 ? '' : 's'}</span>}
        {hiddenN > 0 && <span className="text-soft"><strong className="text-fg">{hiddenN}</strong> switched off</span>}
        {samples.length > 0 && <span className="text-amber-600 dark:text-amber-300"><strong>{samples.length}</strong> sample{samples.length === 1 ? '' : 's'}</span>}
      </Card>

      {samples.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-4 !border-amber-500/50 !p-5">
          <div>
            <p className="font-display text-lg font-semibold">{samples.length} temporary sample {samples.length === 1 ? noun : plural} on the website</p>
            <p className="mt-1 text-sm text-soft">Placeholders so the section is not empty. Edit one to make it real (change the details, replace the picture, untick “sample”), delete the ones you do not want, or remove them all at once when your genuine content is ready.</p>
          </div>
          <Btn kind="danger" onClick={() => setClearing(true)}><Trash2 className="size-4" aria-hidden="true" /> Remove all samples</Btn>
        </Card>
      )}

      {all.length > 0 && (
        <div className="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label={`Find ${noun}`}>
          <label className="min-w-[13rem] flex-1 text-sm font-semibold">Search<Input className="mt-1" placeholder="Name or any detail" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></label>
          <label className="text-sm font-semibold">Show<Select className="mt-1" value={state} onChange={(e) => { setState(e.target.value); setPage(1) }}>
            <option value="all">All</option><option value="published">Live on the website</option><option value="draft">Drafts</option>{enableKey && <option value="hidden">Switched off</option>}{sampleKey && <option value="sample">Samples only</option>}</Select></label>
          {filters.map((f) => <label key={f.name} className="text-sm font-semibold">{f.label}<Select className="mt-1" value={extra[f.name] || ''} onChange={(e) => { setExtra({ ...extra, [f.name]: e.target.value }); setPage(1) }}><option value="">All</option>{(f.options || spec.fields.find((x) => x.name === f.name)?.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></label>)}
          <label className="text-sm font-semibold">Sort<Select className="mt-1" value={sort} onChange={(e) => setSort(e.target.value)}><option value="manual">My order</option><option value="az">Name A to Z</option><option value="za">Name Z to A</option><option value="status">Live first</option></Select></label>
        </div>
      )}

      {itemsQ.error && !itemsQ.data && <ErrorState error={itemsQ.error} onRetry={itemsQ.reload} />}
      {itemsQ.data && all.length === 0 && <Card>{empty || <EmptyState title={`No ${plural} yet`}>Add your first {noun}. Nothing is shown on the website until you publish it.</EmptyState>}</Card>}
      {all.length > 0 && list.length === 0 && <Card><EmptyState title="Nothing matches">Try a different search or filter.</EmptyState></Card>}

      {shown.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((it) => {
            const d = it.data || {}
            const off = hiddenOf(it)
            const info = describe ? describe(it, spec) : {}
            const src = info.image !== undefined ? info.image : pictureOf(d, ...imageFields)
            const i = all.findIndex((x) => x.id === it.id)
            return (
              <li key={it.id} className="min-w-0">
                <Card className={`flex h-full flex-col gap-3 !p-4 ${off || it.status !== 'published' ? 'opacity-80' : ''}`}>
                  <div className="flex gap-4">
                    <div className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-edge bg-gradient-to-br from-primary/25 to-accent/10 ${wideImage ? 'h-20 w-28' : 'size-20'}`}>
                      {src ? <img src={src} alt="" loading="lazy" className={`size-full ${wideImage ? 'object-contain p-1.5' : 'object-cover object-top'}`} /> : <span aria-hidden="true" className="font-display text-xl font-semibold">{info.initials || initials(it.title) || '?'}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-base font-semibold" title={it.title}>{it.title}</h2>
                      {info.sub && <p className="line-clamp-2 text-sm text-soft">{info.sub}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge value={it.status} />
                        {(info.badges || []).filter(Boolean).map((b) => <span key={b} className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold">{b}</span>)}
                        {off && <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold text-soft">switched off</span>}
                        {sampleKey && d[sampleKey] === true && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">Sample</span>}
                        {pictureField && !src && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">no picture</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <Btn kind="primary" onClick={() => setEdit({ item: it })}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn>
                    {enableKey && <Btn onClick={() => patch(it, { data: { ...d, [enableKey]: off }, status: it.status }, off ? 'Switched on: shown on the website' : 'Switched off: hidden from the website')} aria-label={`${off ? 'Switch on' : 'Switch off'} ${it.title}`}>{off ? <><Eye className="size-4" aria-hidden="true" /> Show</> : <><EyeOff className="size-4" aria-hidden="true" /> Hide</>}</Btn>}
                    <Btn onClick={() => patch(it, { status: it.status === 'published' ? 'draft' : 'published' }, it.status === 'published' ? 'Unpublished: saved as a draft' : 'Published: live on the website')} aria-label={`${it.status === 'published' ? 'Unpublish' : 'Publish'} ${it.title}`}><FileText className="size-4" aria-hidden="true" /> {it.status === 'published' ? 'Unpublish' : 'Publish'}</Btn>
                    <Btn kind="danger" onClick={() => setDel(it)} aria-label={`Delete ${it.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                    {canReorder && <span className="ml-auto flex gap-1"><Btn kind="ghost" disabled={i === 0} onClick={() => move(it, -1)} aria-label={`Move ${it.title} earlier`}>←</Btn><Btn kind="ghost" disabled={i === all.length - 1} onClick={() => move(it, 1)} aria-label={`Move ${it.title} later`}>→</Btn></span>}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
      {pages > 1 && <div className="mt-4"><Pagination page={Math.min(page, pages)} pages={pages} total={list.length} onPage={setPage} /></div>}
      {all.length > 0 && <p className="mt-6 text-sm text-soft">“Edit” changes the details and replaces the picture (drop, paste with Ctrl+V or choose a file) and lets you save as a draft or publish. “Hide” switches an entry off without losing it; “Unpublish” turns it back into a private draft. Use the arrows to arrange the order{filtering ? ' (clear the search, filters and sort first)' : ''}. Use “Preview on the website” to see drafts in the real design before they go live.</p>}

      {bulk && <BulkImageDialog open={adding} onClose={() => setAdding(false)} title={bulk.title || `Add ${plural} from pictures`} createLabel={bulk.createLabel || 'Add'} onDone={reload}
        intro={bulk.intro || `Choose pictures, drag them in, or paste copied ones with Ctrl+V. One ${noun} is created from each picture, named after its file; rename it afterwards. A picture that is already used here is skipped.`}
        create={async ({ asset, name, aspect, index }) => {
          if (pictureField && all.some((x) => x.data?.[pictureField] === asset.id)) throw new Error('This picture is already in the list.')
          const made = bulk.toItem({ asset, name, aspect, index })
          await api(`/api/admin/content/${kind}`, { method: 'POST', body: { title: made.title || name || label(noun), status: 'published', sort_order: Math.max(0, ...all.map((x) => x.sort_order || 0)) + (index + 1) * 10, data: { ...preset, ...made.data, ...(pictureField ? { [pictureField]: asset.id } : {}) } } })
        }} />}
      {edit && <Editor key={edit.item?.id || 'new'} spec={spec} item={edit.item} preset={preset} onClose={() => setEdit(null)} onSaved={reload} />}
      <ConfirmDialog open={!!del} title={`Delete this ${noun}?`} busy={busy} onClose={() => setDel(null)} onConfirm={remove}>“{del?.title}” will be removed permanently and cannot be recovered. Consider “Hide” instead if you may need it again.</ConfirmDialog>
      <ConfirmDialog open={clearing} title="Remove all sample entries?" busy={busy} onClose={() => setClearing(false)} onConfirm={removeSamples}>The {samples.length} temporary sample {samples.length === 1 ? noun : plural} will be deleted. Entries you added or edited and unmarked as samples stay.</ConfirmDialog>
    </>
  )
}
