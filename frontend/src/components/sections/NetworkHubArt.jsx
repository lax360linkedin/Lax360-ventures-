import { useId } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Building2, Cpu, GraduationCap, Handshake, Landmark, Layers } from 'lucide-react'

// Hero artwork of the Our Network page: LAX360 at the centre of its partner ecosystem. Pure SVG + CSS (transform / opacity / dash offset only, so it stays on the GPU),
// all colours are global theme tokens, and every motion stops for visitors who prefer reduced motion. Decorative detail is aria-hidden; the SVG carries one text label.
const CX = 240
const CY = 200
const NODES = [
  { x: 92, y: 76, l: 'Technology', I: Cpu, bend: -26 },
  { x: 388, y: 76, l: 'Education', I: GraduationCap, bend: 26 },
  { x: 54, y: 252, l: 'Finance', I: Landmark, bend: 24 },
  { x: 426, y: 252, l: 'Software', I: Layers, bend: -24 },
  { x: 150, y: 352, l: 'Associates', I: Handshake, bend: -22 },
  { x: 330, y: 352, l: 'Industry', I: Building2, bend: 22 },
]

// a gentle curve from the hub to a node (control point pushed sideways from the midpoint)
const curve = (n) => {
  const mx = (CX + n.x) / 2
  const my = (CY + n.y) / 2
  const dx = n.x - CX
  const dy = n.y - CY
  const len = Math.hypot(dx, dy)
  return `M${CX} ${CY} Q${(mx + (-dy / len) * n.bend).toFixed(1)} ${(my + (dx / len) * n.bend).toFixed(1)} ${n.x} ${n.y}`
}

export default function NetworkHubArt() {
  const reduce = useReducedMotion()
  const uid = useId().replace(/:/g, '')
  const motion = reduce ? '' : 'nh-anim'
  return (
    <div className={`nh relative mx-auto w-full max-w-md ${motion}`}>
      <svg viewBox="0 0 480 400" className="h-auto w-full overflow-visible" role="img" aria-label="Diagram: LAX360 Pvt Ltd at the centre, connected to technology, education, finance, software, associate and industry partners">
        <defs>
          <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-hub`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
          <linearGradient id={`${uid}-link`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        <g aria-hidden="true">
          <circle cx={CX} cy={CY} r="190" fill={`url(#${uid}-halo)`} />
          {/* two slowly counter-rotating orbit rings give depth behind the links */}
          <g className="nh-spin-a"><circle cx={CX} cy={CY} r="150" fill="none" stroke="var(--color-edge-strong)" strokeWidth="1" strokeDasharray="2 9" strokeLinecap="round" /></g>
          <g className="nh-spin-b"><circle cx={CX} cy={CY} r="104" fill="none" stroke="var(--color-edge-strong)" strokeWidth="1" strokeDasharray="14 10" opacity="0.7" /></g>

          {NODES.map((n, i) => (
            <g key={n.l}>
              <path d={curve(n)} fill="none" stroke="var(--color-edge-strong)" strokeWidth="1.2" />
              <path d={curve(n)} fill="none" stroke={`url(#${uid}-link)`} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="6 14" className="nh-flow" style={{ animationDelay: `${-i * 0.6}s` }} />
              {!reduce && (
                <circle r="3.2" fill="var(--color-accent)">
                  <animateMotion dur={`${3.6 + i * 0.45}s`} begin={`${i * 0.5}s`} repeatCount="indefinite" path={curve(n)} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.35 1" />
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur={`${3.6 + i * 0.45}s`} begin={`${i * 0.5}s`} repeatCount="indefinite" />
                </circle>
              )}
            </g>
          ))}
        </g>

        {NODES.map((n, i) => (
          <g key={n.l} className="nh-float" style={{ animationDelay: `${-i * 0.9}s` }}>
            <circle cx={n.x} cy={n.y} r="34" fill="var(--color-glass-strong)" stroke="var(--color-edge-strong)" />
            <circle cx={n.x} cy={n.y} r="34" fill="none" stroke="var(--color-primary)" strokeOpacity="0.35" className="nh-ping" style={{ animationDelay: `${-i * 0.7}s` }} aria-hidden="true" />
            <n.I x={n.x - 8} y={n.y - 20} width="16" height="16" stroke="var(--color-primary)" strokeWidth="2" aria-hidden="true" />
            <text x={n.x} y={n.y + 17} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="var(--color-fg)">{n.l}</text>
          </g>
        ))}

        <g>
          <circle cx={CX} cy={CY} r="60" fill="none" stroke="var(--color-primary)" strokeOpacity="0.5" className="nh-pulse" aria-hidden="true" />
          <circle cx={CX} cy={CY} r="60" fill="none" stroke="var(--color-accent)" strokeOpacity="0.4" className="nh-pulse" style={{ animationDelay: '-1.4s' }} aria-hidden="true" />
          <circle cx={CX} cy={CY} r="56" fill={`url(#${uid}-hub)`} />
          <circle cx={CX} cy={CY} r="56" fill="none" stroke="#fff" strokeOpacity="0.25" />
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff">LAX360</text>
          <text x={CX} y={CY + 16} textAnchor="middle" fontSize="11" fill="#fff" opacity="0.88">Pvt Ltd</text>
        </g>
      </svg>
    </div>
  )
}
