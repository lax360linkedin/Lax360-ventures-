# Digital Marketing service pages (from "LAX360_Digital_Marketing_Services_Page_Content.docx_20261125_222200_0000.pdf")

## What changed
The Digital Marketing division (`/services/growth`) now has the five service categories of the supplied document, each with its own page. Text is the document's, with nothing added.

| Page | Content from the document | Photo |
|---|---|---|
| `/services/growth/social-media-management` | intro; Meta (Facebook and Instagram), LinkedIn, Pinterest, X (Twitter); closing line on branding, hashtag strategy and monthly reports | existing service photo |
| `/services/growth/search-engine-optimization-seo` | intro; On-Page, Local, Off-Page and Technical SEO | analytics chart |
| `/services/growth/creatives` (new) | intro; Poster and Graphic Design, Video Shooting, Video Editing | creative laptop photo |
| `/services/growth/content-publishing` (new) | intro; Article Writing, Blogger, Reddit; "other article and content platforms" | writing photo |
| `/services/growth/paid-advertising` (new) | intro; "every campaign includes" targeting, budget management, A/B testing, reports; Meta Ads (6 campaign types), Google Ads (4), LinkedIn Ads (5), X Ads (5) | analytics dashboard |

Each page has the existing hero (title, intro, photo, "Enquire Now"), the document's offerings as a feature grid, related services, previous/next navigation and the closing "Enquire Now / Start a Project" call to action. The page template (`ServiceItem.jsx`) now hides the About, Problems, Benefits and Examples sections when a service has no text for them (the document has none), instead of showing outdated copy. All other service pages are unchanged.

## Removed (outdated or not in the document)
Meta Ads Management, Google Ads Management (now inside Paid Advertising), Website & Landing Page Optimization, Content Creation (now Content Publishing) and Digital Marketing Strategy, with their copy.

## SEO and routing
* 15 permanent (308) redirects in `vercel.json` (English, Tamil, Hindi) keep old links and rankings: meta/google-ads -> `paid-advertising`; content-creation -> `content-publishing`; website-and-landing-page-optimization -> `/services/software/website-development`; digital-marketing-strategy -> `/services/growth`. `npm run seo:routes` checks them (it now also understands the /ta and /hi prefixes).
* Sitemap, prerendered pages, titles ("<service> — Marketing | LAX360 Pvt Ltd") and the category meta description follow the new list automatically; the five old URLs are gone from the sitemap.
* Kept in step: contact-form service list (`contact_catalog.py`), admin service-page list (`service_pages.py`, now 45), demo seed, the chatbot's service description (`lax360_knowledge.py`), icons, and one backend test.

## Needs your attention
* Backend tests that need PostgreSQL (`test_admin_content_settings.py`, `test_lead_pipeline.py`) could not run here; the changes are plain list edits and the modules import cleanly.
* Anything already stored in the live database against a removed page (a testimonial or client assigned to "Meta Ads Management" and so on, or an admin edit of those pages) is no longer shown on a page; reassign or delete it in the admin panel.
* The photos are the site's existing stock photos (a creative laptop, analytics, writing); replace them with your own work when you have it.
