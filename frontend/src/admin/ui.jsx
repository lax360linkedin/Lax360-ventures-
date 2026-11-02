import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Inbox, Loader2, X } from 'lucide-react'

/** Small design system for the admin panel: built on the site's tokens so dark/light mode just works. */
export const cx = (...a) => a.filter(Boolean).join(' ')

const btnBase = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lav'
const btnKinds = {
  primary: 'bg-primary text-white hover:bg-[#8b4df0]',
  secondary: 'border border-edge-strong bg-glass text-fg hover:border-lav hover:bg-glass-strong',
  danger: 'bg-error/15 text-error border border-error/40 hover:bg-error/25',
  ghost: 'text-soft hover:bg-glass-strong hover:text-fg',
}
export function Btn({ kind = 'secondary', loading = false, className = '', children, ...rest }) {
  return (
    <button type="button" className={cx(btnBase, btnKinds[kind], className)} disabled={loading || rest.disabled} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

export const Card = ({ className = '', children, ...rest }) => <section className={cx('rounded-2xl border border-edge bg-glass p-5 backdrop-blur', className)} {...rest}>{children}</section>

export function PageHeader({ title, lead, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {lead && <p className="mt-1 max-w-2xl text-sm text-soft">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return <div role="status" className="flex items-center gap-2 py-10 text-soft"><Loader2 className="size-5 animate-spin" aria-hidden="true" /> {label}</div>
}
export const EmptyState = ({ title = 'Nothing here yet', children }) => (
  <div className="flex flex-col items-center gap-2 py-12 text-center text-soft"><Inbox className="size-8" aria-hidden="true" /><p className="font-semibold text-fg">{title}</p>{children && <p className="max-w-sm text-sm">{children}</p>}</div>
)
/** What kind of failure is this? (the server's own message is always shown too) */
export function describeError(error) {
  const s = error?.status
  if (s === 401) return 'Not signed in'
  if (s === 403) return 'You do not have permission'
  if (s === 404) return 'Not found'
  if (s === 409 || s === 422) return 'The request was not accepted'
  if (s === 429) return 'Too many requests'
  if (s >= 500) return 'Server problem'
  if (error?.code === 'timeout') return 'The server took too long to answer'
  if (error?.code === 'network' || s === 0) return 'Cannot reach the server'
  return 'Something went wrong'
}

export function ErrorState({ error, onRetry }) {
  const retryable = !(error?.status === 401 || error?.status === 403)
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-error/40 bg-error/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold text-error"><AlertCircle className="size-4" aria-hidden="true" /> {describeError(error)}</p>
      {error?.message && <p className="text-soft">{error.message}</p>}
      {onRetry && retryable && <Btn onClick={onRetry}>Try again</Btn>}
    </div>
  )
}

const BADGES = {
  new: 'bg-sky/15 text-sky', in_progress: 'bg-amber-500/15 text-amber-500', contacted: 'bg-lav/20 text-lav', converted: 'bg-success/15 text-success', closed: 'bg-glass-strong text-soft',
  pending: 'bg-amber-500/15 text-amber-500', confirmed: 'bg-success/15 text-success', cancelled: 'bg-glass-strong text-soft',
  published: 'bg-success/15 text-success', draft: 'bg-glass-strong text-soft', success: 'bg-success/15 text-success', failure: 'bg-error/15 text-error',
  connected: 'bg-success/15 text-success', unavailable: 'bg-error/15 text-error', configuration_missing: 'bg-amber-500/15 text-amber-500', not_tested: 'bg-glass-strong text-soft', not_implemented: 'bg-glass-strong text-soft',
  playing: 'bg-success/15 text-success', next: 'bg-sky/15 text-sky', scheduled: 'bg-lav/20 text-lav', missing_file: 'bg-error/15 text-error',
  super_admin: 'bg-accent/20 text-lav', admin: 'bg-sky/15 text-sky', active: 'bg-success/15 text-success', inactive: 'bg-error/15 text-error',
}
export const label = (s) => String(s || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
export const Badge = ({ value, text }) => <span className={cx('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', BADGES[value] || 'bg-glass-strong text-soft')}>{text || label(value)}</span>

// ---- forms ----------------------------------------------------------------------------------------
const fieldCls = 'w-full rounded-lg border border-edge bg-glass px-3 text-sm text-fg placeholder:text-soft/70 focus:border-lav focus:outline-none focus-visible:outline-2 focus-visible:outline-lav'
export function Field({ label: text, hint, error, required, children, className = '' }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{text}{required && <span aria-hidden="true" className="text-accent"> *</span>}</label>
      {typeof children === 'function' ? children({ id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': error ? `${id}-e` : undefined }) : children}
      {hint && !error && <p className="mt-1 text-xs text-soft">{hint}</p>}
      {error && <p id={`${id}-e`} className="mt-1 flex items-start gap-1 text-xs font-medium text-error"><AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {error}</p>}
    </div>
  )
}
// A caller's className is ADDED to the base field styling (it must never replace it, or the control becomes invisible).
export const Input = ({ className, ...p }) => <input className={cx(fieldCls, 'h-10', className)} {...p} />
export const Textarea = ({ className, ...p }) => <textarea className={cx(fieldCls, 'min-h-24 py-2', className)} {...p} />
export const Select = ({ children, className, ...p }) => <select className={cx(fieldCls, 'h-10', className)} {...p}>{children}</select>
export function Toggle({ checked, onChange, label: text, disabled }) {
  return (
    <label className={cx('inline-flex cursor-pointer items-center gap-3 text-sm font-medium', disabled && 'cursor-not-allowed opacity-60')}>
      <input type="checkbox" role="switch" className="peer sr-only" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-glass-strong transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lav" />
      {text}
    </label>
  )
}

// ---- toasts ---------------------------------------------------------------------------------------
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((message, kind = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setItems((l) => [...l.slice(-3), { id, message, kind }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 4000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" role="region" aria-label="Notifications" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto flex items-start gap-2 rounded-xl border p-3 text-sm shadow-menu backdrop-blur-xl', t.kind === 'error' ? 'border-error/50 bg-night/95 text-fg' : 'border-edge-strong bg-night/95 text-fg')}>
            {t.kind === 'error' ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-error" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />}
            <span className="flex-1">{t.message}</span>
            <button type="button" aria-label="Dismiss" className="text-soft hover:text-fg" onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))}><X className="size-4" aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// ---- modal ----------------------------------------------------------------------------------------
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
export function Modal({ open, onClose, title, children, footer, wide = false }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return undefined
    const prev = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector(FOCUSABLE)?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key !== 'Tab' || !ref.current) return
      const els = [...ref.current.querySelectorAll(FOCUSABLE)]
      if (!els.length) return
      const [first, last] = [els[0], els[els.length - 1]]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; prev?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cx('flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-edge-strong bg-night shadow-menu sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <header className="flex items-center justify-between gap-3 border-b border-edge px-5 py-4">
          <h2 id={titleId} className="font-display text-lg font-semibold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-soft hover:bg-glass-strong hover:text-fg"><X className="size-5" aria-hidden="true" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-edge px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}
export function ConfirmDialog({ open, title, children, confirmLabel = 'Delete', onConfirm, onClose, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="danger" loading={busy} onClick={onConfirm}>{confirmLabel}</Btn></>}>
      <p className="text-sm text-soft">{children}</p>
    </Modal>
  )
}

// ---- data ----------------------------------------------------------------------------------------
/** Fetch on mount and whenever `deps` change; exposes loading / error / reload. */
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    let alive = true
    fnRef.current().then((data) => alive && setState({ data, error: null, loading: false })).catch((error) => alive && setState((s) => ({ data: s.data, error, loading: false })))
    return () => { alive = false }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => run(), [run, ...deps])
  return { ...state, reload: run }
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

export function Pagination({ page, pages, total, onPage }) {
  if (!total) return null
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-4 py-3 text-sm text-soft">
      <span>{total} {total === 1 ? 'result' : 'results'} · page {page} of {pages}</span>
      <span className="flex gap-2">
        <Btn disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" aria-hidden="true" /></Btn>
        <Btn disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="size-4" aria-hidden="true" /></Btn>
      </span>
    </nav>
  )
}

/** Responsive table. columns: [{ key, header, render?, sort?, className? }]. On phones the table scrolls horizontally. */
export function DataTable({ columns, rows, rowKey = (r) => r.id, onRowClick, sort, onSort, empty }) {
  const sortable = (c) => c.sort && onSort
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-edge text-xs uppercase tracking-wide text-soft">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx('px-4 py-3 font-semibold', c.className)} aria-sort={c.sort && sort?.key === c.sort ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined}>
                {sortable(c) ? (
                  <button type="button" className="inline-flex items-center gap-1 uppercase hover:text-fg" onClick={() => onSort(c.sort)}>
                    {c.header}{sort?.key === c.sort ? (sort.order === 'asc' ? <ChevronUp className="size-3.5" aria-hidden="true" /> : <ChevronDown className="size-3.5" aria-hidden="true" />) : null}
                  </button>
                ) : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {rows.map((r) => (
            <tr key={rowKey(r)} className={cx(onRowClick && 'cursor-pointer hover:bg-glass-strong')} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {columns.map((c, i) => (
                <td key={c.key} className={cx('px-4 py-3 align-middle', c.className)}>
                  {onRowClick && i === 0 ? (
                    <button type="button" className="text-left font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-lav" onClick={(e) => { e.stopPropagation(); onRowClick(r) }}>{c.render ? c.render(r) : r[c.key]}</button>
                  ) : c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (empty || <EmptyState />)}
    </div>
  )
}

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—')
export const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—')
export const useMemoList = (...a) => useMemo(...a)
