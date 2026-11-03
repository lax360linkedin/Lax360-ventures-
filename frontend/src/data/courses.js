// Course content is taken from LAX360's own workshop documents. Fees, schedules,
// certificates and placement promises are deliberately NOT listed — enquiry-first.
// Mode (online / on-campus) is [Confirm] per the planning document.

export const courseCategories = [
  { id: 'ai', name: 'AI & Prompt Engineering' },
  { id: 'programming', name: 'Programming with AI' },
  { id: 'workshop', name: 'College Workshops' },
]

export const courses = [
  {
    slug: 'ai-tools-prompt-engineering',
    title: 'AI Tools & Prompt Engineering',
    subtitle: 'From AI fundamentals to hands-on prompt engineering',
    category: 'ai',
    format: 'Workshop for colleges',
    duration: '5 hours (2 hours theory + 3 hours practicals)',
    audience: 'College students from Engineering, Computer Science, AI & Data Science and other departments; beginner to intermediate.',
    summary: 'A practical workshop that explains how AI works and how to get useful results from AI tools through well-designed prompts.',
    topics: [
      'What AI is, how it works, its history and types',
      'How machines learn: supervised, unsupervised and reinforcement learning',
      'Using AI tools effectively and safely',
      'Writing clear prompts with context and constraints',
      'Hands-on practicals and a mini-project',
    ],
    enquiryType: 'workshop',
  },
  {
    slug: 'hands-on-ai-workshop',
    title: '3-Day Hands-on AI Workshop',
    subtitle: 'From AI fundamentals to application development and AI agents',
    category: 'workshop',
    format: 'Workshop for colleges',
    duration: '3 days',
    audience: 'Students of colleges and institutions.',
    summary: 'Three days of demonstrations, guided activities and project-based learning, ending with student project presentations.',
    topics: [
      'Day 1 — AI fundamentals, AI tools and prompt engineering',
      'Day 2 — AI-assisted website and application development, testing and reviewing AI-generated code',
      'Day 3 — AI workflows, AI agents, tool calling and a mini-project',
    ],
    enquiryType: 'workshop',
  },
  {
    slug: 'python-with-ai',
    title: 'Python with Artificial Intelligence',
    subtitle: 'From code to intelligence',
    category: 'programming',
    format: 'Course',
    duration: 'Eight sessions (total length to be confirmed)',
    audience: 'Students and beginners who want to move from Python basics to building AI applications.',
    summary: 'Learn Python fundamentals, work with data, understand machine learning and generative AI, and build a small project.',
    topics: [
      'AI and Python introduction',
      'Python fundamentals',
      'Python for data and AI',
      'Artificial intelligence and machine learning',
      'Hands-on project: AI student performance predictor',
      'Generative AI with Python',
      'Prompt engineering and AI tools',
      'AI career roadmap and Q&A',
    ],
    enquiryType: 'course',
  },
]
