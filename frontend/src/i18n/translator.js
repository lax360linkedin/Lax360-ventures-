// Text translation without changing a single component. The website's English text is the key: a dictionary maps each English text (whitespace collapsed) to its translation, and this module
// replaces the text of the page with it (text nodes and the placeholder / title / alt / aria-label attributes), once and again whenever React changes the page. A text with no translation
// is left alone, so the English shows. The same normalisation and dictionaries are used by the build (scripts/prerender.js) to write translated HTML for each language URL.
export const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim()

const ATTRS = ['placeholder', 'title', 'alt', 'aria-label', 'aria-description']
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'SVG', 'IFRAME'])
const hasText = /\S/

let dict = new Map()
let observer = null
let queued = false
const pending = new Set()

/** Replace the dictionary ({ english: translation }). */
export function setDictionary(entries) { dict = new Map(Object.entries(entries || {})) }
/** The translation of an English text, or the text itself when there is none. */
export function tr(text) {
  const key = norm(text)
  return key && dict.has(key) ? dict.get(key) : text
}
export const hasTranslation = (text) => dict.has(norm(text))

const skipped = (el) => !el || SKIP.has(el.tagName) || (el.closest && el.closest('[translate="no"], [data-no-translate]'))

function translateTextNode(node) {
  const parent = node.parentElement
  if (!parent || skipped(parent) || !hasText.test(node.nodeValue)) return
  const raw = node.nodeValue
  const key = norm(raw)
  const t = dict.get(key)
  if (t === undefined || t === key) return
  const lead = /^\s*/.exec(raw)[0]
  const trail = /\s*$/.exec(raw)[0]
  node.nodeValue = lead + t + trail
}

function translateElementAttrs(el) {
  if (skipped(el)) return
  for (const a of ATTRS) {
    const v = el.getAttribute?.(a)
    if (v && hasText.test(v)) { const t = dict.get(norm(v)); if (t !== undefined && t !== v) el.setAttribute(a, t) }
  }
}

/** Translate everything under `root` (a node or the whole document body). */
export function translateTree(root) {
  if (!root || dict.size === 0) return
  if (root.nodeType === 3) { translateTextNode(root); return }
  if (root.nodeType !== 1) return
  translateElementAttrs(root)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 3) translateTextNode(n)
    else translateElementAttrs(n)
  }
}

function flush() {
  queued = false
  const nodes = [...pending]
  pending.clear()
  observer?.disconnect() // our own edits must not trigger another pass
  nodes.forEach((n) => { if (n.isConnected) translateTree(n) })
  observer?.observe(document.body, config)
}
const config = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS }
const schedule = (node) => { pending.add(node); if (!queued) { queued = true; queueMicrotask(flush) } }

/** Start translating the page and keep doing it as React updates it. Returns a stop function. */
export function startTranslating() {
  if (typeof document === 'undefined') return () => {}
  translateTree(document.body)
  observer?.disconnect()
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') r.addedNodes.forEach((n) => schedule(n))
      else if (r.type === 'characterData') schedule(r.target)
      else if (r.type === 'attributes') schedule(r.target)
    }
  })
  observer.observe(document.body, config)
  return () => { observer?.disconnect(); observer = null; pending.clear() }
}
