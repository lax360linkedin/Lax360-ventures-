import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, ImagePlus, Loader2, RotateCcw, X } from 'lucide-react'
import { api, upload } from '../services/apiClient.js'
import { Btn, Modal, Field, Input, Select, cx, useToast } from './ui.jsx'

/**
 * The one way to add pictures in the admin panel: click to choose, drag and drop, or paste a copied picture with Ctrl+V; one picture or many at once.
 * Files are stored by the backend (the media library, permanent storage) and referenced by id: nobody types a file path or a URL, and no description is needed.
 */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',')
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' }
export const isImage = (f) => IMAGE_TYPES.includes(f.type) || /\.(png|jpe?g|gif|webp)$/i.test(f.name)
export const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
/** "IMG_4392-final.jpg" -> "IMG 4392 final": a readable default name taken from the file name (it can be changed afterwards). */
export const prettyName = (filename) => filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()

let pasteCounter = 0
/**
 * The pictures in a paste or drop, each exactly once. The browser exposes one copied picture twice (as `files` and again as an `items` entry, two different File objects whose
 * timestamps can differ), so the two lists are never combined: `files` is used, and `items` only when `files` is empty. A pasted screenshot has the generic name "image.png":
 * it is given a unique one.
 */
export function imagesFrom(data) {
  if (!data) return []
  let list = [...(data.files || [])]
  if (!list.length) list = [...(data.items || [])].filter((i) => i.kind === 'file').map((i) => i.getAsFile())
  const seen = new Set()
  const out = []
  for (const f of list) {
    if (!f || !isImage(f)) continue
    const key = `${f.name}-${f.size}-${f.type}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(/^image\.\w+$/i.test(f.name) ? new File([f], `pasted-image-${Date.now()}-${++pasteCounter}.${EXT[f.type] || 'png'}`, { type: f.type }) : f)
  }
  return out
}

// ---- Pasting (Ctrl+V). ONE listener for the whole admin panel, however many drop areas or pages are mounted. Each paste is handled once and goes to exactly one place:
// the drop area under the pointer or with focus, otherwise the most recently opened one (a dialog opens after the page behind it). Text pastes are never touched. ----
const pasteTargets = []
const handledPastes = new WeakSet()
function onWindowPaste(e) {
  if (handledPastes.has(e)) return
  handledPastes.add(e)
  const live = pasteTargets.filter((t) => !t.get().disabled)
  if (!live.length) return
  const files = imagesFrom(e.clipboardData)
  if (!files.length) return
  const target = live.find((t) => t.get().hot?.()) || live[live.length - 1]
  e.preventDefault()
  target.get().onFiles(files)
}
/** Let this component receive pasted pictures for as long as it is mounted (`disabled` pauses it, e.g. while uploading or while an unrelated dialog is open). */
export function usePasteImages(onFiles, { disabled = false, hot } = {}) {
  const ref = useRef(null)
  ref.current = { onFiles, disabled, hot }
  useEffect(() => {
    const entry = { get: () => ref.current }
    if (!pasteTargets.length) window.addEventListener('paste', onWindowPaste)
    pasteTargets.push(entry)
    return () => {
      pasteTargets.splice(pasteTargets.indexOf(entry), 1)
      if (!pasteTargets.length) window.removeEventListener('paste', onWindowPaste)
    }
  }, [])
}

/** The size of a picture, read in the browser before it is uploaded (so a wide or narrow frame can be chosen automatically). */
export const readSize = (url) => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = () => resolve(null); img.src = url })

/** Upload one picture to the media library. Resolves with the library item (its `id` is what content fields store). */
export const uploadImage = (file, onProgress) => upload(`/api/admin/media?filename=${encodeURIComponent(file.name)}&public=true`, file, { onProgress })

let limitsCache = null
export async function imageLimit() {
  if (!limitsCache) limitsCache = api('/api/admin/media?page_size=1').then((r) => r.limits?.max_bytes || 10485760).catch(() => 10485760)
  return limitsCache
}

/** A drop area: click to choose, drag pictures onto it, or paste a copied picture with Ctrl+V anywhere on the page (see usePasteImages). */
export function Dropzone({ multiple = true, onFiles, busy = false, compact = false, title, hint, className = '' }) {
  const toast = useToast()
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const hot = useRef(false) // pointer over it or focus in it: it gets the paste when several drop areas are on screen
  const take = useCallback((files, all) => {
    if (all && all > files.length) toast('Only pictures (PNG, JPG, GIF or WebP) can be added here.', 'error')
    if (files.length) onFiles(multiple ? files : files.slice(0, 1))
  }, [multiple, onFiles, toast])
  usePasteImages(take, { disabled: busy, hot: () => hot.current })
  return (
    <div
      role="button" tabIndex={0} aria-label={title || (multiple ? 'Add pictures: choose files, drop them here or paste with Ctrl+V' : 'Add a picture: choose a file, drop it here or paste with Ctrl+V')} aria-busy={busy || undefined}
      onClick={() => !busy && input.current?.click()} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); input.current?.click() } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragEnter={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) take(imagesFrom(e.dataTransfer), e.dataTransfer.files.length) }}
      onMouseEnter={() => { hot.current = true }} onMouseLeave={() => { hot.current = false }} onFocus={() => { hot.current = true }} onBlur={() => { hot.current = false }}
      className={cx('flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lav',
        over ? 'border-lav bg-primary/10' : 'border-edge-strong bg-glass hover:border-lav', compact ? 'gap-1 px-4 py-3' : 'gap-2 px-6 py-8', busy && 'cursor-progress opacity-70', className)}>
      <input ref={input} type="file" accept={IMAGE_ACCEPT} multiple={multiple} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; take(f.filter(isImage), f.length) }} />
      {busy ? <Loader2 className="size-6 animate-spin text-soft" aria-hidden="true" /> : <ImagePlus className={compact ? 'size-5 text-soft' : 'size-8 text-soft'} aria-hidden="true" />}
      <p className={cx('font-semibold', compact ? 'text-sm' : 'text-base')}>{title || (multiple ? 'Drop pictures here, paste with Ctrl+V, or click to choose' : 'Drop a picture here, paste with Ctrl+V, or click to choose')}</p>
      {!compact && <p className="text-xs text-soft">{hint || `PNG, JPG, GIF or WebP${multiple ? ', as many as you like' : ''}. They are stored for you: no file path or description needed.`}</p>}
    </div>
  )
}

/**
 * Pictures chosen for a bulk upload: previews, remove the ones you do not want, then upload them all with a progress bar for each. Nothing is uploaded until you press the button.
 * `onUploaded(rows)` receives [{ asset, name, aspect }] for the pictures that were saved.
 */
export function BulkUploader({ onUploaded, buttonLabel = 'Upload', disabled }) {
  const toast = useToast()
  const [items, setItems] = useState([]) // [{ id, file, url, state: ready|uploading|done|error, progress, message, asset, aspect }]
  const live = useRef([])
  live.current = items
  useEffect(() => () => live.current.forEach((i) => URL.revokeObjectURL(i.url)), [])
  const patch = (id, p) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...p } : i)))
  const add = useCallback((files) => {
    const fresh = files.map((file) => ({ id: `${file.name}-${file.size}-${Math.random()}`, file, url: URL.createObjectURL(file), state: 'ready', progress: 0, message: '' }))
    setItems((cur) => [...cur, ...fresh])
    fresh.forEach((i) => readSize(i.url).then((s) => s && setItems((cur) => cur.map((x) => (x.id === i.id ? { ...x, aspect: s.w / s.h } : x)))))
  }, [])
  const remove = (id) => setItems((cur) => { const gone = cur.find((i) => i.id === id); if (gone) URL.revokeObjectURL(gone.url); return cur.filter((i) => i.id !== id) })
  const busy = items.some((i) => i.state === 'uploading')
  const pending = items.filter((i) => i.state === 'ready' || i.state === 'error')
  const run = async () => {
    const max = await imageLimit()
    const saved = items.filter((i) => i.state === 'done')
    for (const item of items.filter((i) => i.state !== 'done')) {
      if (item.file.size > max) { patch(item.id, { state: 'error', message: `Too large (${fmtSize(item.file.size)}); the limit is ${fmtSize(max)}.` }); continue }
      patch(item.id, { state: 'uploading', progress: 0, message: '' })
      try {
        const asset = await uploadImage(item.file, (p) => patch(item.id, { progress: p }))
        patch(item.id, { state: 'done', progress: 1, asset })
        saved.push({ ...item, asset })
      } catch (e) {
        patch(item.id, { state: 'error', message: e.message })
        toast(`${item.file.name}: ${e.message}`, 'error')
      }
    }
    if (saved.length) onUploaded(saved.map((i) => ({ asset: i.asset, name: prettyName(i.file.name), aspect: i.aspect })))
  }
  return (
    <div>
      <Dropzone onFiles={add} busy={busy} compact={items.length > 0} />
      {items.length > 0 && (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" aria-label="Pictures to upload">
            {items.map((i) => (
              <li key={i.id} className="relative overflow-hidden rounded-xl border border-edge bg-glass">
                <img src={i.url} alt="" className="aspect-[4/3] w-full bg-glass-strong object-contain" />
                {i.state !== 'uploading' && i.state !== 'done' && <button type="button" onClick={() => remove(i.id)} aria-label={`Remove ${i.file.name} from the upload`} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"><X className="size-4" aria-hidden="true" /></button>}
                <div className="space-y-1 p-2">
                  <p className="truncate text-xs font-semibold">{i.file.name}</p>
                  <p className={cx('text-[0.7rem]', i.state === 'error' ? 'font-semibold text-error' : 'text-soft')}>
                    {i.state === 'ready' && fmtSize(i.file.size)}{i.state === 'uploading' && `Uploading ${Math.round(i.progress * 100)}%`}{i.state === 'done' && <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-3.5" aria-hidden="true" /> Saved</span>}{i.state === 'error' && i.message}
                  </p>
                  {(i.state === 'uploading' || i.state === 'done') && <div className="h-1.5 overflow-hidden rounded-full bg-glass-strong" role="progressbar" aria-valuenow={Math.round(i.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Upload progress for ${i.file.name}`}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round(i.progress * 100)}%` }} /></div>}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Btn kind="primary" loading={busy} disabled={disabled || pending.length === 0} onClick={run}>{items.some((i) => i.state === 'error') && pending.length === items.filter((i) => i.state === 'error').length ? <><RotateCcw className="size-4" aria-hidden="true" /> Try again</> : `${buttonLabel} ${pending.length} picture${pending.length === 1 ? '' : 's'}`}</Btn>
            <span className="text-sm text-soft">{items.length} selected · remove any you do not want before uploading</span>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Add several pictures in one go and turn each into an item (a carousel picture, a gallery photo, an employee profile ...).
 *   globals  – choices that apply to every picture (e.g. the category)             rows – what to ask per picture after the upload (e.g. name and designation); none = automatic
 *   create({ asset, name, aspect, row, globals, index }) makes the item; it is called once per picture. Nothing needs a description or a file path.
 */
export function BulkImageDialog({ open, onClose, title, intro, globals = [], rows = [], createLabel = 'Add', create, onDone }) {
  const toast = useToast()
  const [step, setStep] = useState('choose')
  const [uploaded, setUploaded] = useState([])
  const [g, setG] = useState({})
  const [rowData, setRowData] = useState({})
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const reset = () => { setStep('choose'); setUploaded([]); setG(Object.fromEntries(globals.map((f) => [f.name, f.default ?? '']))); setRowData({}); setErrors({}) }
  useEffect(() => { if (open) reset() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const finish = async (list, data) => {
    setBusy(true)
    let made = 0
    for (let i = 0; i < list.length; i += 1) {
      try { await create({ ...list[i], row: data[list[i].asset.id] || {}, globals: g, index: i }); made += 1 } catch (e) { toast(`${list[i].name}: ${e.message}`, 'error') }
    }
    setBusy(false)
    if (made) { toast(`${made} added`); onDone?.() }
    if (made === list.length) onClose()
    else setUploaded((cur) => cur.slice(made))
  }
  const onUploaded = (list) => {
    setUploaded(list)
    if (rows.length) {
      setRowData(Object.fromEntries(list.map((x) => [x.asset.id, Object.fromEntries(rows.map((r) => [r.name, r.init ? r.init(x) : r.default ?? '']))])))
      setStep('details')
    } else finish(list, {})
  }
  const submitDetails = () => {
    const found = {}
    for (const x of uploaded) for (const r of rows) if (r.required && !String(rowData[x.asset.id]?.[r.name] || '').trim()) found[`${x.asset.id}-${r.name}`] = `${r.label} is required.`
    for (const f of globals) if (f.required && !g[f.name]) found[f.name] = `${f.label} is required.`
    setErrors(found)
    if (!Object.keys(found).length) finish(uploaded, rowData)
  }
  if (!open) return null
  const missingGlobal = globals.some((f) => f.required && !g[f.name])
  return (
    <Modal open wide onClose={onClose} title={title}
      footer={step === 'details' ? <><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={submitDetails}>{createLabel} {uploaded.length}</Btn></> : <Btn onClick={onClose}>Close</Btn>}>
      {intro && <p className="mb-4 text-sm text-soft">{intro}</p>}
      {step === 'choose' && (
        <>
          {globals.length > 0 && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {globals.map((f) => <Field key={f.name} label={f.label} required={f.required} error={errors[f.name]}>{(p) => <Select {...p} value={g[f.name] ?? ''} onChange={(e) => setG({ ...g, [f.name]: e.target.value })}><option value="">Choose…</option>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>}</Field>)}
            </div>
          )}
          <BulkUploader onUploaded={onUploaded} disabled={busy || missingGlobal} buttonLabel={rows.length ? 'Upload' : createLabel} />
          {missingGlobal && <p className="mt-2 text-sm text-soft">Choose {globals.filter((f) => f.required && !g[f.name]).map((f) => f.label.toLowerCase()).join(' and ')} first.</p>}
        </>
      )}
      {step === 'details' && (
        <ul className="space-y-3">
          {uploaded.map((x) => (
            <li key={x.asset.id} className="flex flex-wrap items-start gap-4 rounded-xl border border-edge p-3">
              <img src={x.asset.url || x.asset.preview_url} alt="" className="size-24 shrink-0 rounded-lg border border-edge bg-glass-strong object-contain" />
              <div className="grid min-w-[14rem] flex-1 gap-3 sm:grid-cols-2">
                {rows.map((r) => {
                  const key = `${x.asset.id}-${r.name}`
                  const set = (v) => setRowData((cur) => ({ ...cur, [x.asset.id]: { ...cur[x.asset.id], [r.name]: v } }))
                  return (
                    <Field key={r.name} label={r.label} required={r.required} error={errors[key]}>
                      {(p) => r.type === 'select'
                        ? <Select {...p} value={rowData[x.asset.id]?.[r.name] ?? ''} onChange={(e) => set(e.target.value)}><option value="">{r.empty || 'Choose…'}</option>{r.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
                        : <Input {...p} maxLength={r.max || 200} value={rowData[x.asset.id]?.[r.name] ?? ''} onChange={(e) => set(e.target.value)} />}
                    </Field>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
