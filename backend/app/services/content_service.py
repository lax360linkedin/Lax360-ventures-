"""CMS content. `KINDS` is the registry of everything an administrator can manage: it drives the admin forms, the validation, the per-module
permissions and what the public website may read. Items are stored in `content_items` (kind, slug, title, data, status, sort_order):
- `status` is the publishing workflow: a draft is private (never returned by the public API), a published item is live;
- `sort_order` is the display order;
- fields of type `image` / `video` hold the id of a media-library item (never a URL or a file), resolved to a URL only on the way out.
"""

from __future__ import annotations

import datetime
import json
import re
import uuid

from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import ApiError
from app.models import ContentItem, MediaAsset, User
from app.service_pages import SERVICE_PAGES, SERVICE_SCOPES
from app.services import media_service

_LINK = re.compile(r"^https?://[^\s]+$")
_LINK_FIELDS = ("link", "cta_link", "apply_link", "cta_primary_link", "cta_secondary_link")


UPCOMING_STATUSES = [{"value": v, "label": l} for v, l in (("coming_soon", "Coming Soon"), ("under_development", "Under Development"), ("available", "Available"), ("unavailable", "Temporarily Unavailable"))]
UPCOMING_BUILTIN_CATEGORIES = [{"value": v, "label": l} for v, l in (("ai", "Artificial Intelligence (AI)"), ("robotics", "IoT, Embedded Systems & Robotics"), ("cad-engineering", "CAD Designing & Training"), ("blockchain", "Blockchain & Web 3.0"))]


# external links of a product, website or application: (field, admin label, default button text). A button is shown only when a valid address is entered.
LINK_FIELDS = [("live_website_url", "Live Website URL", "View Live Website"), ("live_app_url", "Live Application URL", "Launch Application"), ("landing_url", "Product Landing Page URL", "Explore Product"),
               ("play_store_url", "Android Play Store URL", "Get it on Google Play"), ("app_store_url", "Apple App Store URL", "Download on the App Store"),
               ("desktop_download_url", "Desktop Application Download URL", "Download Application"), ("docs_url", "Product Documentation URL", "View Documentation"),
               ("custom_link_url", "Custom External Link URL", "Learn more")]


def F(name, label, kind="text", required=False, max_len=300, options=None, help="", options_from=None, default=None, ui=None):
    return {"name": name, "label": label, "type": kind, "required": required, "max": max_len, "options": options or [], "help": help, "options_from": options_from, "default": default, "ui": ui}


WELCOME_THEMES = [{"value": v, "label": l} for v, l in (("welcome", "Welcome (violet and electric blue)"), ("software", "Software (code and interface)"), ("marketing", "Marketing (growth and reach)"),
                                                       ("education", "Education (learning paths)"), ("ai", "Artificial Intelligence (neural network)"), ("robotics", "Robotics (circuits and motion)"),
                                                       ("blockchain", "Blockchain (linked blocks)"), ("celebration", "Celebration (festival, announcement or offer)"))]
CAROUSEL_SHAPES = [{"value": "landscape", "label": "Landscape (wide)"}, {"value": "portrait", "label": "Portrait (narrow)"}]
CAROUSEL_SPEEDS = [{"value": "slow", "label": "Slow"}, {"value": "normal", "label": "Normal"}, {"value": "fast", "label": "Fast"}]
WELCOME_CARD_TYPES = [{"value": v, "label": l} for v, l in (("regular", "Regular welcome card"), ("festival", "Festival greeting"), ("announcement", "Special announcement"), ("offer", "Company offer / promotion"))]
EDUCATION_PROGRAMS = [("technical-training", "Technical Training"), ("professional-certification-courses", "Professional Certification Courses"), ("internship-programs", "Internship Programs"),
                      ("ai-and-software-development-training", "AI & Software Development Training"), ("workshops-and-seminars", "Workshops and Seminars"), ("corporate-training", "Corporate Training"),
                      ("college-and-institutional-training", "College and Institutional Training"), ("skill-development-programs", "Skill Development Programs")]
DIVISIONS = [{"value": v, "label": l} for v, l in (("software", "Software & IT Services"), ("growth", "Digital Marketing"), ("education", "Education & Training"), ("ai", "Software & IT Services (former AI category)"), ("headless", "Software & IT Services (former Headless SaaS & API category)"), ("automation", "Software & IT Services (former Workflow Automation category)"), ("mobile", "Software & IT Services (former Mobile & Business Apps category)"))]
SECTION_KEYS = [{"value": v, "label": l} for v, l in (
    ("marquee", "Scrolling strip under the hero"), ("whoweare", "Who We Are"), ("purpose", "Our Vision & Our Mission"), ("services", "Services overview"), ("outcomes", "Why Choose Us"), ("clients", "Our Clients"), ("testimonials", "Client & student testimonials"),
    ("process", "How we work"), ("gallery", "Image carousel (between Testimonials and Our Clients)"),
    ("faq", "FAQ"), ("contact", "Contact call-to-action"))]
ABOUT_SECTIONS = [{"value": v, "label": l} for v, l in (
    ("story", "Our story"), ("motto", "Our motto"), ("purpose", "Mission & vision"), ("expertise", "Core expertise"), ("features", "Our features"),
    ("values", "Our values"), ("technology", "Our approach to technology"), ("cta", "Final call to action"))]
PAGES = [{"value": v, "label": l} for v, l in (("home", "Home"), ("about", "About"), ("services", "Services"), ("industries", "Industries"), ("insights", "Insights"), ("network", "Our Network"), ("team", "Our Team"),
                                              ("products", "Products"), ("work", "Work"), ("career", "Career"), ("contact", "Contact"))]
PRODUCT_CATEGORIES = [{"value": v, "label": l} for v, l in (("business", "Business Management"), ("industry", "Industry Solutions"), ("education", "Education & Learning"), ("developer", "Developer Solutions"),
                                                           ("workforce", "Workforce Management"), ("booking", "Booking & Scheduling"), ("productivity", "Productivity & Collaboration"), ("automation", "Automation & Integration"))]
PRODUCT_RESOURCE_TYPES = [{"value": v, "label": l} for v, l in (("demo_pdf", "Demo PDF"), ("brochure", "Product brochure"), ("documentation", "Documentation"), ("other", "Other resource"))]
WEBSITE_KINDS = [{"value": v, "label": l} for v, l in (("client", "Client website"), ("company", "LAX360 company website"), ("demo", "Demonstration project"))]
WEBSITE_TYPES = [{"value": v, "label": l} for v, l in (("static", "Static website"), ("dynamic", "Dynamic website"), ("web_app", "Web application"))]
PRODUCT_STATUSES = [{"value": v, "label": l} for v, l in (("live", "Live — available for customers"), ("beta", "Beta — available for testing or limited access"), ("in_development", "In Development"), ("soon", "Coming Soon"))]
INDUSTRY_GROUPS = [{"value": v, "label": l} for v, l in (("health", "Health, Education & Wellness"), ("commerce", "Commerce, Hospitality & Travel"), ("finance", "Finance, Property & Professional Services"),
                                                         ("industry", "Industry, Infrastructure & Utilities"))]
NETWORK_CATEGORIES = [{"value": v, "label": l} for v, l in (
    ("group", "LAX360 Group Companies"), ("authorized", "Authorized Partners"), ("associated", "Associated Companies"), ("collaboration", "Strategic Collaborations"),
    ("education", "Education & Academic Network"), ("associate", "Business Associates"), ("reseller", "Reseller & Distribution Partners"), ("implementation", "Implementation Partners"),
    ("startup", "Startup & Innovation Ecosystem"), ("industry", "Industry Collaborations"), ("professional", "Professional Network"),
    ("it_software", "IT & Software Partners"), ("cybersecurity", "Cybersecurity Partners"), ("digital_marketing", "Digital Marketing Partners"))]
NETWORK_DIVISIONS = [{"value": v, "label": l} for v, l in (("group", "Group company"), ("it", "IT & Software"), ("cybersecurity", "Cybersecurity"), ("education", "Education & Training"), ("digital-marketing", "Digital Marketing"), ("other", "Other"))]
PARTNER_STATUSES = [{"value": v, "label": l} for v, l in (("active", "Active"), ("planned", "Planned: being finalised"), ("paused", "Paused"))]
NETWORK_RELATIONSHIPS = [{"value": v, "label": l} for v, l in (
    ("group_company", "Group company of LAX360 Pvt Ltd"), ("operated", "Operated by LAX360 Pvt Ltd"), ("associated", "Associated company (separate business)"), ("authorized", "Authorized partner"),
    ("technology_provider", "Technology provider"), ("reseller", "Reseller / distribution partner"), ("associate", "Business associate"), ("implementation", "Implementation partner"),
    ("collaboration", "Strategic collaboration"), ("other", "Other"))]
SOFTWARE_CATEGORIES = [{"value": v, "label": l} for v, l in (
    ("crm_erp", "CRM & ERP"), ("accounting", "Accounting & Billing"), ("hr", "HR & Payroll"), ("productivity", "Business Productivity"), ("ai", "AI Platforms & Subscriptions"),
    ("cloud", "Cloud & Business Applications"), ("other", "Other"))]
SOFTWARE_OWNERSHIP = [{"value": v, "label": l} for v, l in (("lax360", "Developed by LAX360"), ("third_party", "Third-party partner product"), ("resold", "Resold / distributed software"), ("integrated", "Integrated technology solution"))]
TEAM_ROLE_LEVELS = [{"value": v, "label": l} for v, l in (("founder", "Founder"), ("ceo", "CEO"), ("managing_director", "Managing Director"), ("department_head", "Department Head"), ("team_lead", "Team Lead"), ("team_member", "Team Member"))]
TEAM_LEADERSHIP = ("founder", "ceo", "managing_director")  # shown in the Leadership section
CAREER_ICONS = (("sparkles", "Sparkles"), ("rocket", "Rocket"), ("graduation", "Learning"), ("users", "Team"), ("laptop", "Technology"), ("heart", "Care"), ("trending", "Growth"), ("clock", "Time"), ("map", "Location"))
TEAM_GALLERY_CATEGORIES = [{"value": v, "label": l} for v, l in (("activities", "Team activities"), ("office", "Office environment"), ("celebrations", "Team celebrations"), ("workshops", "Technical workshops"),
                                                                ("knowledge", "Knowledge-sharing sessions"), ("learning", "Learning & development"), ("achievements", "Employee achievements"),
                                                                ("games", "Games & fun activities"), ("functions", "Company functions"), ("outings", "Team outings & gatherings"), ("events", "Office events & special occasions"))]
ARTICLE_CATEGORIES =[{"value": v, "label": l} for v, l in (("ai", "Artificial Intelligence & Generative AI"), ("software", "Software Development & Technology"), ("automation", "Business Automation"),
                                                          ("saas", "SaaS & API Innovations"), ("transformation", "Digital Transformation"), ("webmobile", "Web & Mobile Application Development"),
                                                          ("marketing", "Digital Marketing"), ("trends", "Technology Trends & Updates"))]
NAV_PLACES = [{"value": "header", "label": "Header menu"}, {"value": "footer_divisions", "label": "Footer: Divisions column"}, {"value": "footer_company", "label": "Footer: Company column"}]

SOCIAL_PLATFORMS = [{"value": v, "label": l} for v, l in (("instagram", "Instagram"), ("facebook", "Facebook"), ("linkedin", "LinkedIn"), ("youtube", "YouTube"), ("x", "X (Twitter)"))]

