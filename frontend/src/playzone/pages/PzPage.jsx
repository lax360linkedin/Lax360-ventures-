import { useEffect } from 'react'
import PageContainer from '../../components/layout/PageContainer.jsx'
import { warmBackend } from '../../services/backendWake.js'
import '../playzone.css'

/** Every Play Zone page: the website's usual page wrapper (head, entrance) around the Play Zone's own scene. Kept out of search results (noindex) until the release is approved; remove the flag then. */
export default function PzPage({ path, title, description, children }) {
  useEffect(() => { warmBackend() }, []) // a sleeping backend (cold start) starts waking as soon as someone opens the Play Zone, before the first score or login request needs it
  return (
    <PageContainer path={path} title={title} description={description} noindex>
      <div className="pz">{children}</div>
    </PageContainer>
  )
}
