import { Link } from 'react-router-dom'
import { CheckCircle2, CircleDashed, Lock, LogIn, Target, UserRound } from 'lucide-react'
import PzPage from './PzPage.jsx'
import LaxBotPlayer from '../components/LaxBotPlayer.jsx'
import { BackLink, DevBadge, PzHeading } from '../components/parts.jsx'
import { BOT_VARIANTS, games, plannedAchievements, plannedChallenges } from '../data/games.js'
import { useAuth } from '../../hooks/useAuth.js'
import { usePrefs, useSetPref } from '../prefs.js'
import { useLocal } from '../services/localScores.js'

const Awaiting = ({ children = 'Awaiting backend' }) => <span className="pz-chip pz-chip-dev !py-0.5 !text-[0.62rem]"><CircleDashed className="size-3" aria-hidden="true" />{children}</span>

/**
 * The player profile. It reuses the website's own sign-in (useAuth): there is no separate Play Zone login. Everything that needs the future backend (nickname, scores, progress,
 * achievements, challenges) is shown as a clearly labelled placeholder; the avatar choice is real but saved on this device only.
 */
export default function PlayZoneProfile() {
  const { user, loading } = useAuth()
  const prefs = usePrefs()
  const set = useSetPref()
  const local = useLocal()
  const totalPlays = games.reduce((n, g) => n + (local.games[g.slug]?.plays || 0), 0)
  return (
    <PzPage path="/play-zone/profile" title="Play Zone Profile" description="Your LAX360 Play Zone profile: avatar, personal bests, achievements and progress. Connected to your LAX360 account.">
      <div className="wrap py-10 md:py-16">
        <BackLink />
        <div className="mt-8"><PzHeading as="h1" eyebrow="Your profile" title="Player profile" lead="Your Catch the Stars bests and achievements are saved on this device. Accounts, official scores and the other games need the Play Zone backend and are marked while they are not connected." /></div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[22rem_1fr]">
          {/* avatar, nickname, account */}
          <section aria-labelledby="pz-me" className="pz-glass flex flex-col items-center gap-4 p-6 text-center">
            <div className="grid size-36 place-items-center overflow-hidden rounded-full bg-white/10 ring-4 ring-white/20"><span className="mt-4"><LaxBotPlayer variant={prefs.avatar} size={100} /></span></div>
            <h2 id="pz-me" className="font-display text-2xl font-bold">{user ? user.full_name : 'Guest player'}</h2>
            <p className="pz-soft -mt-2 text-sm">Nickname: <Awaiting>Not set up yet</Awaiting></p>
            <fieldset className="w-full">
              <legend className="mb-2 w-full text-sm font-bold">Choose your LAXBOT avatar</legend>
              <div className="grid grid-cols-2 gap-2">
                {BOT_VARIANTS.map((b) => <button key={b.id} type="button" aria-pressed={prefs.avatar === b.id} onClick={() => set('avatar', b.id)} className="pz-tab !h-auto !rounded-2xl !px-2 !py-2 text-xs">{b.label}</button>)}
              </div>
              <p className="pz-soft mt-2 text-xs">Saved on this device only.</p>
            </fieldset>
            <div className="w-full rounded-2xl border border-white/15 bg-white/5 p-4 text-left">
              <p className="flex items-center gap-2 font-bold">{user ? <CheckCircle2 className="size-5 text-emerald-300" aria-hidden="true" /> : <UserRound className="size-5 text-[var(--pz-blue)]" aria-hidden="true" />}Account connection</p>
              {loading ? <p className="pz-soft mt-1 text-sm" role="status">Checking your session…</p>
                : user ? <p className="pz-soft mt-1 text-sm">Signed in with your LAX360 account ({user.email}). Your Play Zone data will be linked to it when gameplay launches.</p>
                  : <><p className="pz-soft mt-1 text-sm">Not signed in. Use your LAX360 account to save scores once the games launch.</p><Link to="/login" state={{ from: '/play-zone/profile' }} className="pz-btn pz-btn-primary mt-3 !min-h-11 text-sm"><LogIn className="size-4" aria-hidden="true" />Log in</Link></>}
            </div>
          </section>

          <div className="space-y-6">
            <section aria-labelledby="pz-bests" className="pz-glass p-6">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="pz-bests" className="font-display text-xl font-bold">Personal bests</h2><span className="pz-chip !py-0.5 !text-[0.62rem]">Local · this device</span></div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {games.map((g) => (
                  <li key={g.slug} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-3">
                    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10"><span className="mt-2"><LaxBotPlayer variant={g.bot} size={34} /></span></span>
                    <div className="min-w-0"><p className="truncate font-semibold">{g.title}</p><p className="pz-soft text-sm">{local.games[g.slug]?.best ? `Best ${local.games[g.slug].best.toLocaleString('en-IN')} · ${local.games[g.slug].plays} plays` : 'No score yet'}</p></div>
                  </li>
                ))}
              </ul>
              <p className="pz-soft mt-4 text-sm">Total games played: <strong className="text-[var(--pz-text)]">{totalPlays}</strong> <span className="text-xs">(this device; the official count needs the backend)</span></p>
            </section>

            <section aria-labelledby="pz-progress" className="pz-glass p-6">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="pz-progress" className="font-display text-xl font-bold">Game progress & unlocked levels</h2><Awaiting /></div>
              <ul className="mt-4 space-y-3">
                {games.map((g) => (
                  <li key={g.slug}>
                    <div className="flex items-center justify-between text-sm font-semibold"><span>{g.title}</span><span className="pz-soft">Levels unlock when the game launches</span></div>
                    <div role="progressbar" aria-label={`${g.title} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-0 rounded-full" style={{ background: g.accent }} /></div>
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <section aria-labelledby="pz-ach" className="pz-glass p-6">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="pz-ach" className="font-display text-xl font-bold">Achievements</h2><span className="pz-chip !py-0.5 !text-[0.62rem]">Local · this device</span></div>
                <ul className="mt-4 space-y-2.5">{plannedAchievements.map((a) => <li key={a.id} className="flex items-center gap-3 text-sm">{local.achievements[a.id] ? <CheckCircle2 className="size-4 shrink-0 text-emerald-300" aria-hidden="true" /> : <Lock className="size-4 shrink-0 text-[var(--pz-gold)]" aria-hidden="true" />}<span><strong>{a.title}</strong> <span className="pz-soft">· {a.text}</span></span></li>)}</ul>
              </section>
              <section aria-labelledby="pz-dc" className="pz-glass p-6">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="pz-dc" className="font-display text-xl font-bold">Daily challenges</h2><DevBadge>Preview · not active</DevBadge></div>
                <ul className="mt-4 space-y-2.5">{plannedChallenges.map((c) => <li key={c.id} className="flex items-center gap-3 text-sm"><Target className="size-4 shrink-0 text-[var(--pz-pink)]" aria-hidden="true" /><span><strong>{c.title}</strong> <span className="pz-soft">· {c.text}</span></span></li>)}</ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </PzPage>
  )
}
