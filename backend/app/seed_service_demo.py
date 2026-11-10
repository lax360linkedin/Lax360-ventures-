"""Demonstration clients and testimonials for the individual service pages (`python -m app.cli seed-service-demo`).

FICTIONAL sample content, so that every service page can be reviewed with an "Our Clients" and a "Testimonials" section in place, each relevant to
that one service. None of these are real customers or real feedback: every row is flagged `is_sample` (the website labels them "Sample"), uses
placeholder logos (frontend/public/assets/clients/) and initials instead of photographs. The home page rows are not touched and these rows never
appear on the home page (they are assigned to services). Replace or delete them in the admin panel (Website content > Clients / Testimonials),
or run `python -m app.cli seed-service-demo --remove`.

Each client is assigned to the exact services it fits (not whole categories); each service lists its clients and one testimonial written for that service.
"""

from __future__ import annotations

from app.service_pages import SERVICE_PAGES

PREFIX = "svc-demo-"
L = "/assets/clients/"

# key: (name, placeholder logo, one-line description, contact person, contact role)
CLIENTS = {
    "BW": ("Brightwave Retail", L + "sample-6.svg", "Retail brand (sample).", "Sana Iqbal", "Marketing Manager"),
    "NH": ("Nimbus Health", L + "sample-3.svg", "Healthcare provider (sample).", "Latha Krishnan", "Practice Administrator"),
    "ST": ("Saffron Trails Travel", L + "demo-1.svg", "Travel company (sample).", "Anitha Raghavan", "Founder"),
    "LF": ("Lumen Fitness Studio", L + "demo-2.svg", "Fitness studio (sample).", "Lavanya Prakash", "Studio Manager"),
    "AT": ("Aurelia Textiles", L + "sample-1.svg", "Textile business (sample).", "Meera Nair", "Operations Head"),
    "HP": ("Harbor & Pine Foods", L + "sample-4.svg", "Food business (sample).", "Rajesh Pillai", "Operations Manager"),
    "CD": ("Cobalt Dental Clinics", L + "demo-3.svg", "Dental clinic group (sample).", "Gautham Rao", "Practice Manager"),
    "PO": ("Pixel Orchard Studio", L + "demo-8.svg", "Design studio (sample).", "Siddharth Nair", "Creative Director"),
    "VL": ("Vertex Logistics", L + "sample-2.svg", "Logistics company (sample).", "Arvind Kumar", "Customer Support Lead"),
    "OI": ("Orbit Insurance Services", L + "demo-4.svg", "Insurance services (sample).", "Pooja Menon", "Head of Customer Care"),
    "ML": ("Meridian Legal Advisors", L + "demo-5.svg", "Professional services (sample).", "Vikram Shah", "Managing Partner"),
    "QR": ("Quartz Realty Group", L + "demo-6.svg", "Property company (sample).", "Nisha Fernandes", "Operations Manager"),
    "KE": ("Kestrel Engineering", L + "sample-5.svg", "Engineering firm (sample).", "Karan Bhatt", "Project Lead"),
    "TF": ("Tidal Freight Co", L + "demo-7.svg", "Freight company (sample).", "Imran Siddiqui", "Director"),
}

