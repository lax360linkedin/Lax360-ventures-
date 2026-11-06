"""CMS content. `KINDS` is the registry of everything an administrator can manage: it drives the admin forms, the validation, the per-module
permissions and what the public website may read. Items are stored in `content_items` (kind, slug, title, data, status, sort_order):
- `status` is the publishing workflow: a draft is private (never returned by the public API), a published item is live;
- `sort_order` is the display order;
- fields of type `image` / `video` hold the id of a media-library item (never a URL or a file), resolved to a URL only on the way out.
"""

from __future__ import annotations

import datetime
import re
import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import ApiError
from app.models import ContentItem, MediaAsset, User
from app.services import media_service

_LINK = re.compile(r"^https?://[^\s]+$")
_LINK_FIELDS = ("link", "cta_link", "apply_link", "cta_primary_link", "cta_secondary_link")


def F(name, label, kind="text", required=False, max_len=300, options=None, help="", options_from=None, default=None):
    return {"name": name, "label": label, "type": kind, "required": required, "max": max_len, "options": options or [], "help": help, "options_from": options_from, "default": default}


DIVISIONS = [{"value": v, "label": l} for v, l in (("software", "Software & IT Services"), ("ai", "AI & Business Automation"), ("growth", "Digital Marketing"), ("headless", "Headless SaaS & API Solutions"), ("automation", "Workflow Automation & Integration"), ("mobile", "Mobile & Business Applications"))]
SECTION_KEYS = [{"value": v, "label": l} for v, l in (
    ("marquee", "Scrolling strip under the hero"), ("whoweare", "Who We Are"), ("services", "Services overview"), ("outcomes", "Why Choose Us"), ("clients", "Our Clients"), ("testimonials", "Client & student testimonials"),
    ("process", "How we work"),
    ("faq", "FAQ"), ("contact", "Contact call-to-action"))]
ABOUT_SECTIONS = [{"value": v, "label": l} for v, l in (
    ("story", "Our story"), ("motto", "Our motto"), ("purpose", "Mission & vision"), ("expertise", "Core expertise"), ("features", "Our features"),
    ("values", "Our values"), ("technology", "Our approach to technology"), ("cta", "Final call to action"))]
PAGES = [{"value": v, "label": l} for v, l in (("home", "Home"), ("about", "About"), ("services", "Services"), ("industries", "Industries"), ("insights", "Insights"), ("network", "Our Network"), ("team", "Our Team"),
                                              ("products", "Products"), ("work", "Work"), ("career", "Career"), ("contact", "Contact"))]
PRODUCT_CATEGORIES = [{"value": v, "label": l} for v, l in (("business", "Business Management"), ("industry", "Industry Solutions"), ("education", "Education & Learning"), ("developer", "Developer Solutions"),
                                                           ("workforce", "Workforce Management"), ("booking", "Booking & Scheduling"), ("productivity", "Productivity & Collaboration"), ("automation", "Automation & Integration"))]
PRODUCT_STATUSES = [{"value": v, "label": l} for v, l in (("live", "Live — available for customers"), ("beta", "Beta — available for testing or limited access"), ("in_development", "In Development"), ("soon", "Coming Soon"))]
INDUSTRY_GROUPS = [{"value": v, "label": l} for v, l in (("health", "Health, Education & Wellness"), ("commerce", "Commerce, Hospitality & Travel"), ("finance", "Finance, Property & Professional Services"),
                                                         ("industry", "Industry, Infrastructure & Utilities"))]
NETWORK_CATEGORIES = [{"value": v, "label": l} for v, l in (
    ("group", "LAX360 Group Companies"), ("authorized", "Authorized Partners"), ("technology", "Technology Partners"), ("associated", "Associated Companies"), ("collaboration", "Strategic Collaborations"),
    ("education", "Education & Academic Network"), ("associate", "Business Associates"), ("reseller", "Reseller & Distribution Partners"), ("implementation", "Implementation Partners"),
    ("startup", "Startup & Innovation Ecosystem"), ("industry", "Industry Collaborations"), ("professional", "Professional Network"))]
NETWORK_RELATIONSHIPS = [{"value": v, "label": l} for v, l in (
    ("group_company", "Group company of LAX360 Ventures"), ("operated", "Operated by LAX360 Ventures"), ("associated", "Associated company (separate business)"), ("authorized", "Authorized partner"),
    ("technology_provider", "Technology provider"), ("reseller", "Reseller / distribution partner"), ("associate", "Business associate"), ("implementation", "Implementation partner"),
    ("collaboration", "Strategic collaboration"), ("other", "Other"))]
