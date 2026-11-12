import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, CalendarCheck, FileText, Image as ImageIcon, Inbox, MessageSquareWarning, Palette, UserRound, Users } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { useAdmin } from '../AdminApp.jsx'
import { Badge, Btn, Card, EmptyState, ErrorState, Field, Input, PageHeader, Spinner, fmtDate, label, useFetch } from '../ui.jsx'

const iso = (d) => d.toISOString().slice(0, 10)
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d) }

const PAGE_NAMES = { '': 'Home page', about: 'About', services: 'Services', products: 'Products', industries: 'Industries', insights: 'Insights', 'our-network': 'Our Network', 'our-team': 'Our Team', work: 'Work', career: 'Careers', contact: 'Contact' }
const PAGE_ORDER = ['', 'about', 'services', 'products', 'industries', 'insights', 'our-network', 'our-team', 'work', 'career', 'contact', '*']

/** Your website, page by page: what can be edited on each public page, how much is live and how much is waiting as a draft. */
function WebsitePages() {
  const content = useFetch(() => api('/api/admin/content/kinds').catch(() => null), [])
  const media = useFetch(() => api('/api/admin/media?page_size=1').catch(() => null), [])
  if (!content.data) return null
  const pages = {}
  content.data.kinds.forEach((k) => {
    const site = k.group === 'Navigation & SEO'
    const key = site ? '*' : (k.preview_path || '/').split('#')[0].replace(/^\//, '').split('/')[0]
    const c = content.data.counts[k.kind]
    pages[key] = pages[key] || { kinds: [], published: 0, draft: 0 }
    pages[key].kinds.push(k)
    pages[key].published += c.published
    pages[key].draft += c.draft
  })
  const keys = PAGE_ORDER.filter((p) => pages[p])
  return (
    <section className="mt-8" aria-labelledby="pages-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h2 id="pages-title" className="font-display text-xl font-semibold">Manage your website</h2><p className="text-sm text-soft">Every public page and what you can edit on it. Open a page to change its text, images, lists and settings.</p></div>
        <Link to="/company-admin/content" className="text-sm font-semibold text-lav hover:underline">All content</Link>
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {keys.map((key) => {
          const p = pages[key]
          const first = p.kinds[0]
          return (
            <li key={key}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">{key === '*' ? 'Site-wide (menus, SEO, social)' : PAGE_NAMES[key] || key}</h3>
                  {p.draft > 0 && <Badge value="draft" text={`${p.draft} draft${p.draft === 1 ? '' : 's'}`} />}
                </div>
                <p className="mt-1 text-xs text-soft">{p.published} published · {p.published + p.draft} total</p>
                <ul className="mt-3 flex-1 space-y-1 text-sm">
                  {p.kinds.slice(0, 6).map((k) => <li key={k.kind}><Link to={`/company-admin/content?kind=${k.kind}`} className="inline-flex min-h-8 items-center gap-1.5 text-soft hover:text-lav hover:underline">{k.label}<span className="text-xs opacity-70">({content.data.counts[k.kind].published}/{content.data.counts[k.kind].published + content.data.counts[k.kind].draft})</span></Link></li>)}
                  {p.kinds.length > 6 && <li className="text-xs text-soft">+ {p.kinds.length - 6} more</li>}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/company-admin/content?kind=${first.kind}`}><Btn kind="primary">Manage</Btn></Link>
                  {key !== '*' && <a href={key ? `/${key}` : '/'} target="_blank" rel="noopener noreferrer"><Btn>View page</Btn></a>}
                </div>
              </Card>
            </li>
          )
        })}
        {media.data && (
          <li><Card className="flex h-full flex-col"><div className="flex items-center gap-2"><ImageIcon className="size-5 text-lav" aria-hidden="true" /><h3 className="font-display text-lg font-semibold">Media library</h3></div>
            <p className="mt-1 flex-1 text-sm text-soft">{media.data.total ?? media.data.items?.length ?? 0} files. Upload images, PDFs and videos once and reuse them anywhere.</p>
            <div className="mt-4"><Link to="/company-admin/media"><Btn kind="primary">Open library</Btn></Link></div></Card></li>
        )}
      </ul>
    </section>
  )
}

/** Registration numbers at a glance (only for administrators who may manage registered users): the full charts, filters and export are in Registered users. */
function RegisteredUsersSummary() {
  const { can } = useAdmin()
  const q = useFetch(() => (can('customers') ? api('/api/admin/customers/stats?days=14') : Promise.resolve(null)).catch(() => null), [])
  const s = q.data
  if (!s) return null
  return (
    <section aria-label="Registered users" className="mb-6">
      <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Registered users</h2><Link to="/company-admin/customers" className="text-sm font-semibold underline">Open the module</Link></div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <li><Stat icon={Users} name="Total registered" value={s.total} hint={`${s.active} active`} to="/company-admin/customers" /></li>
        <li><Stat icon={Users} name="Students" value={s.categories.student} to="/company-admin/customers" /></li>
        <li><Stat icon={Users} name="Working professionals" value={s.categories.professional} to="/company-admin/customers" /></li>
        <li><Stat icon={Users} name="Other" value={s.categories.other} to="/company-admin/customers" /></li>
        <li><Stat icon={Users} name="New this week" value={s.new.week} hint={`${s.new.today} today`} to="/company-admin/customers" /></li>
      </ul>
    </section>
  )
}

/** Shortcuts to the things administrators do most. Only what the account may use is shown. */
function QuickActions() {
  const { can } = useAdmin()
  const actions = [
    can('enquiries') && { to: '/company-admin/enquiries', label: 'Review new enquiries', icon: Inbox },
    can(['content', 'services', 'careers', 'navigation']) && { to: '/company-admin/content?kind=product', label: 'Edit products', icon: FileText },
    can(['content', 'services', 'careers', 'navigation']) && { to: '/company-admin/content?kind=job', label: 'Post a job opening', icon: FileText },
    can('media') && { to: '/company-admin/media', label: 'Upload media', icon: ImageIcon },
    can('settings') && { to: '/company-admin/settings', label: 'Change website theme', icon: Palette },
  ].filter(Boolean)
  if (!actions.length) return null
  return (
    <section aria-label="Quick actions" className="mb-6 flex flex-wrap gap-2">
      {actions.map(({ to, label: text, icon: Icon }) => <Link key={to} to={to} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-edge-strong bg-glass px-4 text-sm font-semibold transition-colors hover:border-lav"><Icon className="size-4 text-lav" aria-hidden="true" />{text}</Link>)}
    </section>
  )
}

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
      <QuickActions />
      <RegisteredUsersSummary />
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
          <WebsitePages />
        </div>
      )}
    </>
  )
}
