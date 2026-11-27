import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { StatusBadge, UpcomingIcon } from './UpcomingUI.jsx'
import { PROGRAMS, PROGRAM_BY_SLUG, STATUSES, isLive } from '../../data/upcomingServices.js'
import { useUpcoming, useUpcomingForProgram } from '../../hooks/useUpcoming.js'

/**
 * The upcoming service categories (CAD & Engineering Design, Robotics, Blockchain & Web 3.0) inside the partnership pages. They are listed under all three programs as PLANNED
 * additions with their status: they are never described as open divisions, and the wording says that registering interest is an enquiry and does not make anyone a partner.
 * Which categories and services appear under which program is set per item in Admin > Services.
 */
const NOTE = 'These service areas are under development and will be launched in the future. They are not open for franchise, authorized partner or referral applications yet. Registering interest is an enquiry: it does not make you a partner.'

/** Compact list for the sidebar under the division switcher. */
export function UpcomingSidebar({ category }) {
  const list = useUpcomingForProgram(PROGRAM_BY_SLUG[category])
  if (!list.length) return null
  return (
    <div className="mt-6 border-t border-edge pt-5">
      <p className="eyebrow mb-3 text-soft">Upcoming (not open yet)</p>
      <ul className="space-y-1">
        {list.map((c) => (
          <li key={c.slug}>
            <Link to={c.path} className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-glass">
              <span>{c.short}</span><StatusBadge status={c.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A section for a program or opportunity page: one card per upcoming category offered under the program, with its services and status. */
export function UpcomingSection({ category, id = 'upcoming-t' }) {
  const key = PROGRAM_BY_SLUG[category]
  const list = useUpcomingForProgram(key)
  const program = PROGRAMS.find((p) => p.key === key)
  if (!list.length) return null
  const anyLive = list.some((c) => isLive(c.status))
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="h2">Upcoming services under {program?.label}</h2>
      <p className="mt-4 max-w-3xl text-soft">{anyLive ? 'Services marked Available are open under this program; the others are planned. Registering interest is an enquiry and does not make you a partner.' : NOTE}</p>
      <ul className="mt-6 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-3">
        {list.map((c) => (
          <li key={c.slug} className="bg-night">
            <Link to={c.path} className="group flex h-full flex-col gap-3 p-6 transition-colors hover:bg-glass">
              <span className="flex items-start justify-between gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><UpcomingIcon item={c} className="size-5" /></span>
                <StatusBadge status={c.status} />
              </span>
              <span className="font-display text-lg font-semibold leading-tight">{c.name}</span>
              {c.services.length > 0 && <span className="text-sm text-soft">{c.services.map((s) => s.name).join(' · ')}</span>}
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-lav">{isLive(c.status) ? 'Learn more' : 'Register interest'}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The hub page table: which upcoming category is planned under which program (as an accessible table, with the status of each). */
export function UpcomingMatrix() {
  const all = useUpcoming()
  if (!all.length) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <caption className="sr-only">Upcoming service categories and the partnership programs they are planned under</caption>
        <thead>
          <tr className="border-b border-edge-strong">
            <th scope="col" className="py-3 pr-4 font-semibold">Upcoming service</th>
            <th scope="col" className="py-3 pr-4 font-semibold">Status</th>
            {PROGRAMS.map((p) => <th key={p.key} scope="col" className="py-3 pr-4 font-semibold">{p.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {all.map((c) => (
            <tr key={c.slug} className="border-b border-edge align-top">
              <th scope="row" className="py-3 pr-4 font-semibold"><Link to={c.path} className="link-underline">{c.name}</Link><span className="mt-1 block text-xs font-normal text-soft">{c.services.map((s) => s.name).join(' · ')}</span></th>
              <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
              {PROGRAMS.map((p) => <td key={p.key} className="py-3 pr-4 text-soft">{c.partners[p.key] ? (isLive(c.status) ? 'Open' : 'Planned') : 'Not planned'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 max-w-3xl text-sm text-soft">{NOTE} ({STATUSES.coming_soon.label} and {STATUSES.under_development.label} mean exactly that.)</p>
    </div>
  )
}
