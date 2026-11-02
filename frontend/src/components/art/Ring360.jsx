/** Brand "360°" dial: tick ring, five numbered division nodes, a violet core. Decorative. */
export default function Ring360({ className = '' }) {
  const ticks = Array.from({ length: 72 }, (_, k) => {
    const a = (k * 5 * Math.PI) / 180
    const major = k % 6 === 0
    const r2 = major ? 178 : 188
    return <line key={k} x1={240 + 198 * Math.sin(a)} y1={240 - 198 * Math.cos(a)} x2={240 + r2 * Math.sin(a)} y2={240 - r2 * Math.cos(a)} stroke={major ? 'var(--art-line)' : 'var(--art-faint)'} strokeWidth={major ? 2 : 1} />
  })
  const nodes = [0, 72, 144, 216, 288].map((deg, k) => {
    const a = (deg * Math.PI) / 180
    return (
      <g key={deg} transform={`translate(${240 + 150 * Math.sin(a)} ${240 - 150 * Math.cos(a)})`}>
        <circle r="17" fill="var(--art-solid)" stroke="var(--art-line)" strokeWidth="1.5" />
        <text textAnchor="middle" dy="4.5" fontSize="13" fontWeight="700" fill="var(--art-line)" fontFamily="var(--font-display)">{`0${k + 1}`}</text>
      </g>
    )
  })
  return (
    <svg viewBox="0 0 480 480" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ring-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7C3AED" /><stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <circle cx="240" cy="240" r="198" fill="none" stroke="var(--art-faint)" strokeWidth="1.5" />
      {ticks}
      <circle cx="240" cy="240" r="120" fill="url(#ring-core)" opacity="0.9" />
      <text x="240" y="252" textAnchor="middle" fontSize="54" fontWeight="600" fill="#fff" fontFamily="var(--font-display)" letterSpacing="-2">360°</text>
      <text x="240" y="282" textAnchor="middle" fontSize="11" fontWeight="700" fill="#E9D5FF" letterSpacing="3.5" fontFamily="var(--font-sans)">EXECUTION</text>
      {nodes}
    </svg>
  )
}
