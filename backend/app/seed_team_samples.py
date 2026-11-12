"""Temporary SAMPLE team profiles (`python -m app.cli seed-team-samples`), so the Our Team page can be previewed: one founder and five employees.

Every name, designation, description and portrait here is FICTIONAL demonstration content, not a LAX360 employee record: the portraits are generated flat illustrations
(frontend/public/assets/team/sample-*.webp), each profile is marked "sample" (the website shows a "Sample profile" label on it) and Admin > Team lists them with a one-click
"Remove all samples". Replace them with the real people and photographs, then remove the samples.
"""

from __future__ import annotations

# (slug, name, designation, role_level, bio, skills, picture)
PEOPLE = [
    ("sample-founder", "Arjun Mehta", "Founder, CEO & Managing Director", "founder",
     "A sample introduction for the founder: the vision behind the company, the experience that shaped it and what the team stands for. Replace this text with the real introduction.",
     "Strategy, Leadership, Product vision", "sample-founder.webp"),
    ("sample-employee-1", "Priya Nair", "Senior Software Engineer", "team_lead", "A sample profile: builds and reviews web applications with the team.", "React, Python, APIs", "sample-1.webp"),
    ("sample-employee-2", "Kavya Rao", "UI / UX Designer", "team_member", "A sample profile: turns requirements into clear, friendly interfaces.", "Figma, Design systems", "sample-2.webp"),
    ("sample-employee-3", "Meera Iyer", "Digital Marketing Executive", "team_member", "A sample profile: plans and measures campaigns for clients.", "SEO, Content, Ads", "sample-3.webp"),
    ("sample-employee-4", "Rohan Das", "Business Development Manager", "team_member", "A sample profile: looks after client relationships from the first call.", "Client success, Sales", "sample-4.webp"),
    ("sample-employee-5", "Sana Khan", "AI & Automation Engineer", "team_member", "A sample profile: connects AI assistants to everyday business workflows.", "Automation, LLMs", "sample-5.webp"),
]


def rows() -> list[dict]:
    return [{"slug": slug, "title": name, "sort_order": i * 10, "data": {"designation": des, "role_level": role, "bio": bio, "expertise": skills, "photo_path": f"/assets/team/{pic}", "photo_alt": f"Illustrated sample portrait of {name} (fictional)", "active": True, "sample": True}}
            for i, (slug, name, des, role, bio, skills, pic) in enumerate(PEOPLE, start=1)]
