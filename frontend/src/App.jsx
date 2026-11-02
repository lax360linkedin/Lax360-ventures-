import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import RootLayout from './components/layout/RootLayout.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'
import Home from './pages/Home.jsx'

// All pages except Home are code-split.
const About = lazy(() => import('./pages/About.jsx'))
const Services = lazy(() => import('./pages/Services.jsx'))
const ServiceDetail = lazy(() => import('./pages/ServiceDetail.jsx'))
const Solutions = lazy(() => import('./pages/Solutions.jsx'))
const Projects = lazy(() => import('./pages/Projects.jsx'))
const Academy = lazy(() => import('./pages/Academy.jsx'))
const Career = lazy(() => import('./pages/Career.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const Privacy = lazy(() => import('./pages/Privacy.jsx'))
const Terms = lazy(() => import('./pages/Terms.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const DemoRequest = lazy(() => import('./pages/DemoRequest.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx')) // separate chunk: public visitors never download it

/** The admin panel used to live at /admin/*. Old bookmarks and links keep working: they are sent to the same page under /company-admin. */
function LegacyAdminRedirect() {
  const { pathname, search } = useLocation()
  const rest = pathname.replace(/^\/admin\/?/, '')
  const mapped = rest === '' ? 'dashboard' : rest === 'hero-videos' ? 'homepage-videos' : rest
  return <Navigate to={`/company-admin/${mapped}${search}`} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Company admin: a separate login system with its own layout (no public header/footer/chatbot). Every API call behind it is authorised on the server. */}
      <Route path="company-admin/*" element={<Suspense fallback={null}><AdminApp /></Suspense>} />
      <Route path="admin/*" element={<LegacyAdminRedirect />} />
      <Route element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="services" element={<Services />} />
        <Route path="services/:slug" element={<ServiceDetail />} />
        <Route path="solutions" element={<Solutions />} />
        <Route path="work" element={<Projects />} />
        <Route path="training" element={<Academy />} />
        <Route path="career" element={<Career />} />
        <Route path="contact" element={<Contact />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        {/* Signed-in customers only (public-website session). Not prerendered or in the sitemap. */}
        <Route path="user/dashboard" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="user" element={<Navigate to="/user/dashboard" replace />} />
        <Route path="profile" element={<Navigate to="/user/dashboard" replace />} />
        <Route path="demo" element={<RequireAuth><DemoRequest /></RequireAuth>} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        {/* Names used in the brief map onto the planning document's canonical URLs. */}
        <Route path="projects" element={<Navigate to="/work" replace />} />
        <Route path="academy" element={<Navigate to="/training" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
