import { Globe, Link2 } from 'lucide-react'
import { siDiscord, siFacebook, siGithub, siInstagram, siMedium, siPinterest, siReddit, siSnapchat, siTelegram, siThreads, siWhatsapp, siX, siYoutube } from 'simple-icons'

const BRAND = {
  instagram: siInstagram, facebook: siFacebook, x: siX, youtube: siYoutube, whatsapp: siWhatsapp, threads: siThreads, discord: siDiscord, telegram: siTelegram,
  pinterest: siPinterest, snapchat: siSnapchat, github: siGithub, reddit: siReddit, medium: siMedium,
}

/** The brand colour of each platform (used where a coloured mark is wanted, e.g. the animated social section). */
export const BRAND_COLOR = {
  instagram: '#e1306c', facebook: '#1877f2', linkedin: '#0a66c2', youtube: '#ff0000', x: '#e5e7eb', whatsapp: '#25d366', threads: '#e5e7eb', discord: '#5865f2', telegram: '#26a5e4',
  pinterest: '#e60023', snapchat: '#fffc00', github: '#e5e7eb', reddit: '#ff4500', medium: '#e5e7eb',
}

/** Official platform marks from simple-icons. That package (and Lucide) no longer ship LinkedIn, so its familiar "in" tile is drawn as a plain SVG. An unknown / custom platform gets a neutral globe. */
export default function SocialIcon({ platform, className = 'size-4' }) {
  if (platform === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2.2 7.3v7.5h2.6v-7.5H6.2ZM7.5 6.4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm3.2 3.9v7.5h2.6v-4c0-1 .5-1.7 1.4-1.7.9 0 1.3.6 1.3 1.7v4h2.6v-4.6c0-2.1-1.1-3.1-2.7-3.1-1.1 0-1.9.6-2.3 1.2v-1h-2.9Z" fillRule="evenodd" />
      </svg>
    )
  }
  const icon = BRAND[platform]
  if (!icon) return platform === 'custom' ? <Globe className={className} aria-hidden="true" /> : <Link2 className={className} aria-hidden="true" />
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true" focusable="false"><path d={icon.path} /></svg>
}
