import { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/apiClient.js'
import { Btn, Card, Field, Input, Modal, Select, Textarea, cx } from '../ui.jsx'

/** Everything the Play Zone admin screens share: the API helper, date filters, charts, KPI tiles and the "reason" dialog used for moderation. */
export const GAMES = [['catch-the-stars', 'Catch the Stars'], ['laxbot-jump', 'LAXBOT Jump'], ['puzzle-pop', 'Puzzle Pop'], ['bug-hunter', 'Bug Hunter']]
export const gameTitle = (slug) => GAMES.find(([s]) => s === slug)?.[1] || slug || 'All games'
const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899']

const qs = (params) => {
  const p = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined && v !== false) p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}
/** GET/POST/PATCH ... /api/admin/play-zone<path>. Bounded timeouts come from the shared API client. */
export const pz = (path, { params, ...opts } = {}) => api(`/api/admin/play-zone${path}${qs(params)}`, { timeoutMs: 20000, ...opts })
export { qs }

export const fmtNum = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString())
export const pct = (r) => (r === null || r === undefined ? '—' : `${Math.round(r * 1000) / 10}%`)

// ---- date range filter ----------------------------------------------------------------------------
export const RANGES = [['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['custom', 'Custom range']]
export function useRange(initial = '7d') {
  const [range, setRange] = useState({ range: initial, start: '', end: '' })
  const ready = range.range !== 'custom' || (range.start && range.end && range.start <= range.end)
  const params = range.range === 'custom' ? { range: 'custom', start: range.start, end: range.end } : { range: range.range }
  return { range, setRange, params, ready }
}
export function RangeFilter({ value, onChange, extra }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div role="group" aria-label="Date range" className="flex flex-wrap gap-2">
        {RANGES.map(([v, label]) => <Btn key={v} kind={value.range === v ? 'primary' : 'secondary'} aria-pressed={value.range === v} onClick={() => onChange({ ...value, range: v })}>{label}</Btn>)}
      </div>
      {value.range === 'custom' && (
        <>
          <Field label="From">{(p) => <Input {...p} type="date" value={value.start} max={value.end || undefined} onChange={(e) => onChange({ ...value, start: e.target.value })} />}</Field>
          <Field label="To">{(p) => <Input {...p} type="date" value={value.end} min={value.start || undefined} onChange={(e) => onChange({ ...value, end: e.target.value })} />}</Field>
        </>
      )}
      {extra}
    </div>
  )
}

// ---- tiles and charts -----------------------------------------------------------------------------
export function Kpi({ label, value, hint, tone }) {
  return (
    <Card className="!p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-soft">{label}</p>
      <p className={cx('mt-1 font-display text-2xl font-semibold tabular-nums', tone === 'warn' && 'text-amber-500', tone === 'bad' && 'text-error')}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-soft" title={hint}>{hint}</p>}
    </Card>
  )
}

const short = (iso) => (iso && iso.length >= 10 ? iso.slice(5) : iso)

/** Stacked bars over time (or categories). series: [{ key, label }]. A hidden table below carries the same numbers for screen readers. */
export function BarChart({ title, data, xKey = 'date', series, height = 180, empty = 'No data in this period.' }) {
  const total = (d) => series.reduce((n, s) => n + (d[s.key] || 0), 0)
  const max = Math.max(1, ...data.map(total))
  const hasData = data.some((d) => total(d) > 0)
  const w = Math.max(280, data.length * 18)
  const bar = w / Math.max(1, data.length)
  return (
    <Card>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {series.length > 1 && <ul className="mt-1 flex flex-wrap gap-3 text-xs text-soft">{series.map((s, i) => <li key={s.key} className="flex items-center gap-1"><span aria-hidden="true" className="inline-block size-2.5 rounded-sm" style={{ background: PALETTE[i % 4] }} />{s.label}</li>)}</ul>}
      {!hasData ? <p className="mt-6 text-sm text-soft" role="note">{empty}</p> : (
        <div className="mt-3 overflow-x-auto">
          <svg role="img" aria-label={title} viewBox={`0 0 ${w} ${height + 22}`} style={{ minWidth: Math.min(w, 560), width: '100%', height: height + 22 }}>
            {data.map((d, i) => {
              let y = height
              return (
                <g key={d[xKey]}>
                  <title>{`${d[xKey]}: ${series.map((s) => `${s.label} ${d[s.key] || 0}`).join(', ')}`}</title>
                  {series.map((s, si) => { const h = ((d[s.key] || 0) / max) * (height - 4); y -= h; return h > 0 ? <rect key={s.key} x={i * bar + 2} y={y} width={Math.max(2, bar - 4)} height={h} rx="2" fill={PALETTE[si % 4]} /> : null })}
                  {(data.length <= 10 || i % Math.ceil(data.length / 8) === 0) && <text x={i * bar + bar / 2} y={height + 14} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.65">{short(d[xKey])}</text>}
                </g>
              )
            })}
          </svg>
        </div>
      )}
      <table className="sr-only"><caption>{title}</caption><thead><tr><th>{xKey}</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead><tbody>{data.map((d) => <tr key={d[xKey]}><td>{d[xKey]}</td>{series.map((s) => <td key={s.key}>{d[s.key] || 0}</td>)}</tr>)}</tbody></table>
    </Card>
  )
}

export function LineChart({ title, data, xKey = 'date', yKey, height = 160, empty = 'No data in this period.' }) {
  const max = Math.max(1, ...data.map((d) => d[yKey] || 0))
  const min = Math.min(...data.map((d) => d[yKey] || 0))
  const w = 600
  const pts = data.map((d, i) => [data.length === 1 ? w / 2 : (i / (data.length - 1)) * (w - 20) + 10, height - 6 - (((d[yKey] || 0) - min) / Math.max(1, max - min)) * (height - 16)])
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <Card>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {!data.length || max === 0 ? <p className="mt-6 text-sm text-soft" role="note">{empty}</p> : (
        <svg role="img" aria-label={`${title}: from ${data[0][yKey]} to ${data[data.length - 1][yKey]}`} viewBox={`0 0 ${w} ${height + 18}`} className="mt-3 w-full">
          <path d={`${path} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`} fill="#6366f1" opacity="0.12" />
          <path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />
          {pts.map(([x, y], i) => <circle key={data[i][xKey]} cx={x} cy={y} r="3" fill="#6366f1"><title>{`${data[i][xKey]}: ${data[i][yKey]}`}</title></circle>)}
          <text x="10" y={height + 14} fontSize="10" fill="currentColor" opacity="0.65">{short(data[0][xKey])}</text>
          <text x={w - 10} y={height + 14} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.65">{short(data[data.length - 1][xKey])}</text>
        </svg>
      )}
    </Card>
  )
}

export function HBars({ title, rows, labelKey, valueKey, empty = 'No data in this period.' }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey] || 0))
  return (
    <Card>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {!rows.some((r) => r[valueKey] > 0) ? <p className="mt-6 text-sm text-soft" role="note">{empty}</p> : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((r, i) => (
            <li key={r[labelKey]} className="text-sm">
              <div className="flex justify-between gap-2"><span className="truncate">{r[labelKey]}</span><span className="tabular-nums text-soft">{fmtNum(r[valueKey])}</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-glass-strong"><div className="h-full rounded-full" style={{ width: `${(r[valueKey] / max) * 100}%`, background: PALETTE[i % 4] }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ---- a dialog that asks for a reason (moderation and other disruptive actions) -------------------------
export function ReasonDialog({ open, title, intro, confirmLabel, danger = true, busy, error, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  useEffect(() => { if (open) setReason('') }, [open])
  const ok = reason.trim().length >= 5
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind={danger ? 'danger' : 'primary'} disabled={!ok} loading={busy} onClick={() => onConfirm(reason.trim())}>{confirmLabel}</Btn></>}>
      {intro && <p className="mb-3 text-sm text-soft">{intro}</p>}
      <Field label="Reason (recorded in the moderation history and audit log)" required error={error}>{(p) => <Textarea {...p} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="At least 5 characters" />}</Field>
    </Modal>
  )
}

/** The common "this module needs the backend" states. */
export function Unavailable({ error }) {
  const down = error?.status >= 500 || ['network', 'timeout', 'backend_unavailable', 'database_not_ready'].includes(error?.code)
  if (!down) return null
  return <Card className="border-amber-500/40"><p className="font-semibold">The Play Zone data is not available right now.</p><p className="mt-1 text-sm text-soft">{error?.code === 'database_not_ready' ? 'The Play Zone database tables have not been created yet (run the migrations first). ' : ''}The rest of the admin panel is not affected. {error?.message}</p></Card>
}

export const useMemoRows = (rows, fn) => useMemo(() => fn(rows), [rows]) // eslint-disable-line react-hooks/exhaustive-deps
export { Select }
