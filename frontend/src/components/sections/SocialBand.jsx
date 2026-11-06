import { useLocation } from 'react-router-dom'
import SocialIcon from '../layout/SocialIcon.jsx'
import { showOnPage, useSiteSettings, useSocial } from '../../hooks/useSite.js'

const COLOR = { instagram: '#e1306c', facebook: '#1877f2', linkedin: '#0a66c2', youtube: '#ff0000', x: '#e5e7eb' }

/** "Stay connected": the social icons float and sway in a staggered wave beside the LAX360 assistant robot (the existing mascot image).
 *  Clicking the robot opens the existing website assistant: it only dispatches the event the chat widget already listens for.
 *  The content sits on the left so the floating assistant launcher (bottom right) never covers it. */
export default function SocialBand() {
  const settings = useSiteSettings()
  const social = useSocial()
  const { pathname } = useLocation()
  if (settings.social_band_enabled === false || !showOnPage(settings.contact_bar_pages, pathname) || !social.length) return null
  const robot = settings.social_robot_enabled !== false && settings.chatbot_enabled !== false
  return (
    <section aria-labelledby="social-band-title" className="wrap py-10">
      <div className="group/bot relative overflow-hidden rounded-3xl border border-edge-strong bg-glass px-6 py-8 shadow-[0_0_60px_-30px_rgb(var(--glow)/0.8)] backdrop-blur-xl sm:px-10">
        <div className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:gap-10 sm:text-left">
          {robot && (
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('lax360:open-chat'))} aria-label="Chat with the LAX360 assistant"
              className="anim-bot-bob shrink-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-lav">
              <span className="anim-bot-wave block">
                <img src="/assets/mascot-welcome.webp" alt="" width="480" height="722" loading="lazy" decoding="async" className="h-auto w-20 drop-shadow-[0_10px_20px_rgb(var(--glow)/0.5)] sm:w-24" />
              </span>
            </button>
          )}
          <div>
            <h2 id="social-band-title" className="font-display text-2xl font-semibold">Stay connected with LAX360</h2>
            <p className="mt-2 text-sm text-soft">Follow our work, ideas and updates{robot ? ', or tap the robot to chat with our assistant' : ''}.</p>
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start sm:gap-5" aria-label="Social media profiles">
              {social.map((s, i) => (
                <li key={s.platform + s.href} className="anim-social-float" style={{ '--d': `${i * 0.45}s` }}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`}
                    className="grid size-12 place-items-center rounded-2xl border border-edge bg-night/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)] transition-[transform,border-color,box-shadow] duration-300 hover:scale-110 hover:border-lav group-hover/bot:-translate-y-1 sm:size-14"
                    style={{ color: COLOR[s.platform] }}>
                    <SocialIcon platform={s.platform} className="size-6" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
