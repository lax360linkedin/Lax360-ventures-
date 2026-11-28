"""The choices on the Contact / enquiry form (single source of truth: the website reads them from /api/public/contact-options, the API validates against them).

Services: twelve main services, each with sub-services taken from the real individual service pages (`SERVICE_PAGES`: ids are "<category>/<service>").
"""

from __future__ import annotations

from app.service_pages import SERVICE_PAGES

_label = {value: label.split(" — ", 1)[1] for value, label in SERVICE_PAGES}


def _subs(*ids: str) -> list[dict]:
    return [{"value": i, "label": _label[i]} for i in ids]


def _prefix(prefix: str) -> list[str]:
    return [v for v, _ in SERVICE_PAGES if v.startswith(prefix)]


def _prefix_subs(prefix: str) -> list[dict]:
    return _subs(*_prefix(prefix))


def _sw(*slugs: str) -> list[dict]:
    return _subs(*[f"software/{x}" for x in slugs])


# The sub-services that sit under Software & IT Services (the earlier Headless SaaS & API, Workflow Automation and Mobile & Business Applications categories are parts of it now).
_HEADLESS = ("api-hub-development", "headless-backend-development", "multi-tenant-saas-development", "white-label-saas-solutions", "authentication-apis", "billing-and-subscription-apis",
             "payment-gateway-integration", "booking-and-appointment-apis", "crm-apis", "notification-apis", "file-and-media-apis", "ai-apis")
_AUTOMATION = ("n8n-workflow-automation", "business-process-automation", "whatsapp-automation", "email-automation", "crm-automation", "ai-agent-workflows", "third-party-application-integration", "webhook-integration")
_MOBILE = ("appointment-booking-applications", "field-staff-and-task-tracking-applications", "employee-location-tracking-applications", "business-billing-applications",
           "inventory-management-applications", "custom-business-mobile-applications")

SERVICE_MAINS = [
    {"value": "software-development", "label": "Software Development", "subs": _sw("custom-software-development", "web-application-development", "business-management-systems", "enterprise-software-solutions",
                                                                                  "it-consulting-and-technology-solutions", "software-maintenance-and-support")},
    {"value": "website-development", "label": "Website Development", "subs": _sw("website-development", "e-commerce-development")},
    {"value": "mobile-app-development", "label": "Mobile Application Development", "subs": _sw("mobile-application-development", *_MOBILE)},
    {"value": "ai-solutions", "label": "AI Workflow Automations & Integrations", "subs": _sw("ai-workflow-automations-and-integrations", "ai-agent-workflows", "third-party-software-integrations", "ai-apis")},
    {"value": "ai-agents-automation", "label": "Workflow & Business Automation", "subs": _sw(*[x for x in _AUTOMATION if x != "ai-agent-workflows"])},
    {"value": "crm-erp", "label": "ERP & CRM Solutions", "subs": _sw("crm-and-erp-development", "crm-apis", "crm-automation")},
    {"value": "saas-development", "label": "SaaS & Headless API Solutions", "subs": _sw("saas-product-development", "headless-saas-and-api-solutions", *[x for x in _HEADLESS if x not in ("ai-apis", "crm-apis")])},
    {"value": "digital-marketing", "label": "Digital Marketing", "subs": _subs("growth/social-media-management", "growth/creatives", "growth/content-publishing")},
    {"value": "seo", "label": "SEO Services", "subs": _subs("growth/search-engine-optimization-seo")},
    {"value": "paid-ads", "label": "Paid Advertising", "subs": _subs("growth/paid-advertising")},
    {"value": "education-training", "label": "Education & Training", "subs": _prefix_subs("education/")},
    {"value": "other", "label": "Other Services", "subs": []},
]

# Sub-service ids are unique per main service in this list except where one real service serves two mains (e.g. automation/crm-automation): that is intended.
OPTIONS = {
    "contact_methods": [("email", "Email"), ("phone", "Phone call"), ("whatsapp", "WhatsApp")],
    "industries": [(v, v) for v in ("Education & Training", "Healthcare", "Retail & E-commerce", "Manufacturing", "Logistics & Transport", "Real Estate & Construction", "Finance & Insurance",
                                    "Hospitality & Travel", "Professional Services", "Food & Beverage", "IT & Software", "Media & Marketing", "Non-profit", "Other")],
    "company_sizes": [(v, v) for v in ("Just me", "2–10 people", "11–50 people", "51–200 people", "201–1000 people", "More than 1000 people")],
    "business_types": [("startup", "Startup"), ("small", "Small Business"), ("medium", "Medium Business"), ("enterprise", "Enterprise"), ("individual", "Individual")],
    "budgets": [(v, v) for v in ("Not decided yet", "Under ₹50,000", "₹50,000 – ₹2,00,000", "₹2,00,000 – ₹5,00,000", "₹5,00,000 – ₹10,00,000", "Above ₹10,00,000")],
    "timelines": [(v, v) for v in ("As soon as possible", "Within 1 month", "1–3 months", "3–6 months", "More than 6 months", "Not sure yet")],
    "referrals": [(v, v) for v in ("Google search", "Social media", "Friend or colleague", "LinkedIn", "Event or workshop", "Advertisement", "Existing client", "Other")],
    "meeting_types": [("online", "Online (video call)"), ("in-person", "In-person")],
}

MAX_FILES = 3
MAX_FILE_BYTES = 5 * 1024 * 1024
FILE_TYPES = ("application/pdf", "image/png", "image/jpeg", "image/webp")


def public_options() -> dict:
    out = {k: [{"value": v, "label": l} for v, l in vals] for k, vals in OPTIONS.items()}
    out["services"] = SERVICE_MAINS
    out["limits"] = {"files": MAX_FILES, "file_bytes": MAX_FILE_BYTES, "file_types": list(FILE_TYPES)}
    return out


_SINGLE = {"contact_method": "contact_methods", "industry": "industries", "company_size": "company_sizes", "business_type": "business_types", "budget": "budgets",
           "timeline": "timelines", "referral": "referrals", "meeting_type": "meeting_types"}
LONG_TEXT = ("project_description", "challenges", "expected_solution", "additional_requirements")
SHORT_TEXT = ("designation", "whatsapp", "website", "location", "project_name", "start_date", "meeting_time")


def validate_lead(extra: dict[str, str]) -> dict[str, str]:
    """Errors (field -> message) for the structured answers of the enquiry form. Unknown keys are left alone (older forms send their own)."""
    errors: dict[str, str] = {}
    for key, group in _SINGLE.items():
        value = extra.get(key)
        if value and value not in {v for v, _ in OPTIONS[group]}:
            errors[key] = "Choose one of the listed options."
    mains = [m for m in (extra.get("service_mains") or "").split(",") if m]
    known = {m["value"]: m for m in SERVICE_MAINS}
    if any(m not in known for m in mains):
        errors["service_mains"] = "Choose services from the list."
    else:
        allowed = {s["value"] for m in mains for s in known[m]["subs"]}
        if any(s and s not in allowed for s in (extra.get("service_subs") or "").split(",")):
            errors["service_subs"] = "Choose sub-services that belong to the selected services."
    for key in ("website",):
        value = extra.get(key)
        if value and not (value.startswith("https://") or value.startswith("http://")):
            errors[key] = "Enter the full website address, starting with https://"
    return errors
