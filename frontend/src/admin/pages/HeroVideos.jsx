import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CalendarClock, Film, Pencil, Play, Replace, Trash2, Upload } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Spinner, Toggle, cx, useFetch, useToast } from '../ui.jsx'

const BASE = '/api/admin/hero-videos'
const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const length = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '—')
const stem = (name) => name.replace(/\.[^.]+$/, '').slice(0, 120)
const UPLOAD_TIMEOUT = 10 * 60 * 1000

/** Read the file in this browser first: is it playable, how long, and grab a frame to use as the poster shown while the video loads. */
function inspect(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.preload = 'metadata'
    let settled = false
    const done = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      v.removeAttribute('src')
      v.load()
      URL.revokeObjectURL(url)
      resolve(result)
    }
    const timer = setTimeout(() => done({ error: 'This browser could not read the video. Check that it is a normal H.264 MP4 or WebM file.' }), 20000)
    v.onerror = () => done({ error: 'This video cannot be played in a browser (unsupported codec or damaged file). Export it as H.264 MP4 or WebM and try again.' })
    v.onloadedmetadata = () => {
      if (!Number.isFinite(v.duration) || v.duration < 1) return done({ error: 'The video is too short or its length cannot be read.' })
      v.currentTime = Math.min(1, v.duration / 2)
    }
    v.onseeked = () => {
      const info = { duration: v.duration, width: v.videoWidth, height: v.videoHeight }
      try {
        const scale = Math.min(1, 1280 / (v.videoWidth || 1280))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(v.videoWidth * scale)
        canvas.height = Math.round(v.videoHeight * scale)
        canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((poster) => done({ ...info, poster }), 'image/jpeg', 0.8)
      } catch {
        done(info)
      }
    }
    v.src = url
  })
}

function UploadDialog({ files, limits, onClose, onDone }) {
  const [rows, setRows] = useState(() => files.map((file) => ({ file, title: stem(file.name), state: 'checking', message: '' })))
  const [busy, setBusy] = useState(false)
  const started = useRef(false)
  const patch = (i, p) => setRows((cur) => cur.map((r, n) => (n === i ? { ...r, ...p } : r)))

  if (!started.current) {
    started.current = true
    rows.forEach(async (row, i) => {
      if (!/\.(mp4|m4v|webm)$/i.test(row.file.name)) return patch(i, { state: 'error', message: 'Unsupported file type. Choose an MP4 or WebM video.' })
      if (row.file.size > limits.max_bytes) return patch(i, { state: 'error', message: `Too large (${size(row.file.size)}). The limit is ${size(limits.max_bytes)}.` })
      const info = await inspect(row.file)
      if (info.error) return patch(i, { state: 'error', message: info.error })
      if (info.duration > limits.max_seconds) return patch(i, { state: 'error', message: `Too long (${length(info.duration)}). Background videos should be a short loop.` })
      const note = info.width > 1920 ? 'Larger than Full HD: a 1080p version would load faster.' : ''
      patch(i, { state: 'ready', info, message: note })
    })
  }

  const upload = async () => {
    setBusy(true)
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      if (row.state !== 'ready') continue
      patch(i, { state: 'uploading', message: '' })
      try {
        const created = await api(`${BASE}?filename=${encodeURIComponent(row.file.name)}&title=${encodeURIComponent(row.title.trim() || stem(row.file.name))}`, { method: 'POST', rawBody: row.file, contentType: row.file.type || 'video/mp4', timeoutMs: UPLOAD_TIMEOUT })
        if (row.info?.poster) await api(`${BASE}/${created.id}/poster`, { method: 'PUT', rawBody: row.info.poster, contentType: 'image/jpeg' }).catch(() => {})
        patch(i, { state: 'done', message: 'Uploaded and added to the end of the queue.' })
      } catch (e) {
        patch(i, { state: 'error', message: e.message })
      }
    }
    setBusy(false)
    onDone()
  }
  const ready = rows.filter((r) => r.state === 'ready').length
  const finished = rows.every((r) => ['done', 'error'].includes(r.state)) && rows.some((r) => r.state === 'done')
  return (
    <Modal open wide onClose={busy ? () => {} : onClose} title="Upload homepage videos"
      footer={<><Btn onClick={onClose} disabled={busy}>{finished ? 'Close' : 'Cancel'}</Btn>{!finished && <Btn kind="primary" loading={busy} disabled={!ready} onClick={upload}><Upload className="size-4" aria-hidden="true" /> Upload {ready || ''} {ready === 1 ? 'video' : 'videos'}</Btn>}</>}>
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={i} className="rounded-xl border border-edge p-3">
            <p className="text-xs text-soft">{r.file.name} · {size(r.file.size)}{r.info ? ` · ${length(r.info.duration)} · ${r.info.width}×${r.info.height}` : ''}</p>
            <Field label="Title" className="mt-2">{(p) => <Input {...p} maxLength={120} value={r.title} disabled={r.state !== 'ready'} onChange={(e) => patch(i, { title: e.target.value })} />}</Field>
            <p role={r.state === 'error' ? 'alert' : 'status'} className={cx('mt-2 text-sm', r.state === 'error' ? 'font-medium text-error' : r.state === 'done' ? 'text-success' : 'text-soft')}>
              {r.state === 'checking' ? 'Checking the video…' : r.state === 'uploading' ? 'Uploading… keep this window open.' : r.message || (r.state === 'ready' ? 'Ready to upload.' : '')}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-soft">MP4 (H.264) or WebM, up to {size(limits.max_bytes)} and {Math.round(limits.max_seconds / 60)} minutes. Use a short, silent, looping clip (10–30 seconds, 1080p or less) for the best result. New videos join the end of the queue and never interrupt the one that is playing.</p>
    </Modal>
  )
}

