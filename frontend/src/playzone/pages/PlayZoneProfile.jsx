import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CloudUpload, LogIn, ShieldCheck, UserRound } from 'lucide-react'
import PzPage from './PzPage.jsx'
import LaxBotPlayer from '../components/LaxBotPlayer.jsx'
import { AchievementsPanel, ChallengesPanel } from '../components/PlayerPanels.jsx'
import { BackLink, ErrorState, LoadingState, PzHeading } from '../components/parts.jsx'
import { BOT_VARIANTS, games } from '../data/games.js'
import { useAuth } from '../../hooks/useAuth.js'
import { usePrefs, useSetPref } from '../prefs.js'
import { useLocal } from '../services/localScores.js'
import { hasGuestProgress, syncGame } from '../services/cloudSync.js'
import { usePlayerActions, usePlayerProfile } from '../hooks.js'
import { LEVELS as PUZZLE } from '../games/puzzlePop/levels.js'
import { LEVELS as JUMP } from '../games/laxbotJump/levels.js'
import { LEVELS as BUG } from '../games/bugHunter/levels.js'

const LEVEL_COUNT = { 'puzzle-pop': PUZZLE.length, 'laxbot-jump': JUMP.length, 'bug-hunter': BUG.length }
const fmt = (n) => Number(n).toLocaleString('en-IN')
const when = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—')

/**
 * The player profile. It reuses the website's own sign-in (useAuth): there is no separate Play Zone login. Signed-in players see their server-side nickname, avatar, verified points,
 * personal bests, progress and achievements; guests see this device's local records and a prompt to sign in. E-mail and real name never appear on the public boards.
 */
