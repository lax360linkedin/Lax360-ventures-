import { Link, useParams } from 'react-router-dom'
import { ChevronRight, Network, MapPin } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import SocialContact from './SocialContact.jsx'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, useFetch } from '../ui.jsx'

function Crumbs({ trail }) {
  return (
    <nav aria-label="Where you are" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
      <span className="text-soft">Admin Panel</span>
      {trail.map((t, i) => (
        <span key={t.label} className="flex items-center gap-1.5"><ChevronRight className="size-3.5 text-soft" aria-hidden="true" />
          {t.to && i < trail.length - 1 ? <Link to={t.to} className="font-semibold text-lav underline-offset-2 hover:underline">{t.label}</Link> : <span className="font-semibold" aria-current="page">{t.label}</span>}
        </span>
      ))}
    </nav>
  )
}

const plural = (n) => `${n} item${n === 1 ? '' : 's'}`

/** Branches > Select branch > Social media & contact details (that branch's own list). */
export function BranchSocial() {
  const { slug } = useParams()
  const q = useFetch(() => api('/api/admin/channels/owners'), [])
  if (q.loading && !q.data) return <Spinner />
  if (q.error && !q.data) return <ErrorState error={q.error} onRetry={q.reload} />
  const branch = q.data.branches.find((b) => b.slug === slug)
  if (!branch) return <Card><EmptyState title="That branch is not available"><Link to="/company-admin/branches" className="underline">Back to Branch locations</Link></EmptyState></Card>
  return (
    <>
      <Crumbs trail={[{ label: 'Branches', to: '/company-admin/branches' }, { label: branch.city, to: '/company-admin/branches' }, { label: 'Social media & contact' }]} />
      <SocialContact key={slug} owner={{ type: 'branch', ref: slug, label: `${branch.city} branch`, viewPath: '/contact#branches' }} />
    </>
  )
}

/** Our Network > Select partner (this list) > Social media & contact details (that partner's own list). */
export function PartnerSocial() {
  const { slug } = useParams()
  const q = useFetch(() => api('/api/admin/channels/owners'), [])
  if (q.loading && !q.data) return <Spinner />
  if (q.error && !q.data) return <ErrorState error={q.error} onRetry={q.reload} />
  const { partners, branches } = q.data
  if (slug) {
    const partner = partners.find((p) => p.slug === slug)
    if (!partner) return <Card><EmptyState title="That partner is not available"><Link to="/company-admin/network/social" className="underline">Back to the partner list</Link></EmptyState></Card>
    return (
      <>
        <Crumbs trail={[{ label: 'Our network', to: '/company-admin/network' }, { label: 'Partners', to: '/company-admin/network/social' }, { label: partner.title }, { label: 'Social media & contact' }]} />
        <SocialContact key={slug} owner={{ type: 'partner', ref: slug, label: partner.title, viewPath: `/our-network/${slug}` }} />
      </>
    )
  }
  return (
    <>
      <Crumbs trail={[{ label: 'Our network', to: '/company-admin/network' }, { label: 'Partners: social media & contact' }]} />
      <PageHeader title="Partners: social media & contact" lead="Choose a company or partner to manage its own social media links and contact details. Each partner has an independent list that appears on its profile page; it never mixes with the LAX360 links or another partner's. Partners and branches you add later appear here automatically." />
      {partners.length === 0 && <Card><EmptyState title="No partners yet">Add companies and partners under Our network first.</EmptyState></Card>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {partners.map((p) => (
          <li key={p.slug}>
            <Link to={`/company-admin/network/social/${p.slug}`} className="block h-full">
              <Card className="flex h-full items-center gap-3 !p-4 transition-colors hover:border-lav">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-lav"><Network className="size-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.title}</p><p className="text-xs text-soft">{plural(p.count)}</p></div>
                <Badge value={p.status} /><ChevronRight className="size-5 shrink-0 text-soft" aria-hidden="true" />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mb-3 mt-10 font-display text-lg font-semibold">Branches</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {branches.map((b) => (
          <li key={b.slug}>
            <Link to={`/company-admin/branches/${b.slug}/social`} className="block h-full">
              <Card className="flex h-full items-center gap-3 !p-4 transition-colors hover:border-lav">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-lav"><MapPin className="size-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{b.city}</p><p className="text-xs text-soft">{plural(b.count)}</p></div><ChevronRight className="size-5 shrink-0 text-soft" aria-hidden="true" />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
