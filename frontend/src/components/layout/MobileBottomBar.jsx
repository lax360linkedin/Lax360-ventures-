import { Link } from 'react-router-dom'
import { MessageCircle, Send } from 'lucide-react'
import { whatsappLink } from '../../utils/whatsapp.js'

/** Slim sticky bar for < 1024px, shown once the hero has scrolled away. */
export default function MobileBottomBar({ visible }) {
  if (!visible) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-edge bg-night pb-[env(safe-area-inset-bottom)] lg:hidden">
      <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center justify-center gap-2 border-r border-edge text-base font-semibold">
        <MessageCircle className="size-5" aria-hidden="true" /> WhatsApp
      </a>
      <Link to="/contact" className="flex min-h-14 items-center justify-center gap-2 bg-primary text-base font-semibold text-white">
        <Send className="size-5" aria-hidden="true" /> Enquire
      </Link>
    </div>
  )
}
