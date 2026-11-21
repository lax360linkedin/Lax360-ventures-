import { useRef, useState } from 'react'
import { ImagePlus, Replace, Trash2 } from 'lucide-react'
import { upload } from '../../services/apiClient.js'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, fmtDate, label, useFetch, useToast } from '../ui.jsx'
import { GAMES, Unavailable, gameTitle, pz, qs } from './shared.jsx'

const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX = 5 * 1024 * 1024
const PURPOSES = [['game_thumbnail', 'Game thumbnail'], ['game_banner', 'Game banner'], ['world_preview', 'World preview'], ['achievement_icon', 'Achievement icon'], ['challenge_art', 'Challenge artwork'], ['promo', 'Promotional media']]
const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

function checkFile(f) {
  if (!f) return 'Choose an image.'
  if (!TYPES.includes(f.type)) return 'Use a PNG, JPEG, WebP or GIF image.'
  if (f.size > MAX) return `This image is ${size(f.size)}. The limit is 5 MB.`
  return ''
}

function UploadDialog({ onClose, onDone }) {
  const toast = useToast()
  const [purpose, setPurpose] = useState('game_thumbnail')
  const [game, setGame] = useState('')
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const pick = (f) => { setFile(f || null); setError(f ? checkFile(f) : ''); if (f && !name) setName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')) }
  const go = async () => {
    const problem = checkFile(file)
    if (problem) return setError(problem)
    setProgress(0); setError('')
    try {
      await upload(`/api/admin/play-zone/media${qs({ filename: file.name, purpose, game, label: name })}`, file, { onProgress: setProgress, contentType: 'application/octet-stream' })
      toast('Image uploaded.'); onDone()
    } catch (e) { setError(e.message || 'The upload failed.'); setProgress(null) }
  }
  return (
    <Modal open onClose={onClose} title="Upload an image" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={progress !== null} disabled={!file || !!checkFile(file)} onClick={go}>Upload</Btn></>}>
      <div className="space-y-4">
        <Field label="What is it for?" required>{(p) => <Select {...p} value={purpose} onChange={(e) => setPurpose(e.target.value)}>{PURPOSES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select>}</Field>
        <Field label="Game" hint="Optional">{(p) => <Select {...p} value={game} onChange={(e) => setGame(e.target.value)}><option value="">Not tied to one game</option>{GAMES.map(([s, t]) => <option key={s} value={s}>{t}</option>)}</Select>}</Field>
        <Field label="Name" hint="Shown in the pickers">{(p) => <Input {...p} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="Image file" required hint="PNG, JPEG, WebP or GIF, up to 5 MB" error={error}>{(p) => <Input {...p} type="file" accept={TYPES.join(',')} onChange={(e) => pick(e.target.files?.[0])} className="!h-auto py-2" />}</Field>
        {progress !== null && <div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)} className="h-2 overflow-hidden rounded-full bg-glass-strong"><div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} /></div>}
      </div>
    </Modal>
  )
}

export default function GameMedia() {
  const toast = useToast()
  const [purpose, setPurpose] = useState('')
  const [game, setGame] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const [replacing, setReplacing] = useState(null)
  const { data, error, loading, reload } = useFetch(() => pz('/media', { params: { purpose, game, page, page_size: 12 } }), [purpose, game, page])
  const remove = async () => {
    setBusy(true)
    try { await pz(`/media/${del.id}`, { method: 'DELETE' }); toast('Image deleted.'); setDel(null); reload() } catch (e) { toast(e.message, 'error'); setDel(null) } finally { setBusy(false) }
  }
  const replace = async (f) => {
    const m = replacing; setReplacing(null)
    const problem = checkFile(f)
    if (problem) return toast(problem, 'error')
    try { await upload(`/api/admin/play-zone/media/${m.id}/file`, f, { method: 'PUT', contentType: 'application/octet-stream' }); toast('Image replaced. Everything that uses it now shows the new picture.'); reload() } catch (e) { toast(e.message || 'The replacement failed.', 'error') }
  }
  return (
    <>
      <PageHeader title="Game media" lead="Thumbnails, banners, world previews, achievement icons, challenge artwork and promotional images. Files are kept in the website's permanent media storage and delivered over HTTPS." actions={<Btn kind="primary" onClick={() => setAdding(true)}><ImagePlus className="size-4" aria-hidden="true" />Upload image</Btn>} />
      <Card className="mb-4"><div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type">{(p) => <Select {...p} value={purpose} onChange={(e) => { setPurpose(e.target.value); setPage(1) }}><option value="">All types</option>{PURPOSES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select>}</Field>
        <Field label="Game">{(p) => <Select {...p} value={game} onChange={(e) => { setGame(e.target.value); setPage(1) }}><option value="">All games</option>{GAMES.map(([s, t]) => <option key={s} value={s}>{t}</option>)}</Select>}</Field>
      </div></Card>
      <input ref={fileRef} type="file" hidden accept={TYPES.join(',')} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) replace(f) }} />
      {loading && !data && <Spinner />}
      {error && <><Unavailable error={error} /><ErrorState error={error} onRetry={reload} /></>}
      {data && (data.items.length === 0 ? <EmptyState title="No images yet">Upload thumbnails and banners, then pick them in Games, Achievements and Daily challenges.</EmptyState> : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((m) => (
              <li key={m.id}><Card className="flex h-full flex-col !p-3">
                <img src={m.url} alt={m.label || m.filename} loading="lazy" decoding="async" className="aspect-video w-full rounded-lg border border-edge bg-glass-strong object-cover" onError={(e) => { e.currentTarget.style.opacity = '0.3' }} />
                <p className="mt-2 truncate font-semibold" title={m.label || m.filename}>{m.label || m.filename}</p>
                <p className="text-xs text-soft">{label(m.purpose)}{m.game ? ` · ${gameTitle(m.game)}` : ''} · {size(m.size_bytes)} · {fmtDate(m.updated_at || m.created_at)}</p>
                <p className="mt-1 text-xs">{m.used_by.length ? <Badge value="active" text={`Used by ${m.used_by.length}`} /> : <Badge value="draft" text="Not in use" />}</p>
                {m.used_by.length > 0 && <p className="mt-1 text-xs text-soft">{m.used_by.slice(0, 3).join(', ')}</p>}
                <div className="mt-auto flex gap-2 pt-3"><Btn className="flex-1" onClick={() => { setReplacing(m); fileRef.current?.click() }}><Replace className="size-4" aria-hidden="true" />Replace</Btn><Btn kind="danger" onClick={() => setDel(m)} aria-label={`Delete ${m.label || m.filename}`}><Trash2 className="size-4" aria-hidden="true" /></Btn></div>
              </Card></li>
            ))}
          </ul>
          <Card className="mt-4 !p-0"><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} /></Card>
        </>
      ))}
      {adding && <UploadDialog onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload() }} />}
      <ConfirmDialog open={!!del} title="Delete this image?" confirmLabel="Delete image" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>
        {del?.used_by.length ? `It is still used by ${del.used_by.join(', ')}. Replace the picture or remove it from there first.` : 'This permanently removes the image. Nothing uses it right now.'}
      </ConfirmDialog>
    </>
  )
}
