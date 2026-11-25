// The LAX360 Education course list, exactly as supplied in "IT_Course_List.docx" (IT Courses > Certification Courses): 53 courses in 11 categories, with the document's own numbering and its
// "Software" column. LAX360 Education offers ONLY these courses: every Education Franchise, Authorized Partner and Referral Partner page, the sidebar list, the dialog and the tests read this
// one file, so the three programmes can never disagree. The earlier 20-course list and the "Non-IT courses" placeholder were removed because they are not offered.

const GROUPS = [
  ['Programming Languages', [['Certificate in Python Programming', 'Python'], ['Certificate in Java Programming', 'Java'], ['Certificate in C Programming', 'C'], ['Certificate in C++ Programming', 'C++'], ['Certificate in JavaScript Essentials', 'JavaScript'], ['Certificate in .NET Programming', '.NET']]],
  ['Web Designing', [['Certificate in HTML & CSS', 'HTML & CSS (Combo)'], ['Certificate in Bootstrap', 'Bootstrap'], ['Certificate in Angular Basics', 'Angular'], ['Certificate in Node.js Basics', 'Node.js'], ['Certificate in React Basics', 'React'], ['Certificate in PHP Programming', 'PHP']]],
  ['Database', [['Certificate in MySQL', 'MySQL'], ['Certificate in MongoDB', 'MongoDB'], ['Certificate in Oracle Database', 'Oracle'], ['Certificate in SQL Server', 'SQL Server']]],
  ['Full Stack Development with AI', [['MERN Stack Development With AI'], ['Java Full Stack Development With AI'], ['MEAN Stack Development With AI'], ['PHP Full Stack Development With AI'], ['Python Full Stack Development With AI']]],
  ['Software Testing', [['Certificate in Manual Testing', 'Manual Testing'], ['Certificate in Selenium Automation', 'Selenium'], ['Certificate in JMeter', 'JMeter'], ['Certificate in QTP/UFT', 'QTP/UFT'], ['Certificate in Soap UI', 'Soap UI']]],
  ['Cloud Computing', [['Certificate in AWS Essentials', 'AWS'], ['Certificate in Microsoft Azure', 'Azure'], ['Certificate in Google Cloud Basics', 'Google Cloud'], ['Certificate in OpenStack', 'OpenStack']]],
  ['DevOps', [['Certificate in Git & GitHub', 'Git & GitHub'], ['Certificate in Jenkins', 'Jenkins'], ['Certificate in Docker', 'Docker'], ['Certificate in Kubernetes', 'Kubernetes'], ['Certificate in Ansible', 'Ansible'], ['Certificate in Puppet', 'Puppet']]],
  ['Database & AI', [['Certificate in Data Science with Python', 'Python'], ['Certificate in Machine Learning', 'Machine Learning'], ['Certificate in Tableau Basics', 'Tableau'], ['Certificate in Power BI Basics', 'Power BI']]],
  ['Cyber Security', [['Certificate in Wireshark', 'Wireshark'], ['Certificate in Metasploit', 'Metasploit'], ['Certificate in Mimikatz', 'Mimikatz'], ['Certificate in Burp Suite', 'Burp Suite']]],
  ['Digital Marketing', [['Certificate in SEO Basics', 'SEO Tools'], ['Certificate in Google Ads', 'Google Ads'], ['Certificate in Email Marketing', 'Mailchimp / HubSpot'], ['Certificate in Web Analytics', 'Google Analytics'], ['Certificate in Canva for Creatives', 'Canva']]],
  ['Frameworks', [['Certificate in Django', 'Django'], ['Certificate in Spring Boot', 'Spring Boot'], ['Certificate in Laravel', 'Laravel'], ['Certificate in React Native', 'React Native']]],
]

let n = 0
/** Every course, in the document's order: { no, name, software, group }. `software` is '' where the document shows a dash. */
export const IT_COURSES = GROUPS.flatMap(([group, items]) => items.map(([name, software]) => ({ no: (n += 1), name, software: software || '', group })))

/** The 12 categories with their courses (a reading aid: each course appears once, under its category, with its original number). */
export const COURSE_GROUPS = GROUPS.map(([title]) => ({ title, courses: IT_COURSES.filter((c) => c.group === title) }))
export const IT_GROUPS = COURSE_GROUPS.map((g) => ({ title: g.title, nos: g.courses.map((c) => c.no) }))
export const COURSE_COUNT = IT_COURSES.length
export const COURSE_CATEGORY_COUNT = COURSE_GROUPS.length
export const COURSE_SUMMARY = `${COURSE_COUNT} certification courses in ${COURSE_CATEGORY_COUNT} categories`
