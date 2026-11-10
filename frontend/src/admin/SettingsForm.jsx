import { useEffect, useState } from 'react'
import { api } from '../services/apiClient.js'
import { BUILT_IN_THEMES, PALETTE_THEMES, THEME_CATEGORIES } from '../data/themes.js'
import { endPreview, previewTheme } from '../hooks/useTheme.js'
import { MediaField } from './MediaPicker.jsx'
import { Btn, Card, Field, Input, Textarea, Toggle, label, useToast } from './ui.jsx'

const ON = new Set(['chatbot_enabled', 'contact_form_enabled', 'contact_bar_enabled', 'social_band_enabled', 'social_robot_enabled']) // on unless an admin turns them off
const GROUPS = { appearance: 'Appearance', general: 'General', global: 'Global website settings', contact: 'Contact details', social: 'Social media', contactbar: 'Top contact bar & social section', footer: 'Footer', maintenance: 'Maintenance mode', chatbot: 'Chatbot' }

// The website themes the Super Admin can choose (data/themes.js): standard themes first, then the colour themes by category.
const ALL_CHOICES = [...BUILT_IN_THEMES.map((t) => ({ ...t, colors: t.colors })), ...PALETTE_THEMES.map((t) => ({ ...t, colors: t.accent2 ? [t.bg, t.text, t.accent, t.accent2, t.surface] : [t.bg, t.text || '#222222', t.accent] }))]
const swatch = (colors) => ({ background: colors[0], '--sw-text': colors[1], '--sw-accent': colors[2] })

