import { useState } from 'react'
import { ExternalLink, Eye, EyeOff, FileText, ImageOff, Pencil, Trash2, UserPlus } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import ModuleManager, { pictureOf } from '../ModuleManager.jsx'
import { Editor } from './Content.jsx'
import { Dropzone, imageLimit, fmtSize, uploadImage } from '../ImageUpload.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, Spinner, useFetch, useToast } from '../ui.jsx'

/** Dedicated management screens for single sections of the website. Each one is a thin description of a content kind handed to the shared ModuleManager: one behaviour everywhere,
 * and one copy of the content (the same entries appear under Website content). */

const optionLabel = (spec, field, value) => spec?.fields.find((f) => f.name === field)?.options.find((o) => o.value === value)?.label || value || ''

export function TestimonialsAdmin() {
  return (
    <ModuleManager kind="testimonial" title="Testimonials" noun="testimonial" imageFields={['photo']} sampleKey="is_sample" preview="/?cms_preview=1#testimonials"
      lead="What clients and students say about LAX360, shown on the home page and on the service pages. Add real feedback with the person's permission, replace the temporary samples, switch entries on or off, and re-order them."
      filters={[{ name: 'person_type', label: 'Type' }]}
      describe={(it, spec) => ({ sub: it.data?.quote ? `“${it.data.quote}”` : '', badges: [optionLabel(spec, 'person_type', it.data?.person_type), [it.data?.role, it.data?.organization].filter(Boolean).join(', '), it.data?.rating ? `${it.data.rating}/5` : ''] })} />
  )
}

export function ClientsAdmin() {
  return (
    <ModuleManager kind="client" title="Our clients" noun="client" imageFields={['logo', 'logo_url']} sampleKey="is_sample" wideImage preview="/?cms_preview=1#clients"
      lead="The logos in the “Our Clients” strip on the home page and on the service pages. Add only clients who have agreed to be shown. Add many logos at once, replace the temporary sample logos with the real ones, and arrange the order."
      bulk={{ label: 'Add many logos', title: 'Add client logos', createLabel: 'Add clients', intro: 'Choose logos, drag them in, or paste copied ones with Ctrl+V. One client is created from each logo, named after its file: rename them afterwards with Edit. A logo that is already in the list is skipped.',
        toItem: ({ name }) => ({ title: name || 'Client', data: { enabled: true, is_sample: false } }) }}
      describe={(it) => ({ sub: it.data?.description || it.data?.website_link || '', badges: [it.data?.services ? 'Shown on service pages' : ''] })} />
  )
}

