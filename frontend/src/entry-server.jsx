// Build-time entry: renders one route to an HTML string plus its head data.
// Used only by scripts/prerender.js — never shipped to the browser.
import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import App from './App.jsx'
import { site } from './data/site.js'

// Exposed so the prerender script can build Organization JSON-LD from the same company facts, and set the dictionary of the language being rendered inside THIS bundle (the head text is translated while rendering).
export { site }
export { setDictionary } from './i18n/translator.js'

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

export async function render(url, lang = 'en') {
  globalThis.__SSR_HEAD__ = null
  globalThis.__LANG__ = lang // the language of the page being rendered (see src/i18n/store.js)
  const prefix = lang === 'en' ? '' : `/${lang}`
  // `prerender` waits for lazy page chunks, so the output contains the real page content.
  const { prelude } = await prerender(
    <StrictMode>
      <LazyMotion features={domAnimation}>
        <StaticRouter location={prefix + (url === '/' ? '' : url) || '/'} basename={prefix || '/'}>
          <App />
        </StaticRouter>
      </LazyMotion>
    </StrictMode>,
  )
  return { html: await streamToString(prelude), head: globalThis.__SSR_HEAD__ }
}
