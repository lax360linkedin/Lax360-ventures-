// The four UPCOMING service divisions of LAX360 Pvt Ltd: Artificial Intelligence (AI), IoT / Embedded Systems & Robotics, CAD Designing & Training, and Blockchain & Web 3.0.
// They are PLANNED / UNDER DEVELOPMENT: nothing here describes a launched service, a finished product or a client project, and no dates, prices or results are stated.
// This is the built-in (prerendered) content. Administrators can change every field, add services and change the launch status in Admin > Services > Upcoming service
// categories / Upcoming services (see hooks/useUpcoming.js); activating a service for launch is a status change, not a code change.

export const STATUSES = {
  coming_soon: { label: 'Coming Soon', tone: 'amber', note: 'This service is not available yet. It will be launched in the future.' },
  under_development: { label: 'Under Development', tone: 'violet', note: 'This service is currently under development and will be launched in the future. It is not available to order yet.' },
  available: { label: 'Available', tone: 'green', note: 'This service is available. Contact us to get started.' },
  unavailable: { label: 'Temporarily Unavailable', tone: 'rose', note: 'This service is temporarily unavailable. Register your interest and we will get back to you.' },
}
export const STATUS_ORDER = ['coming_soon', 'under_development', 'available', 'unavailable']
/** Is the service actually on offer? Only "available" counts: everything else is described as upcoming and never as a live service or an active partnership program. */
export const isLive = (status) => status === 'available'

