// What a new customer tells us at registration. The codes are what the server stores (backend/app/user_catalog.py carries the same lists); the labels are what people read.
// Only useful, non-sensitive details are asked: nothing here is an identity document or a payment detail.
import { EMAIL } from '../utils/validators.js'

export const CATEGORIES = [
  { value: 'student', label: 'Student', hint: 'In school, college or university' },
  { value: 'professional', label: 'Working professional / Employee', hint: 'Employed or running a business' },
  { value: 'other', label: 'Other', hint: 'Anything else: freelancer, job seeker, parent, enthusiast…' },
]
export const CATEGORY_LABEL = { student: 'Student', professional: 'Working professional', other: 'Other', none: 'Not provided', not_provided: 'Not provided' }

export const PURPOSES = [
  { value: 'software', label: 'Looking for Software Development Services' },
  { value: 'ai', label: 'Interested in AI & Automation Solutions' },
  { value: 'marketing', label: 'Interested in Digital Marketing Services' },
  { value: 'products', label: 'Looking for Business Software / SaaS Products' },
  { value: 'training', label: 'Interested in Courses and Training' },
  { value: 'career', label: 'Looking for Internship / Career Opportunities' },
  { value: 'partnership', label: 'Interested in Business Partnerships / Franchise Opportunities' },
  { value: 'explore', label: "Exploring LAX360's Products and Services" },
  { value: 'other', label: 'Other' },
]
export const PURPOSE_LABEL = Object.fromEntries(PURPOSES.map((p) => [p.value, p.label]))

export const STUDY_YEARS = ['1st year', '2nd year', '3rd year', '4th year', '5th year', 'Postgraduate', 'Other']
export const INDUSTRIES = ['IT & Software', 'Education & Training', 'Manufacturing', 'Healthcare', 'Banking & Finance', 'Retail & E-commerce', 'Real Estate & Construction', 'Hospitality & Travel', 'Media & Marketing', 'Government / Public sector', 'Startup', 'Other']

export const emptyDetails = () => ({
  mobile: '', category: '', institution: '', course: '', department: '', study_year: '',
  company: '', job_role: '', industry: '', experience_years: '', other_details: '', purposes: [], purpose_note: '',
})

/** The mobile number as the server will keep it: spaces, dashes and brackets removed, `00` read as `+`, 10 to 15 digits. null when it is not plausible. */
export function normalizeMobile(raw) {
  let v = String(raw || '').replace(/[\s\-().]/g, '')
  if (v.startsWith('00')) v = `+${v.slice(2)}`
  return /^\+?[0-9]{10,15}$/.test(v) ? v : null
}

/** Client-side checks that mirror the server rules (the server decides: these only save a round trip). */
export function validateDetails(v) {
  const e = {}
  if (!v.mobile.trim()) e.mobile = 'Enter your mobile number.'
  else if (!normalizeMobile(v.mobile)) e.mobile = 'Enter a valid mobile number (10 to 15 digits, for example +91 98765 43210).'
  if (!v.category) e.category = 'Choose the option that describes you.'
  if (v.category === 'student') {
    if (!v.institution.trim()) e.institution = 'Enter your college or institution.'
    if (!v.course.trim()) e.course = 'Enter your course or degree.'
    if (!v.department.trim()) e.department = 'Enter your department or specialisation.'
    if (!v.study_year) e.study_year = 'Choose your current year of study.'
  }
  if (v.category === 'professional') {
    if (!v.company.trim()) e.company = 'Enter your company name.'
    if (!v.job_role.trim()) e.job_role = 'Enter your job role or designation.'
    if (!v.industry.trim()) e.industry = 'Enter your industry or business sector.'
    if (v.experience_years !== '' && !(Number(v.experience_years) >= 0 && Number(v.experience_years) <= 60)) e.experience_years = 'Enter a number of years between 0 and 60.'
  }
  if (!v.purposes.length) e.purposes = 'Choose at least one reason.'
  return e
}

/** The request body for the server: only the fields of the chosen category are sent. */
export function detailsPayload(v) {
  const base = { mobile: v.mobile.trim(), category: v.category, purposes: v.purposes, purpose_note: v.purpose_note.trim() || null }
  if (v.category === 'student') return { ...base, institution: v.institution.trim(), course: v.course.trim(), department: v.department.trim(), study_year: v.study_year }
  if (v.category === 'professional') return { ...base, company: v.company.trim(), job_role: v.job_role.trim(), industry: v.industry.trim(), experience_years: v.experience_years === '' ? null : Number(v.experience_years) }
  return { ...base, other_details: v.other_details.trim() || null }
}

/** Server data -> form values (for editing the details later). */
export function detailsFromServer(d = {}) {
  const e = emptyDetails()
  for (const k of Object.keys(e)) if (d[k] !== null && d[k] !== undefined) e[k] = k === 'purposes' ? [...d[k]] : String(d[k])
  return e
}

export { EMAIL }
