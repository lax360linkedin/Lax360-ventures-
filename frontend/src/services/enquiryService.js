// Contact / enquiry submission → POST /api/contact (FastAPI). The backend validates again, rate-limits, and stores the
// enquiry in PostgreSQL. No email is sent by the backend, so the UI never claims one was.
import { api } from './apiClient.js'
import { trackEvent } from '../utils/analytics.js'

const EVENT_OF = { career: 'career_application', partnership: 'partner_enquiry', 'partner-franchise': 'partner_enquiry' }

/**
 * @param {object} payload { type, name, phone, email, company, message, extra, consent, branchId, website, source }
 * @returns {Promise<{ id: string|null, duplicate: boolean }>} rejects with ApiError (message safe to show; `fields` per field)
 */
export async function submitEnquiry({ type, name, phone, email, company, message, extra, consent, branchId, website, source, attachments }) {
  const res = await api('/api/contact', {
    method: 'POST',
    body: {
      name, email, message, consent,
      phone: phone || null,
      company: company || null,
      enquiry_type: type,
      branch_id: branchId || null,
      extra: extra || {},
      source: source || null,
      website: website || '',
      ...(attachments?.length ? { attachments } : {}),
    },
  })
  if (!res.duplicate) { // conversion events (no personal details are sent): one generic lead event and one named after the kind of form
    trackEvent('generate_lead', { lead_type: type, lead_source: source || 'website' })
    trackEvent(EVENT_OF[type] || 'contact_form_submit', { lead_type: type, lead_source: source || 'website' })
  }
  return { id: res.id, duplicate: res.duplicate }
}
