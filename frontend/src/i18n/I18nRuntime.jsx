import { useLayoutEffect } from 'react'
import { useLang } from './store.js'
import { langOf } from './languages.js'
import { setDictionary, startTranslating } from './translator.js'

/** Keeps the page in the visitor's language (renders nothing): the <html lang> attribute, and the text translation (translator.js) for every language except English. */
export default function I18nRuntime() {
  const lang = useLang()
  useLayoutEffect(() => {
    document.documentElement.lang = langOf(lang).htmlLang
    if (lang === 'en') { setDictionary({}); return undefined }
    return startTranslating() // the dictionary is already loaded (main.jsx and the language selector load it before switching)
  }, [lang])
  return null
}