# service key -> (clients that fit this service, the first is also the speaker of the testimonial written for it; the testimonial)
SERVICES = {
    "software/custom-software-development": ("QR KE HP AT", "They asked how our team really works before proposing anything, then built software that fits our process instead of forcing us into a template."),
    "software/website-development": ("CD PO ST NH", "Our new website is clear and quick to use, and patients can find our services and timings without calling the front desk."),
    "software/web-application-development": ("PO KE ML AT", "The web application was built in clear stages with working demos along the way, so there were no surprises at launch."),
    "software/mobile-application-development": ("LF TF CD HP", "Our members now book and manage classes from the app we built with LAX360, and the team fixed our feedback quickly after release."),
    "software/crm-and-erp-development": ("QR AT CD KE", "Our leads, follow-ups and site visits are tracked in one CRM, so nothing gets forgotten between teams."),
    "software/business-management-systems": ("KE AT QR HP", "Tasks, approvals and reports are in one place now, and managers no longer chase people for status updates."),
    "software/e-commerce-development": ("BW HP AT ST", "Our online store is easy to manage and checkout works smoothly on mobile, which is where most of our customers shop."),
    "ai/ai-application-development": ("OI VL ML KE", "They scoped one useful AI feature first and delivered it properly, rather than promising everything at once."),
    "ai/ai-chatbots-and-virtual-assistants": ("NH VL OI BW", "Our assistant answers common appointment and timing questions at any hour and passes anything sensitive to our staff."),
    "ai/ai-agent-development": ("ML VL KE OI", "The agent handles the routine research and drafting steps, and a person always reviews the result before it goes out."),
    "ai/rag-based-ai-solutions": ("ML OI VL CD", "Our team can now ask questions about our own documents and get answers that point back to the source, which makes checking easy."),
    "ai/business-process-automation": ("HP VL QR KE", "Repetitive approvals and data entry now run automatically, and the team keeps control of the exceptions."),
    "ai/workflow-automation": ("KE VL QR OI", "They mapped our workflow first and automated only the repeated steps, so the process is faster without being harder to follow."),
    "ai/ai-integration-and-consulting": ("OI VL ML NH", "The consulting session showed us where AI would genuinely help and where it would not, before we spent anything on building."),
    "growth/social-media-management": ("LF BW ST NH", "Our social channels now post on a steady schedule with a clear plan, and the monthly report is easy to follow."),
    "growth/meta-ads-management": ("ST BW LF NH", "The Meta campaigns were set up with clear targets and honest expectations, and we could see what each campaign was doing."),
    "growth/google-ads-management": ("NH BW CD ST", "Our search ads are focused on the services we actually want to grow, and the reports show what each keyword is doing."),
    "growth/search-engine-optimization-seo": ("CD NH ML BW", "They fixed the technical problems on our site first and then built content around what patients really search for."),
    "growth/website-and-landing-page-optimization": ("BW PO ST CD", "Small, tested changes to our landing pages made the enquiry journey clearer, and the reports showed us the effect."),
    "growth/content-creation": ("PO ST LF BW", "The articles and graphics matched our tone and arrived on schedule, with revisions handled quickly."),
    "growth/digital-marketing-strategy": ("ST BW NH LF", "We finally have one plan that connects the website, ads and social media, with priorities we can actually follow."),
    "headless/api-hub-development": ("TF VL KE PO", "One API layer now connects our booking, billing and tracking tools, so a new integration no longer means starting from scratch."),
    "headless/headless-backend-development": ("PO TF KE OI", "The headless backend lets us change the front end freely while the content and data stay in one reliable place."),
    "headless/multi-tenant-saas-development": ("KE TF PO ML", "Each of our customers gets a separate, secure space on the same platform, and onboarding a new one is straightforward."),
    "headless/white-label-saas-solutions": ("PO TF ML QR", "We launched under our own brand on top of LAX360's platform, which saved us from building everything from zero."),
    "headless/authentication-apis": ("OI PO ML CD", "Sign-in, password reset and roles were added cleanly, with the security basics handled properly."),
    "headless/billing-and-subscription-apis": ("LF TF PO HP", "Memberships, renewals and invoices now run from one billing service, with far fewer manual corrections."),
    "headless/payment-gateway-integration": ("HP BW TF ST", "Online payments work reliably across our apps, and refunds and reconciliation became much simpler for our accounts team."),
    "headless/booking-and-appointment-apis": ("CD NH ST LF", "Our website, app and front desk all use the same booking service, so double bookings have stopped."),
    "headless/crm-apis": ("QR CD OI KE", "Our forms and tools now send leads straight into the CRM through the API, without anyone copying data by hand."),
    "headless/notification-apis": ("NH TF QR OI", "Appointment reminders and updates go out by the right channel at the right time, and patients appreciate them."),
    "headless/file-and-media-apis": ("PO ML TF CD", "Uploads, storage and delivery of images and documents are handled in one place, and it stays fast for our users."),
    "headless/ai-apis": ("VL OI ML KE", "The AI endpoints plug into our existing systems cleanly, so we added intelligent features without rebuilding anything."),
    "automation/n8n-workflow-automation": ("KE VL QR HP", "Our n8n workflows connect the tools we already use, and the team can follow what each step does."),
    "automation/business-process-automation": ("HP VL KE QR", "Invoices, approvals and follow-ups now move on their own, and the team only handles what needs a decision."),
    "automation/whatsapp-automation": ("QR HP NH CD", "Enquiries on WhatsApp get an instant, accurate first reply, and our team takes over when a person is needed."),
    "automation/email-automation": ("OI LF ML HP", "Follow-up emails and reminders now go out automatically and on time, in our own wording."),
    "automation/crm-automation": ("CD QR OI KE", "New enquiries are logged, assigned and followed up automatically, so no patient enquiry is left waiting."),
    "automation/ai-agent-workflows": ("ML VL KE OI", "The workflow lets an AI agent prepare the routine work, and a person approves every important step."),
    "automation/third-party-application-integration": ("TF VL QR HP", "Our accounting, tracking and messaging tools now share data automatically instead of through manual exports."),
    "automation/webhook-integration": ("KE VL TF QR", "Events in one system now trigger the right actions in the others straight away, and failures are easy to trace."),
    "mobile/appointment-booking-applications": ("NH CD LF ST", "Patients book, change and cancel from their phones, and our reception can see the whole day at a glance."),
    "mobile/field-staff-and-task-tracking-applications": ("KE TF VL QR", "Site teams receive tasks and report progress from their phones, and the office sees the status without phone calls."),
    "mobile/employee-location-tracking-applications": ("TF VL KE QR", "We can see where our field team is during working hours, with the privacy rules clearly agreed with staff."),
    "mobile/business-billing-applications": ("HP BW LF TF", "Billing is quick at the counter and on the go, and the daily totals match without extra work."),
    "mobile/inventory-management-applications": ("BW HP AT TF", "Stock counts and reorders are on our phones now, and we notice shortages before they hurt sales."),
    "mobile/custom-business-mobile-applications": ("QR TF CD LF", "They built an app around how our team really works, not a generic template, and rolling it out to staff was simple."),
}

