import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Badge, Btn, Card, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Toggle, fmtDay, label, useFetch, useToast } from '../ui.jsx'
import MediaSelect from './MediaSelect.jsx'
import { Unavailable, fmtNum, gameTitle, pct, pz } from './shared.jsx'

const blank = { title: 'Collect {n} stars', description: 'Collect {n} stars in Catch the Stars.', metric: 'stars_collected', target: 20, reward_points: 20, active: true, starts_on: '', ends_on: '', artwork_media_id: null, sort_order: 100 }
const scheduleText = (c) => (c.starts_on || c.ends_on ? `${c.starts_on ? fmtDay(c.starts_on) : 'any time'} to ${c.ends_on ? fmtDay(c.ends_on) : 'open'}` : 'Every day')

function Editor({ item, meta, onClose, onSaved }) {
  const toast = useToast()
  const [v, setV] = useState(item ? { ...item, target: item.targets[0], starts_on: item.starts_on || '', ends_on: item.ends_on || '' } : blank)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val }))
  const varied = item && new Set(item.targets).size > 1
  const save = async () => {
    setBusy(true); setErrors({})
    const game = meta.metrics[v.metric].game
    const body = { title: v.title, description: v.description, metric: v.metric, game, reward_points: Number(v.reward_points), active: v.active, sort_order: Number(v.sort_order), artwork_media_id: v.artwork_media_id || null,
      starts_on: v.starts_on || null, ends_on: v.ends_on || null, ...(varied && Number(v.target) === item.targets[0] ? {} : { target: Number(v.target) }), ...(item && !v.starts_on && !v.ends_on ? { clear_schedule: true } : {}) }
    try { await pz(item ? `/challenges/${item.id}` : '/challenges', { method: item ? 'PATCH' : 'POST', body }); toast(item ? 'Challenge saved.' : 'Challenge created.'); onSaved() } catch (e) { setErrors(e.fields || {}); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} wide title={item ? `Edit ${item.title}` : 'New daily challenge'} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={save}>{item ? 'Save changes' : 'Create challenge'}</Btn></>}>
      <p className="mb-3 rounded-lg bg-glass-strong p-3 text-xs text-soft">{meta.policy} Days follow {meta.timezone} time. {meta.supported}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title" required hint="Use {n} for the target and {s} for a plural s" error={errors.title}>{(p) => <Input {...p} maxLength={80} value={v.title} onChange={(e) => set('title')(e.target.value)} />}</Field>
        <Field label="Objective" required hint={`Associated game: ${meta.metrics[v.metric].game ? gameTitle(meta.metrics[v.metric].game) : 'any (counts different games)'}`} error={errors.metric || errors.game}>{(p) => <Select {...p} value={v.metric} onChange={(e) => set('metric')(e.target.value)}>{Object.keys(meta.metrics).map((m) => <option key={m} value={m}>{label(m)}</option>)}</Select>}</Field>
        <Field label="Description" required className="md:col-span-2" error={errors.description}>{(p) => <Input {...p} maxLength={200} value={v.description} onChange={(e) => set('description')(e.target.value)} />}</Field>
        <Field label="Target" hint={varied ? 'This challenge has different targets per weekday; saving a new number sets one target for every day' : 'How many to reach (1 to 500; at most 4 for different games)'} error={errors.target}>{(p) => <Input {...p} type="number" min="1" max="500" value={v.target} onChange={(e) => set('target')(e.target.value)} />}</Field>
        <Field label="Reward points" hint="0 to 100, claimed once per player (daily cap applies)" error={errors.reward_points}>{(p) => <Input {...p} type="number" min="0" max="100" value={v.reward_points} onChange={(e) => set('reward_points')(e.target.value)} />}</Field>
        <Field label="Starts on" hint="Leave empty to run every day" error={errors.starts_on}>{(p) => <Input {...p} type="date" value={v.starts_on} onChange={(e) => set('starts_on')(e.target.value)} />}</Field>
        <Field label="Ends on" hint="Leave empty for no end" error={errors.ends_on}>{(p) => <Input {...p} type="date" value={v.ends_on} min={v.starts_on || undefined} onChange={(e) => set('ends_on')(e.target.value)} />}</Field>
        <Field label="Artwork" hint="Optional picture from Game media" error={errors.artwork_media_id}>{(p) => <MediaSelect {...p} purpose="challenge_art" label="artwork" value={v.artwork_media_id} onChange={set('artwork_media_id')} />}</Field>
        <Field label="Display order" error={errors.sort_order}>{(p) => <Input {...p} type="number" min="0" max="999" value={v.sort_order} onChange={(e) => set('sort_order')(e.target.value)} />}</Field>
      </div>
      <div className="mt-4"><Toggle checked={v.active} onChange={set('active')} label="Active (included when a new day is generated)" /></div>
    </Modal>
  )
}

