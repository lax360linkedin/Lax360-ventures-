import { Component } from 'react'

/**
 * Catches errors thrown while rendering its children (a failed lazy chunk after a deployment, a WebGL start-up failure, a bug) so ONE broken part never blanks the whole site.
 * `fallback` is a node, or `(error, reset) => node`. `onError(error)` is for privacy-safe reporting; it receives the error object only (never user data).
 * It does not retry by itself: the visitor decides (no infinite loops).
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) { return { error } }

  componentDidCatch(error) { try { this.props.onError?.(error) } catch { /* reporting must never throw */ } }

  componentDidUpdate(prev) { if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }) } // a new route / new game clears an old error

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    const { fallback } = this.props
    return typeof fallback === 'function' ? fallback(this.state.error, this.reset) : fallback ?? null
  }
}

/** The last-resort page: plain HTML and no dependency on any provider, so it works even when the rest of the app failed to start. */
export function SiteCrashPage({ error, reset }) {
  const stale = /dynamically imported module|Loading chunk|Failed to fetch dynamically|error loading dynamically/i.test(String(error?.message || error))
  return (
    <main role="alert" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 460 }}>
        <h1 style={{ fontSize: '1.5rem', margin: '0 0 .5rem' }}>{stale ? 'A newer version of this page is available' : 'Something went wrong on this page'}</h1>
        <p style={{ margin: '0 0 1.25rem', opacity: 0.8 }}>{stale ? 'Please reload to get the latest version of the website.' : 'The rest of the website is still working. You can try again, reload the page, or go back to the home page.'}</p>
        <p style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!stale && <button type="button" onClick={reset} style={{ minHeight: 44, padding: '0 1.1rem', borderRadius: 10, border: '1px solid currentColor', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>Try again</button>}
          <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: '0 1.1rem', borderRadius: 10, border: 0, background: '#2563eb', color: '#fff', cursor: 'pointer' }}>Reload the page</button>
          <a href="/" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 1.1rem', color: 'inherit' }}>Home page</a>
        </p>
      </div>
    </main>
  )
}
