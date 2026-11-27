import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink, EyeOff, FileText, Globe, Link2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { MediaField } from '../MediaPicker.jsx'
import { Editor } from './Content.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Spinner, Textarea, Toggle, cx, useFetch, useToast } from '../ui.jsx'

// The pages of the website that can be given their own SEO (the key matches "Page titles & SEO"; the others are matched by their address).
const PAGES = [
  { key: 'home', label: 'Home page', path: '/' }, { key: 'about', label: 'About', path: '/about' }, { key: 'services', label: 'Services', path: '/services' }, { key: 'products', label: 'Products', path: '/products', byPath: true },
  { key: 'industries', label: 'Industries', path: '/industries' }, { key: 'insights', label: 'Insights', path: '/insights' }, { key: 'network', label: 'Our Network', path: '/our-network' },
  { key: 'team', label: 'Our Team', path: '/our-team' }, { key: 'work', label: 'Work', path: '/work' }, { key: 'career', label: 'Careers', path: '/career' }, { key: 'contact', label: 'Contact', path: '/contact' },
  { key: 'websites', label: 'Websites', path: '/websites', byPath: true }, { key: 'privacy', label: 'Privacy Policy', path: '/privacy', byPath: true }, { key: 'terms', label: 'Terms of Use', path: '/terms', byPath: true },
  { key: 'cad-engineering', label: 'CAD & Engineering Design (upcoming)', path: '/cad-engineering', byPath: true }, { key: 'robotics', label: 'Robotics', path: '/robotics', byPath: true }, { key: 'blockchain', label: 'Blockchain', path: '/blockchain', byPath: true },
]
const SEO_LABEL = 'Page titles & SEO' // the title the server stores when a page entry has no search title of its own: it is not a real title
const src = (id) => (id ? `/api/admin/media/${id}/file` : '')
const origin = typeof window === 'undefined' ? '' : window.location.origin
const host = origin.replace(/^https?:\/\//, '')
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/** How the page may look in Google, WhatsApp and LinkedIn, from the values being edited. */
function Previews({ title, description, image, path, shareTitle = '', shareDescription = '' }) {
  const t = title || 'Page title'
  const d = description || 'The description of the page appears here.'
  const url = `${host}${path === '/' ? '' : path}`
  const st = shareTitle || t
  const sd = shareDescription || d
  return (
    <div className="space-y-4">
      <figure>
        <figcaption className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-soft"><Search className="size-3.5" aria-hidden="true" /> Google search result</figcaption>
        <div className="rounded-xl border border-edge bg-white p-4 text-left text-slate-800">
          <p className="truncate text-xs text-slate-600">{url.replace(/\//g, ' › ')}</p>
          <p className="mt-0.5 text-lg leading-snug text-[#1a0dab]">{clip(t, 60)}</p>
          <p className="mt-0.5 text-sm leading-snug text-slate-600">{clip(d, 155)}</p>
        </div>
        <p className="mt-1 text-xs text-soft">Title {t.length}/60 · description {d.length}/155 characters. Longer text is cut off by Google.</p>
      </figure>
      <figure>
        <figcaption className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-soft">WhatsApp</figcaption>
        <div className="flex max-w-sm overflow-hidden rounded-xl bg-[#dcf8c6] text-left text-slate-800">
          {image ? <img src={image} alt="" className="size-24 shrink-0 object-cover" /> : <span className="grid size-24 shrink-0 place-items-center bg-black/10 text-xs text-slate-500">No image</span>}
          <div className="min-w-0 p-2.5"><p className="line-clamp-2 text-sm font-semibold">{clip(st, 70)}</p><p className="line-clamp-2 text-xs text-slate-600">{clip(sd, 100)}</p><p className="mt-1 truncate text-[0.7rem] text-slate-500">{host}</p></div>
        </div>
      </figure>
      <figure>
        <figcaption className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-soft">LinkedIn</figcaption>
        <div className="max-w-sm overflow-hidden rounded-lg border border-slate-300 bg-white text-left text-slate-800">
          {image ? <img src={image} alt="" className="aspect-[1.91/1] w-full object-cover" /> : <span className="grid aspect-[1.91/1] w-full place-items-center bg-slate-100 text-xs text-slate-500">No image: add a 1200 x 630 picture</span>}
          <div className="p-3"><p className="line-clamp-2 text-sm font-semibold">{clip(st, 90)}</p><p className="mt-0.5 truncate text-xs text-slate-500">{host}</p></div>
        </div>
      </figure>
    </div>
  )
}

/** The home page H1: three lines (the middle one is highlighted on the website), with a live count and the checks that matter for search. Saved to the Home page hero. */
function H1Lines({ lines, setLines, loading }) {
  const full = lines.map((l) => l.trim()).filter(Boolean).join(' ')
  const tips = []
  if (full && full.length > 70) tips.push('Longer than 70 characters: search engines and small screens may cut it.')
  if (full && full.length < 20) tips.push('Very short: include the main keyword the page should rank for.')
  const setLine = (i) => (e) => setLines((l) => l.map((x, n) => (n === i ? e.target.value : x)))
  return (
    <fieldset className="space-y-2 rounded-xl border border-edge p-3" disabled={loading}>
      <legend className="px-1 text-sm font-semibold">H1 heading (the main title at the top of the home page)</legend>
      {['Line 1', 'Line 2 (highlighted)', 'Line 3'].map((label, i) => <Field key={label} label={label}>{(p) => <Input {...p} maxLength={80} value={lines[i]} onChange={setLine(i)} />}</Field>)}
      <p className="text-xs text-soft">One H1 per page, read as: <strong className="text-fg">{full || 'the built-in heading (all three lines empty)'}</strong> · {full.length}/70 characters. Put the main keyword in it and write it for people first. Leave all three empty to keep the built-in heading.</p>
      {tips.map((t) => <p key={t} className="text-xs text-amber-600 dark:text-amber-300">{t}</p>)}
    </fieldset>
  )
}

/** Edit the SEO of one page (an entry of "Page titles & SEO") or one article (its own SEO fields). */
function SeoForm({ mode, target, item, onClose, onSaved }) {
  const toast = useToast()
  const d = item?.data || {}
  const article = mode === 'article'
  const [v, setV] = useState(() => (article
    ? { title: d.seo_title || '', description: d.meta_description || '', keywords: d.seo_keywords || '', image: '', noindex: d.noindex === true, canonical: '', structured: '', h1: '', ogTitle: '', ogDescription: '' }
    : { title: item && item.title !== SEO_LABEL ? item.title : '', description: d.meta_description || '', keywords: d.keywords || '', image: d.image || '', noindex: d.noindex === true, canonical: d.canonical_url || '', structured: d.structured_data || '', h1: d.h1 || '', ogTitle: d.og_title || '', ogDescription: d.og_description || '' }))
  const home = !article && target.key === 'home' // the home page's H1 is the three lines of the home hero (Home page hero): edited here and there, saved once
  const [hero, setHero] = useState(null) // { id, data } of the home hero, or { id: null, data: {} } when none is saved yet
  const [lines, setLines] = useState(['', '', ''])
  useEffect(() => {
    if (!home) return
    api('/api/admin/content/hero').then((list) => { const h = (list || [])[0]; setHero({ id: h?.id || null, data: h?.data || {} }); setLines([h?.data?.headline_1 || '', h?.data?.headline_2 || '', h?.data?.headline_3 || '']) }).catch(() => setHero({ id: null, data: {} }))
  }, [home])
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })) }
  const path = article ? `/insights/${item.slug}` : target.path
  const shownImage = article ? src(d.image) : src(v.image)
  const heading = article ? item.title : target.label

  const save = async () => {
    setBusy(true)
    setErrors({})
    try {
      if (home && hero) { // the H1 (three lines) is saved to the home hero, the one source the public page reads
        const hd = { ...hero.data, headline_1: lines[0].trim(), headline_2: lines[1].trim(), headline_3: lines[2].trim() }
        await (hero.id ? api(`/api/admin/content/item/${hero.id}`, { method: 'PATCH', body: { data: hd, status: 'published' } }) : api('/api/admin/content/hero', { method: 'POST', body: { data: hd, status: 'published' } }))
      }
      if (article) {
        await api(`/api/admin/content/item/${item.id}`, { method: 'PATCH', body: { data: { ...d, seo_title: v.title, meta_description: v.description, seo_keywords: v.keywords, noindex: v.noindex } } })
      } else {
        const data = { ...(target.byPath ? { path: target.path } : { page: target.key }), meta_description: v.description, image: v.image, keywords: v.keywords, noindex: v.noindex, canonical_url: v.canonical, structured_data: v.structured, ...(home ? {} : { h1: v.h1 }), og_title: v.ogTitle, og_description: v.ogDescription }
        const body = { title: v.title, status: 'published', data }
        await (item ? api(`/api/admin/content/item/${item.id}`, { method: 'PATCH', body: { title: v.title, data, status: 'published' } }) : api('/api/admin/content/seo_page', { method: 'POST', body }))
      }
      toast('SEO saved: it is live on the website')
      onSaved()
      onClose()
    } catch (e) { setErrors(e.fields || {}); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error') } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${item.id}`, { method: 'DELETE' }); toast('Back to the built-in text'); onSaved(); onClose() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <Modal open wide onClose={onClose} title={`SEO: ${heading}`}
      footer={<>{!article && item && <Btn kind="danger" onClick={remove} disabled={busy} className="mr-auto">Use the built-in text</Btn>}<Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={save}>Save and publish</Btn></>}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label={article ? 'SEO title' : 'Search title'} error={errors.title || errors.seo_title} hint={article ? 'Leave empty to use the article title.' : 'Shown in search results and the browser tab. About 50 to 60 characters. Leave empty to keep the built-in title.'}>{(p) => <Input {...p} maxLength={article ? 70 : 200} value={v.title} onChange={set('title')} />}</Field>
          <Field label="Meta description" error={errors.meta_description} hint="One or two sentences that make people want to click. About 150 characters.">{(p) => <Textarea {...p} rows={3} maxLength={320} value={v.description} onChange={set('description')} />}</Field>
          {home && <H1Lines lines={lines} setLines={setLines} loading={!hero} />}
          {!article && !home && (
            <Field label="H1 heading (optional)" error={errors.h1} hint={`The main heading at the top of the page, one per page. Leave empty to keep the page's own heading. ${v.h1.length}/70 characters.`}>{(p) => <Input {...p} maxLength={120} value={v.h1} onChange={set('h1')} />}</Field>
          )}
          <Field label="Keywords" error={errors.keywords || errors.seo_keywords} hint="Comma-separated. Search engines give them little weight; they are kept for your own records.">{(p) => <Input {...p} maxLength={200} value={v.keywords} onChange={set('keywords')} />}</Field>
          {!article && (
            <Field label="Social sharing image" error={errors.image} hint="Shown when the page is shared on WhatsApp, LinkedIn, Facebook and X. 1200 x 630 pixels works best.">{(p) => <MediaField {...p} kind="image" value={v.image} onChange={(id) => setV((s) => ({ ...s, image: id || '' }))} />}</Field>
          )}
          {!article && (
            <>
              <Field label="Sharing title (optional)" error={errors.og_title} hint="Shown when the page is shared on WhatsApp, LinkedIn, Facebook and X. Empty: the search title is used.">{(p) => <Input {...p} maxLength={120} value={v.ogTitle} onChange={set('ogTitle')} />}</Field>
              <Field label="Sharing description (optional)" error={errors.og_description} hint="Empty: the meta description is used.">{(p) => <Textarea {...p} rows={2} maxLength={320} value={v.ogDescription} onChange={set('ogDescription')} />}</Field>
            </>
          )}
          {article && <p className="rounded-lg border border-edge p-2.5 text-xs text-soft">The article’s cover image is used when it is shared. Change it in the article itself.</p>}
          <Toggle checked={v.noindex} onChange={(on) => setV((s) => ({ ...s, noindex: on }))} label="Hide from search engines (noindex)" />
          {v.noindex && <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-300"><EyeOff className="size-3.5" aria-hidden="true" /> Google will drop this page and it leaves the live sitemap. Use it for pages that should not appear in search.</p>}
          {!article && (
            <>
              <Field label="Canonical address (optional)" error={errors.canonical_url} hint="Only when this page is a copy of another one: its full https:// address.">{(p) => <Input {...p} maxLength={300} value={v.canonical} onChange={set('canonical')} placeholder="https://" />}</Field>
              <Field label="Extra structured data (optional, advanced)" error={errors.structured_data} hint="A schema.org JSON-LD object added to this page, for example an FAQPage. Invalid JSON is refused.">{(p) => <Textarea {...p} rows={4} maxLength={4000} value={v.structured} onChange={set('structured')} placeholder={'{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": []}'} className="font-mono text-xs" />}</Field>
            </>
          )}
        </div>
        <div><h3 className="mb-3 text-sm font-semibold">Previews</h3><Previews title={v.title || (article ? item.title : '')} description={v.description || (article ? d.excerpt || '' : '')} shareTitle={v.ogTitle} shareDescription={v.ogDescription} image={shownImage} path={path} /></div>
      </div>
    </Modal>
  )
}

function PagesTab({ entries, reload }) {
  const [edit, setEdit] = useState(null)
  const [custom, setCustom] = useState(false)
  const find = (p) => entries.find((e) => (p.byPath ? e.data?.path === p.path : e.data?.page === p.key))
  const extra = entries.filter((e) => e.data?.path && !PAGES.some((p) => p.byPath && p.path === e.data.path))
  return (
    <>
      <p className="mb-4 text-sm text-soft">Set the title, description, H1 heading, sharing text and image, canonical address, keywords and indexing of each page. A page with no entry keeps the text built into the website. Product, industry and partner pages are edited with the page-level entry below or in their own forms.</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {PAGES.map((p) => {
          const e = find(p)
          return (
            <li key={p.key}>
              <Card className="flex h-full items-start gap-3 !p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-lav"><Globe className="size-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">{p.label}{e ? <Badge value="published" text="Custom SEO" /> : <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold text-soft">Built-in</span>}{e?.data?.noindex && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">noindex</span>}</p>
                  <p className="truncate text-xs text-soft">{p.path}</p>
                  {e && <p className="mt-1 line-clamp-2 text-sm text-soft">{e.title !== SEO_LABEL ? e.title : (e.data?.meta_description || 'Built-in title')}</p>}
                </div>
                <Btn onClick={() => setEdit({ target: p, item: e || null })}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn>
              </Card>
            </li>
          )
        })}
        {extra.map((e) => (
          <li key={e.id}><Card className="flex h-full items-start gap-3 !p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-lav"><FileText className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><p className="font-semibold">Page {e.data.path}</p><p className="line-clamp-2 text-sm text-soft">{e.title}</p></div>
            <Btn onClick={() => setEdit({ target: { key: e.slug, label: e.data.path, path: e.data.path, byPath: true }, item: e })}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn></Card></li>
        ))}
      </ul>
      <div className="mt-4"><Btn onClick={() => setCustom(true)}><Plus className="size-4" aria-hidden="true" /> SEO for another page (by its address)</Btn></div>
      {edit && <SeoForm key={edit.target.key} mode="page" target={edit.target} item={edit.item} onClose={() => setEdit(null)} onSaved={reload} />}
      {custom && <AddressDialog onClose={() => setCustom(false)} onPick={(path) => { setCustom(false); setEdit({ target: { key: path, label: path, path, byPath: true }, item: entries.find((e) => e.data?.path === path) || null }) }} />}
    </>
  )
}

function AddressDialog({ onClose, onPick }) {
  const [path, setPath] = useState('/')
  const ok = /^\/[A-Za-z0-9/_.~%-]*$/.test(path)
  return (
    <Modal open onClose={onClose} title="SEO for another page" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!ok} onClick={() => onPick(path.length > 1 ? path.replace(/\/+$/, '') : path)}>Continue</Btn></>}>
      <Field label="Page address" hint="The path of the page, for example /products/lax360-business-crm or /insights/my-article." error={!ok ? 'Start with / and use letters, numbers and dashes only.' : undefined}>{(p) => <Input {...p} value={path} onChange={(e) => setPath(e.target.value.trim())} />}</Field>
    </Modal>
  )
}

