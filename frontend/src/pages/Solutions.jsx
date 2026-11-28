import PageContainer from '../components/layout/PageContainer.jsx'
import SolutionsExplorer from '../components/solutions/SolutionsExplorer.jsx'
import { useSolutionIndex } from '../hooks/useSolutions.js'

/** /solutions — the whole Software & IT solutions portfolio on one page (category navigation, search and filters). The same explorer is part of the Products page and the Software & IT Services page. */
export default function Solutions() {
  const { solutions } = useSolutionIndex()
  return (
    <PageContainer path="/solutions" title="Software & IT Solutions Portfolio" description={`${solutions.length} software, web application, mobile app, website, API and AI agent solutions from LAX360 Pvt Ltd, each adapted to your business. Not listed? We build custom solutions too.`}>
      <section className="wrap pb-8 pt-10 md:pt-14" aria-labelledby="solutions-title">
        <p className="eyebrow text-lav">Software & IT solutions</p>
        <h1 id="solutions-title" className="h1 mt-3 !text-[clamp(2.2rem,4.6vw,4rem)]">Solutions for <span className="text-gradient">every kind of business.</span></h1>
        <p className="lead mt-5 max-w-3xl text-soft">Browse software, web applications, mobile apps, websites, APIs and AI agents. LAX360 provides these solutions and can customise them to your business requirements.</p>
      </section>
      <div className="wrap pb-12"><SolutionsExplorer idPrefix="sol" /></div>
    </PageContainer>
  )
}
