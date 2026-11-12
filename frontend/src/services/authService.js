// Real authentication against the FastAPI backend (see backend/app/api/routes/auth.py).
// The session lives in an HttpOnly cookie that JavaScript cannot read; only the CSRF token is held in memory.
import { api } from './apiClient.js'

export const fetchSession = () => api('/api/auth/me') // { user, csrf_token } or 401
export const login = (email, password) => api('/api/auth/login', { method: 'POST', body: { email, password } })
export const register = ({ fullName, email, password, details = {} }) => api('/api/auth/register', { method: 'POST', body: { full_name: fullName, email, password, ...details } })
export const myProfile = () => api('/api/users/me/profile')
export const saveMyProfile = (details) => api('/api/users/me/profile', { method: 'PUT', body: details })
export const logout = () => api('/api/auth/logout', { method: 'POST' })
export const updateProfile = (fullName) => api('/api/users/me', { method: 'PATCH', body: { full_name: fullName } })
export const forgotPassword = (email) => api('/api/auth/forgot-password', { method: 'POST', body: { email } })
export const resetPassword = (token, newPassword) => api('/api/auth/reset-password', { method: 'POST', body: { token, new_password: newPassword } })
export const changePassword = (current, next) => api('/api/users/me/password', { method: 'POST', body: { current_password: current, new_password: next } })
export const myEnquiries = () => api('/api/contact/mine')
export const myDemoRequests = () => api('/api/demo-requests/me')