KINDS: dict[str, dict] = {
    # ---- Homepage -------------------------------------------------------------------------------------------------------------------
    "hero": {
        "label": "Home page hero", "group": "Homepage", "module": "content", "single": True, "slug": "home", "preview_path": "/",
        "help": "Leave a field empty to keep the website's built-in text. The animated rotating word is not editable here.",
        "fields": [
            F("eyebrow", "Small label above the title", max_len=90), F("headline_1", "H1 heading: line 1", max_len=80, help="The three headline lines together are the home page's one H1 (main heading). Keep it under about 70 characters in total and include the main keyword. Also editable in SEO management."), F("headline_2", "H1 heading: line 2 (highlighted)", max_len=80),
            F("headline_3", "H1 heading: line 3", max_len=80), F("lead", "Supporting paragraph", "textarea", max_len=400),
            F("cta_primary_label", "Primary button text", max_len=40), F("cta_primary_link", "Primary button link", max_len=200, help="A page like /contact or a full https:// URL"),
            F("cta_secondary_label", "Secondary button text", max_len=40), F("cta_secondary_link", "Secondary button link", max_len=200),
        ],
    },
    "section": {
        "label": "Home page sections", "group": "Homepage", "module": "content", "single": False, "slug_field": "key", "preview_path": "/",
        "help": "Control the order of the home page sections and hide the ones you do not want. A section you do not list keeps its normal place and stays visible. "
                "Publish an item to apply it; untick \"Show this section\" to hide the section.",
        "title_label": "Name (for you)",
        "fields": [
            F("key", "Section", "select", True, options=SECTION_KEYS), F("enabled", "Show this section", "bool", default=True),
        ],
    },
    "about_section": {
        "label": "About page sections", "group": "About", "module": "content", "single": False, "slug_field": "key", "preview_path": "/about",
        "help": "Show or hide a section of the About page. A section you do not list stays visible. Publish an item to apply it; untick \"Show this section\" to hide the section.",
        "title_label": "Name (for you)",
        "fields": [F("key", "Section", "select", True, options=ABOUT_SECTIONS), F("enabled", "Show this section", "bool", default=True)],
    },
    "faq_category": {
        "label": "FAQ categories", "group": "Homepage", "module": "content", "single": False, "preview_path": "/",
        "help": "The headings the home page FAQ is organised under (for example Pricing & Payments). Add, rename, reorder or remove them freely; a question without a category appears under \"General\".",
        "title_label": "Category name",
        "fields": [F("description", "Short description (optional)", "textarea", max_len=200)],
    },
    "faq": {
        "label": "FAQ entries", "group": "Homepage", "module": "content", "single": False, "preview_path": "/",
        "help": "The questions in the home page FAQ and the Services page FAQ. Choose a category and where each question appears; use the order number to arrange questions within a category, "
                "and unpublish one to hide it. If nothing is published for a page, the website's built-in questions are used.",
        "fields": [
            F("group", "Where it appears", "select", True, options=[{"value": "home", "label": "Home page & Services page"}, {"value": "home_only", "label": "Home page only"}, {"value": "services_only", "label": "Services page only"}]),
            F("category", "Category", "select", False, options_from="faq_category"),
            F("answer", "Answer", "textarea", True, max_len=1500),
        ],
        "title_label": "Question",
    },
    # ---- Services -------------------------------------------------------------------------------------------------------------------
    "service_category": {
        "label": "Service categories", "group": "Services", "module": "services", "single": False, "preview_path": "/services",
        "help": "The groups your services are listed under (for example Software & IT Services, Digital Marketing, Education & Training). Add, rename or remove them freely.",
        "title_label": "Category name",
        "fields": [F("description", "Short description", "textarea", max_len=400), F("icon", "Icon / image", "image")],
    },
    "service": {
        "label": "Services", "group": "Services", "module": "services", "single": False, "preview_path": "/services",
        "help": "Each published service appears on the Services page under its category and gets its own detail page.",
        "title_label": "Service name",
        "fields": [
            F("category", "Category", "select", True, options_from="service_category"),
            F("summary", "Short summary (card text)", "textarea", True, max_len=300),
            F("description", "Full description", "textarea", max_len=4000, help="Plain paragraphs. A blank line starts a new paragraph."),
            F("details", "Key points", "textarea", max_len=2000, help="One point per line."),
            F("image", "Main image", "image"), F("icon", "Icon", "image"),
            F("cta_label", "Button text", max_len=40), F("cta_link", "Button link", max_len=300, help="A page like /contact?type=project or a full https:// URL"),
        ],
    },
    "education_page": {
        "label": "Education & Training page", "group": "Services", "module": "services", "single": True, "slug": "education", "preview_path": "/services/education",
        "help": "The text, photo and enquiry button of the Education & Training page (/services/education). Leave a field empty to keep the website's built-in text. "
                "The search title, description and H1 can also be set in SEO management.",
        "fields": [
            F("headline", "Main heading (H1)", max_len=120, help="The one H1 of the page. Keep it clear and include what people search for, for example Education and Training Courses in Salem."),
            F("lead", "Short introduction under the heading", "textarea", max_len=400),
            F("hero_image", "Main photo", "image", help="Shown beside the heading and on the Services page. 1000 x 800 pixels works best."),
            F("overview", "Overview text", "textarea", max_len=3000, help="Plain paragraphs. A blank line starts a new paragraph."),
            F("courses_intro", "Text above the course list", "textarea", max_len=400, help="The course list itself is managed under Education courses."),
            F("benefits_title", "Benefits heading", max_len=80),
            F("benefits", "Program benefits", "textarea", max_len=3000, help="One benefit per line, written as: Title: short explanation"),
            F("cta_label", "Enquiry button text", max_len=40), F("cta_link", "Enquiry button link", max_len=300, help="A page like /contact?type=course or a full https:// URL"),
        ],
    },
    "education_program": {
        "label": "Education programmes", "group": "Services", "module": "services", "single": False, "slug_field": "program", "preview_path": "/services/education",
        "help": "Change the text and photo of one of the eight Education & Training programmes (each has its own page). Leave a field empty to keep the built-in text. "
                "To add a completely new service, use Services and choose a category instead.",
        "title_label": "Programme name (for your own reference)",
        "fields": [
            F("program", "Programme", "select", True, options=[{"value": v, "label": l} for v, l in EDUCATION_PROGRAMS]),
            F("summary", "Short summary (card text and page introduction)", "textarea", max_len=300),
            F("description", "Full description", "textarea", max_len=4000, help="Plain paragraphs. A blank line starts a new paragraph. Replaces the built-in description."),
            F("details", "Key points", "textarea", max_len=2000, help="One point per line. Replaces the built-in key features."),
            F("image", "Photo", "image", help="Shown on the programme's page and card."),
        ],
    },
    "education_course": {
        "label": "Education courses", "group": "Services", "module": "services", "single": False, "preview_path": "/services/education",
        "help": "Changes to the approved LAX360 Education course catalogue. The built-in catalogue is always the starting point and appears on the Education & Training page and on every Education partner page, so nothing needs to be re-entered. "
                "ADD a course: enter its name and category. HIDE a course: enter its exact name and tick Hidden. REPLACE a course: enter the new name and the exact name of the course it replaces.",
        "title_label": "Course name",
        "fields": [
            F("category", "Category", max_len=80, help="An existing category (for example Cloud Computing) or a new one. Used when adding a course."),
            F("software", "Software / tool taught", max_len=80),
            F("replaces", "Replaces this course (exact name)", max_len=120, help="Optional. The built-in course this entry replaces."),
            F("hidden", "Hidden", "bool", default=False, help="Removes the course (the one named above, or this entry's own name) from every course list."),
        ],
    },
    "division": {
        "label": "Service divisions", "group": "Services", "module": "services", "single": False, "slug_field": "url_slug", "preview_path": "/services",
        "help": "The ACTIVE service divisions (Software & IT Services, Digital Marketing, Education & Training). Add a division, rename it, change its text, reorder the list (the order here is the order on the website), "
                "or save one as a draft to hide it. The built-in divisions have the page addresses software, growth (Digital Marketing, address /services/digitalmarketing) and education. "
                "A division that is not launched yet belongs under Upcoming service categories; when it launches, create it here (or change its status there to Available). Describe only what LAX360 really offers.",
        "title_label": "Division name",
        "fields": [
            F("url_slug", "Page URL", max_len=80, help="The address segment: /services/<this>. Keep the built-in ones unchanged (software, growth, education); a new division can use any lower-case text."),
            F("short", "Short description (cards and menus)", "textarea", True, max_len=400),
            F("outcome", "One-line outcome", max_len=200), F("tags", "Highlights", "textarea", max_len=400, help="One per line (short labels)."),
            F("enquiry_type", "Enquiry form type", max_len=30, help="The enquiry type the Enquire buttons pre-select, for example project, marketing or course."),
            F("hero_line", "Page heading (H1)", max_len=160, help="The big heading of the division page. Put the part that should be accented in [square brackets], for example: Software that [fits how you work.] Without brackets the last sentence (or last three words) is accented."), F("overview", "Overview", "textarea", max_len=2500),
            F("challenges", "Helps when (problems it addresses)", "textarea", max_len=1500, help="One per line."),
            F("use_cases", "Typical uses", "textarea", max_len=1500, help="One per line."),
            F("stack", "Technology / tools", "textarea", max_len=600, help="One per line."), F("stack_note", "Technology note", "textarea", max_len=400),
            F("engagement", "How we work together", "textarea", max_len=400),
            F("faqs", "Questions and answers", "textarea", max_len=4000, help="One per line, written as: Question | Answer"),
            F("meta_title", "Search title", max_len=120), F("meta_description", "Search description", "textarea", max_len=300),
            F("image", "Main image", "image", help="Leave empty to keep the built-in image."), F("icon", "Icon", "image", help="Optional. A built-in icon is used when empty."),
        ],
    },
    "division_service": {
        "label": "Division sub-services", "group": "Services", "module": "services", "single": False, "slug_field": "url_slug", "preview_path": "/services",
        "help": "The sub-services of the active divisions. Each published sub-service is listed under its division and has its own detail page (/services/<division>/<page URL>). "
                "To move one to another division, change its Division. The order here is the order on the website. Save as a draft to hide it.",
        "title_label": "Sub-service name",
        "fields": [
            F("url_slug", "Page URL", max_len=80, help="The address segment: /services/<division>/<this>. Changing a built-in one changes its web address (set a redirect under SEO first)."),
            F("division", "Division", "select", True, options_from="division"),
            F("group", "Group on the division page", max_len=80, help="Sub-services with the same group are listed together, for example Build or Headless SaaS & API Solutions."),
            F("text", "Short description (card text)", "textarea", True, max_len=400),
            F("intro", "One-line summary (page heading text)", max_len=300),
            F("about", "About (paragraphs)", "textarea", max_len=3000, help="Plain paragraphs. A blank line starts a new paragraph."),
            F("offers", "What LAX360 provides", "textarea", max_len=1500, help="One per line."),
            F("solves", "Problems it addresses", "textarea", max_len=1500, help="One per line."),
            F("features", "Capabilities", "textarea", max_len=4000, help="One per line, written as: Title: short explanation. Optional bullets after the text: Title: explanation || first bullet; second bullet"),
            F("benefits", "Practical gains", "textarea", max_len=1500, help="One per line."),
            F("uses", "Examples", "textarea", max_len=2500, help="One per line, written as: Title: short explanation"),
            F("image", "Main image", "image", help="Leave empty to use the division's image."), F("icon", "Icon", "image", help="Optional. A built-in icon is used when empty."),
        ],
    },
    "solution_category": {
        "label": "Product categories (portfolio)", "group": "Products", "module": "services", "single": False, "slug_field": "url_slug", "bundle": False, "preview_path": "/solutions",
        "help": "The six categories of the Software & IT solutions portfolio (Software Development, Web Application Development, Mobile Application Development, Website Development, Headless SaaS & API Solutions, "
                "AI Agents & Business Automation). Add, rename, reorder or hide a category; the order here is the order on the website. Solutions are managed under Solutions.",
        "title_label": "Category name",
        "fields": [
            F("url_slug", "Reference name", max_len=60, help="Short address-style name, for example software or mobile."),
            F("intro", "Introduction", "textarea", True, max_len=800),
            F("custom_name", "Custom development heading", max_len=120), F("custom_text", "Custom development text", "textarea", max_len=800),
            F("platforms", "Platforms", "textarea", max_len=400, help="One per line."),
            F("service_link", "Link to the matching service page", max_len=200, help="For example /services/software/custom-software-development"),
            F("accent", "Accent colour", max_len=9, help="A HEX colour such as #2563eb (used on illustrations)."),
            F("types", "Types shown on the category (optional)", "textarea", max_len=3000, help="One per line, written as: Name: short explanation"),
            F("image", "Category image", "image", help="Leave empty to keep the built-in illustration."),
        ],
    },
    "solution": {
        "label": "Solutions (products by category)", "group": "Products", "module": "services", "single": False, "slug_field": "url_slug", "bundle": False, "preview_path": "/solutions",
        "help": "Every solution and industry category of the portfolio, shown on the Products page, the Software & IT Services page, its own page (/solutions/<page URL>) and the partnership pages. "
                "Leave the availability on Offered unless the solution is not offered yet (Under development, Coming soon, Temporarily unavailable): no label is shown on the website for an offered solution, and LAX360 presents it as provided and customisable. "
                "Do not describe capabilities, customers, prices or dates that are not confirmed. Save as a draft to hide a solution; Preview shows it before publishing.",
        "title_label": "Solution name",
        "fields": [
            F("url_slug", "Page URL", max_len=80, help="/solutions/<this>. Keep the built-in ones unchanged (set a redirect under SEO before changing one)."),
            F("category", "Category", "select", True, options_from="solution_category"),
            F("kind", "Type", "select", True, options=[{"value": "product", "label": "Solution"}, {"value": "industry", "label": "Industry category (websites)"}], default="product"),
            F("status", "Availability", "select", True, options=[{"value": "available", "label": "Offered (a LAX360 product exists)"}, {"value": "custom", "label": "Offered (default)"},
                                                              {"value": "under_development", "label": "Under development"}, {"value": "coming_soon", "label": "Coming soon"},
                                                              {"value": "live", "label": "Offered (live for customers)"}, {"value": "demo_available", "label": "Offered (demo available)"},
                                                              {"value": "temporarily_unavailable", "label": "Temporarily unavailable"}], default="custom",
              help="The status decides what visitors see: the badge, the note, which buttons appear and whether the live links are shown (they are hidden while under development, coming soon or temporarily unavailable)."),
            F("linked_product", "Linked LAX360 product", max_len=80, help="The page address of an existing product under Products (for example lax360-clinic-management). Leave empty when none."),
            F("pitch", "Short description (cards)", "textarea", True, max_len=400),
            F("overview", "Overview", "textarea", max_len=3000, help="Plain paragraphs. A blank line starts a new paragraph."),
            F("problems", "Business problems addressed", "textarea", max_len=1500, help="One per line."),
            F("features", "Key features", "textarea", max_len=1500, help="One per line."),
            F("modules", "Modules and functionalities", "textarea", max_len=1500, help="One per line."),
            F("how", "How it works", "textarea", max_len=3000, help="One step per line, written as: Title: explanation"),
            F("customers", "Target customers", "textarea", max_len=800, help="One per line."), F("industries", "Suitable industries", "textarea", max_len=800, help="One per line."),
            F("benefits", "Business benefits", "textarea", max_len=1200, help="One per line."), F("platforms", "Supported platforms and devices", "textarea", max_len=600, help="One per line."),
            F("customization", "Customization possibilities", "textarea", max_len=1200, help="One per line."), F("integrations", "Available integrations", "textarea", max_len=800, help="One per line."),
            F("faqs", "Questions and answers", "textarea", max_len=4000, help="One per line, written as: Question | Answer"),
            F("related", "Related solutions", "textarea", max_len=600, help="Page URLs of related solutions, one per line."),
            F("image", "Main image", "image", help="Upload or replace the preview image (use a real screenshot when you have one). Leave empty to keep the built-in design preview."),
            F("gallery", "Gallery (screenshots, previews)", "gallery", max_len=4000, help="One image address per line. Use real screenshots only when they are of a real product; label mockups as illustrations."),
            F("image_alt", "Image description (alt text)", max_len=160), F("mockup_note", "Image note", max_len=160, help="For example: Product Interface Preview, or Screenshot of the live product. Shown under the image."),
            F("demo_link", "Demo URL", max_len=300, ui="url-or-page", help="A full https:// URL of a working demo, or a page like /contact?type=product. Leave empty to show no demo button."),
            F("demo_link_label", "Demo button text", max_len=40, help="Default: Try Live Demo."),
            *[x for key, label, default in LINK_FIELDS for x in (F(key, label, max_len=300, ui="url", help="Full https:// address. Leave empty and no button is shown."),
                                                                F(key + "_label", label.replace(" URL", "") + " button text", max_len=40, help=f"Default: {default}."))],
            F("video_link", "Demo video URL", max_len=300, ui="url", help="Full https:// address (YouTube, Vimeo or a file). Shown as Watch Demo."), F("video_link_label", "Demo video button text", max_len=40, help="Default: Watch Demo."),
            F("cta_label", "Button text (overrides the default)", max_len=40), F("cta_link", "Button link (overrides the default)", max_len=300),
            F("seo_title", "Search title", max_len=70), F("seo_description", "Search description", "textarea", max_len=300), F("keywords", "Keywords", "textarea", max_len=300, help="One per line."),
            F("featured", "Featured", "bool", default=False),
            F("partner_franchise", "Listed under Franchise Opportunities (Our Products)", "bool", default=True),
            F("partner_authorized", "Listed under the Authorized Partner Program (Our Products)", "bool", default=True),
            F("partner_referral", "Listed under the Referral Partner Program (Our Products)", "bool", default=True),
        ],
    },
    "upcoming_category": {
        "label": "Upcoming service categories", "group": "Services", "module": "services", "single": False, "slug_field": "url_slug", "preview_path": "/services#upcoming",
        "help": "Service categories that LAX360 is planning or building: Artificial Intelligence, IoT / Embedded Systems & Robotics, CAD Designing & Training, Blockchain & Web 3.0. They are shown with a status badge (Coming Soon, Under Development, Available or Temporarily Unavailable) "
                "on the home page, the Services page, the menus and the partnership pages, and visitors can register their interest. Built-in entries exist for the three categories: to change one, add an entry whose Page URL is "
                "cad-engineering, robotics or blockchain (and set its status). To launch a category, change its status to Available: no code change is needed. Remember to describe only what really exists.",
        "title_label": "Category name",
        "fields": [
            F("url_slug", "Page URL", max_len=80, help="The page address: cad-engineering, robotics and blockchain replace the built-in categories; any other text creates a new category at /upcoming/<text>."),
            F("status", "Launch status", "select", True, options=UPCOMING_STATUSES, default="coming_soon"),
            F("tagline", "Short description (cards and menus)", "textarea", max_len=300),
            F("description", "Full description", "textarea", max_len=3000, help="Plain paragraphs. A blank line starts a new paragraph. Describe only what is planned or already real."),
            F("launch_note", "Launch note", max_len=160, help="For example: Planned for a future release. Do not enter a date unless it is confirmed."),
            F("short_name", "Short name (menus and footer)", max_len=60, help="For example Robotics. Leave empty to use the full name."),
            F("headline", "Page heading (H1)", max_len=120), F("lead", "Introduction under the heading", "textarea", max_len=400),
            F("areas", "Planned direction / areas of interest", "textarea", max_len=2500, help="One per line, written as: Title: short explanation"),
            F("today", "What LAX360 already delivers today", "textarea", max_len=800, help="One per line. Only things that really exist."),
            F("today_links", "Links under 'What LAX360 already delivers'", "textarea", max_len=500, help="One per line: Label | /page"),
            F("seo_title", "Search title", max_len=70), F("seo_description", "Search description", "textarea", max_len=300),
            F("image", "Main image", "image"), F("icon", "Icon", "image", help="Optional. A built-in icon is used when empty."),
            F("show_home", "Show on the home page", "bool", default=True),
            F("partner_franchise", "Available under Franchise Opportunities (future)", "bool", default=True),
            F("partner_authorized", "Available under the Authorized Partner Program (future)", "bool", default=True),
            F("partner_referral", "Available under the Referral Partner Program (future)", "bool", default=True),
            F("cta_label", "Button text", max_len=40, help="Shown when the status is Available, for example Get started."), F("cta_link", "Button link", max_len=300, help="Shown when the status is Available. A page like /contact?type=project or a full https:// URL."),
        ],
    },
    "upcoming_service": {
        "label": "Upcoming services", "group": "Services", "module": "services", "single": False, "slug_field": "url_slug", "preview_path": "/services#upcoming",
        "help": "The individual services inside an upcoming category (for example Mechanical CAD, Civil CAD). A service shows the category's status unless you set its own. "
                "Built-in entries: mechanical-cad, civil-cad, robotics-solutions, robotics-development-integration, blockchain-development, web3-solutions.",
        "title_label": "Service name",
        "fields": [
            F("url_slug", "Reference name", max_len=80, help="Use a built-in name (see above) to change that service; any other text adds a new service."),
            F("category", "Category", "select", True, options=UPCOMING_BUILTIN_CATEGORIES, options_from="upcoming_category"),
            F("status", "Launch status", "select", False, options=UPCOMING_STATUSES, help="Leave empty to follow the category."),
            F("summary", "Short description", "textarea", max_len=300),
            F("description", "Full description", "textarea", max_len=3000),
            F("image", "Image", "image"), F("icon", "Icon", "image"),
            F("partner_franchise", "Offered under Franchise Opportunities (future)", "bool", default=True),
            F("partner_authorized", "Offered under the Authorized Partner Program (future)", "bool", default=True),
            F("partner_referral", "Offered under the Referral Partner Program (future)", "bool", default=True),
        ],
    },
    "partner_product": {
        "label": "Partner product list (Our Products)", "group": "Services", "module": "services", "single": False, "preview_path": "/franchise/it",
        "help": "Changes to the \"Our Products\" list on the IT & Software partnership pages (Franchise, Authorized Partner and Referral Partner). The built-in list is always the starting point, so nothing needs to be re-entered. "
                "ADD an entry: enter its name and the group it belongs to. HIDE one: enter its exact name and tick Hidden. REPLACE one: enter the new name and the exact name it replaces.",
        "title_label": "Product or service name",
        "fields": [
            F("program", "Program", "select", False, options=[{"value": "franchise", "label": "Franchise Opportunities"}, {"value": "authorized-partner", "label": "Authorized Partner Program"}, {"value": "referral-partner", "label": "Referral Partner Program"}], help="Which partnership program's list the entry belongs to. Leave empty to show it in all three."),
            F("group", "Group", max_len=80, help="An existing group (for example LAX360 own products) or a new one. Used when adding an entry."),
            F("description", "Short description", max_len=160), F("tag", "Label chip", max_len=40, help="Optional small label next to the name, for example Partnership option."),
            F("link", "Link", max_len=300, help="Optional. A page like /products/lax360-business-crm."),
            F("replaces", "Replaces this entry (exact name)", max_len=120, help="Optional. The built-in entry this one replaces."),
            F("hidden", "Hidden", "bool", default=False, help="Removes the entry (the one named above, or this entry's own name) from the list."),
        ],
    },
    # ---- About ----------------------------------------------------------------------------------------------------------------------
    "content_seed": {
        "hidden": True, "label": "Content migration markers", "group": "Navigation & SEO", "module": "content", "single": False, "preview_path": "/",
        "help": "Internal markers written by `python -m app.cli migrate-content`: once a section's built-in content has been moved into the database, the database is the only source for it.",
        "fields": [F("seeded", "Migrated", "bool", default=True)],
    },
    "about_block": {
        "label": "About Us content", "group": "About", "module": "content", "single": False, "preview_path": "/about",
        "help": "Company introduction, vision, mission, values, achievements, team members and images for the About page. "
                "When at least one block is published, the About page shows these in place of its built-in text: introduction, vision and mission replace those panels; \"Our story step\" blocks (in order) replace the story timeline; company values replace the values cards.",
        "title_label": "Heading / name",
        "fields": [
            F("block", "Type", "select", True, options=[{"value": v, "label": l} for v, l in (("intro", "Company introduction"), ("vision", "Vision"), ("mission", "Mission"),
                                                                                              ("story", "Our story step"), ("value", "Company value"), ("achievement", "Achievement"), ("team", "Team member"), ("image", "Image"))]),
            F("text", "Text", "textarea", max_len=2000), F("role", "Role / figure (team members, achievements)", max_len=120), F("image", "Image", "image"),
        ],
    },
    # ---- Industries -----------------------------------------------------------------------------------------------------------------
    "industry": {
        "label": "Industries", "group": "Industries", "module": "content", "single": False, "preview_path": "/industries",
        "help": "The industries LAX360 Pvt Ltd builds technology for. Each published industry appears on the Industries page and gets its own details page (/industries/<name>). "
                "Save as a draft to hide it. When at least one is published, these replace the built-in industries. Do not describe delivered projects unless they are verified.",
        "title_label": "Industry name",
        "fields": [
            F("group", "Group", "select", False, options=INDUSTRY_GROUPS),
            F("featured", "Featured industry", "bool", default=False, help="Featured industries are highlighted at the top of the Industries page."),
            F("summary", "Short description (card text)", "textarea", True, max_len=300),
            F("description", "Overview", "textarea", max_len=3000, help="Plain paragraphs. A blank line starts a new paragraph."),
            F("challenges", "Major challenges", "textarea", max_len=2000, help="One challenge per line."),
            F("problem_solution", "Problem to solution pairs", "textarea", max_len=2000, help="One pair per line: Problem => Solution"),
            F("solutions", "Software and application solutions", "textarea", max_len=2000, help="One solution per line."),
            F("ai_opportunities", "AI and automation opportunities", "textarea", max_len=2500, help="One per line. Optional: Title: description"),
            F("use_cases", "Use cases", "textarea", max_len=2000, help="One use case per line."),
            F("benefits", "Benefits of digital transformation", "textarea", max_len=2000, help="One benefit per line."),
            F("services", "Related LAX360 services", "textarea", max_len=500, help="One service category per line: software, ai, growth, headless, automation, mobile, education"),
            F("products", "Related LAX360 products", "textarea", max_len=800, help="One product address per line (the last part of /products/<address>), only where the product genuinely applies."),
            F("insight_categories", "Related Insights categories", "textarea", max_len=300, help="One per line: ai, software, automation, saas, transformation, webmobile, marketing, trends"),
            F("image", "Card image", "image"), F("hero_image", "Hero image", "image"), F("image_alt", "Image description", max_len=160),
            F("seo_title", "SEO title", max_len=70), F("meta_description", "SEO description", "textarea", max_len=300),
        ],
    },
    # ---- Our Network ----------------------------------------------------------------------------------------------------------------
    "network_category": {
        "label": "Network categories", "group": "Network", "module": "content", "single": False, "preview_path": "/our-network",
        "help": "Extra categories for the Our Network page (the standard ones already exist). A category appears publicly only when it has at least one published company or partner. "
                "Use the name as the heading and write a one-line description.",
        "title_label": "Category name",
        "fields": [F("description", "Short description", "textarea", False, max_len=300)],
    },
    "network_partner": {
        "public_filter": ("enabled", False, "exclude"), "label": "Network companies & partners", "group": "Network", "module": "content", "single": False, "preview_path": "/our-network",
        "help": "Companies in the LAX360 Pvt Ltd network. New entries start as drafts: check the company's identity, website and the exact relationship, set Verification, then publish. "
                "A partnership designation (for example \"Authorized Partner\") is shown publicly only when Verification is \"Verified\" and the expiry date has not passed. "
                "Never describe another company as owned by LAX360 unless that is verified.",
        "title_label": "Company name",
        "fields": [
            F("category", "Network category", "select", True, options=NETWORK_CATEGORIES, options_from="network_category"),
            F("relationship", "Relationship type", "select", False, options=NETWORK_RELATIONSHIPS),
            F("division", "Business division", "select", False, options=NETWORK_DIVISIONS, help="Decides which section of the Our Network page the company appears in: IT & Software Partners, Cybersecurity Partners, Education & Training Partners, Digital Marketing Partners, or the group company section. Leave empty to use the category."),
            F("established_via", "Established through", max_len=80, help="Leave empty for a direct LAX360 partnership. For a partnership set up through a group company, enter that company's name (for example Fatcat Wealthy): the card then says so."),
            F("partnership_status", "Partnership status", "select", False, options=PARTNER_STATUSES, default="active", help="Planned partnerships are labelled as being finalised; Paused ones are shown without an Active label."),
            F("hidden", "Hide this company", "bool", default=False, help="Hides the company on the website, including the built-in entry of the same name. Use it instead of deleting a built-in company."),
            F("business_category", "Business category", max_len=80, help="e.g. Training & Education, Financial Services, Business Software & SaaS"),
            F("description", "Description", "textarea", True, max_len=800),
            F("designation", "Partnership designation", max_len=80, help="The exact verified wording only, e.g. \"Authorized Partner\". Leave blank if there is none."),
            F("verification", "Verification", "select", False, options=[{"value": "pending", "label": "Pending verification"}, {"value": "verified", "label": "Verified"}], default="pending"),
            F("verified_on", "Verified on (YYYY-MM-DD)", max_len=10), F("expires_on", "Authorization expires on (YYYY-MM-DD)", max_len=10),
            F("products", "Products and services", "textarea", False, max_len=1500, help="One per line. Only what the company's own website confirms."),
            F("location_type", "Location", "select", False, options=[{"value": "separate", "label": "Separate location"}, {"value": "same", "label": "Same location as LAX360 (Salem)"}], default="separate"),
            F("location", "Location text (optional)", max_len=120, help="e.g. Salem"),
            F("contact_email", "Contact email (optional)", max_len=120), F("contact_phone", "Contact phone (optional)", max_len=40),
            F("website_link", "Official website (optional)", max_len=300, help="The full https:// address of the company's own website"),
            F("cta_label", "Button text", max_len=40, help="e.g. Visit CADPOINT"), F("featured", "Featured", "bool", default=False),
            F("enabled", "Show on the website", "bool", default=True, help="Untick to hide this entry from the website without deleting it. Publishing and unpublishing work as well: hiding is the quick on/off switch."),
            F("logo", "Official logo (optional)", "image", help="Only a logo you are permitted to use. Do not edit or redraw a company's logo."),
            # ---- Partner details page (/our-network/<partner>): every field is optional; a section with nothing entered says the details are being confirmed ----
            F("overview", "Company introduction (details page)", "textarea", False, max_len=2500, help="Who the company is, from its own website. A blank line starts a new paragraph."),
            F("partnership_type", "Authorization / partnership type", max_len=120, help="Only the exact, verified wording, e.g. \"Authorized reseller\". Leave blank if not confirmed."),
            F("partnership_nature", "Nature of the partnership", "textarea", False, max_len=1500),
            F("collaboration", "What LAX360 does together with the partner", "textarea", False, max_len=2500),
            F("we_receive", "What LAX360 receives from the partner", "textarea", False, max_len=1500, help="Products, licences, training, support or access, only if confirmed."),
            F("we_contribute", "What LAX360 contributes", "textarea", False, max_len=1500),
            F("we_offer", "Products or services we offer through the partnership", "textarea", False, max_len=1500, help="One per line."),
            F("solutions", "Solutions we provide to customers using the partner's products", "textarea", False, max_len=2000, help="One per line."),
            F("implementation_services", "Implementation, configuration, customization and integration services", "textarea", False, max_len=2000, help="One per line, only what LAX360 actually provides."),
            F("support_services", "Training, onboarding, technical support and customer assistance", "textarea", False, max_len=2000, help="One per line."),
            F("software_categories", "Software categories", max_len=300, help="Comma-separated, e.g. CRM, Accounting, HR."),
            F("features", "Features and capabilities", "textarea", False, max_len=2000, help="One per line."),
            F("adoption_help", "How LAX360 helps customers adopt and use these solutions", "textarea", False, max_len=2000),
            F("related_services", "Related LAX360 services", "multiselect", False, max_len=2000, ui="services", options=[{"value": v, "label": l} for v, l in SERVICE_SCOPES], help="Choose the LAX360 services that are genuinely connected to this partnership."),
            F("customer_benefits", "How customers benefit", "textarea", False, max_len=2000, help="One per line."),
            F("customer_journey", "Customer journey, from product selection to support", "textarea", False, max_len=2500, help="One step per line, e.g. \"Choose: we help you compare the options\"."),
            F("image_1", "Additional image 1", "image"), F("image_1_alt", "Image 1 description", max_len=160),
            F("image_2", "Additional image 2", "image"), F("image_2_alt", "Image 2 description", max_len=160),
            F("document_link", "Document or brochure link (optional)", max_len=300, help="A full https:// address"), F("document_label", "Document link text", max_len=60),
            F("certificate_file", "Partnership certificate or supporting document (PDF, administrators only)", "document", False, help="Upload it in the media library. It stays private: visitors never receive a link to it."),
            F("certificate_image", "Certificate or approval image (optional)", "image", help="A scan or photo of the certificate."),
            F("certificate_public", "Show the certificate image on the website", "bool", default=False, help="Off: only administrators can see it. On: it is shown on the partner's page, but only while the partnership is Verified."),
            F("extra_links", "Other relevant links", "textarea", False, max_len=1500, help="One per line: Label | https://address"),
        ],
    },
    "software_product": {
        "public_filter": ("enabled", False, "exclude"), "label": "Software distribution", "group": "Network", "module": "content", "single": False, "preview_path": "/our-network",
        "help": "Software LAX360 helps customers choose, buy, implement and use. Link each product to its real vendor and state clearly whether it is third-party, resold, integrated or developed by LAX360. "
                "Do not present third-party software as LAX360's own.",
        "title_label": "Product name",
        "fields": [
            F("vendor", "Vendor (network company)", "select", False, options_from="network_partner"),
            F("software_category", "Software category", "select", True, options=SOFTWARE_CATEGORIES),
            F("ownership", "Type", "select", True, options=SOFTWARE_OWNERSHIP, default="third_party"),
            F("description", "Description", "textarea", True, max_len=500, help="What the vendor's product is, in neutral terms."),
            F("enabled", "Show on the website", "bool", default=True, help="Untick to hide this entry from the website without deleting it. Publishing and unpublishing work as well: hiding is the quick on/off switch."),
            F("product_link", "Vendor product page (optional)", max_len=300), F("cta_link", "Enquiry link (optional)", max_len=300, help="e.g. /contact?type=project"),
        ],
    },
    # ---- Our Team -------------------------------------------------------------------------------------------------------------------
    "network_page": {
        "label": "Our Network page text", "group": "Network", "module": "content", "single": True, "slug": "network", "preview_path": "/our-network",
        "help": "The introduction and closing call to action of the Our Network page. Leave a field empty to keep the built-in text. Partners and software are managed under their own tabs.",
        "fields": [
            F("heading", "Page heading", max_len=80), F("subheading", "Subheading", max_len=160),
            F("intro_1", "Introduction: first paragraph", "textarea", max_len=700), F("intro_2", "Introduction: second paragraph", "textarea", max_len=400),
            F("opportunities_title", "Partnership opportunities: lead text", "textarea", max_len=300),
            F("cta_heading", "Closing heading", max_len=120), F("cta_text", "Closing text", "textarea", max_len=500),
        ],
    },
    "team_member": {
        "label": "Employees", "group": "Team", "module": "content", "single": False, "preview_path": "/our-team",
        "help": "The people behind LAX360 Pvt Ltd: one profile per employee. The Founder (also CEO / Managing Director: one person, shown once, centred at the top) is marked with the Founder, CEO or Managing Director position; "
                "everyone else appears in the team gallery, or under their department when the Departments section is switched on. Use the order number (or the arrows) to arrange people. Untick “Show on the website” to hide a profile without deleting it.",
        "title_label": "Full name", "public_filter": ("active", False, "exclude"),
        "fields": [
            F("role_level", "Position", "select", False, options=TEAM_ROLE_LEVELS, default="team_member", help="Founder, CEO and Managing Director are shown in the Leadership section. Leave empty for a team member."),
            F("designation", "Designation (job title)", "text", True, max_len=120),
            F("department", "Department", "select", False, options_from="team_department", help="A department you created under Departments. Leave empty if you do not use departments. Changing it moves the person automatically."),
            F("bio", "Short professional bio (optional)", "textarea", max_len=800),
            F("expertise", "Skills", "textarea", max_len=400, help="Comma-separated, e.g. React, FastAPI, SEO."),
            F("photo", "Photograph", "image", help="A real, professional photograph (portrait, about 600 x 750 px). Without one the card shows the person's initials."), F("photo_alt", "Photo description", max_len=160, help="Short description for screen readers."),
            F("experience", "Experience (optional)", max_len=160, help="Shown in the profile that opens when the photograph is clicked, e.g. “5+ years in digital marketing”."),
            F("achievements", "Achievements (optional)", "textarea", max_len=1200, help="One achievement per line. Shown in the profile that opens when the photograph is clicked."),
            F("certifications", "Certifications (optional)", "textarea", max_len=1000, help="One certification per line."),
            F("awards", "Awards & recognition (optional)", "textarea", max_len=1000, help="One award per line."),
            F("photo_2", "Additional photograph 1 (optional)", "image", help="More pictures for the profile: they appear as a small gallery when the profile is opened."), F("photo_3", "Additional photograph 2 (optional)", "image"),
            F("photo_4", "Additional photograph 3 (optional)", "image"), F("photo_5", "Additional photograph 4 (optional)", "image"),
            F("linkedin_link", "LinkedIn profile (optional)", max_len=300, help="The person's full LinkedIn address, e.g. https://www.linkedin.com/in/name. No other contact details are shown on the website."),
            F("active", "Show on the website", "bool", default=True, help="Untick to hide the profile from the website without deleting it."),
            F("sample", "Temporary sample profile", "bool", default=False, help="Marks demonstration content: the website shows a “Sample profile” label on it. Untick it once you have entered the real details and photograph."),
            F("photo_path", "Built-in picture (file path)", max_len=120, ui="hidden"),
        ],
    },
    "team_department": {
        "label": "Departments", "group": "Team", "module": "content", "single": False, "preview_path": "/our-team#departments",
        "help": "The departments of the Our Team page (only shown when the Departments section is switched on). Employees are assigned from their own profile, and the person marked Department Head leads the department. "
                "Use the order number (or the arrows) to arrange departments.",
        "title_label": "Department name", "public_filter": ("active", False, "exclude"),
        "fields": [
            F("description", "Description", "textarea", False, max_len=500, help="Short text shown under the department name."),
            F("image", "Department image (optional)", "image"), F("image_alt", "Image description", max_len=160),
            F("overview", "Overview for the department page (optional)", "textarea", max_len=1500, help="A longer introduction. A blank line starts a new paragraph."),
            F("roles", "Roles in this department (optional)", "textarea", max_len=800, help="One role per line."),
            F("responsibilities", "Responsibilities (optional)", "textarea", max_len=1200, help="One responsibility per line."),
            F("expertise", "Key areas of expertise (optional)", "textarea", max_len=600, help="Comma-separated."),
            F("active", "Show this department", "bool", default=True, help="Untick to hide the department; its employees then appear under “Other team members” while the Departments section is on."),
        ],
    },
    "team_gallery": {
        "label": "Team & culture gallery", "group": "Team", "module": "content", "single": False, "preview_path": "/our-team#culture",
        "help": "The “Life at LAX360” carousel of the Our Team page: genuine LAX360 photographs of games, functions, celebrations, outings, events, workshops and achievements, each with an optional title, description and date. Nothing is shown until you publish photos.",
        "title_label": "Photo name (for you)",
        "fields": [
            F("category", "Category", "select", True, options=TEAM_GALLERY_CATEGORIES), F("image", "Photograph", "image", True),
            F("category_custom", "Your own category (optional)", max_len=40, help="Type a new category name (for example “Sports Day”) to use it instead of the one chosen above. Photographs with the same name are grouped together."),
            F("caption", "Event title shown on the website (optional)", max_len=120, help="Leave empty to show the photograph alone."), F("event_date", "Event date (optional)", max_len=10, ui="date"),
            F("image_alt", "Photo description", max_len=160, help="Short description for screen readers."), F("description", "Short description (optional)", "textarea", max_len=300, ui="optional"),
        ],
    },
    "team_expertise": {
        "label": "Team expertise", "group": "Team", "module": "content", "single": False, "preview_path": "/our-team#expertise",
        "help": "Capability groups shown in the Expertise section. When none are published, the built-in list is shown.",
        "title_label": "Expertise area",
        "fields": [F("description", "Short description", "textarea", max_len=300), F("tags", "Technologies / skills", "textarea", max_len=400, help="Comma-separated.")],
    },
    "team_page": {
        "label": "Our Team page text", "group": "Team", "module": "content", "single": True, "slug": "team", "preview_path": "/our-team",
        "help": "Switch the sections of the Our Team page on or off, and edit the hero and the section headings. Leave a text field empty to keep the built-in text. "
                "With Departments off the page is the leadership profile followed by the team gallery; with Departments on, employees are grouped under their departments.",
        "fields": [
            F("show_leadership", "Leadership Team section", "bool", default=True, help="Founder, CEO and Managing Director profiles at the top."),
            F("show_departments", "Departments section", "bool", default=False, help="Off: all employees in one gallery. On: employees are grouped automatically under their departments."),
            F("show_directory", "Team members section", "bool", default=True, help="The employee gallery (when Departments is on, the employees are shown inside their departments instead)."),
            F("show_culture", "People & culture photographs", "bool", default=True, help="Only shown when you have published photographs."),
            F("show_expertise", "Expertise section", "bool", default=False),
            F("show_careers", "Careers section", "bool", default=True),
            F("hero_eyebrow", "Hero small label", max_len=60), F("hero_title", "Hero headline", max_len=120), F("hero_lead", "Hero introduction", "textarea", max_len=500),
            F("hero_image", "Hero background image (a real LAX360 team photograph)", "image"), F("hero_image_alt", "Hero image description", max_len=160),
            F("leadership_title", "Leadership heading", max_len=100), F("leadership_lead", "Leadership description", "textarea", max_len=300),
            F("departments_title", "Departments heading", max_len=100), F("departments_lead", "Departments description", "textarea", max_len=300),
            F("directory_title", "Team directory heading", max_len=100), F("directory_lead", "Team directory description", "textarea", max_len=300),
            F("culture_title", "People & culture heading", max_len=100), F("culture_lead", "People & culture description", "textarea", max_len=300),
            F("expertise_title", "Expertise heading", max_len=100), F("expertise_lead", "Expertise description", "textarea", max_len=300),
            F("careers_title", "Careers heading", max_len=100), F("careers_lead", "Careers description", "textarea", max_len=300),
        ],
    },
    # ---- Insights -------------------------------------------------------------------------------------------------------------------
    "article": {
        "label": "Insights articles", "group": "Insights", "module": "content", "single": False, "slug_field": "url_slug", "preview_path": "/insights",
        "help": "Blog posts, AI updates, software and digital transformation insights and technology news. Publish to list an article on the Insights page; "
                "unpublish to take it down. When at least one article is published, the Insights page shows these in place of the built-in starter articles.",
        "title_label": "Article title",
        "fields": [
            F("category", "Category", "select", True, options=ARTICLE_CATEGORIES),
            F("published_on", "Publication date", "text", True, max_len=10, help="YYYY-MM-DD, e.g. 2026-11-03"),
            F("excerpt", "Short summary", "textarea", True, max_len=300),
            F("body", "Article text", "textarea", True, max_len=20000, help="Plain text. A blank line starts a new paragraph; \"## \" starts a sub-heading; lines starting with \"- \" make a bullet list, \"1. \" a numbered list and \"> \" a quote; \"[[image 1]]\" or \"[[image 2]]\" places an inline image."),
            F("image", "Cover image", "image"), F("image_alt", "Cover image description", max_len=160, help="Short description for screen readers."),
            F("author", "Author", max_len=80, help="Defaults to the LAX360 team."),
            F("tags", "Tags", max_len=200, help="Comma-separated, e.g. AI, chatbots, automation."),
            F("featured", "Featured article", "bool", default=False, help="Featured articles are highlighted at the top of the Insights page."),
            F("inline_image_1", "Inline image 1", "image"), F("inline_image_2", "Inline image 2", "image"),
            F("url_slug", "Page URL", max_len=80, help="The address of the article: /insights/<this text>. Leave blank to use the title. Changing it later changes the article's link."),
            F("seo_title", "SEO title", max_len=70, help="Shown in search results and the browser tab. Defaults to the article title."),
            F("meta_description", "SEO description", "textarea", max_len=300, help="Shown in search results. Defaults to the short summary."),
            F("seo_keywords", "SEO keywords", max_len=200, help="Comma-separated, e.g. AI automation, business chatbots."),
            F("noindex", "Hide from search engines", "bool", default=False, help="Tick to keep this article out of Google (it stays on the website and is left out of the sitemap)."),
        ],
    },
    # ---- Clients --------------------------------------------------------------------------------------------------------------------
    "client": {
        "public_filter": ("enabled", False, "exclude"), "label": "Our clients", "group": "Clients", "module": "content", "single": False, "preview_path": "/",
        "help": "Genuine clients only, with their permission to be shown. Published clients with no service chosen appear in the \"Our Clients\" strip on the home page, in this order (use the order number to arrange them); clients assigned to services appear on those service pages. "
                "Entries marked as samples are placeholders: edit or delete them once you have real clients. With none published, the section is hidden.",
        "title_label": "Company name",
        "fields": [
            F("logo", "Logo", "image", help="Use the client's real logo. It is shown at its original proportions."),
            F("description", "Short description (optional)", "textarea", max_len=300, help="Shown with the client on service pages."),
            F("website_link", "Website (optional)", max_len=300, help="The client's own website, full https:// address"),
            F("services", "Services this client has received", "multiselect", False, max_len=2000, ui="services", options=[{"value": v, "label": l} for v, l in SERVICE_SCOPES],
              help="Choose the main service, then tick the sub-services. The client then appears automatically on each sub-service page, on the main service page, and on the home page. Leave empty for a general client (home page only)."),
            F("hide_on_home", "Hide from the home page", "bool", default=False, help="Tick to show it only on its service pages."),
            F("enabled", "Show on the website", "bool", default=True, help="Untick to hide this entry from the website without deleting it. Publishing and unpublishing work as well: hiding is the quick on/off switch."),
            F("is_sample", "Sample entry (placeholder, not a real client)", "bool", default=False, help="Tick only for placeholders. Replace a sample by editing it (upload a real logo, rename it, untick this) or delete it."),
            F("logo_url", "Built-in sample logo (leave empty for real clients)", max_len=120, help="Path of artwork shipped with the website, used only when no logo is uploaded above.", ui="hidden"),
        ],
    },
    # ---- Testimonials ---------------------------------------------------------------------------------------------------------------
    "testimonial": {
        "public_filter": ("enabled", False, "exclude"), "label": "Client & student testimonials", "group": "Testimonials", "module": "content", "single": False, "preview_path": "/",
        "help": "Real feedback only, shown with the person's permission. Published testimonials with no service chosen appear one at a time in \"What Our Clients & Students Say\" on the home page; choose a service to show one on that service page instead. Order: "
                "(use the order number to arrange them). Entries marked as samples are fictional placeholders shown with a \"Sample\" label: edit or delete them once you have real feedback. "
                "With none published, the section is hidden.",
        "title_label": "Person's name",
        "fields": [
            F("person_type", "Client or student", "select", True, options=[{"value": "client", "label": "Client"}, {"value": "student", "label": "Student"}]),
            F("role", "Designation / role", "text", True, max_len=120, help="e.g. Operations Manager, or B.E. student"),
            F("organization", "Company or institution", max_len=160),
            F("quote", "Testimonial", "textarea", True, max_len=700),
            F("photo", "Profile photo (optional)", "image", help="A square photo works best. Without one, the person's initials are shown."),
            F("service", "Service this testimonial is about", "select", False, ui="service", options=[{"value": v, "label": l} for v, l in SERVICE_SCOPES],
              help="Step 1: choose the main service. Step 2: choose the exact sub-service (or the main service itself). The testimonial then appears automatically on that sub-service page, on its main service page, and on the home page. Leave empty for a general testimonial (home page only)."),
            F("hide_on_home", "Hide from the home page", "bool", default=False, help="Tick to show it only on its service pages."),
            F("rating", "Rating (optional)", "select", False, options=[{"value": str(n), "label": f"{n} out of 5"} for n in (5, 4, 3, 2, 1)]),
            F("enabled", "Show on the website", "bool", default=True, help="Untick to hide this entry from the website without deleting it. Publishing and unpublishing work as well: hiding is the quick on/off switch."),
            F("is_sample", "Sample (fictional placeholder, not real feedback)", "bool", default=False, help="Untick once you replace the content with real feedback."),
        ],
    },
    # ---- Portfolio ------------------------------------------------------------------------------------------------------------------
    "project": {
        "public_filter": ("enabled", False, "exclude"), "label": "Projects & solutions", "group": "Portfolio", "module": "content", "single": False, "preview_path": "/work",
        "help": "Publish only client-approved work with verified details. When at least one project is published, the Work page shows projects instead of the illustrative concepts.",
        "fields": [
            F("division", "Division", "select", True, options=DIVISIONS),
            F("category", "Category / tags", max_len=120),
            F("client_type", "Client type", max_len=120, help="e.g. 'Manufacturing company' (do not name a client without permission)"),
            F("summary", "Summary", "textarea", True, max_len=600),
            F("image", "Project image", "image"), F("video", "Project video", "video"),
            F("link", "Case study link (optional)", max_len=300),
            F("enabled", "Show on the website", "bool", default=True, help="Untick to hide this entry from the website without deleting it. Publishing and unpublishing work as well: hiding is the quick on/off switch."),
        ],
        "title_label": "Project title",
    },
    # ---- Products -------------------------------------------------------------------------------------------------------------------
    "product": {
        "public_filter": ("enabled", False, "exclude"), "label": "Products", "group": "Products", "module": "content", "single": False, "preview_path": "/products",
        "help": "LAX360's own software products and SaaS platforms (never third-party products). Each published product appears on the Products page and gets its own details page. "
                "When at least one product is published, these replace the built-in list. Add screenshots of the real product, and keep the status accurate: the demo and access buttons only appear for Live and Beta products.",
        "title_label": "Product name",
        "fields": [
            F("category", "Category", "select", True, options=PRODUCT_CATEGORIES),
            F("status", "Availability", "select", True, options=PRODUCT_STATUSES, default="soon"),
            F("portfolio_category", "Portfolio category (Products page filter)", "select", options_from="solution_category",
              help="Which filter of the Products page this product appears under. Leave empty to use the default for this product."),
            F("summary", "Short description (card text)", "textarea", True, max_len=300),
            F("overview", "Overview", "textarea", max_len=4000, help="Plain paragraphs. A blank line starts a new paragraph."),
            F("problems", "Business problems addressed", "textarea", max_len=2000, help="One problem per line."),
            F("features", "Key features and modules", "textarea", max_len=3000, help="One feature per line. Optional: write \"Title: description\"."),
            F("benefits", "Benefits", "textarea", max_len=2000, help="One benefit per line."),
            F("use_cases", "Use cases", "textarea", max_len=2000, help="One use case per line."),
            F("users", "Target users", "textarea", max_len=1000, help="One group per line, e.g. Startups."),
            F("industries", "Industries", "textarea", max_len=1000, help="One industry per line."),
            F("workflow", "Workflow and capabilities", "textarea", max_len=3000, help="How the software works, step by step. One step per line, optionally \"Title: description\"."),
            F("logo", "Logo", "image"), F("image", "Thumbnail / cover image", "image", help="Shown on the product card and at the top of the product page."), F("banner", "Banner image (optional)", "image", help="A wide image for the top of the product page."),
            F("screenshot_1", "Screenshot 1", "image"), F("screenshot_2", "Screenshot 2", "image"), F("screenshot_3", "Screenshot 3", "image"), F("screenshot_4", "Screenshot 4", "image"),
            F("screenshot_5", "Screenshot 5", "image"), F("screenshot_6", "Screenshot 6", "image"), F("screenshot_7", "Screenshot 7", "image"), F("screenshot_8", "Screenshot 8", "image"),
            F("product_link", "Product / access link", max_len=300, help="Where visitors open or sign up for the product (https:// URL or a page like /contact)."),
            F("demo_link", "Demo request link", max_len=300, help="Optional: a page where visitors can request a demo."),
            *[x for key, label, default in LINK_FIELDS for x in (F(key, label, max_len=300, ui="url", help="Full https:// address. Leave empty and no button is shown."),
                                                                F(key + "_label", label.replace(" URL", "") + " button text", max_len=40, help=f"Default: {default}."))],
            F("video_link", "Demo video URL", max_len=300, ui="url", help="Full https:// address. Shown as Watch Demo."), F("video_link_label", "Demo video button text", max_len=40, help="Default: Watch Demo."),
            F("demo_site_link", "Demo website / live preview link", max_len=300, help="A working demo of the software that anyone can open without logging in (https:// URL). Shown on the card and the product page, whatever the status."),
            F("cta_label", "Main button text", max_len=40, help="Defaults to \"Enquire about this product\"."),
            F("seo_title", "Search title", max_len=70, help="The page title in search results. Leave empty to use the product name."),
            F("seo_description", "Search description", "textarea", max_len=300, help="The text under the title in search results. Leave empty to use the short description."),
            F("enabled", "Show on the website", "bool", default=True, help="Untick to hide this entry from the website without deleting it. Publishing and unpublishing work as well: hiding is the quick on/off switch."),
        ],
    },
    "product_module": {
        "label": "Product modules", "group": "Products", "module": "content", "single": False, "preview_path": "/products",
        "help": "The parts of a product, each with its own explanation and picture. Choose the product, describe the module and add a screenshot of it. Modules appear on that product's page in this order.",
        "title_label": "Module name",
        "fields": [
            F("product", "Product", "select", True, options_from="product"),
            F("summary", "Short description", "textarea", True, max_len=300),
            F("description", "Detailed explanation", "textarea", max_len=2000, help="A blank line starts a new paragraph."),
            F("features", "What it does", "textarea", max_len=1500, help="One point per line."),
            F("image", "Module image / screenshot", "image"), F("image_alt", "Image description", max_len=160),
        ],
    },
    "product_resource": {
        "label": "Product downloads", "group": "Products", "module": "content", "single": False, "preview_path": "/products",
        "help": "Demo PDFs, brochures and documentation for a product. A file marked “login required” is never public: visitors must be logged in to download it, and the file itself is only ever sent by the server after that check. Unmarked files can be downloaded by anyone.",
        "title_label": "File name shown to visitors",
        "fields": [
            F("product", "Product", "select", True, options_from="product"),
            F("resource_type", "Type", "select", True, options=PRODUCT_RESOURCE_TYPES, default="brochure"),
            F("file", "File (PDF)", "document", True, help="Upload the PDF in the media library; it stays private."),
            F("description", "Short description", "textarea", max_len=300),
            F("requires_login", "Login required to download", "bool", default=True, help="On: only logged-in visitors can download it. Off: anyone can."),
        ],
    },
    # ---- Website portfolio ----------------------------------------------------------------------------------------------------------
    "website": {
        "public_filter": ("enabled", False, "exclude"), "label": "Website portfolio", "group": "Websites", "module": "content", "single": False, "preview_path": "/websites",
        "help": "The websites shown under “Our Websites & Live Demos”: LAX360 company websites, client websites and demonstration projects. Describe only what the live website really has. "
                "Leave the web address empty for a site that is not live yet (no link is shown). Publish to list it; each entry gets its own details page.",
        "title_label": "Website name",
        "fields": [
            F("category", "Industry / business category", "text", True, max_len=60, help="e.g. Healthcare, Real Estate, Training & Education. Entries with the same category are grouped in the filters."),
            F("entry_kind", "Kind of website", "select", True, options=WEBSITE_KINDS, default="demo", help="Shown on the card so visitors can tell a client website from a LAX360 website or a demonstration."),
            F("website_type", "Website type", "select", False, options=WEBSITE_TYPES, help="Leave empty if not confirmed."),
            F("website_link", "Live website address", max_len=300, help="The full https:// address of the live website. Leave empty if there is none yet."),
            F("summary", "Short description (card text)", "textarea", True, max_len=300),
            F("overview", "Overview and purpose", "textarea", max_len=4000, help="Plain paragraphs. A blank line starts a new paragraph."),
            F("type_reason", "Why this website type suits it", "textarea", max_len=1000),
            F("features", "Features and functionality", "textarea", max_len=5000, help="One per line, optionally \"Title: description\". Only features the live website really has."),
            F("modules", "Modules and what they do", "textarea", max_len=5000, help="One per line, optionally \"Module name: description\"."),
            F("responsive", "Responsive design and mobile compatibility", "textarea", max_len=1500),
            F("admin_cms", "Admin panel and content management", "textarea", max_len=2000, help="Only if the website has one."),
            F("technologies", "Technologies used", "textarea", max_len=1500, help="One per line. Only what is verified."),
            F("image", "Preview image (card and details page)", "image"),
            F("screenshot_1", "Screenshot 1", "image"), F("screenshot_2", "Screenshot 2", "image"), F("screenshot_3", "Screenshot 3", "image"), F("screenshot_4", "Screenshot 4", "image"),
            F("screenshot_5", "Screenshot 5", "image"), F("screenshot_6", "Screenshot 6", "image"),
            F("mobile_image", "Mobile view screenshot", "image"),
            F("preview_paths", "Built-in screenshots (file paths)", "textarea", max_len=1500, help="Screenshots shipped with the website, one path per line (/assets/websites/name.jpg). Uploaded images above are shown first.", ui="hidden"),
            F("mobile_path", "Built-in mobile screenshot (file path)", max_len=120, ui="hidden"),
            F("embed_preview", "Show an embedded live preview on the details page", "bool", default=False, help="Visitors can load the live site inside the page. If the website blocks embedding, the screenshots and the Explore button are used instead."),
            F("featured", "Featured", "bool", default=False, help="Featured websites are shown first on the Products page."),
            F("enabled", "Show on the website", "bool", default=True, help="Untick to hide this entry from the website without deleting it. Publishing and unpublishing work as well: hiding is the quick on/off switch."),
        ],
    },
    # ---- Image carousel (the slow, swipeable picture strip between Testimonials and Our Clients) ----------------------------------------------------------
    "carousel_page": {
        "label": "Image carousel settings", "group": "Homepage", "module": "content", "single": True, "slug": "carousel", "preview_path": "/#gallery",
        "help": "The heading, introduction, speed and on/off switch of the picture strip on the home page (between Testimonials and Our Clients). The pictures themselves are managed under Image carousel. "
                "The strip is hidden automatically when no picture is switched on.",
        "fields": [
            F("enabled", "Show the image carousel", "bool", default=True),
            F("eyebrow", "Small label above the title", max_len=60),
            F("title", "Title", max_len=80), F("title_accent", "Title: highlighted words", max_len=60),
            F("lead", "Short introduction", "textarea", max_len=300),
            F("speed", "Automatic movement", "select", options=CAROUSEL_SPEEDS, default="normal", help="Visitors can always swipe, drag or scroll it themselves; it pauses while they do."),
            F("pause_on_hover", "Pause when the pointer is over it", "bool", default=True),
        ],
    },
    "carousel_image": {
        "label": "Image carousel", "group": "Homepage", "module": "content", "single": False, "preview_path": "/#gallery",
        "help": "The pictures of the strip, in order. Upload your own photographs, switch pictures on or off, re-order them and delete the temporary sample images when you no longer need them. "
                "A picture marked as a sample shows a small “Sample image” label on the website, so placeholders are never mistaken for real photographs.",
        "title_label": "Picture name (for you)",
        "fields": [
            F("image", "Picture", "image", help="Upload in the media library. Wide pictures look best at about 1170 x 600 px, narrow ones at about 550 x 600 px."),
            F("shape", "Frame shape", "select", options=CAROUSEL_SHAPES, default="landscape", help="Wide or narrow frame; the picture is cropped to fill it."),
            F("alt", "Description of the picture (for screen readers)", max_len=160),
            F("caption", "Caption shown on hover (optional)", max_len=120),
            F("enabled", "Show this picture", "bool", default=True),
            F("sample", "This is a temporary sample image", "bool", default=False, help="Shows a “Sample image” label on the website. Untick it for your own photographs."),
            F("image_path", "Built-in picture (file path)", max_len=120, help="Only for the pictures shipped with the website (/assets/carousel/name.webp). An uploaded picture above takes priority.", ui="hidden"),
        ],
    },
    # ---- Services & industries carousel (the auto-scrolling card strip directly below the home header, above the welcome sections) ---------------------------------
    "service_carousel_page": {
        "label": "Services & industries carousel settings", "group": "Homepage", "module": "content", "single": True, "slug": "service-carousel", "preview_path": "/",
        "help": "The heading, introduction, automatic scrolling speed and on/off switch of the card strip below the home header. The cards themselves are managed under Services & industries carousel.",
        "fields": [
            F("enabled", "Show the carousel", "bool", default=True),
            F("eyebrow", "Small label above the title", max_len=60),
            F("title", "Title", max_len=80), F("title_accent", "Title: highlighted words", max_len=60),
            F("lead", "Short introduction", "textarea", max_len=300),
            F("scroll", "Automatic scrolling", "bool", default=True, help="Off keeps the cards still: visitors can still swipe, drag or use the arrows."),
            F("speed", "Scrolling speed", "select", options=CAROUSEL_SPEEDS, default="normal"),
            F("pause_on_hover", "Pause when the pointer is over it", "bool", default=True),
        ],
    },
    "service_card": {
        "label": "Services & industries carousel", "group": "Homepage", "module": "content", "single": False, "preview_path": "/",
        "help": "The cards of the strip below the home header, in order. Each card has a background picture, a title, a short description and an optional Explore more button. Switch cards on or off, re-order them "
                "or delete them; save one as a draft to preview it (Preview on the website) before it goes live.",
        "title_label": "Card title",
        "fields": [
            F("image", "Background picture", "image", help="Upload in the media library. A landscape picture of about 1000 x 800 px works best; the card crops it to fill."),
            F("image_alt", "Picture description (for screen readers)", max_len=160),
            F("tag", "Small label (e.g. Service or Industry)", max_len=30),
            F("description", "Short description", "textarea", True, max_len=220),
            F("link", "Explore more: destination", max_len=300, help="A page like /services/software or a full https:// address. Leave empty for a card without a button."),
            F("link_label", "Button text", max_len=30, help="Leave empty for “Explore more”."),
            F("enabled", "Show this card", "bool", default=True),
            F("builtin_image", "Built-in picture (file path)", max_len=120, help="Only for the pictures shipped with the website. An uploaded picture above takes priority.", ui="hidden"),
        ],
    },
    # ---- Welcome Experience (the interactive cards shown after the intro animation) -----------------------------------------------------
    "welcome_page": {
        "label": "Welcome Experience settings", "group": "Welcome Experience", "module": "content", "single": True, "slug": "welcome", "preview_path": "/?welcome=preview",
        "help": "The master switch for the interactive welcome cards that follow the intro animation. Publish this item with “Show the welcome experience” ticked to turn the cards on; "
                "untick it (or leave it unpublished) to go straight to the home page. The cards themselves are managed under Welcome cards.",
        "fields": [
            F("enabled", "Show the welcome experience", "bool", default=True),
            F("contact_card_enabled", "Show the contact card after the intro animation", "bool", default=True, help="The optional contact form offered once per browsing session, right after the intro animation. Untick it to go straight to the home page. Its submissions are listed under Enquiry center > Introductory Contact Form Enquiries."),
            F("contact_card_title", "Contact card heading", max_len=120, help="Leave empty for the built-in heading."),
            F("contact_card_text", "Contact card introduction", "textarea", max_len=300, help="Leave empty for the built-in introduction."),
        ],
    },
    "welcome_card": {
        "label": "Welcome cards", "group": "Welcome Experience", "module": "content", "single": False, "preview_path": "/?welcome=preview",
        "help": "The cards of the welcome experience, in order. Use the order number or arrows to re-order, untick “Show this card” to hide one, and publish to make a change live. "
                "Page links must be pages that exist (a path like /services/software). Emerging technologies must stay described as plans until they are launched.",
        "title_label": "Card name (shown as the small label)",
        "fields": [
            F("card_type", "Card type", "select", False, options=WELCOME_CARD_TYPES, default="regular", help="Festival greetings, announcements and offers are shown FIRST, while they are active, before the regular cards."),
            F("start_date", "Show from (date)", max_len=10, ui="date", help="Optional. The card starts to appear on this day. Leave empty to show it straight away."),
            F("end_date", "Show until (date)", max_len=10, ui="date", help="Optional. The last day the card appears; it stops by itself after that. Leave empty for no end."),
            F("theme", "Background style", "select", True, options=WELCOME_THEMES, default="welcome", help="The animated background and colours used for this card."),
            F("enabled", "Show this card", "bool", default=True),
            F("headline", "Headline", "text", True, max_len=140),
            F("description", "Description", "textarea", True, max_len=900, help="A blank line starts a new paragraph."),
            F("status_label", "Status badge", "text", False, max_len=40, help="e.g. “Planned initiative”. Leave empty for no badge. Use it for anything not yet launched."),
            F("image", "Card image (optional)", "image", help="Shown beside the text. Leave empty to use the animated illustration for the background style."),
            F("image_alt", "Image description (for screen readers)", max_len=160),
            F("explore_label", "Main button label", max_len=40, help="e.g. “Explore Software”. Leave empty for no main button."),
            F("explore_link", "Main button link", max_len=300, help="A page path such as /services/software, or a full https:// address."),
            F("franchise_enabled", "Show the Franchise Opportunities button", "bool", default=False, help="Opens the existing franchise enquiry form with this division preselected."),
            F("franchise_label", "Franchise button label", max_len=40, help="Leave empty for “Franchise Opportunities”."),
            F("franchise_division", "Division named in the franchise enquiry", max_len=80, help="e.g. Software & IT Services. Defaults to the card name."),
        ],
    },
    # ---- Careers --------------------------------------------------------------------------------------------------------------------
    "job": {
        "label": "Job openings", "group": "Careers", "module": "careers", "single": False, "preview_path": "/career", "public_filter": ("open", True),
        "help": "Publish an opening to list it on the Career page. Untick \"Open for applications\" to close it (it disappears from the website but stays here).",
        "title_label": "Job title",
        "fields": [
            F("department", "Department / area", max_len=120), F("location", "Location", max_len=120),
            F("employment_type", "Type", "select", options=[{"value": v, "label": l} for v, l in (("full-time", "Full-time"), ("part-time", "Part-time"), ("internship", "Internship"), ("contract", "Contract"))]),
            F("work_mode", "Work mode", "select", options=[{"value": v, "label": l} for v, l in (("on-site", "On-site"), ("hybrid", "Hybrid"), ("remote", "Remote"))]),
            F("experience", "Experience", max_len=80, help="e.g. Freshers welcome, or 2+ years. Only what you actually require."),
            F("summary", "Short summary (card text)", "textarea", False, max_len=300),
            F("description", "Job description", "textarea", True, max_len=4000),
            F("responsibilities", "Responsibilities", "textarea", False, max_len=3000, help="One per line."),
            F("skills", "Key skills", max_len=300, help="Comma-separated, e.g. React, FastAPI, SEO."),
            F("requirements", "Requirements", "textarea", max_len=3000, help="One requirement per line."),
            F("eligibility", "Eligibility / qualifications", "textarea", max_len=1500),
            F("apply_link", "How to apply (link or mailto:)", max_len=300, help="Leave empty to send applicants to the contact form."),
            F("closing_date", "Apply by (optional, YYYY-MM-DD)", max_len=10, help="After this date the opening is hidden from the website."),
            F("featured", "Featured opening", "bool", default=False, help="Featured openings are listed first."),
            F("open", "Open for applications", "bool", default=True),
        ],
    },
    # ---- Navigation & SEO -----------------------------------------------------------------------------------------------------------
    "nav_item": {
        "label": "Navigation menu", "group": "Navigation & SEO", "module": "navigation", "single": False, "preview_path": "/",
        "help": "When at least one item is published for a menu, that menu uses these items (label, link and order) instead of the built-in ones.",
        "title_label": "Menu label",
        "fields": [F("place", "Menu", "select", True, options=NAV_PLACES), F("link", "Link", max_len=300, required=True, help="A page like /about or a full https:// URL"), F("enabled", "Show in the menu", "bool", default=True)],
    },
    "social_link": {
        "label": "Social media links", "group": "Navigation & SEO", "module": "navigation", "single": False, "preview_path": "/",
        "help": "The social icons in the top contact bar and the animated social section. When at least one is published, these replace the built-in links; drag the order with the order number, and switch a link off with “Show”.",
        "title_label": "Name (e.g. Instagram)",
        "fields": [F("platform", "Platform", "select", True, options=SOCIAL_PLATFORMS), F("url", "Profile URL", "text", True, max_len=300, help="The full https:// address of the official profile"), F("enabled", "Show", "bool", default=True)],
    },
    "career_page": {
        "label": "Career page text", "group": "Careers", "module": "careers", "single": True, "slug": "career", "preview_path": "/career",
        "help": "The hero and section headings of the Career page. Leave a field empty to keep the built-in text. Open positions are managed under Job openings.",
        "fields": [
            F("hero_eyebrow", "Hero small label", max_len=60), F("hero_title", "Hero headline", max_len=120), F("hero_lead", "Hero introduction", "textarea", max_len=500),
            F("hero_image", "Hero image (a real LAX360 photograph)", "image"), F("hero_image_alt", "Hero image description", max_len=160),
            F("why_title", "Why join us: heading", max_len=100), F("why_lead", "Why join us: description", "textarea", max_len=300),
            F("openings_title", "Open positions: heading", max_len=100), F("openings_lead", "Open positions: description", "textarea", max_len=300),
            F("apply_title", "Application form: heading", max_len=100), F("apply_lead", "Application form: description", "textarea", max_len=300),
        ],
    },
    "career_perk": {
        "label": "Why join us (benefits & culture)", "group": "Careers", "module": "careers", "single": False, "preview_path": "/career#why",
        "help": "What it is genuinely like to work at LAX360: benefits, learning, culture. Only verified facts. With none published, the built-in working principles are shown.",
        "title_label": "Heading",
        "fields": [
            F("icon", "Icon", "select", False, options=[{"value": v, "label": l} for v, l in CAREER_ICONS]),
            F("description", "Description", "textarea", True, max_len=400),
        ],
    },
    "contact_page": {
        "label": "Contact page text", "group": "Contact", "module": "content", "single": True, "slug": "contact", "preview_path": "/contact",
        "help": "The headline and introductions of the Contact page. Phone, email, address, WhatsApp and business hours are under Settings. Leave a field empty to keep the built-in text.",
        "fields": [
            F("hero_eyebrow", "Hero small label", max_len=60), F("hero_title", "Hero headline", max_len=120), F("hero_lead", "Hero introduction", "textarea", max_len=500),
            F("form_title", "Enquiry section heading", max_len=100), F("form_lead", "Enquiry section introduction", "textarea", max_len=300),
            F("info_title", "Contact details heading", max_len=100), F("info_lead", "Contact details introduction", "textarea", max_len=300),
        ],
    },
    "seo_page": {
        "label": "Page titles & SEO", "group": "Navigation & SEO", "module": "navigation", "single": False, "slug_field": "page", "preview_path": "/",
        "help": "The search title, description, keywords, sharing image and indexing of a page (managed from SEO management). Leave a page unlisted to keep its built-in text.",
        "title_label": "Page title (search results & browser tab)",
        "fields": [
            F("page", "Page", "select", False, options=PAGES), F("path", "Or any other page: its address", max_len=120, help="For a page that is not in the list, e.g. /products/lax360-business-crm or /privacy."),
            F("meta_description", "Meta description", "textarea", max_len=320), F("image", "Social sharing image", "image"),
            F("h1", "H1 heading (optional)", max_len=120, help="The main heading shown at the top of the page. Leave empty to keep the page's own heading."),
            F("og_title", "Sharing title (optional)", max_len=120, help="Title shown when the page is shared (Open Graph / X). Leave empty to use the search title."),
            F("og_description", "Sharing description (optional)", "textarea", max_len=320, help="Description shown when the page is shared. Leave empty to use the meta description."),
            F("keywords", "Keywords", max_len=200, help="Comma-separated. Search engines give them little weight, but they are kept for your own records and for other tools."),
            F("noindex", "Hide this page from search engines", "bool", default=False, help="Adds a noindex tag and removes the page from the sitemap."),
            F("canonical_url", "Canonical address (optional)", max_len=300, help="Only when this page is a copy of another address: its full https:// URL. Leave empty for the page's own address."),
            F("structured_data", "Extra structured data (JSON-LD, optional)", "textarea", max_len=4000, help="Advanced: a schema.org JSON-LD object added to this page, e.g. an FAQPage. It must be valid JSON with an @context of https://schema.org."),
        ],
    },
    "seo_redirect": {
        "label": "Redirects", "group": "Navigation & SEO", "module": "navigation", "single": False, "slug_field": "from_path", "preview_path": "/",
        "help": "Send visitors from an old address to a new one (managed from SEO management). The old address is taken out of the sitemap.",
        "title_label": "Note (for you)",
        "fields": [
            F("from_path", "Old address", "text", True, max_len=110, help="A page path such as /old-page (no domain, no ?query)."),
            F("to_path", "New address", "text", True, max_len=300, help="A page path such as /new-page, or a full https:// address."),
            F("permanent", "Permanent move (301)", "bool", default=True, help="Search engines then move the old page's ranking to the new address. Untick for a temporary (302) redirect."),
            F("enabled", "Active", "bool", default=True),
        ],
    },
    "site_image": {
        "label": "Replaced website pictures", "group": "Navigation & SEO", "module": "content", "single": False, "slug_field": "key", "hidden": True, "preview_path": "/",
        "help": "Managed from Pages in the admin panel: a picture that replaces one of the website's built-in pictures (the path of the built-in picture is the key).",
        "title_label": "Picture",
        "fields": [F("key", "Built-in picture", "text", True, max_len=110), F("image", "Replacement picture", "image"), F("previous", "Previous replacement", "text", max_len=64)],
    },
}
GROUP_ORDER = ["Homepage", "Services", "Products", "Websites", "Welcome Experience", "Industries", "Insights", "Network", "Team", "Clients", "Testimonials", "About", "Portfolio", "Careers", "Contact", "Navigation & SEO"]


