import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { THEME_PRESETS, PRESET_GROUPS } from '../data/themePresets.js'
import { autoDark, isHex, themeWarnings } from '../utils/themeEngine.js'
import { Btn } from './ui.jsx'

// Theme builder (Super Admin): create / edit / duplicate / rename / delete custom themes, with colour pickers and HEX codes, a Light and a Dark appearance, a readability check
// and a live preview of the real website. The themes are saved with the other settings (the form's Save button); the website builds their CSS in the browser (utils/themeEngine.js).

const FIELD_GROUPS = [
  { title: 'Brand colours', fields: [['primary', 'Primary', 'Buttons, links, highlights'], ['secondary', 'Secondary', 'Second brand colour (gradient ends, badges)'], ['accent', 'Accent', 'Decorative highlights']] },
  { title: 'Backgrounds', fields: [['bg', 'Page background', 'Required'], ['surface', 'Section background', 'Alternate sections'], ['card', 'Card background', 'Panels and cards'], ['border', 'Border colour', 'Lines around cards and inputs']] },
  { title: 'Text', fields: [['text', 'Text colour', 'Body text'], ['heading', 'Heading colour', 'h1 – h4 (leave empty to use the text colour)']] },
  { title: 'Header, footer & navigation', fields: [['header', 'Header background', ''], ['footer', 'Footer background', ''], ['nav', 'Navigation links', ''], ['active', 'Active link', 'The current page in the menu'], ['hover', 'Hover state', 'Button hover colour']] },
  { title: 'Buttons & icons', fields: [['button', 'Button colour', 'Empty = derived from the primary colour'], ['buttonText', 'Button text', 'Default white'], ['icon', 'Icon colour', 'Line art and icons']] },
  { title: 'Gradient', fields: [['gradA', 'Gradient start', ''], ['gradB', 'Gradient middle', ''], ['gradC', 'Gradient end', '']] },
]
const REQUIRED = new Set(['bg', 'primary'])
const PREVIEW_PAGES = [['/services', 'Services'], ['/about', 'About'], ['/contact', 'Contact'], ['/our-network', 'Our Network'], ['/partner-with-us', 'Partner With Us']]
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28) || 'theme'
const newId = (name, taken) => { let id; do { id = `custom-${slug(name)}-${Math.random().toString(36).slice(2, 6)}` } while (taken.has(id)); return id }
const blank = () => ({ name: 'My theme', mode: 'both', gradient: false, note: '', colors: { primary: '#2563eb', bg: '#ffffff' }, darkColors: {} })

/** A colour picker + HEX box. An empty value (optional fields) means "derive it". */
function ColorField({ id, label, hint, value, onChange, required, placeholder }) {
  const [text, setText] = useState(value || '')
  useEffect(() => setText(value || ''), [value])
  const valid = !text || isHex(text)
  return (
    <div className="flex items-center gap-2">
      <input type="color" aria-label={`${label} colour picker`} value={isHex(value) ? value : isHex(placeholder) ? placeholder : '#888888'} onChange={(e) => onChange(e.target.value)} className="size-10 shrink-0 cursor-pointer rounded-lg border border-edge-strong bg-transparent p-0.5" />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-xs font-semibold">{label}{required && <span className="text-error"> *</span>}</label>
        <input id={id} value={text} placeholder={isHex(placeholder) ? `auto ${placeholder}` : 'auto'} spellCheck={false} maxLength={7} aria-invalid={!valid}
          onChange={(e) => { const v = e.target.value.trim(); setText(v); if (isHex(v)) onChange(v.toLowerCase()); else if (v === '' && !required) onChange('') }}
          className={`h-8 w-full rounded-md border bg-transparent px-2 font-mono text-xs uppercase ${valid ? 'border-edge' : 'border-error'}`} />
        {hint && <span className="block truncate text-[0.68rem] text-soft">{hint}</span>}
      </div>
      {!required && value && <button type="button" onClick={() => onChange('')} aria-label={`Clear ${label}`} className="grid size-7 shrink-0 place-items-center rounded-full text-soft hover:text-fg"><X className="size-3.5" aria-hidden="true" /></button>}
    </div>
  )
}