export default function Challenges() {
  const { data, error, loading, reload } = useFetch(() => pz('/challenges'))
  const toast = useToast()
  const [edit, setEdit] = useState(null)
  const toggle = async (c, active) => { try { await pz(`/challenges/${c.id}`, { method: 'PATCH', body: { active } }); toast(active ? 'Activated. It applies from the next day that is generated.' : 'Deactivated. It stops from the next day that is generated.'); reload() } catch (e) { toast(e.message, 'error') } }
  const columns = [
    { key: 'title', header: 'Challenge', render: (c) => <span><strong>{c.title}</strong><span className="block max-w-xs truncate text-xs text-soft" title={c.description}>{c.description}</span></span> },
    { key: 'obj', header: 'Objective', render: (c) => <span className="text-xs">{label(c.metric)}{c.game ? ` · ${gameTitle(c.game)}` : ''}<span className="block text-soft">Target {new Set(c.targets).size > 1 ? `${Math.min(...c.targets)}–${Math.max(...c.targets)} (by weekday)` : c.targets[0]}</span></span> },
    { key: 'reward', header: 'Reward', render: (c) => `+${c.reward_points}` }, { key: 'when', header: 'Schedule', render: (c) => <span className="text-xs">{scheduleText(c)}</span> },
    { key: 'part', header: 'Last 30 days', render: (c) => (c.stats.participants ? <span className="text-xs">{fmtNum(c.stats.participants)} players · {fmtNum(c.stats.completed)} completed · {pct(c.stats.completion_rate)}<span className="block text-soft">{fmtNum(c.stats.claimed)} rewards claimed</span></span> : <span className="text-xs text-soft">No participation</span>) },
    { key: 'active', header: 'Active', render: (c) => <Toggle checked={c.active} onChange={(on) => toggle(c, on)} label={<span className="sr-only">{c.title} active</span>} /> },
    { key: 'act', header: '', render: (c) => <Btn onClick={() => setEdit(c)} aria-label={`Edit ${c.title}`}><Pencil className="size-4" aria-hidden="true" /></Btn> },
  ]
  return (
    <>
      <PageHeader title="Daily challenges" lead="Create and schedule the goals players see each day. The server tracks progress from verified results only, validates every reward, and lets each player claim a reward once." actions={<Btn kind="primary" onClick={() => setEdit({})}><Plus className="size-4" aria-hidden="true" />New challenge</Btn>} />
      {loading && !data && <Spinner />}
      {error && <><Unavailable error={error} /><ErrorState error={error} onRetry={reload} /></>}
      {data && (
        <>
          <Card className="mb-4 text-sm text-soft"><strong className="text-fg">How it works:</strong> {data.policy} <span className="block mt-1">Today is {fmtDay(data.today)} ({data.timezone}). An expired challenge can no longer be completed or claimed. {data.supported}</span></Card>
          <Card className="!p-0"><DataTable columns={columns} rows={data.items} empty={<EmptyState title="No challenge templates">Create one, or the built-in daily set is used.</EmptyState>} /></Card>
          {data.items.length > 0 && !data.items.some((c) => c.active) && <p role="alert" className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"><Badge value="pending" text="Heads up" /> Every challenge is inactive, so new days will have no challenges.</p>}
        </>
      )}
      {edit && data && <Editor item={edit.id ? edit : null} meta={data} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </>
  )
}
