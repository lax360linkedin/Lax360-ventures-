import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Editor } from './Content.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, Spinner, fmtDate, useFetch, useToast } from '../ui.jsx'

const PREVIEW = '/?welcome=preview&cms_preview=1'
const THEME = { welcome: 'Welcome', software: 'Software', marketing: 'Marketing', education: 'Education', ai: 'AI & Automation', robotics: 'Robotics', blockchain: 'Blockchain' }

/**
 * Welcome Experience management: the master switch and every card of the 7-card welcome experience shown after the intro animation. It edits the same content as
 * Website content > Welcome cards, so every change here is a change on the public site once published. "Preview the experience" opens the website with drafts included,
 * so the whole experience can be checked before anything is published.
 */
export default function WelcomeAdmin() {
  const toast = useToast()
  const kinds = useFetch(() => api('/api/admin/content/kinds'), [])
  const cardsQ = useFetch(() => api('/api/admin/content/welcome_card'), [])
  const pageQ = useFetch(() => api('/api/admin/content/welcome_page'), [])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const cardSpec = kinds.data?.kinds.find((k) => k.kind === 'welcome_card')
  const pageSpec = kinds.data?.kinds.find((k) => k.kind === 'welcome_page')

  if ((kinds.loading && !kinds.data) || (cardsQ.loading && !cardsQ.data)) return <Spinner />
  if (kinds.error && !kinds.data) return <ErrorState error={kinds.error} onRetry={kinds.reload} />
  if (!cardSpec || !pageSpec) return <Card><EmptyState title="The welcome experience is not available">Your account cannot manage website content.</EmptyState></Card>

  const cards = cardsQ.data || []
  const settings = (pageQ.data || [])[0]
  const live = settings ? settings.status === 'published' && settings.data?.enabled !== false : cards.some((c) => c.status === 'published')
  const reload = () => { cardsQ.reload(); pageQ.reload() }
  const patch = async (item, body, ok) => {
    try { await api(`/api/admin/content/item/${item.id}`, { method: 'PATCH', body }); toast(ok); reload() } catch (e) { toast(e.message, 'error') }
  }
  const toggleExperience = async () => {
    if (!settings) {
      try { await api('/api/admin/content/welcome_page', { method: 'POST', body: { title: pageSpec.label, data: { enabled: true, once_per_session: true }, status: 'published' } }); toast('The welcome experience is on'); reload() } catch (e) { toast(e.message, 'error') }
      return
    }
    const on = settings.data?.enabled !== false && settings.status === 'published'
    await patch(settings, { data: { ...settings.data, enabled: !on }, status: 'published' }, on ? 'The welcome experience is off: visitors go straight to the home page' : 'The welcome experience is on')
  }
  const move = async (i, delta) => {
    const ids = cards.map((c) => c.id)
    const [id] = ids.splice(i, 1)
    ids.splice(i + delta, 0, id)
    try { await api('/api/admin/content/welcome_card/order', { method: 'PUT', body: { ids } }); toast('Order saved: the cards follow it'); cardsQ.reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${del.id}`, { method: 'DELETE' }); toast('Card deleted'); setDel(null); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const visible = cards.filter((c) => c.status === 'published' && c.data?.enabled !== false).length

  return (
    <>
      <PageHeader title="Welcome Experience" lead="The interactive cards shown after the intro animation and before the home page. Edit the text, images, buttons and links of each card, re-order or hide cards, and switch the whole experience on or off. Robotics and Blockchain must stay described as planned initiatives until they are launched."
        actions={<>
          <a href={PREVIEW} target="_blank" rel="noopener noreferrer"><Btn><Eye className="size-4" aria-hidden="true" /> Preview the experience</Btn></a>
          <Btn kind="primary" onClick={() => setEdit({ spec: cardSpec, item: null })}><Plus className="size-4" aria-hidden="true" /> New card</Btn>
        </>} />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 !p-5">
        <div>
          <p className="flex items-center gap-2 font-display text-lg font-semibold">The welcome experience is <Badge value={live ? 'published' : 'draft'} text={live ? 'ON' : 'OFF'} /></p>
          <p className="mt-1 text-sm text-soft">{live ? `Visitors see ${visible} card${visible === 1 ? '' : 's'} after the intro${settings?.data?.once_per_session === false ? ' on every visit' : ', once per browsing session'}. They can replay it from the footer.` : 'Visitors go straight to the home page after the intro.'}{!settings && ' (No settings saved yet: the defaults apply.)'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn kind={live ? 'default' : 'primary'} onClick={toggleExperience}><Power className="size-4" aria-hidden="true" /> {live ? 'Turn off' : 'Turn on'}</Btn>
          <Btn onClick={() => setEdit({ spec: pageSpec, item: settings || null })}><Pencil className="size-4" aria-hidden="true" /> Settings (button labels, once per session)</Btn>
        </div>
      </Card>

      {cardsQ.error && !cardsQ.data && <ErrorState error={cardsQ.error} onRetry={cardsQ.reload} />}
      {cardsQ.data && cards.length === 0 && <Card><EmptyState title="No welcome cards yet">Run <code>python -m app.cli seed-welcome</code> once to load the seven cards, or add a card now.</EmptyState></Card>}
      {cards.length > 0 && (
        <ol className="space-y-3">
          {cards.map((c, i) => {
            const d = c.data || {}
            const hidden = d.enabled === false
            return (
              <li key={c.id}>
                <Card className={`flex flex-wrap items-center gap-4 !p-4 ${hidden || c.status !== 'published' ? 'opacity-80' : ''}`}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-edge-strong font-display text-sm font-semibold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-display text-lg font-semibold">{c.title}</h2><Badge value={c.status} />{hidden && <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold text-soft">hidden</span>}{d.status_label && <span className="rounded-full border border-amber-500/50 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">{d.status_label}</span>}</div>
                    <p className="mt-0.5 truncate text-sm">{d.headline}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-soft">
                      <span>{THEME[d.theme] || 'Welcome'} background</span>
                      {d.explore_label ? <span className="inline-flex items-center gap-1">{d.explore_label} <ArrowRight className="size-3" aria-hidden="true" /> {d.explore_link || <span className="font-semibold text-amber-500">no link</span>}</span> : <span>No main button</span>}
                      <span>{d.franchise_enabled ? `Franchise button: ${d.franchise_division || c.title}` : 'No franchise button'}</span>
                      <span>Updated {fmtDate(c.updated_at)}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Btn kind="primary" onClick={() => setEdit({ spec: cardSpec, item: c })}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn>
                    <Btn onClick={() => patch(c, { data: { ...d, enabled: hidden }, }, hidden ? 'Card shown' : 'Card hidden from the experience')}>{hidden ? <><Eye className="size-4" aria-hidden="true" /> Show</> : <><EyeOff className="size-4" aria-hidden="true" /> Hide</>}</Btn>
                    <Btn onClick={() => patch(c, { status: c.status === 'published' ? 'draft' : 'published' }, c.status === 'published' ? 'Unpublished: not shown to visitors' : 'Published: live on the website')}>{c.status === 'published' ? 'Unpublish' : 'Publish'}</Btn>
                    <Btn kind="danger" onClick={() => setDel(c)} aria-label={`Delete ${c.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                    {cards.length > 1 && <span className="flex gap-1"><Btn kind="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${c.title} earlier`}>↑</Btn><Btn kind="ghost" disabled={i === cards.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${c.title} later`}>↓</Btn></span>}
                  </div>
                </Card>
              </li>
            )
          })}
        </ol>
      )}
      <p className="mt-6 text-sm text-soft">Cards appear in this order. A card that is hidden or unpublished is skipped. The “Franchise Opportunities” button opens the existing franchise enquiry form with the card&apos;s division sent along; enquiries appear under Enquiries. Use “Preview the experience” to see drafts in the real design before publishing.</p>

      {edit && <Editor key={`${edit.spec.kind}-${edit.item?.id || 'new'}`} spec={edit.spec} item={edit.item} onClose={() => setEdit(null)} onSaved={reload} />}
      <ConfirmDialog open={!!del} title="Delete this card?" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>“{del?.title}” will be removed permanently. Consider hiding it instead if you may need it again.</ConfirmDialog>
    </>
  )
}