def kinds_for_ui(db: Session, user=None) -> list[dict]:
    from app.core.permissions import has_permission

    out = []
    dynamic: dict[str, list[dict]] = {}
    for kind, spec in KINDS.items():
        if (user is not None and not has_permission(user, spec["module"])) or spec.get("hidden"):
            continue  # a hidden kind is managed from its own screen (Pages), not from the generic content list
        fields = []
        for f in spec["fields"]:
            f = dict(f)
            if f.get("options_from"):
                src = f["options_from"]
                if src not in dynamic:
                    dynamic[src] = [{"value": i.slug, "label": i.title} for i in list_items(db, src)]
                static = list(f["options"])
                f["options"] = static + [o for o in dynamic[src] if o["value"] not in {x["value"] for x in static}]
            fields.append(f)
        out.append({"kind": kind, **spec, "fields": fields})
    return out


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:80] or "item"


def _options(db: Session, f: dict) -> set[str]:
    static = {o["value"] for o in f["options"]}
    if f.get("options_from"):
        return static | {i.slug for i in list_items(db, f["options_from"])}
    return static


_BAD_LABELS = {"example", "localhost", "test", "placeholder", "yourcompany", "yourdomain", "domain", "lorem", "invalid"}


def valid_link(value: str, allow_page: bool = False) -> bool:
    """A usable external address: https://real.host/..., or (when allowed) a page of this site such as /contact. Placeholders, #, javascript: and empty hosts are refused."""
    v = (value or "").strip()
    if allow_page and re.match(r"^/(?!/)[A-Za-z0-9/_.~%?=&#-]*$", v) and len(v) > 1:
        return True
    m = re.match(r"^https?://([A-Za-z0-9.-]+)(:\d+)?(/[^\s]*)?$", v)
    if not m:
        return False
    host = m.group(1).lower()
    return "." in host and not host.startswith(".") and not host.endswith(".") and not (set(host.split(".")) & _BAD_LABELS)


