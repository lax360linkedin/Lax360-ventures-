import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Copy, Replace, Search, Trash2, Upload } from 'lucide-react'
import { api, upload } from '../../services/apiClient.js'
import { ACCEPT, MediaThumb, UploadProgress, fmtSize, useUploader } from '../MediaPicker.jsx'
import { Dropzone } from '../ImageUpload.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, Toggle, cx, fmtDate, useDebounced, useFetch, useToast } from '../ui.jsx'

const KIND_LABEL = { image: 'Image', video: 'Video', document: 'Document' }

function Player({ asset }) {
  const src = asset.url || asset.preview_url
  if (asset.kind === 'video') return <video key={asset.id} src={src} controls muted playsInline preload="metadata" className="max-h-72 w-full rounded-lg bg-black" />
  return <div className="grid h-56 place-items-center overflow-hidden rounded-xl border border-edge bg-glass"><MediaThumb asset={asset} /></div>
}

function UsageList({ items }) {
  if (!items) return <Spinner label="Checking where it is used…" />
  if (!items.length) return <p className="text-sm text-soft">Not used anywhere on the website yet.</p>
  return (
    <ul className="space-y-1 text-sm">
      {items.map((u, i) => <li key={i} className="flex flex-wrap items-center gap-2"><Badge value={u.status} /><span>{u.type === 'setting' ? `Website setting: ${u.key}` : `${u.kind.replace(/_/g, ' ')}: ${u.title}`}</span></li>)}
    </ul>
  )
}

function AssetDialog({ asset, onClose, onChanged }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const [alt, setAlt] = useState(asset.alt_text || '')
  const [pub, setPub] = useState(asset.is_public)
  const [busy, setBusy] = useState('')
  const [progress, setProgress] = useState(0)
  const [dropOld, setDropOld] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const usage = useFetch(() => api(`/api/admin/media/${asset.id}/usage`), [asset.id])
  const items = usage.data?.items
  const inUse = (items || []).length > 0
  const run = async (name, fn, ok, close) => { setBusy(name); try { const r = await fn(); toast(ok); onChanged(); if (close) onClose(); return r } catch (e) { toast(e.message, 'error') } finally { setBusy(''); setConfirm(false) } }
  const replace = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProgress(0)
    run('replace', () => upload(`/api/admin/media/${asset.id}/file?filename=${encodeURIComponent(file.name)}${dropOld ? '&delete_previous=true' : ''}`, file, { method: 'PUT', onProgress: setProgress }), dropOld ? 'File replaced (the previous file was deleted)' : 'File replaced (the previous file was kept in the library)', true)
  }
  const url = asset.url ? (asset.url.startsWith('http') ? asset.url : `${window.location.origin}${asset.url}`) : null
  return (
    <Modal open onClose={onClose} title={asset.filename} wide
      footer={<><Btn kind="danger" onClick={() => setConfirm(true)}><Trash2 className="size-4" aria-hidden="true" /> Delete</Btn>
        <Btn loading={busy === 'replace'} onClick={() => fileRef.current?.click()}><Replace className="size-4" aria-hidden="true" /> Replace file</Btn>
        <Btn kind="primary" loading={busy === 'save'} onClick={() => run('save', () => api(`/api/admin/media/${asset.id}`, { method: 'PATCH', body: { alt_text: alt, is_public: pub } }), 'Saved', true)}>Save</Btn></>}>
      <input ref={fileRef} type="file" className="sr-only" tabIndex={-1} accept={ACCEPT[asset.kind === 'video' ? 'video' : 'all']} onChange={replace} aria-label="Choose a replacement file" />
      <Player asset={asset} />
      <p className="mt-3 text-sm text-soft">{KIND_LABEL[asset.kind]} · {asset.content_type} · {fmtSize(asset.size_bytes)} · uploaded {fmtDate(asset.created_at)} · stored in {asset.storage === 'supabase' ? 'permanent cloud storage' : asset.storage === 'db' ? 'the database (older upload)' : 'local storage'}</p>
      {busy === 'replace' && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-glass-strong" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-label="Replacement upload progress"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
      <div className="mt-4 space-y-3">
        {asset.kind === 'image' && <Field label="Alt text (describes the image for screen readers)">{(p) => <Input {...p} maxLength={200} value={alt} onChange={(e) => setAlt(e.target.value)} />}</Field>}
        <Toggle checked={pub} onChange={setPub} label={pub ? 'Public: can be shown on the website' : 'Private: only admins can open it (it becomes public automatically when published content uses it)'} />
        <Toggle checked={dropOld} onChange={setDropOld} label="When replacing, also delete the previous file permanently (off = keep it as its own library item)" />
        {url && <div className="flex items-center gap-2 rounded-lg border border-edge bg-glass p-2 text-xs"><code className="flex-1 break-all">{url}</code><Btn aria-label="Copy link" onClick={() => navigator.clipboard?.writeText(url).then(() => toast('Link copied'))}><Copy className="size-4" aria-hidden="true" /></Btn></div>}
        <div><h3 className="mb-1 text-sm font-semibold">Where it is used</h3><UsageList items={items} /></div>
      </div>
      <ConfirmDialog open={confirm} busy={busy === 'delete'} title={inUse ? 'This file is in use. Delete it anyway?' : 'Delete this file?'} confirmLabel={inUse ? 'Delete anyway' : 'Delete'} onClose={() => setConfirm(false)}
        onConfirm={() => run('delete', () => api(`/api/admin/media/${asset.id}${inUse ? '?force=true' : ''}`, { method: 'DELETE' }), 'File deleted from the library and storage', true)}>
        {inUse ? `“${asset.filename}” is used in ${items.length} place(s) on the website (listed above). Those places will lose it. This cannot be undone.` : `“${asset.filename}” will be removed permanently from the library and from storage. This cannot be undone.`}
      </ConfirmDialog>
    </Modal>
  )
}

