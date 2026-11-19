import { useEffect, useMemo, useState } from 'react'
import { Check, Languages, Plus, RotateCcw, Search } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { norm } from '../../i18n/translator.js'
import { Badge, Btn, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, Spinner, Textarea, cx, useToast } from '../ui.jsx'

const bundled = import.meta.glob('../../i18n/catalogs/*.json')
const SHARED = '__shared'
const POPUPS = '__popups'
const CUSTOM = '__custom'

/**
 * Translations: the website's texts in each language, edited per language, page by page and section by section. The list of texts comes from the built website (/i18n-strings.json, written by every
 * build from the real pages), so each page shows exactly what a visitor reads, with the section it belongs to. A translation saved here is stored in the database and is live at once; the translations
 * shipped with the website are the starting point, and a text with no translation shows in English. Another language is added in code (src/i18n/languages.js) and then appears here.
 */
export default function Translations() {
  const toast = useToast()
  const [catalog, setCatalog] = useState(null)
  const [error, setError] = useState(null)
  const [lang, setLang] = useState('')
  const [page, setPage] = useState(SHARED)
  const [saved, setSaved] = useState({}) // administrator's translations of this language
  const [shipped, setShipped] = useState({})
  const [edits, setEdits] = useState({})
  const [search, setSearch] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [custom, setCustom] = useState({ source: '', value: '' })

  useEffect(() => {
    fetch('/i18n-strings.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('The list of the website’s texts has not been built yet. Run a production build (npm run build) and reload.')))).then((c) => { setCatalog(c); setLang((l) => l || c.languages[0]?.code || '') }).catch(setError)
  }, [])

  const load = async (code) => {
    const file = bundled[`../../i18n/catalogs/${code}.json`]
    setShipped(file ? (await file()).default : {})
    try { setSaved((await api(`/api/admin/translations?lang=${code}`)).strings || {}) } catch (e) { toast(e.message, 'error'); setSaved({}) }
    setEdits({})
  }
  useEffect(() => { if (lang) load(lang) }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const known = useMemo(() => {
    if (!catalog) return new Set()
    return new Set([...catalog.shared.map((s) => s.s), ...catalog.pages.flatMap((p) => p.strings.map((s) => s.s))])
  }, [catalog])

  const current = (s) => (edits[s] !== undefined ? edits[s] : saved[s] ?? shipped[s] ?? '')
  const statusOf = (s) => (edits[s] !== undefined ? 'edited' : saved[s] ? 'admin' : shipped[s] ? 'built-in' : 'missing')

  const rows = useMemo(() => {
    if (!catalog) return []
    if (page === SHARED) return catalog.shared
    if (page === POPUPS) return Object.keys(shipped).filter((k) => !known.has(k)).map((s) => ({ s, section: '' }))
    if (page === CUSTOM) return Object.keys(saved).filter((k) => !known.has(k) && shipped[k] === undefined).map((s) => ({ s, section: '' }))
    return catalog.pages.find((p) => p.route === page)?.strings || []
  }, [catalog, page, shipped, saved, known])

  const progress = (list) => { const total = list.length; const done = list.filter((r) => saved[r.s] || shipped[r.s]).length; return { total, done } }
  const shown = rows.filter((r) => (!onlyMissing || statusOf(r.s) === 'missing') && (!search.trim() || `${r.s} ${current(r.s)}`.toLowerCase().includes(search.trim().toLowerCase())))
  const dirty = Object.keys(edits)

  const save = async () => {
    setBusy(true)
    try {
      await api('/api/admin/translations', { method: 'PUT', body: { items: dirty.map((s) => ({ lang, source: s, value: edits[s] })) } })
      toast(`${dirty.length} translation${dirty.length === 1 ? '' : 's'} saved: live on the website`)
      await load(lang)
    } catch (e) { toast(e.fields ? Object.values(e.fields).join(' ') : e.message, 'error') } finally { setBusy(false) }
  }
  const addCustom = async () => {
    const source = norm(custom.source)
    if (!source || !custom.value.trim()) return
    setBusy(true)
    try { await api('/api/admin/translations', { method: 'PUT', body: { items: [{ lang, source, value: custom.value }] } }); toast('Added'); setCustom({ source: '', value: '' }); await load(lang); setPage(CUSTOM) } catch (e) { toast(e.fields ? Object.values(e.fields).join(' ') : e.message, 'error') } finally { setBusy(false) }
  }

  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />
  if (!catalog) return <Spinner />
  const pages = [{ key: SHARED, label: 'Menu, footer & shared texts', list: catalog.shared }, ...catalog.pages.map((p) => ({ key: p.route, label: p.route === '/' ? 'Home page' : p.route, list: p.strings })), { key: POPUPS, label: 'Pop-ups, forms & messages', list: Object.keys(shipped).filter((k) => !known.has(k)).map((s) => ({ s })) }, { key: CUSTOM, label: 'Added texts (articles, products…)', list: Object.keys(saved).filter((k) => !known.has(k) && shipped[k] === undefined).map((s) => ({ s })) }]
  const total = progress(rows)

  return (
    <>
      <PageHeader title="Translations" lead="Edit the website in each language, page by page and section by section. A text with no translation shows in English, so nothing is ever empty. What you save is live at once and overrides the translations shipped with the website. Tamil and Hindi translations were written for this website and should be reviewed by a native speaker." />
      <div className="mb-4 grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)]">
        <Field label="Language">{(p) => <Select {...p} value={lang} onChange={(e) => { setLang(e.target.value); setPage(SHARED) }}>{catalog.languages.map((l) => <option key={l.code} value={l.code}>{l.native} ({l.name})</option>)}</Select>}</Field>
        <Field label="Page or section">{(p) => <Select {...p} value={page} onChange={(e) => setPage(e.target.value)}>{pages.map((p2) => { const g = progress(p2.list); return <option key={p2.key} value={p2.key}>{p2.label}  ·  {g.done}/{g.total}</option> })}</Select>}</Field>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <label className="min-w-[14rem] flex-1 text-sm font-semibold">Find<div className="relative mt-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" aria-hidden="true" /><Input className="!pl-9" placeholder="English or translated text" value={search} onChange={(e) => setSearch(e.target.value)} /></div></label>
        <label className="flex min-h-10 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> Only texts without a translation</label>
        <p className="min-h-10 text-sm text-soft">{total.done} of {total.total} translated on this page</p>
      </div>

      {rows.length === 0 && <Card><EmptyState title="Nothing here yet">{page === CUSTOM ? 'Texts you add below (for example the title of an article) appear here.' : 'This page has no texts.'}</EmptyState></Card>}
      <ul className="space-y-3">
        {shown.map((r, i) => {
          const st = statusOf(r.s)
          const long = r.s.length > 90
          return (
            <li key={r.s}>
              <Card className="!p-4">
                {r.section && (i === 0 || shown[i - 1].section !== r.section) && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-lav">Section: {r.section.slice(0, 80)}</p>}
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="min-w-0"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-soft">English</p><p className="whitespace-pre-line break-words text-sm">{r.s}</p></div>
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-soft">{catalog.languages.find((l) => l.code === lang)?.name}<Badge value={st === 'missing' ? 'draft' : st === 'edited' ? 'pending' : 'published'} text={st === 'missing' ? 'Missing: shows English' : st === 'edited' ? 'Unsaved' : st === 'admin' ? 'Edited here' : 'Built-in'} /></div>
                    {long ? <Textarea rows={3} value={current(r.s)} lang={lang} onChange={(e) => setEdits((x) => ({ ...x, [r.s]: e.target.value }))} aria-label={`${lang} translation of: ${r.s.slice(0, 60)}`} />
                      : <Input value={current(r.s)} lang={lang} onChange={(e) => setEdits((x) => ({ ...x, [r.s]: e.target.value }))} aria-label={`${lang} translation of: ${r.s.slice(0, 60)}`} />}
                    {saved[r.s] && edits[r.s] === undefined && <button type="button" onClick={() => setEdits((x) => ({ ...x, [r.s]: '' }))} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-lav hover:underline"><RotateCcw className="size-3" aria-hidden="true" />Remove my edit (go back to the built-in text)</button>}
                  </div>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>

      <Card className="mt-6 !p-4">
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold"><Plus className="size-4 text-lav" aria-hidden="true" />Add a text</h2>
        <p className="mb-3 text-sm text-soft">For a text that is not listed, such as the title of an article or product you added: type it exactly as the website shows it (English) and its translation.</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="English text exactly as on the website">{(p) => <Textarea {...p} rows={2} value={custom.source} onChange={(e) => setCustom((c) => ({ ...c, source: e.target.value }))} />}</Field>
          <Field label="Translation">{(p) => <Textarea {...p} rows={2} lang={lang} value={custom.value} onChange={(e) => setCustom((c) => ({ ...c, value: e.target.value }))} />}</Field>
        </div>
        <div className="mt-3"><Btn onClick={addCustom} loading={busy} disabled={!norm(custom.source) || !custom.value.trim()}><Plus className="size-4" aria-hidden="true" /> Add</Btn></div>
      </Card>

      <div className={cx('sticky bottom-0 z-10 mt-6 flex items-center justify-end gap-3 rounded-xl border border-edge bg-night/90 p-3 backdrop-blur')}>
        <span className="flex items-center gap-1.5 text-sm text-soft"><Languages className="size-4" aria-hidden="true" />{dirty.length ? `${dirty.length} unsaved change${dirty.length === 1 ? '' : 's'}` : 'All changes saved.'}</span>
        <Btn kind="primary" loading={busy} disabled={!dirty.length} onClick={save}><Check className="size-4" aria-hidden="true" /> Save changes</Btn>
      </div>
    </>
  )
}
