import { useMemo, useState } from 'react'
import { Eye, EyeOff, ExternalLink, Globe, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Editor } from './Content.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, PageHeader, Select, Spinner, fmtDate, useFetch, useToast } from '../ui.jsx'

const KIND = { client: 'Client website', company: 'LAX360 company website', demo: 'Demonstration project' }
const TYPE = { static: 'Static', dynamic: 'Dynamic', web_app: 'Web application' }
const firstShot = (d) => (d.preview_paths || '').split('\n').map((x) => x.trim()).find(Boolean) || ''

/**
 * Website portfolio management: every entry of “Our Websites & Live Demos” on one screen. Add websites and demo projects, edit their details (type, features,
 * modules, technologies, screenshots), set the live address, mark client / company / demo, feature and reorder them, preview the portfolio and the details page
 * before publishing, publish or unpublish, delete. It edits the same content as Website content > Websites, so each change is a change on the public site.
 */
export default function WebsitesAdmin() {
  const toast = useToast()
  const kinds = useFetch(() => api('/api/admin/content/kinds'), [])
  const sites = useFetch(() => api('/api/admin/content/website'), [])
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('all')
  const [status, setStatus] = useState('all')
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const spec = kinds.data?.kinds.find((k) => k.kind === 'website')
  const all = sites.data || []
  const t = q.trim().toLowerCase()
  const list = useMemo(() => all.filter((s) => (kind === 'all' || s.data?.entry_kind === kind) && (status === 'all' || s.status === status) && (!t || `${s.title} ${s.data?.category || ''} ${s.data?.summary || ''}`.toLowerCase().includes(t))), [all, kind, status, t])

  if (kinds.loading && !kinds.data) return <Spinner />
  if (kinds.error && !kinds.data) return <ErrorState error={kinds.error} onRetry={kinds.reload} />
  if (!spec) return <Card><EmptyState title="The website portfolio is not available">Your account cannot manage website content.</EmptyState></Card>

  const reload = () => { sites.reload(); kinds.reload() }
  const flip = async (s) => {
    try { await api(`/api/admin/content/item/${s.id}`, { method: 'PATCH', body: { status: s.status === 'published' ? 'draft' : 'published' } }); toast(s.status === 'published' ? 'Unpublished: hidden from the website' : 'Published: live on the website'); reload() } catch (e) { toast(e.message, 'error') }
  }
  const move = async (i, delta) => {
    const ids = all.map((s) => s.id)
    const [id] = ids.splice(i, 1)
    ids.splice(i + delta, 0, id)
    try { await api('/api/admin/content/website/order', { method: 'PUT', body: { ids } }); toast('Order saved: the portfolio follows it'); sites.reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${del.id}`, { method: 'DELETE' }); toast('Website deleted from the portfolio'); setDel(null); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Website portfolio" lead="The websites and live demos shown on “Our Websites & Live Demos”. Add a website, set whether it is a client website, a LAX360 company website or a demonstration project, and describe only what it really has."
        actions={<>
          <a href="/websites?cms_preview=1" target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> Preview portfolio</Btn></a>
          <Btn kind="primary" onClick={() => setEdit({ item: null })}><Plus className="size-4" aria-hidden="true" /> New website</Btn>
        </>} />
      <div className="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Search the portfolio">
        <Field label="Search" className="min-w-[14rem] flex-1">{(p) => <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-soft" aria-hidden="true" /><Input {...p} className="pl-9" placeholder="Name, industry or description" value={q} onChange={(e) => setQ(e.target.value)} /></div>}</Field>
        <Field label="Kind">{(p) => <Select {...p} value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">All kinds</option>{Object.entries(KIND).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <Field label="Status">{(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option><option value="published">Published</option><option value="draft">Drafts</option></Select>}</Field>
      </div>

      {sites.error && !sites.data && <ErrorState error={sites.error} onRetry={sites.reload} />}
      {sites.loading && !sites.data && <Spinner />}
      {sites.data && all.length === 0 && <Card><EmptyState title="No websites yet">Run <code>python -m app.cli seed-websites</code> once to load the portfolio, or add a website now.</EmptyState></Card>}
      {list.length > 0 && (
        <ul className="grid gap-4 lg:grid-cols-2">
          {list.map((s) => {
            const i = all.findIndex((x) => x.id === s.id)
            const d = s.data || {}
            const img = firstShot(d)
            return (
              <li key={s.id}>
                <Card className="flex h-full gap-4 !p-4">
                  <div className="hidden aspect-[16/10] w-40 shrink-0 overflow-hidden rounded-lg border border-edge bg-glass sm:block">{img ? <img src={img} alt="" width="320" height="200" loading="lazy" className="size-full object-cover object-top" /> : <span className="flex size-full items-center justify-center text-soft"><Globe className="size-6" aria-hidden="true" /></span>}</div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2"><h2 className="truncate font-display text-lg font-semibold">{s.title}</h2><Badge value={s.status} /></div>
                    <p className="mt-0.5 text-xs text-soft">{d.category || 'No category'} · {KIND[d.entry_kind] || KIND.demo}{d.website_type ? ` · ${TYPE[d.website_type]}` : ''}{d.featured ? ' · featured' : ''} · updated {fmtDate(s.updated_at)}</p>
                    <p className="mt-1 text-xs">{d.website_link ? <a href={d.website_link} target="_blank" rel="noopener noreferrer" className="break-all text-lav hover:underline">{d.website_link}</a> : <span className="font-semibold text-amber-500">No live address yet: add it when the site is ready</span>}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Btn kind="primary" onClick={() => setEdit({ item: s })}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn>
                      <a href={`/websites/${s.slug}?cms_preview=1`} target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> Preview details page</Btn></a>
                      <Btn onClick={() => flip(s)}>{s.status === 'published' ? <><EyeOff className="size-4" aria-hidden="true" /> Unpublish</> : <><Eye className="size-4" aria-hidden="true" /> Publish</>}</Btn>
                      <Btn kind="danger" onClick={() => setDel(s)} aria-label={`Delete ${s.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                      {all.length > 1 && !t && kind === 'all' && status === 'all' && <span className="ml-auto flex gap-1"><Btn kind="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${s.title} earlier`}>↑</Btn><Btn kind="ghost" disabled={i === all.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${s.title} later`}>↓</Btn></span>}
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
      {sites.data && all.length > 0 && list.length === 0 && <Card><EmptyState title="Nothing matches">Try a different search or filter.</EmptyState></Card>}
      <p className="mt-6 text-sm text-soft">The order here is the order on the portfolio (featured websites come first). A website without a live address shows “Live link coming soon” and has no link: nothing is invented.</p>

      {edit && <Editor key={edit.item?.id || 'new'} spec={spec} item={edit.item} onClose={() => setEdit(null)} onSaved={reload} />}
      <ConfirmDialog open={!!del} title="Delete this website?" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>“{del?.title}” will be removed permanently from the portfolio. Consider unpublishing instead if you may need it again.</ConfirmDialog>
    </>
  )
}
