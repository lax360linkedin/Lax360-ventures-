import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, FileSpreadsheet, Inbox, RefreshCcw, Save, Wrench } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Badge, Btn, Card, EmptyState, ErrorState, Field, Input, PageHeader, Spinner, Toggle, fmtDate, useFetch, useToast } from '../ui.jsx'

/**
 * Enquiry center: every form submitted on the website, grouped into enquiry categories, with the place where each is handled, and the Google Sheets copy (worksheet per category:
 * names, on/off, setup, retry). The database is the source of truth; the sheet is a copy for reporting.
 */
// where a category's records are handled: contact-form enquiries in Enquiries & leads, partnership applications in Partnerships, demo requests in Demo requests
const WHERE = {
  franchise: [['Partnership applications', '/company-admin/partnerships/applications?category=franchise'], ['Contact-form enquiries', '/company-admin/enquiries?category=franchise']],
  authorized: [['Partnership applications', '/company-admin/partnerships/applications?category=authorized'], ['Contact-form enquiries', '/company-admin/enquiries?category=authorized']],
  referral: [['Partnership applications', '/company-admin/partnerships/applications?category=referral']],
  upcoming: [['Interest forms', '/company-admin/enquiries?category=upcoming'], ['Partnership applications', '/company-admin/partnerships/applications']],
  consultation: [['Demo requests', '/company-admin/demos'], ['Partnership applications', '/company-admin/partnerships/applications']],
}
const whereOf = (k) => WHERE[k] || [['Open the list', `/company-admin/enquiries?category=${k}`]]

function Stat({ label, value, tone }) {
  return <div className="rounded-xl border border-edge bg-glass px-3 py-2"><p className="text-xs uppercase tracking-wide text-soft">{label}</p><p className={`font-display text-xl font-semibold tabular-nums ${tone || ''}`}>{value}</p></div>
}

