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
const Solutions = lazy(() => import('./pages/Solutions.jsx')) // the Software & IT solutions portfolio
const SolutionDetail = lazy(() => import('./pages/SolutionDetail.jsx'))
const Websites = lazy(() => import('./pages/Websites.jsx'))
const UpcomingService = lazy(() => import('./pages/UpcomingService.jsx')) // CAD & Engineering, Robotics, Blockchain & Web 3.0: upcoming service categories (admin-managed)
const WebsiteDetail = lazy(() => import('./pages/WebsiteDetail.jsx'))
const Team = lazy(() => import('./pages/Team.jsx'))
const TeamDepartment = lazy(() => import('./pages/TeamDepartment.jsx'))
const NetworkPartner = lazy(() => import('./pages/NetworkPartner.jsx'))
const Projects = lazy(() => import('./pages/Projects.jsx'))
const Career = lazy(() => import('./pages/Career.jsx'))
const PartnerHub = lazy(() => import('./pages/PartnerHub.jsx')) // Partner With Us: its own chunks, loaded only on the partnership routes
const PartnerCategory = lazy(() => import('./pages/PartnerCategory.jsx'))
const PartnerOpportunity = lazy(() => import('./pages/PartnerOpportunity.jsx'))
const PartnerApply = lazy(() => import('./pages/PartnerApply.jsx'))
const PartnerInfo = lazy(() => import('./pages/PartnerInfo.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const Locations = lazy(() => import('./pages/Locations.jsx'))
const Location = lazy(() => import('./pages/Location.jsx'))
const Privacy = lazy(() => import('./pages/Privacy.jsx'))
const Terms = lazy(() => import('./pages/Terms.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const DemoRequest = lazy(() => import('./pages/DemoRequest.jsx'))
const PlayZoneHome = lazy(() => import('./playzone/pages/PlayZoneHome.jsx')) // LAX360 Play Zone (Milestone 1): its own chunks, loaded only when a visitor opens /play-zone
const PlayZoneGame = lazy(() => import('./playzone/pages/PlayZoneGame.jsx'))
const PlayZoneLeaderboard = lazy(() => import('./playzone/pages/PlayZoneLeaderboard.jsx'))
const PlayZoneProfile = lazy(() => import('./playzone/pages/PlayZoneProfile.jsx'))
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
        <Route path="solutions" element={<Solutions />} />
        <Route path="solutions/:slug" element={<SolutionDetail />} />
        <Route path="our-network" element={<Network />} />
        <Route path="our-network/:slug" element={<NetworkPartner />} />
        <Route path="artificial-intelligence" element={<UpcomingService slug="ai" />} />
        <Route path="cad-engineering" element={<UpcomingService slug="cad-engineering" />} />
        <Route path="robotics" element={<UpcomingService slug="robotics" />} />
        <Route path="blockchain" element={<UpcomingService slug="blockchain" />} />
        <Route path="upcoming/:slug" element={<UpcomingService />} />
        <Route path="locations" element={<Locations />} />
        <Route path="locations/:slug" element={<Location />} />
        <Route path="websites" element={<Websites />} />
        <Route path="websites/:slug" element={<WebsiteDetail />} />
        <Route path="our-team" element={<Team />} />
        <Route path="our-team/:dept" element={<TeamDepartment />} />
        <Route path="work" element={<Projects />} />
        <Route path="career" element={<Career />} />
        <Route path="partner-with-us" element={<PartnerHub />} />
        <Route path="partner-with-us/apply" element={<PartnerApply />} />
        <Route path="partner-with-us/faq" element={<PartnerInfo kind="faq" />} />
        <Route path="partner-with-us/privacy-policy" element={<PartnerInfo kind="privacy" />} />
        <Route path="partner-with-us/terms-and-conditions" element={<PartnerInfo kind="terms" />} />
        <Route path="franchise" element={<PartnerCategory category="franchise" />} />
        <Route path="franchise/:division" element={<PartnerOpportunity category="franchise" />} />
        <Route path="authorized-partner" element={<PartnerCategory category="authorized-partner" />} />
        <Route path="authorized-partner/:division" element={<PartnerOpportunity category="authorized-partner" />} />
        <Route path="referral-partner" element={<PartnerCategory category="referral-partner" />} />
        <Route path="referral-partner/:division" element={<PartnerOpportunity category="referral-partner" />} />
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
        <Route path="play-zone" element={<PlayZoneHome />} />
        <Route path="play-zone/leaderboard" element={<PlayZoneLeaderboard />} />
        <Route path="play-zone/profile" element={<PlayZoneProfile />} />
        <Route path="play-zone/:game" element={<PlayZoneGame />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        {/* Names used in the brief map onto the planning document's canonical URLs. */}
        <Route path="projects" element={<Navigate to="/work" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
