// AI assistant client → POST /api/chat. The backend calls the OpenAI Responses API; the key, the prompt and the company
// knowledge never reach the browser. The conversation id + secret token are kept in memory only (a reload starts a
// new conversation), and the backend bounds the context it sends to the model.
import { api } from './apiClient.js'

export const WELCOME_MESSAGE =
  "Hi there! I'm the LAX360 Pvt Ltd AI Assistant: your friendly companion, trainer and business growth advisor. Ask me about our services, get ideas to grow your business, learn something new, or just have a chat. What's on your mind?"

// Every chip the assistant can offer (the server names the follow-up ones by id).
const ALL_QUESTIONS = [
  { id: 'services', label: 'Explore Our Services' },
  { id: 'software', label: 'I Need Custom Software' },
  { id: 'ai', label: 'Tell Me About AI Solutions' },
  { id: 'training', label: 'Explore Training Courses' },
  { id: 'project', label: 'Discuss My Project' },
  { id: 'ideas', label: 'Help Me Grow My Business' },
  { id: 'trainer', label: 'Train Me on Something' },
  { id: 'chat', label: "Let's Just Chat" },
  { id: 'support', label: 'I Need Some Motivation' },
]

// What the visitor sees first: what the assistant can do for them.
export const SUGGESTED_QUESTIONS = ['ideas', 'trainer', 'chat', 'support', 'services', 'project'].map((id) => ALL_QUESTIONS.find((q) => q.id === id))

export const topicFollowUps = (ids = []) =>
  ids.map((id) => ALL_QUESTIONS.find((q) => q.id === id)).filter(Boolean)

let conversation = { id: null, token: null }

/** Forget the current conversation so the next message starts a new one. */
export function resetConversation() {
  conversation = { id: null, token: null }
}

async function post(text, signal) {
  const body = { message: text, ...(conversation.id ? { session_id: conversation.id, session_token: conversation.token } : {}) }
  return api('/api/chat', { method: 'POST', body, signal, timeoutMs: 45000 })
}

/**
 * @param {{ text: string }} input the visitor's message (suggestion chips just send their label)
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ id: string, text: string, links: {label:string,to:string}[], whatsapp: boolean, followUps: {id:string,label:string}[] }>}
 * Rejects with ApiError; its message is safe to show to the visitor.
 */
export async function sendMessage({ text }, { signal } = {}) {
  let data
  try {
    data = await post(text, signal)
  } catch (err) {
    if (err.code === 'conversation_limit') resetConversation()
    if (err.code !== 'chat_session_not_found') throw err
    resetConversation() // e.g. the user signed out: quietly start a new conversation once
    data = await post(text, signal)
  }
  if (data.session_token) conversation = { id: data.session_id, token: data.session_token }
  return { id: data.message.id, text: data.message.text, links: data.links || [], whatsapp: Boolean(data.whatsapp), followUps: topicFollowUps(data.follow_ups), guestLeft: data.meta?.guest_messages_left ?? null }
}
