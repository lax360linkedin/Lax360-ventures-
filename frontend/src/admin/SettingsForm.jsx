import { useState } from 'react'
import { api } from '../services/apiClient.js'
import { MediaField } from './MediaPicker.jsx'
import { Btn, Card, Field, Input, Textarea, Toggle, label, useToast } from './ui.jsx'

const ON = new Set(['chatbot_enabled', 'contact_form_enabled', 'contact_bar_enabled', 'social_band_enabled', 'social_robot_enabled']) // on unless an admin turns them off
const GROUPS = { appearance: 'Appearance', general: 'General', global: 'Global website settings', contact: 'Contact details', social: 'Social media', contactbar: 'Top contact bar & social section', footer: 'Footer', maintenance: 'Maintenance mode', chatbot: 'Chatbot' }

// Website themes the Super Admin can choose: label, short description and preview colours (page, text, accent).
const THEME_CHOICES = {
  visitor: { label: 'Visitor choice', text: 'Dark by default; visitors switch Dark / Light themselves.', colors: ['#0a0c10', '#f1f5f9', '#38bdf8'] },
  dark: { label: 'Dark', text: 'Black / graphite with sky blue.', colors: ['#0a0c10', '#f1f5f9', '#38bdf8'] },
  light: { label: 'Light', text: 'The original white and violet theme.', colors: ['#ffffff', '#1a1033', '#7c3aed'] },
  snow: { label: 'Snow White + Slate Grey', text: 'Minimal, Apple-style.', colors: ['#fafafa', '#1d2330', '#475569'] },
  rose: { label: 'White + Dusty Rose', text: 'Soft and elegant.', colors: ['#fffbfb', '#3a2328', '#a8556a'] },
  sage: { label: 'White + Sage Green', text: 'Natural and premium.', colors: ['#fbfdfa', '#1f2d24', '#4a7c59'] },
}

function ThemePicker({ field, value, onChange, error }) {
  const current = value || 'visitor'
  return (
    <fieldset className="md:col-span-2">
      <legend className="mb-1 text-sm font-semibold">{field.label}</legend>
      {field.help && <p className="mb-3 text-xs text-soft">{field.help}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(field.options || []).map((o) => {
          const t = THEME_CHOICES[o] || { label: o, text: '', colors: ['#fff', '#000', '#888'] }
          const on = current === o
          return (
            <label key={o} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-lav ${on ? 'border-primary bg-glass-strong' : 'border-edge hover:border-edge-strong'}`}>
              <input type="radio" name={field.key} value={o} checked={on} onChange={() => onChange(o)} className="sr-only" />
              <span aria-hidden="true" className="mt-0.5 flex h-10 w-14 shrink-0 flex-col justify-between overflow-hidden rounded-md border border-edge-strong p-1.5" style={{ background: t.colors[0] }}>
                <span className="h-1 w-8 rounded-full" style={{ background: t.colors[1] }} />
                <span className="h-2 w-6 rounded-full" style={{ background: t.colors[2] }} />
              </span>
              <span className="min-w-0"><span className="block text-sm font-semibold">{t.label}{on && <span className="ml-2 text-xs font-medium text-lav">Selected</span>}</span><span className="block text-xs text-soft">{t.text}</span></span>
            </label>
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
