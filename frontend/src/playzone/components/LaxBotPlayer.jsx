import MiniBot from '../../components/art/MiniBot.jsx'

/**
 * LAXBOT for the Play Zone: the website's own LAXBOT vector character wearing one of four game outfits. It is a 2D vector presentation (the head, eyes and arms animate) and is NOT an
 * interactive 3D character; production 3D models are listed in PLAYZONE_ASSETS.md. The outfit is drawn on top of the same 64 x 80 coordinate space as the base character.
 * Purely decorative: aria-hidden, not focusable.
 */
export const BOT_STYLE = {
  'star-collector': { '--bot-eye': '#fbbf24', '--bot-violet': '#f59e0b', '--bot-heart': '#fcd34d', '--bot-glow': 'rgba(252, 211, 77, 0.6)', '--bot-line': 'rgba(251, 191, 36, 0.75)', pose: 'cheer' },
  'adventure-explorer': { '--bot-eye': '#38bdf8', '--bot-violet': '#0ea5e9', '--bot-heart': '#7dd3fc', '--bot-glow': 'rgba(125, 211, 252, 0.6)', '--bot-line': 'rgba(56, 189, 248, 0.75)', pose: 'wave' },
  'puzzle-wizard': { '--bot-eye': '#f472b6', '--bot-violet': '#a855f7', '--bot-heart': '#f9a8d4', '--bot-glow': 'rgba(249, 168, 212, 0.6)', '--bot-line': 'rgba(192, 132, 252, 0.8)', pose: 'hold' },
  'cyber-defender': { '--bot-eye': '#22d3ee', '--bot-violet': '#0891b2', '--bot-heart': '#22d3ee', '--bot-glow': 'rgba(34, 211, 238, 0.6)', '--bot-line': 'rgba(34, 211, 238, 0.8)', pose: 'point' },
}

const Star = ({ x, y, r, fill = '#fcd34d', className = '' }) => (
  <path className={className} fill={fill} d={`M${x} ${y - r}l${r * 0.3} ${r * 0.62} ${r * 0.7} ${r * 0.1}-${r * 0.52} ${r * 0.48} ${r * 0.14} ${r * 0.7}-${r * 0.62}-${r * 0.34}-${r * 0.62} ${r * 0.34} ${r * 0.14}-${r * 0.7}-${r * 0.52}-${r * 0.48} ${r * 0.7}-${r * 0.1}z`} />
)

function Outfit({ variant }) {
  switch (variant) {
    case 'star-collector':
      return (
        <>
          <ellipse cx="32" cy="2" rx="14" ry="3.2" fill="none" stroke="#fde68a" strokeWidth="1.6" opacity="0.9" />
          <Star x={32} y={-6} r={7} className="pz-twinkle" />
          <Star x={6} y={16} r={4} className="pz-twinkle" fill="#fde68a" />
          <Star x={59} y={10} r={3.4} className="pz-twinkle" fill="#f9a8d4" />
          <Star x={55} y={62} r={3} className="pz-twinkle" fill="#fde68a" />
        </>
      )
    case 'adventure-explorer':
      return (
        <>
          <path d="M20 47q12 6 24 0v5q-12 6-24 0z" fill="#f472b6" stroke="#be185d" strokeWidth="0.6" />
          <path d="M22 50l-3 13M42 50l3 13" stroke="#b45309" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="11" y="13" width="42" height="5.4" rx="2.7" fill="#b45309" />
          <circle cx="24" cy="15.7" r="5.3" fill="#fbbf24" stroke="#92400e" strokeWidth="1" />
          <circle cx="40" cy="15.7" r="5.3" fill="#fbbf24" stroke="#92400e" strokeWidth="1" />
          <circle cx="24" cy="15.7" r="3.5" fill="#bae6fd" />
          <circle cx="40" cy="15.7" r="3.5" fill="#bae6fd" />
          <circle cx="22.8" cy="14.5" r="1" fill="#fff" />
          <circle cx="38.8" cy="14.5" r="1" fill="#fff" />
        </>
      )
    case 'puzzle-wizard':
      return (
        <>
          <path d="M14 15q18-3 36 0L38 -16q-3 2-5 5-1-6-6-8z" fill="#7c3aed" stroke="#4c1d95" strokeWidth="0.8" />
          <ellipse cx="32" cy="15" rx="23" ry="4.4" fill="#6d28d9" stroke="#4c1d95" strokeWidth="0.8" />
          <rect x="20" y="9" width="24" height="4" rx="2" fill="#fcd34d" />
          <Star x={31} y={-2} r={3.2} className="pz-twinkle" />
          <Star x={39} y={4} r={2} className="pz-twinkle" fill="#f9a8d4" />
          <Star x={57} y={52} r={3.4} className="pz-twinkle" fill="#fde68a" />
          <Star x={5} y={40} r={2.4} className="pz-twinkle" fill="#f9a8d4" />
        </>
      )
    case 'cyber-defender':
    default:
      return (
        <>
          <rect x="12" y="23" width="40" height="11" rx="5.5" fill="rgba(34,211,238,0.28)" stroke="#22d3ee" strokeWidth="1.2" />
          <path d="M16 28.5h32" stroke="#a5f3fc" strokeWidth="0.8" strokeDasharray="2 2.4" opacity="0.8" />
          <path d="M13 49l-5 5 3 8 6-3zM51 49l5 5-3 8-6-3z" fill="#0891b2" stroke="#22d3ee" strokeWidth="1" />
          <path d="M33 -1l-5 8h4l-2 7 7-9h-4.2z" fill="#a5f3fc" className="pz-twinkle" />
          <path d="M26 56h12M26 60h12" stroke="#22d3ee" strokeWidth="1" opacity="0.7" />
        </>
      )
  }
}

export default function LaxBotPlayer({ variant = 'star-collector', size = 160, pose, className = '' }) {
  const s = BOT_STYLE[variant] || BOT_STYLE['star-collector']
  const { pose: defaultPose, ...vars } = s
  return (
    <span className={`pz-bot ${className}`} style={{ width: size, ...vars }} aria-hidden="true">
      <span className="pz-bot-glow" />
      <MiniBot pose={pose || defaultPose} size={size} className="pz-float" />
      <svg className="pz-bot-acc" viewBox="0 0 64 80" focusable="false"><g className="pz-float"><Outfit variant={variant} /></g></svg>
    </span>
  )
}
