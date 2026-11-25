import { Link } from 'react-router-dom'
import { Block, Checklist, Facts } from './PartnerUI.jsx'
import { CoursesButton, CourseGroupsList } from './CourseCatalogue.jsx'
import { EDU } from '../../data/educationFranchise.js'
import { COURSE_SUMMARY } from '../../data/educationCourses.js'

// The in-page navigation entries of the Education Franchise page, in page order (id -> label). The generic opportunity sections that this content replaces are skipped by PartnerOpportunity.
export const EDU_NAV_A = [['about', 'About'], ['provide', 'What we provide'], ['courses', 'Courses'], ['branding', 'Branding kit'], ['academic', 'Academic support'], ['certification', 'Certification'], ['digital', 'Digital presence'], ['crm', 'CRM'],
  ['institutions', 'Colleges & schools'], ['internships', 'Internships'], ['placement', 'Placement'], ['training', 'Staff training'], ['marketing', 'Marketing']]
export const EDU_NAV_B = [['packages', 'Packages'], ['documents', 'Documents'], ['terms', 'Terms']]

const Two = ({ a, b, accent }) => <div className="grid gap-10 md:grid-cols-2"><div><h3 className="font-display text-xl font-semibold">{a[0]}</h3><div className="mt-4"><Checklist items={a[1]} accent={accent} /></div></div><div><h3 className="font-display text-xl font-semibold">{b[0]}</h3><div className="mt-4"><Checklist items={b[1]} accent={accent} /></div></div></div>

