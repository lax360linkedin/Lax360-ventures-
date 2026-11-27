import { useMemo } from 'react'
import { useContent, useDatabaseItems } from './useSite.js'

const norm = (s) => String(s || '').trim().toLowerCase()

/**
 * The "Our Products" list of the IT & Software partnership pages with the administrator's changes (Admin > Services > Partner product list) laid over the built-in list:
 * nothing published = the built-in list. An entry with a "replaces" name swaps that entry in place (or hides it when Hidden is ticked); an entry with the exact name of a built-in one and
 * Hidden ticked hides it; any other entry is added to its group (a new group is created at the end).
 */
export function useProductCatalogue(catalogue, program) {
  const items = useContent('partner_product')
  const db = useDatabaseItems('partner_product', 'partner-products') // migrated: the lists live in the database, which is then the only source
  return useMemo(() => {
    if (db) {
      const groups = []
      for (const it of db) {
        const d = it.data || {}
        if (d.hidden === true || (d.program && program && d.program !== program)) continue
        const title = (d.group || 'More').trim()
        let g = groups.find((x) => norm(x.title) === norm(title))
        if (!g) { g = { title, items: [] }; groups.push(g) }
        g.items.push({ name: it.title, ...(d.description ? { desc: d.description } : {}), ...(d.tag ? { tag: d.tag } : {}), ...(d.link ? { to: d.link } : {}) })
      }
      return { ...catalogue, groups }
    }
    const groups = catalogue.groups.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i })) }))
    const find = (name) => { for (const g of groups) { const i = g.items.findIndex((x) => norm(x.name) === norm(name)); if (i >= 0) return [g, i] } return null }
    for (const it of items || []) {
      const d = it.data || {}
      const name = (it.title || '').trim()
      if (!name) continue
      const hidden = d.hidden === true
      const entry = { name, ...(d.description ? { desc: d.description } : {}), ...(d.link ? { to: d.link } : {}) }
      const target = find(d.replaces || (hidden ? name : ''))
      if (target) { const [g, i] = target; if (hidden) g.items.splice(i, 1); else g.items[i] = { ...g.items[i], ...entry } }
      else if (!hidden) {
        const title = (d.group || 'More').trim()
        let g = groups.find((x) => norm(x.title) === norm(title))
        if (!g) { g = { title, items: [] }; groups.push(g) }
        g.items.push(entry)
      }
    }
    return { ...catalogue, groups: groups.filter((g) => g.items.length) }
  }, [catalogue, items, db, program])
}
