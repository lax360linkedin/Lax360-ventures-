// Content of the Education Referral Partner page, written from "LAX360_Referral_Programme_Updated.pdf" supplied by LAX360 management.
// Spelling was tidied ("programe", "progrmmes" -> "programme"); the meaning is unchanged. Not published: the document's internal notes (commission amounts "should be approved by management before
// publication", "website form prototype: connect it to the CRM", the "recommended website structure" and "recommended advanced features" for the developer) and a list on page 2 whose font could not be
// decoded and that appears to name institutions and companies (publishing unverified names would be a claim about third parties). No commission percentage appears in the extractable text, so none is shown.

export const EDUR = {
  about: {
    tagline: 'Introduce students to industry-oriented training and be recognised for it.',
    paragraphs: [
      'LAX360 Education, a division of LAX360 Pvt Ltd, introduces a Referral Partnership Programme to connect educational institutions, colleges, schools, independent education consultants, freelancers, career counsellors and business professionals with our skill development and training programmes.',
      'Through this initiative, referral partners can introduce students and interested candidates to LAX360 Education courses, internships, workshops, certification programmes and professional training services. Our objective is to build a strong educational network, expand industry-oriented learning opportunities and create mutually beneficial business relationships.',
    ],
    vision: ['Connect students with industry-relevant training.', 'Build relationships with colleges and educational institutions.', 'Create opportunities for individuals and business partners.', "Expand LAX360 Education's reach through trusted referrals.", 'Reward partners for successful student enrolments.'],
  },
  who: [['College Representatives', 'Placement officers, faculty members and department coordinators.'], ['Education Consultants', 'Career counsellors and education advisors.'], ['Freelancers', 'Independent professionals and individual referral agents.'],
    ['Business Partners', 'Companies, training centres and business networks.'], ['Student Ambassadors', 'College students and campus representatives.'], ['Schools & Institutions', 'Schools, polytechnics and educational organizations.']],
  programmes: {
    lead: 'Referral partners can introduce candidates to the following programmes.',
    groups: [['IT training programmes', 'Software, programming, AI and technology courses.'], ['Non-IT training programmes', 'Professional and industrial skills courses.'], ['Additional services', 'Programmes and services beyond the course catalogue.']],
    services: ['Internship Programmes', 'Final-Year Projects', 'Industrial Training', 'Workshop & Seminar Programmes', 'College Add-on Courses', 'Faculty Development Programmes', 'Professional Certification Programmes', 'Career Guidance', 'Placement Preparation', 'Corporate Training'],
    note: 'All offerings are subject to course availability and approval.',
  },
  models: [
    { id: 1, name: 'Individual Referral Partner', tag: 'Individual', items: ['Refer students to LAX360 Education.', 'Share course information and approved promotional materials.', 'Track referred student admissions.', 'Receive referral rewards for eligible completed admissions.'] },
    { id: 2, name: 'College Referral Partner', tag: 'Institutional', items: ['Refer students from colleges and departments.', 'Coordinate technical workshops and seminars.', 'Promote internship and value-added programmes.', 'Develop institutional training opportunities.'] },
    { id: 3, name: 'Education Consultant Partner', tag: 'Professional', items: ['Counsel prospective students.', 'Share course details and admission information.', 'Coordinate enquiries and follow-ups.', 'Earn agreed referral incentives.'] },
    { id: 4, name: 'Business Referral Partner', tag: 'Business', items: ['Introduce companies and institutions.', 'Refer corporate training requirements.', 'Generate project and training enquiries.', 'Receive agreed business referral commissions.'] },
    { id: 5, name: 'Student Ambassador', tag: 'Campus network', items: ['Promote courses among fellow students.', 'Share approved social media campaigns.', 'Generate student enquiries.', 'Receive eligible referral rewards.'] },
  ],
  commission: {
    lead: 'Referral partners receive incentives for eligible successful referrals based on the approved partnership agreement. Commission depends on the programme, the eligible fee collected and the approved commission structure.',
    rows: [['College training programmes', 'Custom agreement']],
    note: 'Commission rates are set in your partnership agreement; no percentage is promised on this page.',
    policyTitle: 'Referral commission payment policy',
    policyLead: 'The following policy can be adopted for the referral programme:',
    policy: ['Commission is applicable only to verified referrals.', 'The student must be successfully admitted to an approved programme.', 'The applicable course fee must be received by LAX360.', 'Commission is calculated on the eligible collected fee, excluding applicable taxes, refunds and excluded charges as defined in the agreement.', 'Duplicate or previously registered leads may not qualify.', 'Self-referrals are not eligible unless expressly approved.', 'Cancelled admissions and refunded fees may result in commission cancellation or adjustment.', "Payments are made to the registered partner's verified bank account or other approved payment method.", 'Partners must provide required payment and tax documentation.', 'Applicable TDS and other statutory deductions will be handled according to law.', 'Referral commission statements will be maintained by the company.', 'Disputes must be raised within the period specified in the partnership agreement.'],
    payout: ['Suggested payout cycle', 'Monthly, within 15 working days after monthly commission reconciliation and approval. This timeline is confirmed in the final agreement.'],
  },
  benefits: ['Attractive referral commission opportunities.', 'Official LAX360 Education Referral Partner Certificate.', 'Digital referral partner ID.', 'Official promotional posters and brochures.', 'Course catalogue and syllabus information.', 'Dedicated referral tracking ID or code.', 'Admission and enquiry coordination support.', 'Marketing and social media support.', 'Partnership recognition.', 'Opportunity to develop long-term business relationships.', 'Access to approved workshops and institutional activities.', 'Performance-based recognition and rewards.'],
  branding: {
    lead: 'Every approved referral partner can receive an authorized digital branding package.',
    rows: [['Partner Certificate', 'Official referral partnership certificate'], ['Partner ID Card', 'Unique partner identification'], ['Referral Code', 'Unique referral tracking code'], ['Digital Logo', 'Approved LAX360 Education logo'], ['Social Media Posters', 'Course promotional designs'], ['Course Brochure', 'IT and Non-IT course catalogue'], ['WhatsApp Creatives', 'Admission promotional materials'], ['Digital Business Card', 'Partner contact information'], ['Referral Guidelines', 'Partner operating instructions'], ['Marketing Presentation', 'LAX360 Education company profile']],
    note: 'All branding materials must follow the LAX360 Education brand guidelines.',
  },
  process: [
    ['Partner registration', 'Interested individuals or institutions submit the referral partnership application.'], ['Application verification', "LAX360 verifies the partner's details and approves the application."],
    ['Partner authorization', 'The partner receives an authorization confirmation, partner ID and referral code.'], ['Student referral', 'The partner shares course information and introduces interested students.'],
    ['Lead registration', 'Student details are registered in the LAX360 referral tracking system with appropriate consent.'], ['Counselling & admission', 'The LAX360 team contacts the student, explains the programme and completes admission.'],
    ['Payment verification', 'The company verifies the eligible course fee received.'], ['Commission approval', 'The referral is checked against the partnership agreement.'],
    ['Commission payout', 'The approved referral commission is paid according to the agreed payment schedule.'],
  ],
  tracking: {
    lead: 'LAX360 Education can provide a referral tracking dashboard for approved partners.',
    rows: [['Partner Login', 'Secure partner account'], ['Unique Referral Code', 'Individual partner tracking code'], ['Lead Registration', 'Add student enquiries'], ['Lead Status', 'New, contacted, counselling, admitted'], ['Admission Tracking', 'View successful admissions'], ['Fee Status', 'Track payment verification'], ['Commission Report', 'View earned commissions'], ['Payout History', 'View processed payments'], ['Student Reports', 'View permitted referral information'], ['Performance Report', 'Monthly referral performance']],
    statuses: ['New Enquiry', 'Contacted', 'Counselling in Progress', 'Interested', 'Admission Confirmed', 'Payment Received', 'Commission Approved', 'Commission Paid', 'Cancelled / Rejected'],
    note: 'Dashboard access and features are subject to system implementation and management approval.',
  },
  responsibilities: ['Share accurate LAX360 Education course information.', 'Use only company-approved marketing materials.', 'Provide genuine student and business referrals.', 'Obtain consent before sharing personal information.', 'Avoid false placement or salary guarantees.', 'Avoid unauthorized fee collection.', 'Not issue certificates or make admissions independently unless authorized.', 'Maintain professional communication.', 'Protect student and company confidential information.', 'Follow the referral agreement and brand guidelines.', 'Avoid making misleading claims about accreditation or government recognition.'],
  lax: ['Verifies partner details and approves the application', 'Issues authorization confirmation, partner ID and referral code', 'Registers leads in the referral tracking system', 'Contacts students, explains programmes and completes admission', 'Verifies the eligible course fee received', 'Checks each referral against the agreement and pays approved commission'],
  agreement: {
    lead: 'The referral partnership should be governed by a written agreement between LAX360 Pvt Ltd and the approved partner.',
    items: ['Name and address of both parties.', 'Partner category and authorization details.', 'Partnership scope and activities.', 'Referral commission percentage or fixed amount.', 'Commission eligibility and calculation method.', 'Lead ownership and referral attribution rules.', 'Commission payment schedule.', 'Confidentiality and data protection.', 'Branding and intellectual property rights.', 'Marketing and promotional restrictions.', 'Tax and statutory compliance.', 'Refund and cancellation adjustments.', 'Dispute resolution procedure.', 'Agreement duration and renewal.', 'Termination and post-termination settlement.'],
    important: 'Referral partnership does not automatically provide franchise rights, branch ownership, territory exclusivity, authority to collect fees or permission to issue company certificates.',
  },
  why: ['Industry-oriented IT and Non-IT programmes.', 'Wide range of technical training opportunities.', 'Internship and project support.', 'College and institutional collaboration opportunities.', 'Professional certification processes.', 'Marketing and promotional support.', 'Transparent referral tracking.', 'Performance-based commission opportunities.', 'Long-term education business networking.'],
  application: {
    lead: 'Join the LAX360 Education network and create opportunities through education and professional training.',
    details: ['Full name', 'Mobile number', 'Email address', 'Partner category (for example Individual Referral Partner)', 'Organization / college name', 'City / district', 'Your network / experience', 'Interested referral category (for example IT & Non-IT courses)'],
  },
  faqs: [
    ['Who can join the referral partnership?', 'Individuals, college representatives, educational institutions, consultants, freelancers, business owners and student ambassadors can apply.'],
    ['Is there any registration fee?', 'The registration fee, if applicable, will be communicated in the approved partnership policy. Do not assume the programme is free unless LAX360 confirms it.'],
    ['How much commission can a referral partner earn?', 'Commission depends on the programme, the eligible fee collected and the approved commission structure.'],
    ['Can students become referral partners?', 'Yes. College students can apply as student ambassadors, subject to company approval and applicable institutional policies.'],
    ['Will LAX360 provide marketing materials?', 'Approved partners can receive promotional posters, brochures, digital creatives and course details.'],
    ['How will referrals be tracked?', "Through a unique referral ID or code and the company's lead management system."],
    ['When will the commission be paid?', 'After successful admission, payment verification and commission approval, according to the agreed payout schedule.'],
    ['Can an institution refer multiple students?', 'Yes. Institutions can refer multiple students through the approved referral registration process.'],
    ['Can referral partners conduct workshops?', 'Yes. They can coordinate workshops, seminars and training activities subject to company approval and institutional permission.'],
    ['Will partners receive an official certificate?', 'Approved partners can receive an LAX360 Education Referral Partnership Certificate.'],
    ['Can referral partners collect student fees?', 'No. Student fees should be paid directly through company-approved payment channels unless written authorization is provided.'],
    ['Is referral partnership the same as an education franchise?', 'No. Referral partnership is for introducing potential students and business opportunities. Franchise operations require a separate franchise agreement.'],
  ],
}
