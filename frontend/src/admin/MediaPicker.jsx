import { useRef, useState } from 'react'
import { FileText, Film, ImageOff, Search, Upload } from 'lucide-react'
import { api, upload } from '../services/apiClient.js'
import { Btn, EmptyState, ErrorState, Input, Modal, Select, Spinner, cx, useDebounced, useFetch, useToast } from './ui.jsx'

export const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
export const ACCEPT = { image: 'image/png,image/jpeg,image/gif,image/webp', video: 'video/mp4,video/webm,.mp4,.webm', all: 'image/png,image/jpeg,image/gif,image/webp,application/pdf,video/mp4,video/webm,.mp4,.webm' }

/** Thumbnail of a library item. Public files load straight from their address; private ones are fetched with the admin session. */
export function MediaThumb({ asset, className = '' }) {
  const { data: blobUrl } = useFetch(async () => {
    if (asset.kind !== 'image' || asset.url) return null
    const { blob } = await api(asset.preview_url, { as: 'blob' })
    return URL.createObjectURL(blob)
  }, [asset.id, asset.updated_at, asset.is_public])
  const src = asset.kind === 'image' ? (asset.url || blobUrl) : null
  return (
    <span className={cx('grid h-full w-full place-items-center overflow-hidden bg-glass text-soft', className)}>
      {src ? <img src={src} alt={asset.alt_text || ''} className="h-full w-full object-cover" loading="lazy" />
        : asset.kind === 'video' ? <Film className="size-8" aria-hidden="true" /> : asset.kind === 'document' ? <FileText className="size-8" aria-hidden="true" /> : <ImageOff className="size-8" aria-hidden="true" />}
    </span>
  )
}

/** Uploads files one by one with a progress bar for each. `onUploaded(asset)` fires per success. Errors are shown per file. */
export function useUploader({ onUploaded, limits }) {
  const toast = useToast()
  const [jobs, setJobs] = useState([]) // [{ id, name, progress, state, message }]
  const patch = (id, p) => setJobs((cur) => cur.map((j) => (j.id === id ? { ...j, ...p } : j)))
  const start = async (files, { isPublic = false } = {}) => {
    for (const file of files) {
      const id = `${file.name}-${file.size}-${Math.random()}`
      const isVideo = /^video\//.test(file.type) || /\.(mp4|webm)$/i.test(file.name)
      const max = isVideo ? limits?.video_max_bytes : limits?.max_bytes
      setJobs((cur) => [...cur, { id, name: file.name, progress: 0, state: 'uploading', message: '' }])
      if (max && file.size > max) { patch(id, { state: 'error', message: `Too large (${fmtSize(file.size)}); the limit is ${fmtSize(max)}.` }); continue }
      try {
        const asset = await upload(`/api/admin/media?filename=${encodeURIComponent(file.name)}${isPublic ? '&public=true' : ''}`, file, { onProgress: (p) => patch(id, { progress: p }) })
        patch(id, { progress: 1, state: asset.duplicate ? 'duplicate' : 'done', message: asset.duplicate ? 'This exact file was already in the library, so it was reused.' : 'Uploaded and saved permanently.' })
        onUploaded?.(asset)
      } catch (e) {
        patch(id, { state: 'error', message: e.message })
        toast(`${file.name}: ${e.message}`, 'error')
      }
    }
  }
  return { jobs, start, clear: () => setJobs([]), busy: jobs.some((j) => j.state === 'uploading') }
}

