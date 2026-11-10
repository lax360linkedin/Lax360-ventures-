import { useMemo } from 'react'
import { useContent } from './useSite.js'
import { toLines, toParagraphs } from '../utils/cms.js'

export const websiteKinds = {
  client: { label: 'Client website', note: 'A live website built for a client. It belongs to that business.' },
  company: { label: 'LAX360 company website', note: 'A website of LAX360 Pvt Ltd or one of its group companies.' },
  demo: { label: 'Demonstration project', note: 'A sample website made by LAX360 to show what is possible. It is not a real business.' },
}

export const websiteTypes = {
  static: { label: 'Static website', note: 'A static website serves pages that are prepared in advance and shown as they are. It suits a showcase where the content seldom changes.' },
  dynamic: { label: 'Dynamic website', note: 'A dynamic website builds its pages from data when they are opened. It suits content that changes and is updated from a data source.' },
  web_app: { label: 'Web application', note: 'A web application lets visitors do things (sign in, manage records, place orders), not only read pages.' },
}

const TITLED = /^([^:]{2,70}):\s+(.+)$/
const titled = (text) => toLines(text).map((l) => { const m = TITLED.exec(l); return m ? { title: m[1], text: m[2] } : { title: l.replace(/\.$/, ''), text: '' } })

/** One portfolio entry in the shape the website pages use. Everything comes from the admin panel (Website content > Websites); nothing is built into the page. */
export function normaliseWebsite(item) {
  const d = item.data || {}
  const uploaded = [d.image, d.screenshot_1, d.screenshot_2, d.screenshot_3, d.screenshot_4, d.screenshot_5, d.screenshot_6].filter(Boolean)
  const builtIn = toLines(d.preview_paths)
  const images = [...uploaded, ...builtIn]
  return {
    id: item.id, slug: item.slug, name: item.title, category: d.category || 'Other', kind: websiteKinds[d.entry_kind] ? d.entry_kind : 'demo', type: websiteTypes[d.website_type] ? d.website_type : '',
    url: /^https?:\/\//.test(d.website_link || '') ? d.website_link : '', summary: d.summary || '', overview: toParagraphs(d.overview), typeReason: d.type_reason || '',
    features: titled(d.features), modules: titled(d.modules), responsive: toParagraphs(d.responsive), adminCms: toParagraphs(d.admin_cms), technologies: toLines(d.technologies),
    image: images[0] || '', screenshots: images, mobile: d.mobile_image || d.mobile_path || '', embed: d.embed_preview === true, featured: d.featured === true, order: item.sort_order || 0,
  }
}

/** The portfolio, featured entries first and then in the order set in the admin panel. Empty until entries are published there. */
export function useWebsites() {
  const items = useContent('website')
  return useMemo(() => (items || []).map(normaliseWebsite).sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order), [items])
}