# The home page's sample testimonials, reused (same wording) on the service pages they genuinely fit.
HOME_FIT = {
    "software/custom-software-development": "AT", "software/crm-and-erp-development": "AT", "software/business-management-systems": "AT",
    "ai/ai-chatbots-and-virtual-assistants": "VL", "growth/digital-marketing-strategy": "BW", "growth/social-media-management": "BW",
}
HOME_TESTIMONIALS = {
    "AT": "LAX360 took our scattered order and billing sheets and turned them into one simple system. They listened first, suggested only what we needed, and delivered on the date they promised.",
    "VL": "The AI assistant answers our routine delivery questions from approved information and hands over to a person when needed. Our team now spends its time on the cases that really need them.",
    "BW": "Their digital marketing plan was clear and honest about what to expect. Reporting was easy to follow, and the website and campaigns finally worked together.",
}
# A second, service-flavoured line for pages with no matching home testimonial: spoken by the second client of that page.
CATEGORY_SECOND = {
    "software": "The team communicated clearly through the {s} work and delivered what we had agreed.",
    "ai": "They were straightforward about what {s} can and cannot do, and the result was practical.",
    "growth": "Clear reporting and honest expectations made {s} easy to work with.",
    "headless": "The {s} work was well documented and easy for our own developers to build on.",
    "automation": "The team understood our process first, then set up {s} around it.",
    "mobile": "From prototype to release, the team kept us informed on our {s} project.",
}


_KEEP = {"ai": "AI", "api": "API", "apis": "APIs", "crm": "CRM", "erp": "ERP", "rag": "RAG", "seo": "SEO", "saas": "SaaS", "n8n": "n8n", "whatsapp": "WhatsApp", "meta": "Meta", "google": "Google"}


def _phrase(name: str) -> str:
    """A service name in the middle of a sentence: lower case, without the bracketed part, keeping acronyms and brands."""
    import re

    plain = re.sub(r"\s*\(.*?\)", "", name)
    return " ".join(_KEEP.get(w.lower(), w.lower()) for w in plain.split()).replace("rag-based", "RAG-based")


def _names() -> dict[str, str]:
    return {value: _phrase(label.split(" — ", 1)[1]) for value, label in SERVICE_PAGES}


def client_rows() -> list[dict]:
    rows = []
    for n, (key, (name, logo, desc, _person, _role)) in enumerate(CLIENTS.items(), start=1):
        fits = [svc for svc, (clients, _q) in SERVICES.items() if key in clients.split()]
        rows.append({"slug": f"{PREFIX}c-{n}", "title": name, "sort_order": n * 10, "data": {"logo_url": logo, "description": desc, "services": ",".join(fits), "hide_on_home": True, "is_sample": True}})
    return rows


def testimonial_rows() -> list[dict]:
    rows = []
    names = _names()
    for n, (svc, (clients, quote)) in enumerate(SERVICES.items()):
        order = clients.split()
        first = CLIENTS[order[0]]
        rows.append({"slug": f"{PREFIX}t-{n}-b", "title": first[3], "sort_order": n * 10 + 1,
                     "data": {"person_type": "client", "role": first[4], "organization": f"{first[0]} (sample)", "quote": quote, "service": svc, "rating": "5" if n % 3 else "4", "hide_on_home": True, "is_sample": True}})
        home = HOME_FIT.get(svc)
        if home:
            c = CLIENTS[home]
            text, who = HOME_TESTIMONIALS[home], c
        else:
            who = CLIENTS[order[1]]
            text = CATEGORY_SECOND[svc.split("/")[0]].format(s=names[svc])
        rows.append({"slug": f"{PREFIX}t-{n}-a", "title": who[3], "sort_order": n * 10 + 2,
                     "data": {"person_type": "client", "role": who[4], "organization": f"{who[0]} (sample)", "quote": text, "service": svc, "hide_on_home": True, "is_sample": True}})
    return rows
