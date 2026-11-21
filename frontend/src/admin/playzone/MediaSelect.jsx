import { Link } from 'react-router-dom'
import { Select, useFetch } from '../ui.jsx'
import { pz } from './shared.jsx'

/** Pick one of the Play Zone images (uploaded in "Game media"). The value is the media id; empty means none. */
export default function MediaSelect({ id, value, onChange, purpose, label = 'image' }) {
  const { data, error, loading } = useFetch(() => pz('/media', { params: { purpose, page_size: 100 } }), [purpose])
  const items = data?.items || []
  const current = items.find((m) => m.id === value)
  return (
    <div>
      <Select id={id} value={value || ''} onChange={(e) => onChange(e.target.value || null)} disabled={loading && !data} aria-label={`Choose ${label}`}>
        <option value="">None</option>
        {value && !current && <option value={value}>Current {label}</option>}
        {items.map((m) => <option key={m.id} value={m.id}>{m.label || m.filename}</option>)}
      </Select>
      {current && <img src={current.url} alt="" loading="lazy" className="mt-2 h-20 rounded-lg border border-edge object-cover" />}
      {error && <p className="mt-1 text-xs text-error" role="alert">Could not load the image list.</p>}
      {data && items.length === 0 && <p className="mt-1 text-xs text-soft">No images uploaded for this yet. <Link className="underline" to="/company-admin/play-zone/media">Upload in Game media</Link>.</p>}
    </div>
  )
}
