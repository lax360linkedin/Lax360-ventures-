import { useCallback, useEffect, useRef, useState } from 'react'
import ChatLauncher from './ChatLauncher.jsx'
import ChatPanel from './ChatPanel.jsx'
import { resetConversation, sendMessage } from '../../services/chatService.js'
import { ApiError } from '../../services/apiClient.js'
import { useMediaQuery } from '../../hooks/useMediaQuery.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useLocation } from 'react-router-dom'

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
  const { user } = useAuth()
  const location = useLocation()
  const [guestLeft, setGuestLeft] = useState(null) // free messages left for a signed-out visitor (null = unknown / signed in)
  const blocked = useRef(null) // the message the server asked a login for: sent again, in the same conversation, once the visitor is signed in

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

  const send = useCallback(async (text, topicId, again = false) => {
    const clean = text.trim()
    if (!clean || pending) return
    if (!again) setMessages((m) => [...m, { id: uid(), role: 'user', text: clean }])
    setPending(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const reply = await sendMessage({ text: clean }, { signal: controller.signal })
      setMessages((m) => [...m, { ...reply, role: 'assistant' }])
      setGuestLeft(reply.guestLeft)
      setPending(false)
    } catch (err) {
      if (err.name === 'AbortError') return
      if (err.code === 'login_required') {
        blocked.current = clean
        setGuestLeft(0)
        const state = { from: location.pathname + location.search, reopenChat: true }
        setMessages((m) => [...m, { id: uid(), role: 'assistant', loginPrompt: true, text: err.message, links: [{ label: 'Log in', to: '/login', state }, { label: 'Create a free account', to: '/register', state }], whatsapp: false, followUps: [] }])
        setPending(false)
        return
      }
      setMessages((m) => [...m, { id: uid(), role: 'assistant', text: err instanceof ApiError ? err.message : 'Something went wrong on our side. Please try again, or contact our team directly.', links: [{ label: 'Contact the team', to: '/contact' }], whatsapp: true, followUps: [] }])
      setPending(false)
    }
  }, [pending, location.pathname, location.search])

  // Back from the login / sign-up page: reopen the assistant and continue the same conversation with the message that was waiting.
  useEffect(() => {
    if (!user) return
    setGuestLeft(null)
    if (location.state?.reopenChat) setOpen(true)
    if (blocked.current) { const text = blocked.current; blocked.current = null; setMessages((m) => m.filter((x) => !x.loginPrompt)); void send(text, undefined, true) }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const clear = useCallback(() => {
    abortRef.current?.abort()
    resetConversation()
    setMessages([])
    setPending(false)
  }, [])

  const panelOpen = open && !suppressed
  return (
    <>
      {panelOpen && <ChatPanel messages={messages} pending={pending} isMobile={isMobile} guestLeft={user ? null : guestLeft} onSend={send} onClear={clear} onClose={closeChat} />}
      {!suppressed && !panelOpen && <ChatLauncher ref={launcherRef} open={open} onOpen={openChat} raised={raised} />}
    </>
  )
}
