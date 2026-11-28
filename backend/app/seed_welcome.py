"""The 7-card Welcome Experience (`python -m app.cli seed-welcome`): the master switch and the seven cards, loaded into the CMS so they are managed in the admin panel
(Welcome Experience > Welcome cards / Welcome Experience settings).

Honesty: Software & IT Services (including AI Workflow Automations), Digital Marketing and Education describe what LAX360 does today. The AI, IoT / Robotics, CAD and Blockchain divisions are described only as planned / emerging
initiatives, with a "Planned initiative" badge: no product, launch or availability is claimed. Page links point only at pages that exist on the website; the Education
card links to CADPOINT Academy, the training centre operated by LAX360 (there is no separate Education & Training page).
"""

from __future__ import annotations

SETTINGS = {"slug": "welcome", "title": "Welcome Experience settings", "data": {"enabled": True}}

# (slug, title, theme, headline, description, status_label, explore_label, explore_link, franchise_enabled, franchise_division)
CARDS = [  # (the opening "Welcome to LAX360" intro card was removed on request: it is no longer part of the sequence)
    ("software-it-services", "Software & IT Services", "software", "Powerful Software. Smarter Business.",
     "We build intelligent software solutions that simplify business operations, improve productivity, and support digital transformation. From custom software development "
     "to enterprise applications, we turn business requirements into practical technology solutions.", "", "Explore Software", "/services/software", True, "Software & IT Services"),
    ("digital-marketing", "Digital Marketing", "marketing", "Make Your Brand Impossible to Ignore.",
     "Build your digital presence, reach the right audience, and turn engagement into business growth through strategic digital marketing solutions. We help businesses grow "
     "through SEO, Google Ads, Meta Ads, social media marketing, and content strategies.", "", "Explore Digital Marketing", "/services/digitalmarketing", True, "Digital Marketing"),
    ("education-training", "Education & Training", "education", "Learn Today. Lead Tomorrow.",
     "We empower students, professionals, and aspiring technology experts through industry-focused training, practical learning experiences, technology workshops, and "
     "career-oriented skill development programs.", "", "Explore Education", "/our-network/cadpoint-academy-salem", True, "Education & Training"),
    ("ai-automation", "AI Workflow Automations", "ai", "Transform Workflows. Unlock Intelligence.",
     "AI Workflow Automations & Integrations, part of Software & IT Services, connect your tools and add AI-assisted steps so teams spend less time on repetitive work. "
     "A separate Artificial Intelligence division (AI agents, assistants and digital employees) is under development and is not available yet.", "", "Explore AI Workflow Automations", "/services/software/ai-workflow-automations-and-integrations", False, ""),
    ("robotics", "Robotics", "robotics", "Bringing Intelligent Machines to Life.",
     "We are exploring the future of robotics and intelligent automation, combining software, AI, sensors, and connected technologies to create innovative solutions for "
     "real-world applications.\n\nRobotics is an emerging technology initiative that we are planning to introduce and expand as part of our future innovation capabilities.",
     "Planned initiative", "Explore Robotics", "/robotics", False, ""),
    ("blockchain", "Blockchain", "blockchain", "Building a More Connected and Trustworthy Digital Future.",
     "We are exploring blockchain technology and its potential to support secure digital transactions, decentralized applications, smart contracts, transparent business "
     "processes, and next-generation digital ecosystems.\n\nBlockchain is part of our future technology expansion plans, and we aim to explore practical applications that "
     "can create meaningful business value.", "Planned initiative", "Explore Blockchain", "/blockchain", False, ""),
]


def card_rows() -> list[dict]:
    out = []
    for i, (slug, title, theme, headline, desc, status, label, link, fr, division) in enumerate(CARDS, start=1):
        data = {"theme": theme, "enabled": True, "headline": headline, "description": desc, "franchise_enabled": fr}
        if status:
            data["status_label"] = status
        if label:
            data["explore_label"], data["explore_link"] = label, link
        if fr:
            data["franchise_division"] = division
        out.append({"slug": slug, "title": title, "data": data, "sort_order": i * 10})
    return out