/** Part A: from the introduction to marketing support. Content is LAX360's own supplied text (see data/educationFranchise.js). */
export function EducationBlocksA({ accent }) {
  const e = EDU
  return (
    <>
      <Block id="about" eyebrow="LAX360 Education" title={e.about.tagline}>
        <div className="grid gap-10 lg:grid-cols-12"><div className="space-y-5 text-lg leading-relaxed text-soft lg:col-span-7">{e.about.paragraphs.map((p) => <p key={p}>{p}</p>)}</div>
          <div className="lg:col-span-5"><h3 className="eyebrow mb-3 text-soft">Our mission</h3><Checklist items={e.about.mission} accent={accent} /></div></div>
      </Block>
      <Block id="provide" eyebrow="Franchise support" title="What LAX360 Pvt Ltd provides" lead="Support available to an approved franchise partner, according to the franchise package and agreement." tint><Facts rows={e.provide} /></Block>
      <Block id="courses" eyebrow="Course list" title="LAX360 Education courses" lead={`LAX360 Education offers ${COURSE_SUMMARY}, with practical, industry-focused learning. These are the only courses offered.`}>
        <div className="mb-8"><CoursesButton accent={accent} /></div>
        <CourseGroupsList accent={accent} />
        <p className="mt-4 text-sm text-soft">An approved franchise partner can select courses from this list based on infrastructure and faculty availability.</p>
      </Block>
      <Block id="branding" eyebrow="Franchise partner package" title="Branding kit" lead="Helps every franchise centre keep a consistent and professional LAX360 Education identity." tint>
        <div className="grid gap-8 md:grid-cols-2">{e.branding.map(([t, items]) => <div key={t}><h3 className="font-display text-xl font-semibold">{t}</h3><div className="mt-3"><Checklist items={items} accent={accent} /></div></div>)}</div>
      </Block>
      <Block id="academic" eyebrow="Academic support" title="Academic and course support" lead="Academic resources and course implementation guidance for authorized franchise partners."><Checklist items={e.academic} accent={accent} cols /></Block>
      <Block id="certification" eyebrow="Certification and authorization" title="Certification and authorization support" lead={e.certification.lead} tint>
        <Two a={['Certification types', e.certification.types]} b={['Certification process', e.certification.steps]} accent={accent} />
        <ul className="mt-6 space-y-1 text-sm text-soft">{e.certification.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </Block>
      <Block id="digital" eyebrow="Website and digital presence" title="Digital visibility for every approved centre" lead="Each approved franchise partner can receive digital visibility through the LAX360 Education website."><Checklist items={e.digital} accent={accent} cols /></Block>
      <Block id="crm" eyebrow="CRM and branch management" title="Centralized CRM and branch management" lead={e.crm.lead} tint><Facts rows={e.crm.rows} /><p className="mt-4 text-sm text-soft">{e.crm.note}</p></Block>
      <Block id="institutions" eyebrow="Institutional partnerships" title="College and school tie-up support" lead="Franchise partners can develop relationships with schools, colleges, polytechnics and universities."><Checklist items={e.institutions} accent={accent} cols /></Block>
      <Block id="internships" eyebrow="Internship and projects" title="Internship and project support" tint><Checklist items={e.internships} accent={accent} cols /></Block>
      <Block id="placement" eyebrow="Placement and career" title="Placement and career support" lead="LAX360 Education supports franchise partners in improving students' career readiness."><Checklist items={e.placement.items} accent={accent} cols /><p className="mt-5 rounded-lg border border-edge p-4 text-sm font-semibold">{e.placement.note}</p></Block>
      <Block id="training" eyebrow="Faculty and staff" title="Faculty and staff training" lead="Support for preparing the academic and administrative teams of a centre." tint><Two a={['Faculty training', e.training.faculty]} b={['Administrative staff training', e.training.staff]} accent={accent} /></Block>
      <Block id="marketing" eyebrow="Marketing and business development" title="Marketing and business development support" lead="Helps franchise partners promote their training centres and generate student enquiries."><Checklist items={e.marketing} accent={accent} cols /></Block>
    </>
  )
}

/** Part B: indicative packages, the documentation pack and the terms. */
export function EducationBlocksB({ accent }) {
  const e = EDU
  return (
    <>
      <Block id="packages" eyebrow="Franchise packages" title="Suggested package structure" lead={e.packagesNote} tint>
        <div className="grid gap-px overflow-hidden rounded-xl border border-edge bg-edge lg:grid-cols-3">
          {e.packages.map((p) => <article key={p.name} className="bg-night p-6"><p className="eyebrow" style={{ color: accent }}>{p.note}</p><h3 className="mt-2 font-display text-2xl font-semibold">{p.name}</h3><p className="text-soft">{p.tag}</p><div className="mt-5"><Checklist items={p.items} accent={accent} /></div></article>)}
        </div>
      </Block>
      <Block id="documents" eyebrow="Documentation" title="Franchise documents and materials provided" lead="The documentation pack an approved franchise partner receives."><ol className="grid gap-x-10 gap-y-1.5 text-[0.9375rem] md:grid-cols-2 lg:grid-cols-3">{e.documents.map((d, i) => <li key={d} className="flex gap-3"><span className="w-7 shrink-0 text-right font-semibold tabular-nums text-soft">{i + 1}.</span>{d}</li>)}</ol></Block>
      <Block id="terms" eyebrow="Important" title="Terms and conditions" tint>
        <ul className="space-y-2">{e.terms.map((t) => <li key={t} className="flex gap-3"><span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full" style={{ background: accent }} /><span>{t}</span></li>)}</ul>
        <p className="mt-5 text-sm text-soft">See also the <Link to="/partner-with-us/terms-and-conditions" className="link-underline">partnership terms</Link> and the <Link to="/partner-with-us/privacy-policy" className="link-underline">partnership privacy notice</Link>.</p>
      </Block>
      <Block id="contact" eyebrow="Contact" title={e.contact.name}>
        <p className="text-soft">{e.contact.line}</p>
        <ul className="mt-3 space-y-1"><li>Email: <a className="link-underline" href={`mailto:${e.contact.email}`}>{e.contact.email}</a></li><li>Locations: {e.contact.locations.join(' | ')}</li></ul>
      </Block>
    </>
  )
}
