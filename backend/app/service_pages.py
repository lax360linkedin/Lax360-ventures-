"""Every individual service page, as (category/service slug, label). Used by the admin panel to assign a testimonial to a service page.
Generated from frontend/src/data/services.js: if services are added or renamed there, update this list.
"""

SERVICE_PAGES = (
    ("software/custom-software-development", "Software & IT Services — Custom Software Development"),
    ("software/website-development", "Software & IT Services — Website Development"),
    ("software/web-application-development", "Software & IT Services — Web Application Development"),
    ("software/mobile-application-development", "Software & IT Services — Mobile Application Development"),
    ("software/crm-and-erp-development", "Software & IT Services — CRM & ERP Development"),
    ("software/business-management-systems", "Software & IT Services — Business Management Systems"),
    ("software/e-commerce-development", "Software & IT Services — E-commerce Development"),
    ("ai/ai-application-development", "AI & Business Automation — AI Application Development"),
    ("ai/ai-chatbots-and-virtual-assistants", "AI & Business Automation — AI Chatbots & Virtual Assistants"),
    ("ai/ai-agent-development", "AI & Business Automation — AI Agent Development"),
    ("ai/rag-based-ai-solutions", "AI & Business Automation — RAG-Based AI Solutions"),
    ("ai/business-process-automation", "AI & Business Automation — Business Process Automation"),
    ("ai/workflow-automation", "AI & Business Automation — Workflow Automation"),
    ("ai/ai-integration-and-consulting", "AI & Business Automation — AI Integration & Consulting"),
    ("growth/social-media-management", "Digital Marketing — Social Media Management"),
    ("growth/meta-ads-management", "Digital Marketing — Meta Ads Management"),
    ("growth/google-ads-management", "Digital Marketing — Google Ads Management"),
    ("growth/search-engine-optimization-seo", "Digital Marketing — Search Engine Optimization (SEO)"),
    ("growth/website-and-landing-page-optimization", "Digital Marketing — Website & Landing Page Optimization"),
    ("growth/content-creation", "Digital Marketing — Content Creation"),
    ("growth/digital-marketing-strategy", "Digital Marketing — Digital Marketing Strategy"),
    ("headless/api-hub-development", "Headless SaaS & API Solutions — API Hub Development"),
    ("headless/headless-backend-development", "Headless SaaS & API Solutions — Headless Backend Development"),
    ("headless/multi-tenant-saas-development", "Headless SaaS & API Solutions — Multi-Tenant SaaS Development"),
    ("headless/white-label-saas-solutions", "Headless SaaS & API Solutions — White-Label SaaS Solutions"),
    ("headless/authentication-apis", "Headless SaaS & API Solutions — Authentication APIs"),
    ("headless/billing-and-subscription-apis", "Headless SaaS & API Solutions — Billing & Subscription APIs"),
    ("headless/payment-gateway-integration", "Headless SaaS & API Solutions — Payment Gateway Integration"),
    ("headless/booking-and-appointment-apis", "Headless SaaS & API Solutions — Booking & Appointment APIs"),
    ("headless/crm-apis", "Headless SaaS & API Solutions — CRM APIs"),
    ("headless/notification-apis", "Headless SaaS & API Solutions — Notification APIs"),
    ("headless/file-and-media-apis", "Headless SaaS & API Solutions — File & Media APIs"),
    ("headless/ai-apis", "Headless SaaS & API Solutions — AI APIs"),
    ("automation/n8n-workflow-automation", "Workflow Automation & Integration — n8n Workflow Automation"),
    ("automation/business-process-automation", "Workflow Automation & Integration — Business Process Automation"),
    ("automation/whatsapp-automation", "Workflow Automation & Integration — WhatsApp Automation"),
    ("automation/email-automation", "Workflow Automation & Integration — Email Automation"),
    ("automation/crm-automation", "Workflow Automation & Integration — CRM Automation"),
    ("automation/ai-agent-workflows", "Workflow Automation & Integration — AI Agent Workflows"),
    ("automation/third-party-application-integration", "Workflow Automation & Integration — Third-Party Application Integration"),
    ("automation/webhook-integration", "Workflow Automation & Integration — Webhook Integration"),
    ("mobile/appointment-booking-applications", "Mobile & Business Applications — Appointment Booking Applications"),
    ("mobile/field-staff-and-task-tracking-applications", "Mobile & Business Applications — Field Staff & Task Tracking Applications"),
    ("mobile/employee-location-tracking-applications", "Mobile & Business Applications — Employee Location Tracking Applications"),
    ("mobile/business-billing-applications", "Mobile & Business Applications — Business Billing Applications"),
    ("mobile/inventory-management-applications", "Mobile & Business Applications — Inventory Management Applications"),
    ("mobile/custom-business-mobile-applications", "Mobile & Business Applications — Custom Business Mobile Applications"),
)

# Where a client can be shown: every service of a category ("software/*"), or one individual service. A client may have several.
CATEGORY_LABELS = {}
for _value, _label in SERVICE_PAGES:
    CATEGORY_LABELS.setdefault(_value.split("/")[0], _label.split(" — ")[0])
SERVICE_SCOPES = tuple((f"{c}/*", f"All {name} service pages") for c, name in CATEGORY_LABELS.items()) + SERVICE_PAGES