def _validate(db: Session, kind: str, title: str, data: dict) -> tuple[str, dict]:
    spec = KINDS[kind]
    errors: dict[str, str] = {}
    title = " ".join((title or "").split())
    if not spec["single"] and not title and kind != "seo_page":  # a page's SEO entry may leave the search title empty (only the H1, indexing, canonical ...): the website then keeps the built-in title
        errors["title"] = f"{spec.get('title_label', 'Title')} is required."
    if len(title) > 200:
        errors["title"] = "Keep it under 200 characters."
    allowed = {f["name"]: f for f in spec["fields"]}
    clean: dict = {}
    for name in data:
        if name not in allowed:
            errors[name] = "Unknown field."
    for name, f in allowed.items():
        value = data.get(name, f.get("default"))
        kind_t = f["type"]
        if kind_t == "bool":
            if value is None:
                value = bool(f.get("default"))
            if not isinstance(value, bool):
                errors[name] = "Must be on or off."
            else:
                clean[name] = value
            continue
        if value is None:
            value = ""
        if not isinstance(value, str):
            errors[name] = "Must be text."
            continue
        value = value.strip()
        if f["required"] and not value:
            errors[name] = f"{f['label']} is required."
        elif len(value) > f["max"]:
            errors[name] = f"Keep it under {f['max']} characters."
        elif kind_t == "gallery" and value:
            entries = gallery_entries(value)
            bad = None
            if len(entries) > 24:
                bad = "At most 24 images."
            for ref, cap in entries:
                if len(cap) > 160:
                    bad = "Keep each caption under 160 characters."
                elif _is_uuid(ref):
                    a = db.get(MediaAsset, uuid.UUID(ref))
                    if a is None or a.kind != "image":
                        bad = "One of the pictures is no longer in the media library. Remove it or choose another."
                elif not (re.match(r"^/assets/[A-Za-z0-9/_.-]+\.(webp|jpg|jpeg|png|svg)$", ref) or valid_link(ref)):
                    bad = "Use pictures from the media library."
            if bad:
                errors[name] = bad
            else:
                value = "\n".join(f"{r}|{c}" if c else r for r, c in entries)
        elif kind_t in ("image", "video", "document") and value:
            try:
                asset = db.get(MediaAsset, uuid.UUID(value))
            except ValueError:
                asset = None
            if asset is None or asset.kind != kind_t:
                errors[name] = f"Choose {'an image' if kind_t == 'image' else 'a video' if kind_t == 'video' else 'a PDF document'} from the media library."
        elif kind_t == "select" and value and value not in _options(db, f):
            errors[name] = "Choose one of the listed options."
        elif kind_t == "multiselect" and value:
            chosen = [v.strip() for v in value.split(",") if v.strip()]
            if any(v not in _options(db, f) for v in chosen):
                errors[name] = "Choose only from the listed options."
            else:
                value = ",".join(dict.fromkeys(chosen))
        elif f.get("ui") in ("url", "url-or-page") and value:
            if not valid_link(value, allow_page=f["ui"] == "url-or-page"):
                errors[name] = "Enter a full, real https:// address (no placeholders such as example.com or #)" + (", or a page on this website starting with /." if f["ui"] == "url-or-page" else ".")
        elif name == "logo_url":
            if value and not re.match(r"^/assets/clients/[A-Za-z0-9._-]+\.(svg|png|webp)$", value):
                errors[name] = "Leave this empty, or use a built-in artwork path such as /assets/clients/sample-1.svg"
        elif name == "image_path":
            if value and not re.match(r"^/assets/carousel/[A-Za-z0-9._-]+\.(webp|jpg|jpeg|png)$", value):
                errors[name] = "Use a built-in picture path such as /assets/carousel/sample-1.webp, or leave this empty."
        elif name in ("from_path", "to_path"):
            if name == "from_path" and not re.match(r"^/[A-Za-z0-9/_.~%-]*$", value):
                errors[name] = "Use a page path such as /old-page (starting with /, no domain, no spaces, no ?query)."
            elif name == "to_path" and not (re.match(r"^/[A-Za-z0-9/_.~%?=&#-]*$", value) or _LINK.match(value)):
                errors[name] = "Use a page path such as /new-page or a full https:// address."
            elif name == "to_path" and value.startswith("//"):
                errors[name] = "Use a page path such as /new-page or a full https:// address."
        elif name == "canonical_url":
            if value and not re.match(r"^https://[^\s]{4,290}$", value):
                errors[name] = "Enter the full address starting with https://"
        elif name == "structured_data":
            if value:
                try:
                    parsed = json.loads(value)
                    nodes = parsed if isinstance(parsed, list) else [parsed]
                    if not nodes or not all(isinstance(n, dict) and "schema.org" in str(n.get("@context", "")) for n in nodes):
                        raise ValueError
                except (ValueError, TypeError):
                    errors[name] = "Enter valid JSON: an object (or list of objects) with \"@context\": \"https://schema.org\"."
        elif name == "path":
            if value and not re.match(r"^/[A-Za-z0-9/_.~%-]*$", value):
                errors[name] = "Use a page path such as /privacy (starting with /, no domain, no spaces)."
        elif name == "builtin_image":
            if value and not re.match(r"^/assets/(services|industries|products|about)/[A-Za-z0-9._-]+\.(webp|jpg|jpeg|png)$", value):
                errors[name] = "Use a built-in picture path such as /assets/services/software.webp, or leave this empty."
        elif name == "photo_path":
            if value and not re.match(r"^/assets/team/[A-Za-z0-9._-]+\.(webp|jpg|jpeg|png)$", value):
                errors[name] = "Use a built-in picture path such as /assets/team/sample-1.webp, or leave this empty."
        elif name == "preview_paths" or name == "mobile_path":
            if value and not all(re.match(r"^/assets/websites/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$", line.strip()) for line in value.splitlines() if line.strip()):
                errors[name] = "Use built-in screenshot paths such as /assets/websites/name.jpg (one per line), or leave this empty."
        elif name == "website_link":
            if value and not re.match(r"^https?://[^\s]{3,300}$", value):
                errors[name] = "Enter the company's full website address starting with https://"
        elif name == "linkedin_link":
            if value and not re.match(r"^https://([a-z0-9-]+\.)?linkedin\.com/[^\s]+$", value, re.I):
                errors[name] = "Enter the full LinkedIn address starting with https://www.linkedin.com/"
        elif name in ("published_on", "closing_date", "start_date", "end_date"):
            try:
                if value:
                    datetime.date.fromisoformat(value)
            except ValueError:
                errors[name] = "Use the date format YYYY-MM-DD."
        elif name == "url":
            if value and not re.match(r"^https://[^\s]{3,300}$", value):
                errors[name] = "Enter the full profile address starting with https://"
        elif name in _LINK_FIELDS or name.endswith("_link"):
            if value and not ((value.startswith("/") and not value.startswith("//")) or _LINK.match(value) or (name == "apply_link" and re.match(r"^mailto:[^\s@]+@[^\s@]+$", value))):
                errors[name] = "Use a page path like /contact or a full https:// URL."
        if value:
            clean[name] = value
    if kind == "seo_page" and not errors.get("page") and not errors.get("path") and not clean.get("page") and not clean.get("path"):
        errors["page"] = "Choose a page, or enter the address of another page."
    if kind == "seo_redirect" and clean.get("from_path") and clean.get("from_path") == clean.get("to_path"):
        errors["to_path"] = "The new address must differ from the old one."
    if kind == "carousel_image" and not errors.get("image") and not clean.get("image") and not clean.get("image_path"):
        errors["image"] = "Choose a picture."
    if kind == "welcome_card" and "end_date" not in errors and "start_date" not in errors and clean.get("start_date") and clean.get("end_date") and clean["end_date"] < clean["start_date"]:
        errors["end_date"] = "The end date must be on or after the start date."
    if errors:
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", fields=errors)
    return title or spec["label"], clean


