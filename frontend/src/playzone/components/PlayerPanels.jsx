import { Link } from 'react-router-dom'
import { CheckCircle2, Gift, Lock, Target } from 'lucide-react'
import { useAchievements, useChallenges, usePlayerActions } from '../hooks.js'
import { useAuth } from '../../hooks/useAuth.js'
import { ErrorState, LoadingState } from './parts.jsx'

const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

/** Today's server-defined challenges: progress comes only from verified runs, and a finished challenge's reward is claimed once. */
export function ChallengesPanel({ headingId = 'pz-dc' }) {
  const { user } = useAuth()
  const ch = useChallenges()
  const { busy, error, claim } = usePlayerActions(ch.reload)
  const d = ch.data
  return (
    <section aria-labelledby={headingId} className="pz-glass p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="font-display text-xl font-bold">Daily challenges</h2>
        {d && <span className="pz-chip !py-0.5 !text-[0.62rem]">Resets {fmtTime(d.expires_at)} · {d.timezone}</span>}
      </div>
      {ch.status === 'loading' && <div className="mt-4"><LoadingState label="Loading challenges" rows={3} /></div>}
      {ch.status === 'unavailable' && <p className="pz-soft mt-4 text-sm" role="status">Daily challenges are unavailable right now. The games still work.</p>}
      {ch.status === 'error' && <div className="mt-4"><ErrorState title="Could not load challenges" onRetry={ch.reload}>Please try again.</ErrorState></div>}
      {d && (
        <ul className="mt-4 space-y-3">
          {d.items.map((c) => (
            <li key={c.id} className="rounded-2xl border border-white/15 bg-white/5 p-3 text-sm">
              <div className="flex items-start gap-3">
                {c.claimed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" /> : <Target className="mt-0.5 size-4 shrink-0 text-[var(--pz-pink)]" aria-hidden="true" />}
                <div className="min-w-0 flex-1"><p className="font-semibold">{c.title} <span className="pz-soft font-normal">· +{c.reward_points} pts</span></p><p className="pz-soft text-xs">{c.description}</p></div>
                {c.claimable && <button type="button" disabled={busy} onClick={() => claim(c.id)} className="pz-btn pz-btn-primary !min-h-10 !px-3 text-xs"><Gift className="size-4" aria-hidden="true" />Claim</button>}
                {c.claimed && <span className="pz-chip !py-0.5 !text-[0.62rem]">Claimed</span>}
              </div>
              {user && <div role="progressbar" aria-label={`${c.title} progress`} aria-valuemin="0" aria-valuemax={c.target} aria-valuenow={c.progress} className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--pz-blue)]" style={{ width: `${Math.round((c.progress / c.target) * 100)}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}
      {d && !user && <p className="pz-soft mt-3 text-xs"><Link to="/login" state={{ from: '/play-zone/profile' }} className="font-bold underline">Sign in</Link> to track progress and claim rewards. Guests can see today&apos;s challenges.</p>}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-[var(--pz-pink)]">{error}</p>}
    </section>
  )
}

/** Achievements the server has awarded (earned) and the ones still locked. Guests see them all locked. */
export function AchievementsPanel({ headingId = 'pz-ach' }) {
  const a = useAchievements()
  const items = a.data?.items || []
  const earned = items.filter((x) => x.earned).length
  return (
    <section aria-labelledby={headingId} className="pz-glass p-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 id={headingId} className="font-display text-xl font-bold">Achievements</h2>{a.data?.signed_in && <span className="pz-chip !py-0.5 !text-[0.62rem]">{earned} / {items.length} earned</span>}</div>
      {a.status === 'loading' && <div className="mt-4"><LoadingState label="Loading achievements" rows={3} /></div>}
      {a.status === 'unavailable' && <p className="pz-soft mt-4 text-sm" role="status">Achievements are unavailable right now.</p>}
      {a.status === 'error' && <div className="mt-4"><ErrorState title="Could not load achievements" onRetry={a.reload}>Please try again.</ErrorState></div>}
      <ul className="mt-4 space-y-2.5">
        {items.map((x) => (
          <li key={x.code} className="flex items-start gap-3 text-sm">
            {x.earned ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" /> : <Lock className="mt-0.5 size-4 shrink-0 text-[var(--pz-gold)]" aria-hidden="true" />}
            <span><strong>{x.title}</strong> <span className="pz-soft">· {x.description}</span>{x.earned && x.earned_at && <span className="pz-soft block text-xs">Earned {new Date(x.earned_at).toLocaleDateString()}</span>}</span>
          </li>
        ))}
      </ul>
      {a.data && !a.data.signed_in && <p className="pz-soft mt-3 text-xs">Sign in and play to earn achievements: guests cannot claim them.</p>}
    </section>
  )
}
