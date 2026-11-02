import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import MiniBot from '../art/MiniBot.jsx'

/**
 * Word highlight with the LAX360 mini-bot — replaces decorative underline strokes.
 *
 * When the word scrolls into view: the word gets a soft violet halo, a tiny bot pops in beside it and points at
 * it, holds the pose for ~2s, then settles into its idle float. The bot lives in a space-reserving inline slot
 * (zero line-height impact, glued to the word with a word-joiner), so line breaks, multi-line headings and
 * narrow screens behave and there is no layout shift or overflow. The bot faces left, towards the word.
 *
 * Use it on a single key word or phrase per heading. It is decorative (aria-hidden); the word stays normal text.
 */
export default function BotHighlight({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  // 'hidden' -> 'point' -> 'idle'
  const [phase, setPhase] = useState('hidden')

  useEffect(() => {
    if (reduce) {
      setPhase('idle')
      return undefined
    }
    const el = ref.current
    if (!el) return undefined
    const timers = []
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        timers.push(setTimeout(() => setPhase('point'), delay * 1000))
        timers.push(setTimeout(() => setPhase('idle'), delay * 1000 + 2400))
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      timers.forEach(clearTimeout)
    }
  }, [delay, reduce])

  return (
    <>
      <span ref={ref} className={`bot-hl-word ${className}`} data-on={phase === 'point'}>{children}</span>
      {/* word-joiner keeps the bot slot on the same line as the last word */}
      {'⁠'}
      <span className="bot-slot" aria-hidden="true" data-shown={phase !== 'hidden'}>
        <span className="bot-slot-inner">
          <MiniBot pose={phase === 'point' ? 'point' : 'idle'} size={64} flip className="!h-auto !w-full" />
        </span>
      </span>
    </>
  )
}
