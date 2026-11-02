import { MessageCircle } from 'lucide-react'
import { whatsappLink } from '../../utils/whatsapp.js'
import { useSite } from '../../hooks/useSite.js'

/**
 * Secondary floating action (desktop only — phones already have WhatsApp in the bottom bar).
 * Rendered only when a WhatsApp number is configured; pops in after the assistant launcher.
 */
export default function WhatsAppFloat() {
  const site = useSite()
  if (!site.whatsappNumber) return null
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with the LAX360 team on WhatsApp (opens in a new tab)"
      className="a-pop group fixed bottom-[6.75rem] right-6 z-30 hidden items-center gap-2 rounded-full border border-edge bg-night/70 p-3 text-fg shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-[background-color,border-color,transform] duration-300 hover:scale-105 hover:border-[#25d366] hover:bg-[#25d366]/20 lg:flex"
      style={{ '--d': '1.9s' }}
    >
      <MessageCircle className="size-6 text-success" aria-hidden="true" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-[7rem] group-hover:pr-2 group-hover:opacity-100 group-focus-visible:max-w-[7rem] group-focus-visible:pr-2 group-focus-visible:opacity-100" aria-hidden="true">WhatsApp us</span>
    </a>
  )
}