export function NetworkAdmin() {
  const [tab, setTab] = useState('partners')
  const pageQ = useFetch(() => api('/api/admin/content/network_page'), [])
  const kinds = useFetch(() => api('/api/admin/content/kinds'), [])
  const [edit, setEdit] = useState(null)
  const tabs = [['partners', 'Companies & partners'], ['software', 'Software distribution'], ['categories', 'Categories'], ['text', 'Page text']]
  const pageSpec = kinds.data?.kinds.find((k) => k.kind === 'network_page')
  const page = (pageQ.data || [])[0]
  return (
    <>
      <PageHeader title="Our network" lead="The companies and partners shown on the Our Network page, the software LAX360 distributes, the categories that group them, and the page's own text. New companies start as drafts so their details can be verified before they go live."
        actions={<a href="/our-network?cms_preview=1" target="_blank" rel="noopener noreferrer"><span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-edge-strong bg-glass px-4 text-sm font-semibold hover:border-lav"><ExternalLink className="size-4" aria-hidden="true" /> Preview on the website</span></a>} />
      <div role="tablist" aria-label="Our network" className="mb-6 flex flex-wrap gap-2">
        {tabs.map(([id, text]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold transition-colors ${tab === id ? 'border-primary bg-primary text-white' : 'border-edge-strong bg-glass hover:border-lav'}`}>{text}</button>)}
      </div>
      {tab === 'partners' && (
        <ModuleManager key="partners" embedded kind="network_partner" title="Companies & partners" noun="company" nouns="companies" imageFields={['logo']} wideImage preset={{ enabled: true, verification: 'pending' }}
          lead="Companies in the LAX360 network. Set the verification and the exact relationship before publishing: a partnership designation is shown only when verified."
          filters={[{ name: 'category', label: 'Category' }]}
          describe={(it, spec) => ({ sub: it.data?.description || '', badges: [optionLabel(spec, 'category', it.data?.category), it.data?.verification === 'verified' ? 'Verified' : 'Pending verification'] })} />
      )}
      {tab === 'software' && (
        <ModuleManager key="software" embedded kind="software_product" title="Software distribution" noun="software product" imageFields={[]} preset={{ enabled: true }}
          lead="Software LAX360 helps customers choose, buy and implement. State clearly whether it is third-party, resold, integrated or developed by LAX360."
          filters={[{ name: 'software_category', label: 'Category' }]}
          describe={(it, spec) => ({ sub: it.data?.description || '', badges: [optionLabel(spec, 'software_category', it.data?.software_category), optionLabel(spec, 'ownership', it.data?.ownership)] })} />
      )}
      {tab === 'categories' && (
        <ModuleManager key="categories" embedded kind="network_category" title="Network categories" noun="category" nouns="categories" imageFields={[]} enableKey={null}
          lead="Extra categories for the Our Network page (the standard ones already exist). A category appears publicly only when it has at least one published company."
          describe={(it) => ({ sub: it.data?.description || '' })} />
      )}
      {tab === 'text' && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="font-display text-lg font-semibold">Our Network page text</p><p className="mt-1 max-w-2xl text-sm text-soft">The heading, introduction and closing call to action of the page. Fields left empty keep the website's built-in wording. {page ? <>Status: <Badge value={page.status} />.</> : 'Nothing customised yet.'}</p></div>
          <Btn kind="primary" disabled={!pageSpec} onClick={() => setEdit(true)}><Pencil className="size-4" aria-hidden="true" /> Edit the page text</Btn>
        </Card>
      )}
      {edit && pageSpec && <Editor key="network-page" spec={pageSpec} item={page || null} onClose={() => setEdit(null)} onSaved={pageQ.reload} />}
    </>
  )
}

const LEADERS = ['founder', 'ceo', 'managing_director']

/** The founder (also CEO / Managing Director: one person, shown once, centred at the top of Our Team). Edit the name, designation, photograph and introduction, replace the photograph
 * with one drop or Ctrl+V, switch the profile on or off, publish it, preview it, or remove the temporary sample founder. */
export function FounderAdmin() {
  const toast = useToast()
  const kinds = useFetch(() => api('/api/admin/content/kinds'), [])
  const peopleQ = useFetch(() => api('/api/admin/content/team_member'), [])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(false)
  const [busy, setBusy] = useState(false)
  const spec = kinds.data?.kinds.find((k) => k.kind === 'team_member')
  if ((kinds.loading && !kinds.data) || (peopleQ.loading && !peopleQ.data)) return <Spinner />
  if (kinds.error && !kinds.data) return <ErrorState error={kinds.error} onRetry={kinds.reload} />
  if (!spec) return <Card><EmptyState title="The founder profile is not available">Your account cannot manage website content.</EmptyState></Card>

  const people = peopleQ.data || []
  const leaders = people.filter((p) => LEADERS.includes(p.data?.role_level)).sort((a, b) => LEADERS.indexOf(a.data.role_level) - LEADERS.indexOf(b.data.role_level) || a.sort_order - b.sort_order)
  const f = leaders[0]
  const d = f?.data || {}
  const off = d.active === false
  const photo = pictureOf(d, 'photo', 'photo_path')
  const reload = () => peopleQ.reload()
  const patch = async (body, ok) => { try { await api(`/api/admin/content/item/${f.id}`, { method: 'PATCH', body }); toast(ok); reload() } catch (e) { toast(e.message, 'error') } }
  const replacePhoto = async (files) => {
    const file = files[0]
    const max = await imageLimit()
    if (file.size > max) { toast(`That picture is too large (${fmtSize(file.size)}); the limit is ${fmtSize(max)}.`, 'error'); return }
    setBusy(true)
    try {
      const asset = await uploadImage(file)
      await api(`/api/admin/content/item/${f.id}`, { method: 'PATCH', body: { data: { ...d, photo: asset.id, photo_path: '' }, status: f.status } })
      toast('Photograph replaced: the Our Team page shows it now')
      reload()
    } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const removeFounder = async () => {
    setBusy(true)
    try { await api(`/api/admin/content/item/${f.id}`, { method: 'DELETE' }); toast('Founder profile deleted'); setDel(false); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Founder profile" lead="The founder (who is also the CEO and Managing Director: one person, shown once) is presented at the top of the Our Team page with a large photograph, the name, the designation and a short introduction. Edit them here; changes are saved permanently and appear on the website once published."
        actions={<a href="/our-team?cms_preview=1#leadership" target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> Preview on the website</Btn></a>} />

      {!f && (
        <Card><EmptyState title="No founder profile yet">Add the founder's profile to show the featured founder section on the Our Team page. Until then the page shows only the team.
          <div className="mt-4"><Btn kind="primary" onClick={() => setEdit({ item: null })}><UserPlus className="size-4" aria-hidden="true" /> Add the founder</Btn></div></EmptyState></Card>
      )}

      {f && (
        <div className="grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
          <Card className="!p-4">
            <div className="mx-auto aspect-[4/5] max-w-xs overflow-hidden rounded-2xl border border-edge bg-gradient-to-br from-primary/25 to-accent/10">
              {photo ? <img src={photo} alt={d.photo_alt || ''} className="size-full object-cover object-top" /> : <span className="grid size-full place-items-center text-soft"><ImageOff className="size-10" aria-hidden="true" /></span>}
            </div>
            <div className="mt-4"><Dropzone multiple={false} compact busy={busy} onFiles={replacePhoto} title="Replace the photograph: drop, paste (Ctrl+V) or click" /></div>
            {d.photo && <Btn className="mt-2 w-full" onClick={() => patch({ data: { ...d, photo: '' }, status: f.status }, 'Uploaded photograph removed')}><ImageOff className="size-4" aria-hidden="true" /> Remove the uploaded photograph</Btn>}
          </Card>
          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2"><Badge value={f.status} />{off && <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold text-soft">switched off</span>}{d.sample && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">Sample</span>}</div>
            <div><h2 className="font-display text-3xl font-semibold">{f.title}</h2><p className="mt-1 text-lg font-semibold text-lav">{d.designation}</p></div>
            <p className="max-w-2xl whitespace-pre-line text-soft">{d.bio || 'No introduction yet: use Edit to write a short professional introduction.'}</p>
            {d.expertise && <p className="text-sm text-soft"><strong className="text-fg">Skills:</strong> {d.expertise}</p>}
            {d.sample && <p className="rounded-lg border border-amber-500/40 p-3 text-sm text-soft">This is a temporary sample founder with an illustrated portrait. Replace the name, designation, photograph and introduction with the real ones, then untick “Temporary sample profile” in Edit so the “Sample” label disappears.</p>}
            <div className="mt-auto flex flex-wrap gap-2">
              <Btn kind="primary" onClick={() => setEdit({ item: f })}><Pencil className="size-4" aria-hidden="true" /> Edit name, designation, intro</Btn>
              <Btn onClick={() => patch({ data: { ...d, active: off }, status: f.status }, off ? 'Founder shown on the website' : 'Founder hidden from the website')}>{off ? <><Eye className="size-4" aria-hidden="true" /> Show</> : <><EyeOff className="size-4" aria-hidden="true" /> Hide</>}</Btn>
              <Btn onClick={() => patch({ status: f.status === 'published' ? 'draft' : 'published' }, f.status === 'published' ? 'Unpublished: saved as a draft' : 'Published: live on the website')}><FileText className="size-4" aria-hidden="true" /> {f.status === 'published' ? 'Unpublish' : 'Publish'}</Btn>
              <Btn kind="danger" onClick={() => setDel(true)} aria-label="Delete the founder profile"><Trash2 className="size-4" aria-hidden="true" /> Delete</Btn>
            </div>
          </Card>
        </div>
      )}
      {leaders.length > 1 && <p className="mt-4 text-sm text-soft">{leaders.length - 1} other leadership profile{leaders.length === 2 ? ' is' : 's are'} (CEO / Managing Director) listed with the team, because only one founder is featured. Change their position in Our team if they are the same person.</p>}

      {edit && <Editor key={edit.item?.id || 'new'} spec={spec} item={edit.item} preset={{ role_level: 'founder', active: true }} onClose={() => setEdit(null)} onSaved={reload} />}
      <ConfirmDialog open={del} title="Delete the founder profile?" busy={busy} onClose={() => setDel(false)} onConfirm={removeFounder}>“{f?.title}” will be removed permanently and cannot be recovered. Consider “Hide” instead if you may need it again.</ConfirmDialog>
    </>
  )
}
