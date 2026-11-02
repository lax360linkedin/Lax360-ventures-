// Four solution packages from the planning document. No performance claims or
// statistics — only the problem, the audience and what a solution can include.
export const solutions = [
  {
    id: 'crm',
    title: 'CRM & Sales Management',
    enquiryType: 'project',
    problem: 'Leads sit in chats, notebooks and spreadsheets, and follow-ups depend on someone remembering.',
    forWho: 'Sales teams, business owners and telecallers who manage enquiries every day.',
    included: ['Lead capture and tracking', 'Follow-up reminders', 'Pipeline view', 'Simple reports'],
    value: 'One shared place for customer information, so fewer enquiries are missed and managers can see what is happening.',
    division: 'software',
  },
  {
    id: 'erp',
    title: 'ERP & Business Management',
    enquiryType: 'project',
    problem: 'Billing, stock, purchasing and customers are managed in separate tools that do not talk to each other.',
    forWho: 'Operations heads and owners of growing manufacturing, trading or service businesses.',
    included: ['Inventory and purchasing', 'Billing and invoicing', 'Customer and supplier records', 'Operational reporting'],
    value: 'A single view of how the business is running, built around your processes rather than a generic template.',
    division: 'software',
  },
  {
    id: 'assistants',
    title: 'AI Assistants',
    enquiryType: 'ai',
    problem: 'The same customer or staff questions are answered again and again.',
    forWho: 'Support teams, institutions and businesses with a lot of repeat questions.',
    included: ['Answers from approved information', 'Handover to a person', 'Website or messaging channels', 'Review of unanswered questions'],
    value: 'Common questions handled quickly while your team focuses on the conversations that need a person.',
    division: 'ai',
  },
  {
    id: 'custom-apps',
    title: 'Custom Business Applications',
    enquiryType: 'project',
    problem: 'Your process is unique and no ready-made product fits without awkward workarounds.',
    forWho: 'Teams that have a specific workflow, approval chain or customer journey to support.',
    included: ['Web and mobile applications', 'Role-based access', 'Integrations with existing tools', 'Ongoing improvements'],
    value: 'Software that matches how you work, which you can extend as the business changes.',
    division: 'software',
  },
]
