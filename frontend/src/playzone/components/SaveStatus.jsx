import { Link } from 'react-router-dom'
import { CheckCircle2, CloudOff, Loader2, LogIn, ShieldAlert, Trophy } from 'lucide-react'
import { retry, useRunStatus } from '../services/officialRun.js'

/** The result screens' honest save line: guest prompt, saving, saved (with verified points), flagged, rejected, or retry. It never blocks the buttons beside it. */
export default function SaveStatus({ game, localHint = 'Local · this device only.' }) {
  const st = useRunStatus(game)
  const box = 'mt-3 flex items-start justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-left text-xs sm:text-sm'
  if (!st || st.state === 'idle' || st.state === 'saving') return <p className={box} role="status"><Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" /><span>Saving your result…</span></p>
  if (st.state === 'guest') return (
    <p className={box} role="status"><LogIn className="mt-0.5 size-4 shrink-0 text-[var(--pz-blue)]" aria-hidden="true" />
      <span>{localHint} <Link to="/login" state={{ from: "/play-zone" }} className="font-bold underline">Sign in</Link> to save official scores, join the leaderboard and earn achievements.</span></p>
  )
  if (st.state === 'saved') {
    const o = st.outcome || {}
    return (
      <div className={box} role="status"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" />
        <span>Saved to your account. Verified score <b className="tabular-nums">{o.score?.toLocaleString?.() ?? o.score}</b>{o.points != null ? <> · <b className="tabular-nums">{o.points}</b> ranking points</> : null}.
          {o.new_achievements?.length > 0 && <span className="mt-1 block font-bold text-emerald-200"><Trophy className="mr-1 inline size-4" aria-hidden="true" />New achievement{o.new_achievements.length > 1 ? 's' : ''} earned! <Link to="/play-zone/profile" className="underline">See your profile</Link></span>}
        </span></div>
    )
  }
  if (st.state === 'flagged') return <p className={box} role="status"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" /><span>Your run was saved but is waiting for a review before it can count on the leaderboard.</span></p>
  if (st.state === 'retry') return (
    <p className={box} role="alert"><CloudOff className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
      <span>We couldn't save this result yet. Your game is fine. <button type="button" className="font-bold underline" onClick={() => retry(game)}>Try saving again</button></span></p>
  )
  if (st.state === 'signed_out') return <p className={box} role="alert"><LogIn className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Your sign-in expired, so this result was not saved. <Link to="/login" state={{ from: "/play-zone" }} className="font-bold underline">Sign in again</Link> to keep playing officially.</span></p>
  if (st.state === 'rejected') return <p className={box} role="status"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" /><span>This run could not be verified, so it is not on the leaderboard. {localHint}</span></p>
  return <p className={box} role="status"><CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{localHint} This round was not an official run (the Play Zone server could not be reached or the level is not unlocked in your account).</span></p>
}
