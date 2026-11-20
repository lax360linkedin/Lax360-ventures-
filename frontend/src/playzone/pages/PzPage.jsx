import PageContainer from '../../components/layout/PageContainer.jsx'
import '../playzone.css'

/** Every Play Zone page: the website's usual page wrapper (head, entrance) around the Play Zone's own scene. Not indexed by search engines while the Play Zone is in development. */
export default function PzPage({ path, title, description, children }) {
  return (
    <PageContainer path={path} title={title} description={description} noindex>
      <div className="pz">{children}</div>
    </PageContainer>
  )
}