function ArticlesTab({ articles, reload }) {
  const [edit, setEdit] = useState(null)
  if (!articles.length) return <Card><EmptyState title="No published articles yet">Articles you add under Website content → Insights articles appear here with their SEO fields. The built-in starter articles keep their own SEO text.</EmptyState></Card>
  return (
    <>
      <ul className="space-y-3">
        {articles.map((a) => (
          <li key={a.id}>
            <Card className="flex flex-wrap items-center gap-3 !p-4">
              <div className="min-w-0 flex-1 basis-64">
                <p className="truncate font-semibold">{a.title}</p>
                <p className="truncate text-xs text-soft">/insights/{a.slug}</p>
                <p className="mt-1 line-clamp-2 text-sm text-soft">{a.data?.seo_title ? `SEO title: ${a.data.seo_title}` : 'SEO title: the article title'}{a.data?.meta_description ? ` · ${a.data.meta_description}` : ' · description: the short summary'}</p>
              </div>
              {a.data?.noindex && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">noindex</span>}
              <Badge value={a.status} />
              <Btn onClick={() => setEdit(a)}><Pencil className="size-4" aria-hidden="true" /> Edit SEO</Btn>
            </Card>
          </li>
        ))}
      </ul>
      {edit && <SeoForm key={edit.id} mode="article" item={edit} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  )
}

function RedirectsTab({ spec, items, reload }) {
  const toast = useToast()
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const remove = async () => { try { await api(`/api/admin/content/item/${del.id}`, { method: 'DELETE' }); toast('Redirect deleted'); setDel(null); reload() } catch (e) { toast(e.message, 'error') } }
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-soft">Send visitors from an old address to a new one, for example when you rename or remove a page. The old address leaves the sitemap. A redirect never loops back to the page being shown.</p>
        <Btn kind="primary" onClick={() => setEdit({ item: null })}><Plus className="size-4" aria-hidden="true" /> Add redirect</Btn>
      </div>
      {!items.length && <Card><EmptyState title="No redirects">Nothing is redirected.</EmptyState></Card>}
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={r.id}>
            <Card className="flex flex-wrap items-center gap-3 !p-3">
              <code className="rounded bg-glass-strong px-2 py-1 text-sm">{r.data.from_path}</code><ArrowRight className="size-4 text-soft" aria-hidden="true" /><code className="min-w-0 truncate rounded bg-glass-strong px-2 py-1 text-sm">{r.data.to_path}</code>
              <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold">{r.data.permanent === false ? 'Temporary (302)' : 'Permanent (301)'}</span>
              {r.data.enabled === false && <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold text-soft">off</span>}
              <span className="ml-auto flex gap-2"><Btn onClick={() => setEdit({ item: r })}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn><Btn kind="danger" onClick={() => setDel(r)} aria-label={`Delete the redirect from ${r.data.from_path}`}><Trash2 className="size-4" aria-hidden="true" /></Btn></span>
            </Card>
          </li>
        ))}
      </ul>
      {edit && <Editor key={edit.item?.id || 'new'} spec={spec} item={edit.item} preset={{ permanent: true, enabled: true }} onClose={() => setEdit(null)} onSaved={reload} />}
      <ConfirmDialog open={!!del} title="Delete this redirect?" onClose={() => setDel(null)} onConfirm={remove}>Visitors to {del?.data.from_path} will no longer be sent to {del?.data.to_path}.</ConfirmDialog>
    </>
  )
}

