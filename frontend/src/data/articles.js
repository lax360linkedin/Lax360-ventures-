// Starter articles for the Insights page (shown until articles are published in the admin panel: Website content > Insights).
// They are original, evergreen explainers written by LAX360 Ventures. They are not news reports and make no claims about named
// companies or recent events. Body text: blank line = new paragraph, a line starting with "## " = sub-heading.
export const articleCategories = [
  { value: 'ai', label: 'Artificial Intelligence' },
  { value: 'software', label: 'Software Development' },
  { value: 'transformation', label: 'Digital Transformation' },
  { value: 'news', label: 'Technology News & Updates' },
  { value: 'blog', label: 'Technology Blog' },
]

export const articles = [
  {
    slug: 'ai-assistants-for-everyday-business',
    title: 'AI assistants for everyday business: where they help and where they do not',
    category: 'ai', publishedOn: '2026-10-20', author: 'LAX360 Team', image: '/assets/insights/ai-trends.webp',
    excerpt: 'A practical look at the jobs AI assistants do well today, and the ones that still need a person.',
    body: `AI assistants are now good enough to be useful in ordinary businesses, but they are not magic. The teams that get value from them start with a narrow job and a clear measure of success.

## Where they help
Assistants work best on repetitive questions with known answers: opening hours, order status, product details, how to book. They answer instantly, at any hour, and free your team for conversations that need judgement.

They are also good at first drafts. Summaries of long documents, replies to routine emails and meeting notes can all start from an assistant and finish with a person.

## Where they do not
An assistant should not decide anything with legal, financial or safety consequences on its own. It should also not answer from memory when the right answer lives in your own documents. Give it approved information to answer from, and make handover to a person easy.

## Starting small
Pick one question your team answers every day. Write down the approved answer, let the assistant handle it, and review the conversations weekly. Expand only when the first job works.`,
  },
  {
    slug: 'automation-before-ai',
    title: 'Automate the boring work first: a simple order for AI and automation projects',
    category: 'ai', publishedOn: '2026-10-06', author: 'LAX360 Team', image: '/assets/insights/ai-automation.webp',
    excerpt: 'Most teams get faster results by removing manual re-entry before adding any AI at all.',
    body: `When a business says it wants AI, the real problem is often manual work: the same details typed into three places, follow-ups that depend on someone remembering, reports built by hand every Monday.

## Step one: connect your tools
Before any AI is involved, make your existing tools talk to each other. A new enquiry should create a record, notify the right person and schedule a follow-up without anyone copying and pasting.

## Step two: standardise the process
Automation amplifies whatever process you have. If two people handle the same request in different ways, fix that first, then automate the version you want.

## Step three: add AI where it fits
Once the flow is clean, AI can classify messages, draft replies or pull answers from documents. It now has structured data to work with, and you can see exactly where it helped.`,
  },
  {
    slug: 'building-software-that-lasts',
    title: 'Building software that lasts: five habits of teams that ship reliably',
    category: 'software', publishedOn: '2026-09-22', author: 'LAX360 Team', image: '/assets/insights/software-teams.webp',
    excerpt: 'Reliable delivery is mostly habits, not heroics. These five make the biggest difference.',
    body: `Good software is rarely the result of one brilliant effort. It comes from small, repeated habits that keep a codebase healthy while the product keeps changing.

## 1. Write down the problem first
A clear problem statement saves more time than any tool. If the team cannot say in two sentences what a feature is for, it is not ready to build.

## 2. Keep changes small
Small changes are easier to review, easier to test and easier to undo. Aim for work that can ship in days, not months.

## 3. Test what matters
You do not need to test everything. Test the paths that earn money or protect data, and automate those tests so they run on every change.

## 4. Review each other's work
Code review spreads knowledge and catches mistakes early. It works best when it is fast and kind.

## 5. Plan for the second year
Document decisions, keep dependencies current and budget time for maintenance. Software that is not maintained quietly becomes software that cannot be changed.`,
  },
  {
    slug: 'digital-transformation-in-small-steps',
    title: 'Digital transformation in small steps: a roadmap for growing businesses',
    category: 'transformation', publishedOn: '2026-09-08', author: 'LAX360 Team', image: '/assets/insights/digital-transformation.webp',
    excerpt: 'You do not need a big-bang programme. A sequence of small, visible wins works better.',
    body: `Digital transformation sounds like a large, expensive programme. For most growing businesses it is better understood as a series of small changes that each remove a real pain.

## Start with where time is lost
Walk through a normal week and note where people re-type, chase, wait or search. These are your first candidates, and the benefit of fixing them is easy to see.

## Choose one process and finish it
Pick a single process, such as quotes, billing or customer follow-up, and move it fully onto a shared system. A finished process teaches your team more than three half-finished ones.

## Bring people along
New tools fail when the people using them were not asked. Involve the team early, train them properly and keep the old way available just long enough to feel safe.

## Measure and repeat
Decide how you will know it worked: hours saved, errors reduced, faster response. Then take the next process, with what you learned.`,
  },
  {
    slug: 'what-to-watch-in-technology',
    title: 'What to watch in technology: trends business owners should keep an eye on',
    category: 'news', publishedOn: '2026-08-25', author: 'LAX360 Team', image: '/assets/insights/tech-watch.webp',
    excerpt: 'Four lasting shifts that matter more than any single headline.',
    body: `Technology news moves quickly, and most of it will not matter to your business. These four longer-running shifts are worth keeping an eye on.

## AI inside everyday tools
AI features are becoming part of the software you already use: email, documents, CRM and support. The practical question is which of them saves your team time, and which only adds noise.

## Smarter automation
Connecting tools and automating hand-offs is getting easier. Businesses that document their processes will benefit first.

## Security as a basic expectation
Customers increasingly expect their data to be handled carefully. Basic habits such as strong passwords, access control and backups matter more than any single tool.

## Mobile-first customers
Many customers will meet your business first on a phone. Fast, simple mobile pages and easy ways to enquire are no longer optional.

We will keep this page updated with practical notes as these areas develop.`,
  },
  {
    slug: 'web-and-mobile-apps-which-first',
    title: 'Website, web app or mobile app: which should you build first?',
    category: 'blog', publishedOn: '2026-08-11', author: 'LAX360 Team', image: '/assets/insights/mobile-apps.webp',
    excerpt: 'A short guide to choosing the right starting point for your idea.',
    body: `Many ideas start with the question "should we build an app?" The honest answer depends on who will use it and how often.

## A website
If people need to find you, understand what you offer and get in touch, start with a fast, clear website. It is the cheapest way to be visible.

## A web app
If your team or customers need to log in, manage records or complete tasks, a web app works on every device without installation and is quicker to improve.

## A mobile app
Choose a mobile app when you need device features such as notifications, offline use or the camera, or when people will use it daily.

## A sensible path
Many businesses begin with a website, add a web app for the core workflow, and build a mobile app only when usage justifies it. Planning the pieces together from the start keeps them consistent.`,
  },
]

export const getArticle = (slug) => articles.find((a) => a.slug === slug)
