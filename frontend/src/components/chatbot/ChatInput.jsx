import { forwardRef, useEffect, useState } from 'react'
import { Send } from 'lucide-react'

const MAX = 500

/** Auto-growing textarea. Enter sends, Shift+Enter adds a line, empty input shows a hint. */
const ChatInput = forwardRef(function ChatInput({ onSend, disabled }, ref) {
  const [value, setValue] = useState('')
  const [hint, setHint] = useState('')

  useEffect(() => {
    const el = ref?.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`
    el.style.overflowY = el.scrollHeight > 112 ? 'auto' : 'hidden'
  }, [value, ref])

  const submit = () => {
    const text = value.trim()
    if (!text) return setHint('Type a message to send.')
    if (disabled) return
    setHint('')
    setValue('')
    onSend(text)
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit() }}
      className="border-t border-edge bg-glass p-3"
    >
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="chat-input" className="sr-only">Type your question</label>
          <textarea
            id="chat-input"
            ref={ref}
            rows={1}
            value={value}
            maxLength={MAX}
            placeholder="Type your question…"
            aria-describedby={hint ? 'chat-hint' : undefined}
            onChange={(e) => { setValue(e.target.value); if (hint) setHint('') }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
            }}
            className="block max-h-28 w-full resize-none rounded-lg border border-edge bg-glass px-3 py-3 text-base focus:border-lav focus:outline-none focus-visible:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-violet text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-1 flex min-h-5 justify-between text-xs text-soft">
        <span id="chat-hint" role="alert" className="font-medium text-error">{hint}</span>
        {value.length >= 400 && <span aria-live="polite">{value.length}/{MAX}</span>}
      </div>
    </form>
  )
})

export default ChatInput
