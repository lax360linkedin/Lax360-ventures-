# Education & Training — the seventh service category

**Address:** `/services/education` (category) and `/services/education/<programme>` (eight programmes). In the code the category id is `education` (category 07).

## What was added
- `frontend/src/data/services.js` — the `education` division and its eight programmes: Technical Training, Professional Certification Courses, Internship Programs, AI & Software Development Training, Workshops and Seminars, Corporate Training, College and Institutional Training, Skill Development Programs.
- `frontend/src/data/serviceDetails.js` — the written page for each programme. The wording comes from LAX360's own Education documents (Education Franchise / Authorized Partner / Referral Partner content and the approved course list). **No fees, batch dates, placement promises, results or testimonials are stated.**
- Category page (`ServiceDetail.jsx`, `CategoryLayouts.jsx`): hero, overview, programme cards, **Available courses** (the approved catalogue), **Program benefits**, use cases, process, FAQ, related categories and enquiry buttons (`/contact?type=course`).
- Site-wide: Services page (new section, pill, hero icon strip), home "Our Services" cards, home service carousel card and slider, About (introduction text and expertise grid), About/Services hero text, footer menu, chatbot knowledge and links, contact form service list, sitemap (`routes.js`) and SEO titles/descriptions.

## Course catalogue (one source)
`frontend/src/data/educationCourses.js` (53 courses, 11 categories) stays the approved catalogue. The Education page **and** every Education partner page (Franchise, Authorized, Referral) read it through `useCourseCatalogue()` (`hooks/useEducation.js`), so they can never disagree.

## Admin panel (Website content → Services)
| Editor | What it controls |
|---|---|
| **Education & Training page** | H1, introduction, main photo, overview, text above the course list, benefits (one `Title: text` per line), enquiry button text/link |
| **Education programmes** | Summary, full description, key points and photo of each of the eight programmes |
| **Education courses** | Changes to the catalogue: add a course (name + category), hide a course (exact name + Hidden), replace a course (new name + the exact name it replaces) |
| SEO management | Search title, description, canonical, Open Graph, noindex for `/services/education` and each programme (enter the address under "SEO for another page") |

Everything is an optional layer: nothing published = the built-in content, so the pages are never empty. A new service that is not one of the eight can be added under **Services** with a category.

## Notes
- New English wording has no Tamil / Hindi translation yet (those pages show English until translated in the admin Translations screen).
- Photos are the existing stock photos; replace them from the admin panel.
- Testimonials and clients can be assigned to `education/*` pages like any other service (none are invented).
