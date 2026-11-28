"""Enquiry categories: ONE list that decides where every submitted form is shown in the admin panel (Enquiry center) and which Google Sheets worksheet it is copied to.

A website form is saved in its own table (contact_enquiries, pt_applications, demo_requests); a category is only a label derived from what the form is. Nothing here changes stored data.
The worksheet NAME of each category and whether it is copied at all are managed in the admin panel (Enquiry center > Google Sheets); the defaults below are used until then.
"""

from __future__ import annotations

# key, admin label, default worksheet name, what it holds
CATEGORIES: list[tuple[str, str, str, str]] = [
    ("general", "General Contact Enquiries", "General Enquiries", "General contact submissions"),
    ("intro", "Introductory Contact Form Enquiries", "Intro Contact Enquiries", "The contact card shown after the intro animation"),
    ("education", "Education & Training Enquiries", "Education Enquiries", "Education, training and college workshop enquiries"),
    ("course", "Course Enquiries", "Course Enquiries", "Course-specific enquiries"),
    ("internship", "Internship Enquiries", "Internship Enquiries", "Internship and career applications"),
    ("digital_marketing", "Digital Marketing Enquiries", "Digital Marketing Enquiries", "Digital Marketing service enquiries"),
    ("it_software", "IT & Software Enquiries", "IT & Software Enquiries", "Software, AI, website and app enquiries and quote requests"),
    ("franchise", "Franchise Enquiries", "Franchise Enquiries", "Franchise applications and enquiries"),
    ("authorized", "Authorized Partner Enquiries", "Authorized Partner Enquiries", "Authorized Partner applications and enquiries"),
    ("referral", "Referral Partner Enquiries", "Referral Partner Enquiries", "Referral Partner applications and enquiries"),
    ("upcoming", "Upcoming Service Enquiries", "Upcoming Services", "Interest registered in services that are not launched yet"),
    ("product", "Product & Solution Enquiries", "Product & Solution Enquiries", "Enquiries from the product and solution pages (Software & IT portfolio)"),
    ("consultation", "Consultation Requests", "Consultation Requests", "Meeting, demo and consultation requests"),
    ("other", "Other Enquiries", "Other Enquiries", "Every other website form"),
]
KEYS = [c[0] for c in CATEGORIES]
LABELS = {c[0]: c[1] for c in CATEGORIES}
DEFAULT_TABS = {c[0]: c[2] for c in CATEGORIES}
PURPOSE = {c[0]: c[3] for c in CATEGORIES}

# the enquiry types of the contact form (schemas/contact.py) and the category each one belongs to
TYPE_CATEGORY = {
    "general": "general", "quote": "general",
    "project": "it_software", "ai": "it_software", "website-app": "it_software",
    "marketing": "digital_marketing",
    "course": "course", "workshop": "education",
    "career": "other",  # a career enquiry is an internship enquiry only when it says so (see contact_category)
    "upcoming-interest": "upcoming", "product": "product",
    "partner-franchise": "franchise",
    "partner-authorised": "authorized", "partner-business": "authorized", "partner-technology": "authorized", "partner-reseller": "authorized", "partner-implementation": "authorized",
    "partnership": "other", "partner-education": "other", "partner-associate": "other", "partner-other": "other",
}
INTRO_SOURCES = {"welcome-card", "intro", "welcome"}  # the `source` the introductory contact card sends
APPLICATION_CATEGORY = {"franchise": "franchise", "authorized": "authorized", "referral": "referral"}  # pt_applications.category


def types_of(category: str) -> list[str]:
    return [t for t, c in TYPE_CATEGORY.items() if c == category]


def contact_category(enquiry_type: str, source: str | None, text: str = "") -> str:
    """The category of a contact-form enquiry. The introductory card is its own category whatever the person chose in it; a career enquiry that mentions an internship (in `text`: its subject,
    message and answers) is an Internship enquiry, any other career enquiry is an Other enquiry."""
    if (source or "").lower() in INTRO_SOURCES:
        return "intro"
    if enquiry_type == "career" and "intern" in text.lower():
        return "internship"
    return TYPE_CATEGORY.get(enquiry_type, "other")
