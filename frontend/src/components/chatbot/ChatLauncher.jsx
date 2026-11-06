import { forwardRef, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

const STORAGE_KEY = 'lax360-callout-dismissed'
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

// Browser storage may be blocked; every access is guarded and failure just means "show once per visit".
const wasDismissedRecently = () => {
  try {
    const t = Number(window.localStorage.getItem(STORAGE_KEY))
    return Boolean(t) && Date.now() - t < THIRTY_DAYS
  } catch {
    return false
  }
}
const rememberDismissal = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

/**
 * Floating assistant launcher: the supplied mascot on a violet glass disc with a slow "breathing" halo.
 * It pops in last in the load sequence. The one-time callout never shows on /contact and is capped to once per 30 days.
 */
const ChatLauncher = forwardRef(function ChatLauncher({ open, onOpen, raised }, ref) {
  const { pathname } = useLocation()
  const [showCallout, setShowCallout] = useState(false)

  useEffect(() => {
    if (open || pathname === '/contact' || wasDismissedRecently()) return undefined
    let shown = false
    const reveal = () => {
      if (shown) return
      shown = true
      setShowCallout(true)
    }
    const timer = setTimeout(reveal, 10000)
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable > 0 && window.scrollY / scrollable > 0.4) reveal()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open, pathname])

  useEffect(() => {
    if (open || pathname === '/contact') setShowCallout(false)
  }, [open, pathname])

  const dismiss = () => {
    setShowCallout(false)
    rememberDismissal()
  }

  useEffect(() => {
    if (!showCallout) return undefined
    const onKey = (e) => e.key === 'Escape' && dismiss()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showCallout])

  return (
    <div
      className={`fixed right-3 z-40 flex flex-col items-end gap-3 md:right-5 lg:right-6 ${raised ? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))] md:bottom-5'} lg:bottom-6`}
    >
      {showCallout && (
        <div role="status" className="glass relative max-w-[16rem] p-4 pr-10 text-base leading-snug">
          <p>Hi there! I&apos;m your LAX360 AI Assistant. Need help exploring our services?</p>
          <button type="button" onClick={dismiss} aria-label="Dismiss message" className="absolute right-1 top-1 inline-flex size-10 items-center justify-center rounded-full text-soft hover:text-fg">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
      <button
        ref={ref}
        type="button"
        onClick={onOpen}
        aria-label="Open LAX360 AI Assistant"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Chat with LAX360 AI Assistant"
        className="a-pop group relative flex items-center gap-3 rounded-full border border-edge-strong bg-night/70 p-1.5 pr-1.5 shadow-[0_10px_40px_-10px_rgb(var(--glow)/0.8)] backdrop-blur-xl transition-[transform,border-color] duration-300 hover:scale-[1.04] hover:border-lav lg:pr-6"
        style={{ '--d': '1.6s' }}
      >
        <span aria-hidden="true" className="anim-breathe pointer-events-none absolute left-1.5 top-1.5 size-14 rounded-full bg-accent/50 md:size-[60px]" />
        <span className="relative block size-14 shrink-0 md:size-[60px]">
          <img src="/assets/mascot-launcher.webp" alt="" width="192" height="191" className="size-full rounded-full ring-2 ring-white/80 transition-transform duration-300 group-hover:rotate-3" />
          <span className="absolute right-0 top-0 size-3.5 rounded-full border-2 border-night bg-success" aria-hidden="true" />
        </span>
        <span className="hidden text-left lg:block" aria-hidden="true">
          <span className="block font-display text-base font-semibold leading-tight">Ask the assistant</span>
          <span className="block text-xs text-lav">LAX360 AI</span>
        </span>
      </button>
    </div>
  )
})

export default ChatLauncher
