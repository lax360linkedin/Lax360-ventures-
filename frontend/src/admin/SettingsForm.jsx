import { useState } from 'react'
import { api } from '../services/apiClient.js'
import { MediaField } from './MediaPicker.jsx'
import { Btn, Card, Field, Input, Textarea, Toggle, label, useToast } from './ui.jsx'

const ON = new Set(['chatbot_enabled', 'contact_form_enabled', 'contact_bar_enabled', 'social_band_enabled', 'social_robot_enabled']) // on unless an admin turns them off
const GROUPS = { general: 'General', global: 'Global website settings', contact: 'Contact details', social: 'Social media', contactbar: 'Top contact bar & social section', footer: 'Footer', maintenance: 'Maintenance mode', chatbot: 'Chatbot' }

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
              f.type === 'bool'
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
