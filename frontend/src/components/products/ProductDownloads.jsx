import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Download, FileText, Loader2, Lock, MonitorPlay, X } from 'lucide-react'
import Reveal from '../ui/Reveal.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import { api } from '../../services/apiClient.js'
import { useAuth } from '../../hooks/useAuth.js'

const TYPE = { demo_pdf: ['Demo PDF', MonitorPlay], brochure: ['Brochure', FileText], documentation: ['Documentation', BookOpen], other: ['Resource', FileText] }
const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/** Shown when a guest tries to download a login-only file. A native dialog: focus stays inside, Escape closes it. */
function LoginPrompt({ resource, onClose }) {
  const ref = useRef(null)
  const location = useLocation()
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal() }, [])
  const state = { from: location.pathname }
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose() }} aria-labelledby="dl-login-title"
      className="m-auto w-[min(28rem,calc(100vw-1.5rem))] rounded-3xl border border-edge-strong bg-night p-0 text-fg shadow-menu backdrop:bg-black/60 backdrop:backdrop-blur-sm">
      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white"><Lock className="size-6" aria-hidden="true" /></span>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-11 items-center justify-center rounded-full border border-edge-strong hover:border-lav"><X className="size-5" aria-hidden="true" /></button>
        </div>
        <h2 id="dl-login-title" className="mt-4 font-display text-2xl font-semibold">Log in to download</h2>
        <p className="mt-2 text-soft">“{resource.name}” is available to registered visitors. Log in, or create a free account, and you will come straight back to this page to download it.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/login" state={state} className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[var(--btn-hover)]">Log in</Link>
          <Link to="/register" state={state} className="inline-flex min-h-12 items-center justify-center rounded-full border border-edge-strong px-7 font-semibold transition-colors hover:border-lav">Create an account</Link>
        </div>
        <p className="mt-4 text-sm text-soft">You can still browse the product, its screenshots and the demo without logging in.</p>
      </div>
    </dialog>
  )
}

/**
 * "Downloads & documentation" for one product. Visitors see every file's name and size without logging in; a file marked "login required" asks guests to log in
 * first (with a clear prompt), and is then sent by the server only to a signed-in visitor: the page never has a link to the stored file.
 */
export default function ProductDownloads({ resources }) {
  const { user } = useAuth()
  const [prompt, setPrompt] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  if (!resources.length) return null

  const get = async (r) => {
    setError('')
    if (r.requiresLogin && !user) { setPrompt(r); return }
    setBusy(r.id)
    try {
      const { blob } = await api(`/api/products/resources/${r.id}/download`, { as: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: r.info?.filename || `${r.name}.pdf` })
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      if (e.code === 'login_required' || e.status === 401) setPrompt(r)
      else setError(e.message || 'The file could not be downloaded. Please try again.')
    } finally { setBusy('') }
  }

  return (
    <section className="wrap section" aria-labelledby="downloads-title">
      <SectionHeading id="downloads-title" eyebrow="Resources" title="Downloads and" gradient="documentation." lead="Demo PDFs, brochures and documentation for this product." />
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {resources.map((r, i) => {
          const [label, Icon] = TYPE[r.type] || TYPE.other
          const locked = r.requiresLogin && !user
          return (
            <Reveal as="li" key={r.id} delay={(i % 2) * 0.05} className="glass-flat lift flex items-start gap-4 p-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-lav"><Icon className="size-6" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-lav">{label}</p>
                <h3 className="font-display text-lg font-semibold leading-tight">{r.name}</h3>
                {r.description && <p className="mt-1 text-sm text-soft">{r.description}</p>}
                <p className="mt-1 text-xs text-soft">{r.info ? `PDF · ${size(r.info.size)}` : 'File'}{r.requiresLogin ? ' · login required' : ''}</p>
                <button type="button" onClick={() => get(r)} disabled={busy === r.id} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[var(--btn-hover)] disabled:opacity-60">
                  {busy === r.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : locked ? <Lock className="size-4" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
                  {locked ? 'Log in to download' : 'Download'}<span className="sr-only"> {r.name}</span>
                </button>
              </div>
            </Reveal>
          )
        })}
      </ul>
      {error && <p role="alert" className="mt-4 rounded-xl border border-error/50 bg-error/10 p-3 font-semibold text-error">{error}</p>}
      {prompt && <LoginPrompt resource={prompt} onClose={() => setPrompt(null)} />}
    </section>
  )
}