export default function Media() {
  const toast = useToast()
  const fileRef = useRef(null)
  const [page, setPage] = useState(1)
  const [text, setText] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState('newest')
  const q = useDebounced(text)
  const [open, setOpen] = useState(null)
  const { data, error, loading, reload } = useFetch(() => api(`/api/admin/media?page=${page}&page_size=24&sort=${sort}${type ? `&type=${type}` : ''}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`), [page, q, type, sort])
  const up = useUploader({ limits: data?.limits, onUploaded: () => { setPage(1); reload() } })

  return (
    <div>
      <PageHeader title="Media library" lead="Every image, document and video used on the website. Files stay in the library until you delete them: refreshing, signing out, restarting the server or redeploying never removes them."
        actions={<>
          <input ref={fileRef} type="file" multiple className="sr-only" tabIndex={-1} accept={ACCEPT.all} aria-label="Choose files to upload" onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) up.start(f) }} />
          <Btn kind="primary" loading={up.busy} onClick={() => fileRef.current?.click()}><Upload className="size-4" aria-hidden="true" /> Upload files</Btn>
        </>} />
      {data?.storage && (data.storage.durable
        ? <p className="mb-4 flex items-center gap-2 text-sm text-soft"><CheckCircle2 className="size-4 text-success" aria-hidden="true" /> Stored permanently in {data.storage.detail}. {data.usage.files} file(s), {fmtSize(data.usage.bytes)}.</p>
        : <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span><strong>Uploads are switched off.</strong> {data.storage.warning}</span></p>)}
      <UploadProgress jobs={up.jobs} onClear={up.clear} />
      <Dropzone compact className="mb-4" busy={up.busy} onFiles={(f) => up.start(f, { isPublic: true })} title="Drag pictures here or paste them with Ctrl+V to add them to the library (videos and documents: use Upload files)" />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" aria-hidden="true" /><Input aria-label="Search files" className="pl-9" placeholder="Search by file name…" value={text} onChange={(e) => { setText(e.target.value); setPage(1) }} /></div>
          <Select aria-label="File type" value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}><option value="">All types</option><option value="image">Images</option><option value="video">Videos</option><option value="document">Documents</option></Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name</option><option value="size">Largest first</option></Select>
        </div>
      </Card>
      {loading && !data && <Spinner />}
      {error && !data && <ErrorState error={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? <Card><EmptyState title="No files found">Upload images or videos to use them across the website.</EmptyState></Card> : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {data.items.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setOpen(a)} className="group block w-full overflow-hidden rounded-xl border border-edge bg-glass text-left transition-colors hover:border-lav focus-visible:outline-2 focus-visible:outline-lav" aria-label={`Open ${a.filename}`}>
                  <span className="block aspect-[4/3]"><MediaThumb asset={a} /></span>
                  <span className="block truncate px-2.5 pt-2 text-sm font-medium">{a.filename}</span>
                  <span className="flex flex-wrap items-center gap-1.5 px-2.5 pb-2.5 pt-1 text-xs text-soft">
                    {KIND_LABEL[a.kind]} · {fmtSize(a.size_bytes)}
                    <span className={cx('rounded-full px-2 py-0.5 font-semibold', a.used_by_published ? 'bg-success/15 text-success' : a.usage_count ? 'bg-amber-500/15 text-amber-500' : 'bg-glass-strong')}>{a.used_by_published ? 'In use' : a.usage_count ? 'Draft use' : 'Unused'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      ))}
      {open && <AssetDialog asset={open} onClose={() => setOpen(null)} onChanged={() => { reload() }} />}
    </div>
  )
}
