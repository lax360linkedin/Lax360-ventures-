"""Builds the solutions portfolio (6 categories, 64 showcased solutions and industry categories) from the specifications in solutions_part1/2/3.py.

  python backend/scripts/build_solutions.py

Writes:
  frontend/src/data/solutions.json                      the built-in copy the website ships (prerendered, never empty)
  backend/app/seed_data/solutions.json                  the same records, used by `python -m app.cli migrate-content` to fill the database / Admin Panel
  frontend/public/assets/solutions/<slug>.svg           one ILLUSTRATIVE mockup per solution (+ one per category); they are labelled as illustrations
Nothing here invents a customer, a result, a price or an availability: the status of each solution is in its specification.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
from solutions_part1 import SOFTWARE, WEBAPPS  # noqa: E402
from solutions_part2 import MOBILE, WEBSITES, WEBSITE_TYPES  # noqa: E402
from solutions_part3 import AGENTS, API  # noqa: E402

OUT_FRONT = ROOT / "frontend" / "src" / "data" / "solutions.json"
OUT_BACK = ROOT / "backend" / "app" / "seed_data" / "solutions.json"
OUT_MERGES = ROOT / "backend" / "app" / "seed_data" / "solution_merges.json"
# Solutions that ARE an existing LAX360 product (same purpose and functionality, judged by what they do, not by name). They are not listed a second time: their extra content is merged into the
# existing product record (`seed_content.seed_solution_merges`, run by `migrate-content`). Platform variants that are genuinely separate deliverables stay separate solutions.
MERGES = {
    "inventory-and-billing-software": "lax360-smart-billing-pos",        # billing + stock for shops: the Smart Billing & POS product
    "warehouse-management-software": "lax360-inventory-management",      # stock, locations and movement: the Inventory Management product
    "clinic-management-software": "lax360-clinic-management",            # one clinic system ...
    "clinic-management-web-application": "lax360-clinic-management",     # ... its browser version is the same product
    "customer-relationship-management-crm": "lax360-business-crm",
    "hr-and-employee-management-system": "lax360-hr-employee-management",
    "learning-management-system-lms": "lax360-learning-platform",
    "appointment-and-booking-management-system": "lax360-bookings",
    "field-staff-and-location-tracking-app": "lax360-field-operations",
    "ai-business-workflow-automation": "lax360-workflow-automation",
}
OUT_INDEX = ROOT / "frontend" / "src" / "data" / "solutions-index.json"
IMG_DIR = ROOT / "frontend" / "public" / "assets" / "solutions"

STATUS_NOTE = {
    "available": "Available as a LAX360 product.",
    "custom": "Custom development: built to your requirements.",
    "under_development": "Under development: not available to order yet.",
    "coming_soon": "Coming soon.",
}

CATEGORIES = [
    dict(slug="software", name="Software Development", accent="#2563eb", mock="desktop", custom_name="Custom Software Development",
         intro="Installed and cloud software for the day-to-day work of a business: billing, stock, clinics, schools, factories and more. Each solution below is a starting point that we adapt to your industry and way of working.",
         custom_text="We develop all types of customized software solutions tailored to your industry, business operations and specific requirements, including desktop, cloud-based, offline and hybrid applications.",
         platforms=["Windows desktop", "Web browser (cloud)", "Offline or hybrid on request"], service="/services/software/custom-software-development"),
    dict(slug="webapps", name="Web Application Development", accent="#7c3aed", mock="webapp", custom_name="Custom Web Application Development",
         intro="Browser-based applications that teams and customers sign in to from any device: CRM, HR, ERP, learning, booking and analytics platforms, built secure and ready to grow.",
         custom_text="We build secure, scalable and fully customized web applications for businesses of all sizes, with advanced functionalities, administrative dashboards and third-party integrations.",
         platforms=["Any modern browser", "Responsive on tablet and phone"], service="/services/software/web-application-development"),
    dict(slug="mobile", name="Mobile Application Development", accent="#0891b2", mock="mobile", custom_name="Custom Mobile Application Development",
         intro="Android and iOS apps for businesses, communities and individual users: attendance, field work, booking, learning, shopping, finance and more.",
         custom_text="We develop all types of Android and iOS applications tailored to business requirements, individual users and industry-specific needs.",
         platforms=["Android", "iOS"], service="/services/software/mobile-application-development"),
    dict(slug="websites", name="Website Development", accent="#db2777", mock="website", custom_name="Custom Website Development",
         intro="Websites designed for the way each industry sells, informs and takes enquiries: ten industry categories and ten website types, each customised to the business behind it.",
         custom_text="We design and develop websites for all types of businesses and industries, with customized designs, functionalities, administrative controls and third-party integrations based on customer requirements.",
         platforms=["Responsive on every screen size", "All modern browsers"], service="/services/software/website-development"),
    dict(slug="api", name="Headless SaaS & API Solutions", accent="#059669", mock="api", custom_name="Custom API & Headless SaaS Development",
         intro="Reusable backend services that your applications call instead of rebuilding: sign-in, messaging, documents, codes, recognition and conversation.",
         custom_text="We develop customized APIs, backend services, headless SaaS platforms and integration solutions based on business and application requirements.",
         platforms=["REST APIs (JSON)", "Any web or mobile client"], service="/services/software/headless-saas-and-api-solutions"),
    dict(slug="ai-agents", name="AI Agents & Business Automation", accent="#ea580c", mock="agent", custom_name="Custom AI & Automation Solutions",
         intro="Planned AI agents and intelligent assistants for front-desk, support, sales, HR and document work (under development), alongside the business workflow automation that is available today under Software & IT Services.",
         custom_text="We build customized AI agents, intelligent assistants and automated workflows designed to reduce manual work, improve productivity and streamline business operations across diverse industries.",
         platforms=["Web dashboard", "WhatsApp, email and chat channels as agreed"], service="/services/software/ai-workflow-automations-and-integrations"),
]

PARTS = [("software", SOFTWARE, "product"), ("webapps", WEBAPPS, "product"), ("mobile", MOBILE, "product"), ("websites", WEBSITES, "industry"), ("api", API, "product"), ("ai-agents", AGENTS, "product")]

STEPS = {
    "software": ["Discover|We visit or call to understand how {n} would sit inside your daily routine, and write down your current process and forms.",
                 "Design|We agree a written scope: screens, rules and reports for {m1} and {m2}, and whether it runs on a desktop, in the cloud, offline or both.",
                 "Develop|We build in stages and show working software early, so your staff can try {m3} before everything is finished.",
                 "Deploy & support|We install it, move over your existing data where possible, train your team and agree how support works."],
    "webapps": ["Discover|We map who will use {n}, what each role must be able to do, and what data it replaces.",
                "Design|We agree the modules, the screens for {m1} and {m2}, user roles and the integrations needed.",
                "Develop|We build in stages with a working version for review, including the admin dashboard.",
                "Launch & improve|We host or hand over the application, train users and plan improvements after real use."],
    "mobile": ["Discover|We agree who the app is for, the problem it solves and which phones it must support.",
               "Design|We design the screens and flows for {m1} and {m2} and confirm what works offline and what needs a connection.",
               "Develop|We build the Android and iOS app (or the platform you choose) and share test builds as it grows.",
               "Publish & support|We help prepare the store listings, release the app and agree updates and support."],
    "websites": ["Discover|We learn about the business, its customers and what a visitor should do on the site.",
                 "Design|We plan the page structure ({m1}, {m2}) and design the look to match your brand.",
                 "Develop|We build a responsive site with the admin controls you need and connect forms and integrations.",
                 "Launch & maintain|We launch, check speed and search basics and agree how updates are handled."],
    "api": ["Discover|We agree what {n} must do, who will call it and how it is secured.",
            "Design|We define the endpoints and data for {m1} and {m2}, with documentation your developers can use.",
            "Develop|We build and test the service, including error handling and usage logging.",
            "Integrate & support|We help connect it to your apps, monitor use and agree how changes are versioned."],
    "ai-agents": ["Discover|We agree the task the agent would take over, the information it may use and where a person must decide.",
                  "Design|We design the conversation or workflow, including {m1} and {m2}, and the rules and limits it must follow.",
                  "Build & test|We build in stages and test with your own examples before anything reaches customers.",
                  "Launch & review|We release carefully, review the results with you and keep people in control."],
}

KEYWORDS = ["Clinic", "Hospital", "Appointment", "Booking", "CRM", "Customer", "HR", "Employee", "Attendance", "Education", "Learning", "School", "Inventory", "Warehouse", "Billing", "Invoice", "POS",
            "Restaurant", "WhatsApp", "Workflow", "Document", "Email", "Notification", "Chatbot", "Support", "Sales", "Lead", "Pharmacy", "Hotel", "Field"]


def slugify(text: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", text.lower().replace("&", "and")))


def trim(text: str, n: int) -> str:
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


# ---------------------------------------------------------------------------------------------------------------------- images
def bars(seed: str, n: int) -> list[int]:
    h = hashlib.sha256(seed.encode()).digest()
    return [30 + h[i] % 60 for i in range(n)]


def svg_text(x, y, s, size=18, fill="#334155", weight=600, anchor="start"):
    return f'<text x="{x}" y="{y}" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{escape(s)}</text>'


PREVIEW_LABEL = {"software": "Product Interface Preview", "webapps": "Product Interface Preview", "mobile": "Product Interface Preview", "websites": "Website Design Preview", "api": "Solution Preview", "ai-agents": "Solution Preview"}
SVG_DIR = Path(__file__).resolve().parent / "_svg"  # intermediate drawings (not published)


def mockup_svg(kind: str, title: str, modules: list[str], accent: str, seed: str, concept: bool = False) -> str:
    w, h = 1200, 800
    b = bars(seed, 8)
    tag = "Concept illustration" if concept else "Illustrative mockup"
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{escape(tag)}: {escape(title)}">',
         f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{accent}" stop-opacity=".16"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient>'
         f'<linearGradient id="ac" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{accent}"/><stop offset="1" stop-color="{accent}" stop-opacity=".6"/></linearGradient></defs>',
         f'<rect width="{w}" height="{h}" fill="url(#bg)"/>']
    mods = [trim(m, 26) for m in modules[:5]]
    if kind in ("desktop", "webapp", "website"):
        fx, fy, fw, fh = 110, 90, 980, 590
        o.append(f'<rect x="{fx}" y="{fy}" width="{fw}" height="{fh}" rx="18" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>')
        o.append(f'<rect x="{fx}" y="{fy}" width="{fw}" height="46" rx="18" fill="#f1f5f9"/><rect x="{fx}" y="{fy + 28}" width="{fw}" height="18" fill="#f1f5f9"/>')
        for i, c in enumerate(("#f87171", "#fbbf24", "#34d399")):
            o.append(f'<circle cx="{fx + 28 + i * 24}" cy="{fy + 23}" r="7" fill="{c}"/>')
        if kind == "webapp":
            o.append(f'<rect x="{fx + 190}" y="{fy + 12}" width="420" height="22" rx="11" fill="#fff" stroke="#e2e8f0"/>')
        if kind in ("desktop", "webapp"):
            o.append(f'<rect x="{fx}" y="{fy + 46}" width="210" height="{fh - 46}" fill="#f8fafc"/>')
            o.append(svg_text(fx + 24, fy + 92, trim(title, 22), 17, accent, 800))
            for i, m in enumerate(mods):
                y = fy + 140 + i * 56
                if i == 0:
                    o.append(f'<rect x="{fx + 12}" y="{y - 26}" width="186" height="40" rx="10" fill="{accent}" fill-opacity=".14"/>')
                o.append(f'<circle cx="{fx + 34}" cy="{y - 6}" r="6" fill="{accent}" fill-opacity="{1 if i == 0 else .45}"/>')
                o.append(svg_text(fx + 52, y, m, 15, "#334155", 600 if i == 0 else 500))
            for i in range(3):
                x = fx + 240 + i * 235
                o.append(f'<rect x="{x}" y="{fy + 76}" width="210" height="96" rx="14" fill="#fff" stroke="#e2e8f0"/>')
                o.append(svg_text(x + 18, fy + 108, ["Today", "This week", "Pending"][i], 14, "#64748b", 500))
                o.append(svg_text(x + 18, fy + 150, str(40 + b[i] * 3), 32, "#0f172a", 800))
            o.append(f'<rect x="{fx + 240}" y="{fy + 196}" width="440" height="300" rx="14" fill="#fff" stroke="#e2e8f0"/>')
            for i in range(8):
                bh = b[i] * 2.4
                o.append(f'<rect x="{fx + 268 + i * 49}" y="{fy + 470 - bh}" width="30" height="{bh}" rx="6" fill="url(#ac)"/>')
            o.append(f'<rect x="{fx + 700}" y="{fy + 196}" width="{fw - 730}" height="300" rx="14" fill="#fff" stroke="#e2e8f0"/>')
            for i in range(6):
                yy = fy + 230 + i * 44
                o.append(f'<rect x="{fx + 720}" y="{yy}" width="{40 + b[i] % 30}" height="12" rx="6" fill="#cbd5e1"/><rect x="{fx + 720 + 80}" y="{yy}" width="{100 + b[(i + 2) % 8]}" height="12" rx="6" fill="#e2e8f0"/>')
            o.append(f'<rect x="{fx + 240}" y="{fy + 516}" width="{fw - 270}" height="40" rx="10" fill="#f1f5f9"/>')
        else:  # website
            o.append(f'<rect x="{fx}" y="{fy + 46}" width="{fw}" height="64" fill="#fff"/>')
            o.append(svg_text(fx + 36, fy + 88, trim(title, 28), 20, "#0f172a", 800))
            for i, m in enumerate(mods[:4]):
                o.append(svg_text(fx + 560 + i * 110, fy + 88, trim(m, 11), 13, "#475569", 500))
            o.append(f'<rect x="{fx}" y="{fy + 110}" width="{fw}" height="230" fill="url(#ac)" fill-opacity=".9"/>')
            o.append(svg_text(fx + 60, fy + 200, trim(title, 34), 36, "#ffffff", 800))
            o.append(f'<rect x="{fx + 60}" y="{fy + 236}" width="420" height="14" rx="7" fill="#fff" fill-opacity=".7"/><rect x="{fx + 60}" y="{fy + 262}" width="300" height="14" rx="7" fill="#fff" fill-opacity=".5"/>')
            o.append(f'<rect x="{fx + 60}" y="{fy + 292}" width="150" height="34" rx="17" fill="#fff"/>')
            for i, m in enumerate(mods[:3]):
                x = fx + 40 + i * 310
                o.append(f'<rect x="{x}" y="{fy + 370}" width="280" height="170" rx="14" fill="#f8fafc" stroke="#e2e8f0"/>')
                o.append(f'<rect x="{x + 20}" y="{fy + 388}" width="240" height="70" rx="8" fill="{accent}" fill-opacity="{.12 + i * .06}"/>')
                o.append(svg_text(x + 20, fy + 494, m, 16, "#0f172a", 700))
                o.append(f'<rect x="{x + 20}" y="{fy + 508}" width="180" height="10" rx="5" fill="#cbd5e1"/>')
    elif kind == "mobile":
        for i, (px, sc) in enumerate(((190, .86), (500, 1.0), (810, .86))):
            pw, ph = 230 * sc, 520 * sc
            py = 130 + (1 - sc) * 160
            o.append(f'<rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="30" fill="#0f172a"/><rect x="{px + 8}" y="{py + 10}" width="{pw - 16}" height="{ph - 20}" rx="24" fill="#fff"/>')
            o.append(f'<rect x="{px + 8}" y="{py + 10}" width="{pw - 16}" height="70" rx="24" fill="url(#ac)"/><rect x="{px + 8}" y="{py + 56}" width="{pw - 16}" height="24" fill="url(#ac)"/>')
            o.append(svg_text(px + 24, py + 56, trim(title if i == 1 else mods[i % len(mods)], 20), 14 * sc + 2, "#fff", 800))
            for j in range(4):
                yy = py + 100 + j * 78 * sc
                o.append(f'<rect x="{px + 22}" y="{yy}" width="{pw - 44}" height="{62 * sc}" rx="12" fill="#f1f5f9"/><circle cx="{px + 48}" cy="{yy + 31 * sc}" r="{14 * sc}" fill="{accent}" fill-opacity=".35"/>')
                o.append(svg_text(px + 74, yy + 28 * sc, trim(mods[(j + i) % len(mods)], 16), 13 * sc + 1, "#334155", 600))
                o.append(f'<rect x="{px + 74}" y="{yy + 38 * sc}" width="{60 + b[j] % 40}" height="8" rx="4" fill="#cbd5e1"/>')
    elif kind == "api":
        o.append(f'<rect x="90" y="250" width="250" height="300" rx="18" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>')
        o.append(svg_text(215, 300, "Your app", 22, "#0f172a", 800, "middle"))
        for i, t in enumerate(("Web", "Mobile", "Partner system")):
            o.append(f'<rect x="120" y="{330 + i * 62}" width="190" height="44" rx="10" fill="#f1f5f9"/>' + svg_text(215, 359 + i * 62, t, 16, "#334155", 600, "middle"))
        o.append(f'<rect x="470" y="150" width="260" height="500" rx="22" fill="url(#ac)"/>')
        o.append(svg_text(600, 205, trim(title, 24), 19, "#fff", 800, "middle"))
        for i, m in enumerate(mods):
            o.append(f'<rect x="494" y="{240 + i * 74}" width="212" height="56" rx="12" fill="#fff" fill-opacity=".92"/>' + svg_text(600, 275 + i * 74, m, 14, "#0f172a", 700, "middle"))
        o.append(f'<rect x="860" y="250" width="250" height="300" rx="18" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>')
        o.append(svg_text(985, 300, "Services", 22, "#0f172a", 800, "middle"))
        for i, t in enumerate(("Database", "Messaging", "Storage")):
            o.append(f'<rect x="890" y="{330 + i * 62}" width="190" height="44" rx="10" fill="#f1f5f9"/>' + svg_text(985, 359 + i * 62, t, 16, "#334155", 600, "middle"))
        for y in (400, 450, 500):
            o.append(f'<path d="M340 {y} L470 {y}" stroke="{accent}" stroke-width="4" stroke-dasharray="10 8"/><path d="M730 {y} L860 {y}" stroke="{accent}" stroke-width="4" stroke-dasharray="10 8"/>')
    else:  # agent
        nodes = ["Trigger", trim(title, 22), "Your tools", "Human review"]
        for i, t in enumerate(nodes):
            x = 100 + i * 265
            fill = "url(#ac)" if i == 1 else "#fff"
            o.append(f'<rect x="{x}" y="300" width="220" height="140" rx="22" fill="{fill}" stroke="#cbd5e1" stroke-width="2"/>')
            o.append(svg_text(x + 110, 380, t, 19, "#fff" if i == 1 else "#0f172a", 800, "middle"))
            if i < 3:
                o.append(f'<path d="M{x + 220} 370 L{x + 265} 370" stroke="{accent}" stroke-width="5"/><path d="M{x + 255} 360 L{x + 267} 370 L{x + 255} 380" fill="none" stroke="{accent}" stroke-width="5"/>')
        for i, m in enumerate(mods[:4]):
            o.append(f'<rect x="{100 + i * 265}" y="480" width="220" height="48" rx="12" fill="#fff" fill-opacity=".85" stroke="#e2e8f0"/>' + svg_text(210 + i * 265, 510, trim(m, 24), 14, "#334155", 600, "middle"))
    o.append(f'<rect x="{w - 290}" y="{h - 66}" width="260" height="38" rx="19" fill="#0f172a" fill-opacity=".78"/>' + svg_text(w - 160, h - 41, tag, 15, "#ffffff", 700, "middle"))
    o.append("</svg>")
    return "".join(o)


# ---------------------------------------------------------------------------------------------------------------------- records
def build() -> dict:
    cat_by = {c["slug"]: c for c in CATEGORIES}
    records = []
    for cslug, specs, kind in PARTS:
        cat = cat_by[cslug]
        for order, spec in enumerate(specs, start=1):
            name, pitch, problems, modules, features, benefits, customers, industries, integrations, status, linked = spec
            slug = slugify(name)
            noun = name.replace("Websites for ", "").replace(" Software", "").replace(" App", "").replace(" API", "")
            steps = []
            for line in STEPS[cslug]:
                head, text = line.split("|", 1)
                steps.append({"title": head, "text": text.format(n=name, m1=modules[0].lower(), m2=modules[1].lower(), m3=modules[2].lower())})
            if status == "available":
                a1 = "LAX360 provides this solution, and it can be customised to your requirements. Tell us what else you need and we will confirm what is included."
            elif status == "under_development":
                a1 = "No. This agent is under development and is not available to order yet. You can register your interest and we will contact you when there is something to show. We do not publish launch dates until they are confirmed."
            else:
                a1 = "LAX360 provides this solution and customises it around your business: we agree the scope in writing first, and only then is a quotation prepared. No standard price is listed on this website."
            custom = list(cat["custom_name"] and [])
            custom += ["Fields, forms, screens and reports adapted to your process", "Your branding, user roles and permissions", "Integrations from the list above, or others you use", "Hosting and deployment options agreed with you"]
            if cslug == "software":
                custom[3] = "Desktop, cloud-based, offline or hybrid deployment"
            if cslug == "ai-agents":
                custom[1] = "Rules, tone and limits for what the agent may do"
            area = {"software": "program", "webapps": "web application", "mobile": "app", "websites": "website", "api": "API", "ai-agents": "agent"}[cslug]
            records.append({
                "slug": slug, "category": cslug, "kind": kind, "name": name, "status": status, "linked_product": linked or "",
                "order": order, "pitch": pitch,
                "overview": [pitch, f"LAX360 provides {name}, and every business runs this a little differently, so we also customise it: we look at how you work today, agree what the {area} should do, and adapt it to match."
                             + (" This one is described here as a planned direction; its scope will be confirmed before anything is offered." if status == "under_development" else "")],
                "problems": problems, "features": features, "modules": modules, "how": steps,
                "customers": customers, "industries": industries, "benefits": benefits,
                "platforms": cat["platforms"], "customization": custom, "integrations": integrations,
                "faqs": [{"q": f"What does LAX360 provide for {name.lower()}?", "a": a1},
                         {"q": "Can it be customised for my business?", "a": "Yes. " + custom[0] + ", " + custom[2].lower() + ". We confirm exactly what is included before work starts."},
                         {"q": "Which other tools can it connect to?", "a": "Typical connections are: " + ", ".join(integrations) + ". Which of these are used is agreed per project, and some depend on the provider's own terms."}],
                "seo_title": trim(name, 55), "seo_description": trim(pitch, 155), "keywords": [name.lower(), cat["name"].lower(), "lax360"],
                "image": f"/assets/solutions/{slug}.webp", "image_alt": f"{PREVIEW_LABEL[cslug]} of {name}" if status != "under_development" else f"Concept Preview of {name}",
                "mock": cat["mock"], "accent": cat["accent"], "featured": order <= 2,
                "partner_franchise": True, "partner_authorized": True, "partner_referral": True,
            })
    # related solutions: two neighbours in the same category, plus up to two with a shared keyword from other categories
    by_cat: dict[str, list[dict]] = {}
    for r in records:
        by_cat.setdefault(r["category"], []).append(r)
    for r in records:
        pool = by_cat[r["category"]]
        i = pool.index(r)
        rel = [pool[(i + 1) % len(pool)]["slug"], pool[(i - 1) % len(pool)]["slug"]]
        words = [k for k in KEYWORDS if k.lower() in r["name"].lower()]
        for o in records:
            if o["category"] != r["category"] and any(k.lower() in o["name"].lower() for k in words) and len(rel) < 4:
                rel.append(o["slug"])
        r["related"] = [x for i2, x in enumerate(rel) if x != r["slug"] and x not in rel[:i2]]
    for i, r in enumerate(records):
        r["vi"] = i  # position in the full list: keeps every picture's colours and layout stable when the list changes
    merged = [{"product": MERGES[r["slug"]], "solution": r} for r in records if r["slug"] in MERGES]
    records = [r for r in records if r["slug"] not in MERGES]
    gone = set(MERGES)
    for r in records:
        r["related"] = [x for x in r["related"] if x not in gone]
    cats = []
    for c in CATEGORIES:
        mine = [r for r in records if r["category"] == c["slug"]]
        cats.append({"slug": c["slug"], "name": c["name"], "intro": c["intro"], "custom_name": c["custom_name"], "custom_text": c["custom_text"], "platforms": c["platforms"],
                     "service_link": c["service"], "accent": c["accent"], "image": f"/assets/solutions/category-{c['slug']}.webp", "count": len(mine),
                     "types": [{"name": a, "text": b} for a, b in WEBSITE_TYPES] if c["slug"] == "websites" else []})
    return {"categories": cats, "solutions": records, "merged": merged}


def main() -> None:
    data = build()
    assert len(data["solutions"]) + len(data["merged"]) == 64 and len(data["merged"]) == len(MERGES), (len(data["solutions"]), len(data["merged"]))
    assert len({r["slug"] for r in data["solutions"]}) == len(data["solutions"])
    # the previews are drawn by solution_visuals.py and rendered to WebP by render_solution_images.py
    import solution_visuals as sv
    SVG_DIR.mkdir(parents=True, exist_ok=True)
    for r in data["solutions"]:
        (SVG_DIR / f"{r['slug']}.svg").write_text(sv.render_svg(r, r["vi"], r["order"]), encoding="utf-8")
    for i, c in enumerate(data["categories"]):
        names = [r["name"] for r in data["solutions"] if r["category"] == c["slug"]]
        (SVG_DIR / f"category-{c['slug']}.svg").write_text(sv.render_category_svg(c, i, names), encoding="utf-8")
    merged = data.pop("merged")
    OUT_MERGES.write_text(json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8")
    for path in (OUT_FRONT, OUT_BACK):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    # the slim list the Products page and the cards use (no long text): the full records are only loaded with a detail page
    card_keys = ("slug", "category", "kind", "name", "status", "linked_product", "order", "pitch", "industries", "platforms", "image", "image_alt", "featured", "partner_franchise", "partner_authorized", "partner_referral")
    index = {"categories": data["categories"], "solutions": [{k: r[k] for k in card_keys} for r in data["solutions"]]}
    OUT_INDEX.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    from collections import Counter
    print(len(data["solutions"]), "solutions;", dict(Counter(r["category"] for r in data["solutions"])), dict(Counter(r["status"] for r in data["solutions"])))


if __name__ == "__main__":
    main()
