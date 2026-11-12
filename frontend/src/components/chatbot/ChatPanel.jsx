import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { m, useReducedMotion } from 'framer-motion'
import { MessageCircle, Phone, RotateCcw, X } from 'lucide-react'
import ChatMessage, { Avatar, TypingIndicator } from './ChatMessage.jsx'
import SuggestedQuestions from './SuggestedQuestions.jsx'
import ChatInput from './ChatInput.jsx'
import { SUGGESTED_QUESTIONS, WELCOME_MESSAGE } from '../../services/chatService.js'
import { useSite, useSiteSettings } from '../../hooks/useSite.js'
import { whatsappLink } from '../../utils/whatsapp.js'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function ChatPanel({ messages, pending, isMobile, guestLeft = null, onSend, onClear, onClose }) {
  const site = useSite()
  const welcome = useSiteSettings().chatbot_welcome || WELCOME_MESSAGE // editable in the admin panel
  const reduce = useReducedMotion()
  const panelRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current
    if (el && (messages.length > 0 || pending)) el.scrollTop = el.scrollHeight
  }, [messages, pending])

  // Mobile is a modal sheet: lock page scroll and trap focus. Desktop stays a non-modal card.
  useEffect(() => {
    if (!isMobile) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [isMobile])

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); return onClose() }
    if (e.key !== 'Tab' || !isMobile) return
    const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  const showFollowUps = !pending && messages.at(-1) === lastAssistant && lastAssistant?.followUps?.length > 0

  return (
    <m.div
      ref={panelRef}
      role="dialog"
      aria-modal={isMobile ? 'true' : undefined}
      aria-labelledby="chat-title"
      onKeyDown={onKeyDown}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-night/90 backdrop-blur-2xl md:inset-auto md:bottom-5 md:right-5 md:h-[min(620px,calc(100dvh-2.5rem))] md:w-[400px] md:rounded-3xl md:border md:border-edge-strong md:shadow-menu lg:bottom-6 lg:right-6"
    >
      <header className="flex items-center gap-3 border-b border-edge bg-gradient-to-r from-primary/35 via-accent/15 to-transparent px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-3">
        <Avatar size={40} />
        <div className="min-w-0 flex-1">
          <h2 id="chat-title" className="font-display text-lg font-semibold leading-tight">LAX360 AI Assistant</h2>
          <p className="flex items-center gap-1.5 text-xs text-soft">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" /> AI assistant · online
          </p>
        </div>
        <button type="button" onClick={onClear} aria-label="Clear conversation" title="Clear conversation" className="inline-flex size-11 items-center justify-center rounded-md hover:bg-glass-strong">
          <RotateCcw className="size-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={onClose} aria-label="Close chat" title="Close chat" className="inline-flex size-11 items-center justify-center rounded-md hover:bg-glass-strong">
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>

      <div ref={listRef} role="log" aria-live="polite" aria-label="Conversation" className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        {messages.length === 0 && (
          <div className="flex items-end gap-3 glass-flat overflow-hidden pl-4 pr-2 pt-3">
            <div className="pb-3">
              <p className="eyebrow text-violet">LAX360 AI Assistant</p>
              <p className="mt-1 font-display text-2xl font-semibold leading-tight">How can we help?</p>
                          </div>
            <img src="/assets/mascot-welcome.webp" alt="LAX360 AI Assistant mascot waving" width="480" height="722" className="-mb-px ml-auto h-auto w-20 shrink-0 md:w-[5.5rem]" />
          </div>
        )}
        <div className="flex items-start gap-2">
          <Avatar />
          <p className="max-w-[88%] rounded-2xl rounded-bl-sm border border-edge bg-glass px-4 py-2.5 text-base">{welcome}</p>
        </div>
        {messages.length === 0 && <SuggestedQuestions items={SUGGESTED_QUESTIONS} onSelect={(q) => onSend(q.label, q.id)} disabled={pending} />}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} onNavigate={isMobile ? onClose : undefined} />
        ))}
        {showFollowUps && (
          <SuggestedQuestions items={lastAssistant.followUps} onSelect={(q) => onSend(q.label, q.id)} label="Follow-up questions" />
        )}
        {pending && <TypingIndicator />}
      </div>

      {guestLeft !== null && guestLeft > 0 && <p role="status" className="border-t border-edge bg-glass px-4 py-1.5 text-xs text-soft">{guestLeft} free message{guestLeft === 1 ? '' : 's'} left. <Link to="/login" state={{ from: typeof window !== 'undefined' ? window.location.pathname : '/', reopenChat: true }} onClick={isMobile ? onClose : undefined} className="font-semibold text-fg underline">Log in</Link> or create a free account for unlimited chat.</p>}
      <ChatInput ref={inputRef} onSend={onSend} disabled={pending} />

      <footer className="border-t border-edge bg-night/40 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-xs text-soft">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 font-semibold text-fg underline"><MessageCircle className="size-3.5" aria-hidden="true" /> Talk to a person</a>
          <a href={`tel:${site.phones[0].tel}`} className="inline-flex min-h-8 items-center gap-1 font-semibold text-fg underline"><Phone className="size-3.5" aria-hidden="true" /> Call</a>
          <Link to="/privacy" onClick={isMobile ? onClose : undefined} className="min-h-8 underline">Privacy</Link>
        </div>
        <p className="mt-1">AI-generated answers can be wrong — please confirm important details with the team. Don&apos;t share passwords or sensitive data here.</p>
      </footer>
    </m.div>
  )
}