function SetupTab() {
  const link = (href, text) => <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-lav underline">{text}<ExternalLink className="size-3.5" aria-hidden="true" /></a>
  const rows = [
    ['Sitemaps', <>The website’s own pages: {link('/sitemap.xml', '/sitemap.xml')} (rebuilt with each deploy). Pages you publish here (articles, products, industries, partners): {link('/sitemap-content.xml', '/sitemap-content.xml')} (live: publishing, editing, hiding or deleting changes it at once).</>],
    ['robots.txt', <>{link('/robots.txt', '/robots.txt')} lists both sitemaps and keeps the admin panel, account pages and the API out of search.</>],
    ['Google Search Console', <>Add the website as a property, verify it (set <code>VITE_GSC_VERIFICATION</code> to the meta-tag code, then deploy), and submit both sitemaps.</>],
    ['Google Analytics 4 / Tag Manager', <>Set <code>VITE_GA_MEASUREMENT_ID</code> (G-XXXXXXXXXX) and deploy; use <code>VITE_GTM_ID</code> only if you want a Tag Manager container instead (it takes precedence). Nothing is sent until the visitor accepts analytics cookies. Events, each sent only after a successful submission: page_view, generate_lead, contact_form_submit, career_application, partner_enquiry, partner_application, demo_request, sign_up, file_download, whatsapp_click, phone_click, email_click.</>],
    ['Team e-mail for new enquiries', <>Set <code>ENQUIRY_NOTIFY_EMAIL</code> together with the SMTP settings in the backend environment.</>],
    ['Social sharing image', <>Pages without their own image use the default sharing image set in <Link to="/company-admin/settings" className="font-semibold text-lav underline">Settings</Link>.</>],
  ]
  return (
    <Card className="!p-0">
      <dl className="divide-y divide-edge">{rows.map(([k, v]) => <div key={k} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr]"><dt className="font-semibold">{k}</dt><dd className="text-sm text-soft">{v}</dd></div>)}</dl>
    </Card>
  )
}

/**
 * SEO management: the search title, description, keywords, sharing image and indexing of each page and article, with Google / WhatsApp / LinkedIn previews, redirects, and the setup of the sitemap,
 * Search Console and analytics. Saved in the database and live at once; the sitemap of published content follows what is published, edited, hidden or deleted.
 */
export default function SeoAdmin() {
  const [tab, setTab] = useState('pages')
  const kinds = useFetch(() => api('/api/admin/content/kinds'), [])
  const pagesQ = useFetch(() => api('/api/admin/content/seo_page'), [])
  const redirQ = useFetch(() => api('/api/admin/content/seo_redirect').catch(() => []), [])
  const artQ = useFetch(() => api('/api/admin/content/article').catch(() => []), [])
  const redirSpec = kinds.data?.kinds.find((k) => k.kind === 'seo_redirect')
  const reload = () => { pagesQ.reload(); redirQ.reload(); artQ.reload() }
  const articles = useMemo(() => (artQ.data || []).filter((a) => a.status === 'published'), [artQ.data])
  if ((kinds.loading && !kinds.data) || (pagesQ.loading && !pagesQ.data)) return <Spinner />
  if (pagesQ.error && !pagesQ.data) return <ErrorState error={pagesQ.error} onRetry={pagesQ.reload} />
  const tabs = [['pages', 'Pages'], ['articles', `Articles (${articles.length})`], ['redirects', `Redirects (${(redirQ.data || []).length})`], ['setup', 'Setup & sitemap']]
  return (
    <>
      <PageHeader title="SEO management" lead="How each page appears in Google, WhatsApp and LinkedIn, which pages search engines may index, redirects, and the sitemap. Changes are live as soon as you save." />
      <div role="tablist" aria-label="SEO" className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([k, t]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors', tab === k ? 'border-primary bg-primary/20' : 'border-edge hover:border-edge-strong')}>{t}</button>)}
      </div>
      {tab === 'pages' && <PagesTab entries={pagesQ.data || []} reload={reload} />}
      {tab === 'articles' && <ArticlesTab articles={articles} reload={reload} />}
      {tab === 'redirects' && (redirSpec ? <RedirectsTab spec={redirSpec} items={redirQ.data || []} reload={reload} /> : <Card><EmptyState title="Redirects are not available">Your account cannot manage navigation.</EmptyState></Card>)}
      {tab === 'setup' && <SetupTab />}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-soft"><Link2 className="size-3.5" aria-hidden="true" /> Built-in text, headings and structured data (Organization, branches, breadcrumbs, articles) are produced automatically for every page.</p>
    </>
  )
}
