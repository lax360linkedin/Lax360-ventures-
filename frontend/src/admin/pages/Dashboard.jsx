import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, CalendarCheck, Inbox, MessageSquareWarning, UserRound } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { useAdmin } from '../AdminApp.jsx'
import { Badge, Btn, Card, EmptyState, ErrorState, Field, Input, PageHeader, Spinner, fmtDate, label, useFetch } from '../ui.jsx'

const iso = (d) => d.toISOString().slice(0, 10)
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d) }

function Stat({ icon: Icon, name, value, hint, to }) {
  const body = (
    <>
      <div className="flex items-center justify-between text-soft"><span className="text-sm font-medium">{name}</span><Icon className="size-4" aria-hidden="true" /></div>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-soft">{hint}</p>}
    </>
  )
  return to ? <Link to={to}><Card className="h-full transition-colors hover:border-lav">{body}</Card></Link> : <Card className="h-full">{body}</Card>
}

/** Bars for a per-day series (plain SVG, no chart library). Screen readers get the numbers as a list. */
function Bars({ title, days, values }) {
  const max = Math.max(1, ...values)
  const w = 100 / Math.max(values.length, 1)
  return (
    <Card>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-soft">Total in range: {values.reduce((a, b) => a + b, 0)}</p>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-3 h-24 w-full" role="img" aria-label={`${title} per day, ${days[0]} to ${days[days.length - 1]}`}>
        {values.map((v, i) => <rect key={days[i]} x={i * w + w * 0.12} width={w * 0.76} y={40 - (v / max) * 38} height={Math.max((v / max) * 38, v ? 1 : 0.4)} rx="0.6" className={v ? 'fill-primary' : 'fill-glass-strong'}><title>{`${days[i]}: ${v}`}</title></rect>)}
      </svg>
      <div className="mt-1 flex justify-between text-[0.7rem] text-soft"><span>{days[0]}</span><span>{days[days.length - 1]}</span></div>
      <ul className="sr-only">{values.map((v, i) => <li key={days[i]}>{days[i]}: {v}</li>)}</ul>
    </Card>
  )
}

function Distribution({ title, counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <Card>
      <h3 className="text-sm font-semibold">{title}</h3>
      {total === 0 ? <p className="mt-3 text-sm text-soft">No records yet.</p> : (
        <ul className="mt-3 space-y-2">
          {Object.entries(counts).map(([k, n]) => (
            <li key={k}>
              <div className="flex justify-between text-sm"><span>{label(k)}</span><span className="tabular-nums text-soft">{n}</span></div>
              <div className="mt-1 h-2 rounded-full bg-glass-strong" role="presentation"><div className="h-2 rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(n / total) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const { me } = useAdmin()
  const [range, setRange] = useState({ from: daysAgo(29), to: iso(new Date()) })
  const [draft, setDraft] = useState(range)
  const { data: d, error, loading, reload } = useFetch(() => api(`/api/admin/dashboard?from=${range.from}&to=${range.to}`), [range.from, range.to])
  const apply = (e) => { e.preventDefault(); if (draft.from && draft.to && draft.from <= draft.to) setRange(draft) }
  const preset = (n) => { const r = { from: daysAgo(n - 1), to: iso(new Date()) }; setDraft(r); setRange(r) }

  return (
    <>
      <PageHeader title={`Welcome, ${me.user.full_name.split(' ')[0]}`} lead="Live numbers from the database. Totals are all-time; charts and “in range” figures follow the dates below." />
      <form onSubmit={apply} className="mb-6 flex flex-wrap items-end gap-3" aria-label="Date range">
        <Field label="From"><Input type="date" max={draft.to} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></Field>
        <Field label="To"><Input type="date" min={draft.from} max={iso(new Date())} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></Field>
        <Btn type="submit">Apply</Btn>
        <span className="flex gap-2"><Btn kind="ghost" onClick={() => preset(7)}>7 days</Btn><Btn kind="ghost" onClick={() => preset(30)}>30 days</Btn><Btn kind="ghost" onClick={() => preset(90)}>90 days</Btn></span>
      </form>

      {error && !d && <ErrorState error={error} onRetry={reload} />}
      {loading && !d && <Spinner />}
      {d && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {d.enquiries && <Stat icon={Inbox} name="Total enquiries" value={d.enquiries.total} hint={`${d.enquiries.in_range} in range · ${d.enquiries.archived} archived`} to="/company-admin/enquiries" />}
            {d.enquiries && <Stat icon={Inbox} name="New / open" value={`${d.enquiries.new} / ${d.enquiries.open}`} hint="New · New + In progress" to="/company-admin/enquiries" />}
            {d.demos && <Stat icon={CalendarCheck} name="Demo requests" value={d.demos.total} hint={`${d.demos.pending} pending · ${d.demos.in_range} in range`} to="/company-admin/demos" />}
            <Stat icon={UserRound} name="Customer accounts" value={d.customers.total} hint="Registered website users" />
            {d.chatbot && <Stat icon={Bot} name="Chatbot conversations" value={d.chatbot.conversations_total} hint={`${d.chatbot.conversations_in_range} in range`} to="/company-admin/chatbot" />}
            {d.chatbot && <Stat icon={MessageSquareWarning} name="AI errors (range)" value={d.chatbot.ai_errors_in_range} hint={`of ${d.chatbot.ai_requests_in_range} AI requests`} to="/company-admin/chatbot" />}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {d.enquiries && <Bars title="Enquiries per day" days={d.days} values={d.enquiries.series} />}
            {d.demos && <Bars title="Demo requests per day" days={d.days} values={d.demos.series} />}
            {d.chatbot && <Bars title="Chat conversations per day" days={d.days} values={d.chatbot.series} />}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {d.enquiries && <Distribution title="Enquiry status distribution" counts={d.enquiries.by_status} />}
            {d.demos && <Distribution title="Demo request status" counts={d.demos.by_status} />}
            <Card>
              <h3 className="text-sm font-semibold">Recent admin activity</h3>
              {d.recent_activity.length === 0 ? <p className="mt-3 text-sm text-soft">No activity recorded yet.</p> : (
                <ul className="mt-3 divide-y divide-edge text-sm">
                  {d.recent_activity.map((a) => <li key={a.id} className="flex items-center justify-between gap-2 py-2"><span><span className="font-medium">{a.action}</span><span className="block text-xs text-soft">{a.admin} · {fmtDate(a.created_at)}</span></span><Badge value={a.status} /></li>)}
                </ul>
              )}
            </Card>
          </div>

          {d.enquiries && (
            <Card className="mt-6">
              <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Recent enquiries</h3><Link to="/company-admin/enquiries" className="text-sm font-semibold text-lav hover:underline">View all</Link></div>
              {d.enquiries.recent.length === 0 ? <EmptyState title="No enquiries yet">They appear here when someone uses the website's contact form.</EmptyState> : (
                <ul className="mt-2 divide-y divide-edge text-sm">
                  {d.enquiries.recent.map((e) => <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span><span className="font-semibold">{e.name}</span><span className="block text-xs text-soft">{e.subject} · {fmtDate(e.created_at)}</span></span><Badge value={e.status} /></li>)}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}
    </>
  )
}
