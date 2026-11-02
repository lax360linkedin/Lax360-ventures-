import { useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

/**
 * Route guard. Waits for the backend session check, then: signed-out visitors go to /login and return to the page
 * afterwards; if the user signs out (or the session expires) while on a guarded page they are sent Home / to log in.
 * This only controls what the browser shows — every protected API call is checked again on the server.
 */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()
  const wasSignedIn = useRef(Boolean(user))
  if (loading) return <div className="wrap section min-h-[50vh]" role="status"><p className="text-soft">Checking your session…</p></div>
  if (user) {
    wasSignedIn.current = true
    return children
  }
  if (wasSignedIn.current) return <Navigate to="/" replace />
  return <Navigate to="/login" replace state={{ from: pathname }} />
}
