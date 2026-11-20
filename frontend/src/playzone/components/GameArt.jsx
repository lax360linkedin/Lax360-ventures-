/**
 * The artwork of each Play Zone world, drawn as layered vector scenes (no image downloads, so it is light and sharp on every screen). Each scene has its own palette, lighting and floating
 * elements; the layers move with transform / opacity only. This is temporary presentation art: the production illustrations and 3D scenes are listed in PLAYZONE_ASSETS.md.
 * Purely decorative (aria-hidden).
 */
const star = (x, y, r) => `M${x} ${y - r}l${r * 0.3} ${r * 0.62} ${r * 0.7} ${r * 0.1}-${r * 0.52} ${r * 0.48} ${r * 0.14} ${r * 0.7}-${r * 0.62}-${r * 0.34}-${r * 0.62} ${r * 0.34} ${r * 0.14}-${r * 0.7}-${r * 0.52}-${r * 0.48} ${r * 0.7}-${r * 0.1}z`

function Stars() {
  const pts = [[60, 50, 9], [140, 90, 6], [230, 40, 8], [320, 80, 10], [90, 150, 5], [200, 120, 7], [350, 150, 6], [280, 170, 5], [30, 110, 4], [170, 30, 5]]
  return (
    <svg className="pz-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pz-sk1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e1b6b" /><stop offset="0.55" stopColor="#6d4bd1" /><stop offset="1" stopColor="#f9a8d4" /></linearGradient>
        <radialGradient id="pz-moon1"><stop offset="0" stopColor="#fffbeb" /><stop offset="1" stopColor="#fde68a" /></radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#pz-sk1)" />
      <circle cx="310" cy="70" r="46" fill="url(#pz-moon1)" opacity="0.95" /><circle cx="322" cy="62" r="40" fill="#6d4bd1" opacity="0.28" />
      <g className="pz-drift" opacity="0.6"><ellipse cx="90" cy="215" rx="90" ry="22" fill="#fbcfe8" /><ellipse cx="300" cy="235" rx="110" ry="26" fill="#c4b5fd" /></g>
      {pts.map(([x, y, r], i) => <path key={i} className="pz-twinkle" d={star(x, y, r)} fill={i % 3 === 0 ? '#fde68a' : '#fff7ed'} />)}
      <path d="M0 270q70-46 150-22t140-20 110 12v60H0z" fill="#2e1d78" /><path d="M0 285q90-32 190-10t210-8v33H0z" fill="#1d1450" />
      <g className="pz-float"><path d={star(210, 168, 18)} fill="#fcd34d" stroke="#f59e0b" strokeWidth="2" /><path d={star(210, 168, 8)} fill="#fff7cc" /></g>
    </svg>
  )
}

function Jump() {
  const island = (x, y, w, delay, cls) => (
    <g key={x} className={cls} style={{ animationDelay: delay }}>
      <ellipse cx={x} cy={y} rx={w} ry={w * 0.22} fill="#a7f3d0" /><ellipse cx={x} cy={y - 3} rx={w * 0.92} ry={w * 0.16} fill="#6ee7b7" />
      <path d={`M${x - w * 0.8} ${y + 2}q${w * 0.8} ${w * 1.05} ${w * 1.6} 0q-${w * 0.2} ${w * 0.35}-${w * 0.8} ${w * 0.8}-${w * 0.6}-${w * 0.45}-${w * 0.8}-${w * 0.8}z`} fill="#a78bfa" />
      <circle cx={x - w * 0.3} cy={y - 14} r="7" fill="#34d399" /><rect x={x - w * 0.3 - 1.2} y={y - 9} width="2.4" height="8" fill="#92400e" />
    </g>
  )
  return (
    <svg className="pz-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs><linearGradient id="pz-sk2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="0.6" stopColor="#c4b5fd" /><stop offset="1" stopColor="#fbcfe8" /></linearGradient></defs>
      <rect width="400" height="300" fill="url(#pz-sk2)" />
      <circle cx="80" cy="64" r="34" fill="#fef3c7" opacity="0.9" /><circle cx="80" cy="64" r="52" fill="#fde68a" opacity="0.25" />
      <g className="pz-drift" fill="#fff" opacity="0.85"><ellipse cx="250" cy="70" rx="50" ry="13" /><ellipse cx="280" cy="62" rx="30" ry="12" /><ellipse cx="120" cy="150" rx="46" ry="11" /></g>
      {island(110, 230, 70, '0s', 'pz-float')}{island(260, 170, 60, '-2s', 'pz-float-b')}{island(340, 250, 46, '-4s', 'pz-float-c')}
      <g className="pz-float-b"><path d="M205 70l6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2z" fill="#fcd34d" opacity="0.95" /></g>
    </svg>
  )
}

