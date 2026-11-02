// Contact / enquiry submission → POST /api/contact (FastAPI). The backend validates again, rate-limits, and stores the
// enquiry in PostgreSQL. No email is sent by the backend, so the UI never claims one was.
import { api } from './apiClient.js'

/**
 * @param {object} payload { type, name, phone, email, company, message, extra, consent, branchId, website, source }
 * @returns {Promise<{ id: string|null, duplicate: boolean }>} rejects with ApiError (message safe to show; `fields` per field)
 */
export async function submitEnquiry({ type, name, phone, email, company, message, extra, consent, branchId, website, source }) {
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
    },
  })
  return { id: res.id, duplicate: res.duplicate }
}