export default function PlayZoneProfile() {
  const { user, loading } = useAuth()
  const prefs = usePrefs()
  const setPref = useSetPref()
  const local = useLocal()
  const prof = usePlayerProfile()
  const actions = usePlayerActions(prof.reload)
  const p = prof.data
  const [nick, setNick] = useState('')
  const [saved, setSaved] = useState(false)
  const [imported, setImported] = useState('')
  useEffect(() => { if (p?.nickname) setNick(p.nickname) }, [p?.nickname])
  const avatar = p?.avatar || prefs.avatar
  const guestGames = user ? games.filter((g) => hasGuestProgress(g.slug)) : []

  const saveNick = async (e) => {
    e.preventDefault(); setSaved(false)
    if (await actions.saveProfile({ nickname: nick.trim() })) setSaved(true)
  }
  const pickAvatar = async (id) => { setPref('avatar', id); if (user) await actions.saveProfile({ avatar: id }) }
  const importGuest = async () => {
    setImported('working')
    const res = await Promise.all(guestGames.map((g) => syncGame(g.slug, { asImport: true })))
    setImported(res.every((r) => r.ok) ? 'done' : 'failed'); prof.reload()
  }

  return (
    <PzPage path="/play-zone/profile" title="Play Zone Profile" description="Your LAX360 Play Zone profile: avatar, personal bests, achievements and progress. Connected to your LAX360 account.">
      <div className="wrap py-10 md:py-16">
        <BackLink />
        <div className="mt-8"><PzHeading as="h1" eyebrow="Your profile" title="Player profile" lead={user ? 'Your verified scores, progress and achievements are saved to your LAX360 account and follow you across devices.' : 'You are playing as a guest: personal bests stay on this device. Sign in with your LAX360 account to save official scores, join the leaderboard and earn achievements.'} /></div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[22rem_1fr]">
          <section aria-labelledby="pz-me" className="pz-glass flex flex-col items-center gap-4 p-6 text-center">
            <div className="grid size-36 place-items-center overflow-hidden rounded-full bg-white/10 ring-4 ring-white/20"><span className="mt-4"><LaxBotPlayer variant={avatar} size={100} /></span></div>
            <h2 id="pz-me" className="font-display text-2xl font-bold">{p?.nickname || (user ? 'Player' : 'Guest player')}</h2>
            {p && <p className="pz-soft -mt-2 text-xs">Player ID {p.player_id.slice(0, 8)} · joined {when(p.joined_at)}</p>}

            {user && p && (
              <form onSubmit={saveNick} className="w-full text-left" noValidate>
                <label htmlFor="pz-nick" className="mb-1 block text-sm font-bold">Public nickname</label>
                <div className="flex gap-2">
                  <input id="pz-nick" value={nick} onChange={(e) => { setNick(e.target.value); setSaved(false) }} maxLength={20} autoComplete="off" className="min-h-11 w-full rounded-xl border border-white/20 bg-white/10 px-3" aria-describedby="pz-nick-help" />
                  <button type="submit" disabled={actions.busy || !nick.trim() || nick.trim() === p.nickname} className="pz-btn pz-btn-primary !min-h-11 !px-4 text-sm">Save</button>
                </div>
                <p id="pz-nick-help" className="pz-soft mt-1 text-xs">3–20 letters, numbers, spaces, - or _. This is the only name shown on leaderboards.</p>
                {saved && <p role="status" className="mt-1 text-sm font-semibold text-emerald-300">Nickname saved.</p>}
                {actions.error && <p role="alert" className="mt-1 text-sm font-semibold text-[var(--pz-pink)]">{actions.error}</p>}
              </form>
            )}

            <fieldset className="w-full">
              <legend className="mb-2 w-full text-sm font-bold">Choose your LAXBOT avatar</legend>
              <div className="grid grid-cols-2 gap-2">
                {BOT_VARIANTS.map((b) => <button key={b.id} type="button" aria-pressed={avatar === b.id} onClick={() => pickAvatar(b.id)} className="pz-tab !h-auto !rounded-2xl !px-2 !py-2 text-xs">{b.label}</button>)}
              </div>
              <p className="pz-soft mt-2 text-xs">{user ? 'Saved to your account and shown on leaderboards.' : 'Saved on this device only.'}</p>
            </fieldset>

            <div className="w-full rounded-2xl border border-white/15 bg-white/5 p-4 text-left">
              <p className="flex items-center gap-2 font-bold">{user ? <CheckCircle2 className="size-5 text-emerald-300" aria-hidden="true" /> : <UserRound className="size-5 text-[var(--pz-blue)]" aria-hidden="true" />}Account connection</p>
              {loading ? <p className="pz-soft mt-1 text-sm" role="status">Checking your session…</p>
                : user ? <p className="pz-soft mt-1 flex gap-2 text-sm"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Signed in with your LAX360 account. Your e-mail and real name are never shown on the Play Zone.</p>
                  : <><p className="pz-soft mt-1 text-sm">Not signed in. Guests can play, see public leaderboards and keep local bests.</p><Link to="/login" state={{ from: '/play-zone/profile' }} className="pz-btn pz-btn-primary mt-3 !min-h-11 text-sm"><LogIn className="size-4" aria-hidden="true" />Log in</Link></>}
            </div>

            {user && guestGames.length > 0 && (
              <div className="w-full rounded-2xl border border-white/15 bg-white/5 p-4 text-left text-sm">
                <p className="flex items-center gap-2 font-bold"><CloudUpload className="size-5 text-[var(--pz-blue)]" aria-hidden="true" />Guest progress on this device</p>
                <p className="pz-soft mt-1">Import it into your account to keep your unlocked levels. Imported progress is marked <b>unverified</b>: it never counts on leaderboards.</p>
                <button type="button" onClick={importGuest} disabled={imported === 'working'} className="pz-btn pz-btn-ghost mt-3 !min-h-11 text-sm">{imported === 'working' ? 'Importing…' : 'Import guest progress'}</button>
                {imported === 'done' && <p role="status" className="mt-2 font-semibold text-emerald-300">Imported.</p>}
                {imported === 'failed' && <p role="alert" className="mt-2 font-semibold text-[var(--pz-pink)]">Could not import right now. Your progress is still safe on this device; try again later.</p>}
              </div>
            )}
          </section>

          <div className="space-y-6">
            {user && prof.status === 'loading' && <LoadingState label="Loading your profile" rows={3} />}
            {user && prof.status === 'unavailable' && <div role="status" className="pz-glass p-5 text-sm">Your Play Zone account data is unavailable right now (the server could not be reached). Your games keep working and local bests are shown below. <button type="button" onClick={prof.reload} className="font-bold underline">Try again</button></div>}
            {user && prof.status === 'error' && <ErrorState title="Could not load your profile" onRetry={prof.reload}>Please try again.</ErrorState>}

            <section aria-labelledby="pz-bests" className="pz-glass p-6">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="pz-bests" className="font-display text-xl font-bold">Personal bests</h2><span className="pz-chip !py-0.5 !text-[0.62rem]">{p ? 'Verified by the server' : 'Local · this device'}</span></div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {games.map((g) => {
                  const lv = p?.personal_bests?.[g.slug] || {}
                  const top = Math.max(0, ...Object.values(lv))
                  const loc = local.games[g.slug]
                  return (
                    <li key={g.slug} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-3">
                      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10"><span className="mt-2"><LaxBotPlayer variant={g.bot} size={34} /></span></span>
                      <div className="min-w-0"><p className="truncate font-semibold">{g.title}</p>
                        <p className="pz-soft text-sm">{p ? (top ? `Verified best ${fmt(top)}` : 'No verified score yet') : loc?.best ? `Local best ${fmt(loc.best)} · ${loc.plays} plays` : 'No score yet'}</p></div>
                    </li>
                  )
                })}
              </ul>
              {p ? <p className="pz-soft mt-4 text-sm">Games played: <strong className="text-[var(--pz-text)]">{p.games_played}</strong> · Ranking points: <strong className="text-[var(--pz-text)]">{fmt(p.verified_points)}</strong> · Last played: {when(p.last_played_at)}</p>
                : <p className="pz-soft mt-4 text-sm">Total games played on this device: <strong className="text-[var(--pz-text)]">{games.reduce((n, g) => n + (local.games[g.slug]?.plays || 0), 0)}</strong></p>}
            </section>

            <section aria-labelledby="pz-progress" className="pz-glass p-6">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="pz-progress" className="font-display text-xl font-bold">Game progress & unlocked levels</h2><span className="pz-chip !py-0.5 !text-[0.62rem]">{p ? 'Synced to your account' : 'This device'}</span></div>
              <ul className="mt-4 space-y-3">
                {games.filter((g) => LEVEL_COUNT[g.slug]).map((g) => {
                  const total = LEVEL_COUNT[g.slug]
                  const done = p ? p.progress?.[g.slug]?.levels_completed?.length || 0 : 0
                  return (
                    <li key={g.slug}>
                      <div className="flex items-center justify-between text-sm font-semibold"><span>{g.title}</span><span className="pz-soft">{p ? `${done} / ${total} levels verified` : 'Sign in to sync'}</span></div>
                      <div role="progressbar" aria-label={`${g.title} progress`} aria-valuemin="0" aria-valuemax={total} aria-valuenow={done} className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(done / total) * 100}%`, background: g.accent }} /></div>
                    </li>
                  )
                })}
              </ul>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <AchievementsPanel />
              <ChallengesPanel />
            </div>
          </div>
        </div>
      </div>
    </PzPage>
  )
}
