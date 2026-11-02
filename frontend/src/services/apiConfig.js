// Central API configuration.
//
// VITE_API_BASE_URL is the backend's public base URL and nothing else — it is visible in the browser, so it must
// never hold a secret (the OpenAI key, database password and auth secret live only in backend/.env).
// Leave it empty to call the same origin (`/api/...`): in development Vite proxies that to the FastAPI backend, and in
// production a reverse proxy can route `/api` to it. Set it (e.g. https://api.example.com) only for a separate API host.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const apiUrl = (path) => `${API_BASE_URL}${path}`