/** A mini mock of a themed page, drawn from the theme's own colours (used on the theme cards; the live preview shows the real website). */
export function ThemeSwatch({ def, dark = false, className = '' }) {
  const c = dark ? { ...autoDark(def.colors || {}), ...(def.mode === 'dark' ? def.colors : {}), ...(def.darkColors || {}) } : def.colors || {}
  const bg = c.bg || (dark ? '#0b0e14' : '#ffffff'), text = c.text || (dark ? '#f1f5f9' : '#1f2937'), p = c.primary || c.accent || '#2563eb', s = c.secondary || p
  const surface = c.surface || (dark ? '#161a22' : '#f3f4f6')
  return (
    <span aria-hidden="true" className={`block overflow-hidden rounded-lg border border-edge-strong ${className}`} style={{ background: bg }}>
      <span className="flex h-3 items-center gap-1 px-1.5" style={{ background: c.header || surface }}><span className="h-1 w-4 rounded-full" style={{ background: p }} /><span className="ml-auto h-1 w-6 rounded-full" style={{ background: c.nav || text, opacity: 0.5 }} /></span>
      <span className="block px-2 pb-2 pt-1.5">
        <span className="block h-1.5 w-3/4 rounded-full" style={{ background: c.heading || text }} />
        <span className="mt-1 block h-1 w-1/2 rounded-full" style={{ background: text, opacity: 0.45 }} />
        <span className="mt-2 flex items-center gap-1.5">
          <span className="h-3 w-9 rounded-full" style={{ background: c.button || p }} />
          <span className="h-3 w-5 rounded-full" style={{ background: `linear-gradient(90deg, ${c.gradA || p}, ${c.gradC || s})` }} />
          <span className="h-3 flex-1 rounded-md" style={{ background: c.card || surface, border: `1px solid ${c.border || p}33` }} />
        </span>
      </span>
    </span>
  )
}

