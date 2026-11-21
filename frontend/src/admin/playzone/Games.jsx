import { useEffect, useState } from 'react'
import { ExternalLink, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, Toggle, label, useFetch, useToast } from '../ui.jsx'
import MediaSelect from './MediaSelect.jsx'
import { Unavailable, gameTitle, pz } from './shared.jsx'

const statusOf = (g) => (!g.enabled ? ['inactive', 'Disabled'] : !g.published ? ['draft', 'Unpublished'] : g.maintenance ? ['pending', 'Maintenance'] : ['active', 'Live'])

function ParamField({ name, spec, value, onChange, error }) {
  const text = label(name)
  if (spec.kind === 'bool') return <div className="pt-6"><Toggle checked={!!value} onChange={onChange} label={text} /></div>
  if (spec.kind === 'choice') return <Field label={text} error={error}>{(p) => <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>{spec.options.map((o) => <option key={o} value={o}>{label(o)}</option>)}</Select>}</Field>
  return <Field label={text} hint={`${spec.min} to ${spec.max}`} error={error}>{(p) => <Input {...p} type="number" step={spec.kind === 'float' ? '0.1' : '1'} min={spec.min} max={spec.max} value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />}</Field>
}

function Editor({ game, onClose, onSaved }) {
  const toast = useToast()
  const [v, setV] = useState(() => ({ ...game, params: { ...game.params } }))
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const versions = useFetch(() => pz(`/games/${game.game}/versions`), [game.game])
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val }))
  const save = async () => {
    setBusy(true); setErrors({})
    const body = {
      enabled: v.enabled, published: v.published, visibility: v.visibility, maintenance: v.maintenance, featured: v.featured, sort_order: Number(v.sort_order), title: v.title || null, short_description: v.short_description || null,
      instructions: v.instructions || null, thumbnail_media_id: v.thumbnail_media_id || null, banner_media_id: v.banner_media_id || null, params: v.params, ...(game.levels.length ? { disabled_levels: v.disabled_levels } : {}),
    }
    try { await pz(`/games/${game.game}`, { method: 'PATCH', body }); toast(`${gameTitle(game.game)} saved.`); onSaved() } catch (e) { setErrors(e.fields || {}); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error') } finally { setBusy(false) }
  }
  const toggleLevel = (id) => setV((s) => ({ ...s, disabled_levels: s.disabled_levels.includes(id) ? s.disabled_levels.filter((x) => x !== id) : [...s.disabled_levels, id] }))
  return (
    <Modal open onClose={onClose} wide title={`Edit ${gameTitle(game.game)}`} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={save}>Save changes</Btn></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title" hint={`Leave empty to use “${game.default_title}”`} error={errors.title}>{(p) => <Input {...p} maxLength={60} value={v.title || ''} onChange={(e) => set('title')(e.target.value)} />}</Field>
        <Field label="Display order" hint="Lower numbers first (0 to 99)" error={errors.sort_order}>{(p) => <Input {...p} type="number" min="0" max="99" value={v.sort_order} onChange={(e) => set('sort_order')(e.target.value)} />}</Field>
        <Field label="Short description" className="md:col-span-2" error={errors.short_description}>{(p) => <Input {...p} maxLength={200} value={v.short_description || ''} onChange={(e) => set('short_description')(e.target.value)} />}</Field>
        <Field label="Public instructions" className="md:col-span-2" hint="Shown to players on the game page when set (up to 2,000 characters)" error={errors.instructions}>{(p) => <Textarea {...p} maxLength={2000} value={v.instructions || ''} onChange={(e) => set('instructions')(e.target.value)} />}</Field>
        <Field label="Thumbnail" error={errors.thumbnail_media_id}>{(p) => <MediaSelect {...p} purpose="game_thumbnail" label="thumbnail" value={v.thumbnail_media_id} onChange={set('thumbnail_media_id')} />}</Field>
        <Field label="Banner" error={errors.banner_media_id}>{(p) => <MediaSelect {...p} purpose="game_banner" label="banner" value={v.banner_media_id} onChange={set('banner_media_id')} />}</Field>
      </div>
      <fieldset className="mt-5 rounded-xl border border-edge p-4"><legend className="px-1 text-sm font-semibold">Availability</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle checked={v.enabled} onChange={set('enabled')} label="Enabled (players can start new sessions)" />
          <Toggle checked={v.published} onChange={set('published')} label="Published (listed on the website)" />
          <Toggle checked={v.maintenance} onChange={set('maintenance')} label="Maintenance mode (shows a notice; no new sessions)" />
          <Toggle checked={v.featured} onChange={set('featured')} label="Featured game (only one at a time)" />
          <Field label="Visibility">{(p) => <Select {...p} value={v.visibility} onChange={(e) => set('visibility')(e.target.value)}><option value="public">Public: listed in the lobby</option><option value="hidden">Hidden: not listed (direct link still works)</option></Select>}</Field>
        </div>
      </fieldset>
      {game.levels.length > 0 && (
        <fieldset className="mt-4 rounded-xl border border-edge p-4"><legend className="px-1 text-sm font-semibold">Level availability</legend>
          <p className="mb-2 text-xs text-soft">Switch a level off to stop NEW official sessions on it. Verification and unlock rules are unchanged.</p>
          <div className="flex flex-wrap gap-2">{game.levels.map((id) => <label key={id} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-edge px-2.5 py-1.5 text-xs"><input type="checkbox" checked={!v.disabled_levels.includes(id)} onChange={() => toggleLevel(id)} />{id}</label>)}</div>
          {errors.disabled_levels && <p className="mt-1 text-xs text-error">{errors.disabled_levels}</p>}
        </fieldset>
      )}
      <fieldset className="mt-4 rounded-xl border border-edge p-4"><legend className="px-1 text-sm font-semibold">Gameplay profile (version {game.config_version})</legend>
        <p className="mb-3 text-xs text-soft">Values are validated against safe ranges and versioned: every session records the version it started under. A profile only describes the game; it can never relax the server&apos;s score checks. The shipped game clients use their built-in values until a client release applies a profile.</p>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">{Object.entries(game.param_schema).map(([k, spec]) => <ParamField key={k} name={k} spec={spec} value={v.params[k]} error={errors[k]} onChange={(val) => setV((s) => ({ ...s, params: { ...s.params, [k]: val } }))} />)}</div>
        {versions.data?.items?.length > 0 && <details className="mt-3 text-xs text-soft"><summary className="cursor-pointer font-semibold">Version history</summary><ul className="mt-1 space-y-1">{versions.data.items.map((x) => <li key={x.version}>v{x.version} · {new Date(x.at).toLocaleString()} · <code>{JSON.stringify(x.params)}</code></li>)}</ul></details>}
      </fieldset>
    </Modal>
  )
}

export default function Games() {
  const { data, error, loading, reload } = useFetch(() => pz('/games'))
  const toast = useToast()
  const [edit, setEdit] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { document.title = 'Play Zone games | Admin' }, [])
  const quick = async (g, patch, ok) => {
    setBusy(true)
    try { await pz(`/games/${g.game}`, { method: 'PATCH', body: patch }); toast(ok); setConfirm(null); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader title="Games" lead="Switch games on and off, set their title, text, pictures and order, and tune each game's profile. Saved through the backend; nothing here can bypass server-side score validation." />
      {loading && !data && <Spinner />}
      {error && <><Unavailable error={error} /><ErrorState error={error} onRetry={reload} /></>}
      {data && (
        <>
          <Card className="mb-4 text-sm text-soft"><strong className="text-fg">What happens when a game is switched off?</strong> {data.policy}</Card>
          {data.items.length === 0 ? <EmptyState title="No games" /> : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.items.map((g) => {
                const [tone, text] = statusOf(g)
                return (
                  <Card key={g.game} className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      {g.thumbnail_url ? <img src={g.thumbnail_url} alt="" loading="lazy" className="size-20 shrink-0 rounded-xl border border-edge object-cover" /> : <span className="grid size-20 shrink-0 place-items-center rounded-xl border border-dashed border-edge text-xs text-soft">No image</span>}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-semibold">{g.title || g.default_title}</h2><Badge value={tone} text={text} />{g.featured && <Badge value="scheduled" text="Featured" />}{g.visibility === 'hidden' && <Badge value="draft" text="Hidden" />}</div>
                        <p className="mt-0.5 text-sm text-soft">{g.short_description || 'No short description set.'}</p>
                        <p className="mt-1 text-xs text-soft">Order {g.sort_order} · profile v{g.config_version}{g.disabled_levels.length ? ` · ${g.disabled_levels.length} level(s) off` : ''}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-edge pt-3">
                      <Toggle checked={g.enabled} label="Enabled" onChange={(on) => (on ? quick(g, { enabled: true }, `${gameTitle(g.game)} enabled.`) : setConfirm({ g, patch: { enabled: false }, title: `Disable ${gameTitle(g.game)}?`, text: 'Players will not be able to start new official sessions. Rounds that already started can still be finished.', ok: `${gameTitle(g.game)} disabled.` }))} />
                      <Toggle checked={g.published} label="Published" onChange={(on) => quick(g, { published: on }, on ? 'Published.' : 'Unpublished.')} />
                      <span className="ml-auto flex gap-2">
                        <Link to={`/play-zone/${g.game}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm text-soft hover:text-fg" aria-label={`Open ${gameTitle(g.game)} on the website`}><ExternalLink className="size-4" aria-hidden="true" />View</Link>
                        <Btn onClick={() => setEdit(g)}><Pencil className="size-4" aria-hidden="true" />Edit</Btn>
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
      {edit && <Editor game={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
      <ConfirmDialog open={!!confirm} title={confirm?.title} confirmLabel="Disable" busy={busy} onClose={() => setConfirm(null)} onConfirm={() => quick(confirm.g, confirm.patch, confirm.ok)}>{confirm?.text}</ConfirmDialog>
    </>
  )
}