export default function HeroVideos() {
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => api(BASE), [])
  const [dialogFiles, setDialogFiles] = useState(null)
  const [preview, setPreview] = useState(null)
  const [rename, setRename] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState('')
  const [form, setForm] = useState(null)
  const pickRef = useRef(null)
  const replaceRef = useRef(null)
  const replaceTarget = useRef(null)

  if (loading && !data) return <Spinner />
  if (error && !data) return <ErrorState error={error} onRetry={reload} />
  const { items, config, current, next, limits, usage } = data
  const tz = config.timezone
  const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }) : '—')
  const f = form || { start_date: config.start_date, slot_days: config.slot_days, repeat: config.repeat }
  const run = async (name, fn, ok) => {
    setBusy(name)
    try { await fn(); if (ok) toast(ok); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy('') }
  }
  const move = (index, delta) => {
    const ids = items.map((v) => v.id)
    const [id] = ids.splice(index, 1)
    ids.splice(index + delta, 0, id)
    run(`move-${id}`, () => api(`${BASE}/order`, { method: 'PUT', body: { ids } }), 'Queue order saved')
  }
  const choose = (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (files.length) setDialogFiles(files)
  }
  const replace = async (e) => {
    const file = e.target.files?.[0]
    const target = replaceTarget.current
    e.target.value = ''
    if (!file || !target) return
    if (!/\.(mp4|m4v|webm)$/i.test(file.name)) return toast('Unsupported file type. Choose an MP4 or WebM video.', 'error')
    if (file.size > limits.max_bytes) return toast(`That file is too large (max ${size(limits.max_bytes)}).`, 'error')
    run(`replace-${target.id}`, async () => {
      const info = await inspect(file)
      if (info.error) throw new Error(info.error)
      await api(`${BASE}/${target.id}/file?filename=${encodeURIComponent(file.name)}`, { method: 'PUT', rawBody: file, contentType: file.type || 'video/mp4', timeoutMs: UPLOAD_TIMEOUT })
      if (info.poster) await api(`${BASE}/${target.id}/poster`, { method: 'PUT', rawBody: info.poster, contentType: 'image/jpeg' }).catch(() => {})
    }, 'Video replaced')
  }

  return (
    <div>
      <PageHeader title="Homepage Background Videos" lead="Videos for the homepage hero. Each active video gets its own slot (3 days by default) and loops continuously during it, then the next one takes over automatically."
        actions={<>
          <input ref={pickRef} type="file" multiple className="sr-only" tabIndex={-1} accept="video/mp4,video/webm,.mp4,.m4v,.webm" onChange={choose} aria-label="Choose videos to upload" />
          <input ref={replaceRef} type="file" className="sr-only" tabIndex={-1} accept="video/mp4,video/webm,.mp4,.m4v,.webm" onChange={replace} aria-label="Choose a replacement video" />
          <Btn kind="primary" onClick={() => pickRef.current?.click()}><Upload className="size-4" aria-hidden="true" /> Upload videos</Btn>
        </>} />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-soft">Playing now</p>
          {current ? <><p className="mt-1 font-display text-lg font-semibold">{current.title}</p><p className="text-sm text-soft">{current.ends_at ? `Until ${when(current.ends_at)}` : 'Keeps playing: it is the last video and repeat is off'}</p></>
            : <p className="mt-1 text-sm text-soft">{items.some((v) => v.is_active) ? 'Nothing is scheduled yet (see the start date below). The homepage shows its built-in background.' : 'No active video. The homepage shows its built-in background.'}</p>}
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-soft">Up next</p>
          {next ? <><p className="mt-1 font-display text-lg font-semibold">{next.title}</p><p className="text-sm text-soft">Starts {when(next.starts_at)}</p></>
            : <p className="mt-1 text-sm text-soft">{current ? 'The current video keeps looping until another video is scheduled.' : '—'}</p>}
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><CalendarClock className="size-5 text-lav" aria-hidden="true" /> Schedule</h2>
        {config.slot_override_seconds && <p role="status" className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">Development override active: slots are {config.slot_override_seconds} seconds long (HERO_VIDEO_SLOT_SECONDS). Remove it for real 3-day slots.</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Schedule start date" hint={`Midnight, ${tz}. Changing it restarts the rotation from the first video.`}>{(p) => <Input {...p} type="date" value={f.start_date} onChange={(e) => setForm({ ...f, start_date: e.target.value })} />}</Field>
          <Field label="Days per video" hint="1 to 30. Changing it keeps the video that is playing.">{(p) => <Input {...p} type="number" min={1} max={30} value={f.slot_days} onChange={(e) => setForm({ ...f, slot_days: e.target.value })} />}</Field>
          <div className="flex items-end pb-2"><Toggle checked={f.repeat} onChange={(repeat) => setForm({ ...f, repeat })} label={f.repeat ? 'Repeat the queue after the last video' : 'Stay on the last video'} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Btn kind="primary" loading={busy === 'schedule'} disabled={!form} onClick={() => run('schedule', async () => { await api(`${BASE}/schedule`, { method: 'PUT', body: { start_date: f.start_date || null, slot_days: Number(f.slot_days), repeat: f.repeat } }); setForm(null) }, 'Schedule saved')}>Save schedule</Btn>
          <p className="text-xs text-soft">Times are shown in {tz}. {usage.files} {usage.files === 1 ? 'video' : 'videos'}, {size(usage.bytes)} stored on the server.</p>
        </div>
      </Card>

      {!items.length ? (
        <Card><EmptyState title="No videos yet">Upload an MP4 or WebM to give the homepage a moving background. Until then the homepage keeps its built-in background.</EmptyState></Card>
      ) : (
        <ul className="space-y-3" aria-label="Playback queue">
          {items.map((v, i) => (
            <li key={v.id}>
              <Card className={cx('!p-4', v.status === 'playing' && 'border-success/50')}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Btn kind="ghost" className="!min-h-8 !px-2" aria-label={`Move ${v.title} earlier`} disabled={i === 0 || !!busy} onClick={() => move(i, -1)}><ArrowUp className="size-4" aria-hidden="true" /></Btn>
                    <Btn kind="ghost" className="!min-h-8 !px-2" aria-label={`Move ${v.title} later`} disabled={i === items.length - 1 || !!busy} onClick={() => move(i, 1)}><ArrowDown className="size-4" aria-hidden="true" /></Btn>
                  </div>
                  <button type="button" onClick={() => setPreview(v)} aria-label={`Preview ${v.title}`} className="group relative grid h-20 w-36 shrink-0 place-items-center overflow-hidden rounded-lg border border-edge bg-glass">
                    {v.poster_url ? <img src={v.poster_url} alt="" className="h-full w-full object-cover" /> : <Film className="size-7 text-soft" aria-hidden="true" />}
                    <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><Play className="size-6 text-white" aria-hidden="true" /></span>
                  </button>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-soft">#{i + 1}</span><span className="truncate font-display text-base font-semibold">{v.title}</span><Badge value={v.status} /></p>
                    <p className="mt-1 text-xs text-soft">{v.content_type.replace('video/', '').toUpperCase()} · {size(v.size_bytes)} · {length(v.duration_seconds)} · uploaded {when(v.created_at)}</p>
                    <p className="mt-1 text-xs text-soft">{v.status === 'missing_file' ? <span className="font-medium text-error">The video file is missing on the server, so it is skipped. Replace it or delete this entry.</span>
                      : v.starts_at ? <>Slot: {when(v.starts_at)} → {v.ends_at ? when(v.ends_at) : 'no end (last video)'}</> : v.is_active ? 'Not scheduled yet' : 'Switched off: skipped in the rotation'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Toggle checked={v.is_active} disabled={busy === `active-${v.id}`} onChange={(on) => run(`active-${v.id}`, () => api(`${BASE}/${v.id}`, { method: 'PATCH', body: { is_active: on } }), on ? 'Video activated' : 'Video deactivated')} label={<span className="sr-only">{v.is_active ? `Deactivate ${v.title}` : `Activate ${v.title}`}</span>} />
                    <Btn aria-label={`Rename ${v.title}`} onClick={() => setRename({ id: v.id, title: v.title })}><Pencil className="size-4" aria-hidden="true" /></Btn>
                    <Btn aria-label={`Replace the file of ${v.title}`} loading={busy === `replace-${v.id}`} onClick={() => { replaceTarget.current = v; replaceRef.current?.click() }}><Replace className="size-4" aria-hidden="true" /></Btn>
                    <Btn kind="danger" aria-label={`Delete ${v.title}`} onClick={() => setConfirm(v)}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {dialogFiles && <UploadDialog files={dialogFiles} limits={limits} onClose={() => { setDialogFiles(null); reload() }} onDone={reload} />}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title || 'Preview'} wide>
        {preview && (preview.file_ok
          ? <video key={preview.id} src={preview.preview_url} poster={preview.poster_url || undefined} controls autoPlay muted loop playsInline className="max-h-[60vh] w-full rounded-lg bg-black" />
          : <p role="alert" className="text-sm font-medium text-error">The video file is missing on the server.</p>)}
        <p className="mt-2 text-xs text-soft">Preview only: this does not change what visitors see.</p>
      </Modal>
      <Modal open={!!rename} onClose={() => setRename(null)} title="Rename video" footer={<><Btn onClick={() => setRename(null)}>Cancel</Btn><Btn kind="primary" loading={busy === 'rename'} disabled={!rename?.title.trim()} onClick={async () => { await run('rename', () => api(`${BASE}/${rename.id}`, { method: 'PATCH', body: { title: rename.title.trim() } }), 'Title saved'); setRename(null) }}>Save</Btn></>}>
        {rename && <Field label="Title (internal label)">{(p) => <Input {...p} maxLength={120} value={rename.title} onChange={(e) => setRename({ ...rename, title: e.target.value })} />}</Field>}
      </Modal>
      <ConfirmDialog open={!!confirm} busy={busy === 'delete'} title="Delete this video?" onClose={() => setConfirm(null)} onConfirm={async () => { await run('delete', () => api(`${BASE}/${confirm.id}`, { method: 'DELETE' }), 'Video deleted'); setConfirm(null) }}>
        “{confirm?.title}” and its file will be removed permanently.{confirm?.status === 'playing' ? ' It is playing now: the next video takes over immediately.' : ''}
      </ConfirmDialog>
    </div>
  )
}
