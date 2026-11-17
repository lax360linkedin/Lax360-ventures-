import { useState } from 'react'
import { Eye, EyeOff, ExternalLink, Pencil, Plus, Power, Settings2, Trash2 } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Editor } from './Content.jsx'
import { ServiceCard } from '../../components/sections/ServiceCarousel.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, Spinner, useFetch, useToast } from '../ui.jsx'

const PREVIEW = '/?cms_preview=1#service-carousel'
const SPEEDS = { slow: 'Slow', normal: 'Normal', fast: 'Fast' }
const asCard = (p) => { const d = p.data || {}; return { id: p.id, title: p.title, tag: d.tag || '', text: d.description || '', href: d.link || '', label: d.link_label || 'Explore more', image: d.image ? `/api/admin/media/${d.image}/file` : d.builtin_image || '', alt: '' } }

/**
 * Services & industries carousel: the auto-scrolling card strip directly below the home header. Add, edit, delete and re-order cards, upload or replace each card's picture, set the Explore more link,
 * switch cards on or off, set the scrolling speed (or stop it), and preview before publishing (save a card as a draft, then "Preview on the website" shows drafts in the real design).
 * It edits ordinary website content, so a published change is live at once; pictures are kept in the media library's permanent storage.
 */
export default function ServiceCarouselAdmin() {
  const toast = useToast()
  const kinds = useFetch(() => api('/api/admin/content/kinds'), [])
  const cardsQ = useFetch(() => api('/api/admin/content/service_card'), [])
  const pageQ = useFetch(() => api('/api/admin/content/service_carousel_page'), [])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const cardSpec = kinds.data?.kinds.find((k) => k.kind === 'service_card')
  const pageSpec = kinds.data?.kinds.find((k) => k.kind === 'service_carousel_page')

  if ((kinds.loading && !kinds.data) || (cardsQ.loading && !cardsQ.data)) return <Spinner />
  if (kinds.error && !kinds.data) return <ErrorState error={kinds.error} onRetry={kinds.reload} />
  if (!cardSpec || !pageSpec) return <Card><EmptyState title="The carousel is not available">Your account cannot manage website content.</EmptyState></Card>

  const cards = cardsQ.data || []
  const settings = (pageQ.data || [])[0]
  const shown = cards.filter((c) => c.status === 'published' && c.data?.enabled !== false)
  const on = settings ? settings.status === 'published' && settings.data?.enabled !== false : true
  const reload = () => { cardsQ.reload(); pageQ.reload() }
  const patch = async (item, body, ok) => {
    try { await api(`/api/admin/content/item/${item.id}`, { method: 'PATCH', body }); toast(ok); reload() } catch (e) { toast(e.message, 'error') }
  }
  const toggleSection = async () => {
    if (!settings) {
      try { await api('/api/admin/content/service_carousel_page', { method: 'POST', body: { title: pageSpec.label, data: { enabled: false }, status: 'published' } }); toast('The carousel is off'); reload() } catch (e) { toast(e.message, 'error') }
      return
    }
    await patch(settings, { data: { ...settings.data, enabled: !on }, status: 'published' }, on ? 'The carousel is hidden on the home page' : 'The carousel is shown on the home page')
  }
  const move = async (i, delta) => {
    const ids = cards.map((p) => p.id)
    const [id] = ids.splice(i, 1)
    ids.splice(i + delta, 0, id)
    try { await api('/api/admin/content/service_card/order', { method: 'PUT', body: { ids } }); toast('Order saved: the carousel follows it'); cardsQ.reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${del.id}`, { method: 'DELETE' }); toast('Card deleted'); setDel(null); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const speed = settings?.data?.speed || 'normal'
  const scrolling = settings?.data?.scroll !== false

  return (
    <>
      <PageHeader title="Services & industries carousel" lead="The auto-scrolling card strip directly below the home header, above the welcome sections. Add cards for your services and industries, change their pictures, titles, descriptions and links, switch them on or off, re-order them and set the scrolling speed. Save a card as a draft and use “Preview on the website” to see it in place before publishing."
        actions={<>
          <a href={PREVIEW} target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> Preview on the website</Btn></a>
          <Btn onClick={() => setEdit({ spec: pageSpec, item: settings || null })}><Settings2 className="size-4" aria-hidden="true" /> Heading & speed</Btn>
          <Btn kind="primary" onClick={() => setEdit({ spec: cardSpec, item: null, preset: { enabled: true, link_label: 'Explore more' } })}><Plus className="size-4" aria-hidden="true" /> Add card</Btn>
        </>} />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 !p-5">
        <div>
          <p className="flex items-center gap-2 font-display text-lg font-semibold">The carousel is <Badge value={on && shown.length ? 'published' : 'draft'} text={on ? (shown.length ? 'SHOWN' : 'HIDDEN (no card on)') : 'OFF'} /></p>
          <p className="mt-1 text-sm text-soft">{shown.length} card{shown.length === 1 ? '' : 's'} on the website · {scrolling ? `scrolls by itself (${SPEEDS[speed] || 'Normal'})` : 'automatic scrolling is off'}. Visitors can always swipe, drag or use the arrow keys.</p>
        </div>
        <Btn kind={on ? 'default' : 'primary'} onClick={toggleSection}><Power className="size-4" aria-hidden="true" /> {on ? 'Turn off' : 'Turn on'}</Btn>
      </Card>

      {cardsQ.error && !cardsQ.data && <ErrorState error={cardsQ.error} onRetry={cardsQ.reload} />}
      {cardsQ.data && cards.length === 0 && <Card><EmptyState title="No cards yet">Add your first card. Until you do, the home page shows the website's built-in services and industries.</EmptyState></Card>}
      {cards.length > 0 && (
        <ol className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {cards.map((p, i) => {
            const d = p.data || {}
            const hidden = d.enabled === false
            return (
              <li key={p.id} className="min-w-0">
                <Card className={`flex h-full flex-col items-center gap-3 !p-4 ${hidden || p.status !== 'published' ? 'opacity-75' : ''}`}>
                  <div className="pointer-events-none origin-top scale-[0.92] sm:scale-100" aria-hidden="true"><ServiceCard card={asCard(p)} hidden /></div>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-glass-strong text-xs font-bold">{i + 1}</span>
                    <Badge value={p.status} />
                    {hidden && <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold text-soft">hidden</span>}
                    {!d.link && <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold text-soft">no button</span>}
                    {d.image ? <span className="text-xs text-soft">uploaded picture</span> : <span className="text-xs text-soft">built-in picture</span>}
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <Btn kind="primary" onClick={() => setEdit({ spec: cardSpec, item: p })}><Pencil className="size-4" aria-hidden="true" /> Edit / replace picture</Btn>
                    <Btn onClick={() => patch(p, { data: { ...d, enabled: hidden }, status: p.status }, hidden ? 'Card shown' : 'Card hidden from the website')}>{hidden ? <><Eye className="size-4" aria-hidden="true" /> Show</> : <><EyeOff className="size-4" aria-hidden="true" /> Hide</>}</Btn>
                    <Btn kind="danger" onClick={() => setDel(p)} aria-label={`Delete ${p.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                    {cards.length > 1 && <span className="ml-auto flex gap-1"><Btn kind="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${p.title} earlier`}>←</Btn><Btn kind="ghost" disabled={i === cards.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${p.title} later`}>→</Btn></span>}
                  </div>
                </Card>
              </li>
            )
          })}
        </ol>
      )}
      <p className="mt-6 text-sm text-soft">Cards scroll in this order, right to left, and then start over. Each preview above is the card exactly as visitors see it. To replace a card’s picture, open it with “Edit / replace picture” and drop, paste or choose the new one; uploads are stored permanently. To keep a card out of the website while you work on it, set its status to Draft: it then only shows in “Preview on the website”.</p>

      {edit && <Editor key={`${edit.spec.kind}-${edit.item?.id || 'new'}`} spec={edit.spec} item={edit.item} preset={edit.preset} onClose={() => setEdit(null)} onSaved={reload} />}
      <ConfirmDialog open={!!del} title="Delete this card?" busy={busy} onClose={() => setDel(null)} onConfirm={remove}>“{del?.title}” will be removed permanently from the carousel. Consider hiding it instead if you may need it again.</ConfirmDialog>
    </>
  )
}
