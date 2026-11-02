// Small vector version of the LAX360 AI Assistant mascot: white glossy shell, dark visor with blue eyes and
// blush, violet headphones, violet heart antenna and a blue chest heart. It is split into parts (head, eyes,
// mouth, two arms, heart) so each can move on its own. Colours come from theme-aware CSS variables
// (--bot-*), so the white body keeps a violet outline in light mode and a lavender one in dark mode.
// The bot is purely decorative: aria-hidden and not focusable.

// Arm angles are degrees from "hanging down": negative swings the right arm outward (viewer's right) / up,
// positive swings the left arm outward (viewer's left) / up. `tilt` rotates the head.
export const BOT_POSES = {
  idle: { ra: -10, la: 10, tilt: 0 },
  point: { ra: -88, la: 12, tilt: 6, happy: true, finger: true },
  hold: { ra: -80, la: 14, tilt: 8, happy: true },
  wave: { ra: -150, la: 10, tilt: -6, happy: true, wave: true },
  reach: { ra: -62, la: 8, tilt: 10, happy: true },
  cheer: { ra: -150, la: 150, tilt: 0, happy: true, wave: true, cheer: true },
  // mid-air: both arms up, used while hopping across the navbar
  jump: { ra: -125, la: 125, tilt: 0, happy: true },
}

export default function MiniBot({ pose = 'idle', size = 40, flip = false, className = '' }) {
  const p = BOT_POSES[pose] || BOT_POSES.idle
  return (
    <svg
      viewBox="0 0 64 80"
      width={size}
      height={size * 1.25}
      className={`bot ${className}`}
      aria-hidden="true"
      focusable="false"
      data-happy={Boolean(p.happy)}
      data-finger={Boolean(p.finger)}
      data-wave={Boolean(p.wave)}
      data-cheer={Boolean(p.cheer)}
      style={{ '--ra': p.ra, '--la': p.la, '--tilt': p.tilt, transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <g className="bot-bob">
        {/* feet + body */}
        <ellipse cx="25" cy="71" rx="5" ry="3" className="bot-violet" />
        <ellipse cx="39" cy="71" rx="5" ry="3" className="bot-violet" />
        <rect x="17" y="47" width="30" height="22" rx="9" className="bot-shell" />
        <rect x="19.5" y="63" width="25" height="3" rx="1.5" className="bot-violet" />
        <circle cx="32" cy="56.5" r="5.2" fill="#3b82f6" />
        <path d="M32 59.4c-3.2-2.1-2.3-5.2 0-3.7 2.3-1.5 3.2 1.6 0 3.7z" fill="#fff" />

        {/* left arm */}
        <g className="bot-arm-l">
          <line x1="17" y1="52" x2="17" y2="65" strokeWidth="6.4" className="bot-limb" />
          <line x1="17" y1="52" x2="17" y2="65" strokeWidth="4.4" className="bot-limb-fill" />
          <circle cx="17" cy="66.5" r="3.4" className="bot-shell" />
        </g>
        {/* right arm (the pointing / waving one) */}
        <g className="bot-arm-r">
          <line x1="47" y1="52" x2="47" y2="65" strokeWidth="6.4" className="bot-limb" />
          <line x1="47" y1="52" x2="47" y2="65" strokeWidth="4.4" className="bot-limb-fill" />
          <rect x="45.8" y="67" width="2.4" height="7" rx="1.2" className="bot-shell bot-finger" />
          <circle cx="47" cy="66.5" r="3.4" className="bot-shell" />
        </g>

        {/* head */}
        <g className="bot-head">
          <path d="M32 13V7.6" stroke="var(--bot-line)" strokeWidth="1.6" strokeLinecap="round" />
          <path className="bot-heart bot-pulse" d="M32 8.6C27.2 5.2 29.6 1.2 32 3.8 34.4 1.2 36.8 5.2 32 8.6z" />
          <rect x="3.5" y="24" width="7" height="13" rx="3.4" className="bot-violet" />
          <rect x="53.5" y="24" width="7" height="13" rx="3.4" className="bot-violet" />
          <rect x="8" y="12" width="48" height="34" rx="15" className="bot-shell" />
          <rect x="12.5" y="16.5" width="39" height="25" rx="11" className="bot-visor" />
          <g className="bot-eyes">
            <ellipse cx="24" cy="28" rx="4.4" ry="5.4" className="bot-eye" />
            <ellipse cx="40" cy="28" rx="4.4" ry="5.4" className="bot-eye" />
            <circle cx="22.6" cy="25.8" r="1.4" fill="#fff" />
            <circle cx="38.6" cy="25.8" r="1.4" fill="#fff" />
          </g>
          <g className="bot-eyes-happy" fill="none" stroke="var(--bot-eye)" strokeWidth="2.4" strokeLinecap="round">
            <path d="M19.4 30q4.6-6.4 9.2 0" />
            <path d="M35.4 30q4.6-6.4 9.2 0" />
          </g>
          <ellipse cx="19.5" cy="35" rx="3" ry="1.8" fill="var(--bot-blush)" opacity="0.55" />
          <ellipse cx="44.5" cy="35" rx="3" ry="1.8" fill="var(--bot-blush)" opacity="0.55" />
          <path className="bot-mouth" d="M28.6 35.4q3.4 3.4 6.8 0" stroke="#f472b6" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path className="bot-mouth-happy" d="M27.4 34.6q4.6 6 9.2 0z" fill="#f472b6" />
        </g>
      </g>
    </svg>
  )
}
