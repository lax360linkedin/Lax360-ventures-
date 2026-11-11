"""The 7-card Welcome Experience (`python -m app.cli seed-welcome`): the master switch and the seven cards, loaded into the CMS so they are managed in the admin panel
(Welcome Experience > Welcome cards / Welcome Experience settings).

Honesty: Software, Digital Marketing, Education and AI & Automation describe what LAX360 does today. Robotics and Blockchain are described only as planned / emerging
initiatives, with a "Planned initiative" badge: no product, launch or availability is claimed. Page links point only at pages that exist on the website; the Education
card links to CADPOINT Academy, the training centre operated by LAX360 (there is no separate Education & Training page).
"""

from __future__ import annotations

SETTINGS = {"slug": "welcome", "title": "Welcome Experience settings", "data": {"enabled": True, "once_per_session": True}}

# (slug, title, theme, headline, description, status_label, explore_label, explore_link, franchise_enabled, franchise_division)
CARDS = [
    ("welcome", "Welcome to LAX360 Pvt Ltd", "welcome", "Ideas Into Innovation. Technology Into Possibilities.",
     "Welcome to LAX360 Pvt Ltd, where technology, creativity, and innovation come together to help businesses grow. Explore our technology services, digital solutions, "
     "educational initiatives, and emerging technology innovations.", "", "", "", False, ""),
    ("software-it-services", "Software & IT Services", "software", "Powerful Software. Smarter Business.",
     "We build intelligent software solutions that simplify business operations, improve productivity, and support digital transformation. From custom software development "
     "to enterprise applications, we turn business requirements into practical technology solutions.", "", "Explore Software", "/services/software", True, "Software & IT Services"),
    ("digital-marketing", "Digital Marketing", "marketing", "Make Your Brand Impossible to Ignore.",
     "Build your digital presence, reach the right audience, and turn engagement into business growth through strategic digital marketing solutions. We help businesses grow "
     "through SEO, Google Ads, Meta Ads, social media marketing, and content strategies.", "", "Explore Digital Marketing", "/services/growth", True, "Digital Marketing"),
    ("education-training", "Education & Training", "education", "Learn Today. Lead Tomorrow.",
     "We empower students, professionals, and aspiring technology experts through industry-focused training, practical learning experiences, technology workshops, and "
     "career-oriented skill development programs.", "", "Explore Education", "/our-network/cadpoint-academy-salem", True, "Education & Training"),
    ("ai-automation", "AI & Automation", "ai", "Transform Workflows. Unlock Intelligence.",
     "We bring businesses closer to the future through AI-powered applications, intelligent agents, business process automation, conversational AI, and workflow integrations. "
     "Our solutions help organizations reduce repetitive work and improve operational efficiency.", "", "Explore AI & Automation", "/services/ai", False, ""),
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
