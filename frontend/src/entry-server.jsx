// Build-time entry: renders one route to an HTML string plus its head data.
// Used only by scripts/prerender.js — never shipped to the browser.
import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import App from './App.jsx'
import { site } from './data/site.js'

// Exposed so the prerender script can build Organization JSON-LD from the same company facts.
export { site }

async function streamToString(stream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let out = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out += decoder.decode(value, { stream: true })
  }
  return out + decoder.decode()
}

export async function render(url) {
  globalThis.__SSR_HEAD__ = null
  // `prerender` waits for lazy page chunks, so the output contains the real page content.
  const { prelude } = await prerender(
    <StrictMode>
      <LazyMotion features={domAnimation}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </LazyMotion>
    </StrictMode>,
  )
  return { html: await streamToString(prelude), head: globalThis.__SSR_HEAD__ }
}
