import { useRef, useState } from 'react'
import { Eye, EyeOff, ExternalLink, ImagePlus, Pencil, Power, Settings2, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Editor } from './Content.jsx'
import { BulkImageDialog, fmtSize, imageLimit, prettyName, readSize, uploadImage, usePasteImages } from '../ImageUpload.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, Spinner, useFetch, useToast } from '../ui.jsx'

const PREVIEW = '/?cms_preview=1#gallery'
const thumb = (d) => (d.image ? `/api/admin/media/${d.image}/file` : d.image_path || '')

/**
 * Image carousel management: the picture strip on the home page (between Our Clients and Testimonials). Upload, replace, edit, re-order, switch on / off and delete pictures,
 * edit the heading and speed, and remove all the temporary sample pictures in one step when you have your own photographs. It edits the same content as Website content >
 * Image carousel, so every change is a change on the public site once published. Uploaded pictures are kept in the media library's permanent storage.
 */
export default function CarouselAdmin() {
  const toast = useToast()
  const kinds = useFetch(() => api('/api/admin/content/kinds'), [])
  const picsQ = useFetch(() => api('/api/admin/content/carousel_image'), [])
  const pageQ = useFetch(() => api('/api/admin/content/carousel_page'), [])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const pasting = useRef(false)
  const picsRef = useRef([])
  picsRef.current = picsQ.data || []
  // Ctrl+V anywhere on this page adds the copied picture(s) to the end of the strip straight away (no button first). A dialog that is open (add / edit / confirm) takes the paste
  // itself or pauses this, so one paste is never added twice.
  usePasteImages(async (files) => {
    if (pasting.current) return
    pasting.current = true
    const max = await imageLimit()
    let made = 0
    let order = Math.max(0, ...picsRef.current.map((p) => p.sort_order || 0))
    for (const file of files) {
      if (file.size > max) { toast(`${file.name} is too large (${fmtSize(file.size)}); the limit is ${fmtSize(max)}.`, 'error'); continue }
      try {
        toast(`Adding ${prettyName(file.name)}…`)
        const url = URL.createObjectURL(file)
        const size = await readSize(url)
        URL.revokeObjectURL(url)
        const asset = await uploadImage(file)
        order += 10
        await api('/api/admin/content/carousel_image', { method: 'POST', body: { title: prettyName(file.name) || 'Picture', status: 'published', sort_order: order, data: { image: asset.id, shape: size && size.w / size.h < 1.3 ? 'portrait' : 'landscape', enabled: true, sample: false } } })
        made += 1
      } catch (e) { toast(`${file.name}: ${e.message}`, 'error') }
    }
    pasting.current = false
    if (made) { toast(`${made} picture${made === 1 ? '' : 's'} added to the carousel`); picsQ.reload() }
  }, { disabled: !!(edit || del || clearing || adding) })
  const picSpec = kinds.data?.kinds.find((k) => k.kind === 'carousel_image')
  const pageSpec = kinds.data?.kinds.find((k) => k.kind === 'carousel_page')

  if ((kinds.loading && !kinds.data) || (picsQ.loading && !picsQ.data)) return <Spinner />
  if (kinds.error && !kinds.data) return <ErrorState error={kinds.error} onRetry={kinds.reload} />
  if (!picSpec || !pageSpec) return <Card><EmptyState title="The image carousel is not available">Your account cannot manage website content.</EmptyState></Card>

  const pics = picsQ.data || []
  const settings = (pageQ.data || [])[0]
  const samples = pics.filter((p) => p.data?.sample === true)
  const shown = pics.filter((p) => p.status === 'published' && p.data?.enabled !== false)
  const on = settings ? settings.status === 'published' && settings.data?.enabled !== false : true
  const reload = () => { picsQ.reload(); pageQ.reload() }
  const patch = async (item, body, ok) => {
    try { await api(`/api/admin/content/item/${item.id}`, { method: 'PATCH', body }); toast(ok); reload() } catch (e) { toast(e.message, 'error') }
  }
  const toggleSection = async () => {
    if (!settings) {
      try { await api('/api/admin/content/carousel_page', { method: 'POST', body: { title: pageSpec.label, data: { enabled: false }, status: 'published' } }); toast('The image carousel is off'); reload() } catch (e) { toast(e.message, 'error') }
      return
    }
    await patch(settings, { data: { ...settings.data, enabled: !on }, status: 'published' }, on ? 'The image carousel is hidden on the home page' : 'The image carousel is shown on the home page')
  }
  const move = async (i, delta) => {
    const ids = pics.map((p) => p.id)
    const [id] = ids.splice(i, 1)
    ids.splice(i + delta, 0, id)
    try { await api('/api/admin/content/carousel_image/order', { method: 'PUT', body: { ids } }); toast('Order saved: the strip follows it'); picsQ.reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${del.id}`, { method: 'DELETE' }); toast('Picture deleted'); setDel(null); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const removeSamples = async () => {
    setBusy(true)
    try {
      for (const p of samples) await api(`/api/admin/content/item/${p.id}`, { method: 'DELETE' })
      toast(`${samples.length} sample picture${samples.length === 1 ? '' : 's'} removed`)
      setClearing(false)
      reload()
    } catch (e) { toast(e.message, 'error'); reload() } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Image carousel" lead="The slow, swipeable picture strip on the home page, between Our Clients and Testimonials. Add your own photographs (several at once, by dragging them in or pasting), replace, re-order, switch pictures on or off and delete them. The strip hides itself when no picture is switched on."
        actions={<>
          <a href={PREVIEW} target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> Preview on the website</Btn></a>
          <Btn onClick={() => setEdit({ spec: pageSpec, item: settings || null })}><Settings2 className="size-4" aria-hidden="true" /> Heading & speed</Btn>
          <Btn kind="primary" onClick={() => setAdding(true)}><ImagePlus className="size-4" aria-hidden="true" /> Add pictures</Btn>
        </>} />

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-4 !p-5">
        <div>
          <p className="flex items-center gap-2 font-display text-lg font-semibold">The image carousel is <Badge value={on && shown.length ? 'published' : 'draft'} text={on ? (shown.length ? 'SHOWN' : 'HIDDEN (no picture on)') : 'OFF'} /></p>
          <p className="mt-1 text-sm text-soft">{shown.length} picture{shown.length === 1 ? '' : 's'} on the website. Visitors can swipe, drag or scroll it sideways; it also drifts slowly by itself.</p>
        </div>
        <Btn kind={on ? 'default' : 'primary'} onClick={toggleSection}><Power className="size-4" aria-hidden="true" /> {on ? 'Turn off' : 'Turn on'}</Btn>
      </Card>

      {samples.length > 0 && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 !border-amber-500/50 !p-5">
          <div>
            <p className="font-display text-lg font-semibold">{samples.length} temporary sample picture{samples.length === 1 ? ' is' : 's are'} in the carousel</p>
            <p className="mt-1 text-sm text-soft">They are placeholder artwork, not photographs of LAX360, and show a “Sample image” label on the website. Add your own pictures, then remove all the samples in one click.</p>
          </div>
          <Btn kind="danger" onClick={() => setClearing(true)}><Trash2 className="size-4" aria-hidden="true" /> Remove all samples</Btn>
        </Card>
      )}

      {picsQ.error && !picsQ.data && <ErrorState error={picsQ.error} onRetry={picsQ.reload} />}
      {picsQ.data && pics.length === 0 && <Card><EmptyState title="No pictures yet">Add your first picture, or run <code>python -m app.cli seed-carousel</code> to load temporary sample pictures to preview the section.</EmptyState></Card>}
      {pics.length > 0 && (
        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pics.map((p, i) => {
            const d = p.data || {}
            const hidden = d.enabled === false
            const src = thumb(d)
            return (
              <li key={p.id}>
                <Card className={`flex h-full flex-col gap-3 !p-3 ${hidden || p.status !== 'published' ? 'opacity-75' : ''}`}>
                  <div className={`relative overflow-hidden rounded-xl border border-edge bg-glass aspect-[1.953]`}>
                    {src ? <img src={src} alt="" width="586" height="300" loading="lazy" className="size-full object-contain" /> : <span className="flex size-full items-center justify-center text-sm text-soft">No picture</span>}
                    <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-xs font-bold text-white">{i + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-display text-base font-semibold">{p.title}</h2><Badge value={p.status} />
                      {d.sample && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">Sample</span>}
                      {hidden && <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold text-soft">hidden</span>}</div>
                    <p className="mt-0.5 truncate text-xs text-soft">{d.shape === 'portrait' ? 'Narrow frame' : 'Wide frame'}{d.caption ? ` · “${d.caption}”` : ''}{d.image ? ' · uploaded' : ' · built-in'}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <Btn kind="primary" onClick={() => setEdit({ spec: picSpec, item: p })}><Pencil className="size-4" aria-hidden="true" /> Edit / replace</Btn>
                    <Btn onClick={() => patch(p, { data: { ...d, enabled: hidden }, status: p.status }, hidden ? 'Picture shown' : 'Picture hidden from the website')}>{hidden ? <><Eye className="size-4" aria-hidden="true" /> Show</> : <><EyeOff className="size-4" aria-hidden="true" /> Hide</>}</Btn>
                    <Btn kind="danger" onClick={() => setDel(p)} aria-label={`Delete ${p.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                    {pics.length > 1 && <span className="ml-auto flex gap-1"><Btn kind="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${p.title} earlier`}>←</Btn><Btn kind="ghost" disabled={i === pics.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${p.title} later`}>→</Btn></span>}
                  </div>
                </Card>
              </li>
            )
          })}
        </ol>
      )}
      <p className="mt-6 text-sm text-soft">Pictures appear in this order, left to right, and then the strip starts over. Pictures are never cropped: each keeps its own proportions (wide, square or tall), all at the same height. To add pictures quickly, copy one and press Ctrl+V on this page. To replace a picture, open it with “Edit / replace” and drop, paste or choose the new one. Uploads are stored permanently and the website address is handled for you.</p>

      <BulkImageDialog open={adding} onClose={() => setAdding(false)} title="Add pictures to the carousel" createLabel="Add to carousel" onDone={reload}
        intro="Choose pictures, drag them in, or copy a picture and press Ctrl+V. Check the previews, remove any you do not want, then upload. Each picture is added to the end of the strip; no description is needed."
        create={({ asset, name, aspect, index }) => api('/api/admin/content/carousel_image', { method: 'POST', body: { title: name || 'Picture', status: 'published', sort_order: Math.max(0, ...pics.map((p) => p.sort_order || 0)) + (index + 1) * 10,
          data: { image: asset.id, shape: aspect && aspect < 1.3 ? 'portrait' : 'landscape', enabled: true, sample: false } } })} />
      {edit && <Editor key={`${edit.spec.kind}-${edit.item?.id || 'new'}`} spec={edit.spec} item={edit.item} preset={edit.preset} onClose={() => setEdit(null)} onSaved={reload} />}
      <ConfirmDialog open={!!del} title="Delete this picture?" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>“{del?.title}” will be removed permanently from the carousel. Consider hiding it instead if you may need it again.</ConfirmDialog>
      <ConfirmDialog open={clearing} title="Remove all sample pictures?" busy={busy} onClose={() => setClearing(false)} onConfirm={removeSamples}>The {samples.length} temporary sample picture{samples.length === 1 ? '' : 's'} will be deleted. Pictures you uploaded yourself stay. If no picture is left on, the carousel hides itself on the home page.</ConfirmDialog>
    </>
  )
}