SOFTWARE_CATEGORIES = [{"value": v, "label": l} for v, l in (
    ("crm_erp", "CRM & ERP"), ("accounting", "Accounting & Billing"), ("hr", "HR & Payroll"), ("productivity", "Business Productivity"), ("ai", "AI Platforms & Subscriptions"),
    ("cloud", "Cloud & Business Applications"), ("other", "Other"))]
SOFTWARE_OWNERSHIP = [{"value": v, "label": l} for v, l in (("lax360", "Developed by LAX360"), ("third_party", "Third-party partner product"), ("resold", "Resold / distributed software"), ("integrated", "Integrated technology solution"))]
TEAM_GROUPS = [{"value": v, "label": l} for v, l in (("leadership", "Founder & Leadership"), ("management", "Management Team"), ("heads", "Department Heads"), ("software", "Software Development Team"),
                                                    ("ai", "AI & Automation Team"), ("marketing", "Digital Marketing Team"))]
TEAM_LEADERSHIP_ROLES = [{"value": v, "label": l} for v, l in (("managing_director", "Managing Director"), ("founder", "Founder / Co-Founder"), ("technical_director", "Technical Director"), ("department_head", "Department Head"), ("leadership", "Other leadership"))]
TEAM_DEPARTMENTS = [{"value": v, "label": l} for v, l in (("software-development", "Software Development"), ("ai-automation", "AI & Automation"), ("digital-marketing", "Digital Marketing"), ("business-operations", "Business & Operations"))]
TEAM_GALLERY_CATEGORIES = [{"value": v, "label": l} for v, l in (("activities", "Team activities"), ("office", "Office environment"), ("celebrations", "Team celebrations"), ("workshops", "Technical workshops"),
                                                                ("knowledge", "Knowledge-sharing sessions"), ("learning", "Learning & development"), ("achievements", "Employee achievements"))]
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
            F("eyebrow", "Small label above the title", max_len=90), F("headline_1", "Headline line 1", max_len=80), F("headline_2", "Headline line 2 (highlighted)", max_len=80),
            F("headline_3", "Headline line 3", max_len=80), F("lead", "Supporting paragraph", "textarea", max_len=400),
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
        "help": "The groups your services are listed under (for example Software & IT Services, AI & Automation, Digital Marketing, Training). Add, rename or remove them freely.",
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
    # ---- About ----------------------------------------------------------------------------------------------------------------------
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
        "help": "The industries LAX360 Ventures builds technology for. Each published industry appears on the Industries page and gets its own details page (/industries/<name>). "
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
            F("services", "Related LAX360 services", "textarea", max_len=500, help="One service category per line: software, ai, growth, headless, automation, mobile"),
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
        "label": "Network companies & partners", "group": "Network", "module": "content", "single": False, "preview_path": "/our-network",
        "help": "Companies in the LAX360 Ventures network. New entries start as drafts: check the company's identity, website and the exact relationship, set Verification, then publish. "
                "A partnership designation (for example \"Authorized Partner\") is shown publicly only when Verification is \"Verified\" and the expiry date has not passed. "
                "Never describe another company as owned by LAX360 unless that is verified.",
        "title_label": "Company name",
        "fields": [
            F("category", "Network category", "select", True, options=NETWORK_CATEGORIES, options_from="network_category"),
            F("relationship", "Relationship type", "select", False, options=NETWORK_RELATIONSHIPS),
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
            F("logo", "Official logo (optional)", "image", help="Only a logo you are permitted to use. Do not edit or redraw a company's logo."),
        ],
    },
    "software_product": {
        "label": "Software distribution", "group": "Network", "module": "content", "single": False, "preview_path": "/our-network",
        "help": "Software LAX360 helps customers choose, buy, implement and use. Link each product to its real vendor and state clearly whether it is third-party, resold, integrated or developed by LAX360. "
                "Do not present third-party software as LAX360's own.",
        "title_label": "Product name",
        "fields": [
            F("vendor", "Vendor (network company)", "select", False, options_from="network_partner"),
            F("software_category", "Software category", "select", True, options=SOFTWARE_CATEGORIES),
            F("ownership", "Type", "select", True, options=SOFTWARE_OWNERSHIP, default="third_party"),
            F("description", "Description", "textarea", True, max_len=500, help="What the vendor's product is, in neutral terms."),
            F("product_link", "Vendor product page (optional)", max_len=300), F("cta_link", "Enquiry link (optional)", max_len=300, help="e.g. /contact?type=project"),
        ],
    },
    # ---- Our Team -------------------------------------------------------------------------------------------------------------------
    "team_member": {
        "label": "Team members", "group": "Team", "module": "content", "single": False, "preview_path": "/our-team",
        "help": "The people behind LAX360 Ventures. Choose the team each person belongs to; use the order number to arrange people within a team. Publish to show a profile, unpublish to hide it.",
        "title_label": "Name", "public_filter": ("active", False, "exclude"),
        "fields": [
            F("leadership_role", "Leadership role", "select", False, options=TEAM_LEADERSHIP_ROLES, help="Set this to show the person in the Leadership section. Leave empty for a regular team member."),
            F("department", "Department", "select", False, options=TEAM_DEPARTMENTS, options_from="team_department", help="The four standard departments, plus any you add under Team > Departments."),
            F("group", "Team group (optional)", "select", False, options=TEAM_GROUPS, help="Older grouping, kept for existing profiles."),
            F("designation", "Designation", "text", True, max_len=120),
            F("bio", "Short biography", "textarea", max_len=800),
            F("expertise", "Skills & areas of expertise", "textarea", max_len=400, help="Comma-separated, e.g. React, FastAPI, SEO."),
            F("photo", "Photo", "image"), F("photo_alt", "Photo description", max_len=160, help="Short description for screen readers."),
            F("linkedin_link", "LinkedIn profile (optional)", max_len=300, help="The person's full LinkedIn address, e.g. https://www.linkedin.com/in/name"),
            F("twitter_link", "X (Twitter) profile (optional)", max_len=300), F("github_link", "GitHub profile (optional)", max_len=300), F("instagram_link", "Instagram profile (optional)", max_len=300),
            F("featured", "Featured profile", "bool", default=False, help="Featured people are shown first in the team directory."),
            F("reports_to", "Reporting role", max_len=120, help="Who this person reports to, e.g. Head of Software Development."),
            F("demo", "Demonstration profile (fictional)", "bool", default=False, help="Marks sample content. It is labelled “Demonstration profile” on the website. Replace it with real details, then untick this."),
            F("active", "Active", "bool", default=True, help="Untick to hide the profile from the website without deleting it."),
        ],
    },
    "team_department": {
        "label": "Team departments", "group": "Team", "module": "content", "single": False, "preview_path": "/our-team#departments",
        "help": "The departments shown on the Our Team page. Add the roles that exist in each one; team members are linked to a department from their own profile.",
        "title_label": "Department name",
        "fields": [
            F("description", "Description", "textarea", True, max_len=500, help="Short text for the department card."),
            F("overview", "Overview (department page)", "textarea", max_len=1500, help="A longer introduction. A blank line starts a new paragraph."),
            F("roles", "Roles in this department", "textarea", max_len=800, help="One role per line, e.g. Frontend Developers."),
            F("responsibilities", "Responsibilities", "textarea", max_len=1200, help="One responsibility per line."),
            F("expertise", "Key areas of expertise", "textarea", max_len=600, help="Comma-separated."),
            F("demo", "Demonstration content (fictional)", "bool", default=False, help="Marks sample content; it is labelled on the website."),
            F("image", "Department image", "image"), F("image_alt", "Image description", max_len=160),
        ],
    },
    "team_gallery": {
        "label": "Team & culture gallery", "group": "Team", "module": "content", "single": False, "preview_path": "/our-team#culture",
        "help": "Genuine LAX360 photographs only (team activities, office, celebrations, workshops, learning, achievements). Nothing is shown until you publish photos.",
        "title_label": "Caption",
        "fields": [
            F("category", "Category", "select", True, options=TEAM_GALLERY_CATEGORIES), F("image", "Photograph", "image", True),
            F("image_alt", "Photo description", max_len=160, help="Short description for screen readers."), F("description", "Details (optional)", "textarea", max_len=300),
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
        "help": "The hero and the section headings of the Our Team page. Leave a field empty to keep the built-in text.",
        "fields": [
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
        ],
    },
    # ---- Clients --------------------------------------------------------------------------------------------------------------------
    "client": {
        "label": "Our clients", "group": "Clients", "module": "content", "single": False, "preview_path": "/",
        "help": "Genuine clients only, with their permission to be shown. Published clients appear in the \"Our Clients\" strip on the home page, in this order (use the order number to arrange them). "
                "Entries marked as samples are placeholders: edit or delete them once you have real clients. With none published, the section is hidden.",
        "title_label": "Company name",
        "fields": [
            F("logo", "Logo", "image", help="Use the client's real logo. It is shown at its original proportions."),
            F("website_link", "Website (optional)", max_len=300, help="The client's own website, full https:// address"),
            F("is_sample", "Sample entry (placeholder, not a real client)", "bool", default=False, help="Tick only for placeholders. Replace a sample by editing it (upload a real logo, rename it, untick this) or delete it."),
            F("logo_url", "Built-in sample logo (leave empty for real clients)", max_len=120, help="Path of artwork shipped with the website, used only when no logo is uploaded above."),
        ],
    },
    # ---- Testimonials ---------------------------------------------------------------------------------------------------------------
    "testimonial": {
        "label": "Client & student testimonials", "group": "Testimonials", "module": "content", "single": False, "preview_path": "/",
        "help": "Real feedback only, shown with the person's permission. Published testimonials appear one at a time in \"What Our Clients & Students Say\" on the home page, in this order "
                "(use the order number to arrange them). Entries marked as samples are fictional placeholders shown with a \"Sample\" label: edit or delete them once you have real feedback. "
                "With none published, the section is hidden.",
        "title_label": "Person's name",
        "fields": [
            F("person_type", "Client or student", "select", True, options=[{"value": "client", "label": "Client"}, {"value": "student", "label": "Student"}]),
            F("role", "Designation / role", "text", True, max_len=120, help="e.g. Operations Manager, or B.E. student"),
            F("organization", "Company or institution", max_len=160),
            F("quote", "Testimonial", "textarea", True, max_len=700),
            F("photo", "Profile photo (optional)", "image", help="A square photo works best. Without one, the person's initials are shown."),
            F("is_sample", "Sample (fictional placeholder, not real feedback)", "bool", default=False, help="Untick once you replace the content with real feedback."),
        ],
    },
    # ---- Portfolio ------------------------------------------------------------------------------------------------------------------
    "project": {
        "label": "Projects & solutions", "group": "Portfolio", "module": "content", "single": False, "preview_path": "/work",
        "help": "Publish only client-approved work with verified details. When at least one project is published, the Work page shows projects instead of the illustrative concepts.",
        "fields": [
            F("division", "Division", "select", True, options=DIVISIONS),
            F("category", "Category / tags", max_len=120),
            F("client_type", "Client type", max_len=120, help="e.g. 'Manufacturing company' (do not name a client without permission)"),
            F("summary", "Summary", "textarea", True, max_len=600),
            F("image", "Project image", "image"), F("video", "Project video", "video"),
            F("link", "Case study link (optional)", max_len=300),
        ],
        "title_label": "Project title",
    },
    # ---- Products -------------------------------------------------------------------------------------------------------------------
    "product": {
        "label": "Products", "group": "Products", "module": "content", "single": False, "preview_path": "/products",
        "help": "LAX360's own software products and SaaS platforms (never third-party products). Each published product appears on the Products page and gets its own details page. "
                "When at least one product is published, these replace the built-in list. Add screenshots of the real product, and keep the status accurate: the demo and access buttons only appear for Live and Beta products.",
        "title_label": "Product name",
        "fields": [
            F("category", "Category", "select", True, options=PRODUCT_CATEGORIES),
            F("status", "Availability", "select", True, options=PRODUCT_STATUSES, default="soon"),
            F("summary", "Short description (card text)", "textarea", True, max_len=300),
            F("overview", "Overview", "textarea", max_len=4000, help="Plain paragraphs. A blank line starts a new paragraph."),
            F("problems", "Business problems addressed", "textarea", max_len=2000, help="One problem per line."),
            F("features", "Key features and modules", "textarea", max_len=3000, help="One feature per line. Optional: write \"Title: description\"."),
            F("benefits", "Benefits", "textarea", max_len=2000, help="One benefit per line."),
            F("use_cases", "Use cases", "textarea", max_len=2000, help="One use case per line."),
            F("users", "Target users", "textarea", max_len=1000, help="One group per line, e.g. Startups."),
            F("industries", "Industries", "textarea", max_len=1000, help="One industry per line."),
            F("logo", "Logo", "image"), F("image", "Cover image", "image"),
            F("screenshot_1", "Screenshot 1", "image"), F("screenshot_2", "Screenshot 2", "image"), F("screenshot_3", "Screenshot 3", "image"), F("screenshot_4", "Screenshot 4", "image"),
            F("product_link", "Product / access link", max_len=300, help="Where visitors open or sign up for the product (https:// URL or a page like /contact)."),
            F("demo_link", "Demo link", max_len=300, help="Optional: a demo or documentation page."),
            F("cta_label", "Main button text", max_len=40, help="Defaults to \"Enquire about this product\"."),
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
            F("description", "Job description", "textarea", True, max_len=4000),
            F("requirements", "Requirements", "textarea", max_len=3000, help="One requirement per line."),
            F("eligibility", "Eligibility / qualifications", "textarea", max_len=1500),
            F("apply_link", "How to apply (link or mailto:)", max_len=300, help="Leave empty to send applicants to the contact form."),
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
    "seo_page": {
        "label": "Page titles & SEO", "group": "Navigation & SEO", "module": "navigation", "single": False, "slug_field": "page", "preview_path": "/",
        "help": "The browser/search title and description for a page. Leave a page unlisted to keep its built-in text.",
        "title_label": "Page title (search results & browser tab)",
        "fields": [F("page", "Page", "select", True, options=PAGES), F("meta_description", "Meta description", "textarea", max_len=320), F("image", "Social sharing image", "image")],
    },
}
GROUP_ORDER = ["Homepage", "Services", "Industries", "Insights", "Network", "Team", "Clients", "Testimonials", "About", "Portfolio", "Careers", "Navigation & SEO"]


def kinds_for_ui(db: Session, user=None) -> list[dict]:
    from app.core.permissions import has_permission

    out = []
    dynamic: dict[str, list[dict]] = {}
    for kind, spec in KINDS.items():
        if user is not None and not has_permission(user, spec["module"]):
            continue
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


def _validate(db: Session, kind: str, title: str, data: dict) -> tuple[str, dict]:
    spec = KINDS[kind]
    errors: dict[str, str] = {}
    title = " ".join((title or "").split())
    if not spec["single"] and not title:
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
        elif kind_t in ("image", "video") and value:
            try:
                asset = db.get(MediaAsset, uuid.UUID(value))
            except ValueError:
                asset = None
            if asset is None or asset.kind != kind_t:
                errors[name] = f"Choose {'an image' if kind_t == 'image' else 'a video'} from the media library."
        elif kind_t == "select" and value and value not in _options(db, f):
            errors[name] = "Choose one of the listed options."
        elif name == "logo_url":
            if value and not re.match(r"^/assets/clients/[A-Za-z0-9._-]+\.(svg|png|webp)$", value):
                errors[name] = "Leave this empty, or use a built-in artwork path such as /assets/clients/sample-1.svg"
        elif name == "website_link":
            if value and not re.match(r"^https?://[^\s]{3,300}$", value):
                errors[name] = "Enter the company's full website address starting with https://"
        elif name == "linkedin_link":
            if value and not re.match(r"^https://([a-z0-9-]+\.)?linkedin\.com/[^\s]+$", value, re.I):
                errors[name] = "Enter the full LinkedIn address starting with https://www.linkedin.com/"
        elif name == "published_on":
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


def _media_ids(kind: str, data: dict) -> set[uuid.UUID]:
    ids = set()
    for f in KINDS[kind]["fields"]:
        if f["type"] in ("image", "video") and data.get(f["name"]):
            ids.add(uuid.UUID(data[f["name"]]))
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


def create(db: Session, user: User, kind: str, *, title: str, data: dict, status: str, sort_order: int) -> ContentItem:
    spec = get_kind(kind)
    title, clean = _validate(db, kind, title, data)
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


def _resolve(db: Session, settings: Settings, kind: str, data: dict, preview: bool = False) -> dict:
    """Replace media ids with the URL a browser can load (None when the file is gone or not public, so a deleted file never breaks a page)."""
    out = dict(data or {})
    for f in KINDS[kind]["fields"]:
        if f["type"] in ("image", "video") and out.get(f["name"]):
            try:
                asset = db.get(MediaAsset, uuid.UUID(out[f["name"]]))
            except ValueError:
                asset = None
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
    """Every kind's published items in one response (the website fetches this once instead of once per section)."""
    return {kind: public_items(db, settings, kind) for kind in KINDS}


def counts(db: Session) -> dict[str, dict[str, int]]:
    rows = db.execute(select(ContentItem.kind, ContentItem.status, func.count()).group_by(ContentItem.kind, ContentItem.status)).all()
    out: dict[str, dict[str, int]] = {k: {"draft": 0, "published": 0} for k in KINDS}
    for kind, status, n in rows:
        if kind in out:
            out[kind][status] = n
    return out
