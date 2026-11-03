// Original line-art compositions, one per division, drawn for the violet glass theme: lavender strokes,
// translucent fills and violet / blue accents. They stand in for project imagery that does not exist
// yet — they illustrate capabilities and never depict clients or results.
const LAV = 'var(--art-line)'
const VIO = 'var(--art-vio)'
const PRI = '#7C3AED'
const SKY = 'var(--art-sky)'
const GLASS = 'var(--art-glass)'
const FAINT = 'var(--art-faint)'

const sw = { fill: 'none', stroke: LAV, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

function Software() {
  return (
    <>
      <rect x="40" y="40" width="220" height="150" rx="12" {...sw} fill={GLASS} />
      <path d="M40 66h220" {...sw} />
      <circle cx="58" cy="53" r="4" fill={VIO} />
      <circle cx="72" cy="53" r="4" fill={LAV} />
      <circle cx="86" cy="53" r="4" fill={SKY} />
      <path d="M60 92h90M60 112h140M60 132h110M60 152h60" stroke={FAINT} strokeWidth="6" strokeLinecap="round" />
      <rect x="170" y="100" width="70" height="70" rx="10" fill={PRI} opacity="0.85" />
      <rect x="150" y="120" width="220" height="140" rx="12" {...sw} fill="var(--art-solid)" />
      <path d="M150 146h220" {...sw} />
      <path d="M172 176h60M172 196h100M172 216h80" stroke={LAV} strokeWidth="3" strokeLinecap="round" />
      <path d="M300 240V196M322 240V176M344 240V206" stroke={VIO} strokeWidth="14" strokeLinecap="round" />
    </>
  )
}

function Ai() {
  const nodes = [[70, 150], [170, 80], [170, 220], [290, 150], [350, 70]]
  return (
    <>
      <path d="M70 150L170 80M70 150L170 220M170 80L290 150M170 220L290 150M290 150L350 70" {...sw} />
      <path d="M170 80L170 220" stroke={LAV} strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 3 ? 28 : 16} fill={i === 3 ? PRI : 'var(--art-solid)'} stroke={LAV} strokeWidth="2" />
      ))}
      <path d="M279 150h22M290 139v22" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <rect x="320" y="200" width="64" height="40" rx="8" {...sw} fill={GLASS} />
      <path d="M332 216h40M332 227h24" stroke={VIO} strokeWidth="3" strokeLinecap="round" />
      <path d="M30 60h60M30 240h90" stroke={FAINT} strokeWidth="6" strokeLinecap="round" />
    </>
  )
}

function Growth() {
  return (
    <>
      <path d="M40 250h330M40 250V40" {...sw} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={70 + i * 62} y={210 - i * 36} width="36" height={40 + i * 36} rx="4" fill={i === 4 ? VIO : GLASS} stroke={LAV} strokeWidth="2" />
      ))}
      <path d="M60 190L130 160L190 168L252 116L330 70" stroke={SKY} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M312 68h20v20" stroke={SKY} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 90h330M40 150h330" stroke={FAINT} strokeWidth="2" strokeDasharray="3 8" />
    </>
  )
}

function Engineering() {
  return (
    <>
      <path d="M30 40h340M30 100h340M30 160h340M30 220h340M70 20v260M150 20v260M230 20v260M310 20v260" stroke="var(--art-grid)" strokeWidth="1.5" />
      <circle cx="170" cy="140" r="64" {...sw} stroke={SKY} />
      <circle cx="170" cy="140" r="22" {...sw} stroke={SKY} />
      <path d="M170 60v160M90 140h160" stroke={SKY} strokeWidth="1.5" strokeDasharray="10 5 2 5" />
      <rect x="250" y="90" width="110" height="100" rx="4" {...sw} fill={GLASS} />
      <path d="M250 214h110M250 206v16M360 206v16" {...sw} stroke={VIO} />
      <path d="M376 90v100M368 90h16M368 190h16" {...sw} stroke={VIO} />
      <path d="M170 140l45 45" {...sw} />
      <text x="292" y="236" fontSize="12" fontWeight="700" fill={VIO} fontFamily="var(--font-sans)">110</text>
    </>
  )
}

function Training() {
  return (
    <>
      <path d="M40 250h330" {...sw} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={50 + i * 70} y={210 - i * 44} width="70" height={40 + i * 44} rx="4" fill={i === 3 ? PRI : GLASS} stroke={LAV} strokeWidth="2" />
      ))}
      <path d="M260 78v-40M260 38h36l-10 12 10 12h-36" stroke={VIO} strokeWidth="3" fill={VIO} strokeLinejoin="round" />
      <path d="M70 190h30M140 146h30M210 102h30" stroke={LAV} strokeWidth="3" strokeLinecap="round" />
      <rect x="40" y="52" width="110" height="64" rx="10" {...sw} fill={GLASS} />
      <path d="M54 70h60M54 84h82M54 98h44" stroke={FAINT} strokeWidth="5" strokeLinecap="round" />
    </>
  )
}

const art = { software: Software, ai: Ai, growth: Growth, engineering: Engineering, training: Training }

/** `id` is a division slug (software, ai, growth, engineering, training). Decorative by default. */
export default function DivisionArt({ id, className = '', label }) {
  const Art = art[id] || Software
  return (
    <svg viewBox="0 0 400 290" className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'} focusable="false">
      <Art />
    </svg>
  )
}
