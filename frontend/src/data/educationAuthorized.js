// Content of the Education Authorized Partner page, written from "LAX360_Authorized_Partnership_Updated.pdf" supplied by LAX360 management.
// Spelling and punctuation were tidied ("programe" -> "programme"); the meaning is unchanged. Internal drafting notes in the document (e.g. "management should finalize the charges before
// publishing", "website implementation: connect the form to the CRM") are instructions to the team, not page content, and are not published. Commercial values stay as the supplied placeholders.

export const EDUA = {
  about: {
    tagline: 'Partner with Excellence. Deliver Quality Education. Build Future Careers.',
    paragraphs: [
      'LAX360 Education, a division of LAX360 Pvt Ltd, introduces the Authorized Partnership Programme to establish professional relationships with colleges, schools, universities, polytechnics, educational institutions, training centres, companies and independent education organizations.',
      'Through this programme, selected partners can collaborate with LAX360 Education to deliver industry-oriented training, technical education, internships, workshops, seminars, certification programmes and career development initiatives. The authorized partnership model aims to expand access to practical education while maintaining consistent academic standards, approved branding and professional operational guidelines.',
    ],
    objectives: ['Establish a strong educational and institutional network.', 'Promote industry-oriented IT training.', 'Support colleges with technical workshops and seminars.', 'Provide internship and project guidance opportunities.', 'Develop professional skill enhancement programmes.', 'Create career development and placement assistance opportunities.', 'Encourage long-term academic and business collaborations.'],
    vision: ['To become a trusted education and skill development network by establishing strong institutional and industry partnerships, empowering students with practical knowledge, emerging technologies and career-oriented skills.', 'We envision building an educational ecosystem that connects academic institutions with industry requirements and creates opportunities for future professionals.'],
    mission: { lead: 'Our mission is to deliver quality, industry-oriented education through strategic partnerships and collaborative learning initiatives.', items: [
      ['Quality Education', 'Provide structured IT training programmes.'], ['Institutional Growth', 'Build long-term relationships with schools, colleges and universities.'], ['Industry Readiness', "Develop students' practical and professional skills."],
      ['Technology Advancement', 'Promote AI, software development and emerging technologies.'], ['Academic Collaboration', 'Support workshops, seminars, internships and projects.'], ['Career Development', 'Provide career guidance and placement assistance.'],
      ['Partner Success', 'Support authorized partners with academic, technical and marketing resources.']] },
  },
  who: [
    ['Colleges & Universities', 'Arts, Science, Engineering and Autonomous institutions.'], ['Schools', 'School-level technology and skill development programmes.'], ['Polytechnic Institutions', 'Technical training and engineering skill development.'],
    ['Training Centres', 'Existing IT and professional training institutions.'], ['Corporate Organizations', 'Employee training and technical development.'], ['Education Organizations', 'Education consultants and skill development organizations.'],
  ],
  models: [
    { id: 'A', name: 'Academic Institutional Partnership', for: 'For schools, colleges, universities and polytechnic institutions.', items: ['Technical workshops and seminars.', 'Industry-oriented add-on courses.', 'Internship programmes.', 'Final-year project guidance.', 'Faculty development programmes.', 'Student skill development programmes.', 'Technical competitions and events.', 'Career guidance sessions.'] },
    { id: 'B', name: 'Authorized Training Partner', for: 'For existing training institutes and educational centres.', items: ['Authorized LAX360 Education training status.', 'Approved IT course delivery.', 'Course syllabus and training materials.', 'Faculty training and academic coordination.', 'Approved certification processing.', 'Marketing and branding support.', 'Student registration and progress monitoring.'] },
    { id: 'C', name: 'Corporate Training Partner', for: 'For companies and professional organizations.', items: ['Employee technical training.', 'Software and technology workshops.', 'AI and automation training.', 'Digital transformation training.', 'Professional development programmes.', 'Customized training solutions.'] },
    { id: 'D', name: 'Technology & Industry Partner', for: 'For software companies, technology providers and industry professionals.', items: ['Technical knowledge-sharing programmes.', 'Industry guest lectures.', 'Internship and project opportunities.', 'Industry exposure activities.', 'Technical mentoring.', 'Joint skill development initiatives.'] },
    { id: 'E', name: 'Authorized Education Business Partner', for: 'For eligible organizations interested in developing an education business relationship with LAX360 Education.', items: ['Approved educational programme promotion.', 'Student admission coordination.', 'Course marketing.', 'Referral and business collaboration.', 'Academic resource coordination.', 'Commercial terms based on a separate agreement.'] },
  ],
  modelsNote: 'An authorized partnership does not automatically grant franchise rights or exclusive territory rights. Those require separate written approval.',
  provide: [
    ['Brand authorization', ['Official authorized partnership certificate.', 'Approved LAX360 Education logo.', 'Brand identity and usage guidelines.', 'Authorized partner designation.', 'Digital partnership badge.', 'Partner listing on the company website, subject to approval.']],
    ['Academic support', ['Course-wise syllabus.', 'Module-wise curriculum.', 'Training materials.', 'Practical assignments.', 'Technical project guidance.', 'Assessment guidelines.', 'Student progress monitoring.', 'Faculty teaching support.']],
    ['Certification support', ['Course completion certificate processing.', 'Internship completion certificate processing.', 'Workshop participation certificates.', 'Seminar participation certificates.', 'Faculty training certificates.', 'Student assessment and verification guidelines.'], 'Certificates are issued through the approved company process, based on programme eligibility and completion requirements.'],
    ['Branding & marketing kit', ['Authorized logo files.', 'Course admission posters.', 'Training programme brochures.', 'Digital marketing creatives.', 'College workshop posters.', 'Internship promotional designs.', 'Social media templates.', 'Banner and standee designs.', 'Student ID and faculty ID templates.', 'Digital presentation materials.']],
    ['Technical support', ['Online class coordination where available.', 'Faculty technical guidance.', 'Software and tool orientation.', 'Project mentoring.', 'Course updates.', 'Technical troubleshooting guidance.']],
    ['Placement & career support', ['Resume preparation guidance.', 'Mock interviews.', 'Aptitude preparation.', 'Technical interview preparation.', 'Job opportunity sharing.', 'Recruitment coordination.', 'Career guidance and counselling.'], 'Placement support is subject to available opportunities and employer requirements, and is not a job guarantee.'],
  ],
  collab: {
    lead: "LAX360 Education encourages academic partnerships with educational institutions to improve students' technical knowledge and industry exposure.",
    activities: ['Memorandum of Understanding (MoU) signing.', 'Technical workshops.', 'Industry-oriented seminars.', 'Guest lectures.', 'Faculty development programmes.', 'Add-on and value-added courses.', 'Internship programmes.', 'Final-year academic projects.', 'Mini-project and major-project guidance.', 'Technical competitions.', 'Career development programmes.', 'Placement awareness programmes.', 'Industrial visits, where arranged.', 'Student skill development activities.', 'Technology awareness programmes.'],
    mouLead: 'The institutional MoU can define:',
    mou: ['Areas of academic collaboration.', 'Courses and training programmes.', 'Workshop and seminar schedules.', 'Internship and project activities.', 'Faculty and resource requirements.', 'Student participation and assessment.', 'Commercial and operational responsibilities.', 'Agreement duration and renewal.', 'Termination and dispute resolution.'],
  },
  internships: {
    lead: 'LAX360 Education provides internship and academic project coordination opportunities through approved partnership arrangements.',
    domains: ['Artificial Intelligence', 'Python Development', 'Web Development', 'Full Stack Development', 'Data Analytics', 'Machine Learning', 'Cyber Security', 'Digital Marketing', 'UI/UX Design', 'CAD & Engineering Design', 'Electrical Design', 'PLC & SCADA'],
    projects: ['Final-year projects.', 'Mini-projects.', 'Major academic projects.', 'Real-time project guidance.', 'Software development projects.', 'Engineering design projects.', 'Research and technical documentation.', 'Project presentation preparation.'],
    support: ['Internship programme details.', 'Student registration.', 'Domain allocation.', 'Training schedule.', 'Mentor coordination.', 'Project evaluation.', 'Completion verification.', 'Eligible internship certificates.'],
  },
  faculty: {
    lead: 'LAX360 Education supports partner institutions in improving faculty technical knowledge and training capabilities.',
    programs: ['Artificial Intelligence and emerging technologies.', 'Python and software development.', 'Web technologies.', 'Data analytics and visualization.', 'Cyber security fundamentals.', 'Engineering design tools.', 'Digital teaching methods.', 'Practical training methodologies.'],
    admin: ['Student registration procedures.', 'Course counselling.', 'Admission coordination.', 'CRM usage.', 'Student documentation.', 'Attendance monitoring.', 'Certification coordination.', 'Partner reporting procedures.'],
  },
  branding: {
    lead: 'Every approved partner can receive an authorized branding package according to the agreed partnership model.',
    rows: [['LAX360 Education Logo', 'Approved brand identity'], ['Partnership Certificate', 'Official partner recognition'], ['Authorization Letter', 'Scope of approved authorization'], ['Partner ID Card', 'Partner identification'], ['Digital Badge', 'Website and digital recognition'], ['Office Name Board Design', 'Approved centre branding'], ['Course Brochures', 'Course promotion'], ['Admission Posters', 'Student enrolment campaigns'], ['Social Media Templates', 'Online marketing'], ['Workshop Posters', 'Event promotion'], ['Internship Posters', 'Internship promotion'], ['Certificate Templates', 'Approved certificate processing'], ['Presentation Templates', 'Institutional presentations'], ['Letterhead Template', 'Official partner communication'], ['WhatsApp Creatives', 'Digital promotions']],
    conditions: ['Only approved logo files can be used.', 'Partners must follow brand colour and design guidelines.', 'Partnership certificates cannot be altered.', 'Authorization cannot be transferred to another organization without written permission.', 'Branding must not imply government recognition or university accreditation unless separately established and approved.'],
  },
  digital: {
    lead: 'LAX360 Education can provide an online presence for approved institutional and authorized training partners.',
    profile: ['Partner institution name.', 'Official logo.', 'Partner category.', 'Branch or institution location.', 'Contact information.', 'Approved course details.', 'Training facilities.', 'Institutional activities.', 'Partnership announcement.', 'Website and social media links.'],
    support: ['Partner profile creation.', 'Admission enquiry integration.', 'Course catalogue display.', 'Digital brochures.', 'Promotional landing pages.', 'Online registration support.', 'Google Maps integration, where applicable.'],
    note: 'All partner profiles are subject to company verification and publication approval.',
  },
  crm: {
    lead: 'An integrated partner management system can help LAX360 Education and its authorized partners coordinate institutional activities.',
    rows: [['Partner Login', 'Secure partner account'], ['Institution Profile', 'Partner details and contact information'], ['Student Registration', 'Student information management'], ['Enquiry Management', 'Admission enquiry tracking'], ['Course Management', 'Course and batch details'], ['Internship Management', 'Internship registrations'], ['Attendance', 'Student attendance records'], ['Certification Tracking', 'Certificate processing status'], ['Reports', 'Institution-wise reports'], ['Performance Dashboard', 'Programme and activity monitoring'], ['Communication', 'Partner notifications and updates']],
    note: 'Access permissions will be determined by the partner category and approved agreement.',
  },
  marketing: {
    lead: 'LAX360 Education supports approved partners in promoting educational programmes.',
    activities: ['Course admission campaigns.', 'College-level marketing campaigns.', 'Social media promotions.', 'WhatsApp marketing support.', 'Educational brochures.', 'Technical event promotion.', 'Workshop and seminar campaigns.', 'Internship promotions.', 'Digital admission campaigns.', 'Local awareness activities.'],
    business: ['Institutional relationship development.', 'College and school outreach.', 'Corporate training enquiries.', 'Course promotion strategies.', 'Partnership coordination.', 'Joint promotional activities.', 'Admission campaign planning.'],
  },
  infrastructure: {
    lead: 'For authorized training partners, the following facilities may be required depending on the approved programme.',
    rows: [['Training Classroom', 'Dedicated learning space'], ['Computer Lab', 'Systems according to batch size'], ['Internet', 'Reliable internet connectivity'], ['Projector', 'Projector or smart display'], ['Furniture', 'Student desks and chairs'], ['Faculty Space', 'Staff working area'], ['Software', 'Appropriate licensed software'], ['Reception', 'Student enquiry and counselling space'], ['Safety', 'Basic fire and electrical safety'], ['Branding', 'Approved partner signage']],
    note: 'Institutional partnerships that only involve workshops, seminars or student referrals may not require a separate training centre.',
  },
  onboarding: [
    ['Partnership enquiry', 'The institution or organization submits an online partnership application.'], ['Initial discussion', 'LAX360 discusses the partnership objectives, proposed programmes and requirements.'],
    ['Organization verification', "Review the institution's or organization's identity, profile and relevant documents."], ['Partnership proposal', 'Prepare a proposal covering academic activities, support, responsibilities and commercial terms.'],
    ['Approval & agreement', 'Obtain management approval and execute the applicable partnership agreement or MoU.'], ['Authorization & branding', 'Issue the approved authorization documents and provide applicable branding resources.'],
    ['Training & orientation', 'Conduct the required faculty, staff and operational orientation.'], ['Programme implementation', 'Launch approved courses, seminars, workshops, internships, add-on value courses or institutional activities.'],
    ['Monitoring & review', 'Review performance, student feedback and partnership activities periodically.'],
  ],
  // Commercial terms: no figures, tables or percentages are published; they are agreed with each partner and put in a written agreement.
  commercial: {
    lead: 'All commercial arrangements, including revenue-sharing percentages, referral commissions, incentives, payment structures and other financial terms, will be discussed individually with the respective Authorized Business Partner or Referral Partner.',
    paragraphs: [
      'These commercial terms will be mutually agreed upon through direct discussions and documented separately in a written agreement, wherever applicable.',
      'Commercial terms and revenue-sharing details are not published on the LAX360 website and will be communicated directly to the concerned partner.',
    ],
  },
  ip: [
    'All company-owned logos, trademarks, software, designs, course materials, documents and other intellectual property remain the property of LAX360 or their respective owners.',
    'Partners must not copy, distribute, modify, sell or commercially use company materials beyond the permitted authorization.',
    'Upon termination, partners must stop using company branding and return or delete confidential materials as instructed.',
  ],
  legal: [
    'All partners must comply with applicable laws, regulations and company policies.',
    'LAX360 reserves the right to update or modify these Terms & Conditions when necessary.',
    'Any disputes will initially be addressed through mutual discussion.',
    'If a dispute cannot be resolved mutually, it will be subject to the jurisdiction of the competent courts in Chennai, Tamil Nadu, subject to applicable law.',
  ],
  termination: [
    "Either party may terminate the partnership by providing 15 days' prior written notice.",
    'LAX360 reserves the right to terminate the partnership immediately in cases of fraud, financial misconduct, unauthorized fee collection, false representations, misuse of company branding, disclosure of confidential information or serious violations of these Terms & Conditions.',
    'Upon termination, the partner must immediately stop representing themselves as an active partner of LAX360.',
    'The partner must discontinue the use of company branding and return or delete confidential company materials as instructed.',
    'Any outstanding obligations will be handled according to the applicable written agreement.',
  ],
  documents: {
    lead: 'The following documents may be requested depending on the partner category.',
    colleges: ['Institution profile.', 'Registration or recognition details, as applicable.', 'Institution address proof.', 'Authorized signatory details.', 'Principal / Director / Management details.', 'Institutional contact information.', 'Proposed collaboration details.', 'Relevant authorization or approval documents.'],
    business: ['Business or organization profile.', 'Applicable business registration proof.', 'PAN details, where applicable.', 'GST registration, where applicable.', 'Address proof.', 'Owner / Director identification and authorization details.', 'Infrastructure details, if training delivery is proposed.', 'Faculty details, if applicable.', 'Proposed course list.', 'Partnership application.'],
    provided: ['Partnership Proposal.', 'Authorized Partnership Agreement.', 'MoU Format, where applicable.', 'Authorization Letter.', 'Authorized Partnership Certificate.', 'Brand Guidelines.', 'Course Catalogue.', 'Academic Syllabus.', 'Training Guidelines.', 'Branding Kit.', 'Operational Guidelines.', 'Certification Guidelines.'],
  },
  responsibilities: ['Follow the approved partnership agreement.', 'Maintain professional standards.', 'Use LAX360 branding only within the authorized scope.', 'Provide accurate information to students.', 'Maintain appropriate student records.', 'Ensure qualified trainers where training is provided.', 'Follow the approved academic curriculum.', 'Maintain proper fee documentation.', 'Protect confidential company and student information.', 'Obtain consent before sharing student information.', 'Follow applicable legal and regulatory requirements.', 'Submit programme reports when required.', 'Maintain the reputation and integrity of LAX360 Education.'],
  faqs: [
    ['What is an LAX360 Education Authorized Partnership?', 'It is an official collaboration arrangement between LAX360 Education and an approved institution or organization to deliver agreed educational, training or career development activities.'],
    ['Who can apply?', 'Colleges, universities, schools, polytechnics, training centres, corporate organizations and eligible educational organizations can apply.'],
    ['Can colleges sign an MoU with LAX360 Education?', 'Yes. Colleges and institutions can enter into an MoU covering agreed workshops, internships, academic training, add-on courses and other collaboration activities.'],
    ['Will LAX360 provide an authorization certificate?', 'Approved partners can receive an authorized partnership certificate and authorization letter specifying the approved scope and validity.'],
    ['Can partners conduct LAX360 Education courses?', 'Yes. Partners can conduct the courses in the LAX360 Education course list, subject to the approved programme, faculty, facilities and course delivery arrangements. Only the courses in that list are offered.'],
    ['Does LAX360 provide course materials?', 'Academic materials, syllabus and training guidance can be provided according to the selected partnership model.'],
    ['Can partners issue LAX360 certificates?', 'Certificates are issued through the approved LAX360 certification process. Partners cannot independently create, sign or issue company certificates without authorization.'],
    ['Will LAX360 support college workshops?', 'Yes. Workshops, seminars, technical events and skill development programmes can be coordinated under approved arrangements.'],
    ['Does the partnership include placement support?', 'Career guidance, interview preparation and placement assistance may be included according to the agreement. Employment is not guaranteed.'],
    ['Can an authorized partner open another branch?', 'Additional locations require separate written approval. Authorized partnership alone does not grant franchise or branch ownership rights.'],
    ['Is this partnership government approved accreditation?', 'No. LAX360 Education authorization is a company-issued partnership arrangement and must not be represented as government, university or statutory accreditation.'],
    ['How can an institution apply?', 'Submit the online authorized partnership application through the LAX360 website.'],
  ],
  application: {
    lead: 'Build a strong educational partnership with LAX360 Education and create opportunities for students, institutions and industry professionals.',
    categories: ['College / University Partnership', 'School Partnership', 'Polytechnic Partnership', 'Authorized Training Partner', 'Corporate Training Partner', 'Technology & Industry Partner', 'Education Business Partner'],
    details: ['Institution / organization name', 'Contact person name and designation', 'Official mobile number and email address', 'Organization type', 'City and state', 'Website address', 'Interested partnership model', 'Proposed course categories', 'Expected student strength', 'Infrastructure availability', 'Partnership objectives', 'Supporting documents'],
  },
  terms: ['All partnerships are subject to LAX360 management approval.', 'The partnership will be governed by a signed agreement or MoU.', 'Authorization is limited to the activities specifically mentioned in the agreement.', 'LAX360 branding and intellectual property must be used only with written permission.', 'Partners cannot transfer authorization to third parties.', 'Partners cannot claim government, university or statutory accreditation through this partnership.', "Certificate issuance must follow the company's approved procedures.", 'All financial transactions must follow agreed commercial terms.', 'Both parties must maintain confidentiality and protect personal information.', 'Partners must follow applicable education, business and data protection laws.', 'Partnership renewal and continuation are subject to review.', 'Either party may terminate the agreement according to its termination provisions.'],
}