function Puzzle() {
  const crystal = (x, y, w, h, c1, c2, i) => (
    <g key={i} className="pz-bob">
      <path d={`M${x} ${y - h}L${x + w} ${y - h * 0.62}L${x + w * 0.78} ${y}L${x - w * 0.78} ${y}L${x - w} ${y - h * 0.62}z`} fill={c1} />
      <path d={`M${x} ${y - h}L${x + w} ${y - h * 0.62}L${x} ${y}z`} fill={c2} opacity="0.55" />
      <path d={`M${x} ${y - h}L${x - w} ${y - h * 0.62}L${x - w * 0.2} ${y - h * 0.5}z`} fill="#fff" opacity="0.5" />
    </g>
  )
  return (
    <svg className="pz-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs><linearGradient id="pz-sk3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b1a78" /><stop offset="0.6" stopColor="#9b4fd0" /><stop offset="1" stopColor="#fbcfe8" /></linearGradient></defs>
      <rect width="400" height="300" fill="url(#pz-sk3)" />
      <path d="M40 230v-46l16-12 16 12v46M96 230v-70l20-16 20 16v70M170 230v-54l18-12 18 12v54" fill="#2a0f55" opacity="0.7" />
      {[[70, 80, 5], [250, 50, 6], [340, 110, 4], [150, 60, 4]].map(([x, y, r], i) => <path key={i} className="pz-twinkle" d={star(x, y, r)} fill="#fde68a" />)}
      {crystal(110, 270, 38, 130, '#f472b6', '#fff', 1)}{crystal(205, 275, 46, 170, '#60a5fa', '#fff', 2)}{crystal(300, 270, 36, 120, '#fcd34d', '#fff', 3)}
      {crystal(60, 285, 24, 80, '#a78bfa', '#fff', 4)}{crystal(350, 285, 26, 90, '#f472b6', '#fff', 5)}
      <rect y="262" width="400" height="38" fill="#1d1450" opacity="0.85" />
    </svg>
  )
}

function Bug() {
  return (
    <svg className="pz-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pz-sk4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#07122f" /><stop offset="1" stopColor="#12306b" /></linearGradient>
        <linearGradient id="pz-scan4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity="0" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0.35" /></linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#pz-sk4)" />
      <g stroke="#22d3ee" strokeOpacity="0.35" strokeWidth="1" fill="none">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={'a' + i} d={`M${200 + (i - 3) * 14} 150L${200 + (i - 3) * 90} 300`} />)}
        {[165, 185, 210, 245, 290].map((y) => <path key={y} d={`M0 ${y}H400`} />)}
      </g>
      <g fill="none" stroke="#f472b6" strokeOpacity="0.5" strokeWidth="1.4" className="pz-spin" style={{ transformOrigin: '320px 70px' }}><path d="M320 40l26 15v30l-26 15-26-15V55z" /><path d="M320 52l16 9v18l-16 9-16-9V61z" /></g>
      <g className="pz-bob" style={{ transformOrigin: '120px 110px' }}>
        <ellipse cx="120" cy="112" rx="26" ry="20" fill="#f472b6" /><circle cx="120" cy="86" r="12" fill="#f9a8d4" /><circle cx="115" cy="84" r="3" fill="#07122f" /><circle cx="126" cy="84" r="3" fill="#07122f" />
        <path d="M92 104l-18-10M92 116l-20 4M96 128l-14 14M148 104l18-10M148 116l20 4M144 128l14 14M112 74l-8-10M128 74l8-10" stroke="#f9a8d4" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="pz-bob" style={{ transformOrigin: '270px 190px' }} opacity="0.9">
        <ellipse cx="270" cy="192" rx="16" ry="12" fill="#a78bfa" /><circle cx="270" cy="176" r="8" fill="#c4b5fd" /><path d="M254 186l-12-6M254 196l-12 4M286 186l12-6M286 196l12 4" stroke="#c4b5fd" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <rect y="0" width="400" height="26" fill="url(#pz-scan4)" className="pz-scan" />
      <circle cx="200" cy="262" r="26" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.8" /><circle cx="200" cy="262" r="14" fill="#22d3ee" opacity="0.35" />
    </svg>
  )
}

/** The hero scene: all four worlds as a glowing sky with floating stars and crystals. */
function Hero() {
  const pts = [[40, 60, 8], [120, 30, 5], [260, 54, 9], [360, 40, 6], [330, 150, 5], [70, 180, 6], [190, 90, 4]]
  return (
    <svg className="pz-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {pts.map(([x, y, r], i) => <path key={i} className="pz-twinkle" d={star(x, y, r)} fill={i % 2 ? '#fde68a' : '#fbcfe8'} />)}
      <g className="pz-float"><path d="M60 230l14-26 14 26-14 20z" fill="#7dd3fc" opacity="0.85" /><path d="M60 230l14-26v46z" fill="#fff" opacity="0.4" /></g>
      <g className="pz-float-b"><path d="M330 220l12-22 12 22-12 18z" fill="#f9a8d4" opacity="0.85" /><path d="M330 220l12-22v40z" fill="#fff" opacity="0.4" /></g>
      <g className="pz-float-c"><path d="M290 80l10-18 10 18-10 14z" fill="#fcd34d" opacity="0.9" /></g>
    </svg>
  )
}

const SCENES = { 'catch-the-stars': Stars, 'laxbot-jump': Jump, 'puzzle-pop': Puzzle, 'bug-hunter': Bug, hero: Hero }

export default function GameArt({ slug }) {
  const Scene = SCENES[slug] || Hero
  return <Scene />
}
