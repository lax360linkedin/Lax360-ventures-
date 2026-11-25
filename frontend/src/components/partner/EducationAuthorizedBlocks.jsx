import { Link } from 'react-router-dom'
import { Block, Checklist, Facts } from './PartnerUI.jsx'
import { CoursesButton, CourseGroupsList } from './CourseCatalogue.jsx'
import { EDUA } from '../../data/educationAuthorized.js'
import { EDU } from '../../data/educationFranchise.js'
import { COURSE_SUMMARY } from '../../data/educationCourses.js'

// In-page navigation of the Education Authorized Partner page, in page order. PartnerOpportunity inserts Responsibilities, Process and Commercial between the two lists.
export const EDUA_NAV_A = [['about', 'About'], ['who', 'Who can apply'], ['models', 'Partnership models'], ['courses', 'Courses'], ['provide', 'What we provide'], ['collab', 'College collaboration'], ['internships', 'Internships'], ['faculty', 'Faculty & staff training'],
  ['branding', 'Branding kit'], ['digital', 'Digital presence'], ['crm', 'CRM'], ['marketing', 'Marketing'], ['infrastructure', 'Infrastructure']]
export const EDUA_NAV_B = [['documents', 'Documents'], ['application', 'Apply'], ['terms', 'Terms']]

