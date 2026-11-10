import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Eye, EyeOff, ExternalLink, FileText, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Editor } from './Content.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, PageHeader, Select, Spinner, fmtDate, useFetch, useToast } from '../ui.jsx'

const STATUS = { live: 'Live', beta: 'Beta', in_development: 'In development', soon: 'Coming soon' }

/**
 * Products management: every software product on one screen, with its modules and downloads, and everything you do to a product in one place: edit its
 * details and pictures, add modules and downloads, publish or unpublish, preview the page, reorder, delete. It works on the same website content
 * (Website content > Products), so a change here is a change on the public Products pages.
 */
export default function Products() {
  const toast = useToast()
  const kinds = useFetch(() => api('/api/admin/content/kinds'), [])
  const products = useFetch(() => api('/api/admin/content/product'), [])
  const modules = useFetch(() => api('/api/admin/content/product_module').catch(() => []), [])
  const resources = useFetch(() => api('/api/admin/content/product_resource').catch(() => []), [])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const spec = kinds.data?.kinds.find((k) => k.kind === 'product')
  const all = products.data || []
  const reloadAll = () => { products.reload(); modules.reload(); resources.reload(); kinds.reload() }

  const stats = useMemo(() => {
    const count = (list, slug) => (list || []).filter((i) => i.data?.product === slug)
    return Object.fromEntries(all.map((p) => [p.slug, { modules: count(modules.data, p.slug), resources: count(resources.data, p.slug) }]))
  }, [all, modules.data, resources.data])
  const t = q.trim().toLowerCase()
  const list = all.filter((p) => (status === 'all' || p.status === status) && (!t || `${p.title} ${p.data?.summary || ''}`.toLowerCase().includes(t)))

  if (kinds.loading && !kinds.data) return <Spinner />
  if (kinds.error && !kinds.data) return <ErrorState error={kinds.error} onRetry={kinds.reload} />
  if (!spec) return <Card><EmptyState title="Products are not available">Your account cannot manage website content.</EmptyState></Card>

  const flip = async (p) => {
    try { await api(`/api/admin/content/item/${p.id}`, { method: 'PATCH', body: { status: p.status === 'published' ? 'draft' : 'published' } }); toast(p.status === 'published' ? 'Unpublished: hidden from the website' : 'Published: live on the website'); reloadAll() } catch (e) { toast(e.message, 'error') }
  }
  const move = async (index, delta) => {
    const ids = all.map((p) => p.id)
    const [id] = ids.splice(index, 1)
    ids.splice(index + delta, 0, id)
    try { await api('/api/admin/content/product/order', { method: 'PUT', body: { ids } }); toast('Order saved: the Products page follows it'); products.reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${del.id}`, { method: 'DELETE' }); toast('Product deleted. Its modules and downloads stay in the list; delete them too if they are no longer needed.'); setDel(null); reloadAll() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const link = (kind, p) => `/company-admin/content?kind=${kind}&product=${encodeURIComponent(p.slug)}`

  return (
    <>
      <PageHeader title="Products" lead="Manage your software products: details, categories, pictures, modules, demo websites and downloads. Publish a product to show it on the Products page; unpublish it to hide it."
        actions={<>
          <a href="/products?cms_preview=1" target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> Preview products page</Btn></a>
          <Btn kind="primary" onClick={() => setEdit({ item: null })}><Plus className="size-4" aria-hidden="true" /> New product</Btn>
        </>} />

      <div className="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Search products">
        <Field label="Search" className="min-w-[14rem] flex-1">{(p) => <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-soft" aria-hidden="true" /><Input {...p} className="pl-9" placeholder="Search by name or description" value={q} onChange={(e) => setQ(e.target.value)} /></div>}</Field>
        <Field label="Availability">{(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option>{Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
      </div>

      {products.error && !products.data && <ErrorState error={products.error} onRetry={products.reload} />}
      {products.loading && !products.data && <Spinner />}
      {products.data && all.length === 0 && (
        <Card><EmptyState title="No products yet">The website shows its built-in product list until you publish a product here. Run <code>python -m app.cli seed-products</code> once to load that list so you can edit it, or add a product now.</EmptyState></Card>
      )}
      {list.length > 0 && (
        <ul className="grid gap-4 lg:grid-cols-2">
          {list.map((p) => {
            const i = all.findIndex((x) => x.id === p.id)
            const s = stats[p.slug] || { modules: [], resources: [] }
            const locked = s.resources.filter((r) => r.data?.requires_login !== false).length
            return (
              <li key={p.id}>
                <Card className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg font-semibold">{p.title}</h2>
                      <p className="mt-0.5 text-xs text-soft">{STATUS[p.data?.status] || 'Coming soon'} · {p.data?.category ? p.data.category.replace(/_/g, ' ') : 'no category'} · updated {fmtDate(p.updated_at)}</p>
                    </div>
                    <Badge value={p.status} />
                  </div>
                  {p.data?.summary && <p className="mt-2 line-clamp-2 text-sm text-soft">{p.data.summary}</p>}
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                    <li className="inline-flex items-center gap-1.5 rounded-full border border-edge px-2.5 py-1"><Layers className="size-3.5" aria-hidden="true" />{s.modules.length} module{s.modules.length === 1 ? '' : 's'}</li>
                    <li className="inline-flex items-center gap-1.5 rounded-full border border-edge px-2.5 py-1"><FileText className="size-3.5" aria-hidden="true" />{s.resources.length} download{s.resources.length === 1 ? '' : 's'}{s.resources.length > 0 && ` (${locked} login-only)`}</li>
                    {p.data?.demo_site_link && <li className="inline-flex items-center gap-1.5 rounded-full border border-lav px-2.5 py-1 text-lav">Demo website set</li>}
                    {[1, 2, 3, 4, 5, 6, 7, 8].filter((n) => p.data?.[`screenshot_${n}`]).length > 0 && <li className="rounded-full border border-edge px-2.5 py-1">{[1, 2, 3, 4, 5, 6, 7, 8].filter((n) => p.data?.[`screenshot_${n}`]).length} screenshots</li>}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Btn kind="primary" onClick={() => setEdit({ item: p })}><Pencil className="size-4" aria-hidden="true" /> Edit details</Btn>
                    <Link to={link('product_module', p)}><Btn><Layers className="size-4" aria-hidden="true" /> Modules</Btn></Link>
                    <Link to={link('product_resource', p)}><Btn><Download className="size-4" aria-hidden="true" /> Downloads</Btn></Link>
                    <a href={`/products/${p.slug}?cms_preview=1`} target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> Preview page</Btn></a>
                    <Btn onClick={() => flip(p)}>{p.status === 'published' ? <><EyeOff className="size-4" aria-hidden="true" /> Unpublish</> : <><Eye className="size-4" aria-hidden="true" /> Publish</>}</Btn>
                    <Btn kind="danger" onClick={() => setDel(p)} aria-label={`Delete ${p.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                    {all.length > 1 && !t && status === 'all' && (
                      <span className="ml-auto flex gap-1">
                        <Btn kind="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${p.title} earlier`}>↑</Btn>
                        <Btn kind="ghost" disabled={i === all.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${p.title} later`}>↓</Btn>
                      </span>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
      {products.data && all.length > 0 && list.length === 0 && <Card><EmptyState title="Nothing matches">Try a different search or availability.</EmptyState></Card>}

      <p className="mt-6 text-sm text-soft">Product categories, availability and every product field are described on each product's form. Downloads marked “login required” are sent only to logged-in visitors; they stay private in the media library.</p>

      {edit && <Editor key={edit.item?.id || 'new'} spec={spec} item={edit.item} onClose={() => setEdit(null)} onSaved={reloadAll} />}
      <ConfirmDialog open={!!del} title="Delete this product?" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>“{del?.title}” will be removed permanently and disappear from the website. Consider unpublishing instead if you may need it again.</ConfirmDialog>
    </>
  )
}
