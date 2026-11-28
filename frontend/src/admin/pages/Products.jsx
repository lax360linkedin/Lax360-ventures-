import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Copy, Download, Eye, EyeOff, ExternalLink, FileText, Globe, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Editor } from './Content.jsx'
import { portfolioCategoryOf } from '../../data/portfolio.js'
import { productVisuals } from '../../data/products.js'
import { Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, PageHeader, Select, Spinner, fmtDate, useFetch, useToast } from '../ui.jsx'

const TYPE = { product: 'Product', solution: 'Solution', website: 'Website' }
const GROUP_ORDER = ['software', 'webapps', 'mobile', 'websites', 'api', 'ai-agents']

const mediaUrl = (v) => (/^[0-9a-f-]{36}$/i.test(v || '') ? `/api/media/${v}` : v || '')
function thumb(row) {
  const d = row.item.data || {}
  if (row.type === 'solution') return mediaUrl(d.image) || `/assets/solutions/${d.url_slug || row.item.slug}-800.webp`
  if (row.type === 'website') return mediaUrl(d.image) || (d.preview_paths || '').split('\n')[0]?.trim() || ''
  return mediaUrl(d.image) || productVisuals[row.item.slug]?.photo || '' // a product without an uploaded picture shows the built-in photo the website uses
}

/**
 * Products management: ONE place for everything on the public Products page. LAX360's own products, the solutions (software, web and mobile apps, APIs, AI agents) and the live websites are
 * listed together with their pictures, filtered by category, availability and publication, and edited, duplicated, reordered, published or deleted here. The forms are the website-content forms,
 * so a change here is a change on the public pages.
 */
