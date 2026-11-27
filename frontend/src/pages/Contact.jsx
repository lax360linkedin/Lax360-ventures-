import { useSearchParams } from 'react-router-dom'
import { Clock, MapPin } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import BotCall from '../components/contact/BotCall.jsx'
import EnquiryForm from '../components/sections/EnquiryForm.jsx'
import LeadForm from '../components/contact/LeadForm.jsx'
import ChannelIcon, { opensNewTab } from '../components/layout/ChannelIcon.jsx'
import Button from '../components/ui/Button.jsx'
import { Rise as Reveal, Stagger, StaggerItem } from '../components/contact/Motion.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import BranchCards from '../components/sections/BranchCards.jsx'
import { branchSentence } from '../data/branches.js'
import { useBranchDirectory } from '../hooks/useBranches.js'
import { localBusinessSchemas } from '../utils/seo.js'
import { useContacts, useSite, useSocial, useH1Override } from '../hooks/useSite.js'
import { useContactPageText } from '../hooks/useCmsPages.js'
import { courses } from '../data/courses.js'

// Business enquiries use the full lead form; the other kinds (careers, partnerships, courses, workshops, general questions) keep the simple form they always had.
const LEAD_TYPES = { project: [], quote: [], ai: ['ai-solutions'], 'website-app': ['website-development'], marketing: ['digital-marketing'] }

