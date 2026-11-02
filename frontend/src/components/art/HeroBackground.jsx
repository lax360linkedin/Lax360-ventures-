// Hero atmosphere: layered violet light, a slow-drifting glass shape pair, a faint "digital infrastructure"
// network with data flowing along its lines, and sparse twinkling stars. Pure CSS/SVG — transform and
// opacity animations only, no WebGL and no blur filters. Fully static under reduced motion.

// Deterministic star field (same on server and client, so it hydrates cleanly).
const stars = Array.from({ length: 26 }, (_, i) => {
  const a = Math.sin(i * 91.7) * 10000
  const b = Math.sin(i * 47.3 + 3) * 10000
  const x = (a - Math.floor(a)) * 100
  const y = (b - Math.floor(b)) * 78
  return { x, y, s: i % 5 === 0 ? 3 : 2, d: (i % 7) * 0.6, o: i % 3 === 0 ? 0.9 : 0.55 }
})

const nodes = [[820, 120], [960, 230], [1090, 140], [1010, 380], [880, 470], [1130, 520], [740, 330]]
const links = [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [4, 6], [6, 0], [6, 1]]

export default function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* light pools */}
      <div className="anim-drift absolute -left-40 top-10 size-[38rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.42), transparent)' }} />
      <div className="anim-drift absolute -right-32 top-1/3 size-[34rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(96,165,250,0.2), transparent)', animationDelay: '-6s' }} />

      {/* stars */}
      {stars.map((s, i) => (
        <span key={i} className="anim-twinkle absolute rounded-full bg-lav" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: s.o, animationDelay: `${s.d}s` }} />
      ))}

      {/* network */}
      <svg viewBox="0 0 1200 700" preserveAspectRatio="xMaxYMid slice" className="absolute inset-y-0 right-0 hidden h-full w-[72%] opacity-70 md:block">
        {links.map(([a, b], i) => (
          <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="var(--art-faint)" strokeWidth="1" />
        ))}
        {links.slice(0, 5).map(([a, b], i) => (
          <line key={`f${i}`} className="anim-flow" x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="var(--art-vio)" strokeWidth="1.6" strokeLinecap="round" style={{ animationDelay: `${-i * 1.1}s` }} />
        ))}
        {nodes.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="14" fill="rgba(124,58,237,0.12)" stroke="var(--art-faint)" />
            <circle cx={x} cy={y} r="4" fill="var(--art-line)" />
          </g>
        ))}
      </svg>

      {/* floating translucent shapes */}
      <div className="anim-drift absolute right-[8%] top-[18%] hidden size-24 rotate-12 rounded-3xl border border-edge bg-glass lg:block" />
      <div className="anim-drift absolute bottom-[14%] left-[46%] hidden size-14 -rotate-12 rounded-2xl border border-edge bg-glass lg:block" style={{ animationDelay: '-8s' }} />

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />
    </div>
  )
}
