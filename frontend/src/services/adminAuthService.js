// Company-admin authentication: a separate login system from the public website (see backend/app/api/routes/admin_auth.py).
// Its session cookie is different and is only ever sent to /api/admin/*. Only the CSRF token is held (in memory) by the browser.
import { api } from './apiClient.js'

export const fetchAdminSession = () => api('/api/admin/auth/session') // identity + permissions + csrf_token, or 401
export const adminLogin = (email, password) => api('/api/admin/auth/login', { method: 'POST', body: { email, password } })
export const adminLogout = () => api('/api/admin/auth/logout', { method: 'POST' })
