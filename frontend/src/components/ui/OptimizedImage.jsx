import { useState } from 'react'

// One image component for photographs that come from the CMS (team, gallery, page images). It adds, without changing how a page looks:
//  - responsive sizes + WebP/AVIF through Vercel Image Optimization, for images stored in Supabase Storage on the production site (see `images` in vercel.json). Anywhere else (local development,
//    files served by the API, static /assets files that are already WebP) the original URL is used unchanged;
//  - if the optimised URL fails for any reason, it falls back to the original once, so a photograph never disappears because of the optimiser;
//  - explicit width/height (no layout shift), a soft placeholder until the picture has loaded, lazy loading by default and eager + high priority for `priority` images (the main picture above the fold).
const WIDTHS = [320, 480, 640, 800, 960, 1280, 1600] // must match `images.sizes` in vercel.json
const SUPABASE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i
const onProduction = () => typeof window !== 'undefined' && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) && import.meta.env.PROD

export const canOptimise = (src) => typeof src === 'string' && SUPABASE.test(src) && onProduction()
export const optimisedUrl = (src, w) => `/_vercel/image?url=${encodeURIComponent(src)}&w=${w}&q=75`

export default function OptimizedImage({ src, alt = '', width, height, sizes, priority = false, widths = WIDTHS, className = '', ...rest }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const optimise = !failed && canOptimise(src)
  const maxW = Number(width) || 1600
  const set = optimise ? widths.filter((w) => w <= Math.max(maxW * 2, 640)) : []
  const usable = set.length ? set : widths.slice(0, 3)
  return (
    <img
      src={optimise ? optimisedUrl(src, usable[Math.min(usable.length - 1, 2)] ?? usable[0]) : src}
      srcSet={optimise ? usable.map((w) => `${optimisedUrl(src, w)} ${w}w`).join(', ') : undefined}
      sizes={optimise ? sizes || `${maxW}px` : undefined}
      alt={alt} width={width} height={height}
      loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async"
      onLoad={() => setLoaded(true)} onError={() => { if (optimise) setFailed(true) }}
      className={`${className} ${loaded ? '' : 'animate-pulse bg-edge/40'}`}
      {...rest}
    />
  )
}
