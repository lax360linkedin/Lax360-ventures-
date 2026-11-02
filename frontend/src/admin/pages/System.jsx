import { useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { Badge, Btn, Card, ErrorState, PageHeader, Spinner, useFetch, useToast } from '../ui.jsx'

const NAMES = { connected: 'Connected', unavailable: 'Unavailable', configuration_missing: 'Configuration missing', not_tested: 'Not tested', not_implemented: 'Not implemented' }

export default function System() {
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => api('/api/admin/system'), [])
  const [testing, setTesting] = useState(false)
  const test = async () => {
    setTesting(true)
    try {
      const r = await api('/api/admin/system/test-ai', { method: 'POST' })
      toast(r.ok ? `AI provider answered in ${r.latency_ms} ms` : `AI test failed (${r.code})`, r.ok ? 'success' : 'error')
      reload()
    } catch (e) { toast(e.message, 'error') } finally { setTesting(false) }
  }
  return (
    <>
      <PageHeader title="System status" lead="“Connected” is shown only after a real check succeeded. Nothing here reveals passwords, keys or server internals."
        actions={<Btn onClick={reload} loading={loading && !!data}><RefreshCw className="size-4" aria-hidden="true" /> Refresh</Btn>} />
      {loading && !data && <Spinner />}
      {error && !data && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.items.map((i) => (
            <li key={i.key}>
              <Card className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Activity className="size-4 text-lav" aria-hidden="true" /> {i.label}</h2>
                  <Badge value={i.status} text={NAMES[i.status]} />
                </div>
                {i.model && <p className="mt-2 text-sm text-soft">Model: <span className="font-medium text-fg">{i.model}</span></p>}
                <p className="mt-2 text-sm text-soft">{i.detail}</p>
                {i.key === 'ai' && i.status !== 'configuration_missing' && <Btn className="mt-3" loading={testing} onClick={test}>Run test (one small real request)</Btn>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