export default function ThemeBuilder({ themes, onChange, activeId, savedActiveId, onUse, onPreviewTheme, onStopPreview }) {
  const [editingId, setEditingId] = useState('')
  const [tab, setTab] = useState('light')
  const [renaming, setRenaming] = useState('')
  const [page, setPage] = useState('/services')
  const [ready, setReady] = useState(false)
  const frame = useRef(null)
  const editing = themes.find((t) => t.id === editingId) || null
  const taken = useMemo(() => new Set(themes.map((t) => t.id)), [themes])

  const update = (id, patch) => onChange(themes.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const setColor = (key, value) => {
    const field = tab === 'dark' && editing.mode === 'both' ? 'darkColors' : 'colors'
    const next = { ...(editing[field] || {}) }
    if (value) next[key] = value; else delete next[key]
    update(editing.id, { [field]: next })
  }
  const create = (from) => {
    const base = from ? { name: `${from.name} copy`, mode: from.mode, gradient: from.gradient, note: '', colors: { ...from.colors }, darkColors: { ...(from.darkColors || {}) } } : blank()
    const t = { id: newId(base.name, taken), ...base }
    onChange([...themes, t]); setEditingId(t.id); setTab('light')
  }
  const remove = (t) => {
    if (t.id === activeId || t.id === savedActiveId) return
    if (!window.confirm(`Delete the custom theme “${t.name}”? This cannot be undone once you save.`)) return
    onChange(themes.filter((x) => x.id !== t.id)); if (editingId === t.id) setEditingId('')
  }

  // Live preview: the real website in an iframe, sent the theme being edited on every change.
  const send = () => {
    if (!editing || !frame.current?.contentWindow) return
    frame.current.contentWindow.postMessage({ type: 'lax360-theme-preview', def: editing, mode: tab === 'dark' ? 'dark' : 'light' }, window.location.origin)
  }
  useEffect(() => { send() }, [editing, tab, ready, page]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setReady(false) }, [page, editingId])
  useEffect(() => { if (editing?.mode === 'light') setTab('light'); if (editing?.mode === 'dark') setTab('dark') }, [editing?.mode, editingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const warnings = editing ? themeWarnings(editing) : []
  const values = editing ? (tab === 'dark' && editing.mode === 'both' ? editing.darkColors || {} : tab === 'dark' ? editing.colors || {} : editing.colors || {}) : {}
  const auto = editing && tab === 'dark' && editing.mode === 'both' ? autoDark(editing.colors || {}) : {}

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Your custom themes <span className="font-normal text-soft">({themes.length}/40)</span></h3>
          <p className="text-xs text-soft">Build any colour combination. Changes go live for every visitor only when you press <strong>Save</strong> at the bottom of the page and the theme is chosen as the website theme.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn kind="primary" onClick={() => create(null)} disabled={themes.length >= 40}><Plus className="size-4" aria-hidden="true" />Create custom theme</Btn>
          <label className="sr-only" htmlFor="tb-start">Start a new theme from a preset</label>
          <select id="tb-start" value="" onChange={(e) => { const p = THEME_PRESETS.find((x) => x.id === e.target.value); if (p) create(p) }} className="h-10 rounded-full border border-edge-strong bg-transparent px-3 text-sm">
            <option value="">Start from a preset…</option>
            {PRESET_GROUPS.map((g) => <optgroup key={g.id} label={g.label}>{THEME_PRESETS.filter((p) => p.group === g.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>)}
          </select>
        </div>
      </div>

      {themes.length === 0 && <p className="rounded-xl border border-dashed border-edge-strong p-6 text-center text-sm text-soft">No custom themes yet. Create one, or start from a preset and change any colour.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {themes.map((t) => {
          const isActive = t.id === savedActiveId
          return (
            <li key={t.id} className={`flex flex-col gap-2 rounded-xl border p-3 ${t.id === editingId ? 'border-primary bg-glass-strong' : 'border-edge'}`}>
              <div className="flex items-start gap-3">
                <ThemeSwatch def={t} className="w-20 shrink-0" />
                <div className="min-w-0 flex-1">
                  {renaming === t.id
                    ? <input autoFocus aria-label="Theme name" defaultValue={t.name} maxLength={60} onBlur={(e) => { const v = e.target.value.trim(); if (v) update(t.id, { name: v }); setRenaming('') }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenaming('') }} className="h-8 w-full rounded-md border border-edge-strong bg-transparent px-2 text-sm" />
                    : <span className="block truncate text-sm font-semibold">{t.name}</span>}
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.7rem] text-soft">
                    <span className="rounded-full border border-edge px-1.5 py-0.5">{t.mode === 'both' ? 'Light + Dark' : t.mode === 'dark' ? 'Dark' : 'Light'}</span>
                    {isActive && <span className="inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 font-semibold text-white"><Check className="size-3" aria-hidden="true" />Active</span>}
                    {t.id === activeId && !isActive && <span className="rounded-full border border-lav px-1.5 py-0.5 text-lav">Selected (not saved)</span>}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Btn onClick={() => { setEditingId(t.id === editingId ? '' : t.id); setTab('light') }} className="!min-h-8 !px-3 !text-xs"><Pencil className="size-3.5" aria-hidden="true" />{t.id === editingId ? 'Close' : 'Edit'}</Btn>
                <Btn onClick={() => create(t)} className="!min-h-8 !px-3 !text-xs"><Copy className="size-3.5" aria-hidden="true" />Duplicate</Btn>
                <Btn onClick={() => setRenaming(t.id)} className="!min-h-8 !px-3 !text-xs">Rename</Btn>
                <Btn onClick={() => remove(t)} disabled={t.id === activeId || t.id === savedActiveId} title={t.id === activeId || t.id === savedActiveId ? 'The theme in use cannot be deleted. Choose another website theme first.' : undefined} className="!min-h-8 !px-3 !text-xs"><Trash2 className="size-3.5" aria-hidden="true" />Delete</Btn>
                <Btn kind={t.id === activeId ? 'secondary' : 'primary'} onClick={() => onUse(t.id)} disabled={t.id === activeId} className="!min-h-8 !px-3 !text-xs">{t.id === activeId ? 'Chosen' : 'Use as website theme'}</Btn>
              </div>
            </li>
          )
        })}
      </ul>

      {editing && (
        <div className="grid gap-5 rounded-2xl border border-edge-strong p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[10rem] flex-1 text-xs font-semibold">Theme name
                <input value={editing.name} maxLength={60} onChange={(e) => update(editing.id, { name: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-edge-strong bg-transparent px-3 text-sm" />
              </label>
              <label className="text-xs font-semibold">Appearance
                <select value={editing.mode} onChange={(e) => update(editing.id, { mode: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-edge-strong bg-transparent px-3 text-sm">
                  <option value="both">Light and Dark (visitors can switch)</option>
                  <option value="light">Light only</option>
                  <option value="dark">Dark only</option>
                </select>
              </label>
              <label className="flex h-10 items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={editing.gradient} onChange={(e) => update(editing.id, { gradient: e.target.checked })} />Gradient background</label>
            </div>
            {editing.mode === 'both' && (
              <div role="tablist" aria-label="Appearance being edited" className="inline-flex rounded-full border border-edge-strong p-0.5 text-xs font-semibold">
                {[['light', 'Light colours'], ['dark', 'Dark colours']].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1.5 ${tab === k ? 'bg-primary text-white' : 'text-soft hover:text-fg'}`}>{l}</button>)}
              </div>
            )}
            {editing.mode === 'both' && tab === 'dark' && <p className="text-xs text-soft">The dark colours are made from the light ones automatically. Set a colour here only to override it (grey “auto” values show what is used now).</p>}
            {FIELD_GROUPS.map((g) => (
              <fieldset key={g.title} className="rounded-xl border border-edge p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-soft">{g.title}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {g.fields.map(([key, label, hint]) => <ColorField key={`${editing.id}-${tab}-${key}`} id={`tb-${key}`} label={label} hint={hint} value={values[key] || ''} placeholder={auto[key] || ''} required={REQUIRED.has(key) && !(tab === 'dark' && editing.mode === 'both')} onChange={(v) => setColor(key, v)} />)}
                </div>
              </fieldset>
            ))}
            {warnings.length > 0
              ? <ul role="status" className="space-y-1 rounded-lg border border-error/60 bg-glass p-3 text-xs">{warnings.map((w) => <li key={w}>⚠ {w}</li>)}</ul>
              : <p role="status" className="rounded-lg border border-edge bg-glass p-3 text-xs">✓ Text, buttons and navigation meet the readable-contrast guideline (4.5:1) in the checked appearance(s).</p>}
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => update(editing.id, { colors: { primary: '#2563eb', bg: '#ffffff' }, darkColors: {}, gradient: false })}><RotateCcw className="size-4" aria-hidden="true" />Reset colours</Btn>
              <Btn onClick={() => onPreviewTheme(editing, tab)}>Preview on this admin page</Btn>
              <Btn onClick={onStopPreview}>Stop previewing</Btn>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Live website preview</h4>
              <label className="text-xs">Page <select value={page} onChange={(e) => setPage(e.target.value)} className="ml-1 h-8 rounded-md border border-edge-strong bg-transparent px-2 text-xs">{PREVIEW_PAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            </div>
            <div className="overflow-hidden rounded-xl border border-edge-strong bg-night">
              <iframe ref={frame} key={`${page}-${editingId}`} title="Live preview of the website with this theme" src={`${page}?themepreview=1`} onLoad={() => { setReady(true); setTimeout(send, 300) }} className="h-[34rem] w-full" loading="lazy" />
            </div>
            <p className="text-xs text-soft">This is the real public website, coloured live as you edit. Nothing is saved until you press Save.</p>
          </div>
        </div>
      )}
    </div>
  )
}
