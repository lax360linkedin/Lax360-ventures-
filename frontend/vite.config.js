import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Dev only: forward /api to the FastAPI backend so the browser sees one origin (cookies just work, no CORS).
  // Override with DEV_API_PROXY_TARGET in .env.local if your backend is not on localhost:8000.
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.DEV_API_PROXY_TARGET || 'http://localhost:8000'
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy: { '/api': { target, changeOrigin: false } } },
    preview: { proxy: { '/api': { target, changeOrigin: false } } }, // `vite preview` (the production build, for measuring) talks to the same backend
  }
})
