import { Link } from 'react-router-dom'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/ui/Button.jsx'
import { allDivisions } from '../data/services.js'

export default function NotFound() {
  return (
    <PageContainer path="/404" noindex title="Page not found" description="The page you were looking for could not be found.">
      <section className="wrap section">
        <p className="eyebrow text-accent">Error 404</p>
        <h1 className="h1 mt-4">This page took a wrong turn.</h1>
        <p className="lead mt-6 text-soft">The link may be broken or the page may have moved. Here are some ways back.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button to="/" arrow>Back to Home</Button>
          <Button to="/services" variant="secondary">Explore Services</Button>
          <Button to="/contact" variant="secondary">Contact us</Button>
        </div>
        <ul className="mt-14 divide-y divide-edge border-y border-edge">
          {allDivisions.map((d) => (
            <li key={d.slug}><Link to={d.to} className="flex min-h-14 items-center gap-6 py-3 font-display text-xl font-semibold hover:underline"><span className="text-lav">{d.number}</span>{d.name}</Link></li>
          ))}
        </ul>
      </section>
    </PageContainer>
  )
}