function Overview() {
  const { data, error, loading, reload } = useFetch(() => api('/api/admin/enquiry-center', { timeoutMs: 30000 }), [])
  if (loading && !data) return <Spinner />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const t = data.totals
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="All submissions" value={t.submissions} /><Stat label="New (not handled)" value={t.new} tone="text-lav" /><Stat label="Last 7 days" value={t.last7} /><Stat label="Last 30 days" value={t.last30} />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.categories.map((c) => (
          <li key={c.key}>
            <Card className="h-full">
              <div className="flex items-start justify-between gap-2"><h3 className="font-display text-base font-semibold leading-tight">{c.label}</h3>{c.new > 0 && <Badge value="new" text={`${c.new} new`} />}</div>
              <p className="mt-1 text-xs text-soft">{c.purpose}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm"><span><b className="block text-lg tabular-nums">{c.total}</b>total</span><span><b className="block text-lg tabular-nums">{c.last30}</b>30 days</span><span><b className="block text-lg tabular-nums">{c.last7}</b>7 days</span></div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-edge pt-3 text-sm">
                {whereOf(c.key).map(([l, to]) => <li key={to}><Link to={to} className="inline-flex min-h-8 items-center gap-1 text-lav hover:underline">{l}<ArrowUpRight className="size-3.5" aria-hidden="true" /></Link></li>)}
              </ul>
            </Card>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-soft">A partnership application that also asks for a consultation or names an upcoming service is counted in those categories too, so category totals can add up to more than All submissions.</p>
      <Card className="mt-5">
        <h3 className="font-display text-base font-semibold">Recent submissions</h3>
        {data.recent.length === 0 ? <p className="mt-2 text-sm text-soft">No submissions yet.</p> : (
          <ul className="mt-2 divide-y divide-edge text-sm">
            {data.recent.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><strong>{r.name}</strong> · <span className="text-soft">{r.category_label}{r.reference ? ` · ${r.reference}` : ''}</span></span><span className="flex items-center gap-2"><Badge value={r.status === 'new' || r.status === 'pending' ? 'new' : 'draft'} text={r.status.replace(/_/g, ' ')} /><span className="text-xs text-soft">{fmtDate(r.created_at)}</span></span></li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

function Sheets() {
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => api('/api/admin/enquiry-center/sheets'), [])
  const [tabs, setTabs] = useState(null)
  const [busy, setBusy] = useState('')
  useEffect(() => { if (data) setTabs(Object.fromEntries(data.tabs.map((t) => [t.key, { name: t.name, enabled: t.enabled }]))) }, [data])
  if (loading && !data) return <Spinner />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!tabs) return <Spinner />
  const dirty = data.tabs.some((t) => tabs[t.key].name !== t.name || tabs[t.key].enabled !== t.enabled)
  const run = async (key, fn, ok) => { setBusy(key); try { const r = await fn(); toast(typeof ok === 'function' ? ok(r) : ok); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy('') } }
  const unsynced = Object.values(data.unsynced || {}).reduce((a, b) => a + b, 0)
  return (
    <>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-semibold"><FileSpreadsheet className="size-5 text-lav" aria-hidden="true" />Google Sheets copy {data.configured ? <Badge value="published" text="Connected" /> : <Badge value="draft" text="Not configured" />}</p>
            <p className="mt-1 text-sm text-soft">{data.configured ? `Spreadsheet ${data.spreadsheet}. Share it (Editor) with ${data.service_account || 'the service account'}. ` : 'Set GOOGLE_SHEETS_SPREADSHEET_ID and the service account on the server (the key is never shown here). '}The database is always saved first; a sheet problem never stops a form from being submitted.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn loading={busy === 'setup'} disabled={!data.configured} onClick={() => run('setup', () => api('/api/admin/enquiry-center/sheets/setup', { method: 'POST', timeoutMs: 60000 }), (r) => `Worksheets checked: ${Object.keys(r.done).length}`)}><Wrench className="size-4" aria-hidden="true" />Create missing worksheets</Btn>
            <Btn loading={busy === 'retry'} disabled={!data.configured || unsynced === 0} onClick={() => run('retry', () => api('/api/admin/enquiry-center/sheets/retry', { method: 'POST', timeoutMs: 120000 }), (r) => `Copied ${r.synced} submission(s); ${r.failed} still failing`)}><RefreshCcw className="size-4" aria-hidden="true" />Retry not-yet-copied ({unsynced})</Btn>
          </div>
        </div>
      </Card>
      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <caption className="sr-only">Worksheet for each enquiry category</caption>
            <thead><tr className="border-b border-edge text-xs uppercase tracking-wide text-soft"><th scope="col" className="px-4 py-3">Category</th><th scope="col" className="px-4 py-3">Worksheet name</th><th scope="col" className="px-4 py-3">Copy</th><th scope="col" className="px-4 py-3">Copied</th><th scope="col" className="px-4 py-3">Failed</th><th scope="col" className="px-4 py-3">Columns</th></tr></thead>
            <tbody>
              {data.tabs.map((t) => (
                <tr key={t.key} className="border-b border-edge align-top">
                  <th scope="row" className="px-4 py-3 font-semibold">{t.label}</th>
                  <td className="px-4 py-3"><Input aria-label={`Worksheet name for ${t.label}`} value={tabs[t.key].name} maxLength={100} onChange={(e) => setTabs({ ...tabs, [t.key]: { ...tabs[t.key], name: e.target.value } })} /><span className="mt-1 block text-xs text-soft">Default: {t.default_name}</span></td>
                  <td className="px-4 py-3"><Toggle checked={tabs[t.key].enabled} onChange={(v) => setTabs({ ...tabs, [t.key]: { ...tabs[t.key], enabled: v } })} label={tabs[t.key].enabled ? 'On' : 'Off'} /></td>
                  <td className="px-4 py-3 tabular-nums">{t.synced}</td>
                  <td className="px-4 py-3 tabular-nums">{t.failed > 0 ? <span className="font-semibold text-error">{t.failed}</span> : 0}</td>
                  <td className="px-4 py-3"><details><summary className="cursor-pointer text-lav">{t.columns.length} columns</summary><p className="mt-1 max-w-md text-xs text-soft">{t.columns.join(' · ')}</p></details></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-4 py-3">
          <p className="text-xs text-soft">Rows are only ever added: existing worksheets, headers and data are never changed. Renaming a worksheet starts a new one; rows already copied stay where they are.</p>
          <Btn kind="primary" loading={busy === 'save'} disabled={!dirty} onClick={() => run('save', () => api('/api/admin/enquiry-center/sheets', { method: 'PUT', body: { tabs } }), 'Worksheet settings saved')}><Save className="size-4" aria-hidden="true" />Save worksheet settings</Btn>
        </div>
      </Card>
      <Card className="mt-4">
        <h3 className="font-display text-base font-semibold">Copies that did not reach the sheet</h3>
        {data.failures.length === 0 ? <p className="mt-2 flex items-center gap-2 text-sm text-soft"><CheckCircle2 className="size-4 text-success" aria-hidden="true" />Nothing waiting: every copy that was attempted is in the spreadsheet.</p> : (
          <ul className="mt-2 divide-y divide-edge text-sm">
            {data.failures.map((f) => <li key={f.id} className="py-2"><strong>{f.label}</strong> → {f.tab} <span className="text-soft">· {f.kind} {f.record_id.slice(0, 8)} · {f.attempts} attempt(s) · {fmtDate(f.updated_at)}</span>{f.error && <p className="text-xs text-error">{f.error}</p>}</li>)}
          </ul>
        )}
      </Card>
    </>
  )
}

export default function EnquiryCenter() {
  const [tab, setTab] = useState('overview')
  return (
    <>
      <PageHeader title="Enquiry center" lead="Every form on the website in one place: contact forms, the intro contact card, upcoming-service interest, franchise, authorized and referral partner enquiries, demo and consultation requests. Handle the records in Enquiries & leads and Partnerships; manage the Google Sheets copy here." />
      <div role="tablist" aria-label="Enquiry center sections" className="mb-5 flex gap-2">
        {[['overview', 'Categories & activity', Inbox], ['sheets', 'Google Sheets', FileSpreadsheet]].map(([k, l, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${tab === k ? 'border-transparent bg-primary text-white' : 'border-edge bg-glass text-soft hover:text-fg'}`}><Icon className="size-4" aria-hidden="true" />{l}</button>
        ))}
      </div>
      {tab === 'overview' ? <Overview /> : <Sheets />}
    </>
  )
}
