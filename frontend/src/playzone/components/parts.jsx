import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Inbox, Sparkles } from 'lucide-react'
import { GAME_STATUS } from '../data/games.js'

/** A small status label ("Coming soon") so no game is ever presented as playable before it is. */
export const StatusChip = ({ status }) => <span className="pz-chip pz-chip-gold">{GAME_STATUS[status] || status}</span>

/** Marks data that is invented for the development preview. Shown wherever sample entries appear. */
export const DevBadge = ({ children = 'Development preview · sample data' }) => <span className="pz-chip pz-chip-dev" role="note"><Sparkles className="size-3.5" aria-hidden="true" />{children}</span>

export const PzHeading = ({ eyebrow, title, lead, id, center, as: Tag = 'h2' }) => (
  <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
    {eyebrow && <p className="pz-eyebrow">{eyebrow}</p>}
    <Tag id={id} className="pz-h2 mt-3">{title}</Tag>
    {lead && <p className="pz-soft mt-4 text-lg leading-relaxed">{lead}</p>}
  </div>
)

export const BackLink = ({ to = '/play-zone', children = 'Back to Play Zone' }) => (
  <Link to={to} className="pz-btn pz-btn-ghost !min-h-11 !px-4 text-sm"><ArrowLeft className="size-4" aria-hidden="true" />{children}</Link>
)

/** The three states every data panel can be in besides "has data". */
export function LoadingState({ label = 'Loading…', rows = 4 }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="pz-skeleton h-14" />)}
    </div>
  )
}
export const EmptyState = ({ title, children, action }) => (
  <div role="note" className="pz-glass flex flex-col items-center gap-3 px-6 py-10 text-center">
    <span className="grid size-14 place-items-center rounded-2xl bg-white/10"><Inbox className="size-7 text-[var(--pz-blue)]" aria-hidden="true" /></span>
    <p className="font-display text-xl font-semibold">{title}</p>
    <p className="pz-soft max-w-md">{children}</p>
    {action}
  </div>
)
export const ErrorState = ({ title = 'Something went wrong', children, onRetry }) => (
  <div role="alert" className="pz-glass flex flex-col items-center gap-3 px-6 py-10 text-center">
    <span className="grid size-14 place-items-center rounded-2xl bg-white/10"><AlertTriangle className="size-7 text-[var(--pz-pink)]" aria-hidden="true" /></span>
    <p className="font-display text-xl font-semibold">{title}</p>
    <p className="pz-soft max-w-md">{children}</p>
    {onRetry && <button type="button" onClick={onRetry} className="pz-btn pz-btn-ghost">Try again</button>}
  </div>
)

/**
 * Runs an async loader and reports { status: 'loading' | 'ready' | 'error', data, error, reload }. The Play Zone has no backend yet, so most callers end in 'error' with a
 * NotIntegratedError, which the screens present as an honest "not live yet" state rather than a failure.
 */
export function useLoad(fn, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setState({ status: 'loading', data: null, error: null })
    Promise.resolve().then(fn).then((data) => alive && setState({ status: 'ready', data, error: null })).catch((error) => alive && setState({ status: 'error', data: null, error }))
    return () => { alive = false }
  }, [...deps, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: () => setTick((n) => n + 1) }
}
