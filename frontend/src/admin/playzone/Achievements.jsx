import { useState } from 'react'
import { Eye, Pencil, Plus, Users } from 'lucide-react'
import { Badge, Btn, Card, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, Toggle, label, useFetch, useToast } from '../ui.jsx'
import MediaSelect from './MediaSelect.jsx'
import { GAMES, Unavailable, fmtNum, gameTitle, pz } from './shared.jsx'

const ICONS = ['trophy', 'star', 'footprints', 'gamepad', 'cloud', 'mountain', 'flower', 'puzzle', 'bug', 'shield', 'calendar', 'medal']
const blank = { title: '', description: '', game: '', icon: 'trophy', icon_media_id: null, rule_type: 'games_played', rule_params: { n: 1 }, reward_points: 0, active: true, sort_order: 100 }

function defaultParams(spec) {
  return Object.fromEntries(Object.entries(spec.params).map(([k, r]) => [k, r === 'game' ? 'catch-the-stars' : r === 'level_game' ? 'puzzle-pop' : Array.isArray(r) ? r[0] : r.min]))
}

function Preview({ v, earned }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-edge p-3 text-sm" aria-label="Preview">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-glass-strong text-lg" aria-hidden="true">{earned ? '🏅' : '🔒'}</span>
      <div><p className="font-semibold">{v.title || 'Achievement name'} {v.reward_points > 0 && <span className="text-xs font-normal text-soft">· +{v.reward_points} pts</span>}</p><p className="text-soft">{v.description || 'Description shown to players'}</p>{v.game && <p className="mt-0.5 text-xs text-soft">{gameTitle(v.game)}</p>}</div>
    </div>
  )
}

function Editor({ item, meta, onClose, onSaved }) {
  const toast = useToast()
  const [v, setV] = useState(item ? { ...item, game: item.game || '', rule_params: { ...item.rule_params } } : blank)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const builtIn = item?.built_in
  const spec = meta.rule_types[v.rule_type]
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val }))
  const save = async () => {
    setBusy(true); setErrors({})
    const body = { title: v.title, description: v.description, game: v.game || null, icon: v.icon, icon_media_id: v.icon_media_id || null, reward_points: Number(v.reward_points), active: v.active, sort_order: Number(v.sort_order), ...(builtIn ? {} : { rule_type: v.rule_type, rule_params: v.rule_params }) }
    try { await pz(item ? `/achievements/${item.code}` : '/achievements', { method: item ? 'PATCH' : 'POST', body }); toast(item ? 'Achievement saved.' : 'Achievement created.'); onSaved() } catch (e) { setErrors(e.fields || {}); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} wide title={item ? `Edit ${item.title}` : 'New achievement'} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={save}>{item ? 'Save changes' : 'Create achievement'}</Btn></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" required error={errors.title}>{(p) => <Input {...p} maxLength={60} value={v.title} onChange={(e) => set('title')(e.target.value)} />}</Field>
        <Field label="Associated game" hint="Optional" error={errors.game}>{(p) => <Select {...p} value={v.game} onChange={(e) => set('game')(e.target.value)}><option value="">Any / all games</option>{GAMES.map(([s, t]) => <option key={s} value={s}>{t}</option>)}</Select>}</Field>
        <Field label="Description" required className="md:col-span-2" error={errors.description}>{(p) => <Textarea {...p} maxLength={200} value={v.description} onChange={(e) => set('description')(e.target.value)} />}</Field>
        <Field label="Badge icon">{(p) => <Select {...p} value={v.icon} onChange={(e) => set('icon')(e.target.value)}>{ICONS.map((i) => <option key={i} value={i}>{label(i)}</option>)}</Select>}</Field>
        <Field label="Badge image" hint="Optional picture from Game media" error={errors.icon_media_id}>{(p) => <MediaSelect {...p} purpose="achievement_icon" label="badge image" value={v.icon_media_id} onChange={set('icon_media_id')} />}</Field>
        <Field label="Reward points" hint="0 to 500, added to the player's ranking points once" error={errors.reward_points}>{(p) => <Input {...p} type="number" min="0" max="500" value={v.reward_points} onChange={(e) => set('reward_points')(e.target.value)} />}</Field>
        <Field label="Display order" hint="Lower numbers first" error={errors.sort_order}>{(p) => <Input {...p} type="number" min="0" max="999" value={v.sort_order} onChange={(e) => set('sort_order')(e.target.value)} />}</Field>
      </div>
      <fieldset className="mt-4 rounded-xl border border-edge p-4"><legend className="px-1 text-sm font-semibold">Unlock condition</legend>
        {builtIn ? <p className="text-sm text-soft">This is a built-in achievement; its condition is fixed in the server. You can change its text, icon, points and visibility.</p> : (
          <>
            <Field label="Condition type" error={errors.rule_type}>{(p) => <Select {...p} value={v.rule_type} onChange={(e) => setV((s) => ({ ...s, rule_type: e.target.value, rule_params: defaultParams(meta.rule_types[e.target.value]) }))}>{Object.entries(meta.rule_types).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</Select>}</Field>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {Object.entries(spec.params).map(([k, r]) => (
                <Field key={k} label={label(k)} error={errors.rule_params}>
                  {(p) => r === 'game' || r === 'level_game' ? <Select {...p} value={v.rule_params[k]} onChange={(e) => setV((s) => ({ ...s, rule_params: { ...s.rule_params, [k]: e.target.value } }))}>{(r === 'game' ? meta.games : meta.level_games).map((g) => <option key={g} value={g}>{gameTitle(g)}</option>)}</Select>
                    : Array.isArray(r) ? <Select {...p} value={v.rule_params[k]} onChange={(e) => setV((s) => ({ ...s, rule_params: { ...s.rule_params, [k]: e.target.value } }))}>{r.map((o) => <option key={o} value={o}>{label(o)}</option>)}</Select>
                      : <Input {...p} type="number" min={r.min} max={r.max} value={v.rule_params[k] ?? ''} onChange={(e) => setV((s) => ({ ...s, rule_params: { ...s.rule_params, [k]: e.target.value === '' ? '' : Number(e.target.value) } }))} />}
                </Field>
              ))}
            </div>
            <p className="mt-2 text-xs text-soft">Conditions are picked from a fixed list and checked by the server against verified results only. No code or queries can be entered.</p>
          </>
        )}
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-6"><Toggle checked={v.active} onChange={set('active')} label="Active (players can earn it and see it)" /></div>
      <div className="mt-4"><p className="mb-1 text-sm font-semibold">Preview</p><div className="grid gap-2 sm:grid-cols-2"><Preview v={v} earned={false} /><Preview v={v} earned /></div></div>
    </Modal>
  )
}