function ThemeCard({ t, selected, previewing, onSelect, onPreview, name }) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-3 transition-colors ${selected ? 'border-primary bg-glass-strong' : previewing ? 'border-lav' : 'border-edge hover:border-edge-strong'}`}>
      <label className="flex cursor-pointer items-start gap-3 focus-within:outline focus-within:outline-2 focus-within:outline-lav">
        <input type="radio" name={name} value={t.id} checked={selected} onChange={() => onSelect(t.id)} className="sr-only" />
        <span aria-hidden="true" className="mt-0.5 flex h-11 w-16 shrink-0 flex-col justify-between overflow-hidden rounded-md border border-edge-strong p-1.5" style={swatch(t.colors)}>
          <span className="h-1 w-9 rounded-full" style={{ background: t.colors[1] }} />
          <span className="flex gap-1"><span className="h-2.5 w-7 rounded-full" style={{ background: t.colors[2] }} />{t.colors[3] && t.id !== 'visitor' && PALETTE_THEMES.some((p) => p.id === t.id && p.accent2) && <span className="h-2.5 w-4 rounded-full" style={{ background: t.colors[3] }} />}</span>
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{t.name}{selected && <span className="ml-2 text-xs font-medium text-lav">Selected</span>}</span>
          <span className="block text-xs text-soft">{t.note}</span>
          <span className="mt-1 flex flex-wrap gap-x-2 text-[0.7rem] text-soft">{t.colors.map((c, i) => <span key={i} className="inline-flex items-center gap-1"><span aria-hidden="true" className="size-2.5 rounded-full border border-edge-strong" style={{ background: c }} />{c.toUpperCase()}</span>)}</span>
        </span>
      </label>
      {t.id !== 'visitor' && (
        <button type="button" onClick={() => onPreview(t.id)} aria-pressed={previewing} className="inline-flex min-h-9 items-center justify-center rounded-full border border-edge-strong px-3 text-xs font-semibold transition-colors hover:border-lav">
          {previewing ? 'Previewing' : 'Preview'}
        </button>
      )}
    </div>
  )
}

/**
 * Website theme picker: every theme with its name and colours, grouped by category. “Preview” shows a theme on this page (the admin panel itself) without saving
 * anything; choosing a theme and pressing Save changes the whole public website for every visitor. Leaving the page ends a preview.
 */
function ThemePicker({ field, value, onChange, error }) {
  const current = value || 'visitor'
  const [previewing, setPreviewing] = useState('')
  useEffect(() => () => endPreview(), [])
  const preview = (id) => { if (previewing === id) { endPreview(); setPreviewing('') } else { previewTheme(id); setPreviewing(id) } }
  const allowed = new Set(field.options || [])
  return (
    <fieldset className="md:col-span-2">
      <legend className="mb-1 text-sm font-semibold">{field.label}</legend>
      {field.help && <p className="mb-3 text-xs text-soft">{field.help}</p>}
      {previewing && (
        <p role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-lav bg-glass px-3 py-2 text-sm">
          Previewing <strong>{ALL_CHOICES.find((t) => t.id === previewing)?.name}</strong> on this page. Nothing has been saved.
          <button type="button" className="font-semibold text-lav hover:underline" onClick={() => { onChange(previewing); endPreview(); setPreviewing('') }}>Use this theme</button>
          <button type="button" className="font-semibold text-lav hover:underline" onClick={() => { endPreview(); setPreviewing('') }}>Stop previewing</button>
        </p>
      )}
      <div className="space-y-6">
        {THEME_CATEGORIES.map((cat) => {
          const list = ALL_CHOICES.filter((t) => t.category === cat.id && allowed.has(t.id))
          return list.length === 0 ? null : (
            <div key={cat.id}>
              <h3 className="mb-2 text-sm font-semibold">{cat.label} <span className="font-normal text-soft">({list.length})</span></h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((t) => <ThemeCard key={t.id} t={t} name={field.key} selected={current === t.id} previewing={previewing === t.id} onSelect={onChange} onPreview={preview} />)}
              </div>
            </div>
          )
        })}
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-error">{error}</p>}
    </fieldset>
  )
}

/** Generic settings editor driven by the field list the server sends (labels, types, limits). Blank text = “use the website default”. */
export default function SettingsForm({ endpoint, payload, onSaved, groups }) {
  const toast = useToast()
  const [draft, setDraft] = useState(() => ({ ...payload.values }))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const fields = payload.fields.filter((f) => !groups || groups.includes(f.group))
  const get = (f) => (f.type === 'bool' ? (draft[f.key] ?? ON.has(f.key)) : (draft[f.key] ?? ''))
  const dirty = fields.some((f) => get(f) !== (f.type === 'bool' ? (payload.values[f.key] ?? ON.has(f.key)) : (payload.values[f.key] ?? '')))

  const save = async (e) => {
    e.preventDefault()
    const values = {}
    fields.forEach((f) => { const now = get(f); const before = f.type === 'bool' ? (payload.values[f.key] ?? ON.has(f.key)) : (payload.values[f.key] ?? ''); if (now !== before) values[f.key] = now })
    if (!Object.keys(values).length) return
    setBusy(true)
    setErrors({})
    try { const next = await api(endpoint, { method: 'PUT', body: { values } }); toast('Settings saved'); setDraft({ ...next.values }); onSaved(next) } catch (err) { setErrors(err.fields || {}); toast(err.fields ? 'Please fix the highlighted fields.' : err.message, 'error') } finally { setBusy(false) }
  }
  const byGroup = [...new Set(fields.map((f) => f.group))]
  return (
    <form onSubmit={save} className="space-y-4" noValidate>
      {byGroup.map((g) => (
        <Card key={g}>
          <h2 className="mb-4 font-display text-lg font-semibold">{GROUPS[g] || label(g)}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.filter((f) => f.group === g).map((f) => (
              f.type === 'choice'
                ? <ThemePicker key={f.key} field={f} value={get(f)} error={errors[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
                : f.type === 'bool'
                ? <div key={f.key} className="flex flex-col justify-center gap-1"><Toggle checked={get(f)} onChange={(v) => setDraft({ ...draft, [f.key]: v })} label={f.label} />{f.help && <p className="text-xs text-soft">{f.help}</p>}{errors[f.key] && <p role="alert" className="text-xs font-medium text-error">{errors[f.key]}</p>}</div>
                : (
                  <Field key={f.key} label={f.label} hint={f.help} error={errors[f.key]} className={f.type === 'text' ? 'md:col-span-2' : ''}>
                    {(p) => (f.type === 'image'
                      ? <MediaField {...p} kind="image" value={get(f)} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
                      : f.type === 'text'
                      ? <Textarea {...p} maxLength={f.max} value={get(f)} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                      : <Input {...p} type={f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'} maxLength={f.max} value={get(f)} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />)}
                  </Field>
                )
            ))}
          </div>
        </Card>
      ))}
      <div className="sticky bottom-0 flex items-center justify-end gap-3 rounded-xl border border-edge bg-night/90 p-3 backdrop-blur">
        <span className="text-sm text-soft">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
        <Btn kind="primary" type="submit" loading={busy} disabled={!dirty}>Save changes</Btn>
      </div>
    </form>
  )
}