def get_kind(kind: str) -> dict:
    if kind not in KINDS:
        raise ApiError(404, "not_found", "Unknown content type.")
    return KINDS[kind]


def list_items(db: Session, kind: str, *, status: str | None = None) -> list[ContentItem]:
    get_kind(kind)
    q = select(ContentItem).where(ContentItem.kind == kind)
    if status:
        q = q.where(ContentItem.status == status)
    return list(db.scalars(q.order_by(ContentItem.sort_order, ContentItem.created_at)))


def gallery_entries(value: str) -> list[tuple[str, str]]:
    """The lines of a gallery field: "<library image id or /assets/... path or https address> | caption", in display order."""
    out = []
    for line in (value or "").splitlines():
        ref, _, cap = line.partition("|")
        if ref.strip():
            out.append((ref.strip(), cap.strip()))
    return out


def _is_uuid(v: str) -> bool:
    try:
        uuid.UUID(v)
        return True
    except ValueError:
        return False


def _media_ids(kind: str, data: dict) -> set[uuid.UUID]:
    ids = set()
    for f in KINDS[kind]["fields"]:
        if f["type"] in ("image", "video") and data.get(f["name"]):
            ids.add(uuid.UUID(data[f["name"]]))
        if f["type"] == "gallery":
            ids |= {uuid.UUID(r) for r, _ in gallery_entries(data.get(f["name"])) if _is_uuid(r)}
    return ids