function Eligible({ item, onClose }) {
  const { data, error, loading } = useFetch(() => pz(`/achievements/${item.code}/eligible`), [item.code])
  return (
    <Modal open onClose={onClose} title={`Eligible players: ${item.title}`}>
      {loading && !data && <Spinner />}
      {error && <ErrorState error={error} />}
      {data && (data.items.length === 0 ? <EmptyState title="Nobody is waiting for this achievement" /> : <ul className="divide-y divide-edge text-sm">{data.items.map((p) => <li key={p.id} className="flex justify-between py-2"><strong>{p.nickname}</strong><span className="text-soft">{fmtNum(p.verified_points)} pts</span></li>)}</ul>)}
      {data && <p className="mt-3 text-xs text-soft">Players who already meet the condition receive it with their next verified result. {data.note}</p>}
    </Modal>
  )
}

export default function Achievements() {
  const { data, error, loading, reload } = useFetch(() => pz('/achievements'))
  const toast = useToast()
  const [edit, setEdit] = useState(null)
  const [eligible, setEligible] = useState(null)
  const toggle = async (a, active) => { try { await pz(`/achievements/${a.code}`, { method: 'PATCH', body: { active } }); toast(active ? 'Enabled.' : 'Disabled.'); reload() } catch (e) { toast(e.message, 'error') } }
  const columns = [
    { key: 'title', header: 'Achievement', render: (a) => <span><strong>{a.title}</strong><span className="block max-w-xs truncate text-xs text-soft" title={a.description}>{a.description}</span></span> },
    { key: 'game', header: 'Game', render: (a) => (a.game ? gameTitle(a.game) : 'Any') },
    { key: 'rule', header: 'Condition', render: (a) => (a.built_in ? <Badge value="draft" text="Built in" /> : <span className="text-xs">{data.rule_types[a.rule_type]?.label || a.rule_type}: {Object.values(a.rule_params).join(' · ')}</span>) },
    { key: 'pts', header: 'Reward', render: (a) => (a.reward_points ? `+${a.reward_points}` : '—') }, { key: 'earned', header: 'Earned by', render: (a) => fmtNum(a.earned_count) },
    { key: 'active', header: 'Active', render: (a) => <Toggle checked={a.active} onChange={(on) => toggle(a, on)} label={<span className="sr-only">{a.title} active</span>} /> },
    { key: 'act', header: '', render: (a) => <span className="flex gap-1"><Btn onClick={() => setEdit(a)} aria-label={`Edit ${a.title}`}><Pencil className="size-4" aria-hidden="true" /></Btn><Btn onClick={() => setEligible(a)} aria-label={`Eligible players for ${a.title}`}><Users className="size-4" aria-hidden="true" /></Btn></span> },
  ]
  return (
    <>
      <PageHeader title="Achievements" lead="Define the badges players can earn. Conditions use fixed, validated rule types and are awarded by the server from verified results, once per player." actions={<Btn kind="primary" onClick={() => setEdit({})}><Plus className="size-4" aria-hidden="true" />New achievement</Btn>} />
      {loading && !data && <Spinner />}
      {error && <><Unavailable error={error} /><ErrorState error={error} onRetry={reload} /></>}
      {data && <Card className="!p-0"><DataTable columns={columns} rows={data.items} rowKey={(a) => a.code} empty={<EmptyState title="No achievements" />} /></Card>}
      {edit && data && <Editor item={edit.code ? edit : null} meta={data} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
      {eligible && <Eligible item={eligible} onClose={() => setEligible(null)} />}
      <p className="mt-3 flex items-center gap-1 text-xs text-soft"><Eye className="size-3.5" aria-hidden="true" />Disabled achievements are hidden from players; players who already earned one keep it.</p>
    </>
  )
}
