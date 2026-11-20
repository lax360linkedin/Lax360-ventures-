import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDown, ArrowUp, BarChart3, Gamepad2, ImageIcon, ListOrdered, Medal, Settings2, Target, Trophy, Users } from 'lucide-react'
import { games, plannedAchievements, plannedChallenges } from '../../playzone/data/games.js'
import { Badge, Btn, Card, EmptyState, Field, Input, PageHeader, Select, Toggle, cx } from '../ui.jsx'

// Play Zone management (Milestone 1: interface only). The Play Zone has no backend yet, so NOTHING on these screens is saved. Every control that will need the backend is labelled
// "Awaiting backend", and the "Save" buttons are disabled: the screen never claims a change was stored. Changes made here live only until the page is closed.

const TABS = [
  ['overview', 'Game overview', Gamepad2], ['enable', 'Enable / disable', Settings2], ['order', 'Display order', ListOrdered], ['media', 'Game media', ImageIcon], ['players', 'Players', Users],
  ['leaderboard', 'Leaderboards', Trophy], ['achievements', 'Achievements', Medal], ['challenges', 'Daily challenges', Target], ['settings', 'Game settings', Settings2], ['analytics', 'Analytics', BarChart3],
]

const Awaiting = ({ children = 'Awaiting backend' }) => <Badge value="draft" text={children} />
const SaveBar = () => (
  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-edge pt-4">
    <Btn kind="primary" disabled title="The Play Zone backend is not connected yet">Save changes</Btn>
    <p className="text-sm text-soft">Saving is not available yet. Nothing on this screen is stored; changes are lost when you leave the page.</p>
  </div>
)

function Overview() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {games.map((g) => (
          <Card key={g.slug} className="!p-4">
            <p className="font-display text-lg font-semibold">{g.title}</p>
            <p className="mt-1 text-sm text-soft">{g.world}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2"><Badge value="draft" text="Coming soon" /><Link to={`/play-zone/${g.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-lav hover:underline">Open page</Link></div>
          </Card>
        ))}
      </div>
      <Card className="mt-4"><h2 className="font-display text-lg font-semibold">What is live</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-soft"><li>The Play Zone lobby, the four game introduction pages, the leaderboard and profile screens (interface only).</li><li>Sound and graphics preferences (saved on each visitor's own device).</li><li>No gameplay, scores, accounts data, leaderboards or analytics yet: they need the backend (Milestone 2 onward).</li></ul></Card>
    </>
  )
}

function Enable() {
  const [on, setOn] = useState(() => Object.fromEntries(games.map((g) => [g.slug, true])))
  return (
    <Card><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">Show or hide a game</h2><Awaiting /></div>
      <p className="mt-1 text-sm text-soft">A hidden game disappears from the Play Zone lobby and its page.</p>
      <ul className="mt-4 divide-y divide-edge">{games.map((g) => <li key={g.slug} className="flex items-center justify-between gap-3 py-3"><span className="font-semibold">{g.title}</span><Toggle checked={on[g.slug]} onChange={(v) => setOn((s) => ({ ...s, [g.slug]: v }))} label={on[g.slug] ? 'Shown' : 'Hidden'} /></li>)}</ul>
      <SaveBar /></Card>
  )
}

function Order() {
  const [list, setList] = useState(games.map((g) => g.slug))
  const move = (i, d) => setList((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n })
  return (
    <Card><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">Order in the lobby</h2><Awaiting /></div>
      <ol className="mt-4 space-y-2">{list.map((slug, i) => (
        <li key={slug} className="flex items-center gap-3 rounded-xl border border-edge bg-glass px-3 py-2">
          <span className="w-6 text-center font-display font-semibold">{i + 1}</span><span className="flex-1 font-semibold">{games.find((g) => g.slug === slug).title}</span>
          <Btn onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp className="size-4" aria-hidden="true" /></Btn>
          <Btn onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move down"><ArrowDown className="size-4" aria-hidden="true" /></Btn>
        </li>))}</ol>
      <SaveBar /></Card>
  )
}

