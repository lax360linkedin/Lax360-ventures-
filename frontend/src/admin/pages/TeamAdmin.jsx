import { useMemo, useState } from 'react'
import { Eye, EyeOff, ExternalLink, FileText, ImagePlus, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Editor } from './Content.jsx'
import { BulkImageDialog, prettyName } from '../ImageUpload.jsx'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Input, PageHeader, Select, Spinner, Toggle, useFetch, useToast } from '../ui.jsx'

const PREVIEW = '/our-team?cms_preview=1'
const ROLE = { founder: 'Founder', ceo: 'CEO', managing_director: 'Managing Director', department_head: 'Department Head', team_lead: 'Team Lead', team_member: 'Team Member' }
const LEADERS = new Set(['founder', 'ceo', 'managing_director'])
const photo = (d) => (d.photo ? `/api/admin/media/${d.photo}/file` : d.photo_path || '')
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const SECTIONS = [
  ['show_leadership', true], ['show_departments', false], ['show_directory', true], ['show_culture', true], ['show_expertise', false], ['show_careers', true],
]

/**
 * Team management: employees, departments and the sections of the public Our Team page, on one screen. It edits the same content as Website content > Team, so every change is a change
 * on the public site once published. Employees are assigned to a department from their own profile and appear under it automatically: nobody is entered twice. Departments, the
 * Departments section and individual profiles can each be switched off without deleting anything. Uploaded photographs go to the media library's permanent storage.
 */
