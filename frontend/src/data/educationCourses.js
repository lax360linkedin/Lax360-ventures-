// The LAX360 Education course catalogue, exactly as supplied in "LAX360 franchise website details" (section 4). The numbers are the document's own numbering.
// The document lists 20 IT course categories. For Non-IT courses it names the category only ("Engineering design, industrial and professional skills") and gives NO course list, so none is invented here:
// the catalogue dialog says the Non-IT list is not published yet. Add the Non-IT courses to NON_IT_COURSES when management provides them (the page and the dialog pick them up automatically).

export const IT_COURSES = [
  'Python Programming', 'Java Programming', 'Full Stack Web Development', 'Frontend Development', 'Backend Development', 'Artificial Intelligence', 'Machine Learning', 'Data Science', 'Data Analytics', 'Software Testing',
  'Cloud Computing', 'Cyber Security', 'Ethical Hacking', 'UI/UX Design', 'Mobile Application Development', 'Digital Marketing', 'Database Management', 'DevOps Engineering', 'Power BI', 'Microsoft Office & Advanced Excel',
].map((name, i) => ({ no: i + 1, name }))

// How the 20 are grouped on screen (a reading aid only: every course appears once, with its original number).
export const IT_GROUPS = [
  { title: 'Programming', nos: [1, 2] },
  { title: 'Web development', nos: [3, 4, 5] },
  { title: 'AI and data', nos: [6, 7, 8, 9, 19] },
  { title: 'Cloud, security and operations', nos: [11, 12, 13, 18] },
  { title: 'Design and mobile', nos: [14, 15] },
  { title: 'Software quality and databases', nos: [10, 17] },
  { title: 'Business and marketing skills', nos: [16, 20] },
]

export const NON_IT_DESCRIPTION = 'Engineering design, industrial and professional skills.'
export const NON_IT_COURSES = [] // not supplied yet
export const COURSE_COUNT = IT_COURSES.length + NON_IT_COURSES.length
