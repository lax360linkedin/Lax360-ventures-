import { useEffect, useMemo } from 'react'
import { useContent } from '../../hooks/useSite.js'

const ORIG = 'imgOrig'
const SWAPPED = 'imgSwapped'

/** The path of a picture that belongs to this website (/assets/...), or null for anything else (uploaded pictures, other sites). */
const pathOf = (src) => {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return null
  try {
    const u = new URL(src, window.location.origin)
    return u.origin === window.location.origin ? u.pathname : null
  } catch { return null }
}

/** Point one <img> at its replacement (or back at the built-in picture). Only the file changes: the element, its size, crop, position and animation stay exactly as they are. */
function swap(img, map) {
  const current = img.getAttribute('src')
  // if the page itself changed the picture since we swapped it (a carousel moving on), the new value is the built-in one to look up
  const orig = img.dataset[SWAPPED] && current === img.dataset[SWAPPED] ? img.dataset[ORIG] : current
  const url = map.get(pathOf(orig))
  if (url) {
    img.dataset[ORIG] = orig
    img.dataset[SWAPPED] = url
    if (current !== url) { img.removeAttribute('srcset'); img.setAttribute('src', url) }
  } else if (img.dataset[SWAPPED]) {
    if (current === img.dataset[SWAPPED]) img.setAttribute('src', img.dataset[ORIG]) // the replacement was removed: the built-in picture is back
    delete img.dataset[ORIG]
    delete img.dataset[SWAPPED]
  }
}

/**
 * Replaced website pictures (admin panel: Pages). The built-in pictures live in /assets/...; an administrator can replace any one of them and the replacement is stored against that path.
 * This keeps every <img> that shows such a path pointing at its replacement, whichever page or section draws it, so replacing a picture never touches the layout, the crop or the animation around
 * it. Nothing happens when no picture has been replaced. Renders nothing.
 */
export default function ImageOverrides() {
  const items = useContent('site_image')
  const map = useMemo(() => new Map((items || []).filter((i) => i.data?.key && i.data?.image).map((i) => [i.data.key, i.data.image])), [items])

  useEffect(() => {
    const swapped = () => document.querySelectorAll('img[data-img-swapped]')
    if (!map.size) { swapped().forEach((img) => swap(img, map)); return undefined } // everything restored: put the built-in pictures back
    let frame = 0
    const run = () => { frame = 0; document.querySelectorAll('img').forEach((img) => swap(img, map)) }
    const queue = () => { if (!frame) frame = window.requestAnimationFrame(run) }
    run()
    const observer = new MutationObserver(queue)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] })
    return () => { observer.disconnect(); if (frame) window.cancelAnimationFrame(frame) }
  }, [map])
  return null
}
