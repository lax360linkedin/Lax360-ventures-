import { useMemo } from 'react'
import { useContent } from './useSite.js'
import { builtInServiceCards } from '../data/serviceCards.js'

export const serviceCarouselSpeeds = { slow: 28, normal: 48, fast: 80 } // px per second of automatic movement

/** The cards and settings of the Services & industries carousel (Admin Panel > Services carousel). The built-in cards (data/serviceCards.js) are only a stand-in while the server's
 *  content is unavailable or has no card; once it has, exactly its enabled cards are shown, in its order. */
export function useServiceCarousel() {
  const cards = useContent('service_card')
  const page = useContent('service_carousel_page')?.[0]?.data
  return useMemo(() => {
    const items = cards
      ? cards.filter((c) => c.data.enabled !== false && (c.data.image || c.data.builtin_image)).map((c) => ({
        id: c.id, title: c.title, tag: c.data.tag || '', text: c.data.description || '', href: c.data.link || '', label: c.data.link_label || 'Explore more', image: c.data.image || c.data.builtin_image, alt: c.data.image_alt || '',
      }))
      : builtInServiceCards
    const p = page || {}
    return {
      items,
      config: {
        enabled: p.enabled !== false, eyebrow: p.eyebrow ?? 'What we do', title: p.title ?? 'Services &', accent: p.title_accent ?? 'Industries', lead: p.lead ?? '',
        scroll: p.scroll !== false, speed: serviceCarouselSpeeds[p.speed] || serviceCarouselSpeeds.normal, pauseOnHover: p.pause_on_hover !== false,
      },
    }
  }, [cards, page])
}
