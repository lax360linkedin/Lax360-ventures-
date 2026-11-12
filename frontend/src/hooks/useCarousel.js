import { useMemo } from 'react'
import { useContent } from './useSite.js'

export const carouselSpeeds = { slow: 34, normal: 60, fast: 100 } // px per second of automatic movement

/** The home-page image carousel: pictures and heading managed in the admin panel (Image carousel). Nothing is built into the page: with no picture switched on, the section is not shown. */
export function useCarousel() {
  const pictures = useContent('carousel_image')
  const page = useContent('carousel_page')?.[0]?.data
  return useMemo(() => {
    const seen = new Set()
    const items = (pictures || [])
      .filter((i) => i.data.enabled !== false && (i.data.image || i.data.image_path))
      .map((i) => ({ id: i.id, name: i.title, src: i.data.image || i.data.image_path, alt: i.data.alt || '', caption: i.data.caption || '', portrait: i.data.shape === 'portrait', sample: i.data.sample === true }))
      .filter((i) => !seen.has(i.src) && seen.add(i.src)) // the same picture is shown once, even if the content holds it twice
    const p = page || {}
    return {
      items,
      config: {
        enabled: p.enabled !== false, eyebrow: p.eyebrow || '', title: p.title || '', accent: p.title_accent || '', lead: p.lead || '',
        speed: carouselSpeeds[p.speed] || carouselSpeeds.normal, pauseOnHover: p.pause_on_hover !== false,
      },
    }
  }, [pictures, page])
}
