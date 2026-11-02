import { useCallback, useEffect, useRef, useState } from 'react'
import ChatLauncher from './ChatLauncher.jsx'
import ChatPanel from './ChatPanel.jsx'
import { resetConversation, sendMessage } from '../../services/chatService.js'
import { ApiError } from '../../services/apiClient.js'
import { useMediaQuery } from '../../hooks/useMediaQuery.js'

let counter = 0
const uid = () => `m-${Date.now()}-${counter++}`

/**
 * Owns the conversation state. It only talks to `chatService.sendMessage` (the backend's OpenAI-powered /api/chat).
 * The conversation lives in memory only — nothing is written to browser storage.
 */
export default function ChatWidget({ raised, suppressed }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [pending, setPending] = useState(false)
  const launcherRef = useRef(null)
  const abortRef = useRef(null)
  const isMobile = useMediaQuery('(max-width: 767px)')

  const openChat = useCallback(() => setOpen(true), [])
  const closeChat = useCallback(() => setOpen(false), [])

  // Return focus to the launcher once it has re-rendered after the panel closes.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus()
    wasOpen.current = open
  }, [open])

  // Lets any page button (e.g. the AI spotlight) open the assistant.
  useEffect(() => {
    window.addEventListener('lax360:open-chat', openChat)
    return () => window.removeEventListener('lax360:open-chat', openChat)
  }, [openChat])

  const send = useCallback(async (text, topicId) => {
    const clean = text.trim()
    if (!clean || pending) return
    setMessages((m) => [...m, { id: uid(), role: 'user', text: clean }])
    setPending(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const reply = await sendMessage({ text: clean }, { signal: controller.signal })
      setMessages((m) => [...m, { ...reply, role: 'assistant' }])
      setPending(false)
    } catch (err) {
      if (err.name === 'AbortError') return
      setMessages((m) => [...m, { id: uid(), role: 'assistant', text: err instanceof ApiError ? err.message : 'Something went wrong on our side. Please try again, or contact our team directly.', links: [{ label: 'Contact the team', to: '/contact' }], whatsapp: true, followUps: [] }])
      setPending(false)
    }
  }, [pending])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    resetConversation()
    setMessages([])
    setPending(false)
  }, [])

  const panelOpen = open && !suppressed
  return (
    <>
      {panelOpen && <ChatPanel messages={messages} pending={pending} isMobile={isMobile} onSend={send} onClear={clear} onClose={closeChat} />}
      {!suppressed && !panelOpen && <ChatLauncher ref={launcherRef} open={open} onOpen={openChat} raised={raised} />}
    </>
  )
}
