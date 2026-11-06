"""Demonstration content for the Our Team page (`python -m app.cli seed-team-demo`).

Everything here is FICTIONAL sample data so the department pages can be reviewed with content in place. These are not LAX360 employees.
Every member is flagged `demo` (the website labels such profiles "Demonstration profile") and has no photograph: the website draws an illustrated
placeholder portrait until a real photo is uploaded. Replace each profile in the admin panel (Website content > Team) or delete them all with
`python -m app.cli seed-team-demo --remove`.
"""

from __future__ import annotations

DEPARTMENTS = [
    {
        "slug": "software-development", "title": "Software Development",
        "description": "Designing and building custom software, websites, web platforms and mobile apps.",
        "overview": "The software team designs and builds the web applications, websites, APIs and mobile apps that LAX360 delivers.\n\nFrontend, backend, full stack and mobile engineers work together on each project, from first prototype to release.",
        "roles": ["Frontend Developers", "Backend Developers", "Full Stack Developers", "Mobile Application Developers"],
        "responsibilities": ["Building web and mobile applications to client requirements", "Designing and maintaining APIs and databases", "Reviewing code and keeping quality consistent", "Deploying and supporting delivered software"],
        "expertise": "React, JavaScript, Python, FastAPI, Mobile apps, APIs",
    },
    {
        "slug": "ai-automation", "title": "AI & Automation",
        "description": "Creating AI-powered applications and automating business workflows.",
        "overview": "The AI & Automation team builds AI assistants, agents and workflow automations that remove repetitive work from day-to-day business.",
        "roles": ["AI Engineers", "AI Application Developers", "AI Agents Developers", "Automation Specialists"],
        "responsibilities": ["Designing AI features and assistants", "Connecting AI models to business data and tools", "Automating repetitive workflows and integrations", "Testing AI behaviour for accuracy and safety"],
        "expertise": "Generative AI, Machine learning, AI agents, Workflow automation",
    },
    {
        "slug": "digital-marketing", "title": "Digital Marketing",
        "description": "Growing visibility and demand through search, paid media, social and content.",
        "overview": "The marketing team plans and runs campaigns across search, paid advertising, social media and content.",
        "roles": ["Digital Marketing Manager", "SEO Specialists", "Google Ads Specialists", "Meta Ads Specialists", "Social Media Managers", "Content Creators"],
        "responsibilities": ["Planning and reporting on campaigns", "Search engine optimisation", "Managing paid advertising", "Creating and scheduling content"],
        "expertise": "SEO, Google Ads, Meta Ads, Social media, Content",
    },
    {
        "slug": "business-operations", "title": "Business & Operations",
        "description": "Keeping clients, projects and people supported from first conversation to delivery.",
        "overview": "Business & Operations looks after client relationships, project delivery and the people side of the company.",
        "roles": ["Business Development Manager", "Business Development Executives", "Sales & Client Relations", "Project Managers", "HR & Operations"],
        "responsibilities": ["Understanding client needs and proposals", "Coordinating project timelines and delivery", "Recruitment, onboarding and HR support", "Day-to-day operations"],
        "expertise": "Client relations, Project management, Recruitment, Operations",
    },
]

NOTE = "Demonstration profile: fictional sample content to be replaced with real details."

# (department, name, designation, head?, reports_to, expertise, bio)
PEOPLE = [
    ("software-development", "Karthikeyan Subramani", "Head of Software Development", True, "Managing Director", "Software architecture, React, FastAPI, Team leadership", "Leads the software department and reviews architecture across projects."),
    ("software-development", "Meenakshi Rajan", "Senior Frontend Developer", False, "Head of Software Development", "React, JavaScript, Accessibility", "Builds responsive, accessible web interfaces."),
    ("software-development", "Arvind Murugan", "Backend Developer", False, "Head of Software Development", "Python, FastAPI, PostgreSQL", "Designs APIs and database models."),
    ("software-development", "Divya Selvaraj", "Full Stack Developer", False, "Head of Software Development", "React, Node, SQL", "Works across the interface and the server."),
    ("software-development", "Naveen Kumaravel", "Mobile Application Developer", False, "Head of Software Development", "React Native, Android, iOS", "Builds mobile apps for business use."),
    ("ai-automation", "Lakshmi Narayanan", "Head of AI & Automation", True, "Managing Director", "Generative AI, AI agents, Automation strategy", "Leads the AI and automation department."),
    ("ai-automation", "Santhosh Pandian", "AI Engineer", False, "Head of AI & Automation", "Machine learning, Python, Model evaluation", "Prototypes and evaluates machine-learning features."),
    ("ai-automation", "Janani Elango", "AI Application Developer", False, "Head of AI & Automation", "LLM apps, APIs, Prompt design", "Builds applications on top of AI models."),
    ("ai-automation", "Vignesh Palanisamy", "AI Agents Developer", False, "Head of AI & Automation", "AI agents, Tool integration", "Develops assistants that act on business tools."),
    ("ai-automation", "Priyadharshini Mohan", "Automation Specialist", False, "Head of AI & Automation", "Workflow automation, Integrations", "Automates repetitive business processes."),
    ("digital-marketing", "Suganya Balakrishnan", "Head of Digital Marketing", True, "Managing Director", "Marketing strategy, SEO, Analytics", "Leads the marketing department and its reporting."),
    ("digital-marketing", "Harish Anbalagan", "SEO Specialist", False, "Head of Digital Marketing", "Technical SEO, Keyword research", "Improves search visibility."),
    ("digital-marketing", "Nandhini Chandran", "Google Ads Specialist", False, "Head of Digital Marketing", "Google Ads, Conversion tracking", "Runs and measures search campaigns."),
    ("digital-marketing", "Gokul Ramasamy", "Meta Ads Specialist", False, "Head of Digital Marketing", "Meta Ads, Audience targeting", "Runs paid social campaigns."),
    ("digital-marketing", "Keerthana Vasudevan", "Social Media Manager", False, "Head of Digital Marketing", "Social media, Community", "Plans and publishes social content."),
    ("digital-marketing", "Ashwin Thangavel", "Content Creator", False, "Head of Digital Marketing", "Copywriting, Video, Design", "Creates articles, graphics and short videos."),
    ("business-operations", "Ramesh Annamalai", "Head of Business & Operations", True, "Managing Director", "Business development, Operations", "Leads client relations and operations."),
    ("business-operations", "Sowmya Karthik", "Business Development Manager", False, "Head of Business & Operations", "Proposals, Partnerships", "Manages new business opportunities."),
    ("business-operations", "Dinesh Sekar", "Business Development Executive", False, "Business Development Manager", "Lead follow-up, Client calls", "Follows up with prospective clients."),
    ("business-operations", "Abirami Venkatesh", "Project Manager", False, "Head of Business & Operations", "Planning, Delivery tracking", "Coordinates project delivery."),
    ("business-operations", "Prakash Dhanapal", "HR & Operations Executive", False, "Head of Business & Operations", "Recruitment, Onboarding", "Supports hiring and day-to-day operations."),
]
