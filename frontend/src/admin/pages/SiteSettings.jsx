import { api } from '../../services/apiClient.js'
import SettingsForm from '../SettingsForm.jsx'
import { ErrorState, PageHeader, Spinner, useFetch } from '../ui.jsx'

export default function SiteSettings() {
  const { data, error, loading, reload } = useFetch(() => api('/api/admin/settings'), [])
  return (
    <>
      <PageHeader title="Website settings" lead="Company details, contact information, social links, footer text and maintenance mode. Leave a field empty to keep the website's built-in value. Settings here never include passwords or API keys." />
      {loading && !data && <Spinner />}
      {error && !data && <ErrorState error={error} onRetry={reload} />}
      {data && <SettingsForm endpoint="/api/admin/settings" payload={data} onSaved={reload} />}
    </>
  )
}