function Media() {
  return (
    <Card><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">Game media</h2><Awaiting /></div>
      <p className="mt-1 text-sm text-soft">Each game uses temporary vector artwork. Final thumbnails, banners and LAXBOT images will be uploaded here (and stored in the <Link to="/company-admin/media" className="font-semibold text-lav hover:underline">Media library</Link>) once the backend is connected. The list of production assets is in <code>PLAYZONE_ASSETS.md</code>.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{games.map((g) => (
        <div key={g.slug} className="rounded-xl border border-edge p-4"><p className="font-semibold">{g.title}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-soft">{['Thumbnail', 'Banner', 'LAXBOT image'].map((s) => <div key={s} className="rounded-lg border border-dashed border-edge-strong px-2 py-5">{s}<br />Upload not available</div>)}</div></div>))}</div></Card>
  )
}

const Pending = ({ title, text, columns }) => (
  <Card><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">{title}</h2><Awaiting /></div>
    <p className="mt-1 text-sm text-soft">{text}</p>
    {columns && <div className="mt-4 overflow-x-auto rounded-xl border border-edge"><table className="w-full text-left text-sm"><thead className="bg-glass text-xs uppercase tracking-wider text-soft"><tr>{columns.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}</tr></thead></table><EmptyState title="No data">Records appear here once the Play Zone backend is connected.</EmptyState></div>}
  </Card>
)

function List({ title, items, hint }) {
  const [on, setOn] = useState(() => Object.fromEntries(items.map((a) => [a.id, true])))
  return (
    <Card><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">{title}</h2><Awaiting /></div>
      <p className="mt-1 text-sm text-soft">{hint}</p>
      <ul className="mt-4 divide-y divide-edge">{items.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 py-3"><span><strong>{a.title}</strong><span className="block text-sm text-soft">{a.text}</span></span><Toggle checked={on[a.id]} onChange={(v) => setOn((s) => ({ ...s, [a.id]: v }))} label={on[a.id] ? 'On' : 'Off'} /></li>)}</ul>
      <div className="mt-4"><Btn disabled>Add new (not available yet)</Btn></div><SaveBar /></Card>
  )
}

function SettingsTab() {
  const [v, setV] = useState({ guest: 'try', rate: '30', nick: 'filter' })
  return (
    <Card><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">Game settings</h2><Awaiting /></div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Field label="Guests">{(p) => <Select {...p} value={v.guest} onChange={(e) => setV({ ...v, guest: e.target.value })}><option value="try">May try games, not save scores</option><option value="none">Must sign in to play</option></Select>}</Field>
        <Field label="Score submissions per minute (per player)">{(p) => <Input {...p} type="number" min="1" value={v.rate} onChange={(e) => setV({ ...v, rate: e.target.value })} />}</Field>
        <Field label="Nicknames">{(p) => <Select {...p} value={v.nick} onChange={(e) => setV({ ...v, nick: e.target.value })}><option value="filter">Filter inappropriate words</option><option value="off">No filter</option></Select>}</Field>
      </div>
      <SaveBar /></Card>
  )
}

function Analytics() {
  return (
    <Card><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">Analytics</h2><Awaiting /></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{['Plays per game', 'Unique players', 'Average session length', 'Scores submitted'].map((t) => <div key={t} className="rounded-xl border border-edge p-4"><p className="text-sm text-soft">{t}</p><p className="mt-2 font-display text-2xl font-semibold">Not tracked yet</p></div>)}</div>
      <p className="mt-4 text-sm text-soft">No analytics are collected in Milestone 1, so no numbers are shown (and none are invented).</p></Card>
  )
}

export default function PlayZoneAdmin() {
  const [tab, setTab] = useState('overview')
  return (
    <>
      <PageHeader title="Play Zone" lead="Manage the LAX360 Play Zone games, players, leaderboards, achievements and settings." actions={<Link to="/play-zone" target="_blank" rel="noopener noreferrer"><Btn>Open the Play Zone</Btn></Link>} />
      <div role="note" className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden="true" /><p><strong>Milestone 1: interface only.</strong> The Play Zone backend is not connected, so nothing you change here is saved. Sections that will need it are marked “Awaiting backend”.</p></div>
      <div role="tablist" aria-label="Play Zone management" className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([id, label, Icon]) => <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors', tab === id ? 'border-primary bg-primary text-white' : 'border-edge-strong bg-glass hover:border-lav')}><Icon className="size-4" aria-hidden="true" />{label}</button>)}
      </div>
      <div role="tabpanel">
        {tab === 'overview' && <Overview />}
        {tab === 'enable' && <Enable />}
        {tab === 'order' && <Order />}
        {tab === 'media' && <Media />}
        {tab === 'players' && <Pending title="Players" text="Play Zone players are website accounts. Their accounts are managed under Registered users; Play Zone nicknames, bans and progress will be managed here." columns={['Player', 'Nickname', 'Games played', 'Joined', 'Status']} />}
        {tab === 'leaderboard' && <Pending title="Leaderboard management" text="View, hide or remove suspicious scores and reset a period. Available once scores are recorded." columns={['Rank', 'Player', 'Game', 'Score', 'Date']} />}
        {tab === 'achievements' && <List title="Achievements" items={plannedAchievements} hint="The planned achievements. Turning one off will hide it from players once the backend is connected." />}
        {tab === 'challenges' && <List title="Daily challenges" items={plannedChallenges} hint="The planned daily challenge types. Scheduling and rewards will be set here." />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'analytics' && <Analytics />}
      </div>
    </>
  )
}