export function UploadProgress({ jobs, onClear }) {
  if (!jobs.length) return null
  return (
    <div className="mb-4 space-y-2" aria-live="polite">
      {jobs.map((j) => (
        <div key={j.id} className="rounded-lg border border-edge p-3 text-sm">
          <div className="flex items-center justify-between gap-3"><span className="truncate font-medium">{j.name}</span><span className={cx('shrink-0 text-xs font-semibold', j.state === 'error' ? 'text-error' : j.state === 'uploading' ? 'text-soft' : 'text-success')}>{j.state === 'uploading' ? `${Math.round(j.progress * 100)}%` : j.state === 'error' ? 'Failed' : 'Saved'}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-glass-strong" role="progressbar" aria-valuenow={Math.round(j.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Upload progress for ${j.name}`}><div className={cx('h-full rounded-full transition-[width]', j.state === 'error' ? 'bg-error' : 'bg-primary')} style={{ width: `${Math.round(j.progress * 100)}%` }} /></div>
          {j.message && <p className={cx('mt-1.5 text-xs', j.state === 'error' ? 'font-medium text-error' : 'text-soft')}>{j.message}</p>}
        </div>
      ))}
      <Btn kind="ghost" onClick={onClear}>Dismiss</Btn>
    </div>
  )
}

/** Choose a file from the library (or upload a new one) for a content field. `kind` limits it to images or videos. */
export function MediaPicker({ open, onClose, onPick, kind }) {
  const fileRef = useRef(null)
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const { data, error, loading, reload } = useFetch(() => api(`/api/admin/media?page_size=30${kind ? `&type=${kind}` : ''}${dq.trim() ? `&q=${encodeURIComponent(dq.trim())}` : ''}`), [kind, dq, open])
  const up = useUploader({ limits: data?.limits, onUploaded: () => reload() })
  if (!open) return null
  return (
    <Modal open wide onClose={onClose} title={kind === 'video' ? 'Choose a video' : kind === 'image' ? 'Choose an image' : 'Choose a file'}
      footer={<><input ref={fileRef} type="file" className="sr-only" tabIndex={-1} accept={ACCEPT[kind || 'all']} onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) up.start(f, { isPublic: true }) }} aria-label="Choose files to upload" />
        <Btn onClick={() => fileRef.current?.click()} loading={up.busy}><Upload className="size-4" aria-hidden="true" /> Upload new</Btn><Btn onClick={onClose}>Cancel</Btn></>}>
      <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" aria-hidden="true" /><Input aria-label="Search files" className="pl-9" placeholder="Search by file name…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <UploadProgress jobs={up.jobs} onClear={up.clear} />
      {loading && !data && <Spinner />}
      {error && !data && <ErrorState error={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? <EmptyState title="Nothing here yet">Upload a file to start your library.</EmptyState> : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {data.items.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => onPick(a)} className="group block w-full overflow-hidden rounded-xl border border-edge text-left transition-colors hover:border-lav focus-visible:outline-2 focus-visible:outline-lav">
                <span className="block aspect-[4/3]"><MediaThumb asset={a} /></span>
                <span className="block truncate px-2 pt-1.5 text-xs font-medium">{a.filename}</span>
                <span className="block px-2 pb-1.5 text-[0.6875rem] text-soft">{fmtSize(a.size_bytes)}{a.usage_count ? ` · used ${a.usage_count}×` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      ))}
    </Modal>
  )
}

/** A form field holding the id of a library item, with preview, choose, change and remove. */
export function MediaField({ value, onChange, kind = 'image', id, ...aria }) {
  const [picking, setPicking] = useState(false)
  const { data, error } = useFetch(() => (value ? api(`/api/admin/media/${value}`) : Promise.resolve(null)), [value])
  return (
    <div id={id} {...aria}>
      {value && data && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-edge p-2">
          <span className="block size-16 shrink-0 overflow-hidden rounded-md"><MediaThumb asset={data} /></span>
          <div className="min-w-0 text-sm"><p className="truncate font-medium">{data.filename}</p><p className="text-xs text-soft">{data.kind} · {fmtSize(data.size_bytes)}</p></div>
        </div>
      )}
      {value && error && <p role="alert" className="mb-2 text-sm text-error">That file no longer exists in the library. Choose another or remove it.</p>}
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => setPicking(true)}>{value ? 'Change' : `Choose ${kind}`}</Btn>
        {value && <Btn kind="ghost" onClick={() => onChange('')}>Remove</Btn>}
      </div>
      <MediaPicker open={picking} kind={kind} onClose={() => setPicking(false)} onPick={(a) => { onChange(a.id); setPicking(false) }} />
    </div>
  )
}

export { Select }
