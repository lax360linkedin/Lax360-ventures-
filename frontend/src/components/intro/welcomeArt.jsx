import { memo } from 'react'
import { BrainCircuit, Blocks, Bot, Code2, Cpu, GraduationCap, Megaphone, PartyPopper, Sparkles } from 'lucide-react'

/**
 * Backgrounds and emblems of the Welcome Experience cards. Every card has a background style (chosen in the admin panel): a dark graphite base with its own two
 * accent colours, a soft glow, and one light illustration drawn in SVG. Nothing is a photograph and nothing is a real product screenshot: they are abstract
 * illustrations. All motion is CSS transforms / opacity (cheap on the GPU) and is switched off by `prefers-reduced-motion` (see styles/index.css, "Welcome experience").
 * The artwork is stacked in three depth layers (glow, illustration, particles) that shift slightly with the pointer (--px / --py) for a parallax effect.
 */
export const WELCOME_THEMES = {
  welcome: { a: '139,92,246', b: '59,130,246', bg: ['#17112e', '#090912'], Icon: Sparkles },
  software: { a: '56,189,248', b: '99,102,241', bg: ['#0c1a2e', '#080b14'], Icon: Code2 },
  marketing: { a: '244,114,182', b: '251,146,60', bg: ['#2a1022', '#0f0a0e'], Icon: Megaphone },
  education: { a: '52,211,153', b: '251,191,36', bg: ['#0c2420', '#080f0e'], Icon: GraduationCap },
  ai: { a: '34,211,238', b: '167,139,250', bg: ['#0a1f2c', '#0a0a16'], Icon: BrainCircuit },
  robotics: { a: '249,115,22', b: '148,163,184', bg: ['#26160c', '#0d0b0a'], Icon: Cpu },
  blockchain: { a: '59,130,246', b: '20,184,166', bg: ['#0b1a33', '#08101a'], Icon: Blocks },
  celebration: { a: '251,191,36', b: '244,114,182', bg: ['#2d1c08', '#100a0e'], Icon: PartyPopper },
}
export const themeOf = (name) => WELCOME_THEMES[name] || WELCOME_THEMES.welcome
export { Bot }

const rgb = (c, a = 1) => `rgba(${c},${a})`
const range = (n) => Array.from({ length: n }, (_, i) => i)
const frac = (i, k) => { const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) } // deterministic pseudo-random 0..1

// ---- the illustrations (viewBox 1200 x 800, kept to the right / lower part so the text stays readable) ------------------------------------
function Welcome({ a, b }) {
  return (
    <g transform="translate(850 400)" fill="none">
      {[150, 250, 350].map((r, i) => (
        <g key={r} className={i % 2 ? 'we-spin-r' : 'we-spin'}><circle r={r} stroke={rgb(i % 2 ? b : a, 0.35 - i * 0.07)} strokeWidth="1.5" strokeDasharray={i === 1 ? '4 14' : i === 2 ? '1 10' : undefined} /></g>
      ))}
      {range(9).map((i) => {
        const ang = (i / 9) * Math.PI * 2
        const r = [150, 250, 350][i % 3]
        return <circle key={i} cx={Math.cos(ang) * r} cy={Math.sin(ang) * r} r={5 + (i % 3) * 2} fill={rgb(i % 2 ? b : a, 0.85)} className="we-pulse" style={{ animationDelay: `${i * 0.35}s` }} />
      })}
    </g>
  )
}

function Software({ a, b }) {
  const lines = [0.8, 0.5, 0.65, 0.35, 0.72, 0.45]
  const win = (x, y, w, h, c, d) => (
    <g key={x} className="we-float" style={{ animationDelay: `${d}s` }}>
      <rect x={x} y={y} width={w} height={h} rx="16" fill="rgba(255,255,255,0.05)" stroke={rgb(c, 0.55)} strokeWidth="1.5" />
      {[0, 1, 2].map((k) => <circle key={k} cx={x + 22 + k * 18} cy={y + 22} r="5" fill={rgb(c, 0.7)} />)}
      {lines.map((l, i) => <rect key={i} x={x + 24 + (i % 2) * 26} y={y + 52 + i * 26} width={(w - 80) * l} height="9" rx="4.5" fill={rgb(i % 3 ? c : a, 0.45)} />)}
    </g>
  )
  return <g>{win(640, 150, 420, 260, a, 0)}{win(820, 360, 340, 230, b, 1.4)}{win(560, 480, 300, 200, a, 2.6)}<text x="1010" y="170" fontSize="90" fontFamily="monospace" fill={rgb(b, 0.35)} className="we-float">{'</>'}</text></g>
}