def _publish_media(db: Session, kind: str, data: dict, status: str) -> list[uuid.UUID]:
    """Published content can only show public files: the files it references are switched to public (and returned so the caller can audit it)."""
    return media_service.make_public(db, _media_ids(kind, data)) if status == "published" else []


def _slug_for(db: Session, spec: dict, title: str, clean: dict, current: ContentItem | None, kind: str) -> str:
    if spec["single"]:
        return spec["slug"]
    if spec.get("slug_field"):
        slug = (_slugify(clean[spec["slug_field"]]) if spec["slug_field"] == "url_slug" and clean.get(spec["slug_field"]) else clean.get(spec["slug_field"])) or _slugify(title)
        taken = db.scalar(select(ContentItem.id).where(ContentItem.kind == kind, ContentItem.slug == slug, ContentItem.id != (current.id if current else uuid.uuid4())))
        if taken:
            raise ApiError(409, "already_exists", "An item for this already exists: edit it instead.", fields={spec["slug_field"]: "Already in use."})
        return slug
    return _slugify(title)


# ---- one picture, one place -------------------------------------------------------------------------------------------------------
UNIQUE_PICTURE_KINDS = ("carousel_image",)  # kinds where the same picture may appear only once (the carousel: a repeated picture is a mistake, never a design choice)