export default function Contact() {
  const h1 = useH1Override()
  const site = useSite()
  const social = useSocial('contact')
  const { branches } = useBranchDirectory()
  const contacts = useContacts('contact')
  const addresses = contacts.filter((c) => c.type === 'address')
  const quick = contacts.filter((c) => !['address', 'branch'].includes(c.type)).slice(0, 5)
  // one card per kind of contact detail (WhatsApp, Phone, Email, ...), in the order of the managed list; the lines inside a card keep their order too
  const GROUPS = { whatsapp: 'WhatsApp', phone: 'Phone', email: 'Email', branch: 'Branch contacts', enquiry: 'Business enquiries', other: 'More ways to reach us' }
  const groups = [...new Set(contacts.filter((c) => c.type !== 'address').map((c) => c.type))].map((type) => ({ type, items: contacts.filter((c) => c.type === type) }))
  const line = 'inline-flex min-h-11 items-center hover:text-lav'
  const page = useContactPageText()
  const [params] = useSearchParams()
  const type = params.get('type') || 'quote'
  const course = courses.find((c) => c.slug === params.get('course'))
  const lead = type in LEAD_TYPES && !course

  return (
    <PageContainer
      path="/contact"
      jsonLd={localBusinessSchemas(branches, { email: site.email, logo: '__SITE__/assets/logo-shield.png' })}
      title="Contact"
      description="Tell LAX360 Pvt Ltd about your business and project. Get a quote for software, AI, automation and digital marketing, or reach the team on WhatsApp, phone or email."
    >
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-edge">
        <div aria-hidden="true" className="ct-drift pointer-events-none absolute -right-32 -top-24 size-[34rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--glow)/0.28), transparent)' }} />
        <div className="wrap relative grid items-center gap-10 pb-12 pt-10 md:pb-16 md:pt-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <p style={{ '--d': '0.05s' }} className="ct-in eyebrow mb-6 flex items-center gap-3 text-lav"><span aria-hidden="true" className="ct-line h-px w-10 bg-current" />{page.hero_eyebrow || 'Contact us'}</p>
            <h1 style={{ '--d': '0.15s' }} className="ct-in h1 !text-[clamp(2.5rem,5.6vw,5.25rem)]">{h1 || page.hero_title || <>Let&apos;s Build <span className="text-gradient">Something Great</span> Together.</>}</h1>
            <p style={{ '--d': '0.3s' }} className="ct-in lead mt-7 max-w-2xl text-soft">
              {page.hero_lead || `LAX360 Pvt Ltd brings software, AI, automation and digital growth together under one team, with branches in ${branchSentence}. Tell us about your business and what you want to achieve, and we will come back with a clear next step.`}
            </p>
            <div style={{ '--d': '0.42s' }} className="ct-in mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href="#contact-info" variant="secondary">Contact Us</Button>
              <Button href="#enquiry" arrow>Get a Quote</Button>
            </div>
            <ul style={{ '--d': '0.54s' }} className="ct-in mt-8 flex flex-wrap gap-x-8 gap-y-2 text-base">
              {quick.map((c) => <li key={c.id}><a href={c.href} {...(opensNewTab(c) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="link-underline inline-flex min-h-11 items-center gap-2 break-all"><span className="shrink-0 text-lav"><ChannelIcon channel={c} className="size-4" /></span>{c.type === 'whatsapp' ? 'WhatsApp' : c.type === 'enquiry' || c.type === 'other' ? c.label : c.value}{opensNewTab(c) && <span className="sr-only"> (opens in a new tab)</span>}</a></li>)}
            </ul>
          </div>
          <Reveal delay={0.2} x={30} y={20} className="lg:col-span-5"><BotCall className="ct-float" /></Reveal>
        </div>
      </section>

      {/* Enquiry */}
      <section id="enquiry" className="wrap section scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="form-title">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <SectionHeading id="form-title" eyebrow={lead ? 'Get a quote' : 'Send an enquiry'} title={page.form_title || (lead ? 'Tell us about' : 'Send us')} gradient={page.form_title ? undefined : lead ? 'your project.' : 'a message.'} lead={page.form_lead || (lead ? 'A few short steps help us understand your business and requirements, so our reply is useful from the first message.' : 'Describe your requirement and the team will follow up.')} />
            <Stagger className="mt-8 space-y-3 text-soft">
              {['Takes about three minutes', 'Review everything before you send', 'Your details are used only to respond to you'].map((t) => <StaggerItem key={t} className="flex items-start gap-2.5"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-lav" />{t}</StaggerItem>)}
            </Stagger>
            <div id="partners" className="mt-10 border-t border-edge pt-6">
              <h2 className="font-display text-xl font-semibold">Partner with us</h2>
              <p className="mt-2 text-soft">Interested in a referral, white-label, technology or college partnership?</p>
              <div className="mt-4"><Button to="/contact?type=partnership" variant="secondary">Start a partnership enquiry</Button></div>
            </div>
          </div>
          <div className="lg:col-span-8">
            <div className="ct-form glass p-5 md:p-8">
              {lead
                ? <LeadForm key={type} defaultType={type === 'quote' ? 'quote' : 'project'} initialMains={LEAD_TYPES[type]} />
                : <EnquiryForm key={`${type}-${course?.slug}`} defaultType={type} presets={course ? { course: course.title } : {}} idPrefix="contact" source="contact" />}
            </div>
          </div>
        </div>
      </section>

      {/* Contact details: one card per kind of detail (icon badge, title, a list of tappable rows), then the opening hours. Every phone number and e-mail address is a link (tel: / mailto:). */}
      <section id="contact-info" className="border-y border-edge bg-base2/50 scroll-mt-[calc(var(--header-bottom,92px)+1rem)]" aria-labelledby="info-title">
        <div className="wrap section">
          <SectionHeading id="info-title" eyebrow="Contact information" title={page.info_title || 'Reach us'} gradient={page.info_title ? undefined : 'directly.'} lead={page.info_lead || site.contactIntro || 'Prefer to talk or write? Use any of these.'} />
          <ul className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16.5rem),1fr))] items-start gap-4 md:mt-10 md:gap-5">
            {groups.map((g, n) => (
              <Reveal as="li" key={g.type} delay={n * 0.05} className="ct-card glass-flat flex flex-col p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-lav ring-1 ring-edge"><span className="ct-icon"><ChannelIcon channel={g.items[0]} className="size-5" /></span></span>
                  <h3 className="font-display text-lg font-semibold leading-tight">{GROUPS[g.type]}</h3>
                </div>
                <ul className="mt-3 divide-y divide-edge/70 border-t border-edge/70">
                  {g.items.map((c) => {
                    const out = opensNewTab(c)
                    const text = c.type === 'whatsapp' ? 'Chat with us' : c.type === 'enquiry' || c.type === 'other' ? c.label : c.value
                    const href = c.href || (c.type === 'email' ? `mailto:${c.value}` : c.type === 'phone' ? `tel:${String(c.value).replace(/[^\d+]/g, '')}` : '')
                    return (
                      <li key={c.id} className="py-2 first:pt-3 last:pb-0">
                        {href
                          ? <a href={href} {...(out ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={`flex min-h-11 flex-col justify-center font-medium transition-colors hover:text-lav focus-visible:text-lav ${c.type === 'email' ? '[overflow-wrap:anywhere]' : c.type === 'phone' ? 'whitespace-nowrap' : 'break-words'} ${c.type === 'whatsapp' ? 'font-semibold text-lav' : 'text-fg'}`}><span>{text}</span>{c.note && <span className="text-sm font-normal text-soft">{c.note}</span>}{out && <span className="sr-only"> (opens in a new tab)</span>}</a>
                          : <span className="inline-flex min-h-11 items-center font-medium">{text}</span>}
                        {c.detail && <span className="block whitespace-pre-line text-sm leading-relaxed text-soft">{c.detail}</span>}
                      </li>
                    )
                  })}
                </ul>
              </Reveal>
            ))}
            <Reveal as="li" delay={groups.length * 0.05} className="ct-card glass-flat flex flex-col p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-lav ring-1 ring-edge"><span className="ct-icon"><Clock className="size-5" aria-hidden="true" /></span></span>
                <h3 className="font-display text-lg font-semibold leading-tight">Opening hours</h3>
              </div>
              <div className="mt-3 border-t border-edge/70 pt-3">
                {site.businessHours
                  ? <p className="whitespace-pre-line font-display text-xl font-semibold leading-snug text-fg">{site.businessHours}</p>
                  : <p className="text-soft">Send an enquiry or message us on WhatsApp and the team will reply{site.responseTime ? ` ${site.responseTime}` : ' as soon as possible'}.</p>}
                {site.businessHours && site.responseTime && <p className="mt-2 text-sm text-soft">We reply {site.responseTime}.</p>}
              </div>
            </Reveal>
          </ul>
          {social.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-edge bg-glass px-4 py-3 sm:px-5"><span className="font-semibold">Follow us</span>
              <ul className="flex flex-wrap gap-2">{social.map((s) => <li key={s.id}><a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`} className="ct-social inline-flex size-11 items-center justify-center rounded-full border border-edge-strong bg-glass transition-colors hover:border-lav hover:text-lav"><ChannelIcon channel={s} className="size-4" /></a></li>)}</ul>
            </div>
          )}
        </div>
      </section>

      {/* Locations */}
      <section id="branches" className="wrap section" aria-labelledby="branches-title">
        <SectionHeading id="branches-title" eyebrow="Office locations" title="Visit our" gradient="branches." bot lead={`LAX360 Pvt Ltd has branches in ${branchSentence}.`} />
        <BranchCards refined className="mt-10" />
        {addresses.length > 0 && (
          <div className="mt-8 flex items-start gap-3 text-soft"><MapPin className="mt-1 size-5 shrink-0 text-lav" aria-hidden="true" /><address className="space-y-2 whitespace-pre-line not-italic">{addresses.map((c) => <span key={c.id} className="block">{c.value}</span>)}{site.mapLink && <> <a href={site.mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-lav hover:underline">Open in maps<span className="sr-only"> (opens in a new tab)</span></a></>}</address></div>
        )}
      </section>
    </PageContainer>
  )
}