function Marketing({ a, b }) {
  const bars = [120, 190, 160, 260, 330, 300, 420]
  return (
    <g>
      <g transform="translate(900 300)" fill="none">{[60, 130, 200].map((r, i) => <circle key={r} r={r} stroke={rgb(a, 0.5)} strokeWidth="2" className="we-ping" style={{ animationDelay: `${i * 0.9}s` }} />)}<circle r="14" fill={rgb(a, 0.9)} /></g>
      {bars.map((h, i) => <rect key={i} x={600 + i * 74} y={720 - h} width="46" height={h} rx="10" fill={rgb(i % 2 ? b : a, 0.5)} className="we-grow" style={{ animationDelay: `${i * 0.15}s` }} />)}
      <polyline points={bars.map((h, i) => `${623 + i * 74},${690 - h}`).join(' ')} fill="none" stroke={rgb(b, 0.95)} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12 10" className="we-dash" />
    </g>
  )
}

function Education({ a, b }) {
  const steps = [0, 1, 2, 3, 4]
  return (
    <g>
      {steps.map((i) => <rect key={i} x={560 + i * 112} y={690 - (i + 1) * 90} width="100" height={(i + 1) * 90} rx="12" fill={rgb(i % 2 ? b : a, 0.28 + i * 0.07)} stroke={rgb(a, 0.35)} className="we-rise" style={{ animationDelay: `${i * 0.18}s` }} />)}
      <path d="M 590 560 C 700 520, 760 520, 830 440 S 1000 330, 1130 190" fill="none" stroke={rgb(b, 0.9)} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 14" className="we-dash" />
      {steps.map((i) => <circle key={i} cx={610 + i * 112} cy={640 - (i + 1) * 90} r="9" fill={rgb(b, 0.95)} className="we-pulse" style={{ animationDelay: `${i * 0.3}s` }} />)}
    </g>
  )
}

