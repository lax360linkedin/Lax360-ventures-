import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ChevronRight, ExternalLink, ImageOff, ImagePlus, Images, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { fmtSize, imageLimit, isImage, uploadImage } from '../ImageUpload.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, Spinner, useFetch, useToast } from '../ui.jsx'

const BASE = '/company-admin/pages'
const src = (id) => `/api/admin/media/${id}/file`
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`

/** Admin Panel > Pages > page > section: where you are, and a link back to every level. */
function Crumbs({ trail }) {
  return (
    <nav aria-label="Where you are" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
      <span className="text-soft">Admin Panel</span>
      {trail.map((t, i) => (
        <span key={t.label} className="flex items-center gap-1.5"><ChevronRight className="size-3.5 text-soft" aria-hidden="true" />
          {t.to && i < trail.length - 1 ? <Link to={t.to} className="font-semibold text-lav underline-offset-2 hover:underline">{t.label}</Link> : <span className="font-semibold" aria-current="page">{t.label}</span>}
        </span>
      ))}
    </nav>
  )
}

/** One picture slot: a clear preview, and simple Upload / Replace (click, drop or choose) and Remove controls. A chosen picture is previewed against the current one before it is saved. */
function Slot({ slot, item, busy, onFile, onRemove }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const shown = slot.asset_id ? src(slot.asset_id) : slot.builtin
  const has = Boolean(shown)
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-soft">{slot.label}</p>
      <div role="button" tabIndex={0} aria-label={`${has ? 'Replace' : 'Upload'} ${slot.label} of ${item.title}`}
        onClick={() => !busy && input.current?.click()} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); input.current?.click() } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = [...e.dataTransfer.files].find(isImage); if (f && !busy) onFile(f) }}
        className={`group relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed bg-glass transition-colors focus-visible:outline-2 focus-visible:outline-lav ${over ? 'border-lav bg-primary/10' : has ? 'border-transparent ring-1 ring-edge' : 'border-edge-strong hover:border-lav'}`}>
        {has ? <img src={shown} alt="" loading="lazy" className="size-full object-contain" />
          : <span className="flex flex-col items-center gap-1 px-2 text-center text-xs text-soft"><ImageOff className="size-6" aria-hidden="true" />{slot.missing ? 'The file is missing' : 'No picture yet'}</span>}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/60 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><ImagePlus className="size-3.5" aria-hidden="true" />{has ? 'Replace' : 'Upload'} or drop a picture</span>
        {busy && <span className="absolute inset-0 grid place-items-center bg-black/55"><Loader2 className="size-6 animate-spin text-white" aria-label="Saving" /></span>}
        {!slot.asset_id && slot.builtin && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[0.65rem] font-bold text-white">Built-in sample</span>}
        {slot.missing && <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[0.65rem] font-bold text-black"><AlertTriangle className="size-3" aria-hidden="true" />Missing</span>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f) }} />
      <div className="flex gap-2">
        <Btn className="flex-1" onClick={() => input.current?.click()} disabled={busy}><ImagePlus className="size-4" aria-hidden="true" /> {has ? 'Replace' : 'Upload'}</Btn>
        {(slot.asset_id || slot.builtin || slot.missing) && <Btn kind="danger" onClick={onRemove} disabled={busy} aria-label={`Remove ${slot.label} of ${item.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>}
      </div>
    </div>
  )
}

