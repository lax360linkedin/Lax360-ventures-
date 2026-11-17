import { Link } from 'react-router-dom'
import { api } from '../../services/apiClient.js'
import SettingsForm from '../SettingsForm.jsx'
import { ErrorState, PageHeader, Spinner, useFetch } from '../ui.jsx'

// These now live in the "Social media & contact" module (one list for the header, footer and Contact page), so they are not edited here any more.
const MOVED = new Set(['contact_email', 'contact_email_2', 'contact_phone_1', 'contact_phone_2', 'whatsapp_number', 'contact_address', 'social_instagram', 'social_linkedin', 'social_x', 'social_facebook', 'social_youtube'])

export default function SiteSettings() {
  const { data, error, loading, reload } = useFetch(() => api('/api/admin/settings'), [])
  return (
    <>
      <PageHeader title="Website settings" lead="Company details, contact information, social links, footer text and maintenance mode. Leave a field empty to keep the website's built-in value. Settings here never include passwords or API keys." />
      {loading && !data && <Spinner />}
      {error && !data && <ErrorState error={error} onRetry={reload} />}
      <p className="mb-4 rounded-xl border border-edge bg-glass p-3 text-sm">Phone numbers, emails, WhatsApp, addresses and social media links are now managed in <Link to="/company-admin/social-contact" className="font-semibold text-lav underline">Social media &amp; contact</Link>, where you can also choose where each one appears.</p>
      {data && <SettingsForm endpoint="/api/admin/settings" payload={{ ...data, fields: data.fields.filter((f) => !MOVED.has(f.key)) }} onSaved={reload} />}
    </>
  )
}
