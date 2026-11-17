import { trackEvent } from '../utils/analytics.js'
import { api } from './apiClient.js'

/** Branches from the database (ids are what the forms submit). Components that ask at the same moment (the header, the footer, a form) share ONE request; a failure is not remembered. */
let inFlight = null
export const fetchBranches = () => {
  if (!inFlight) inFlight = api('/api/branches').catch((e) => { inFlight = null; throw e })
  return inFlight
}
export const createDemoRequest = (payload) => api('/api/demo-requests', { method: 'POST', body: payload }).then((r) => { trackEvent('demo_request', { interest: payload.interest || undefined }); return r })
export const fetchMyDemoRequests = () => api('/api/demo-requests/me')