/** Level 3: the pictures of one section. */
function SectionView({ page, section, reload, base }) {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [onlyEmpty, setOnlyEmpty] = useState(false)
  const [busy, setBusy] = useState('')
  const [removing, setRemoving] = useState(null)
  const [staged, setStaged] = useState(null) // { it, slot, file, url }
  useEffect(() => () => { if (staged?.url) URL.revokeObjectURL(staged.url) }, [staged])
  const term = search.trim().toLowerCase()
  const items = useMemo(() => section.items.filter((it) => (!term || `${it.title} ${it.subtitle} ${it.slots.map((x) => x.label).join(' ')}`.toLowerCase().includes(term)) && (!onlyEmpty || it.slots.some((x) => !x.asset_id))), [section, term, onlyEmpty])

  const body = (it, slot, asset_id) => (it.id === 'site' ? { setting: slot.field, field: slot.field, asset_id } : { item_id: it.id, field: slot.field, asset_id })
  const key = (it, slot) => `${it.id}:${slot.field}`
  const stage = async (it, slot, file) => {
    const max = await imageLimit()
    if (file.size > max) { toast(`That picture is too large (${fmtSize(file.size)}); the limit is ${fmtSize(max)}.`, 'error'); return }
    setStaged({ it, slot, file, url: URL.createObjectURL(file) })
  }
  const save = async () => {
    const { it, slot, file } = staged
    setBusy(key(it, slot))
    try {
      const asset = await uploadImage(file)
      await api('/api/admin/page-images/slot', { method: 'PUT', body: body(it, slot, asset.id) })
      toast(`${slot.label} saved: it is live on the website`)
      setStaged(null)
      reload()
    } catch (e) { toast(e.fields ? Object.values(e.fields).join(' ') : e.message, 'error') } finally { setBusy('') }
  }
  const remove = async () => {
    const { it, slot } = removing
    setRemoving(null)
    setBusy(key(it, slot))
    try { await api('/api/admin/page-images/slot', { method: 'PUT', body: body(it, slot, null) }); toast(`${slot.label} removed from the website`); reload() } catch (e) { toast(e.fields ? Object.values(e.fields).join(' ') : e.message, 'error') } finally { setBusy('') }
  }
  const curSrc = staged && (staged.slot.asset_id ? src(staged.slot.asset_id) : staged.slot.builtin)

  return (
    <>
      <Crumbs trail={[{ label: 'Pages', to: BASE }, { label: page.label, to: `${BASE}/${page.key}` }, { label: section.label }]} />
      <PageHeader title={section.label} lead={`${page.label} page · ${plural(section.count, 'item')}, ${section.filled} of ${plural(section.slots, 'picture slot')} filled. Upload, replace or remove a picture; it goes live on the website as soon as you save.`}
        actions={<>
          <a href={page.path} target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> View {page.label} page</Btn></a>
          {section.manage && <Link to={section.manage}><Btn><Pencil className="size-4" aria-hidden="true" /> Add or edit entries</Btn></Link>}
        </>} />
      {section.note && <Card className="mb-4 !p-4 text-sm text-soft">{section.note}</Card>}
      {section.items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Find a picture">
          <label className="min-w-[14rem] flex-1 text-sm font-semibold">Find<Input className="mt-1" placeholder="Name of the item or picture" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          <label className="flex min-h-10 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)} /> Only items with an empty slot</label>
        </div>
      )}
      {section.items.length === 0 && <Card><EmptyState title="No pictures to manage in this section">{section.note || 'Nothing here carries a picture yet.'}</EmptyState></Card>}
      {section.items.length > 0 && items.length === 0 && <Card><EmptyState title="Nothing matches">Try a different search.</EmptyState></Card>}
      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {items.map((it) => (
          <li key={it.id} className="min-w-0">
            <Card className="!p-4">
              <div className="mb-3 flex items-center gap-2"><div className="min-w-0 flex-1"><h2 className="truncate font-semibold" title={it.title}>{it.title}</h2>{it.subtitle && <p className="truncate text-xs text-soft">{it.subtitle}</p>}</div><Badge value={it.status} /></div>
              <div className={`grid gap-4 ${it.slots.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {it.slots.map((slot) => <Slot key={slot.field} slot={slot} item={it} busy={busy === key(it, slot)} onFile={(f) => stage(it, slot, f)} onRemove={() => setRemoving({ it, slot })} />)}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Modal open={!!staged} onClose={() => !busy && setStaged(null)} title={staged ? `${staged.slot.label}: ${staged.it.title}` : ''}
        footer={<><Btn onClick={() => setStaged(null)} disabled={Boolean(busy)}>Cancel</Btn><Btn kind="primary" loading={Boolean(busy)} onClick={save}>Save and publish to the website</Btn></>}>
        {staged && (
          <div>
            <p className="mb-3 text-sm text-soft">Check the new picture before it replaces the current one. It is saved permanently and appears on the website straight away.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <figure><figcaption className="mb-1 text-xs font-semibold uppercase tracking-wide text-soft">Now on the website</figcaption>
                <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-edge bg-glass">{curSrc ? <img src={curSrc} alt="" className="size-full object-contain" /> : <span className="text-sm text-soft">No picture yet</span>}</div></figure>
              <figure><figcaption className="mb-1 text-xs font-semibold uppercase tracking-wide text-lav">New picture</figcaption>
                <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border-2 border-lav bg-glass"><img src={staged.url} alt="Preview of the new picture" className="size-full object-contain" /></div>
                <p className="mt-1 truncate text-xs text-soft">{staged.file.name} · {fmtSize(staged.file.size)}</p></figure>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!removing} title="Remove this picture?" confirmLabel="Remove" onClose={() => setRemoving(null)} onConfirm={remove}>
        The {removing?.slot.label.toLowerCase()} of “{removing?.it.title}” will be taken off the website. The uploaded file stays in the media library, so you can use it again.
      </ConfirmDialog>
    </>
  )
}

/**
 * Pages: every picture of the website, organised Admin Panel > Pages > page > section > pictures. The pages and sections are generated from what the website really has (its pages, the home
 * and about sections, the categories of the content), so nothing is a fixed sample list. It changes the same content the website reads (one copy of everything): uploads go to the media
 * library's permanent storage, are referenced by id and show on the public page at once. Identical files are stored only once. Built-in sample pictures can be replaced or removed too.
 */
export default function Pages() {
  const params = useParams()
  const [pageKey, sectionKey] = (params['*'] || '').split('/').filter(Boolean)
  const q = useFetch(() => api('/api/admin/page-images'), [])
  if (q.loading && !q.data) return <Spinner />
  if (q.error && !q.data) return <ErrorState error={q.error} onRetry={q.reload} />
  const pages = q.data?.pages || []
  if (!pages.length) return <Card><EmptyState title="Pages are not available">Your account cannot manage website pictures.</EmptyState></Card>
  const page = pages.find((p) => p.key === pageKey)
  const section = page?.sections.find((s) => s.key === sectionKey)

  if (pageKey && !page) return <Card><EmptyState title="That page is not available"><Link to={BASE} className="underline">Back to all pages</Link></EmptyState></Card>
  if (sectionKey && !section) return <Card><EmptyState title="That section is not available"><Link to={`${BASE}/${page.key}`} className="underline">Back to {page.label}</Link></EmptyState></Card>
  if (section) return <SectionView key={`${page.key}/${section.key}`} page={page} section={section} reload={q.reload} base={BASE} />

  if (page) {
    return (
      <>
        <Crumbs trail={[{ label: 'Pages', to: BASE }, { label: page.label }]} />
        <PageHeader title={page.label} lead={`The sections of the ${page.label} page. Choose a section to see and manage its pictures.`}
          actions={<><a href={page.path} target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> View page</Btn></a><Btn onClick={q.reload}><RefreshCw className="size-4" aria-hidden="true" /> Refresh</Btn></>} />
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {page.sections.map((s) => (
            <li key={s.key}>
              <Link to={`${BASE}/${page.key}/${s.key}`} className="block h-full">
                <Card className={`flex h-full flex-col gap-2 !p-5 transition-colors hover:border-lav ${s.slots === 0 ? 'opacity-80' : ''}`}>
                  <div className="flex items-start justify-between gap-2"><h2 className="font-display text-lg font-semibold">{s.label}</h2><ChevronRight className="mt-1 size-5 shrink-0 text-soft" aria-hidden="true" /></div>
                  {s.slots > 0
                    ? <p className="text-sm text-soft">{plural(s.count, 'item')} · <strong className="text-fg">{s.filled}</strong> of {plural(s.slots, 'picture slot')} filled</p>
                    : <p className="text-sm text-soft">{s.note || 'No pictures to manage here.'}</p>}
                  {s.slots > 0 && s.filled < s.slots && <p className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-300"><AlertTriangle className="size-3.5" aria-hidden="true" />{plural(s.slots - s.filled, 'empty slot')}</p>}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <>
      <Crumbs trail={[{ label: 'Pages' }]} />
      <PageHeader title="Pages" lead="Every picture of the website, page by page and section by section. Choose a page, then a section, then upload, replace or remove its pictures. Changes are saved permanently and appear on the website straight away."
        actions={<Btn onClick={q.reload}><RefreshCw className="size-4" aria-hidden="true" /> Refresh</Btn>} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pages.map((p) => (
          <li key={p.key}>
            <Link to={`${BASE}/${p.key}`} className="block h-full">
              <Card className="flex h-full flex-col gap-2 !p-5 transition-colors hover:border-lav">
                <div className="flex items-start justify-between gap-2"><span className="grid size-10 place-items-center rounded-xl bg-primary/20 text-lav"><Images className="size-5" aria-hidden="true" /></span><ChevronRight className="mt-2 size-5 text-soft" aria-hidden="true" /></div>
                <h2 className="font-display text-lg font-semibold">{p.label}</h2>
                <p className="text-sm text-soft">{plural(p.sections.length, 'section')}{p.slots ? ` · ${p.filled} of ${plural(p.slots, 'picture slot')} filled` : ' · no pictures'}</p>
                <p className="mt-auto text-xs text-soft">{p.path}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
