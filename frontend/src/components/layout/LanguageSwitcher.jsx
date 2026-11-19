import { useEffect, useId, useRef, useState } from 'react'
import { Check, Globe } from 'lucide-react'
import { LANGUAGES, langOf } from '../../i18n/languages.js'
import { setLang, useLang } from '../../i18n/store.js'
import { loadDictionary } from '../../i18n/dictionary.js'
import { setDictionary } from '../../i18n/translator.js'

/** Switch language: the dictionary is loaded first, then the address and the page change together (no reload, no flash of English). */
export async function chooseLanguage(code) {
  if (code === 'en') setDictionary({})
  else await loadDictionary(code).catch(() => {})
  setLang(code)
}

/**
 * The language selector: a globe button with the current language, opening a small menu of the website's languages (their own names, so everyone can find theirs). `variant="list"` is the
 * mobile menu's version: the languages as buttons in a row. The language names are never translated.
 */
export default function LanguageSwitcher({ variant = 'menu', className = '' }) {
  const lang = useLang()
  const cur = langOf(lang)
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); wrap.current?.querySelector('button')?.focus() } }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (variant === 'list') {
    return (
      <div className={className} translate="no" role="group" aria-label="Language">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-soft"><Globe className="size-4 text-lav" aria-hidden="true" />Language</p>
        <ul className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button type="button" lang={l.htmlLang} aria-pressed={l.code === lang} onClick={() => chooseLanguage(l.code)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-base font-semibold transition-colors ${l.code === lang ? 'border-primary bg-primary/20 text-fg' : 'border-edge-strong bg-glass text-soft hover:border-lav hover:text-fg'}`}>
                {l.code === lang && <Check className="size-4 text-lav" aria-hidden="true" />}{l.native}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div ref={wrap} className={`relative ${className}`} translate="no">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={`Language: ${cur.name}. Change language`}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 text-xs font-medium transition-colors hover:text-lav focus-visible:text-lav">
        <Globe className="size-4 text-lav" aria-hidden="true" /><span lang={cur.htmlLang}>{cur.native}</span>
      </button>
      {open && (
        <ul id={id} role="menu" aria-label="Choose a language" className="absolute right-0 top-full z-50 mt-1 min-w-40 rounded-xl border border-edge-strong bg-night/95 p-1.5 text-sm shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {LANGUAGES.map((l) => (
            <li key={l.code} role="none">
              <button type="button" role="menuitemradio" aria-checked={l.code === lang} lang={l.htmlLang} onClick={() => { setOpen(false); chooseLanguage(l.code) }}
                className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-medium text-fg transition-colors hover:bg-tint/10 focus-visible:bg-tint/10">
                <span>{l.native}<span className="ml-2 text-xs text-soft">{l.name !== l.native ? l.name : ''}</span></span>{l.code === lang && <Check className="size-4 text-lav" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