export const UPCOMING_CATEGORIES = [
  {
    slug: "ai",
    path: "/artificial-intelligence",
    name: "Artificial Intelligence (AI)",
    short: "Artificial Intelligence",
    status: "under_development",
    icon: "ai",
    tagline: "Intelligent assistants, AI agents and digital employees for business work.",
    description: [
      "LAX360 is planning a dedicated Artificial Intelligence division focused on advanced AI-powered products: intelligent bots and assistants, AI agents and digital employees that can take on defined business tasks. The division is under development and is not available yet.",
      "It is separate from the AI Workflow Automations & Integrations that LAX360 offers today under Software & IT Services, which connects your existing tools with automated, AI-assisted workflows. The products listed here are plans, not launched services."
    ],
    seoTitle: "AI Agents, Bots and AI Employees (Under Development)",
    seoDescription: "AI bots, AI agents, AI employees, AI voice assistants and AI CRM solutions from LAX360 Pvt Ltd: an upcoming division that is under development. Register your interest.",
    headline: "AI that can take on real business work.",
    lead: "We are planning AI-powered products that go beyond automation: assistants, agents and digital employees designed for specific business tasks. Register your interest and we will let you know when something is ready.",
    areas: [
      {
        title: "Assistants and agents",
        text: "Conversational assistants and task-focused agents for sales, support and operations. Scope is defined per product before launch."
      },
      {
        title: "AI employees",
        text: "Digital employees that carry out a defined role (for example reception or first-line support) with a human kept in charge."
      },
      {
        title: "AI for decisions",
        text: "Business intelligence that turns company data into plain-language answers and suggestions."
      },
      {
        title: "Different from today’s automation",
        text: "AI Workflow Automations & Integrations (Software & IT Services) is available now. This division covers the separate, more advanced products still being planned."
      }
    ],
    services: [
      {
        slug: "ai-bots-and-assistants",
        name: "AI Bots & Intelligent Assistants",
        summary: "Planned: conversational bots and assistants for businesses."
      },
      {
        slug: "ai-employees",
        name: "AI Employees",
        summary: "Planned: digital employees that handle a defined business role."
      },
      {
        slug: "ai-agents",
        name: "AI Agents",
        summary: "Planned: task-focused agents that act across business tools."
      },
      {
        slug: "ai-crm-solutions",
        name: "AI CRM Solutions",
        summary: "Planned: CRM capabilities powered by AI."
      },
      {
        slug: "ai-voice-assistants",
        name: "AI Voice Assistants",
        summary: "Planned: voice-based assistants for customer and internal use."
      },
      {
        slug: "ai-receptionists",
        name: "AI Receptionists",
        summary: "Planned: automated front-desk and call handling."
      },
      {
        slug: "ai-sales-assistants",
        name: "AI Sales Assistants",
        summary: "Planned: assistants that support lead handling and follow-up."
      },
      {
        slug: "ai-customer-support-agents",
        name: "AI Customer Support Agents",
        summary: "Planned: agents that answer and route customer queries."
      },
      {
        slug: "ai-personal-assistants",
        name: "AI Personal Assistants",
        summary: "Planned: assistants for individual productivity."
      },
      {
        slug: "multi-agent-ai-systems",
        name: "Multi-Agent AI Systems",
        summary: "Planned: several agents working together on one process."
      },
      {
        slug: "ai-business-intelligence",
        name: "AI-Powered Business Intelligence",
        summary: "Planned: AI-assisted analysis and reporting."
      },
      {
        slug: "custom-ai-solutions",
        name: "Custom AI Solutions",
        summary: "Planned: AI built around a specific business requirement."
      }
    ],
    today: [
      "AI Workflow Automations & Integrations (Software & IT Services)",
      "Software and web applications",
      "Third-party software integrations"
    ],
    todayLinks: [
      {
        label: "AI Workflow Automations & Integrations",
        to: "/services/software/ai-workflow-automations-and-integrations"
      },
      {
        label: "Software & IT Services",
        to: "/services/software"
      }
    ]
  },
  {
    slug: "robotics",
    path: "/robotics",
    name: "IoT, Embedded Systems & Robotics",
    short: "IoT, Embedded & Robotics",
    status: "under_development",
    icon: "robot",
    tagline: "Connected devices, embedded systems and robotics that join hardware, software and AI.",
    description: [
      "LAX360 is planning a single division for IoT, Embedded Systems and Robotics: connected devices, the software that runs on them, and machines that combine sensors, software and AI for real-world applications. The division is under development.",
      "We have not launched an IoT, embedded or robotics product, and none is commercially available yet. Scope, platforms and the way of working will be published when the division is ready and verified."
    ],
    seoTitle: "IoT, Embedded Systems & Robotics (Under Development)",
    seoDescription: "IoT solutions, embedded systems, hardware and software integration, robotics and industrial automation from LAX360 Pvt Ltd: an upcoming division that is under development. Register your interest.",
    headline: "Connected devices and intelligent machines.",
    lead: "IoT, embedded systems and robotics are planned as one LAX360 division, joining hardware, sensors, software and AI. Register your interest and we will let you know when it is ready.",
    areas: [
      {
        title: "Connected devices",
        text: "Devices and sensors that send data to dashboards and business systems."
      },
      {
        title: "Embedded systems",
        text: "The software that runs on a device, and its integration with the hardware around it."
      },
      {
        title: "Robotics and automation",
        text: "Machines and automated equipment that use software and AI to carry out defined tasks."
      },
      {
        title: "Real-world applications",
        text: "Practical uses such as monitoring and smart devices. Which applications we pursue will be decided as the plans mature; none is committed yet."
      }
    ],
    services: [
      {
        slug: "iot-solutions",
        name: "Internet of Things (IoT) Solutions",
        summary: "Planned: IoT solutions that connect devices and data."
      },
      {
        slug: "embedded-systems-development",
        name: "Embedded Systems Development",
        summary: "Planned: software for embedded devices."
      },
      {
        slug: "hardware-software-integration",
        name: "Hardware and Software Integration",
        summary: "Planned: joining devices with business software."
      },
      {
        slug: "robotics-solutions",
        name: "Robotics Solutions",
        summary: "Planned: robotics solutions for a practical task."
      },
      {
        slug: "industrial-automation",
        name: "Industrial Automation",
        summary: "Planned: automation of industrial processes and equipment."
      },
      {
        slug: "smart-device-development",
        name: "Smart Device Development",
        summary: "Planned: smart, connected devices."
      },
      {
        slug: "sensor-integration",
        name: "Sensor Integration",
        summary: "Planned: integrating sensors with software and systems."
      },
      {
        slug: "intelligent-monitoring-systems",
        name: "Intelligent Monitoring Systems",
        summary: "Planned: monitoring that raises useful alerts."
      },
      {
        slug: "iot-dashboards",
        name: "IoT Dashboards",
        summary: "Planned: dashboards for device and sensor data."
      },
      {
        slug: "connected-device-solutions",
        name: "Connected Device Solutions",
        summary: "Planned: solutions that link devices to one another and to software."
      }
    ],
    today: [
      "Software and web applications",
      "Third-party software integrations",
      "API-driven business software"
    ],
    todayLinks: [
      {
        label: "Software & IT Services",
        to: "/services/software"
      },
      {
        label: "Third-Party Software Integrations",
        to: "/services/software/third-party-software-integrations"
      }
    ]
  },
  {
    slug: "cad-engineering",
    path: "/cad-engineering",
    name: "CAD Designing & Training",
    short: "CAD Designing & Training",
    status: "under_development",
    icon: "cad",
    tagline: "Engineering design, drafting and CAD training for mechanical, civil and architectural work.",
    description: [
      "LAX360 is planning a dedicated CAD Designing & Training division: engineering design and drafting services, and training for people who want to work with CAD software. The division is under development.",
      "This is separate from the CADPOINT education partnership: the CADPOINT training programs that LAX360 offers today stay available under Education & Training. The services listed here are plans, not launched services."
    ],
    seoTitle: "CAD Designing & Training (Under Development)",
    seoDescription: "Mechanical and civil CAD designing, 2D drafting, 3D modeling, product and architectural design and CAD training from LAX360 Pvt Ltd: an upcoming division under development. Register your interest.",
    headline: "Engineering design, drawn with care.",
    lead: "CAD designing and engineering training are being planned as a new LAX360 division. Register your interest and we will let you know when it is ready.",
    areas: [
      {
        title: "Drawings and models",
        text: "2D drafting and 3D models prepared in CAD software. The exact scope will be defined before launch."
      },
      {
        title: "Mechanical, civil and architectural",
        text: "Planned design areas: mechanical parts and assemblies, civil and construction drawings, and architectural design."
      },
      {
        title: "Training",
        text: "CAD software training and professional engineering training are planned alongside the design services."
      },
      {
        title: "CADPOINT programs stay available",
        text: "The CADPOINT education partnership and its currently available training programs remain under Education & Training."
      }
    ],
    services: [
      {
        slug: "mechanical-cad",
        name: "Mechanical CAD Designing",
        summary: "Planned: CAD drawings and models for mechanical parts and assemblies."
      },
      {
        slug: "civil-cad",
        name: "Civil CAD Designing",
        summary: "Planned: CAD drawings and plans for civil and construction work."
      },
      {
        slug: "2d-drafting",
        name: "2D Drafting",
        summary: "Planned: technical 2D drawings."
      },
      {
        slug: "3d-modeling",
        name: "3D Modeling",
        summary: "Planned: 3D models for design and visualisation."
      },
      {
        slug: "product-design",
        name: "Product Design",
        summary: "Planned: design of physical products."
      },
      {
        slug: "engineering-design-solutions",
        name: "Engineering Design Solutions",
        summary: "Planned: engineering design support for a defined requirement."
      },
      {
        slug: "architectural-design",
        name: "Architectural Design",
        summary: "Planned: architectural drawings and design."
      },
      {
        slug: "cad-software-training",
        name: "CAD Software Training",
        summary: "Planned: training on CAD software."
      },
      {
        slug: "professional-engineering-training",
        name: "Professional Engineering Training",
        summary: "Planned: training for engineering professionals."
      }
    ],
    today: [
      "CADPOINT authorized education partnership (Education & Training)",
      "Technical training and certification courses",
      "Software and IT services"
    ],
    todayLinks: [
      {
        label: "Education & Training",
        to: "/services/education"
      },
      {
        label: "Our CADPOINT partnership",
        to: "/our-network"
      }
    ]
  },
  {
    slug: "blockchain",
    path: "/blockchain",
    name: "Blockchain & Web 3.0",
    short: "Blockchain & Web 3.0",
    status: "under_development",
    icon: "chain",
    tagline: "Blockchain applications, smart contracts and decentralized technology for business.",
    description: [
      "LAX360 is planning a Blockchain & Web 3.0 division: blockchain applications, smart contracts, decentralized applications and digital identity, including enterprise use. The division is under development.",
      "We have not launched a blockchain or Web 3.0 product or service yet, and none is available to order."
    ],
    seoTitle: "Blockchain & Web 3.0 (Under Development)",
    seoDescription: "Blockchain application development, Web 3.0, smart contracts, DApps, digital identity and enterprise blockchain from LAX360 Pvt Ltd: an upcoming division under development. Register your interest.",
    headline: "Building a more connected and trustworthy digital future.",
    lead: "We are exploring blockchain and Web 3.0 for secure transactions, decentralized applications, smart contracts and digital identity. Register your interest and we will let you know when it is ready.",
    areas: [
      {
        title: "Secure digital transactions",
        text: "How blockchain can record and protect transactions so the record can be trusted."
      },
      {
        title: "Decentralized applications",
        text: "Applications that do not depend on a single central system to run."
      },
      {
        title: "Smart contracts",
        text: "Agreements that run as code, so agreed steps happen automatically and visibly."
      },
      {
        title: "Digital identity and enterprise use",
        text: "Identity solutions and blockchain integrations for organisations."
      }
    ],
    services: [
      {
        slug: "blockchain-application-development",
        name: "Blockchain Application Development",
        summary: "Planned: applications built on blockchain."
      },
      {
        slug: "web3-development",
        name: "Web 3.0 Development",
        summary: "Planned: decentralized and next-generation web development."
      },
      {
        slug: "smart-contract-development",
        name: "Smart Contract Development",
        summary: "Planned: smart contracts."
      },
      {
        slug: "decentralized-applications",
        name: "Decentralized Applications (DApps)",
        summary: "Planned: decentralized applications."
      },
      {
        slug: "blockchain-integrations",
        name: "Blockchain Integrations",
        summary: "Planned: connecting blockchain with existing systems."
      },
      {
        slug: "digital-identity-solutions",
        name: "Digital Identity Solutions",
        summary: "Planned: digital identity solutions."
      },
      {
        slug: "enterprise-blockchain-solutions",
        name: "Enterprise Blockchain Solutions",
        summary: "Planned: blockchain solutions for organisations."
      }
    ],
    today: [
      "Software and IT services",
      "Web and mobile applications",
      "Secure, API-driven business software"
    ],
    todayLinks: [
      {
        label: "Software & IT Services",
        to: "/services/software"
      }
    ]
  }
]

/** The three partnership programs the upcoming services are listed under (the slugs and paths of data/partnership.js). */
export const PROGRAMS = [
  { key: 'franchise', flag: 'partner_franchise', label: 'Franchise Opportunities', path: '/franchise' },
  { key: 'authorized', flag: 'partner_authorized', label: 'Authorized Partner Program', path: '/authorized-partner' },
  { key: 'referral', flag: 'partner_referral', label: 'Referral Partner Program', path: '/referral-partner' },
]
/** The partnership program (category slug of data/partnership.js) each key belongs to. */
export const PROGRAM_BY_SLUG = { franchise: 'franchise', 'authorized-partner': 'authorized', 'referral-partner': 'referral' }

export const upcomingPath = (slug, builtin) => builtin?.path || `/upcoming/${slug}`
