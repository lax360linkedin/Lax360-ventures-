import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import RootLayout from './components/layout/RootLayout.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'
import Home from './pages/Home.jsx'

// All pages except Home are code-split.
const About = lazy(() => import('./pages/About.jsx'))
const Services = lazy(() => import('./pages/Services.jsx'))
const ServiceDetail = lazy(() => import('./pages/ServiceDetail.jsx'))
const ServiceItem = lazy(() => import('./pages/ServiceItem.jsx'))
const Products = lazy(() => import('./pages/Products.jsx'))
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'))
const Industries = lazy(() => import('./pages/Industries.jsx'))
const IndustryDetail = lazy(() => import('./pages/IndustryDetail.jsx'))
const Insights = lazy(() => import('./pages/Insights.jsx'))
const ArticleDetail = lazy(() => import('./pages/ArticleDetail.jsx'))
const Network = lazy(() => import('./pages/Network.jsx'))
const Websites = lazy(() => import('./pages/Websites.jsx'))
const EmergingTech = lazy(() => import('./pages/EmergingTech.jsx')) // Robotics and Blockchain: planned initiatives
const WebsiteDetail = lazy(() => import('./pages/WebsiteDetail.jsx'))
const Team = lazy(() => import('./pages/Team.jsx'))
const TeamDepartment = lazy(() => import('./pages/TeamDepartment.jsx'))
const NetworkPartner = lazy(() => import('./pages/NetworkPartner.jsx'))
const Projects = lazy(() => import('./pages/Projects.jsx'))
const Career = lazy(() => import('./pages/Career.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const Privacy = lazy(() => import('./pages/Privacy.jsx'))
const Terms = lazy(() => import('./pages/Terms.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
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
        <Route path="services/:slug/:service" element={<ServiceItem />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:slug" element={<ProductDetail />} />
        <Route path="industries" element={<Industries />} />
        <Route path="industries/:slug" element={<IndustryDetail />} />
        <Route path="insights" element={<Insights />} />
        <Route path="insights/:slug" element={<ArticleDetail />} />
        <Route path="our-network" element={<Network />} />
        <Route path="our-network/:slug" element={<NetworkPartner />} />
        <Route path="robotics" element={<EmergingTech topic="robotics" />} />
        <Route path="blockchain" element={<EmergingTech topic="blockchain" />} />
        <Route path="websites" element={<Websites />} />
        <Route path="websites/:slug" element={<WebsiteDetail />} />
        <Route path="our-team" element={<Team />} />
        <Route path="our-team/:dept" element={<TeamDepartment />} />
        <Route path="work" element={<Projects />} />
        <Route path="career" element={<Career />} />
        <Route path="contact" element={<Contact />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        {/* Signed-in customers only (public-website session). Not prerendered or in the sitemap. */}
        <Route path="user/dashboard" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="user" element={<Navigate to="/user/dashboard" replace />} />
        <Route path="profile" element={<Navigate to="/user/dashboard" replace />} />
        <Route path="demo" element={<RequireAuth><DemoRequest /></RequireAuth>} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        {/* Names used in the brief map onto the planning document's canonical URLs. */}
        <Route path="projects" element={<Navigate to="/work" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
