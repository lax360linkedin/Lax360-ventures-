import { useSearchParams } from 'react-router-dom'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import Ring360 from '../components/art/Ring360.jsx'
import EnquiryForm from '../components/sections/EnquiryForm.jsx'
import LeadForm from '../components/contact/LeadForm.jsx'
import SocialIcon from '../components/layout/SocialIcon.jsx'
import Button from '../components/ui/Button.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import BranchCards from '../components/sections/BranchCards.jsx'
import { branchSentence } from '../data/branches.js'
import { useSite, useSocial } from '../hooks/useSite.js'
import { useContactPageText } from '../hooks/useCmsPages.js'
import { courses } from '../data/courses.js'
import { whatsappLink } from '../utils/whatsapp.js'

// Business enquiries use the full lead form; the other kinds (careers, partnerships, courses, workshops, general questions) keep the simple form they always had.
const LEAD_TYPES = { project: [], quote: [], ai: ['ai-solutions'], 'website-app': ['website-development'], marketing: ['digital-marketing'] }

export default function Contact() {
  const site = useSite()
  const social = useSocial()
  const page = useContactPageText()
  const [params] = useSearchParams()
  const type = params.get('type') || 'quote'
  const course = courses.find((c) => c.slug === params.get('course'))
  const lead = type in LEAD_TYPES && !course

  return (
    <PageContainer
      path="/contact"
      title="Contact"
      description="Tell LAX360 Pvt Ltd about your business and project. Get a quote for software, AI, automation and digital marketing, or reach the team on WhatsApp, phone or email."
    >
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-edge">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-24 size-[34rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.28), transparent)' }} />
        <div className="wrap relative grid items-center gap-10 pb-12 pt-10 md:pb-16 md:pt-14 lg:grid-cols-12 lg:gap-12">
          <Reveal y={12} className="lg:col-span-7">
            <p className="eyebrow mb-6 flex items-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-10 bg-current" />{page.hero_eyebrow || 'Contact us'}</p>
            <h1 className="h1 !text-[clamp(2.5rem,5.6vw,5.25rem)]">{page.hero_title || <>Let&apos;s Build <span className="text-gradient">Something Great</span> Together.</>}</h1>
            <p className="lead mt-7 max-w-2xl text-soft">
              {page.hero_lead || `LAX360 Pvt Ltd brings software, AI, automation and digital growth together under one team, with branches in ${branchSentence}. Tell us about your business and what you want to achieve, and we will come back with a clear next step.`}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href="#contact-info" variant="secondary">Contact Us</Button>
              <Button href="#enquiry" arrow>Get a Quote</Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-base">
              {site.phones.slice(0, 2).map((p) => <li key={p.tel}><a href={`tel:${p.tel}`} className="link-underline inline-flex min-h-11 items-center gap-2"><Phone className="size-4 text-lav" aria-hidden="true" />{p.display}</a></li>)}
              <li><a href={`mailto:${site.email}`} className="link-underline inline-flex min-h-11 items-center gap-2 break-all"><Mail className="size-4 shrink-0 text-lav" aria-hidden="true" />{site.email}</a></li>
              <li><a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="link-underline inline-flex min-h-11 items-center gap-2"><MessageCircle className="size-4 text-lav" aria-hidden="true" />WhatsApp<span className="sr-only"> (opens in a new tab)</span></a></li>
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="hidden lg:col-span-5 lg:block"><div className="glass p-6"><Ring360 className="h-auto w-full" /></div></Reveal>
        </div>
      </section>

      {/* Enquiry */}
      <section id="enquiry" className="wrap section scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="form-title">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <SectionHeading id="form-title" eyebrow={lead ? 'Get a quote' : 'Send an enquiry'} title={page.form_title || (lead ? 'Tell us about' : 'Send us')} gradient={page.form_title ? undefined : lead ? 'your project.' : 'a message.'} lead={page.form_lead || (lead ? 'A few short steps help us understand your business and requirements, so our reply is useful from the first message.' : 'Describe your requirement and the team will follow up.')} />
            <ul className="mt-8 space-y-3 text-soft">
              {['Takes about three minutes', 'Review everything before you send', 'Your details are used only to respond to you'].map((t) => <li key={t} className="flex items-start gap-2.5"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-lav" />{t}</li>)}
            </ul>
            <div id="partners" className="mt-10 border-t border-edge pt-6">
              <h2 className="font-display text-xl font-semibold">Partner with us</h2>
              <p className="mt-2 text-soft">Interested in a referral, white-label, technology or college partnership?</p>
              <div className="mt-4"><Button to="/contact?type=partnership" variant="secondary">Start a partnership enquiry</Button></div>
            </div>
          </div>
          <div className="lg:col-span-8">
            <div className="glass p-5 md:p-8">
              {lead
                ? <LeadForm key={type} defaultType={type === 'quote' ? 'quote' : 'project'} initialMains={LEAD_TYPES[type]} />
                : <EnquiryForm key={`${type}-${course?.slug}`} defaultType={type} presets={course ? { course: course.title } : {}} idPrefix="contact" source="contact" />}
            </div>
          </div>
        </div>
      </section>

      {/* Contact details */}
      <section id="contact-info" className="border-y border-edge bg-base2/50 scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="info-title">
        <div className="wrap section">
          <SectionHeading id="info-title" eyebrow="Contact information" title={page.info_title || 'Reach us'} gradient={page.info_title ? undefined : 'directly.'} lead={page.info_lead || site.contactIntro || 'Prefer to talk or write? Use any of these.'} />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal as="li" className="glass-flat lift p-6"><MessageCircle className="size-6 text-lav" aria-hidden="true" /><h3 className="mt-3 font-display text-lg font-semibold">WhatsApp</h3><a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center font-semibold text-lav hover:underline">Chat with us<span className="sr-only"> (opens in a new tab)</span></a></Reveal>
            <Reveal as="li" delay={0.05} className="glass-flat lift p-6"><Phone className="size-6 text-lav" aria-hidden="true" /><h3 className="mt-3 font-display text-lg font-semibold">Phone</h3>{site.phones.map((p) => <p key={p.tel}><a href={`tel:${p.tel}`} className="inline-flex min-h-11 items-center hover:text-lav">{p.display}{p.label && <span className="ml-1 text-sm text-soft">({p.label})</span>}</a></p>)}</Reveal>
            <Reveal as="li" delay={0.1} className="glass-flat lift p-6"><Mail className="size-6 text-lav" aria-hidden="true" /><h3 className="mt-3 font-display text-lg font-semibold">Email</h3><p><a href={`mailto:${site.email}`} className="inline-flex min-h-11 items-center break-all hover:text-lav">{site.email}</a></p>{site.email2 && <p><a href={`mailto:${site.email2}`} className="inline-flex min-h-11 items-center break-all hover:text-lav">{site.email2}</a></p>}</Reveal>
            <Reveal as="li" delay={0.15} className="glass-flat lift p-6">
              <Clock className="size-6 text-lav" aria-hidden="true" /><h3 className="mt-3 font-display text-lg font-semibold">Business hours</h3>
              {site.businessHours ? <p className="mt-1 whitespace-pre-line text-soft">{site.businessHours}</p> : <p className="mt-1 text-soft">Send an enquiry or message us on WhatsApp and the team will reply{site.responseTime ? ` ${site.responseTime}` : ' as soon as possible'}.</p>}
            </Reveal>
          </ul>
          {social.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-3"><span className="font-semibold">Follow us</span>
              <ul className="flex flex-wrap gap-2">{social.map((s) => <li key={s.platform}><a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`} className="inline-flex size-11 items-center justify-center rounded-full border border-edge-strong bg-glass transition-colors hover:border-lav hover:text-lav"><SocialIcon platform={s.platform} className="size-4" /></a></li>)}</ul>
            </div>
          )}
        </div>
      </section>

      {/* Locations */}
      <section id="branches" className="wrap section" aria-labelledby="branches-title">
        <SectionHeading id="branches-title" eyebrow="Office locations" title="Visit our" gradient="branches." bot lead={`LAX360 Pvt Ltd has branches in ${branchSentence}.`} />
        <BranchCards className="mt-10" />
        {site.address && (
          <div className="mt-8 flex items-start gap-3 text-soft"><MapPin className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" /><address className="whitespace-pre-line not-italic">{site.address}{site.mapLink && <> <a href={site.mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-lav hover:underline">Open in maps<span className="sr-only"> (opens in a new tab)</span></a></>}</address></div>
        )}
      </section>
    </PageContainer>
  )
}
