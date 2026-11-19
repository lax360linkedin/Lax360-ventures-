// Dictionaries: the translations shipped with the website (catalogs/<code>.json, loaded only for the language in use) plus the ones administrators saved (GET /api/public/translations/<code>), which win.
import { api } from '../services/apiClient.js'
import { setDictionary } from './translator.js'

const loaders = import.meta.glob('./catalogs/*.json') // one lazy chunk per language

/** Load the dictionary of a language and install it. Resolves when the shipped translations are in (the admin ones follow without blocking). */
export async function loadDictionary(code, onUpdate) {
  const file = loaders[`./catalogs/${code}.json`]
  const shipped = file ? (await file()).default : {}
  setDictionary(shipped)
  api(`/api/public/translations/${code}`).then((r) => { setDictionary({ ...shipped, ...(r.strings || {}) }); onUpdate?.() }).catch(() => {}) // the website works without the server's list
  return shipped
}
