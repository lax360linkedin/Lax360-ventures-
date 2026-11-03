import { useSearchParams } from 'react-router-dom'
import { Clock, Mail, MessageCircle, Phone } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import PageHero from '../components/sections/PageHero.jsx'
import Ring360 from '../components/art/Ring360.jsx'
import EnquiryForm from '../components/sections/EnquiryForm.jsx'
import Button from '../components/ui/Button.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import BranchCards from '../components/sections/BranchCards.jsx'
import { branchSentence } from '../data/branches.js'
import { useSite } from '../hooks/useSite.js'
import { courses } from '../data/courses.js'
import { whatsappLink } from '../utils/whatsapp.js'

export default function Contact() {
  const site = useSite()
  const [params] = useSearchParams()
  const type = params.get('type') || 'project'
  const course = courses.find((c) => c.slug === params.get('course'))

  return (
    <PageContainer
      path="/contact"
      title="Contact"
      description="Discuss your project with LAX360 Ventures. Send an enquiry, or reach the team on WhatsApp, phone or email."
    >
      <PageHero eyebrow="Contact" art={<Ring360 className="h-auto w-full" />} title="Tell us what you need." lead="Describe your requirement and the team will follow up. Prefer to talk? Use WhatsApp or call." />

      <div className="wrap section grid gap-14 lg:grid-cols-12 lg:gap-16">
        <aside className="space-y-8 lg:col-span-4" aria-label="Contact details">
          <div>
            <h2 className="eyebrow text-lav">Talk now</h2>
            <ul className="mt-4 space-y-3 text-lg">
              <li><a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="link-underline inline-flex min-h-11 items-center gap-3 font-semibold"><MessageCircle className="size-5" aria-hidden="true" /> WhatsApp us</a></li>
              {site.phones.map((p) => <li key={p.tel}><a href={`tel:${p.tel}`} className="link-underline inline-flex min-h-11 items-center gap-3"><Phone className="size-5" aria-hidden="true" /> {p.display}</a></li>)}
              <li><a href={`mailto:${site.email}`} className="link-underline inline-flex min-h-11 items-center gap-3 break-all"><Mail className="size-5 shrink-0" aria-hidden="true" /> {site.email}</a></li>
            </ul>
          </div>
          {(site.address || site.mapLink || site.contactIntro || site.email2) && (
            <div>
              <h2 className="eyebrow text-lav">Visit or write</h2>
              {site.contactIntro && <p className="mt-4 text-soft">{site.contactIntro}</p>}
              {site.address && <address className="mt-4 whitespace-pre-line not-italic text-lg">{site.address}</address>}
              {site.email2 && <p className="mt-3"><a href={`mailto:${site.email2}`} className="link-underline break-all font-semibold">{site.email2}</a></p>}
              {site.mapLink && <p className="mt-3"><a href={site.mapLink} target="_blank" rel="noopener noreferrer" className="link-underline inline-flex min-h-11 items-center gap-2 font-semibold text-lav">Open in maps<span className="sr-only"> (opens in a new tab)</span></a></p>}
            </div>
          )}
          {site.responseTime && (
            <p className="flex gap-3 text-soft"><Clock className="mt-1 size-5 shrink-0" aria-hidden="true" /> We reply {site.responseTime}.</p>
          )}
          <div id="partners" className="border-t border-edge pt-6">
            <h2 className="font-display text-xl font-semibold">Partner with us</h2>
            <p className="mt-2 text-soft">Interested in a referral, white-label, technology or college partnership?</p>
            <div className="mt-4"><Button to="/contact?type=partnership" variant="secondary">Start a partnership enquiry</Button></div>
          </div>
        </aside>

        <section className="lg:col-span-8" aria-labelledby="form-title">
          <h2 id="form-title" className="h3 mb-6">Send an enquiry</h2>
          <div className="glass p-5 md:p-8">
            <EnquiryForm key={`${type}-${course?.slug}`} defaultType={type} presets={course ? { course: course.title } : {}} idPrefix="contact" source="contact" />
          </div>
        </section>
      </div>

      <section id="branches" className="wrap pb-20 md:pb-28" aria-labelledby="branches-title">
        <SectionHeading id="branches-title" eyebrow="Office locations" title="Visit our" gradient="branches." bot lead={`LAX360 Ventures has branches in ${branchSentence}.`} />
        <BranchCards className="mt-10" />
      </section>
    </PageContainer>
  )
}