def _sha_map(db: Session, datas: list[dict]) -> dict[str, str | None]:
    ids = set()
    for d in datas:
        try:
            if d.get("image"):
                ids.add(uuid.UUID(d["image"]))
        except ValueError:
            pass
    return {str(a.id): a.sha256 for a in db.scalars(select(MediaAsset).where(MediaAsset.id.in_(ids)))} if ids else {}


def picture_identity(data: dict, sha_by_id: dict[str, str | None]) -> str | None:
    """What makes two entries 'the same picture': the same file content (the library already stores identical files once, but older uploads may exist twice), the same library item,
    or the same built-in picture path."""
    if data.get("image"):
        sha = sha_by_id.get(str(data["image"]))
        return f"sha:{sha}" if sha else f"asset:{data['image']}"
    return f"path:{data['image_path']}" if data.get("image_path") else None


def _ensure_unique_picture(db: Session, kind: str, new: dict, current: ContentItem | None) -> None:
    if kind not in UNIQUE_PICTURE_KINDS:
        return
    db.execute(text("select pg_advisory_xact_lock(hashtext(:k))"), {"k": f"unique-picture:{kind}"}) if db.bind.dialect.name == "postgresql" else None  # two simultaneous adds cannot both pass the check
    others = [i for i in list_items(db, kind) if not current or i.id != current.id]
    sha = _sha_map(db, [new] + [i.data or {} for i in others])
    mine = picture_identity(new, sha)
    if current is not None and picture_identity(current.data or {}, sha) == mine:
        return  # the picture is not changing: editing other details (or hiding an old duplicate) must stay possible
    if mine:
        for i in others:
            if picture_identity(i.data or {}, sha) == mine:
                raise ApiError(409, "duplicate_picture", f"This picture is already in the carousel (“{i.title}”). Each picture can be added only once.", fields={"image": "Already in the carousel."})


