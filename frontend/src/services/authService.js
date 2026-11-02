// Real authentication against the FastAPI backend (see backend/app/api/routes/auth.py).
// The session lives in an HttpOnly cookie that JavaScript cannot read; only the CSRF token is held in memory.
import { api } from './apiClient.js'

export const fetchSession = () => api('/api/auth/me') // { user, csrf_token } or 401
export const login = (email, password) => api('/api/auth/login', { method: 'POST', body: { email, password } })
export const register = ({ fullName, email, password }) => api('/api/auth/register', { method: 'POST', body: { full_name: fullName, email, password } })
export const logout = () => api('/api/auth/logout', { method: 'POST' })
export const updateProfile = (fullName) => api('/api/users/me', { method: 'PATCH', body: { full_name: fullName } })