const Two = ({ a, b, accent }) => <div className="grid gap-10 md:grid-cols-2"><div><h3 className="font-display text-xl font-semibold">{a[0]}</h3><div className="mt-4"><Checklist items={a[1]} accent={accent} /></div></div><div><h3 className="font-display text-xl font-semibold">{b[0]}</h3><div className="mt-4"><Checklist items={b[1]} accent={accent} /></div></div></div>
const Numbered = ({ items }) => <ol className="grid gap-x-10 gap-y-1.5 text-[0.9375rem] md:grid-cols-2 lg:grid-cols-3">{items.map((d, i) => <li key={d} className="flex gap-3"><span className="w-7 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span>{d}</li>)}</ol>

/** Part A: introduction to infrastructure. Content is LAX360's own supplied text (see data/educationAuthorized.js). */
export function EducationAuthorizedA({ accent }) {
  const e = EDUA
  return (
    <>
      <Block id="about" eyebrow="LAX360 Education" title={e.about.tagline}>
        <div className="grid gap-10 lg:grid-cols-12"><div className="space-y-5 text-lg leading-relaxed text-soft lg:col-span-7">{e.about.paragraphs.map((p) => <p key={p}>{p}</p>)}
          <h3 className="pt-3 font-display text-xl font-semibold text-fg">Our vision</h3>{e.about.vision.map((p) => <p key={p}>{p}</p>)}</div>
          <div className="lg:col-span-5"><h3 className="eyebrow mb-3 text-soft">Our partnership objective</h3><Checklist items={e.about.objectives} accent={accent} /></div></div>
        <div className="mt-10"><h3 className="font-display text-xl font-semibold">Our mission</h3><p className="mt-2 max-w-3xl text-soft">{e.about.mission.lead}</p><div className="mt-5"><Facts rows={e.about.mission.items} /></div></div>
      </Block>
      <Block id="who" eyebrow="Eligibility" title="Who can become an authorized partner?" tint>
        <ul className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-3">{e.who.map(([t, d]) => <li key={t} className="bg-night p-5"><p className="font-display text-lg font-semibold">{t}</p><p className="mt-1 text-sm text-soft">{d}</p></li>)}</ul>
      </Block>
      <Block id="models" eyebrow="Authorized partnership models" title="Choose the model that fits your organization">
        <div className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge md:grid-cols-2">
          {e.models.map((m) => (
            <article key={m.id} className="bg-night p-6">
              <p className="eyebrow" style={{ color: accent }}>Model {m.id}</p><h3 className="mt-1 font-display text-xl font-semibold">{m.name}</h3><p className="mt-1 text-sm text-soft">{m.for}</p>
              <div className="mt-4"><Checklist items={m.items} accent={accent} /></div>
            </article>
          ))}
        </div>
        <p className="mt-4 rounded-lg border border-edge p-4 text-sm font-semibold">{e.modelsNote}</p>
      </Block>
      <Block id="courses" eyebrow="Course partnership" title="LAX360 Education courses" lead={`Partners can conduct the LAX360 Education courses (${COURSE_SUMMARY}), subject to the approved programme, faculty, facilities and course delivery arrangements. These are the only courses offered.`} tint>
        <div className="mb-8"><CoursesButton accent={accent} /></div>
        <CourseGroupsList accent={accent} />
        <p className="mt-4 text-sm text-soft">Courses delivered at a partner depend on the approved programme, faculty and facilities.</p>
      </Block>
      <Block id="provide" eyebrow="What LAX360 Education provides" title="Support for authorized partners" lead="Support available to an approved partner, according to the partnership model and agreement.">
        <div className="grid gap-10 md:grid-cols-2">{e.provide.map(([t, items, note]) => <div key={t}><h3 className="font-display text-xl font-semibold">{t}</h3><div className="mt-3"><Checklist items={items} accent={accent} /></div>{note && <p className="mt-3 text-sm font-semibold text-soft">{note}</p>}</div>)}</div>
      </Block>
      <Block id="collab" eyebrow="College and university collaboration" title="College and university collaboration programmes" lead={e.collab.lead} tint>
        <h3 className="font-display text-xl font-semibold">Institutional collaboration activities</h3><div className="mt-4"><Numbered items={e.collab.activities} /></div>
        <h3 className="mt-10 font-display text-xl font-semibold">MoU partnership support</h3><p className="mt-1 text-soft">{e.collab.mouLead}</p><div className="mt-4"><Checklist items={e.collab.mou} accent={accent} cols /></div>
      </Block>
      <Block id="internships" eyebrow="Internship and project development" title="Internship and project development support" lead={e.internships.lead}>
        <h3 className="font-display text-xl font-semibold">Internship domains</h3><div className="mt-3"><Checklist items={e.internships.domains} accent={accent} cols /></div>
        <div className="mt-10"><Two a={['Project support', e.internships.projects]} b={['Internship support includes', e.internships.support]} accent={accent} /></div>
      </Block>
      <Block id="faculty" eyebrow="Faculty development and staff training" title="Faculty development and staff training" lead={e.faculty.lead} tint><Two a={['Faculty development programmes', e.faculty.programs]} b={['Administrative staff orientation', e.faculty.admin]} accent={accent} /></Block>
      <Block id="branding" eyebrow="Official partner resources" title="Authorized partner branding kit" lead={e.branding.lead}>
        <Facts rows={e.branding.rows} />
        <h3 className="mt-8 font-display text-xl font-semibold">Brand usage conditions</h3><div className="mt-3"><Checklist items={e.branding.conditions} accent={accent} /></div>
      </Block>
      <Block id="digital" eyebrow="Website and digital partner integration" title="Website and digital partner integration" lead={e.digital.lead} tint>
        <Two a={['Website partner profile', e.digital.profile]} b={['Digital support', e.digital.support]} accent={accent} /><p className="mt-5 text-sm text-soft">{e.digital.note}</p>
      </Block>
      <Block id="crm" eyebrow="CRM and partner management" title="CRM and partner management system" lead={e.crm.lead}><Facts rows={e.crm.rows} /><p className="mt-4 text-sm text-soft">{e.crm.note}</p></Block>
      <Block id="marketing" eyebrow="Marketing and business development" title="Marketing and business development support" lead={e.marketing.lead} tint><Two a={['Marketing activities', e.marketing.activities]} b={['Business development support', e.marketing.business]} accent={accent} /></Block>
      <Block id="infrastructure" eyebrow="Infrastructure and technical requirements" title="Infrastructure and technical requirements" lead={e.infrastructure.lead}><Facts rows={e.infrastructure.rows} /><p className="mt-4 text-sm text-soft">{e.infrastructure.note}</p></Block>
    </>
  )
}

/** Part B: commercial policies, documents, application categories, terms. */
export function EducationAuthorizedB({ accent }) {
  const e = EDUA
  return (
    <>
      <Block id="documents" eyebrow="Documentation" title="Documents required for authorized partnership" lead={e.documents.lead} tint>
        <div className="grid gap-10 md:grid-cols-2"><div><h3 className="font-display text-xl font-semibold">For colleges, schools and universities</h3><ol className="mt-4 space-y-1.5 text-[0.9375rem]">{e.documents.colleges.map((d, i) => <li key={d} className="flex gap-3"><span className="w-6 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span>{d}</li>)}</ol></div>
          <div><h3 className="font-display text-xl font-semibold">For training centres and business organizations</h3><ol className="mt-4 space-y-1.5 text-[0.9375rem]">{e.documents.business.map((d, i) => <li key={d} className="flex gap-3"><span className="w-6 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span>{d}</li>)}</ol></div></div>
        <h3 className="mt-10 font-display text-xl font-semibold">Documents provided by LAX360 Education</h3><div className="mt-4"><Checklist items={e.documents.provided} accent={accent} cols /></div>
      </Block>
      <Block id="application" eyebrow="Authorized partnership application" title="Become an LAX360 Education authorized partner" lead={e.application.lead}>
        <div className="grid gap-10 md:grid-cols-2"><div><h3 className="font-display text-xl font-semibold">Partnership categories</h3><div className="mt-4"><Checklist items={e.application.categories} accent={accent} /></div></div>
          <div><h3 className="font-display text-xl font-semibold">Application details</h3><div className="mt-4"><Checklist items={e.application.details} accent={accent} /></div></div></div>
        <p className="mt-6 text-sm text-soft">Submitting an application is an enquiry. It does not make you a partner; approval follows consultation, verification and an agreement.</p>
      </Block>
      <Block id="terms" eyebrow="Important" title="Partnership terms and conditions" tint>
        <ol className="grid gap-x-10 gap-y-2 md:grid-cols-2">{e.terms.map((t, i) => <li key={t} className="flex gap-3"><span className="w-6 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span><span>{t}</span></li>)}</ol>
        <p className="mt-5 text-sm text-soft">See also the <Link to="/partner-with-us/terms-and-conditions" className="link-underline">partnership terms</Link> and the <Link to="/partner-with-us/privacy-policy" className="link-underline">partnership privacy notice</Link>.</p>
      </Block>
      <Block id="contact" eyebrow="Contact" title={EDU.contact.name}>
        <p className="text-soft">{EDU.contact.line}</p>
        <ul className="mt-3 space-y-1"><li>Email: <a className="link-underline" href={`mailto:${EDU.contact.email}`}>{EDU.contact.email}</a></li><li>Locations: {EDU.contact.locations.join(' | ')}</li></ul>
      </Block>
    </>
  )
}
