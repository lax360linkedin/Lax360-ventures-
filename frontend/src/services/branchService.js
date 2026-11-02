import { api } from './apiClient.js'

/** Branches from the database (ids are what the forms submit). Not cached across failures. */
export const fetchBranches = () => api('/api/branches')
export const createDemoRequest = (payload) => api('/api/demo-requests', { method: 'POST', body: payload })
export const fetchMyDemoRequests = () => api('/api/demo-requests/me')
