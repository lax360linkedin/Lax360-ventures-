import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { whatsappLink } from '../../utils/whatsapp.js'

export const Avatar = ({ size = 28 }) => (
  <img src="/assets/mascot-launcher.webp" alt="" width={size} height={size} className="shrink-0 rounded-full" style={{ width: size, height: size }} />
)

const pill = 'inline-flex min-h-10 items-center gap-1.5 rounded-full border border-violet px-4 text-sm font-semibold text-violet hover:bg-violet hover:text-white'

/** One chat bubble. Assistant replies may carry links to site pages and a WhatsApp handover button. */
export default function ChatMessage({ message, onNavigate }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-gradient-to-br from-primary to-accent px-4 py-2.5 text-base text-white">{message.text}</p>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2">
      <Avatar />
      <div className="max-w-[88%]">
        <p className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm border border-edge bg-glass px-4 py-2.5 text-base text-fg">{message.text}</p>
        {(message.links?.length > 0 || message.whatsapp) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.links.map((l) => (
              <Link key={l.to} to={l.to} onClick={onNavigate} className={pill}>{l.label}</Link>
            ))}
            {message.whatsapp && (
              <a href={whatsappLink('Hi LAX360 Ventures, I was chatting on your website and would like to talk to a person.')} target="_blank" rel="noopener noreferrer" className={pill}>
                <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp a person
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <Avatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-edge bg-glass px-4 py-4" role="status">
        <span className="typing-dot size-2 rounded-full bg-violet" />
        <span className="typing-dot size-2 rounded-full bg-violet" />
        <span className="typing-dot size-2 rounded-full bg-violet" />
        <span className="sr-only">Thinking…</span>
      </div>
    </div>
  )
}
