// Structural outlines for the legal pages. This is NOT legally reviewed text.
// The planning document says legal pages must be drafted or reviewed by a lawyer; replace
// these sections (and flip `reviewed` to true) only once that review is complete.
export const legal = {
  reviewed: false,
  updated: 'Draft — not yet in force',
  privacy: {
    title: 'Privacy Policy',
    intro: 'This draft outlines how LAX360 Ventures, a brand of LAX360 Pvt Ltd, intends to handle personal data submitted through this website. It is a structural outline and must be reviewed before publication.',
    sections: [
      { h: 'What we collect', p: 'Details you choose to submit through the enquiry form: name, phone or WhatsApp number, email address, company, enquiry type and your message.' },
      { h: 'Why we collect it', p: 'To respond to your enquiry and to route it to the right team.' },
      { h: 'Current status of this website', p: 'Enquiries, demo requests and login details you submit are processed by our own server and stored in our database so the team can respond. Messages you type to the website assistant are processed by an AI service (OpenAI) to generate replies and are kept for a limited period. We do not send confirmation emails yet. This text is a draft for the business owner and legal counsel to confirm.' },
      { h: 'Retention', p: 'Retention periods will be set out here after review. [Confirm]' },
      { h: 'Your rights', p: 'Rights available under applicable law, including India’s Digital Personal Data Protection Act, 2023, will be described here after legal review.' },
      { h: 'AI assistant', p: 'When the AI assistant goes live, this policy will disclose how conversations are processed and by which service providers.' },
      { h: 'Contact for privacy questions', p: 'Use the contact details on the Contact page. A named grievance contact will be added after review. [Confirm]' },
    ],
  },
  terms: {
    title: 'Terms of Use',
    intro: 'This draft outlines the intended terms for using this website. It is a structural outline and must be reviewed before publication.',
    sections: [
      { h: 'Use of this website', p: 'Content is provided for general information about LAX360 Ventures and its services.' },
      { h: 'Intellectual property', p: 'Ownership of site content, logos and designs will be stated here after review.' },
      { h: 'No guarantees', p: 'Descriptions of services are not offers or guarantees. Scope, pricing and timelines are agreed in writing for each project.' },
      { h: 'Limitation of liability', p: 'Liability wording will be added after legal review. [Confirm]' },
      { h: 'Governing law', p: 'Governing law and jurisdiction will be stated here after legal review. [Confirm]' },
      { h: 'Legal entity', p: 'LAX360 Ventures is a brand of LAX360 Pvt Ltd. [Confirm wording]' },
    ],
  },
}
