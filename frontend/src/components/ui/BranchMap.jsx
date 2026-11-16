import { useState } from 'react'
import { parseMapEmbed } from '../../utils/mapEmbed.js'

/**
 * An interactive Google Map of a branch, framed safely: only an https Google Maps embed address is accepted (anything else renders nothing), the frame is sandboxed (scripts and links
 * the map itself needs, no access to this site), loaded lazily and sends no full referrer. Responsive: it fills the width it is given at a 4:3 ratio (taller on phones for easy panning).
 */
export default function BranchMap({ src, title, className = '' }) {
  const url = parseMapEmbed(src)
  const [loaded, setLoaded] = useState(false)
  if (!url) return null
  return (
    <div className={`ct-map-wrap overflow-hidden rounded-2xl border border-edge bg-glass ${className}`} data-loaded={loaded || undefined}>
      <iframe
        src={url}
        title={title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        className="ct-map block aspect-[4/3] w-full border-0 sm:aspect-[16/10] md:aspect-[4/3]"
      />
    </div>
  )
}
