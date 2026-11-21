import { useEffect, useState } from 'react'
import { Btn, Card, ConfirmDialog, ErrorState, Field, Input, PageHeader, Select, Spinner, Toggle, label, useFetch, useToast } from '../ui.jsx'
import { GAMES, Unavailable, gameTitle, pz } from './shared.jsx'

const SWITCHES = [
  ['enabled', 'Play Zone open', 'When off, nobody can start a new game session.'],
  ['maintenance', 'Maintenance mode', 'Shows a notice and refuses new sessions. Running rounds can finish.'],
  ['guest_play', 'Guests can play', 'When off, the games ask visitors to sign in first. Guests never earn official scores either way.'],
  ['public_leaderboard', 'Public leaderboards', 'When off, the leaderboards are hidden from the public.'],
  ['daily_challenges', 'Daily challenges', 'When off, players see no challenges and none can be claimed.'],
]

export default function PzSettings() {
  const { data, error, loading, reload } = useFetch(() => pz('/settings'))
  const toast = useToast()
  const [v, setV] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  useEffect(() => { if (data) setV({ ...data.values, avatars_enabled: [...data.values.avatars_enabled], graphics_options: [...data.values.graphics_options] }) }, [data])
  if (loading && !data) return <Spinner />
  if (error && !data) return <><Unavailable error={error} /><ErrorState error={error} onRetry={reload} /></>
  if (!v) return null
  const changed = Object.keys(v).filter((k) => JSON.stringify(v[k]) !== JSON.stringify(data.values[k]))
  const disruptive = changed.filter((k) => data.disruptive.includes(k) && ((k === 'maintenance' && v[k]) || (k !== 'maintenance' && v[k] === false)))
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val }))
  const toggleIn = (k, item) => setV((s) => ({ ...s, [k]: s[k].includes(item) ? s[k].filter((x) => x !== item) : [...s[k], item] }))
  const save = async (confirmed) => {
    setBusy(true); setErrors({})
    const values = Object.fromEntries(changed.map((k) => [k, v[k]]))
    try { const out = await pz('/settings', { method: 'PATCH', body: { values, confirm: confirmed } }); toast(out.changed.length ? 'Settings saved.' : 'Nothing changed.'); setConfirm(null); reload() } catch (e) { setErrors(e.fields || {}); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error'); setConfirm(null) } finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader title="Play Zone settings" lead="Global switches and rules. They are stored in the database and apply to the public Play Zone straight away. None of them changes how players sign in or how scores are verified." />
      <Card className="mb-4">
        <h2 className="font-display text-lg font-semibold">Availability</h2>
        <ul className="mt-3 divide-y divide-edge">{SWITCHES.map(([k, t, d]) => <li key={k} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{t}</p><p className="text-sm text-soft">{d}</p></div><Toggle checked={!!v[k]} onChange={set(k)} label={<span className="sr-only">{t}</span>} /></li>)}</ul>
        <Field label="Maintenance message" hint="Shown to players while maintenance mode is on (up to 200 characters)" className="mt-3" error={errors.maintenance_message}>{(p) => <Input {...p} maxLength={200} value={v.maintenance_message} onChange={(e) => set('maintenance_message')(e.target.value)} placeholder="The Play Zone is under maintenance. Please try again soon." />}</Field>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold">Player profile rules</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Shortest nickname" hint="3 to 10 characters" error={errors.nickname_min}>{(p) => <Input {...p} type="number" min="3" max="10" value={v.nickname_min} onChange={(e) => set('nickname_min')(Number(e.target.value))} />}</Field>
            <Field label="Longest nickname" hint="12 to 24 characters" error={errors.nickname_max}>{(p) => <Input {...p} type="number" min="12" max="24" value={v.nickname_max} onChange={(e) => set('nickname_max')(Number(e.target.value))} />}</Field>
          </div>
          <p className="mt-2 text-xs text-soft">Nicknames must be unique and cannot look like an e-mail, a phone number or a reserved name. Those rules always apply.</p>
          <fieldset className="mt-4"><legend className="text-sm font-semibold">Avatars players can choose</legend>
            <div className="mt-2 flex flex-wrap gap-3">{data.avatars.map((a) => <label key={a} className="inline-flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={v.avatars_enabled.includes(a)} onChange={() => toggleIn('avatars_enabled', a)} />{label(a)}</label>)}</div>
            {errors.avatars_enabled && <p className="mt-1 text-xs text-error">{errors.avatars_enabled}</p>}</fieldset>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold">Display</h2>
          <Field label="Featured game" hint="Highlighted in the lobby. Individual games can also be marked featured in Games." className="mt-3" error={errors.featured_game}>{(p) => <Select {...p} value={v.featured_game || ''} onChange={(e) => set('featured_game')(e.target.value || null)}><option value="">None</option>{GAMES.map(([s]) => <option key={s} value={s}>{gameTitle(s)}</option>)}</Select>}</Field>
          <fieldset className="mt-4"><legend className="text-sm font-semibold">Graphics options players can choose</legend>
            <div className="mt-2 flex flex-wrap gap-3">{data.graphics.map((g) => <label key={g} className="inline-flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={v.graphics_options.includes(g)} onChange={() => toggleIn('graphics_options', g)} />{label(g)}</label>)}</div>
            {errors.graphics_options && <p className="mt-1 text-xs text-error">{errors.graphics_options}</p>}</fieldset>
          <p className="mt-4 text-sm text-soft">Game display order is set per game in <strong>Games</strong>.</p>
        </Card>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><Btn kind="primary" disabled={!changed.length} loading={busy} onClick={() => (disruptive.length ? setConfirm(disruptive) : save(false))}>Save settings</Btn><Btn disabled={!changed.length} onClick={() => setV({ ...data.values })}>Discard changes</Btn>{changed.length > 0 && <span className="text-sm text-soft">{changed.length} unsaved {changed.length === 1 ? 'change' : 'changes'}</span>}</div>
      <p className="mt-3 text-xs text-soft">{data.note}</p>
      <ConfirmDialog open={!!confirm} title="This affects players right away" confirmLabel="Yes, apply it" busy={busy} onClose={() => setConfirm(null)} onConfirm={() => save(true)}>
        {confirm ? `You are about to change: ${confirm.map((k) => label(k)).join(', ')}. Players will notice immediately. Continue?` : ''}
      </ConfirmDialog>
    </>
  )
}