export default function Products() {
  const toast = useToast()
  const kinds = useFetch(() => api('/api/admin/content/kinds'), [])
  const products = useFetch(() => api('/api/admin/content/product'), [])
  const solutions = useFetch(() => api('/api/admin/content/solution').catch(() => []), [])
  const websites = useFetch(() => api('/api/admin/content/website').catch(() => []), [])
  const cats = useFetch(() => api('/api/admin/content/solution_category').catch(() => []), [])
  const modules = useFetch(() => api('/api/admin/content/product_module').catch(() => []), [])
  const resources = useFetch(() => api('/api/admin/content/product_resource').catch(() => []), [])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [pub, setPub] = useState('all')
  const [view, setView] = useState('grid')
  const [edit, setEdit] = useState(null) // { kind, item }
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const spec = (kind) => kinds.data?.kinds.find((k) => k.kind === kind)
  const reloadAll = () => { products.reload(); solutions.reload(); websites.reload(); cats.reload(); modules.reload(); resources.reload(); kinds.reload() }

  const categories = useMemo(() => {
    const fromDb = (cats.data || []).map((c) => ({ slug: c.data?.url_slug || c.slug, label: c.title }))
    return fromDb.length ? fromDb : [['software', 'Software'], ['webapps', 'Web Applications'], ['mobile', 'Mobile Applications'], ['websites', 'Websites'], ['api', 'Headless SaaS & API Solutions'], ['ai-agents', 'AI Agents & Automation']].map(([slug, label]) => ({ slug, label }))
  }, [cats.data])
  const rows = useMemo(() => [
    ...(products.data || []).map((item) => ({ type: 'product', item, category: portfolioCategoryOf(item.slug, item.data?.category, item.data?.portfolio_category), avail: item.data?.status || 'soon' })),
    ...(solutions.data || []).map((item) => ({ type: 'solution', item, category: item.data?.category || '', avail: item.data?.status || 'custom' })),
    ...(websites.data || []).map((item) => ({ type: 'website', item, category: 'websites', avail: item.data?.website_link ? 'live' : 'soon' })),
  ], [products.data, solutions.data, websites.data])
  const catLabel = (slug) => categories.find((c) => c.slug === slug)?.label || slug || 'No category'
  const t = q.trim().toLowerCase()
  const list = rows.filter((r) => (cat === 'all' || r.category === cat) && (pub === 'all' || r.item.status === pub)
    && (!t || `${r.item.title} ${r.item.data?.summary || r.item.data?.pitch || ''}`.toLowerCase().includes(t)))
    .sort((a, b) => (GROUP_ORDER.indexOf(a.category) + 1 || 99) - (GROUP_ORDER.indexOf(b.category) + 1 || 99))
  const filtering = cat !== 'all' || pub !== 'all' || Boolean(t)
  const stats = useMemo(() => {
    const count = (l, slug) => (l || []).filter((i) => i.data?.product === slug).length
    return (slug) => ({ modules: count(modules.data, slug), downloads: count(resources.data, slug) })
  }, [modules.data, resources.data])

  if (kinds.loading && !kinds.data) return <Spinner />
  if (kinds.error && !kinds.data) return <ErrorState error={kinds.error} onRetry={kinds.reload} />
  if (!spec('product')) return <Card><EmptyState title="Products are not available">Your account cannot manage website content.</EmptyState></Card>

  const flip = async (r) => {
    try { await api(`/api/admin/content/item/${r.item.id}`, { method: 'PATCH', body: { status: r.item.status === 'published' ? 'draft' : 'published' } }); toast(r.item.status === 'published' ? 'Unpublished: hidden from the website' : 'Published: live on the website'); reloadAll() } catch (e) { toast(e.message, 'error') }
  }
  const duplicate = async (r) => {
    try {
      const data = { ...(r.item.data || {}) }
      const slugKey = r.type === 'solution' ? 'url_slug' : null
      if (slugKey) delete data[slugKey]
      await api(`/api/admin/content/${r.type}`, { method: 'POST', body: { title: `${r.item.title} (copy)`.slice(0, 200), data, status: 'draft', sort_order: (r.item.sort_order || 0) + 1 } })
      toast('Copied as a draft. Edit it, then publish.'); reloadAll()
    } catch (e) { toast(e.message, 'error') }
  }
  const move = async (r, delta) => {
    const sameKind = rows.filter((x) => x.type === r.type).map((x) => x.item)
    const group = sameKind.filter((x) => rows.find((y) => y.item.id === x.id).category === r.category)
    const at = group.findIndex((x) => x.id === r.item.id)
    const other = group[at + delta]
    if (!other) return
    const ids = sameKind.map((x) => x.id)
    const a = ids.indexOf(r.item.id), b = ids.indexOf(other.id)
    ;[ids[a], ids[b]] = [ids[b], ids[a]]
    try { await api(`/api/admin/content/${r.type}/order`, { method: 'PUT', body: { ids } }); toast('Order saved: the Products page follows it'); reloadAll() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${del.item.id}`, { method: 'DELETE' }); toast('Deleted. Consider unpublishing instead next time if you may need it again.'); setDel(null); reloadAll() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const previewUrl = (r) => `${r.type === 'product' ? '/products' : r.type === 'solution' ? '/solutions' : '/websites'}/${r.type === 'solution' ? r.item.data?.url_slug || r.item.slug : r.item.slug}?cms_preview=1`
  const link = (kind, slug) => `/company-admin/content?kind=${kind}&product=${encodeURIComponent(slug)}`
  const canNew = (kind) => Boolean(spec(kind))

  return (
    <>
      <PageHeader title="Products" lead="Everything on the public Products page in one place: LAX360 products, solutions by category, and live websites. Edit content, pictures and galleries, live and demo links, button texts, availability and SEO; publish, unpublish, duplicate, reorder or delete."
        actions={<>
          <a href="/products?cms_preview=1" target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> Preview products page</Btn></a>
          {canNew('product') && <Btn kind="primary" onClick={() => setEdit({ kind: 'product', item: null })}><Plus className="size-4" aria-hidden="true" /> New product</Btn>}
          {canNew('solution') && <Btn kind="primary" onClick={() => setEdit({ kind: 'solution', item: null })}><Plus className="size-4" aria-hidden="true" /> New solution</Btn>}
          {canNew('website') && <Btn kind="primary" onClick={() => setEdit({ kind: 'website', item: null })}><Plus className="size-4" aria-hidden="true" /> New website</Btn>}
        </>} />

      <div role="group" aria-label="Category" className="mb-3 flex flex-wrap gap-2">
        {[{ slug: 'all', label: 'All Products' }, ...categories].map((c) => {
          const n = c.slug === 'all' ? rows.length : rows.filter((r) => r.category === c.slug).length
          return <button key={c.slug} type="button" aria-pressed={cat === c.slug} onClick={() => setCat(c.slug)} className={`min-h-9 rounded-full border px-3.5 text-sm font-medium ${cat === c.slug ? 'border-transparent bg-primary text-white' : 'border-edge text-soft hover:text-fg'}`}>{c.label} <span className="opacity-80">({n})</span></button>
        })}
        {spec('solution_category') && <Link to="/company-admin/content?kind=solution_category" className="inline-flex min-h-9 items-center rounded-full border border-dashed border-lav px-3.5 text-sm font-semibold text-lav hover:underline">Manage categories</Link>}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Search products">
        <Field label="Search" className="min-w-[14rem] flex-1">{(p) => <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-soft" aria-hidden="true" /><Input {...p} className="pl-9" placeholder="Search by name or description" value={q} onChange={(e) => setQ(e.target.value)} /></div>}</Field>
        <Field label="Show">{(p) => <Select {...p} value={pub} onChange={(e) => setPub(e.target.value)}><option value="all">All</option><option value="published">On the website</option><option value="draft">Hidden</option></Select>}</Field>
        <div className="flex gap-1" role="group" aria-label="View">
          <Btn kind={view === 'grid' ? 'primary' : 'ghost'} aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Grid</Btn>
          <Btn kind={view === 'table' ? 'primary' : 'ghost'} aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</Btn>
        </div>
        {filtering && <Btn kind="ghost" onClick={() => { setQ(''); setCat('all'); setPub('all') }}>Clear filters</Btn>}
      </div>
      <p className="mb-3 text-sm text-soft" role="status">{list.length} of {rows.length} shown </p>

      {(products.loading && !products.data) && <Spinner />}
      {products.data && rows.length === 0 && <Card><EmptyState title="Nothing here yet">Run <code>python -m app.cli migrate-content</code> once after deploying to load the products, websites and solutions, or add one with the buttons above.</EmptyState></Card>}

      {list.length > 0 && view === 'grid' && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => {
            const src = thumb(r)
            const s = r.type === 'product' ? stats(r.item.slug) : null
            const group = rows.filter((x) => x.type === r.type && x.category === r.category)
            const at = group.findIndex((x) => x.item.id === r.item.id)
            return (
              <li key={`${r.type}-${r.item.id}`}>
                <Card className={`flex h-full flex-col !p-0 overflow-hidden ${r.item.status !== 'published' ? 'opacity-60' : ''}`}>
                  <div className="relative aspect-[3/2] bg-glass-strong">
                    {src ? <img src={src} alt="" loading="lazy" className="size-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} /> : <span className="flex size-full items-center justify-center text-soft"><Globe className="size-8" aria-hidden="true" /></span>}
                    <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-0.5 text-xs font-bold text-white">{TYPE[r.type]}</span>
                    {r.item.status !== 'published' && <span className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white" title="Hidden from the website"><EyeOff className="size-4" aria-hidden="true" /><span className="sr-only">Hidden from the website</span></span>}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h2 className="line-clamp-2 font-display text-base font-semibold">{r.item.title}</h2>
                    <p className="text-xs text-soft">{catLabel(r.category)} · updated {fmtDate(r.item.updated_at)}</p>
                    {s && <p className="flex flex-wrap gap-2 text-xs text-soft"><span className="inline-flex items-center gap-1"><Layers className="size-3.5" aria-hidden="true" />{s.modules} modules</span><span className="inline-flex items-center gap-1"><FileText className="size-3.5" aria-hidden="true" />{s.downloads} downloads</span></p>}
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                      <Btn kind="primary" onClick={() => setEdit({ kind: r.type, item: r.item })}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn>
                      <Btn onClick={() => flip(r)}>{r.item.status === 'published' ? <><EyeOff className="size-4" aria-hidden="true" /> Unpublish</> : <><Eye className="size-4" aria-hidden="true" /> Publish</>}</Btn>
                      <a href={previewUrl(r)} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${r.item.title}`}><Btn kind="ghost"><ExternalLink className="size-4" aria-hidden="true" /></Btn></a>
                      <Btn kind="ghost" onClick={() => duplicate(r)} aria-label={`Duplicate ${r.item.title}`} title="Copy as a draft"><Copy className="size-4" aria-hidden="true" /></Btn>
                      {r.type === 'product' && <><Link to={link('product_module', r.item.slug)}><Btn kind="ghost" title="Modules"><Layers className="size-4" aria-hidden="true" /></Btn></Link><Link to={link('product_resource', r.item.slug)}><Btn kind="ghost" title="Downloads"><Download className="size-4" aria-hidden="true" /></Btn></Link></>}
                      <Btn kind="danger" onClick={() => setDel(r)} aria-label={`Delete ${r.item.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                      {!filtering && group.length > 1 && <span className="ml-auto flex"><Btn kind="ghost" disabled={at === 0} onClick={() => move(r, -1)} aria-label={`Move ${r.item.title} earlier`}><ArrowUp className="size-4" aria-hidden="true" /></Btn><Btn kind="ghost" disabled={at === group.length - 1} onClick={() => move(r, 1)} aria-label={`Move ${r.item.title} later`}><ArrowDown className="size-4" aria-hidden="true" /></Btn></span>}
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {list.length > 0 && view === 'table' && (
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge text-xs uppercase tracking-wide text-soft"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Category</th><th className="px-4 py-2">Actions</th></tr></thead>
            <tbody className="divide-y divide-edge">
              {list.map((r) => (
                <tr key={`${r.type}-${r.item.id}`}>
                  <td className="px-4 py-2"><span className="flex items-center gap-2">{thumb(r) && <img src={thumb(r)} alt="" loading="lazy" className="h-9 w-14 rounded object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />}<span className="font-semibold">{r.item.title}</span></span></td>
                  <td className="px-4 py-2">{TYPE[r.type]}</td><td className="px-4 py-2">{catLabel(r.category)}</td>
                  <td className="px-4 py-2"><span className="flex flex-wrap gap-1"><Btn onClick={() => setEdit({ kind: r.type, item: r.item })}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn><Btn onClick={() => flip(r)}>{r.item.status === 'published' ? 'Unpublish' : 'Publish'}</Btn><Btn kind="ghost" onClick={() => duplicate(r)} aria-label={`Duplicate ${r.item.title}`}><Copy className="size-4" aria-hidden="true" /></Btn><Btn kind="danger" onClick={() => setDel(r)} aria-label={`Delete ${r.item.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {rows.length > 0 && list.length === 0 && <Card><EmptyState title="Nothing matches">Try a different search or category.</EmptyState></Card>}

      <p className="mt-6 text-sm text-soft">Live and application links, button texts, galleries and SEO are in each item's form. Pictures labelled as previews on the website are design previews: upload a real screenshot to replace one when you have it.</p>

      {edit && <Editor key={`${edit.kind}-${edit.item?.id || 'new'}`} spec={spec(edit.kind)} item={edit.item} onClose={() => setEdit(null)} onSaved={reloadAll} />}
      <ConfirmDialog open={!!del} title={`Delete this ${del ? TYPE[del.type].toLowerCase() : 'item'}?`} busy={busy} onClose={() => setDel(null)} onConfirm={remove}>“{del?.item.title}” will be removed permanently and disappear from the website. Consider unpublishing instead if you may need it again.</ConfirmDialog>
    </>
  )
}