export default function TeamAdmin({ view = 'team' }) { // view 'team': employees, photos and page sections; view 'departments': the departments on their own screen
  const toast = useToast()
  const kinds = useFetch(() => api('/api/admin/content/kinds'), [])
  const peopleQ = useFetch(() => api('/api/admin/content/team_member'), [])
  const deptQ = useFetch(() => api('/api/admin/content/team_department'), [])
  const pageQ = useFetch(() => api('/api/admin/content/team_page'), [])
  const shotsQ = useFetch(() => api('/api/admin/content/team_gallery'), [])
  const [bulk, setBulk] = useState(null) // 'employees' | 'photos'
  const [tab, setTab] = useState(view === 'departments' ? 'departments' : 'employees')
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [dept, setDept] = useState('all')
  const [q, setQ] = useState('')
  const spec = (k) => kinds.data?.kinds.find((x) => x.kind === k)
  const people = peopleQ.data || []
  const depts = deptQ.data || []
  const page = (pageQ.data || [])[0]
  const t = q.trim().toLowerCase()

  const deptName = useMemo(() => Object.fromEntries(depts.map((d) => [d.slug, d.title])), [depts])
  const counts = useMemo(() => people.reduce((m, p) => { const k = p.data?.department || ''; m[k] = (m[k] || 0) + 1; return m }, {}), [people])
  const headOf = (slug) => people.find((p) => p.data?.department === slug && p.data?.role_level === 'department_head')
  const list = useMemo(() => people.filter((p) => (dept === 'all' || (dept === 'none' ? !p.data?.department : p.data?.department === dept)) && (!t || `${p.title} ${p.data?.designation || ''} ${deptName[p.data?.department] || ''}`.toLowerCase().includes(t))), [people, dept, t, deptName])

  if ((kinds.loading && !kinds.data) || (peopleQ.loading && !peopleQ.data)) return <Spinner />
  if (kinds.error && !kinds.data) return <ErrorState error={kinds.error} onRetry={kinds.reload} />
  if (!spec('team_member') || !spec('team_department') || !spec('team_page')) return <Card><EmptyState title="Team management is not available">Your account cannot manage website content.</EmptyState></Card>

  const reload = () => { peopleQ.reload(); deptQ.reload(); pageQ.reload(); shotsQ.reload() }
  const shots = shotsQ.data || []
  const nextOrder = (items) => Math.max(0, ...items.map((x) => x.sort_order || 0))
  const patch = async (item, body, ok) => {
    try { await api(`/api/admin/content/item/${item.id}`, { method: 'PATCH', body }); toast(ok); reload() } catch (e) { toast(e.message, 'error') }
  }
  const move = async (kind, items, i, delta) => {
    const ids = items.map((x) => x.id)
    const [id] = ids.splice(i, 1)
    ids.splice(i + delta, 0, id)
    try { await api(`/api/admin/content/${kind}/order`, { method: 'PUT', body: { ids } }); toast('Order saved'); reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try {
      if (del.kind === 'team_department') { // keep the employees: they become unassigned (a profile must never point at a department that no longer exists)
        for (const p of people.filter((x) => x.data?.department === del.item.slug)) { const { department, ...rest } = p.data; await api(`/api/admin/content/item/${p.id}`, { method: 'PATCH', body: { data: rest } }) } // eslint-disable-line no-unused-vars
      }
      await api(`/api/admin/content/item/${del.item.id}`, { method: 'DELETE' }); toast(`${del.kind === 'team_member' ? 'Profile' : del.kind === 'team_gallery' ? 'Photo' : 'Department'} deleted`); setDel(null); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  const sectionValue = (key, fallback) => (page?.data && typeof page.data[key] === 'boolean' ? page.data[key] : fallback)
  const setSection = async (key, value) => {
    const data = { ...(page?.data || {}), ...Object.fromEntries(SECTIONS.map(([k, d]) => [k, sectionValue(k, d)])), [key]: value }
    try {
      if (page) await api(`/api/admin/content/item/${page.id}`, { method: 'PATCH', body: { data, status: 'published' } })
      else await api('/api/admin/content/team_page', { method: 'POST', body: { title: spec('team_page').label, data, status: 'published' } })
      toast(value ? 'Section switched on' : 'Section switched off')
      reload()
    } catch (e) { toast(e.message, 'error') }
  }

  const tabBtn = (id, text, n) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors ${tab === id ? 'border-primary bg-primary text-white' : 'border-edge-strong bg-glass hover:border-lav'}`}>{text}{n !== undefined && <span className="rounded-full bg-black/20 px-2 text-xs">{n}</span>}</button>
  const leaders = people.filter((p) => LEADERS.has(p.data?.role_level) && p.data?.active !== false && p.status === 'published')
  const depsOn = sectionValue('show_departments', false)
  const founder = [...leaders].sort((a, b) => ['founder', 'ceo', 'managing_director'].indexOf(a.data.role_level) - ['founder', 'ceo', 'managing_director'].indexOf(b.data.role_level) || a.sort_order - b.sort_order)[0]
  const samples = people.filter((p) => p.data?.sample === true)
  const removeSamples = async () => {
    setBusy(true)
    try { for (const p of samples) await api(`/api/admin/content/item/${p.id}`, { method: 'DELETE' }); toast(`${samples.length} sample profile${samples.length === 1 ? '' : 's'} removed`); setDel(null); reload() } catch (e) { toast(e.message, 'error'); reload() } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title={view === 'departments' ? 'Departments' : 'Our team'} lead={view === 'departments' ? 'The departments of the company. Employees are assigned to a department from their own profile and appear under it automatically; switch the Departments section on in Our team > Page sections to show them on the Our Team page. Add, rename, re-order, hide or delete departments here.' : "Employees, departments and the sections of the Our Team page. Add people and departments whenever your team grows: no code changes. With Departments off, the page is the leadership profile followed by the team gallery; with Departments on, employees are grouped under their departments automatically."}
        actions={view === 'departments' ? <a href={PREVIEW} target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> Preview the page</Btn></a> : <>
          <a href={PREVIEW} target="_blank" rel="noopener noreferrer"><Btn><ExternalLink className="size-4" aria-hidden="true" /> Preview the page</Btn></a>
          <Btn onClick={() => setBulk('employees')}><Users className="size-4" aria-hidden="true" /> Add employees from photos</Btn>
          <Btn kind="primary" onClick={() => setEdit({ spec: spec('team_member'), item: null, preset: { role_level: 'team_member', active: true } })}><UserPlus className="size-4" aria-hidden="true" /> Add employee</Btn>
        </>} />

      <div role="tablist" aria-label="Team management" className="mb-6 flex flex-wrap gap-2">
        {view === 'departments' ? tabBtn('departments', 'Departments', depts.length) : <>{tabBtn('employees', 'Employees', people.length)}{tabBtn('photos', 'Photos', shots.length)}{tabBtn('sections', 'Page sections')}</>}
      </div>

      {tab === 'employees' && (
        <>
          {samples.length > 0 && (
            <Card className="mb-4 flex flex-wrap items-center justify-between gap-4 !border-amber-500/50 !p-5">
              <div>
                <p className="font-display text-lg font-semibold">{samples.length} temporary sample profile{samples.length === 1 ? ' is' : 's are'} on the Our Team page</p>
                <p className="mt-1 text-sm text-soft">They are fictional demonstration people with illustrated portraits, labelled “Sample” on the website. Edit them (name, designation, photo, introduction) to make them real, or add your own people and remove all the samples in one click.</p>
              </div>
              <Btn kind="danger" onClick={() => setDel({ kind: 'samples' })}><Trash2 className="size-4" aria-hidden="true" /> Remove all samples</Btn>
            </Card>
          )}
          <Card className="mb-4 flex flex-wrap items-center gap-4 !p-4">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-edge bg-gradient-to-br from-primary/30 to-accent/10">
              {founder && photo(founder.data) ? <img src={photo(founder.data)} alt="" width="64" height="64" className="size-full object-cover object-top" /> : <span aria-hidden="true" className="font-display text-lg font-semibold">{founder ? initials(founder.title) : '?'}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-soft">Founder (CEO / Managing Director: one person, shown once at the top)</p>
              {founder ? <><p className="truncate font-display text-lg font-semibold">{founder.title}</p><p className="truncate text-sm text-soft">{founder.data.designation}</p></> : <p className="text-sm text-soft">No founder yet. Add a profile with the position Founder, CEO or Managing Director.</p>}
            </div>
            {founder
              ? <Btn kind="primary" onClick={() => setEdit({ spec: spec('team_member'), item: founder })}><Pencil className="size-4" aria-hidden="true" /> Edit founder (name, photo, intro)</Btn>
              : <Btn kind="primary" onClick={() => setEdit({ spec: spec('team_member'), item: null, preset: { role_level: 'founder', active: true } })}><UserPlus className="size-4" aria-hidden="true" /> Add founder</Btn>}
          </Card>
          <p className="mb-4 text-sm text-soft">The public page now shows: {leaders.length ? 'the founder, then ' : ''}{depsOn ? 'employees grouped under their departments.' : 'every other employee in one gallery.'}</p>
          <div className="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Find an employee">
            <label className="min-w-[14rem] flex-1 text-sm font-semibold">Search<Input className="mt-1" placeholder="Name, designation or department" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            <label className="text-sm font-semibold">Department<Select className="mt-1" value={dept} onChange={(e) => setDept(e.target.value)}><option value="all">All</option><option value="none">No department</option>{depts.map((d) => <option key={d.id} value={d.slug}>{d.title}</option>)}</Select></label>
          </div>
          {peopleQ.data && people.length === 0 && <Card><EmptyState title="No employees yet">Add your first profile. Only real, verified people should be listed: nothing is shown on the website until you publish a profile.</EmptyState></Card>}
          {list.length > 0 && (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((p) => {
                const d = p.data || {}
                const i = people.findIndex((x) => x.id === p.id)
                const off = d.active === false
                const src = photo(d)
                return (
                  <li key={p.id}>
                    <Card className={`flex h-full gap-4 !p-4 ${off || p.status !== 'published' ? 'opacity-80' : ''}`}>
                      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-edge bg-gradient-to-br from-primary/30 to-accent/10">
                        {src ? <img src={src} alt="" width="80" height="80" loading="lazy" className="size-full object-cover object-top" /> : <span aria-hidden="true" className="font-display text-xl font-semibold">{initials(p.title)}</span>}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div>
                          <h2 className="truncate font-display text-base font-semibold">{p.title}</h2>
                          <p className="truncate text-sm text-soft">{d.designation}{d.department ? ` · ${deptName[d.department] || 'Unknown department'}` : ''}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5"><Badge value={p.status} /><span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold">{ROLE[d.role_level] || 'Team Member'}</span>{off && <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold text-soft">hidden</span>}{d.sample && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">Sample</span>}{!d.photo && !d.photo_path && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">no photo</span>}</div>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-2">
                          <Btn kind="primary" onClick={() => setEdit({ spec: spec('team_member'), item: p })}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn>
                          <Btn onClick={() => patch(p, { data: { ...d, active: off } }, off ? 'Profile shown on the website' : 'Profile hidden from the website')} aria-label={`${off ? 'Show' : 'Hide'} ${p.title}`}>{off ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}</Btn>
                          <Btn onClick={() => patch(p, { status: p.status === 'published' ? 'draft' : 'published' }, p.status === 'published' ? 'Unpublished: saved as a draft' : 'Published')} aria-label={`${p.status === 'published' ? 'Unpublish' : 'Publish'} ${p.title}`}><FileText className="size-4" aria-hidden="true" /></Btn>
                          <Btn kind="danger" onClick={() => setDel({ kind: 'team_member', item: p })} aria-label={`Delete ${p.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                          {people.length > 1 && dept === 'all' && !t && <span className="ml-auto flex gap-1"><Btn kind="ghost" disabled={i === 0} onClick={() => move('team_member', people, i, -1)} aria-label={`Move ${p.title} earlier`}>←</Btn><Btn kind="ghost" disabled={i === people.length - 1} onClick={() => move('team_member', people, i, 1)} aria-label={`Move ${p.title} later`}>→</Btn></span>}
                        </div>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
          {people.length > 0 && list.length === 0 && <Card><EmptyState title="Nothing matches">Try a different search or department.</EmptyState></Card>}
          <p className="mt-6 text-sm text-soft">Use Edit to change details, replace or remove the photograph (in the media library field), assign the department and position, and edit the short bio and skills. The eye hides a profile without deleting it; the page icon publishes or unpublishes it. Use “Preview the page” to see drafts in the real design before publishing.</p>
        </>
      )}

      {tab === 'departments' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-soft">{depsOn ? 'The Departments section is ON: employees appear under these departments.' : 'The Departments section is OFF (see Page sections): these departments are not shown yet. Turn it on when your team is big enough to need them.'}</p>
            <Btn kind="primary" onClick={() => setEdit({ spec: spec('team_department'), item: null, preset: { active: true } })}><Plus className="size-4" aria-hidden="true" /> Add department</Btn>
          </div>
          {deptQ.data && depts.length === 0 && <Card><EmptyState title="No departments yet">Create a department, then assign employees to it from their profile. You do not need departments while the team is small.</EmptyState></Card>}
          {depts.length > 0 && (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {depts.map((d, i) => {
                const off = d.data?.active === false
                const head = headOf(d.slug)
                return (
                  <li key={d.id}>
                    <Card className={`flex h-full flex-col gap-3 !p-4 ${off || d.status !== 'published' ? 'opacity-80' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-edge bg-glass">{d.data?.image ? <img src={`/api/admin/media/${d.data.image}/file`} alt="" width="64" height="64" loading="lazy" className="size-full object-cover" /> : <span aria-hidden="true" className="text-xs text-soft">no image</span>}</div>
                        <div className="min-w-0"><h2 className="truncate font-display text-base font-semibold">{d.title}</h2>
                          <p className="text-sm text-soft">{counts[d.slug] || 0} employee{(counts[d.slug] || 0) === 1 ? '' : 's'} · Head: {head ? head.title : <span className="text-amber-600 dark:text-amber-300">not assigned</span>}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5"><Badge value={d.status} />{off && <span className="rounded-full border border-edge-strong px-2 py-0.5 text-xs font-semibold text-soft">hidden</span>}</div></div>
                      </div>
                      {d.data?.description && <p className="line-clamp-2 text-sm text-soft">{d.data.description}</p>}
                      <div className="mt-auto flex flex-wrap items-center gap-2">
                        <Btn kind="primary" onClick={() => setEdit({ spec: spec('team_department'), item: d })}><Pencil className="size-4" aria-hidden="true" /> Edit</Btn>
                        <Btn onClick={() => patch(d, { data: { ...d.data, active: off } }, off ? 'Department shown' : 'Department hidden')} aria-label={`${off ? 'Show' : 'Hide'} ${d.title}`}>{off ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}</Btn>
                        <Btn kind="danger" onClick={() => setDel({ kind: 'team_department', item: d })} aria-label={`Delete ${d.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                        {depts.length > 1 && <span className="ml-auto flex gap-1"><Btn kind="ghost" disabled={i === 0} onClick={() => move('team_department', depts, i, -1)} aria-label={`Move ${d.title} earlier`}>←</Btn><Btn kind="ghost" disabled={i === depts.length - 1} onClick={() => move('team_department', depts, i, 1)} aria-label={`Move ${d.title} later`}>→</Btn></span>}
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-6 text-sm text-soft">Assign a department head by setting an employee&apos;s position to Department Head and choosing the department in their profile; assign everyone else the same way. People appear under their department automatically, and moving someone to another department is one edit. Deleting a department keeps its employees: they become unassigned until you assign them to another department.</p>
        </>
      )}

      {tab === 'photos' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-soft">Genuine photographs of the team, office and events for the “People & culture” section (shown when the section is on and photographs are published). Add many at once by dragging them in or pasting; no description is needed.</p>
            <Btn kind="primary" onClick={() => setBulk('photos')}><ImagePlus className="size-4" aria-hidden="true" /> Add photos</Btn>
          </div>
          {shotsQ.data && shots.length === 0 && <Card><EmptyState title="No photos yet">Add your first photos. Nothing is shown on the website until you add some.</EmptyState></Card>}
          {shots.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {shots.map((g, i) => {
                const cat = spec('team_gallery').fields.find((f) => f.name === 'category')?.options.find((o) => o.value === g.data?.category)?.label
                return (
                  <li key={g.id}>
                    <Card className={`flex h-full flex-col gap-2 !p-3 ${g.status !== 'published' ? 'opacity-75' : ''}`}>
                      <div className="aspect-[4/3] overflow-hidden rounded-lg border border-edge bg-glass">{g.data?.image ? <img src={`/api/admin/media/${g.data.image}/file`} alt="" width="320" height="240" loading="lazy" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-sm text-soft">No photo</span>}</div>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{g.title}</p><p className="truncate text-xs text-soft">{cat}{g.data?.caption ? ` · “${g.data.caption}”` : ''}</p><div className="mt-1"><Badge value={g.status} /></div></div>
                      <div className="mt-auto flex flex-wrap items-center gap-2">
                        <Btn onClick={() => setEdit({ spec: spec('team_gallery'), item: g })} aria-label={`Edit ${g.title}`}><Pencil className="size-4" aria-hidden="true" /></Btn>
                        <Btn onClick={() => patch(g, { status: g.status === 'published' ? 'draft' : 'published' }, g.status === 'published' ? 'Unpublished' : 'Published')} aria-label={`${g.status === 'published' ? 'Unpublish' : 'Publish'} ${g.title}`}>{g.status === 'published' ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</Btn>
                        <Btn kind="danger" onClick={() => setDel({ kind: 'team_gallery', item: g })} aria-label={`Delete ${g.title}`}><Trash2 className="size-4" aria-hidden="true" /></Btn>
                        {shots.length > 1 && <span className="ml-auto flex gap-1"><Btn kind="ghost" disabled={i === 0} onClick={() => move('team_gallery', shots, i, -1)} aria-label={`Move ${g.title} earlier`}>←</Btn><Btn kind="ghost" disabled={i === shots.length - 1} onClick={() => move('team_gallery', shots, i, 1)} aria-label={`Move ${g.title} later`}>→</Btn></span>}
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {tab === 'sections' && (
        <>
          <Card className="mb-6 !p-0">
            <ul className="divide-y divide-edge">
              {SECTIONS.map(([key, fallback]) => {
                const f = spec('team_page').fields.find((x) => x.name === key)
                const on = sectionValue(key, fallback)
                return (
                  <li key={key} className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="min-w-0 max-w-2xl"><p className="font-display text-base font-semibold">{f.label}</p><p className="mt-0.5 text-sm text-soft">{f.help}</p></div>
                    <Toggle checked={on} onChange={(v) => setSection(key, v)} label={on ? 'On' : 'Off'} />
                  </li>
                )
              })}
            </ul>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-soft">Changes apply to the website straight away. The hero and the section headings are edited here:</p>
            <Btn onClick={() => setEdit({ spec: spec('team_page'), item: page || null })}><Pencil className="size-4" aria-hidden="true" /> Edit page text</Btn>
          </div>
        </>
      )}

      <BulkImageDialog open={bulk === 'photos'} onClose={() => setBulk(null)} title="Add team & culture photos" createLabel="Add photos" onDone={reload}
        intro="Choose photos, drag them in, or paste copied ones with Ctrl+V. Check the previews, remove any you do not want, pick the category and upload. No description is needed."
        globals={[{ name: 'category', label: 'Category', required: true, options: spec('team_gallery').fields.find((f) => f.name === 'category').options, default: 'activities' }]}
        create={({ asset, name, globals, index }) => api('/api/admin/content/team_gallery', { method: 'POST', body: { title: name || 'Photo', status: 'published', sort_order: nextOrder(shots) + (index + 1) * 10, data: { category: globals.category, image: asset.id } } })} />
      <BulkImageDialog open={bulk === 'employees'} onClose={() => setBulk(null)} title="Add employees from photos" createLabel="Create profiles" onDone={reload}
        intro="Choose one portrait photo per person (drag them in or paste with Ctrl+V). After the upload, give each person a name and designation; only people you enter here are created, and you can add the department and bio later."
        globals={[{ name: 'status', label: 'Profiles are', required: true, default: 'published', options: [{ value: 'published', label: 'Published on the website' }, { value: 'draft', label: 'Saved as drafts (not shown yet)' }] }]}
        rows={[
          { name: 'name', label: 'Full name', required: true, init: (x) => x.name, max: 200 },
          { name: 'designation', label: 'Designation (job title)', required: true, max: 120 },
          { name: 'role_level', label: 'Position', type: 'select', empty: 'Team Member', options: spec('team_member').fields.find((f) => f.name === 'role_level').options },
          { name: 'department', label: 'Department', type: 'select', empty: 'No department', options: depts.map((d) => ({ value: d.slug, label: d.title })) },
        ]}
        create={({ asset, row, globals, index }) => api('/api/admin/content/team_member', { method: 'POST', body: { title: row.name.trim(), status: globals.status || 'published', sort_order: nextOrder(people) + (index + 1) * 10,
          data: { designation: row.designation.trim(), role_level: row.role_level || 'team_member', ...(row.department ? { department: row.department } : {}), photo: asset.id, active: true } } })} />
      {edit && <Editor key={`${edit.spec.kind}-${edit.item?.id || 'new'}`} spec={edit.spec} item={edit.item} preset={edit.preset} onClose={() => setEdit(null)} onSaved={reload} />}
      <ConfirmDialog open={del?.kind === 'samples'} title="Remove all sample profiles?" busy={busy} onClose={() => setDel(null)} onConfirm={removeSamples}>The {samples.length} temporary sample profile{samples.length === 1 ? '' : 's'} will be deleted. Profiles you added or edited and unmarked as samples stay.</ConfirmDialog>
      <ConfirmDialog open={!!del && del.kind !== 'samples'} title={del?.kind === 'team_member' ? 'Delete this profile?' : del?.kind === 'team_gallery' ? 'Delete this photo?' : 'Delete this department?'} busy={busy} onClose={() => setDel(null)} onConfirm={remove}>
        {del?.kind === 'team_gallery'
          ? <>“{del.item.title}” will be removed permanently from the gallery.</>
          : del?.kind === 'team_member'
          ? <>“{del.item.title}” will be removed permanently. Consider hiding the profile instead if you may need it again.</>
          : <>“{del?.item.title}” will be removed permanently. Its {counts[del?.item.slug] || 0} employee(s) are kept: they become unassigned (no department) until you assign them to another one.</>}
      </ConfirmDialog>
    </>
  )
}