function Ai({ a, b }) {
  const layers = [3, 5, 6, 5, 3]
  const pts = layers.map((n, l) => range(n).map((i) => ({ x: 560 + l * 135, y: 400 + (i - (n - 1) / 2) * 92 })))
  return (
    <g>
      {pts.slice(0, -1).map((layer, l) => layer.flatMap((p, i) => pts[l + 1].map((q, j) => <line key={`${l}-${i}-${j}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={rgb(l % 2 ? b : a, 0.22)} strokeWidth="1.4" className="we-pulse" style={{ animationDelay: `${((i + j + l) % 7) * 0.4}s` }} />)))}
      {pts.flat().map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="12" fill={rgb(i % 2 ? b : a, 0.9)} className="we-pulse" style={{ animationDelay: `${(i % 9) * 0.25}s` }} />)}
    </g>
  )
}

function Robotics({ a, b }) {
  const traces = ['M 560 200 H 700 V 300 H 880 V 220 H 1100', 'M 560 420 H 640 V 520 H 820 V 440 H 1000 V 560 H 1140', 'M 620 700 H 760 V 620 H 940 V 700 H 1120', 'M 700 120 V 250 H 560']
  return (
    <g>
      {traces.map((d, i) => <g key={d}><path d={d} fill="none" stroke={rgb(i % 2 ? b : a, 0.35)} strokeWidth="2.5" /><path d={d} fill="none" stroke={rgb(i % 2 ? b : a, 0.95)} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="14 220" className="we-trace" style={{ animationDelay: `${i * 0.7}s` }} /></g>)}
      <g transform="translate(930 400)"><g className="we-spin" fill="none" stroke={rgb(a, 0.7)} strokeWidth="3">
        <circle r="72" /><circle r="26" />
        {range(12).map((i) => <rect key={i} x="-14" y="-104" width="28" height="34" rx="6" transform={`rotate(${i * 30})`} fill={rgb(a, 0.25)} />)}
      </g></g>
      {[[700, 300], [880, 220], [820, 520], [760, 620]].map(([x, y], i) => <rect key={i} x={x - 10} y={y - 10} width="20" height="20" rx="4" fill={rgb(b, 0.9)} className="we-pulse" style={{ animationDelay: `${i * 0.4}s` }} />)}
    </g>
  )
}

function Blockchain({ a, b }) {
  const blocks = [[600, 220], [820, 330], [1010, 200], [700, 520], [940, 580]]
  return (
    <g>
      {[[0, 1], [1, 2], [0, 3], [3, 4], [1, 4]].map(([i, j]) => <line key={`${i}${j}`} x1={blocks[i][0] + 45} y1={blocks[i][1] + 45} x2={blocks[j][0] + 45} y2={blocks[j][1] + 45} stroke={rgb(a, 0.5)} strokeWidth="2.5" strokeDasharray="6 10" className="we-dash" />)}
      {blocks.map(([x, y], i) => (
        <g key={i} className="we-float" style={{ animationDelay: `${i * 0.7}s` }}>
          <rect x={x} y={y} width="90" height="90" rx="14" fill="rgba(255,255,255,0.05)" stroke={rgb(i % 2 ? b : a, 0.85)} strokeWidth="2.5" />
          <path d={`M ${x} ${y + 30} H ${x + 90} M ${x + 30} ${y + 30} V ${y + 90}`} stroke={rgb(i % 2 ? b : a, 0.4)} strokeWidth="1.5" fill="none" />
          <circle cx={x + 66} cy={y + 64} r="7" fill={rgb(i % 2 ? b : a, 0.9)} />
        </g>
      ))}
    </g>
  )
}

function Celebration({ a, b }) {
  const rays = range(16)
  const bits = range(26).map((i) => ({ x: 520 + frac(i, 5) * 640, y: 40 + frac(i, 6) * 700, w: 8 + frac(i, 7) * 14, h: 5 + frac(i, 8) * 9, r: frac(i, 9) * 360, c: i % 3 === 0 ? a : i % 3 === 1 ? b : '255,255,255', d: frac(i, 10) * 5 }))
  return (
    <g>
      <g transform="translate(860 330)"><g className="we-spin">{rays.map((i) => <rect key={i} x="-3" y="-320" width="6" height="150" rx="3" transform={`rotate(${i * (360 / 16)})`} fill={rgb(i % 2 ? b : a, 0.22)} />)}</g></g>
      {[[760, 250, 90], [1000, 420, 70], [700, 560, 60]].map(([x, y, r], k) => <g key={k} transform={`translate(${x} ${y})`} className="we-pulse" style={{ animationDelay: `${k * 0.6}s` }}>{range(8).map((i) => <line key={i} x1="0" y1={-r * 0.35} x2="0" y2={-r} stroke={rgb(k % 2 ? b : a, 0.85)} strokeWidth="4" strokeLinecap="round" transform={`rotate(${i * 45})`} />)}</g>)}
      {bits.map((p, i) => <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx="2" transform={`rotate(${p.r} ${p.x} ${p.y})`} fill={rgb(p.c, 0.8)} className="we-float" style={{ animationDelay: `-${p.d}s`, animationDuration: `${5 + (i % 4)}s` }} />)}
    </g>
  )
}

const ART = { celebration: Celebration, welcome: Welcome, software: Software, marketing: Marketing, education: Education, ai: Ai, robotics: Robotics, blockchain: Blockchain }
const DOTS = range(22).map((i) => ({ x: frac(i, 1) * 1200, y: frac(i, 2) * 800, r: 1.5 + frac(i, 3) * 2.5, d: frac(i, 4) * 6 }))

/** One full-bleed background: base colour, glow orbs, grid, the illustration and drifting particles, in three parallax layers. */
export const WelcomeBackdrop = memo(function WelcomeBackdrop({ theme, soft = false }) {
  const t = themeOf(theme)
  const Art = ART[theme] || Welcome
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(160deg, ${t.bg[0]} 0%, ${t.bg[1]} 100%)` }}>
      <div className="we-layer absolute inset-0" style={{ '--depth': 0.5 }}>
        <div className="absolute -left-[15%] -top-[20%] size-[70vmax] rounded-full opacity-70" style={{ background: `radial-gradient(closest-side, ${rgb(t.a, 0.32)}, transparent 72%)` }} />
        <div className="absolute -bottom-[25%] -right-[10%] size-[60vmax] rounded-full opacity-70" style={{ background: `radial-gradient(closest-side, ${rgb(t.b, 0.28)}, transparent 72%)` }} />
        <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(70% 70% at 70% 45%, #000, transparent)', WebkitMaskImage: 'radial-gradient(70% 70% at 70% 45%, #000, transparent)' }} />
      </div>
      <svg className="we-layer absolute inset-0 size-full opacity-80" style={{ '--depth': 1.4 }} viewBox="0 0 1200 800" preserveAspectRatio={soft ? 'xMidYMid slice' : 'xMaxYMid slice'} focusable="false"><Art a={t.a} b={t.b} /></svg>
      <svg className="we-layer absolute inset-0 size-full" style={{ '--depth': 2.6 }} viewBox="0 0 1200 800" preserveAspectRatio="xMaxYMid slice" focusable="false">
        {DOTS.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={rgb(i % 2 ? t.b : t.a, 0.55)} className="we-drift" style={{ animationDelay: `-${d.d}s`, animationDuration: `${9 + (i % 5) * 2}s` }} />)}
      </svg>
      <div className="absolute inset-0" style={{ background: soft ? 'linear-gradient(180deg, rgba(8,8,14,0.0) 55%, rgba(8,8,14,0.35) 100%)' : 'linear-gradient(180deg, rgba(8,8,14,0.0) 0%, rgba(8,8,14,0.25) 28%, rgba(8,8,14,0.82) 52%, rgba(8,8,14,0.94) 100%)' }} /> {/* keeps the text readable over any illustration */}
    </div>
  )
})
