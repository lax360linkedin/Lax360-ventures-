import { Mail, MessageCircle, Phone } from 'lucide-react'
import EnquiryForm from './EnquiryForm.jsx'
import { useSite } from '../../hooks/useSite.js'
import { whatsappLink } from '../../utils/whatsapp.js'

/** Closing ink band: an oversized call to talk, direct contact lines and a short enquiry form. */
export default function ContactCta({ defaultType = 'project', title = 'Tell us what you need.' }) {
  const site = useSite()
  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden border-t border-edge bg-gradient-to-b from-base2 to-deep/50">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-0 size-[30rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.3), transparent)' }} />
      <div className="wrap section relative grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-5 flex items-center gap-3 text-soft"><span aria-hidden="true" className="h-px w-10 bg-lav" />Let&apos;s talk</p>
          <h2 id="cta-title" className="h1 !text-[clamp(2.75rem,5.4vw,5rem)]"><span className="text-gradient">{title}</span></h2>
          <p className="lead mt-6 text-soft">
            Have a business challenge to solve? Describe it and we&apos;ll follow up{site.responseTime ? ` ${site.responseTime}` : ''}.
          </p>
          <ul className="mt-8 divide-y divide-edge border-y border-edge text-lg">
            <li><a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="group flex min-h-14 items-center gap-3 hover:text-white"><MessageCircle className="size-5" aria-hidden="true" /> WhatsApp us <span aria-hidden="true" className="ml-auto transition-transform group-hover:translate-x-1">→</span></a></li>
            <li><a href={`mailto:${site.email}`} className="group flex min-h-14 items-center gap-3 break-all hover:text-white"><Mail className="size-5 shrink-0" aria-hidden="true" /> {site.email}</a></li>
            {site.phones.map((p) => (
              <li key={p.tel}><a href={`tel:${p.tel}`} className="group flex min-h-14 items-center gap-3 hover:text-white"><Phone className="size-5" aria-hidden="true" /> {p.display}{p.label && <span className="text-sm opacity-80">({p.label})</span>}</a></li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-7">
          <div className="glass p-5 md:p-8"><EnquiryForm tone="dark" compact idPrefix="cta" defaultType={defaultType} source="home-cta" /></div>
        </div>
      </div>
    </section>
  )
}