def duplicate_groups(db: Session, kind: str) -> list[tuple[ContentItem, list[ContentItem]]]:
    """[(the entry kept, [its later duplicates])] in display order: the first entry (lowest order, then oldest) keeps its place."""
    items = list_items(db, kind)
    sha = _sha_map(db, [i.data or {} for i in items])
    seen: dict[str, ContentItem] = {}
    dupes: dict[str, list[ContentItem]] = {}
    for i in items:
        key = picture_identity(i.data or {}, sha)
        if not key:
            continue
        if key in seen:
            dupes.setdefault(key, []).append(i)
        else:
            seen[key] = i
    return [(seen[k], v) for k, v in dupes.items()]


def remove_duplicates(db: Session, kind: str) -> list[ContentItem]:
    """Delete the later copies of any repeated picture (their library files stay). Every unique picture keeps its place and order. Returns what was removed."""
    gone = []
    for _, extra in duplicate_groups(db, kind):
        for i in extra:
            gone.append(i)
            db.delete(i)
    db.flush()
    return gone


def create(db: Session, user: User, kind: str, *, title: str, data: dict, status: str, sort_order: int) -> ContentItem:
    spec = get_kind(kind)
    title, clean = _validate(db, kind, title, data)
    _ensure_unique_picture(db, kind, clean, None)
    slug = _slug_for(db, spec, title, clean, None, kind)
    if db.scalar(select(ContentItem.id).where(ContentItem.kind == kind, ContentItem.slug == slug)):
        if spec["single"]:
            raise ApiError(409, "already_exists", "This content already exists: edit it instead.")
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    item = ContentItem(kind=kind, slug=slug, title=title, data=clean, status=status, sort_order=sort_order, updated_by=user.id)
    db.add(item)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ApiError(409, "already_exists", "An item with that name already exists.") from None
    _publish_media(db, kind, clean, status)
    return item


def get_item(db: Session, item_id: uuid.UUID) -> ContentItem:
    item = db.get(ContentItem, item_id)
    if item is None:
        raise ApiError(404, "not_found", "Content item not found.")
    return item


def update(db: Session, user: User, item: ContentItem, *, title: str | None, data: dict | None, status: str | None, sort_order: int | None) -> list[str]:
    changed = []
    if title is not None or data is not None:
        new_title, clean = _validate(db, item.kind, title if title is not None else item.title, data if data is not None else item.data)
        if new_title != item.title:
            item.title = new_title
            changed.append("title")
        if clean != item.data:
            _ensure_unique_picture(db, item.kind, clean, item)
            item.data = clean
            changed.append("data")
            spec = KINDS[item.kind]
            if spec.get("slug_field") and clean.get(spec["slug_field"]) and (_slugify(clean[spec["slug_field"]]) if spec["slug_field"] == "url_slug" else clean[spec["slug_field"]]) != item.slug:
                item.slug = _slug_for(db, spec, new_title, clean, item, item.kind)
    if status is not None and status != item.status:
        item.status = status
        changed.append("status")
    if sort_order is not None and sort_order != item.sort_order:
        item.sort_order = sort_order
        changed.append("sort_order")
    item.updated_by = user.id
    _publish_media(db, item.kind, item.data or {}, item.status)
    return changed


def reorder(db: Session, kind: str, ids: list[uuid.UUID]) -> None:
    items = {i.id: i for i in list_items(db, kind)}
    if sorted(map(str, ids)) != sorted(map(str, items)):
        raise ApiError(409, "stale_list", "The list changed since you loaded it. Reload the page and try again.")
    for position, item_id in enumerate(ids, start=1):
        items[item_id].sort_order = position * 10


def _asset(db: Session, assets: dict | None, raw: str):
    """The media row for an id: from a preloaded map when there is one (the bundle), otherwise one query."""
    try:
        key = uuid.UUID(raw)
    except ValueError:
        return None
    return assets.get(key) if assets is not None else db.get(MediaAsset, key)


def _resolve(db: Session, settings: Settings, kind: str, data: dict, preview: bool = False, assets: dict | None = None) -> dict:
    """Replace media ids with the URL a browser can load (None when the file is gone or not public, so a deleted file never breaks a page)."""
    out = dict(data or {})
    for f in KINDS[kind]["fields"]:
        if f["type"] == "gallery":  # library ids become addresses; a picture that is gone or not public is skipped, so a deleted file never breaks a page
            items = []
            for ref, cap in gallery_entries(out.get(f["name"])):
                if _is_uuid(ref):
                    asset = _asset(db, assets, ref)
                    if asset is None or not (asset.is_public or preview):
                        continue
                    url = media_service.url_of(settings, asset) if asset.is_public or asset.storage == "supabase" else f"/api/admin/media/{asset.id}/file"
                    items.append({"url": url, "caption": cap, "alt": asset.alt_text or cap})
                else:
                    items.append({"url": ref, "caption": cap, "alt": cap})
            out[f["name"] + "_items"] = items
            out[f["name"]] = "\n".join(i["url"] for i in items)
            continue
        if f["type"] == "document" and out.get(f["name"]):  # a private download: the browser only gets the file's name, size and type, never a link to it
            asset = _asset(db, assets, out[f["name"]])
            if asset is None:
                del out[f["name"]]
            else:
                out[f["name"] + "_info"] = {"filename": asset.filename, "size": asset.size_bytes, "type": asset.content_type}
            continue
        if f["type"] in ("image", "video") and out.get(f["name"]):
            asset = _asset(db, assets, out[f["name"]])
            if asset is None:
                out[f["name"]] = None
            elif asset.is_public:
                out[f["name"]] = media_service.url_of(settings, asset)
            elif preview:  # an admin previewing a draft sees pictures that are not public yet (they become public when the item is published)
                out[f["name"]] = media_service.url_of(settings, asset) if asset.storage == "supabase" else f"/api/admin/media/{asset.id}/file"
            else:
                out[f["name"]] = None
            if out[f["name"]] is None:
                del out[f["name"]]
            elif asset.alt_text:
                out[f["name"] + "_alt"] = asset.alt_text
    return out


def _keys(kind: str, data: dict) -> list[str]:
    if kind == "client":
        return [v.strip() for v in str(data.get("services") or "").split(",") if v.strip()]
    return [data["service"]] if data.get("service") else []


def service_content(db: Session, settings: Settings, category: str, sub: str | None = None) -> dict:
    """Published clients and testimonials for one service page, by the hierarchy (service ids are "<category>" and "<category>/<sub-service>"; "<category>/*" = the
    main service itself):
    - a main service page shows everything assigned to the main service or to any of its sub-services;
    - a sub-service page shows what is assigned to that sub-service, plus what is assigned to its main service as a whole.
    Each entry is returned once, in the order set in the admin panel."""
    here = f"{category}/{sub}" if sub else None
    out: dict[str, list] = {}
    for kind in ("client", "testimonial"):
        rows = []
        for item in public_items(db, settings, kind):
            keys = _keys(kind, item["data"])
            hit = any(k.startswith(f"{category}/") for k in keys) if sub is None else any(k in (here, f"{category}/*") for k in keys)
            if hit:
                rows.append(item)
        out[kind + "s"] = rows
    return out


def public_items(db: Session, settings: Settings, kind: str, *, include_drafts: bool = False) -> list[dict]:
    if kind not in KINDS:
        return []
    flt = KINDS[kind].get("public_filter")
    out = []
    for i in list_items(db, kind, status=None if include_drafts else "published"):
        if flt and not include_drafts and (((i.data or {}).get(flt[0]) == flt[1]) if len(flt) > 2 else ((i.data or {}).get(flt[0]) != flt[1])):
            continue  # e.g. a closed job opening, or a deactivated team profile (("active", False, "exclude"))
        out.append({"id": str(i.id), "slug": i.slug, "title": i.title, "data": _resolve(db, settings, kind, i.data, preview=include_drafts), "sort_order": i.sort_order,
                    **({"status": i.status} if include_drafts else {})})
    return out


def public_bundle(db: Session, settings: Settings) -> dict[str, list[dict]]:
    """Every kind's published items in one response (the website fetches this once instead of once per section).
    Two queries in total (all published items, then every picture they use), whatever the number of kinds or pictures: each query is a network round trip."""
    in_bundle = [k for k, v in KINDS.items() if v.get("bundle", True)]  # the solutions portfolio is large: it has its own endpoints (services/solutions_service.py)
    rows = list(db.scalars(select(ContentItem).where(ContentItem.status == "published", ContentItem.kind.in_(in_bundle)).order_by(ContentItem.sort_order, ContentItem.created_at)))
    wanted: set[uuid.UUID] = set()
    for i in rows:
        for f in KINDS[i.kind]["fields"]:
            raw = (i.data or {}).get(f["name"])
            if raw and f["type"] in ("image", "video", "document"):
                try:
                    wanted.add(uuid.UUID(raw))
                except ValueError:
                    pass
            elif raw and f["type"] == "gallery":
                wanted |= {uuid.UUID(r) for r, _ in gallery_entries(raw) if _is_uuid(r)}
    assets = {a.id: a for a in db.scalars(select(MediaAsset).where(MediaAsset.id.in_(wanted)))} if wanted else {}
    out: dict[str, list[dict]] = {kind: [] for kind in in_bundle}
    for i in rows:
        flt = KINDS[i.kind].get("public_filter")
        if flt and (((i.data or {}).get(flt[0]) == flt[1]) if len(flt) > 2 else ((i.data or {}).get(flt[0]) != flt[1])):
            continue  # e.g. a closed job opening, or a deactivated team profile
        out[i.kind].append({"id": str(i.id), "slug": i.slug, "title": i.title, "data": _resolve(db, settings, i.kind, i.data, assets=assets), "sort_order": i.sort_order})
    return out


def counts(db: Session) -> dict[str, dict[str, int]]:
    rows = db.execute(select(ContentItem.kind, ContentItem.status, func.count()).group_by(ContentItem.kind, ContentItem.status)).all()
    out: dict[str, dict[str, int]] = {k: {"draft": 0, "published": 0} for k in KINDS}
    for kind, status, n in rows:
        if kind in out:
            out[kind][status] = n
    return out
