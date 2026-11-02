import { useRef, useState } from 'react'
import { Copy, FileText, Replace, Trash2, Upload } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, Spinner, Toggle, fmtDate, useDebounced, useFetch, useToast } from '../ui.jsx'

const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/** Image thumbnails need the session cookie, so they are fetched with credentials and shown from a blob URL. */
function Thumb({ asset }) {
  const { data } = useFetch(async () => {
    if (!asset.content_type.startsWith('image/')) return null
    const { blob } = await api(asset.preview_url.replace(/^\/?/, '/'), { as: 'blob' })
    return URL.createObjectURL(blob)
  }, [asset.id, asset.updated_at])
  return data
    ? <img src={data} alt={asset.alt_text || asset.filename} className="h-full w-full object-cover" />
    : <span className="grid h-full w-full place-items-center text-soft"><FileText className="size-8" aria-hidden="true" /></span>
}

function AssetDialog({ asset, max, onClose, onChanged }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const [alt, setAlt] = useState(asset.alt_text || '')
  const [pub, setPub] = useState(asset.is_public)
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState(false)
  const run = async (name, fn, ok, close) => { setBusy(name); try { await fn(); toast(ok); onChanged(); if (close) onClose() } catch (e) { toast(e.message, 'error') } finally { setBusy(''); setConfirm(false) } }
  const replace = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > max) return toast(`That file is too large (max ${size(max)}).`, 'error')
    run('replace', () => api(`/api/admin/media/${asset.id}/file`, { method: 'PUT', rawBody: file, contentType: file.type }), 'File replaced', true)
  }
  const url = asset.url ? `${window.location.origin}${asset.url}` : null
  return (
    <Modal open onClose={onClose} title={asset.filename}
      footer={<><Btn kind="danger" onClick={() => setConfirm(true)}><Trash2 className="size-4" aria-hidden="true" /> Delete</Btn>
        <Btn loading={busy === 'replace'} onClick={() => fileRef.current?.click()}><Replace className="size-4" aria-hidden="true" /> Replace file</Btn>
        <Btn kind="primary" loading={busy === 'save'} onClick={() => run('save', () => api(`/api/admin/media/${asset.id}`, { method: 'PATCH', body: { alt_text: alt, is_public: pub } }), 'Saved', true)}>Save</Btn></>}>
      <input ref={fileRef} type="file" className="sr-only" tabIndex={-1} accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" onChange={replace} aria-label="Choose a replacement file" />
      <div className="mb-4 grid h-48 place-items-center overflow-hidden rounded-xl border border-edge bg-glass"><Thumb asset={asset} /></div>
      <p className="mb-3 text-sm text-soft">{asset.content_type} · {size(asset.size_bytes)} · uploaded {fmtDate(asset.created_at)}</p>
      <div className="space-y-3">
        <Field label="Alt text (describes the image for screen readers)">{(p) => <Input {...p} maxLength={200} value={alt} onChange={(e) => setAlt(e.target.value)} />}</Field>
        <Toggle checked={pub} onChange={setPub} label={pub ? 'Public: anyone with the link can view it' : 'Private: only admins can view it'} />
        {url && <div className="flex items-center gap-2 rounded-lg border border-edge bg-glass p-2 text-xs"><code className="flex-1 break-all">{url}</code><Btn aria-label="Copy link" onClick={() => navigator.clipboard?.writeText(url).then(() => toast('Link copied'))}><Copy className="size-4" aria-hidden="true" /></Btn></div>}
      </div>
      <ConfirmDialog open={confirm} busy={busy === 'delete'} title="Delete this file?" onClose={() => setConfirm(false)} onConfirm={() => run('delete', () => api(`/api/admin/media/${asset.id}`, { method: 'DELETE' }), 'File deleted', true)}>
        “{asset.filename}” will be removed permanently. Anything using its link will stop showing it.
      </ConfirmDialog>
    </Modal>
  )
}

export default function Media() {
  const toast = useToast()
  const fileRef = useRef(null)
  const [page, setPage] = useState(1)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(null)
  const [uploading, setUploading] = useState(false)
  const q = useDebounced(text)
  const { data, error, loading, reload } = useFetch(() => api(`/api/admin/media?page=${page}&page_size=24${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`), [page, q])
  const max = data?.limits?.max_bytes || 2097152

  const upload = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    let ok = 0
    for (const file of files) {
      if (file.size > max) { toast(`${file.name}: too large (max ${size(max)})`, 'error'); continue }
      try { await api(`/api/admin/media?filename=${encodeURIComponent(file.name)}`, { method: 'POST', rawBody: file, contentType: file.type || 'application/octet-stream' }); ok += 1 } catch (err) { toast(`${file.name}: ${err.message}`, 'error') }
    }
    setUploading(false)
    if (ok) { toast(`${ok} ${ok === 1 ? 'file' : 'files'} uploaded (private by default)`); setPage(1); reload() }
  }

  return (
    <>
      <PageHeader title="Media library" lead="Images (PNG, JPEG, GIF, WebP) and PDFs, stored in the database. New files are private until you make them public. SVG is not accepted."
        actions={<><input ref={fileRef} type="file" multiple className="sr-only" tabIndex={-1} accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" onChange={upload} aria-label="Choose files to upload" /><Btn kind="primary" loading={uploading} onClick={() => fileRef.current?.click()}><Upload className="size-4" aria-hidden="true" /> Upload</Btn></>} />
      <Card className="mb-4"><Field label="Search by file name">{(p) => <Input {...p} className="max-w-sm" value={text} onChange={(e) => { setText(e.target.value); setPage(1) }} />}</Field>
        {data && <p className="mt-2 text-xs text-soft">{data.usage.files} files · {size(data.usage.bytes)} used · max {size(max)} per file</p>}</Card>
      {loading && !data && <Spinner />}
      {error && !data && <ErrorState error={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? <Card><EmptyState title="No files">{q ? 'No file name matches your search.' : 'Upload an image or PDF to get started.'}</EmptyState></Card> : (
        <>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {data.items.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setOpen(a)} className="group block w-full overflow-hidden rounded-xl border border-edge bg-glass text-left transition-colors hover:border-lav focus-visible:outline-2 focus-visible:outline-lav">
                  <span className="block aspect-square overflow-hidden bg-glass-strong"><Thumb asset={a} /></span>
                  <span className="block p-2.5"><span className="block truncate text-sm font-semibold">{a.filename}</span><span className="mt-1 flex items-center justify-between text-xs text-soft">{size(a.size_bytes)}<Badge value={a.is_public ? 'published' : 'draft'} text={a.is_public ? 'Public' : 'Private'} /></span></span>
                </button>
              </li>
            ))}
          </ul>
          <Card className="mt-4 !p-0"><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} /></Card>
        </>
      ))}
      {open && <AssetDialog asset={open} max={max} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  )
}
